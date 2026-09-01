// ====================================================================
// SmartWardrobe PostgreSQL 18 高性能持久层与原子记账引擎
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
import { pgPool } from './pgPool';

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
  friendCode?: string;
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
  sceneTag?: string;
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

export interface DBFriendship {
  id: string;
  userId: string;
  friendUserId: string;
  status: 'ACCEPTED' | 'PENDING';
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
  public friendships: Map<string, DBFriendship> = new Map();
  public placementMemory: Map<string, any> = new Map();

  // 会话 Token 映射 (token -> { userId, createdAt })
  public sessions: Map<string, { userId: string; createdAt: string }> = new Map();

  constructor() {
    // 构造函数初始化默认种子内存结构
    this.seedMemoryDefaults();
  }

  /**
   * 初始化并从 PostgreSQL 同步所有持久化数据
   */
  public async init(): Promise<void> {
    try {
      console.log('[Database] 正在从 PostgreSQL (端口 54321) 加载数据...');
      
      // 1. 加载用户
      const usersRes = await pgPool.query('SELECT * FROM users');
      if (usersRes.rows.length === 0) {
        console.log('[Database] PostgreSQL 中无用户数据，正在执行种子数据落盘...');
        await this.seedPostgres();
      } else {
        this.users.clear();
        for (const r of usersRes.rows) {
          const u: DBUser = {
            id: r.id,
            username: r.username || (r.email.startsWith('suncraft') ? 'suncraft' : undefined),
            email: r.email,
            passwordHash: r.password_hash,
            salt: r.salt || '',
            nickname: r.nickname,
            avatarUrl: r.avatar_url,
            role: r.role,
            status: r.status || 'NORMAL',
            dailyCredits: r.daily_credits,
            permanentCredits: r.permanent_credits,
            createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
          };
          this.users.set(u.id, u);
        }

        // 2. 加载有效会话
        const sessionsRes = await pgPool.query('SELECT * FROM sessions');
        this.sessions.clear();
        for (const s of sessionsRes.rows) {
          this.sessions.set(s.token, {
            userId: s.user_id,
            createdAt: s.created_at ? new Date(s.created_at).toISOString() : new Date().toISOString(),
          });
        }

        // 3. 加载 Profiles
        const profilesRes = await pgPool.query('SELECT * FROM profiles');
        this.profiles.clear();
        for (const p of profilesRes.rows) {
          const prof: UserProfile = {
            id: p.id,
            userId: p.user_id,
            name: p.name,
            gender: p.gender,
            isDefault: p.is_default,
            heightCm: Number(p.height_cm),
            weightKg: Number(p.weight_kg),
            bustCm: Number(p.bust_cm),
            waistCm: Number(p.waist_cm),
            hipsCm: Number(p.hips_cm),
            isCustomBodyParams: p.is_custom_body_params,
            privacyLevel: p.privacy_level,
          } as any;
          this.profiles.set(prof.id, prof);
        }

        // 4. 加载 Avatars (严格按 is_active 降序及创建时间最新优先加载)
        const avatarsRes = await pgPool.query('SELECT * FROM avatars ORDER BY is_active DESC, created_at DESC');
        this.avatars.clear();
        for (const a of avatarsRes.rows) {
          const av: UserAvatar = {
            id: a.id,
            profileId: a.profile_id,
            originalImageUrl: a.original_image_url || '',
            normalizedImageUrl: a.normalized_image_url || GENERATED_ASSETS.avatarUrl,
            anchorPoints: a.anchor_points || {
              neck: [0.5, 0.28],
              waist: [0.5, 0.53],
              left_foot: [0.44, 0.88],
              right_foot: [0.56, 0.88],
              head: [0.5, 0.12],
            },
            isActive: a.is_active,
          };
          this.avatars.set(av.id, av);
          this.avatars.set(av.profileId, av);
        }

        // 5. 加载 Garments & Assets
        const garmentsRes = await pgPool.query('SELECT * FROM garments');
        const assetsRes = await pgPool.query('SELECT * FROM garment_assets');
        const assetsByGarment = new Map<string, GarmentAssetItem[]>();
        for (const ast of assetsRes.rows) {
          const list = assetsByGarment.get(ast.garment_id) || [];
          list.push({
            id: ast.id,
            garmentId: ast.garment_id,
            stateType: ast.state_type,
            pngUrl: ast.png_url,
            defaultAnchor: ast.default_anchor || { x: 0.5, y: 0.5 },
            baseLayerWeight: ast.base_layer_weight || 10,
          });
          assetsByGarment.set(ast.garment_id, list);
        }

        this.garments.clear();
        for (const g of garmentsRes.rows) {
          const gItem: ExtendedGarmentItem = {
            id: g.id,
            profileId: g.profile_id,
            isPublic: g.is_public,
            isArchived: g.is_archived || false,
            clonedFromId: g.cloned_from_id,
            title: g.title,
            primaryCategory: g.primary_category,
            subCategory: g.sub_category,
            colors: Array.isArray(g.colors) ? g.colors : (typeof g.colors === 'string' ? JSON.parse(g.colors) : []),
            patterns: Array.isArray(g.patterns) ? g.patterns : (typeof g.patterns === 'string' ? JSON.parse(g.patterns) : []),
            material: g.material || '优质面料',
            brand: g.brand,
            priceCents: g.price_cents,
            externalBuyUrl: g.external_buy_url,
            assets: assetsByGarment.get(g.id) || [],
          };
          this.garments.set(gItem.id, gItem);
        }

        // 6. 加载 Outfits & Items
        const outfitsRes = await pgPool.query('SELECT * FROM outfits');
        const outfitItemsRes = await pgPool.query('SELECT * FROM outfit_items');
        const itemsByOutfit = new Map<string, OutfitWearItem[]>();
        for (const item of outfitItemsRes.rows) {
          const list = itemsByOutfit.get(item.outfit_id) || [];
          list.push({
            garmentId: item.garment_id,
            appliedState: item.applied_state,
            zIndex: item.z_index,
            transformMatrix: item.transform_matrix || { scaleX: 1, scaleY: 1, offsetX: 0, offsetY: 0, rotation: 0 },
          });
          itemsByOutfit.set(item.outfit_id, list);
        }

        this.outfits.clear();
        for (const o of outfitsRes.rows) {
          const oItem: DBOutfit = {
            id: o.id,
            profileId: o.profile_id,
            creatorUserId: o.creator_user_id,
            title: o.title,
            previewImageUrl: o.preview_image_url,
            isVtonRendered: o.is_vton_rendered,
            isPublic: o.is_public,
            items: itemsByOutfit.get(o.id) || [],
            createdAt: o.created_at ? new Date(o.created_at).toISOString() : new Date().toISOString(),
          };
          this.outfits.set(oItem.id, oItem);
        }

        // 7. 加载 OOTD 日历
        const ootdRes = await pgPool.query('SELECT * FROM ootd_logs');
        this.ootdLogs.clear();
        for (const log of ootdRes.rows) {
          const dLog: DBOotdLog = {
            id: log.id,
            profileId: log.profile_id,
            outfitId: log.outfit_id,
            logDate: typeof log.log_date === 'string' ? log.log_date : new Date(log.log_date).toISOString().split('T')[0],
            weatherTag: log.weather_tag,
            notes: log.notes,
            createdAt: log.created_at ? new Date(log.created_at).toISOString() : new Date().toISOString(),
          };
          this.ootdLogs.set(dLog.id, dLog);
        }
      }

      console.log(`[Database] ✅ PostgreSQL 数据加载完成: 用户 ${this.users.size} 个, 会话 ${this.sessions.size} 个, 单品 ${this.garments.size} 个`);
    } catch (err: any) {
      console.error('[Database] ⚠️ 从 PostgreSQL 加载数据失败，降级使用内存初始数据:', err.message);
    }
  }

