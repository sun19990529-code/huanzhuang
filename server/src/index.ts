// ====================================================================
// SmartWardrobe 核心业务网关与 RESTful API / WebSocket 服务 (安全与企业级版)
// ====================================================================

import http from 'http';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import { db, DBUser, OutfitSuggestion, ExtendedGarmentItem } from './db';
import { pipeline } from './pipeline';
import { AIService } from './aiService';
import {
  UserProfile,
  UserAvatar,
  GarmentItem,
  GarmentCategory,
  OutfitWearItem,
  calculateGoldenRatioBody,
  segmentMultiGarments,
  generateWeatherOutfitSuggestion,
  analyzeGarmentAttributes,
  generateFissionAssets,
} from '@smart-wardrobe/shared';
import { GENERATED_ASSETS } from './generatedAssets';

// 扩展 Express Request 类型
declare global {
  namespace Express {
    interface Request {
      user?: DBUser;
    }
  }
}

// 全局未捕获异常与异步 Rejection 守护 (确保服务永远在线不崩溃)
process.on('unhandledRejection', (reason, promise) => {
  console.warn('⚠️ [Process] 捕获未处理的 Promise Rejection:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('❌ [Process] 捕获未处理的 Uncaught Exception:', err);
});

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// --------------------------------------------------------------------
// 安全会话与 RBAC 拦截器
// --------------------------------------------------------------------
const getAuthUser = (req: Request): DBUser | null => {
  // 支持 Authorization: Bearer <token>, x-auth-token, x-user-id
  const authHeader = req.headers['authorization'];
  let token = '';
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  }
  if (!token) {
    token = (req.headers['x-auth-token'] as string) || '';
  }

  if (token) {
    const userId = db.getUserIdByToken(token);
    if (userId && db.users.has(userId)) {
      return db.users.get(userId)!;
    }
  }

  // 兼容直接传递 userId 的开发调试头 (若有效)
  const headerUserId = req.headers['x-user-id'] as string;
  if (headerUserId && db.users.has(headerUserId)) {
    return db.users.get(headerUserId)!;
  }

  return null;
};

// 认证中间件
const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  const user = getAuthUser(req);
  if (!user) {
    return res.status(401).json({ code: 401, message: '请先登录账号后再进行操作' });
  }
  if (user.status === 'BANNED') {
    return res.status(403).json({ code: 403, message: '您的账号已被管理员封禁，禁止访问系统' });
  }
  if (user.status === 'FROZEN' && req.method !== 'GET') {
    return res.status(403).json({ code: 403, message: '您的账号已被冻结，仅限浏览，无法进行修改或试衣操作' });
  }
  req.user = user;
  next();
};

// 管理员权限中间件
const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  const user = getAuthUser(req);
  if (!user || user.role !== 'ADMIN') {
    return res.status(403).json({ code: 403, message: '无权访问：该操作仅限系统超级管理员 (suncraft) 执行' });
  }
  req.user = user;
  next();
};

// --------------------------------------------------------------------
// 1. 用户与安全认证 (Auth & Account)
// --------------------------------------------------------------------

// 当前登录用户信息
app.get('/v1/auth/me', requireAuth, (req: Request, res: Response) => {
  const user = req.user!;
  res.json({
    code: 200,
    data: {
      id: user.id,
      username: user.username,
      email: user.email,
      nickname: user.nickname,
      avatarUrl: user.avatarUrl,
      role: user.role,
      dailyCredits: user.dailyCredits,
      permanentCredits: user.permanentCredits,
      totalCredits: user.dailyCredits + user.permanentCredits,
    },
  });
});

// 普通用户安全登录 (邮箱 + 密码)
app.post('/v1/auth/login', (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ code: 400, message: '必须提供邮箱与登录密码' });
  }

  const result = db.login(email.trim(), password);
  if (!result) {
    return res.status(401).json({ code: 401, message: '邮箱不存在或密码错误，请核对' });
  }

  if (result.user.status === 'BANNED') {
    return res.status(403).json({ code: 403, message: '该账号已被管理员封禁，无法登录，请联系客服' });
  }

  res.json({
    code: 200,
    message: `欢迎回来，${result.user.nickname}！`,
    data: {
      id: result.user.id,
      email: result.user.email,
      nickname: result.user.nickname,
      avatarUrl: result.user.avatarUrl,
      role: result.user.role,
      dailyCredits: result.user.dailyCredits,
      permanentCredits: result.user.permanentCredits,
      totalCredits: result.user.dailyCredits + result.user.permanentCredits,
      token: result.token,
    },
  });
});

// 管理员专用隐藏登录接口 (账号: suncraft, 密码: sqm17709021)
app.post('/v1/auth/admin-login', (req: Request, res: Response) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ code: 400, message: '请提供管理员账号与密钥' });
  }

  const result = db.adminLogin(username.trim(), password);
  if (!result) {
    return res.status(401).json({ code: 401, message: '管理员身份认证失败：账号或密码错误' });
  }

  res.json({
    code: 200,
    message: '🔐 超级管理员身份验证通过，进入 CMS 官方控制台',
    data: {
      id: result.user.id,
      username: result.user.username,
      email: result.user.email,
      nickname: result.user.nickname,
      role: result.user.role,
      dailyCredits: result.user.dailyCredits,
      permanentCredits: result.user.permanentCredits,
      totalCredits: result.user.dailyCredits + result.user.permanentCredits,
      token: result.token,
    },
  });
});

