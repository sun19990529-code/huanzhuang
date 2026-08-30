-- ====================================================================
-- SmartWardrobe PostgreSQL 16+ DDL 物理建模脚本
-- ====================================================================

-- 启用 UUID 扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. 枚举类型定义
DROP TYPE IF EXISTS user_role_enum CASCADE;
DROP TYPE IF EXISTS gender_enum CASCADE;
DROP TYPE IF EXISTS privacy_level_enum CASCADE;
DROP TYPE IF EXISTS garment_category_enum CASCADE;
DROP TYPE IF EXISTS garment_state_enum CASCADE;
DROP TYPE IF EXISTS task_type_enum CASCADE;
DROP TYPE IF EXISTS task_status_enum CASCADE;
DROP TYPE IF EXISTS credit_tx_type_enum CASCADE;

CREATE TYPE user_role_enum AS ENUM ('USER', 'ADMIN');
CREATE TYPE gender_enum AS ENUM ('MALE', 'FEMALE', 'OTHER');
CREATE TYPE privacy_level_enum AS ENUM ('PRIVATE', 'FRIENDS_ONLY', 'PUBLIC');
CREATE TYPE garment_category_enum AS ENUM ('TOPS', 'BOTTOMS', 'OUTERWEAR', 'FOOTWEAR', 'ACCESSORIES', 'ONE_PIECE');
CREATE TYPE garment_state_enum AS ENUM ('DEFAULT', 'OPEN', 'CLOSED', 'TUCKED', 'UNTUCKED');
CREATE TYPE task_type_enum AS ENUM ('AVATAR_NORMALIZE', 'GARMENT_NORMALIZE', 'VTON_RENDER');
CREATE TYPE task_status_enum AS ENUM ('PENDING', 'PROCESSING', 'SUCCESS', 'FAILED', 'TIMEOUT');
CREATE TYPE credit_tx_type_enum AS ENUM ('DAILY_RESET', 'AVATAR_GEN', 'GARMENT_GEN', 'VTON_RENDER', 'REFUND', 'MANUAL_ADJUST');

-- 2. 用户与认证表 (users)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    nickname VARCHAR(100) NOT NULL,
    avatar_url TEXT,
    role user_role_enum NOT NULL DEFAULT 'USER',
    daily_credits INT NOT NULL DEFAULT 100 CHECK (daily_credits >= 0),
    permanent_credits INT NOT NULL DEFAULT 0 CHECK (permanent_credits >= 0),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- 3. 角色档案表 (profiles - 支持多角色)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    gender gender_enum NOT NULL DEFAULT 'FEMALE',
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    height_cm NUMERIC(5,2) NOT NULL DEFAULT 165.00,
    weight_kg NUMERIC(5,2) NOT NULL DEFAULT 52.00,
    bust_cm NUMERIC(5,2) NOT NULL DEFAULT 86.00,
    waist_cm NUMERIC(5,2) NOT NULL DEFAULT 66.00,
    hips_cm NUMERIC(5,2) NOT NULL DEFAULT 90.00,
    is_custom_body_params BOOLEAN NOT NULL DEFAULT FALSE,
    privacy_level privacy_level_enum NOT NULL DEFAULT 'PRIVATE',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);