  private seedMemoryDefaults() {
    const now = new Date().toISOString();

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
      isCustomBodyParams: true,
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

    // 官方高定长裙
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

  private async seedPostgres(): Promise<void> {
    try {
      const now = new Date().toISOString();
      for (const user of this.users.values()) {
        await pgPool.query(
          `INSERT INTO users (id, email, password_hash, nickname, avatar_url, role, daily_credits, permanent_credits, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           ON CONFLICT (id) DO UPDATE SET password_hash = EXCLUDED.password_hash`,
          [user.id, user.email, user.passwordHash, user.nickname, user.avatarUrl, user.role, user.dailyCredits, user.permanentCredits, now]
        );
      }

      for (const p of this.profiles.values()) {
        await pgPool.query(
          `INSERT INTO profiles (id, user_id, name, gender, is_default, height_cm, weight_kg, bust_cm, waist_cm, hips_cm, is_custom_body_params, privacy_level, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
           ON CONFLICT (id) DO NOTHING`,
          [p.id, p.userId, p.name, p.gender, p.isDefault, p.heightCm, p.weightKg || 50, p.bustCm || 84, p.waistCm || 62, p.hipsCm || 89, p.isCustomBodyParams ?? true, p.privacyLevel || 'PRIVATE', now]
        );
      }

      for (const a of this.avatars.values()) {
        await pgPool.query(
          `INSERT INTO avatars (id, profile_id, original_image_url, normalized_image_url, anchor_points, is_active, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (id) DO NOTHING`,
          [a.id, a.profileId, a.originalImageUrl, a.normalizedImageUrl, JSON.stringify(a.anchorPoints), a.isActive, now]
        );
      }

      for (const g of this.garments.values()) {
        await pgPool.query(
          `INSERT INTO garments (id, profile_id, is_public, title, primary_category, sub_category, colors, patterns, material, brand, price_cents, external_buy_url, is_archived, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
           ON CONFLICT (id) DO NOTHING`,
          [g.id, g.profileId, g.isPublic, g.title, g.primaryCategory, g.subCategory, JSON.stringify(g.colors), JSON.stringify(g.patterns), g.material, g.brand, g.priceCents, g.externalBuyUrl, g.isArchived, now]
        );

        for (const ast of g.assets) {
          await pgPool.query(
            `INSERT INTO garment_assets (id, garment_id, state_type, png_url, default_anchor, base_layer_weight, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             ON CONFLICT (id) DO NOTHING`,
            [ast.id, ast.garmentId, ast.stateType, ast.pngUrl, JSON.stringify(ast.defaultAnchor), ast.baseLayerWeight, now]
          );
        }
      }
      console.log('[Database] ✅ PostgreSQL 种子数据落盘完成！');
    } catch (e: any) {
      console.error('[Database] 种子数据落盘异常:', e.message);
    }
  }

  // 生成会话 Token 并持久化到 PostgreSQL
  public createSession(userId: string): string {
    const token = `sw_tok_${Date.now()}_${crypto.randomBytes(16).toString('hex')}`;
    const createdAt = new Date().toISOString();
    this.sessions.set(token, { userId, createdAt });

    // 异步落盘 PostgreSQL
    pgPool.query(
      `INSERT INTO sessions (token, user_id, created_at) VALUES ($1, $2, $3)
       ON CONFLICT (token) DO UPDATE SET user_id = EXCLUDED.user_id`,
      [token, userId, createdAt]
    ).catch((err) => console.warn('[Database] 保存会话到 PostgreSQL 失败:', err.message));

    return token;
  }

  public deleteSession(token: string): void {
    this.sessions.delete(token);
    pgPool.query('DELETE FROM sessions WHERE token = $1', [token])
      .catch((err) => console.warn('[Database] 删除会话失败:', err.message));
  }

  public getUserIdByToken(token: string): string | null {
    const s = this.sessions.get(token);
    return s ? s.userId : null;
  }

  // 管理员专用登录
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

  // 普通用户安全登录
  public login(email: string, pass: string): { user: DBUser; token: string } | null {
    const user = Array.from(this.users.values()).find((u) => u.email === email);
    if (!user) return null;

    const isMatch = verifyPassword(pass, user.passwordHash, user.salt);
    if (!isMatch) return null;

    const token = this.createSession(user.id);
    return { user, token };
  }

  // 普通用户安全注册
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

    // 异步插入用户到 PostgreSQL
    pgPool.query(
      `INSERT INTO users (id, email, password_hash, nickname, role, daily_credits, permanent_credits, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [newUser.id, newUser.email, newUser.passwordHash, newUser.nickname, newUser.role, newUser.dailyCredits, newUser.permanentCredits, now]
    ).catch((err) => console.warn('[Database] 注册用户落盘失败:', err.message));

    // 记录初始赠送积分流水
    const ledgerEntry: DBCreditLedger = {
      id: `ledger-reg-${Date.now()}`,
      userId,
      txType: 'REGISTER_BONUS',
      deltaDaily: 100,
      deltaPermanent: 0,
      balanceDailyAfter: 100,
      balancePermanentAfter: 0,
      description: '新用户注册，赠送 100 初始体验积分',
      createdAt: now,
    };
    this.creditLedger.push(ledgerEntry);
    pgPool.query(
      `INSERT INTO credit_ledger (id, user_id, tx_type, delta_daily, delta_permanent, balance_daily_after, balance_permanent_after, description, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [ledgerEntry.id, ledgerEntry.userId, 'DAILY_RESET', ledgerEntry.deltaDaily, ledgerEntry.deltaPermanent, ledgerEntry.balanceDailyAfter, ledgerEntry.balancePermanentAfter, ledgerEntry.description, now]
    ).catch(() => {});

    // 创建默认 Profile
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
    pgPool.query(
      `INSERT INTO profiles (id, user_id, name, gender, is_default, height_cm, weight_kg, bust_cm, waist_cm, hips_cm, is_custom_body_params, privacy_level, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [defaultProfile.id, defaultProfile.userId, defaultProfile.name, defaultProfile.gender, defaultProfile.isDefault, defaultProfile.heightCm, defaultProfile.weightKg, defaultProfile.bustCm, defaultProfile.waistCm, defaultProfile.hipsCm, defaultProfile.isCustomBodyParams, defaultProfile.privacyLevel, now]
    ).catch(() => {});

    // 创建标准模特素体
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

    pgPool.query(
      `INSERT INTO avatars (id, profile_id, original_image_url, normalized_image_url, anchor_points, is_active, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [avatar.id, avatar.profileId, avatar.originalImageUrl, avatar.normalizedImageUrl, JSON.stringify(avatar.anchorPoints), avatar.isActive, now]
    ).catch(() => {});

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

    pgPool.query('UPDATE users SET password_hash = $1, salt = $2 WHERE id = $3', [hash, salt, userId]).catch((err) => console.warn('[Database] 更新密码失败:', err.message));
    return true;
  }

  // 校验单品归属权
  public isGarmentOwner(userId: string, garmentId: string): boolean {
    const garment = this.garments.get(garmentId);
    if (!garment) return false;
    if (!garment.profileId) return false;

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

    const now = new Date().toISOString();
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

    // 异步插入克隆衣物到 PostgreSQL
    pgPool.query(
      `INSERT INTO garments (id, profile_id, is_public, cloned_from_id, title, primary_category, sub_category, colors, patterns, material, brand, price_cents, external_buy_url, is_archived, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
      [clonedGarment.id, clonedGarment.profileId, false, original.id, clonedGarment.title, clonedGarment.primaryCategory, clonedGarment.subCategory, JSON.stringify(clonedGarment.colors), JSON.stringify(clonedGarment.patterns), clonedGarment.material, clonedGarment.brand, clonedGarment.priceCents, clonedGarment.externalBuyUrl, false, now]
    ).then(() => {
      for (const ast of clonedAssets) {
        pgPool.query(
          `INSERT INTO garment_assets (id, garment_id, state_type, png_url, default_anchor, base_layer_weight, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [ast.id, ast.garmentId, ast.stateType, ast.pngUrl, JSON.stringify(ast.defaultAnchor), ast.baseLayerWeight, now]
        ).catch(() => {});
      }
    }).catch((err) => console.warn('[Database] 克隆单品落盘失败:', err.message));

    return clonedGarment;
  }

// 保存单品到数据库 (内存 + PostgreSQL 实时落盘)
  public saveGarment(garment: ExtendedGarmentItem): void {
    this.garments.set(garment.id, garment);
    const now = new Date().toISOString();
    pgPool.query(
      `INSERT INTO garments (id, profile_id, is_public, title, primary_category, sub_category, colors, patterns, material, brand, price_cents, external_buy_url, is_archived, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
       ON CONFLICT (id) DO UPDATE SET
         profile_id = EXCLUDED.profile_id,
         is_public = EXCLUDED.is_public,
         title = EXCLUDED.title,
         primary_category = EXCLUDED.primary_category,
         sub_category = EXCLUDED.sub_category,
         colors = EXCLUDED.colors,
         patterns = EXCLUDED.patterns,
         material = EXCLUDED.material,
         brand = EXCLUDED.brand,
         price_cents = EXCLUDED.price_cents,
         external_buy_url = EXCLUDED.external_buy_url,
         is_archived = EXCLUDED.is_archived,
         updated_at = EXCLUDED.updated_at`,
      [garment.id, garment.profileId || null, !!garment.isPublic, garment.title, garment.primaryCategory, garment.subCategory || null, JSON.stringify(garment.colors || []), JSON.stringify(garment.patterns || []), garment.material || '优质面料', garment.brand || null, garment.priceCents || null, garment.externalBuyUrl || null, !!garment.isArchived, now, now]
    ).then(() => {
      if (garment.assets && garment.assets.length > 0) {
        for (const ast of garment.assets) {
          pgPool.query(
            `INSERT INTO garment_assets (id, garment_id, state_type, png_url, default_anchor, base_layer_weight, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             ON CONFLICT (id) DO UPDATE SET
               png_url = EXCLUDED.png_url,
               state_type = EXCLUDED.state_type,
               default_anchor = EXCLUDED.default_anchor,
               base_layer_weight = EXCLUDED.base_layer_weight`,
            [ast.id, garment.id, ast.stateType || 'DEFAULT', ast.pngUrl, JSON.stringify(ast.defaultAnchor || { x: 0.5, y: 0.5 }), ast.baseLayerWeight || 10, now]
          ).catch((e) => console.warn('[Database] 保存切片资产失败:', e.message));
        }
      }
    }).catch((err) => console.warn('[Database] 保存单品失败:', err.message));
  }