// 普通用户三步式注册 (账号密码 -> 五维身材 -> 可选素体照片)
app.post('/v1/auth/register', async (req: Request, res: Response) => {
  const {
    email,
    password,
    nickname,
    gender,
    heightCm,
    weightKg,
    bustCm,
    waistCm,
    hipsCm,
    isCustomBodyParams,
    avatarImageUrl,
  } = req.body;

  if (!email || !password) {
    return res.status(400).json({ code: 400, message: '必须填写注册邮箱与密码' });
  }

  try {
    let finalAvatarUrl = '';
    const isMale = gender === 'MALE';
    const targetHeight = Number(heightCm) || (isMale ? 178 : 165);
    const targetWeight = Number(weightKg) || (isMale ? 70 : 50);

    if (avatarImageUrl && avatarImageUrl.startsWith('data:image')) {
      try {
        console.log(`[Register] 正在根据用户上传照片调用 gemini-3.1-flash-image 重构 3:4 A-Pose 素体...`);
        finalAvatarUrl = await AIService.generateStandardMannequinFromPhoto(
          avatarImageUrl,
          gender || 'FEMALE',
          targetHeight,
          targetWeight,
          Number(bustCm),
          Number(waistCm),
          Number(hipsCm)
        );
      } catch (photoGenErr) {
        console.warn('[Register] 真人照片素体重构异常，降级按身材参数生成素体:', photoGenErr);
      }
    }

    if (!finalAvatarUrl) {
      try {
        console.log(`[Register] 正在根据身材参数调用 gemini-3.1-flash-image 动态生成 3:4 专属素体...`);
        finalAvatarUrl = await AIService.generateAvatarWithAI(
          gender || 'FEMALE',
          targetHeight,
          targetWeight,
          Number(bustCm),
          Number(waistCm),
          Number(hipsCm)
        );
      } catch (genErr) {
        console.warn('[Register] 动态生图未能即时返回，使用身材基底:', genErr);
      }
    }

    const defaultAvatarFallback = isMale
      ? ((GENERATED_ASSETS as any).avatarMaleUrl || GENERATED_ASSETS.avatarUrl)
      : ((GENERATED_ASSETS as any).avatarFemaleUrl || GENERATED_ASSETS.avatarUrl);

    finalAvatarUrl = finalAvatarUrl || defaultAvatarFallback;

    const result = db.register({
      email: email.trim(),
      password: password.trim(),
      nickname: nickname ? nickname.trim() : '时尚达人',
      gender: gender || 'FEMALE',
      heightCm: Number(heightCm) || undefined,
      weightKg: Number(weightKg) || undefined,
      bustCm: Number(bustCm) || undefined,
      waistCm: Number(waistCm) || undefined,
      hipsCm: Number(hipsCm) || undefined,
      isCustomBodyParams,
      avatarImageUrl: finalAvatarUrl,
    });

    res.status(201).json({
      code: 200,
      message: '🎉 账号注册成功！已为您生成专属身材素体并赠送 100 初始积分！',
      data: {
        user: {
          id: result.user.id,
          email: result.user.email,
          nickname: result.user.nickname,
          avatarUrl: result.user.avatarUrl,
          role: result.user.role,
          dailyCredits: result.user.dailyCredits,
          permanentCredits: result.user.permanentCredits,
          totalCredits: result.user.dailyCredits + result.user.permanentCredits,
        },
        token: result.token,
        profile: result.profile,
        avatar: result.avatar,
      },
    });
  } catch (err: any) {
    res.status(400).json({ code: 400, message: err.message || '注册失败' });
  }
});

// 修改登录密码
app.put('/v1/auth/change-password', requireAuth, (req: Request, res: Response) => {
  const { oldPassword, newPassword } = req.body;
  if (!oldPassword || !newPassword) {
    return res.status(400).json({ code: 400, message: '请提供原密码与新密码' });
  }

  const ok = db.changePassword(req.user!.id, oldPassword, newPassword);
  if (!ok) {
    return res.status(400).json({ code: 400, message: '原密码不正确，修改失败' });
  }

  res.json({ code: 200, message: '密码修改成功，请牢记新密码' });
});

// 修改用户昵称与头像
app.put('/v1/auth/update-profile', requireAuth, (req: Request, res: Response) => {
  const { nickname, avatarUrl } = req.body;
  const user = req.user!;
  if (nickname !== undefined) user.nickname = nickname.trim();
  if (avatarUrl !== undefined) user.avatarUrl = avatarUrl;

  res.json({
    code: 200,
    message: '个人信息已更新',
    data: {
      id: user.id,
      nickname: user.nickname,
      avatarUrl: user.avatarUrl,
    },
  });
});

// --------------------------------------------------------------------
// 2. Profile 角色档案 (多角色体系 CRUD 与身材定制)
// --------------------------------------------------------------------
app.get('/v1/profiles', requireAuth, (req: Request, res: Response) => {
  const userId = req.user!.id;
  const userProfiles = Array.from(db.profiles.values()).filter((p) => p.userId === userId);
  res.json({ code: 200, data: userProfiles });
});

app.post('/v1/profiles', requireAuth, (req: Request, res: Response) => {
  const { name, gender, heightCm, weightKg, bustCm, waistCm, hipsCm, privacyLevel, useGoldenRatio } = req.body;
  const profileId = `profile-${Date.now()}`;
  const g = gender || 'FEMALE';
  const h = Number(heightCm) || 168;

  let bodyParams = {
    weightKg: Number(weightKg) || 50,
    bustCm: Number(bustCm) || 84,
    waistCm: Number(waistCm) || 62,
    hipsCm: Number(hipsCm) || 89,
    isCustomBodyParams: true,
  };

  if (useGoldenRatio) {
    const golden = calculateGoldenRatioBody(g, h);
    bodyParams = {
      ...golden,
      isCustomBodyParams: false,
    };
  }

  const newProfile: UserProfile = {
    id: profileId,
    userId: req.user!.id,
    name: name || '家庭成员',
    gender: g,
    isDefault: false,
    heightCm: h,
    ...bodyParams,
    privacyLevel: privacyLevel || 'PRIVATE',
  };

  db.profiles.set(profileId, newProfile);

  // 绑定专属标准素体
  const defaultAvatar = g === 'MALE'
    ? (GENERATED_ASSETS.avatarMaleUrl || GENERATED_ASSETS.avatarUrl)
    : (GENERATED_ASSETS.avatarFemaleUrl || GENERATED_ASSETS.avatarUrl);

  db.avatars.set(`avatar-${profileId}`, {
    id: `avatar-${profileId}`,
    profileId,
    originalImageUrl: '',
    normalizedImageUrl: defaultAvatar,
    anchorPoints: {
      neck: [0.5, 0.28],
      waist: [0.5, 0.53],
      left_foot: [0.44, 0.88],
      right_foot: [0.56, 0.88],
      head: [0.5, 0.12],
    },
    isActive: true,
  });

  res.status(201).json({ code: 200, message: '角色档案创建成功', data: newProfile });
});

