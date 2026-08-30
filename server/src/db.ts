// ====================================================================
// SmartWardrobe 内存数据持久层与原子记账引擎 (安全强化与纯净数据底座版)
// ====================================================================

import crypto from 'crypto';
import {
  UserProfile,
  UserAvatar,
  GarmentItem,
  GarmentAssetItem,
  OutfitWearItem,
  TaskType,
  TaskStatus,
  PrivacyLevel,
  analyzeGarmentAttributes,
  generateFissionAssets,
  calculateGoldenRatioBody,
} from '@smart-wardrobe/shared';
import { GENERATED_ASSETS } from './generatedAssets';

// 安全密码加盐哈希辅助函数
export function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const passwordSalt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, passwordSalt, 10000, 64, 'sha512').toString('hex');
  return { hash, salt: passwordSalt };
}

export function verifyPassword(password: string, storedHash: string, salt: string): boolean {
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return hash === storedHash;
}

export interface DBUser {
  id: string;
  username?: string;
  email: string;
  passwordHash: string;
  salt: string;
  nickname: string;
  avatarUrl?: string;
  role: 'USER' | 'ADMIN';
  status: 'NORMAL' | 'FROZEN' | 'BANNED';
  dailyCredits: number;
  permanentCredits: number;
  createdAt: string;
}

export interface DBOutfit {
  id: string;
  profileId: string;
  creatorUserId: string;
  title: string;
  previewImageUrl?: string;
  isVtonRendered: boolean;
  isPublic: boolean;
  items: OutfitWearItem[];
  createdAt: string;
}

export interface DBOotdLog {
  id: string;
  profileId: string;
  outfitId: string;
  logDate: string;
  weatherTag?: string;
  notes?: string;
  createdAt: string;
}

export interface DBAsyncTask {
  id: string;
  userId: string;
  taskType: TaskType;
  status: TaskStatus;
  progressPercent: number;
  currentStage?: string;
  inputPayload: any;
  outputResult?: any;
  costCredits: number;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DBCreditLedger {
  id: string;
  userId: string;
  taskId?: string;
  txType: string;
  deltaDaily: number;
  deltaPermanent: number;
  balanceDailyAfter: number;
  balancePermanentAfter: number;
  description: string;
  createdAt: string;
}

export interface OutfitSuggestion {
  id: string;
  fromUserId: string;
  fromNickname: string;
  targetUserId: string;
  targetProfileId: string;
  title: string;
  garmentIds: string[];
  previewImageUrl?: string;
  isAccepted: boolean;
  createdAt: string;
}

export interface ExtendedGarmentItem extends GarmentItem {
  clonedFromId?: string;
  brand?: string;
  priceCents?: number;
  externalBuyUrl?: string;
  isArchived?: boolean;
  isFeatured?: boolean;
  box_2d?: [number, number, number, number];
}

export class Database {
  public users: Map<string, DBUser> = new Map();
  public profiles: Map<string, UserProfile> = new Map();
  public avatars: Map<string, UserAvatar> = new Map();
  public garments: Map<string, ExtendedGarmentItem> = new Map();
  public outfits: Map<string, DBOutfit> = new Map();
  public ootdLogs: Map<string, DBOotdLog> = new Map();
  public asyncTasks: Map<string, DBAsyncTask> = new Map();
  public creditLedger: DBCreditLedger[] = [];
  public suggestions: Map<string, OutfitSuggestion> = new Map();
  public placementMemory: Map<string, any> = new Map();

  // 会话 Token 映射 (token -> userId)
  public sessions: Map<string, { userId: string; createdAt: string }> = new Map();

  constructor() {
    this.seedData();
  }