  // 删除单品
  public deleteGarment(id: string): void {
    this.garments.delete(id);
    pgPool.query('DELETE FROM garment_assets WHERE garment_id = $1', [id]).catch(() => {});
    pgPool.query('DELETE FROM garments WHERE id = $1', [id]).catch((err) => console.warn('[Database] 删除单品失败:', err.message));
  }

  // 保存模特素体 (内存 + PostgreSQL 实时落盘)
  public saveAvatar(avatar: UserAvatar): void {
    if (avatar.isActive) {
      for (const [key, av] of this.avatars.entries()) {
        if (av.profileId === avatar.profileId && av.id !== avatar.id) {
          av.isActive = false;
        }
      }
      pgPool.query('UPDATE avatars SET is_active = false WHERE profile_id = $1 AND id != $2', [avatar.profileId, avatar.id]).catch(() => {});
    }
    this.avatars.set(avatar.id, avatar);
    this.avatars.set(avatar.profileId, avatar);
    const now = new Date().toISOString();
    pgPool.query(
      `INSERT INTO avatars (id, profile_id, original_image_url, normalized_image_url, anchor_points, is_active, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (id) DO UPDATE SET
         original_image_url = EXCLUDED.original_image_url,
         normalized_image_url = EXCLUDED.normalized_image_url,
         anchor_points = EXCLUDED.anchor_points,
         is_active = EXCLUDED.is_active`,
      [avatar.id, avatar.profileId, avatar.originalImageUrl || '', avatar.normalizedImageUrl, JSON.stringify(avatar.anchorPoints || {}), avatar.isActive, now]
    ).catch((err) => console.warn('[Database] 保存模特素体到 PostgreSQL 失败:', err.message));
  }