// --------------------------------------------------------------------
// 2.1 角色身材参数更新 (支持高级身材定制、体型、肤色、发型)
// --------------------------------------------------------------------
app.put('/v1/profiles/update-body', requireAuth, (req: Request, res: Response) => {
  const { profileId } = req.body;
  const profile = db.profiles.get(profileId);
  if (!profile || profile.userId !== req.user!.id) {
    return res.status(403).json({ code: 403, message: '档案不存在或无权修改' });
  }

  const { name, gender, heightCm, weightKg, bustCm, waistCm, hipsCm, bodyType, skinTone, hairstyle, privacyLevel } = req.body;
  if (name !== undefined) profile.name = name;
  if (gender !== undefined) {
    profile.gender = gender;
    const currentAvatar = db.avatars.get(`avatar-${profileId}`) || db.avatars.get(profileId);
    if (currentAvatar && (!currentAvatar.originalImageUrl || currentAvatar.originalImageUrl === '')) {
      currentAvatar.normalizedImageUrl = gender === 'MALE'
        ? (GENERATED_ASSETS.avatarMaleUrl || GENERATED_ASSETS.avatarUrl)
        : (GENERATED_ASSETS.avatarFemaleUrl || GENERATED_ASSETS.avatarUrl);
    }
  }
  if (heightCm !== undefined) profile.heightCm = Number(heightCm);
  if (weightKg !== undefined) profile.weightKg = Number(weightKg);
  if (bustCm !== undefined) profile.bustCm = Number(bustCm);
  if (waistCm !== undefined) profile.waistCm = Number(waistCm);
  if (hipsCm !== undefined) profile.hipsCm = Number(hipsCm);
  if (privacyLevel !== undefined) profile.privacyLevel = privacyLevel;
  if (bodyType !== undefined) (profile as any).bodyType = bodyType;
  if (skinTone !== undefined) (profile as any).skinTone = skinTone;
  if (hairstyle !== undefined) (profile as any).hairstyle = hairstyle;

  res.json({ code: 200, message: '角色身材参数已成功更新', data: profile });
});

app.put('/v1/profiles/:id', requireAuth, (req: Request, res: Response) => {
  const { id } = req.params;
  const profile = db.profiles.get(id);
  if (!profile || profile.userId !== req.user!.id) {
    return res.status(403).json({ code: 403, message: '档案不存在或无权修改' });
  }

  const { name, gender, heightCm, weightKg, bustCm, waistCm, hipsCm, bodyType, skinTone, hairstyle, privacyLevel } = req.body;
  if (name !== undefined) profile.name = name;
  if (gender !== undefined) {
    profile.gender = gender;
    const currentAvatar = db.avatars.get(`avatar-${id}`) || db.avatars.get(id);
    if (currentAvatar && (!currentAvatar.originalImageUrl || currentAvatar.originalImageUrl === '')) {
      currentAvatar.normalizedImageUrl = gender === 'MALE'
        ? (GENERATED_ASSETS.avatarMaleUrl || GENERATED_ASSETS.avatarUrl)
        : (GENERATED_ASSETS.avatarFemaleUrl || GENERATED_ASSETS.avatarUrl);
    }
  }
  if (heightCm !== undefined) profile.heightCm = Number(heightCm);
  if (weightKg !== undefined) profile.weightKg = Number(weightKg);
  if (bustCm !== undefined) profile.bustCm = Number(bustCm);
  if (waistCm !== undefined) profile.waistCm = Number(waistCm);
  if (hipsCm !== undefined) profile.hipsCm = Number(hipsCm);
  if (privacyLevel !== undefined) profile.privacyLevel = privacyLevel;
  if (bodyType !== undefined) (profile as any).bodyType = bodyType;
  if (skinTone !== undefined) (profile as any).skinTone = skinTone;
  if (hairstyle !== undefined) (profile as any).hairstyle = hairstyle;

  res.json({ code: 200, message: '角色身材参数已成功更新', data: profile });
});

app.get('/v1/profiles/:id/avatar', (req: Request, res: Response) => {
  const profileId = req.params.id;
  const avatar = Array.from(db.avatars.values()).find(
    (a) => a.profileId === profileId && a.isActive
  );
  if (!avatar) {
    const profile = db.profiles.get(profileId);
    const isMale = profile?.gender === 'MALE';
    const defaultAvatarUrl = isMale
      ? ((GENERATED_ASSETS as any).avatarMaleUrl || GENERATED_ASSETS.avatarUrl)
      : ((GENERATED_ASSETS as any).avatarFemaleUrl || GENERATED_ASSETS.avatarUrl);

    const fallbackAvatar = {
      id: `avatar-${profileId}`,
      profileId,
      originalImageUrl: '',
      normalizedImageUrl: defaultAvatarUrl,
      anchorPoints: {
        neck: [0.5, 0.28],
        waist: [0.5, 0.53],
        left_foot: [0.44, 0.88],
        right_foot: [0.56, 0.88],
        head: [0.5, 0.12],
      },
      isActive: true,
    };
    return res.json({ code: 200, data: fallbackAvatar });
  }
  res.json({ code: 200, data: avatar });
});