  private seedData() {
    const now = new Date().toISOString();

    // 1. 初始化唯一系统超级管理员账号 (账号: suncraft, 密码: sqm17709021, 加盐密文存储)
    const adminPass = hashPassword('sqm17709021');
    const adminUser: DBUser = {
      id: 'admin-suncraft-0000',
      username: 'suncraft',
      email: 'suncraft@smartwardrobe.internal',
      passwordHash: adminPass.hash,
      salt: adminPass.salt,
      nickname: '系统超级管理员 (suncraft)',
      avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100',
      role: 'ADMIN',
      status: 'NORMAL',
      dailyCredits: 99999,
      permanentCredits: 99999,
      createdAt: now,
    };
    this.users.set(adminUser.id, adminUser);

    // 2. 初始化标准测试用户 (账号: test@smartwardrobe.com, 密码: password123)
    const testPass = hashPassword('password123');
    const testUser: DBUser = {
      id: 'user-test-fixed-0001',
      username: 'testuser',
      email: 'test@smartwardrobe.com',
      passwordHash: testPass.hash,
      salt: testPass.salt,
      nickname: '标准测试用户',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100',
      role: 'USER',
      status: 'NORMAL',
      dailyCredits: 100,
      permanentCredits: 500,
      createdAt: now,
    };
    this.users.set(testUser.id, testUser);

    // 为标准测试用户初始化默认身材档案与 3:4 素体
    const testProfileId = 'profile-test-fixed-0001';
    const testProfile: UserProfile = {
      id: testProfileId,
      userId: testUser.id,
      name: '我的身材档案',
      gender: 'FEMALE',
      isDefault: true,
      heightCm: 168,
      weightKg: 50,
      bustCm: 84,
      waistCm: 62,
      hipsCm: 89,
      bodyType: 'HOURGLASS' as any,
      skinTone: 'WARM_NATURAL' as any,
      hairstyle: 'FRENCH_WAVY_LONG' as any,
      privacyLevel: 'PRIVATE',
    } as any;
    this.profiles.set(testProfileId, testProfile);

    const testAvatar: UserAvatar = {
      id: `avatar-${testProfileId}`,
      profileId: testProfileId,
      originalImageUrl: '',
      normalizedImageUrl: GENERATED_ASSETS.avatarFemaleUrl || GENERATED_ASSETS.avatarUrl,
      anchorPoints: {
        neck: [0.5, 0.28],
        waist: [0.5, 0.53],
        left_foot: [0.44, 0.88],
        right_foot: [0.56, 0.88],
        head: [0.5, 0.12],
      },
      isActive: true,
    };
    this.avatars.set(testAvatar.id, testAvatar);
    this.avatars.set(testProfileId, testAvatar);

    // 3. 初始化官方公共试衣间高定单品 (isPublic = true, profileId = null)
    // 高定长裙
    const dressGarmentId = 'g-public-gown-real';
    this.garments.set(dressGarmentId, {
      id: dressGarmentId,
      profileId: null,
      isPublic: true,
      isArchived: false,
      title: '露肩蕾丝深V刺绣幻彩拖地长裙',
      primaryCategory: 'TOPS',
      subCategory: 'Evening Dress',
      colors: ['#0f0c29', '#302b63', '#24243e'],
      patterns: ['FLORAL'],
      material: '重磅真丝缎面与手工蕾丝',
      brand: 'DIOR 巴黎高定',
      priceCents: 688000,
      externalBuyUrl: 'https://item.taobao.com/item.htm?id=72348911',
      assets: [
        {
          id: `asset-${dressGarmentId}-default`,
          garmentId: dressGarmentId,
          stateType: 'DEFAULT',
          pngUrl: GENERATED_ASSETS.dressCutoutUrl,
          defaultAnchor: { x: 0.5, y: 0.5 },
          baseLayerWeight: 10,
        },
      ],
    });

    // 华丽发冠
    const crownGarmentId = 'g-public-crown-real';
    this.garments.set(crownGarmentId, {
      id: crownGarmentId,
      profileId: null,
      isPublic: true,
      isArchived: false,
      title: '紫金色凤展雕花古风华丽发冠',
      primaryCategory: 'ACCESSORIES',
      subCategory: 'Crown',
      colors: ['#FFD700', '#800080'],
      patterns: ['FLORAL'],
      material: '镀金掐丝与紫水晶',
      brand: '故宫文创典藏',
      priceCents: 128000,
      externalBuyUrl: 'https://item.jd.com/100098273.html',
      assets: [
        {
          id: `asset-${crownGarmentId}-default`,
          garmentId: crownGarmentId,
          stateType: 'DEFAULT',
          pngUrl: GENERATED_ASSETS.crownCutoutUrl,
          defaultAnchor: { x: 0.5, y: 0.5 },
          baseLayerWeight: 60,
        },
      ],
    });
  }