-- 4. 素体资产表 (avatars)
CREATE TABLE IF NOT EXISTS avatars (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    original_image_url TEXT NOT NULL,
    normalized_image_url TEXT, -- A-Pose 透明 PNG
    face_embedding_vector JSONB, -- 人脸特征向量
    anchor_points JSONB NOT NULL DEFAULT '{"neck": [0.5, 0.28], "waist": [0.5, 0.55], "left_foot": [0.42, 0.90], "right_foot": [0.58, 0.90]}'::jsonb, -- 关键锚点归一化坐标
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_avatars_profile_id ON avatars(profile_id);

-- 5. 衣物主表 (garments - 涵盖私有与公共衣柜)
CREATE TABLE IF NOT EXISTS garments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE, -- NULL 表示官方公共衣柜资产
    is_public BOOLEAN NOT NULL DEFAULT FALSE,
    cloned_from_id UUID REFERENCES garments(id) ON DELETE SET NULL, -- 追溯公共衣物源头
    title VARCHAR(200) NOT NULL,
    primary_category garment_category_enum NOT NULL,
    sub_category VARCHAR(100) NOT NULL, -- e.g., 'T-Shirt', 'Blazer', 'Jeans'
    colors JSONB NOT NULL DEFAULT '[]'::jsonb, -- e.g., ["#008000", "#FFFFFF"]
    patterns JSONB NOT NULL DEFAULT '[]'::jsonb, -- e.g., ["STRIPED"]
    material VARCHAR(100),
    brand VARCHAR(100),
    external_buy_url TEXT, -- 电商外链
    price_cents INT, -- 预估价（分）
    is_archived BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_garments_profile_id ON garments(profile_id);
CREATE INDEX IF NOT EXISTS idx_garments_is_public ON garments(is_public);
CREATE INDEX IF NOT EXISTS idx_garments_category ON garments(primary_category, sub_category);

-- 6. 服装形态资产切片表 (garment_assets - 支持 Open/Closed/Tucked)
CREATE TABLE IF NOT EXISTS garment_assets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    garment_id UUID NOT NULL REFERENCES garments(id) ON DELETE CASCADE,
    state_type garment_state_enum NOT NULL DEFAULT 'DEFAULT',
    png_url TEXT NOT NULL, -- 标准平铺透明切片
    bounding_box JSONB, -- 边界盒 [x, y, w, h] 归一化比例
    default_anchor JSONB NOT NULL DEFAULT '{"x": 0.5, "y": 0.5}'::jsonb,
    base_layer_weight INT NOT NULL DEFAULT 10,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_garment_assets_garment_id ON garment_assets(garment_id);

-- 7. 搭配套装表 (outfits)
CREATE TABLE IF NOT EXISTS outfits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    creator_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(150) NOT NULL DEFAULT '未命名搭配',
    preview_image_url TEXT, -- 2D 画布快照或 AI VTON 最终图
    is_vton_rendered BOOLEAN NOT NULL DEFAULT FALSE,
    is_public BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_outfits_profile_id ON outfits(profile_id);
CREATE INDEX IF NOT EXISTS idx_outfits_is_public ON outfits(is_public);

-- 8. 搭配单品穿戴明细表 (outfit_items - 记录几何变换与层级)
CREATE TABLE IF NOT EXISTS outfit_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    outfit_id UUID NOT NULL REFERENCES outfits(id) ON DELETE CASCADE,
    garment_id UUID NOT NULL REFERENCES garments(id) ON DELETE CASCADE,
    applied_state garment_state_enum NOT NULL DEFAULT 'DEFAULT',
    z_index INT NOT NULL,
    transform_matrix JSONB NOT NULL DEFAULT '{"scaleX": 1.0, "scaleY": 1.0, "offsetX": 0.0, "offsetY": 0.0, "rotation": 0.0}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_outfit_items_outfit_id ON outfit_items(outfit_id);

-- 9. OOTD 穿搭日历表 (ootd_logs)
CREATE TABLE IF NOT EXISTS ootd_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    outfit_id UUID NOT NULL REFERENCES outfits(id) ON DELETE CASCADE,
    log_date DATE NOT NULL,
    weather_tag VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_profile_date UNIQUE (profile_id, log_date)
);

CREATE INDEX IF NOT EXISTS idx_ootd_profile_date ON ootd_logs(profile_id, log_date);

-- 10. 好友关系表 (friendships)
CREATE TABLE IF NOT EXISTS friendships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    friend_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'ACCEPTED', -- 'PENDING', 'ACCEPTED', 'BLOCKED'
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_friendship UNIQUE (user_id, friend_id),
    CONSTRAINT chk_not_self CHECK (user_id <> friend_id)
);

CREATE INDEX IF NOT EXISTS idx_friendships_lookup ON friendships(user_id, friend_id);

-- 11. 异步 AI 计算任务队列表 (async_tasks)
CREATE TABLE IF NOT EXISTS async_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    task_type task_type_enum NOT NULL,
    status task_status_enum NOT NULL DEFAULT 'PENDING',
    progress_percent INT NOT NULL DEFAULT 0 CHECK (progress_percent BETWEEN 0 AND 100),
    input_payload JSONB NOT NULL,
    output_result JSONB,
    cost_credits INT NOT NULL DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_async_tasks_user_status ON async_tasks(user_id, status);

-- 12. 积分流水记账表 (credit_ledger)
CREATE TABLE IF NOT EXISTS credit_ledger (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    task_id UUID REFERENCES async_tasks(id) ON DELETE SET NULL,
    tx_type credit_tx_type_enum NOT NULL,
    delta_daily INT NOT NULL DEFAULT 0,
    delta_permanent INT NOT NULL DEFAULT 0,
    balance_daily_after INT NOT NULL,
    balance_permanent_after INT NOT NULL,
    description VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_credit_ledger_user_id ON credit_ledger(user_id);