// 人物照片上传与 A-Pose 模特重构
app.post('/v1/profiles/:id/avatar/upload', requireAuth, async (req: Request, res: Response) => {
  try {
    const profileId = req.params.id;
    const { imageBase64 } = req.body;
    const profile = db.profiles.get(profileId);
    if (!profile || profile.userId !== req.user!.id) {
      return res.status(403).json({ code: 403, message: '角色档案不存在或无权操作' });
    }

    const deduction = db.deductCredits(req.user!.id, 1, '上传全身照生成 A-Pose 标准素体');
    if (!deduction.success) {
      return res.status(402).json({ code: 402, message: deduction.error });
    }

    const isMale = profile.gender === 'MALE';
    const defaultFallback = isMale
      ? ((GENERATED_ASSETS as any).avatarMaleUrl || GENERATED_ASSETS.avatarUrl)
      : ((GENERATED_ASSETS as any).avatarFemaleUrl || GENERATED_ASSETS.avatarUrl);

    const generatedMannequin = await AIService.generateStandardMannequinFromPhoto(
      imageBase64 || '',
      profile.gender as any,
      profile.heightCm,
      profile.weightKg,
      profile.bustCm,
      profile.waistCm,
      profile.hipsCm,
      (profile as any).bodyType,
      (profile as any).skinTone,
      (profile as any).hairstyle
    );

    const normalizedUrl = generatedMannequin || defaultFallback;

    for (const av of db.avatars.values()) {
      if (av.profileId === profileId) {
        av.isActive = false;
      }
    }

    const avatar = {
      id: `avatar-${profileId}-${Date.now()}`,
      profileId,
      originalImageUrl: imageBase64 || '',
      normalizedImageUrl: normalizedUrl,
      anchorPoints: {
        neck: [0.5, 0.28] as [number, number],
        waist: [0.5, 0.53] as [number, number],
        left_foot: [0.44, 0.88] as [number, number],
        right_foot: [0.56, 0.88] as [number, number],
        head: [0.5, 0.12] as [number, number],
      },
      isActive: true,
    };

    db.avatars.set(avatar.id, avatar);
    db.avatars.set(profileId, avatar);

    res.status(201).json({
      code: 200,
      message: 'A-Pose 标准影棚模特素体已生成并装载！',
      data: {
        avatar,
        remainingDailyCredits: deduction.remainingDaily,
      },
    });
  } catch (err: any) {
    console.error('[/v1/profiles/:id/avatar/upload] 生成素体异常:', err);
    res.status(500).json({ code: 500, message: err.message || '生成模特素体失败' });
  }
});

// 基于五维身材参数与体型偏好重新生成专属 3D 比例 A-Pose 素体模特 (无需上传照片)
app.post('/v1/profiles/:id/regenerate-avatar-by-params', requireAuth, async (req: Request, res: Response) => {
  const profileId = req.params.id;
  const { gender, heightCm, weightKg, bustCm, waistCm, hipsCm, bodyType, skinTone, hairstyle } = req.body;
  const profile = db.profiles.get(profileId);
  if (!profile || profile.userId !== req.user!.id) {
    return res.status(403).json({ code: 403, message: '角色档案不存在或无权操作' });
  }

  // 同步更新 profile 参数
  if (gender) profile.gender = gender;
  if (heightCm) profile.heightCm = Number(heightCm);
  if (weightKg) profile.weightKg = Number(weightKg);
  if (bustCm) profile.bustCm = Number(bustCm);
  if (waistCm) profile.waistCm = Number(waistCm);
  if (hipsCm) profile.hipsCm = Number(hipsCm);
  if (bodyType) (profile as any).bodyType = bodyType;
  if (skinTone) (profile as any).skinTone = skinTone;
  if (hairstyle) (profile as any).hairstyle = hairstyle;

  const deduction = db.deductCredits(req.user!.id, 1, '基于五维身材参数 AI 重塑模特素体');
  if (!deduction.success) {
    return res.status(402).json({ code: 402, message: deduction.error });
  }

  try {
    const generatedMannequin = await AIService.generateAvatarWithAI(
      profile.gender as any,
      profile.heightCm,
      profile.weightKg,
      profile.bustCm,
      profile.waistCm,
      profile.hipsCm,
      bodyType || (profile as any).bodyType,
      skinTone || (profile as any).skinTone,
      hairstyle || (profile as any).hairstyle
    );

    for (const av of db.avatars.values()) {
      if (av.profileId === profileId) {
        av.isActive = false;
      }
    }

    const avatar = {
      id: `avatar-${profileId}-${Date.now()}`,
      profileId,
      originalImageUrl: '',
      normalizedImageUrl: generatedMannequin,
      anchorPoints: {
        neck: [0.5, 0.28] as [number, number],
        waist: [0.5, 0.53] as [number, number],
        left_foot: [0.44, 0.88] as [number, number],
        right_foot: [0.56, 0.88] as [number, number],
        head: [0.5, 0.12] as [number, number],
      },
      isActive: true,
    };

    db.avatars.set(avatar.id, avatar);
    db.avatars.set(profileId, avatar);

    res.json({
      code: 200,
      message: '✨ 已基于您的五维身材参数通过 gemini-3.1-flash-image 成功重塑专属 A-Pose 模特！',
      data: {
        profile,
        avatar,
        remainingDailyCredits: deduction.remainingDaily,
      },
    });
  } catch (err: any) {
    console.error('[Regenerate Avatar Error]:', err);
    db.refundCredits(req.user!.id, 1, `素体生成失败退还积分 (${err.message || '网络异常'})`);
    return res.status(500).json({ code: 500, message: `AI 模特素体生成失败: ${err.message || '网络异常'}` });
  }
});