  // 生成或验证会话 Token
  public createSession(userId: string): string {
    const token = `sw_tok_${Date.now()}_${crypto.randomBytes(16).toString('hex')}`;
    this.sessions.set(token, { userId, createdAt: new Date().toISOString() });
    return token;
  }

  public getUserIdByToken(token: string): string | null {
    const s = this.sessions.get(token);
    return s ? s.userId : null;
  }

  // 管理员专用登录 (校验 suncraft + 密码)
  public adminLogin(usernameOrEmail: string, pass: string): { user: DBUser; token: string } | null {
    const user = Array.from(this.users.values()).find(
      (u) => (u.username === usernameOrEmail || u.email === usernameOrEmail) && u.role === 'ADMIN'
    );
    if (!user) return null;

    const isMatch = verifyPassword(pass, user.passwordHash, user.salt);
    if (!isMatch) return null;

    const token = this.createSession(user.id);
    return { user, token };
  }

  // 普通用户安全登录 (校验 email + 密码)
  public login(email: string, pass: string): { user: DBUser; token: string } | null {
    const user = Array.from(this.users.values()).find((u) => u.email === email);
    if (!user) return null;

    const isMatch = verifyPassword(pass, user.passwordHash, user.salt);
    if (!isMatch) return null;

    const token = this.createSession(user.id);
    return { user, token };
  }

  // 普通用户安全注册 (三步流: 账号密码 -> 五维身材 -> 可选素体照片)
  public register(payload: {
    email: string;
    password: string;
    nickname: string;
    gender?: 'MALE' | 'FEMALE';
    heightCm?: number;
    weightKg?: number;
    bustCm?: number;
    waistCm?: number;
    hipsCm?: number;
    isCustomBodyParams?: boolean;
    avatarImageUrl?: string;
  }): { user: DBUser; token: string; profile: UserProfile; avatar: UserAvatar } {
    const existing = Array.from(this.users.values()).find((u) => u.email === payload.email);
    if (existing) {
      throw new Error('该邮箱已注册，请直接登录');
    }

    const now = new Date().toISOString();
    const { hash, salt } = hashPassword(payload.password);
    const userId = `user-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

    const newUser: DBUser = {
      id: userId,
      email: payload.email,
      passwordHash: hash,
      salt,
      nickname: payload.nickname || '时尚达人',
      role: 'USER',
      status: 'NORMAL',
      dailyCredits: 100,
      permanentCredits: 0,
      createdAt: now,
    };
    this.users.set(newUser.id, newUser);

    // 记录初始赠送积分流水
    this.creditLedger.push({
      id: `ledger-reg-${Date.now()}`,
      userId,
      txType: 'REGISTER_BONUS',
      deltaDaily: 100,
      deltaPermanent: 0,
      balanceDailyAfter: 100,
      balancePermanentAfter: 0,
      description: '新用户注册，赠送 100 初始体验积分',
      createdAt: now,
    });

    // 创建默认 Profile (绑定注册填写的五维身材)
    const gender = payload.gender || 'FEMALE';
    const height = payload.heightCm || (gender === 'MALE' ? 178 : 165);
    const weight = payload.weightKg || (gender === 'MALE' ? 70 : 50);
    const bust = payload.bustCm || (gender === 'MALE' ? 95 : 84);
    const waist = payload.waistCm || (gender === 'MALE' ? 76 : 62);
    const hips = payload.hipsCm || (gender === 'MALE' ? 92 : 88);

    const profileId = `profile-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    const defaultProfile: UserProfile = {
      id: profileId,
      userId: newUser.id,
      name: '我自己',
      gender,
      isDefault: true,
      heightCm: height,
      weightKg: weight,
      bustCm: bust,
      waistCm: waist,
      hipsCm: hips,
      isCustomBodyParams: payload.isCustomBodyParams ?? true,
      privacyLevel: 'PRIVATE',
    };
    this.profiles.set(defaultProfile.id, defaultProfile);

    // 创建标准模特素体 (若用户提供了全身照则装载，否则使用对应性别身材标准素体)
    const defaultAvatar = gender === 'MALE'
      ? ((GENERATED_ASSETS as any).avatarMaleUrl || GENERATED_ASSETS.avatarUrl)
      : ((GENERATED_ASSETS as any).avatarFemaleUrl || GENERATED_ASSETS.avatarUrl);
    const avatarUrl = payload.avatarImageUrl || defaultAvatar;
    const avatar: UserAvatar = {
      id: `avatar-${profileId}`,
      profileId,
      originalImageUrl: payload.avatarImageUrl || '',
      normalizedImageUrl: avatarUrl,
      anchorPoints: {
        neck: [0.5, 0.28],
        waist: [0.5, 0.55],
        left_foot: [0.44, 0.88],
        right_foot: [0.56, 0.88],
        head: [0.5, 0.12],
      },
      isActive: true,
    };
    this.avatars.set(avatar.id, avatar);
    this.avatars.set(profileId, avatar);

    const token = this.createSession(newUser.id);
    return { user: newUser, token, profile: defaultProfile, avatar };
  }