  // 保存用户角色 Profile
  public saveProfile(profile: UserProfile): void {
    this.profiles.set(profile.id, profile);
    const now = new Date().toISOString();
    pgPool.query(
      `INSERT INTO profiles (id, user_id, name, gender, is_default, height_cm, weight_kg, bust_cm, waist_cm, hips_cm, is_custom_body_params, privacy_level, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         gender = EXCLUDED.gender,
         is_default = EXCLUDED.is_default,
         height_cm = EXCLUDED.height_cm,
         weight_kg = EXCLUDED.weight_kg,
         bust_cm = EXCLUDED.bust_cm,
         waist_cm = EXCLUDED.waist_cm,
         hips_cm = EXCLUDED.hips_cm,
         is_custom_body_params = EXCLUDED.is_custom_body_params,
         privacy_level = EXCLUDED.privacy_level,
         updated_at = EXCLUDED.updated_at`,
      [profile.id, profile.userId, profile.name, profile.gender, !!profile.isDefault, profile.heightCm, profile.weightKg || 50, profile.bustCm || 84, profile.waistCm || 62, profile.hipsCm || 89, profile.isCustomBodyParams ?? true, profile.privacyLevel || 'PRIVATE', now, now]
    ).catch((err) => console.warn('[Database] 保存角色档案到 PostgreSQL 失败:', err.message));
  }