// --------------------------------------------------------------------
// 2.5 多模态 AI 像素级对准与智能解剖吸附
// --------------------------------------------------------------------
app.post('/v1/ai/match-garment-placement', async (req: Request, res: Response) => {
  try {
    const {
      avatarId,
      avatarImageUrl,
      garmentId,
      garmentImageUrl,
      garmentTitle = '',
      garmentCategory = 'TOPS',
      garmentSubCategory = '',
      box_2d,
      avatarProfile,
      stageWidth = 390,
      stageHeight = 680,
    } = req.body;

    console.log(`[AI Placement Engine] ⚡ 收到单品像素级解剖对齐请求: title="${garmentTitle}", category="${garmentCategory}", subCategory="${garmentSubCategory}"`);

    let garment = garmentId ? db.garments.get(garmentId) : null;
    const finalAvatarImage = avatarImageUrl || GENERATED_ASSETS.avatarUrl;
    const finalGarmentImage = garmentImageUrl || garment?.assets?.[0]?.pngUrl || '';
    const finalTitle = garment?.title || garmentTitle;
    const finalCategory = garment?.primaryCategory || garmentCategory;
    const finalSubCategory = garment?.subCategory || garmentSubCategory;

    const result = await AIService.matchGarmentPlacementWithVision(
      finalAvatarImage,
      finalGarmentImage,
      finalTitle,
      finalCategory,
      finalSubCategory,
      avatarProfile,
      stageWidth,
      stageHeight
    );

    console.log(`[AI Placement Engine] ✅ 解剖对齐解算完成: anchor="${result.anatomicalAnchor}", offset=(${result.offsetX}, ${result.offsetY}), scale=${result.scale}, conf=${result.confidence}`);

    return res.json({
      code: 200,
      message: '多模态 AI 像素级解剖对齐计算完成',
      data: result,
    });
  } catch (err: any) {
    console.error('Error matching placement:', err);
    return res.status(500).json({ code: 500, message: err.message || '对齐计算失败' });
  }
});

// --------------------------------------------------------------------
// 3. 衣橱与单品资产管理 (Garments)
// --------------------------------------------------------------------

// 统一多模态衣服识别入库 (用户私有衣橱)
app.post('/v1/garments/auto-detect-upload', requireAuth, async (req: Request, res: Response) => {
  try {
    const { profileId, imageBase64 } = req.body;

    if (!profileId) {
      return res.status(400).json({ code: 400, message: '必须指定 profileId' });
    }

    const profile = db.profiles.get(profileId);
    if (!profile || profile.userId !== req.user!.id) {
      return res.status(403).json({ code: 403, message: '无权向该档案添加衣物' });
    }

    const detectedItems = await AIService.analyzeGarmentsFromImageVision(
      imageBase64 || '时尚休闲单品'
    );

    const cost = detectedItems.length >= 2 ? 2 : 1;
    const deduction = db.deductCredits(
      req.user!.id,
      cost,
      `AI 自动识别入库 (${detectedItems.length}件单品)`
    );

    if (!deduction.success) {
      return res.status(402).json({ code: 402, message: deduction.error });
    }

    const createdGarments = await Promise.all(
      detectedItems.map(async (item, index) => {
        const garmentId = `garment-${Date.now()}-${index}`;
        
        // 调用 gemini-3.1-flash-image 为单品生成全新的电商平铺白底素图 (Ghost Mannequin / Flat Lay)
        let flatLayUrl = '';
        try {
          console.log(`[Ghost Mannequin] 正在为识别出的单品 "${item.title}" 生成 AI 幽灵模特平铺素图...`);
          flatLayUrl = await AIService.generateGhostMannequinAsset(
            item.title,
            item.primaryCategory,
            item.subCategory,
            item.colors,
            item.material,
            imageBase64
          );
        } catch (err: any) {
          console.warn(`[Ghost Mannequin] 单品 ${item.title} 平铺素图生成异常:`, err.message);
        }

        const baseImage = flatLayUrl || item.previewUrl || imageBase64 || GENERATED_ASSETS.dressCutoutUrl;
        const assets = generateFissionAssets(garmentId, item.primaryCategory, baseImage);

        const newGarment: ExtendedGarmentItem = {
          id: garmentId,
          profileId,
          isPublic: false,
          title: item.title,
          primaryCategory: item.primaryCategory,
          subCategory: item.subCategory,
          colors: item.colors,
          patterns: item.patterns,
          material: item.material,
          box_2d: item.box_2d,
          assets,
        };

        db.garments.set(garmentId, newGarment);
        return newGarment;
      })
    );

    res.status(201).json({
      code: 200,
      message: `成功识别出 ${createdGarments.length} 件单品并生成切片入库！`,
      data: {
        garments: createdGarments,
        costCredits: cost,
        remainingDailyCredits: deduction.remainingDaily,
      },
    });
  } catch (err: any) {
    console.error('[/v1/garments/auto-detect-upload] 识别入库异常:', err);
    res.status(500).json({
      code: 500,
      message: err.message || 'AI 视觉多目标检测与服装识别失败',
    });
  }
});

// 查询指定 Profile 的私有衣物
app.get('/v1/garments', requireAuth, (req: Request, res: Response) => {
  const profileId = req.query.profileId as string;
  const category = req.query.category as string;

  if (!profileId) {
    return res.status(400).json({ code: 400, message: '必须提供 profileId' });
  }

  if (!db.canAccessProfile(req.user!.id, profileId)) {
    return res.status(403).json({ code: 403, message: '无权查看该私密衣橱 (Private Profile)' });
  }

  let items = Array.from(db.garments.values()).filter((g) => g.profileId === profileId);

  if (category && category !== 'ALL') {
    items = items.filter((g) => g.primaryCategory === category);
  }

  res.json({ code: 200, data: items });
});

// 查询官方公共试衣间单品
app.get('/v1/garments/public', (req: Request, res: Response) => {
  const category = req.query.category as string;
  const includeArchived = req.query.includeArchived === 'true';

  let items = Array.from(db.garments.values()).filter((g) => g.isPublic);
  if (!includeArchived) {
    items = items.filter((g) => !g.isArchived);
  }

  if (category && category !== 'ALL') {
    items = items.filter((g) => g.primaryCategory === category);
  }

  // 置顶推荐单品排在最前
  items.sort((a, b) => (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0));

  res.json({ code: 200, data: items });
});

// 克隆公共单品到用户的私有衣橱
app.post('/v1/garments/public/:garmentId/clone', requireAuth, (req: Request, res: Response) => {
  const { garmentId } = req.params;
  const { targetProfileId } = req.body;

  if (!targetProfileId) {
    return res.status(400).json({ code: 400, message: '必须指定 targetProfileId' });
  }

  const profile = db.profiles.get(targetProfileId);
  if (!profile || profile.userId !== req.user!.id) {
    return res.status(403).json({ code: 403, message: '无权将单品存入该档案' });
  }

  const cloned = db.clonePublicGarment(garmentId, targetProfileId);
  if (!cloned) {
    return res.status(404).json({ code: 404, message: '未找到指定公共衣物' });
  }

  res.status(201).json({
    code: 200,
    message: '已成功复制到您的专属衣橱',
    data: cloned,
  });
});