  // 修改密码
  public changePassword(userId: string, oldPass: string, newPass: string): boolean {
    const user = this.users.get(userId);
    if (!user) return false;

    const isMatch = verifyPassword(oldPass, user.passwordHash, user.salt);
    if (!isMatch) return false;

    const { hash, salt } = hashPassword(newPass);
    user.passwordHash = hash;
    user.salt = salt;
    return true;
  }

  // 校验单品归属权，杜绝水平越权 (IDOR)
  public isGarmentOwner(userId: string, garmentId: string): boolean {
    const garment = this.garments.get(garmentId);
    if (!garment) return false;
    if (!garment.profileId) return false; // 公共单品由管理员管理

    const profile = this.profiles.get(garment.profileId);
    if (!profile) return false;

    return profile.userId === userId;
  }

  public canAccessProfile(currentUserId: string, targetProfileId: string): boolean {
    const target = this.profiles.get(targetProfileId);
    if (!target) return false;
    if (target.userId === currentUserId) return true;
    if (target.privacyLevel === 'PUBLIC' || target.privacyLevel === 'FRIENDS_ONLY') return true;
    return false;
  }

  // 深度克隆公共衣物
  public clonePublicGarment(garmentId: string, targetProfileId: string): ExtendedGarmentItem | null {
    const original = this.garments.get(garmentId);
    if (!original || !original.isPublic) return null;

    const clonedId = `cloned-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    const clonedAssets: GarmentAssetItem[] = original.assets.map((asset, index) => ({
      ...asset,
      id: `asset-${clonedId}-${index}`,
      garmentId: clonedId,
    }));

    const clonedGarment: ExtendedGarmentItem = {
      ...original,
      id: clonedId,
      profileId: targetProfileId,
      isPublic: false,
      isArchived: false,
      clonedFromId: original.id,
      assets: clonedAssets,
    };

    this.garments.set(clonedId, clonedGarment);
    return clonedGarment;
  }

  // 原子扣除积分
  public deductCredits(
    userId: string,
    amount: number,
    description: string,
    taskId?: string
  ): { success: boolean; remainingDaily: number; remainingPermanent: number; error?: string } {
    const user = this.users.get(userId);
    if (!user) return { success: false, remainingDaily: 0, remainingPermanent: 0, error: '用户不存在' };

    const totalAvailable = user.dailyCredits + user.permanentCredits;
    if (totalAvailable < amount) {
      return {
        success: false,
        remainingDaily: user.dailyCredits,
        remainingPermanent: user.permanentCredits,
        error: `积分不足（需消耗 ${amount}，当前可用 ${totalAvailable}）`,
      };
    }

    let deltaDaily = 0;
    let deltaPermanent = 0;

    if (user.dailyCredits >= amount) {
      deltaDaily = amount;
      user.dailyCredits -= amount;
    } else {
      deltaDaily = user.dailyCredits;
      deltaPermanent = amount - user.dailyCredits;
      user.dailyCredits = 0;
      user.permanentCredits -= deltaPermanent;
    }

    this.creditLedger.push({
      id: `ledger-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      userId,
      taskId,
      txType: 'DEDUCT',
      deltaDaily: -deltaDaily,
      deltaPermanent: -deltaPermanent,
      balanceDailyAfter: user.dailyCredits,
      balancePermanentAfter: user.permanentCredits,
      description,
      createdAt: new Date().toISOString(),
    });