  // 保存套装 Lookbook
  public saveOutfit(outfit: DBOutfit): void {
    this.outfits.set(outfit.id, outfit);
    const now = new Date().toISOString();
    pgPool.query(
      `INSERT INTO outfits (id, profile_id, creator_user_id, title, preview_image_url, is_vton_rendered, is_public, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (id) DO UPDATE SET
         title = EXCLUDED.title,
         preview_image_url = EXCLUDED.preview_image_url,
         is_vton_rendered = EXCLUDED.is_vton_rendered,
         is_public = EXCLUDED.is_public,
         updated_at = EXCLUDED.updated_at`,
      [outfit.id, outfit.profileId, outfit.creatorUserId, outfit.title, outfit.previewImageUrl || null, !!outfit.isVtonRendered, !!outfit.isPublic, outfit.createdAt || now, now]
    ).then(() => {
      pgPool.query('DELETE FROM outfit_items WHERE outfit_id = $1', [outfit.id]).then(() => {
        if (Array.isArray(outfit.items)) {
          for (let idx = 0; idx < outfit.items.length; idx++) {
            const item = outfit.items[idx];
            pgPool.query(
              `INSERT INTO outfit_items (id, outfit_id, garment_id, applied_state, z_index, transform_matrix, created_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7)`,
              [`oi-${outfit.id}-${idx}`, outfit.id, item.garmentId, item.appliedState || 'DEFAULT', item.zIndex || idx, JSON.stringify(item.transformMatrix || {}), now]
            ).catch(() => {});
          }
        }
      }).catch(() => {});
    }).catch((err) => console.warn('[Database] 保存套装到 PostgreSQL 失败:', err.message));
  }