// 用户更新私有衣物资产切片
app.put('/v1/garments/:id/asset', requireAuth, (req: Request, res: Response) => {
  const garmentId = req.params.id;
  const { pngUrl } = req.body;
  const isOwner = db.isGarmentOwner(req.user!.id, garmentId);
  if (!isOwner) {
    return res.status(403).json({ code: 403, message: '无权修改此单品' });
  }

  const garment = db.garments.get(garmentId);
  if (!garment) {
    return res.status(404).json({ code: 404, message: '未找到单品' });
  }

  if (pngUrl && garment.assets && garment.assets.length > 0) {
    garment.assets.forEach((a: any) => {
      a.pngUrl = pngUrl;
    });
  }

  res.json({ code: 200, message: '单品切片已成功更新', data: garment });
});

// 用户删除私有衣物 (严格防水平越权 IDOR 校验)
app.delete('/v1/garments/:id', requireAuth, (req: Request, res: Response) => {
  const garmentId = req.params.id;
  const isOwner = db.isGarmentOwner(req.user!.id, garmentId);
  if (!isOwner) {
    return res.status(403).json({ code: 403, message: '无权删除此单品：非本账号私有资产' });
  }

  db.garments.delete(garmentId);
  res.json({ code: 200, message: '单品已成功从您的衣橱删除' });
});

// --------------------------------------------------------------------
// 4. CMS 官方运营管理接口 (全量 requireAdmin 严格保护)
// --------------------------------------------------------------------

// 官方录入公共新单品
app.post('/v1/cms/garments/upload-official', requireAdmin, async (req: Request, res: Response) => {
  const { title, primaryCategory, subCategory, colors, brand, priceCents, externalBuyUrl, imageBase64 } = req.body;

  if (!title || !primaryCategory) {
    return res.status(400).json({ code: 400, message: '请完整提供单品名称与分类' });
  }

  const garmentId = `g-official-${Date.now()}`;
  const assets = generateFissionAssets(garmentId, primaryCategory);

  if (imageBase64) {
    const cutoutUrl = await AIService.generateGhostMannequinAsset(
      title,
      primaryCategory,
      subCategory || 'Casual',
      colors || ['#333333']
    );
    if (cutoutUrl) {
      assets.forEach((a: any) => {
        a.pngUrl = cutoutUrl;
      });
    }
  }

  const newOfficialGarment: ExtendedGarmentItem = {
    id: garmentId,
    profileId: null,
    isPublic: true,
    isArchived: false,
    title,
    primaryCategory,
    subCategory: subCategory || 'Official',
    colors: colors || ['#212121'],
    patterns: ['SOLID'],
    material: '官方精选面料',
    brand: brand || 'SmartWardrobe 官方精选',
    priceCents: Number(priceCents) || 19900,
    externalBuyUrl: externalBuyUrl || '',
    assets,
  };

  db.garments.set(garmentId, newOfficialGarment);

  res.status(201).json({
    code: 200,
    message: '官方单品已成功录入公共试衣间！',
    data: newOfficialGarment,
  });
});

// CMS 修改公共单品运营信息 (价格, 电商外链, 品牌)
app.put('/v1/cms/garments/:id', requireAdmin, (req: Request, res: Response) => {
  const { id } = req.params;
  const garment = db.garments.get(id);
  if (!garment || !garment.isPublic) {
    return res.status(404).json({ code: 404, message: '公共单品不存在' });
  }

  const { title, brand, priceCents, externalBuyUrl } = req.body;
  if (title !== undefined) garment.title = title.trim();
  if (brand !== undefined) garment.brand = brand.trim();
  if (priceCents !== undefined) garment.priceCents = Number(priceCents);
  if (externalBuyUrl !== undefined) garment.externalBuyUrl = externalBuyUrl.trim();

  res.json({ code: 200, message: '单品运营信息已更新', data: garment });
});

// CMS 上架/下架开关
app.post('/v1/cms/garments/:id/toggle-status', requireAdmin, (req: Request, res: Response) => {
  const { id } = req.params;
  const garment = db.garments.get(id);
  if (!garment || !garment.isPublic) {
    return res.status(404).json({ code: 404, message: '公共单品不存在' });
  }

  garment.isArchived = !garment.isArchived;
  res.json({
    code: 200,
    message: garment.isArchived ? '单品已成功下架（用户已克隆单品不受影响）' : '单品已重新上架',
    data: { isArchived: garment.isArchived },
  });
});

// CMS 运营概览大盘统计数据
app.get('/v1/cms/stats/dashboard', requireAdmin, (req: Request, res: Response) => {
  const stats = db.getDashboardStats();
  res.json({ code: 200, data: stats });
});

// CMS 获取全平台注册用户大盘
app.get('/v1/cms/users', requireAdmin, (req: Request, res: Response) => {
  const usersList = Array.from(db.users.values()).map((u) => {
    const userProfiles = Array.from(db.profiles.values()).filter((p) => p.userId === u.id);
    return {
      id: u.id,
      username: u.username,
      email: u.email,
      nickname: u.nickname,
      role: u.role,
      status: u.status || 'NORMAL',
      dailyCredits: u.dailyCredits,
      permanentCredits: u.permanentCredits,
      totalCredits: u.dailyCredits + u.permanentCredits,
      createdAt: u.createdAt,
      profilesCount: userProfiles.length,
    };
  });

  res.json({ code: 200, data: usersList });
});

// CMS 获取用户 360° 资产画像详情抽屉数据
app.get('/v1/cms/users/:id/details', requireAdmin, (req: Request, res: Response) => {
  const { id } = req.params;
  const details = db.getUserFullDetails(id);
  if (!details) {
    return res.status(404).json({ code: 404, message: '用户不存在' });
  }
  res.json({ code: 200, data: details });
});