    return {
      success: true,
      remainingDaily: user.dailyCredits,
      remainingPermanent: user.permanentCredits,
    };
  }

  // 退款
  public refundCredits(userId: string, amount: number, description: string, taskId?: string) {
    const user = this.users.get(userId);
    if (!user) return;

    user.dailyCredits += amount;
    this.creditLedger.push({
      id: `ledger-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      userId,
      taskId,
      txType: 'REFUND',
      deltaDaily: amount,
      deltaPermanent: 0,
      balanceDailyAfter: user.dailyCredits,
      balancePermanentAfter: user.permanentCredits,
      description: `[退款] ${description}`,
      createdAt: new Date().toISOString(),
    });
  }

  // 全员活动广播发放积分 (运营活动 / 平台补偿)
  public broadcastCredits(deltaPermanent: number, deltaDaily: number, reason: string): { count: number } {
    const now = new Date().toISOString();
    let count = 0;
    for (const [userId, user] of this.users.entries()) {
      if (user.role === 'ADMIN') continue;
      user.permanentCredits += deltaPermanent;
      user.dailyCredits += deltaDaily;
      this.creditLedger.push({
        id: `ledger-broadcast-${userId}-${Date.now()}`,
        userId,
        txType: 'BROADCAST_REWARD',
        deltaDaily,
        deltaPermanent,
        balanceDailyAfter: user.dailyCredits,
        balancePermanentAfter: user.permanentCredits,
        description: `[全员活动广播] ${reason}`,
        createdAt: now,
      });
      count++;
    }
    return { count };
  }

  // 管理员重置用户密码
  public resetUserPassword(userId: string, newPass: string): boolean {
    const user = this.users.get(userId);
    if (!user) return false;
    const { hash, salt } = hashPassword(newPass);
    user.passwordHash = hash;
    user.salt = salt;
    return true;
  }

  // 修改用户状态 (NORMAL / FROZEN / BANNED)
  public updateUserStatus(
    userId: string,
    status: 'NORMAL' | 'FROZEN' | 'BANNED',
    operatorId: string,
    reason?: string
  ): DBUser | null {
    const user = this.users.get(userId);
    if (!user) return null;
    if (user.role === 'ADMIN' && status !== 'NORMAL') {
      throw new Error('系统安全保护：禁止封禁或冻结管理员账号');
    }
    user.status = status;

    // 记录审计流水
    this.creditLedger.push({
      id: `ledger-status-${userId}-${Date.now()}`,
      userId,
      txType: 'STATUS_CHANGE',
      deltaDaily: 0,
      deltaPermanent: 0,
      balanceDailyAfter: user.dailyCredits,
      balancePermanentAfter: user.permanentCredits,
      description: `[账号状态变更] 设为 ${status}${reason ? ' - 原因: ' + reason : ''}`,
      createdAt: new Date().toISOString(),
    });

    return user;
  }

  // 获取用户 360° 资产画像详情
  public getUserFullDetails(userId: string) {
    const user = this.users.get(userId);
    if (!user) return null;

    const profiles = Array.from(this.profiles.values()).filter((p) => p.userId === userId);
    const profileIds = new Set(profiles.map((p) => p.id));
    const userGarments = Array.from(this.garments.values()).filter(
      (g) => g.profileId && profileIds.has(g.profileId)
    );
    const userOutfits = Array.from(this.outfits.values()).filter(
      (o) => o.creatorUserId === userId || (o.profileId && profileIds.has(o.profileId))
    );
    const userTasks = Array.from(this.asyncTasks.values()).filter((t) => t.userId === userId);
    const userLedger = this.creditLedger.filter((l) => l.userId === userId).slice().reverse();

    return {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        nickname: user.nickname,
        avatarUrl: user.avatarUrl,
        role: user.role,
        status: user.status || 'NORMAL',
        dailyCredits: user.dailyCredits,
        permanentCredits: user.permanentCredits,
        totalCredits: user.dailyCredits + user.permanentCredits,
        createdAt: user.createdAt,
      },
      profiles,
      garmentsCount: userGarments.length,
      garments: userGarments.slice(0, 20),
      outfitsCount: userOutfits.length,
      outfits: userOutfits.slice(0, 10),
      tasksCount: userTasks.length,
      recentTasks: userTasks.slice(-5),
      recentLedger: userLedger.slice(0, 15),
    };
  }

  // 获取运营统计大盘数据
  public getDashboardStats() {
    const totalUsers = Array.from(this.users.values()).filter((u) => u.role !== 'ADMIN').length;
    const totalAdmins = Array.from(this.users.values()).filter((u) => u.role === 'ADMIN').length;
    const normalUsers = Array.from(this.users.values()).filter((u) => u.status === 'NORMAL' || !u.status).length;
    const frozenUsers = Array.from(this.users.values()).filter((u) => u.status === 'FROZEN').length;
    const bannedUsers = Array.from(this.users.values()).filter((u) => u.status === 'BANNED').length;

    const publicGarments = Array.from(this.garments.values()).filter((g) => g.isPublic);
    const activePublicGarments = publicGarments.filter((g) => !g.isArchived).length;
    const featuredPublicGarments = publicGarments.filter((g) => g.isFeatured).length;

    const totalTasks = this.asyncTasks.size;
    const totalOutfits = this.outfits.size;
    const totalProfiles = this.profiles.size;

    let totalDailyPool = 0;
    let totalPermanentPool = 0;
    for (const u of this.users.values()) {
      if (u.role === 'ADMIN') continue;
      totalDailyPool += u.dailyCredits;
      totalPermanentPool += u.permanentCredits;
    }

    return {
      totalUsers,
      totalAdmins,
      normalUsers,
      frozenUsers,
      bannedUsers,
      totalProfiles,
      totalOutfits,
      totalTasks,
      totalPublicGarments: publicGarments.length,
      activePublicGarments,
      featuredPublicGarments,
      totalDailyPool,
      totalPermanentPool,
      totalLedgerTransactions: this.creditLedger.length,
    };
  }

  // 每日零点重置补齐至 100 积分 (不足 100 则补足至 100，原有超出或永久积分保留)
  public resetDailyCredits() {
    const now = new Date().toISOString();
    for (const [userId, user] of this.users.entries()) {
      if (user.role === 'ADMIN') continue;
      if (user.dailyCredits < 100) {
        const topup = 100 - user.dailyCredits;
        user.dailyCredits = 100;
        this.creditLedger.push({
          id: `ledger-reset-${userId}-${Date.now()}`,
          userId,
          txType: 'DAILY_RESET',
          deltaDaily: topup,
          deltaPermanent: 0,
          balanceDailyAfter: 100,
          balancePermanentAfter: user.permanentCredits,
          description: `每日零点定时重置：补齐 ${topup} 积分至 100 分`,
          createdAt: now,
        });
      }
    }
  }
}

export const db = new Database();