  // 删除套装
  public deleteOutfit(outfitId: string): void {
    this.outfits.delete(outfitId);
    pgPool.query('DELETE FROM outfit_items WHERE outfit_id = $1', [outfitId]).catch(() => {});
    pgPool.query('DELETE FROM outfits WHERE id = $1', [outfitId]).catch((err) => console.warn('[Database] 删除套装失败:', err.message));
  }

  // 保存 OOTD 日记
  public saveOotdLog(log: DBOotdLog): void {
    this.ootdLogs.set(log.id, log);
    const now = new Date().toISOString();
    pgPool.query(
      `INSERT INTO ootd_logs (id, profile_id, outfit_id, log_date, weather_tag, notes, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (id) DO UPDATE SET
         weather_tag = EXCLUDED.weather_tag,
         notes = EXCLUDED.notes`,
      [log.id, log.profileId, log.outfitId, log.logDate, log.weatherTag || null, log.notes || null, log.createdAt || now]
    ).catch((err) => console.warn('[Database] 保存 OOTD 日历到 PostgreSQL 失败:', err.message));
  }

  // 删除 OOTD 日历打卡记录
  public deleteOotdLog(id: string): void {
    this.ootdLogs.delete(id);
    pgPool.query('DELETE FROM ootd_logs WHERE id = $1', [id]).catch((err) => console.warn('[Database] 删除 OOTD 记录失败:', err.message));
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

    const now = new Date().toISOString();
    const ledgerEntry: DBCreditLedger = {
      id: `ledger-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      userId,
      taskId,
      txType: 'DEDUCT',
      deltaDaily: -deltaDaily,
      deltaPermanent: -deltaPermanent,
      balanceDailyAfter: user.dailyCredits,
      balancePermanentAfter: user.permanentCredits,
      description,
      createdAt: now,
    };
    this.creditLedger.push(ledgerEntry);

    // 异步更新数据库
    pgPool.query(
      'UPDATE users SET daily_credits = $1, permanent_credits = $2 WHERE id = $3',
      [user.dailyCredits, user.permanentCredits, userId]
    ).catch(() => {});

    pgPool.query(
      `INSERT INTO credit_ledger (id, user_id, task_id, tx_type, delta_daily, delta_permanent, balance_daily_after, balance_permanent_after, description, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [ledgerEntry.id, ledgerEntry.userId, taskId || null, 'AVATAR_GEN', ledgerEntry.deltaDaily, ledgerEntry.deltaPermanent, ledgerEntry.balanceDailyAfter, ledgerEntry.balancePermanentAfter, ledgerEntry.description, now]
    ).catch(() => {});

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
    const now = new Date().toISOString();
    const ledgerEntry: DBCreditLedger = {
      id: `ledger-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      userId,
      taskId,
      txType: 'REFUND',
      deltaDaily: amount,
      deltaPermanent: 0,
      balanceDailyAfter: user.dailyCredits,
      balancePermanentAfter: user.permanentCredits,
      description: `[退款] ${description}`,
      createdAt: now,
    };
    this.creditLedger.push(ledgerEntry);

    pgPool.query('UPDATE users SET daily_credits = $1 WHERE id = $2', [user.dailyCredits, userId]).catch(() => {});
    pgPool.query(
      `INSERT INTO credit_ledger (id, user_id, task_id, tx_type, delta_daily, delta_permanent, balance_daily_after, balance_permanent_after, description, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [ledgerEntry.id, ledgerEntry.userId, taskId || null, 'REFUND', ledgerEntry.deltaDaily, ledgerEntry.deltaPermanent, ledgerEntry.balanceDailyAfter, ledgerEntry.balancePermanentAfter, ledgerEntry.description, now]
    ).catch(() => {});
  }

  // 全员活动广播发放积分
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
      pgPool.query('UPDATE users SET daily_credits = $1, permanent_credits = $2 WHERE id = $3', [user.dailyCredits, user.permanentCredits, userId]).catch(() => {});
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
    pgPool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, userId]).catch(() => {});
    return true;
  }

  // 修改用户状态
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

    pgPool.query('UPDATE users SET status = $1 WHERE id = $2', [status, userId]).catch(() => {});
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


  // 获取或生成用户的 6 位专属衣橱邀请码 (如 SW-8869)
  public getFriendCode(userId: string): string {
    const user = this.users.get(userId);
    if (!user) return 'SW-0000';
    if (user.friendCode) return user.friendCode;
    
    // 生成基于用户 ID 或随机的 6 位大写码
    const hash = crypto.createHash('md5').update(userId).digest('hex').slice(0, 4).toUpperCase();
    const code = `SW-${hash}`;
    user.friendCode = code;
    pgPool.query('UPDATE users SET friend_code = $1 WHERE id = $2', [code, userId]).catch(() => {});
    return code;
  }

  // 通过邀请码或用户名/邮箱添加好友 (双向关联，Defect 4 修复)
  public addFriendByCode(userId: string, codeOrKeyword: string): { friendUser: DBUser; roleTag: string; garmentCount: number } {
    const trimmed = (codeOrKeyword || '').trim();
    if (!trimmed) throw new Error('请输入好友的 6 位邀请码或邮箱');

    const targetUser = Array.from(this.users.values()).find(
      (u) =>
        (u.friendCode && u.friendCode.toUpperCase() === trimmed.toUpperCase()) ||
        (u.email && u.email.toLowerCase() === trimmed.toLowerCase()) ||
        (u.username && u.username.toLowerCase() === trimmed.toLowerCase())
    );

    if (!targetUser) {
      throw new Error('未找到匹配的好友，请核对 6 位邀请码或邮箱');
    }

    if (targetUser.id === userId) {
      throw new Error('不能添加自己为好友');
    }

    const now = new Date().toISOString();
    const fId1 = `friend-${userId}-${targetUser.id}`;
    const fId2 = `friend-${targetUser.id}-${userId}`;

    const f1: DBFriendship = { id: fId1, userId, friendUserId: targetUser.id, status: 'ACCEPTED', createdAt: now };
    const f2: DBFriendship = { id: fId2, userId: targetUser.id, friendUserId: userId, status: 'ACCEPTED', createdAt: now };

    this.friendships.set(f1.id, f1);
    this.friendships.set(f2.id, f2);

    // 异步落盘 PostgreSQL
    pgPool.query(
      `INSERT INTO friendships (id, user_id, friend_user_id, status, created_at)
       VALUES ($1, $2, $3, $4, $5), ($6, $7, $8, $9, $10)
       ON CONFLICT (user_id, friend_user_id) DO UPDATE SET status = 'ACCEPTED'`,
      [f1.id, f1.userId, f1.friendUserId, f1.status, f1.createdAt, f2.id, f2.userId, f2.friendUserId, f2.status, f2.createdAt]
    ).catch(() => {});

    const targetProfiles = Array.from(this.profiles.values()).filter((p) => p.userId === targetUser.id);
    const defProf = targetProfiles.find((p) => p.isDefault) || targetProfiles[0] || null;
    const gCount = Array.from(this.garments.values()).filter((g) => g.profileId === defProf?.id && !g.isArchived).length;

    return {
      friendUser: targetUser,
      roleTag: defProf ? `${defProf.gender === 'MALE' ? '男士' : '女士'} · 专属模特` : '法式极简 · 时尚达人',
      garmentCount: gCount,
    };
  }

  // 获取真实好友列表
  public getFriends(userId: string) {
    const friendIds = Array.from(this.friendships.values())
      .filter((f) => f.userId === userId && f.status === 'ACCEPTED')
      .map((f) => f.friendUserId);

    return friendIds.map((fId) => {
      const fUser = this.users.get(fId);
      const fProfiles = Array.from(this.profiles.values()).filter((p) => p.userId === fId);
      const defProf = fProfiles.find((p) => p.isDefault) || fProfiles[0] || null;
      const gCount = Array.from(this.garments.values()).filter((g) => g.profileId === defProf?.id && !g.isArchived).length;

      return {
        id: `f-${fId}`,
        friendUserId: fId,
        name: fUser?.nickname || '衣橱好友',
        username: fUser?.username,
        avatarUrl: fUser?.avatarUrl,
        friendCode: this.getFriendCode(fId),
        roleTag: defProf ? `${defProf.gender === 'MALE' ? '男士' : '女士'} · 专属模特` : '法式极简 · 时尚达人',
        garmentCount: gCount,
        defaultProfileId: defProf?.id || null,
      };
    });
  }

  // 解除好友关系
  public removeFriend(userId: string, friendUserId: string): boolean {
    const fId1 = `friend-${userId}-${friendUserId}`;
    const fId2 = `friend-${friendUserId}-${userId}`;
    this.friendships.delete(fId1);
    this.friendships.delete(fId2);
    pgPool.query('DELETE FROM friendships WHERE (user_id = $1 AND friend_user_id = $2) OR (user_id = $2 AND friend_user_id = $1)', [userId, friendUserId]).catch(() => {});
    return true;
  }

  // 跨衣橱为好友推送穿搭方案
  public suggestOutfit(payload: {
    fromUserId: string;
    fromNickname: string;
    targetUserId: string;
    targetProfileId: string;
    title: string;
    garmentIds: string[];
    previewImageUrl?: string;
    notes?: string;
  }): OutfitSuggestion {
    const id = `sug-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    const sug: OutfitSuggestion = {
      id,
      fromUserId: payload.fromUserId,
      fromNickname: payload.fromNickname,
      targetUserId: payload.targetUserId,
      targetProfileId: payload.targetProfileId,
      title: payload.title || '好友为你定制的灵感搭配',
      garmentIds: payload.garmentIds,
      previewImageUrl: payload.previewImageUrl,
      isAccepted: false,
      createdAt: new Date().toISOString(),
    };
    this.suggestions.set(id, sug);
    pgPool.query(
      `INSERT INTO outfit_suggestions (id, from_user_id, from_nickname, target_user_id, target_profile_id, title, garment_ids, preview_image_url, notes, is_accepted, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [sug.id, sug.fromUserId, sug.fromNickname, sug.targetUserId, sug.targetProfileId, sug.title, JSON.stringify(sug.garmentIds), sug.previewImageUrl, payload.notes || '', sug.isAccepted, sug.createdAt]
    ).catch(() => {});
    return sug;
  }

  // 采纳好友推送的穿搭方案
  public acceptSuggestion(suggestionId: string, recipientUserId: string): DBOutfit {
    const sug = this.suggestions.get(suggestionId);
    if (!sug) throw new Error('搭配建议不存在');
    if (sug.targetUserId !== recipientUserId) throw new Error('无权采纳此建议');

    sug.isAccepted = true;
    pgPool.query('UPDATE outfit_suggestions SET is_accepted = true WHERE id = $1', [suggestionId]).catch(() => {});

    // 创建对应 Outfit
    const outfitId = `outfit-sug-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    const newOutfit: DBOutfit = {
      id: outfitId,
      profileId: sug.targetProfileId,
      creatorUserId: recipientUserId,
      title: `[好友灵感] ${sug.title}`,
      previewImageUrl: sug.previewImageUrl,
      isVtonRendered: !!sug.previewImageUrl,
      isPublic: false,
      sceneTag: 'CASUAL',
      items: sug.garmentIds.map((gId, idx) => ({
        garmentId: gId,
        appliedState: 'DEFAULT' as any,
        zIndex: idx + 1,
        transformMatrix: { scaleX: 1, scaleY: 1, offsetX: 0, offsetY: 0, rotation: 0 },
      })),
      createdAt: new Date().toISOString(),
    };
    this.saveOutfit(newOutfit);
    return newOutfit;
  }

  // 获取好友的 Lookbook 搭配库 (Defect 16)
  public getFriendOutfits(friendUserId: string): DBOutfit[] {
    const friendProfiles = Array.from(this.profiles.values()).filter((p) => p.userId === friendUserId);
    const profileIds = new Set(friendProfiles.map((p) => p.id));
    return Array.from(this.outfits.values()).filter((o) => profileIds.has(o.profileId) || o.creatorUserId === friendUserId);
  }

  public getSuggestions(userId: string): OutfitSuggestion[] {
    return Array.from(this.suggestions.values()).filter((s) => s.targetUserId === userId);
  }

  // 每日零点重置补齐至 100 积分
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
        pgPool.query('UPDATE users SET daily_credits = 100 WHERE id = $1', [userId]).catch(() => {});
      }
    }
  }
}

export const db = new Database();