// CMS 修改用户账号状态 (NORMAL / FROZEN / BANNED)
app.put('/v1/cms/users/:id/status', requireAdmin, (req: Request, res: Response) => {
  const { id } = req.params;
  const { status, reason } = req.body;

  if (id === req.user!.id && status !== 'NORMAL') {
    return res.status(400).json({ code: 400, message: '安全保护：禁止封禁或冻结当前登录的管理员自身' });
  }

  try {
    const updated = db.updateUserStatus(id, status, req.user!.id, reason);
    if (!updated) return res.status(404).json({ code: 404, message: '用户不存在' });
    res.json({ code: 200, message: `用户状态已更新为 ${status}`, data: updated });
  } catch (err: any) {
    res.status(400).json({ code: 400, message: err.message || '修改状态失败' });
  }
});

// CMS 重置用户密码
app.post('/v1/cms/users/:id/reset-password', requireAdmin, (req: Request, res: Response) => {
  const { id } = req.params;
  const { newPassword } = req.body;
  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ code: 400, message: '新密码长度不能少于 6 位' });
  }

  const success = db.resetUserPassword(id, newPassword);
  if (!success) return res.status(404).json({ code: 404, message: '用户不存在' });

  // 记录审计流水
  db.creditLedger.push({
    id: `ledger-pass-${id}-${Date.now()}`,
    userId: id,
    txType: 'PASSWORD_RESET',
    deltaDaily: 0,
    deltaPermanent: 0,
    balanceDailyAfter: 0,
    balancePermanentAfter: 0,
    description: `[密码重置] 管理员 ${req.user!.nickname} 手动重置了该用户登录密码`,
    createdAt: new Date().toISOString(),
  });

  res.json({ code: 200, message: '用户登录密码重置成功！' });
});

// CMS 设置/取消管理员权限 (提权 / 降权)
app.put('/v1/cms/users/:id/role', requireAdmin, (req: Request, res: Response) => {
  const { id } = req.params;
  const { role } = req.body;
  const target = db.users.get(id);
  if (!target) return res.status(404).json({ code: 404, message: '目标用户不存在' });

  if (id === req.user!.id && role !== 'ADMIN') {
    return res.status(400).json({ code: 400, message: '安全保护：禁止降级当前登录的管理员自身' });
  }

  target.role = role === 'ADMIN' ? 'ADMIN' : 'USER';
  res.json({ code: 200, message: `用户角色已更新为 ${target.role}`, data: target });
});

// CMS 全员活动广播发放积分 (运营活动 / 平台补偿)
app.post('/v1/cms/credits/broadcast', requireAdmin, (req: Request, res: Response) => {
  const { deltaPermanent, deltaDaily, reason } = req.body;
  const dPerm = Number(deltaPermanent) || 0;
  const dDaily = Number(deltaDaily) || 0;
  if (dPerm === 0 && dDaily === 0) {
    return res.status(400).json({ code: 400, message: '发放积分数额不能为 0' });
  }

  const result = db.broadcastCredits(dPerm, dDaily, reason || '官方运营活动奖励');
  res.json({
    code: 200,
    message: `全员活动积分发放成功！已为 ${result.count} 位用户成功充值`,
    data: result,
  });
});

// CMS 管理员调整用户积分
app.post('/v1/cms/users/:id/adjust-credits', requireAdmin, (req: Request, res: Response) => {
  const { id } = req.params;
  const { deltaDaily, deltaPermanent, reason } = req.body;
  const targetUser = db.users.get(id);
  if (!targetUser) {
    return res.status(404).json({ code: 404, message: '目标用户不存在' });
  }

  const dDaily = Number(deltaDaily) || 0;
  const dPerm = Number(deltaPermanent) || 0;

  targetUser.dailyCredits = Math.max(0, targetUser.dailyCredits + dDaily);
  targetUser.permanentCredits = Math.max(0, targetUser.permanentCredits + dPerm);

  db.creditLedger.push({
    id: `ledger-adj-${Date.now()}`,
    userId: targetUser.id,
    txType: 'ADMIN_ADJUST',
    deltaDaily: dDaily,
    deltaPermanent: dPerm,
    balanceDailyAfter: targetUser.dailyCredits,
    balancePermanentAfter: targetUser.permanentCredits,
    description: reason || '管理员手动调控积分',
    createdAt: new Date().toISOString(),
  });

  res.json({
    code: 200,
    message: '用户积分调整成功',
    data: {
      userId: targetUser.id,
      dailyCredits: targetUser.dailyCredits,
      permanentCredits: targetUser.permanentCredits,
    },
  });
});

// CMS 公共单品推荐置顶开关
app.post('/v1/cms/garments/:id/toggle-featured', requireAdmin, (req: Request, res: Response) => {
  const { id } = req.params;
  const garment = db.garments.get(id);
  if (!garment || !garment.isPublic) {
    return res.status(404).json({ code: 404, message: '公共单品不存在' });
  }

  garment.isFeatured = !garment.isFeatured;
  res.json({
    code: 200,
    message: garment.isFeatured ? '单品已置顶推荐到试衣间首位！' : '已取消置顶',
    data: { isFeatured: garment.isFeatured },
  });
});

// CMS 管理员全局积分流水审计日志
app.get('/v1/cms/ledger', requireAdmin, (req: Request, res: Response) => {
  res.json({ code: 200, data: db.creditLedger.slice().reverse() });
});

// --------------------------------------------------------------------
// 5. 个人积分钱包与流水 (Credits)
// --------------------------------------------------------------------
app.get('/v1/credits/my-ledger', requireAuth, (req: Request, res: Response) => {
  const userId = req.user!.id;
  const userLedger = db.creditLedger.filter((l) => l.userId === userId).slice().reverse();
  res.json({
    code: 200,
    data: {
      dailyCredits: req.user!.dailyCredits,
      permanentCredits: req.user!.permanentCredits,
      totalCredits: req.user!.dailyCredits + req.user!.permanentCredits,
      ledger: userLedger,
    },
  });
});

// 每日全员重置 (补齐至 100 积分)
app.post('/v1/credits/reset-daily', requireAdmin, (req: Request, res: Response) => {
  db.resetDailyCredits();
  res.json({ code: 200, message: '每日 100 积分已全员重置补齐完成' });
});

// --------------------------------------------------------------------
// 6. 搭配套装与 AI VTON 渲染 (Outfits & VTON)
// --------------------------------------------------------------------
app.get('/v1/outfits', requireAuth, (req: Request, res: Response) => {
  const profileId = req.query.profileId as string;
  let list = Array.from(db.outfits.values()).filter((o) => o.creatorUserId === req.user!.id);
  if (profileId) {
    list = list.filter((o) => o.profileId === profileId);
  }
  res.json({ code: 200, data: list });
});

app.post('/v1/outfits', requireAuth, (req: Request, res: Response) => {
  const { profileId, title, previewImageUrl, items } = req.body;
  const outfitId = `outfit-${Date.now()}`;

  const newOutfit = {
    id: outfitId,
    profileId: profileId || 'default-profile',
    creatorUserId: req.user!.id,
    title: title || '日常搭配',
    previewImageUrl: previewImageUrl || '',
    isVtonRendered: false,
    isPublic: false,
    items: items || [],
    createdAt: new Date().toISOString(),
  };

  db.outfits.set(outfitId, newOutfit);
  res.status(201).json({ code: 200, message: '搭配套装保存成功', data: newOutfit });
});

app.post('/v1/outfits/render-vton', requireAuth, (req: Request, res: Response) => {
  const { profileId, canvasSnapshotBase64, items } = req.body;

  const deduction = db.deductCredits(
    req.user!.id,
    5,
    'AI VTON 8K 影棚级商业大片渲染'
  );

  if (!deduction.success) {
    return res.status(402).json({
      code: 402,
      message: deduction.error,
    });
  }

  const { taskId } = pipeline.submitTask(
    req.user!.id,
    'VTON_RENDER',
    5,
    { profileId, canvasSnapshotBase64, items }
  );

  res.status(202).json({
    code: 200,
    message: '试穿大片任务已提交，已锁定扣除 5 积分',
    data: {
      taskId,
      remainingDailyCredits: deduction.remainingDaily,
      remainingPermanentCredits: deduction.remainingPermanent,
    },
  });
});

// 异步任务状态查询接口 (支持 HTTP Polling 兜底与防假死保障)
app.get('/v1/tasks/:id', requireAuth, (req: Request, res: Response) => {
  const { id } = req.params;
  const task = db.asyncTasks.get(id);
  if (!task) {
    return res.status(404).json({ code: 404, message: '任务不存在' });
  }

  res.json({
    code: 200,
    data: {
      taskId: task.id,
      taskType: task.taskType,
      status: task.status,
      progressPercent: task.progressPercent,
      currentStage: task.currentStage,
      resultUrl: task.outputResult?.renderedImageUrl || null,
      outputResult: task.outputResult || null,
      error: (task as any).error || null,
      updatedAt: task.updatedAt,
    },
  });
});

// “今天穿什么”灵感抽签
app.get('/v1/outfits/slot-machine', requireAuth, (req: Request, res: Response) => {
  const profileId = req.query.profileId as string;
  const temperatureC = Number(req.query.temperatureC || 22);
  const lockedIds = req.query.lockedIds ? (req.query.lockedIds as string).split(',') : [];

  if (!profileId) {
    return res.status(400).json({ code: 400, message: '必须指定 profileId' });
  }

  const profileGarments = Array.from(db.garments.values()).filter(
    (g) => g.profileId === profileId && !g.isArchived
  );

  const suggestion = generateWeatherOutfitSuggestion(profileGarments, temperatureC, lockedIds);

  res.json({
    code: 200,
    message: '灵感穿搭已生成',
    data: suggestion,
  });
});

// --------------------------------------------------------------------
// 7. OOTD 穿搭日历与好友社交
// --------------------------------------------------------------------
app.get('/v1/ootd', requireAuth, (req: Request, res: Response) => {
  const profileId = req.query.profileId as string;
  const logs = Array.from(db.ootdLogs.values()).filter((l) => l.profileId === profileId);
  res.json({ code: 200, data: logs });
});

app.post('/v1/ootd', requireAuth, (req: Request, res: Response) => {
  const { profileId, outfitId, logDate, weatherTag, notes } = req.body;
  const id = `ootd-${logDate}-${profileId}`;

  const entry = {
    id,
    profileId,
    outfitId,
    logDate,
    weatherTag,
    notes,
    createdAt: new Date().toISOString(),
  };

  db.ootdLogs.set(id, entry);
  res.status(201).json({ code: 200, message: 'OOTD 日历记录已保存', data: entry });
});

app.get('/v1/friends', requireAuth, (req: Request, res: Response) => {
  res.json({ code: 200, data: [] });
});

app.get('/v1/suggestions', requireAuth, (req: Request, res: Response) => {
  const list = Array.from(db.suggestions.values()).filter((s) => s.targetUserId === req.user!.id);
  res.json({ code: 200, data: list });
});

// --------------------------------------------------------------------
// HTTP & WebSocket 服务器监听
// --------------------------------------------------------------------
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/v1/ws/tasks' });

wss.on('connection', (ws) => {
  pipeline.registerConnection(ws);
  ws.send(
    JSON.stringify({
      event: 'CONNECTED',
      data: { message: 'WebSocket 任务推送服务已就绪' },
    })
  );
});

const PORT = 3001;
server.setTimeout(300000);
server.keepAliveTimeout = 300000;
server.headersTimeout = 310000;

server.listen(PORT, () => {
  console.log(`[SmartWardrobe Server] Running on http://localhost:${PORT}`);
  console.log(`[SmartWardrobe WS] WebSocket task stream ready at ws://localhost:${PORT}/v1/ws/tasks`);
});

export { app, server };
