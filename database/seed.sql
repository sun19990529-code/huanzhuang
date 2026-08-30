-- ====================================================================
-- SmartWardrobe 初始种子数据 (Mock Data)
-- ====================================================================

-- 插入默认用户
INSERT INTO users (id, email, password_hash, nickname, role, daily_credits, permanent_credits)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'user@wardrobe.com', '$2b$10$abcdefghijklmnopqrstuv', '时尚搭配师', 'USER', 100, 20),
  ('22222222-2222-2222-2222-222222222222', 'friend@wardrobe.com', '$2b$10$abcdefghijklmnopqrstuv', '闺蜜小美', 'USER', 100, 0),
  ('99999999-9999-9999-9999-999999999999', 'admin@wardrobe.com', '$2b$10$abcdefghijklmnopqrstuv', '官方管理员', 'ADMIN', 9999, 9999)
ON CONFLICT (id) DO NOTHING;

-- 插入多 Profile (多角色)
INSERT INTO profiles (id, user_id, name, gender, is_default, height_cm, weight_kg, bust_cm, waist_cm, hips_cm, privacy_level)
VALUES
  ('c4d3b2a1-0000-0000-0000-123456789abc', '11111111-1111-1111-1111-111111111111', '我自己', 'FEMALE', TRUE, 168.0, 50.0, 84.0, 62.0, 89.0, 'PUBLIC'),
  ('c4d3b2a1-0000-0000-0000-123456789def', '11111111-1111-1111-1111-111111111111', '我的伴侣', 'MALE', FALSE, 180.0, 72.0, 96.0, 78.0, 95.0, 'FRIENDS_ONLY'),
  ('c4d3b2a1-0000-0000-0000-123456789ghi', '11111111-1111-1111-1111-111111111111', '宝贝女儿', 'FEMALE', FALSE, 120.0, 22.0, 60.0, 55.0, 62.0, 'PRIVATE'),
  ('f1111111-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', '小美Profile', 'FEMALE', TRUE, 165.0, 48.0, 82.0, 60.0, 88.0, 'FRIENDS_ONLY')
ON CONFLICT (id) DO NOTHING;

-- 插入标准素体 (Avatars)
INSERT INTO avatars (id, profile_id, original_image_url, normalized_image_url, anchor_points, is_active)
VALUES
  ('a1111111-1111-1111-1111-111111111111', 'c4d3b2a1-0000-0000-0000-123456789abc', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb', 'https://assets.wardrobe.domain/avatars/female_standard_apose.png', '{"neck": [0.5, 0.28], "waist": [0.5, 0.53], "left_foot": [0.44, 0.88], "right_foot": [0.56, 0.88], "head": [0.5, 0.12]}', TRUE),
  ('a2222222-2222-2222-2222-222222222222', 'c4d3b2a1-0000-0000-0000-123456789def', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d', 'https://assets.wardrobe.domain/avatars/male_standard_apose.png', '{"neck": [0.5, 0.26], "waist": [0.5, 0.52], "left_foot": [0.43, 0.89], "right_foot": [0.57, 0.89], "head": [0.5, 0.11]}', TRUE)
ON CONFLICT (id) DO NOTHING;

-- 插入官方公共衣物 (Garments) & 私有衣物
INSERT INTO garments (id, profile_id, is_public, title, primary_category, sub_category, colors, patterns, material, brand, price_cents)
VALUES
  -- 公共衣柜 1: 经典条纹短袖T恤
  ('9f8e7d6c-5b4a-3210-fedc-ba9876543210', NULL, TRUE, '经典复古白绿条纹短袖T恤', 'TOPS', 'T-Shirt', '["#2E7D32", "#FFFFFF"]', '["STRIPED"]', '纯棉', 'URBAN VINTAGE', 19900),
  -- 公共衣柜 2: 宽松廓形西装大衣 (支持敞开/合拢)
  ('1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d', NULL, TRUE, '极简法式米灰色廓形西装', 'OUTERWEAR', 'Blazer', '["#D7CCC8"]', '["SOLID"]', '羊毛混纺', 'MODERN MINIMAL', 59900),
  -- 公共衣柜 3: 高腰复古阔腿牛仔裤
  ('3c4d5e6f-7a8b-9c0d-1e2f-3a4b5c6d7e8f', NULL, TRUE, '水洗高腰复古直筒牛仔裤', 'BOTTOMS', 'Jeans', '["#5C6BC0"]', '["SOLID"]', '牛仔丹宁', 'DENIM LAB', 29900),
  -- 公共衣柜 4: 复古德训鞋
  ('4d5e6f7a-8b9c-0d1e-2f3a-4b5c6d7e8f9a', NULL, TRUE, '复古百搭德训低帮板鞋', 'FOOTWEAR', 'Sneakers', '["#EEEEEE", "#8D6E63"]', '["SOLID"]', '牛剖层革', 'RETRO WALK', 35900),
  -- 公共衣柜 5: 羊毛复古贝雷帽
  ('5e6f7a8b-9c0d-1e2f-3a4b-5c6d7e8f9a0b', NULL, TRUE, '法式复古纯羊毛贝雷帽', 'ACCESSORIES', 'Hat', '["#212121"]', '["SOLID"]', '羊毛', 'PARIS CHIC', 9900),
  -- 私有衣物 (用户自己 Profile)
  ('6f7a8b9c-0d1e-2f3a-4b5c-6d7e8f9a0b1c', 'c4d3b2a1-0000-0000-0000-123456789abc', FALSE, '私藏法式优雅丝绸衬衫', 'TOPS', 'Shirt', '["#FFF8E1"]', '["SOLID"]', '桑蚕丝', 'MY WARDROBE', 42900)
ON CONFLICT (id) DO NOTHING;

-- 插入服装形态资产 (Garment Assets: DEFAULT, OPEN, CLOSED, TUCKED)
INSERT INTO garment_assets (id, garment_id, state_type, png_url, bounding_box, default_anchor, base_layer_weight)
VALUES
  -- T恤切片
  ('ba111111-1111-1111-1111-111111111111', '9f8e7d6c-5b4a-3210-fedc-ba9876543210', 'DEFAULT', 'https://assets.wardrobe.domain/garments/tshirt_green_stripes.png', '{"x": 0.35, "y": 0.28, "w": 0.30, "h": 0.25}', '{"x": 0.5, "y": 0.28}', 10),
  ('ba111111-1111-1111-1111-111111111112', '9f8e7d6c-5b4a-3210-fedc-ba9876543210', 'TUCKED', 'https://assets.wardrobe.domain/garments/tshirt_green_stripes_tucked.png', '{"x": 0.35, "y": 0.28, "w": 0.30, "h": 0.22}', '{"x": 0.5, "y": 0.28}', 10),
  -- 外套切片 (OPEN / CLOSED)
  ('ba222222-2222-2222-2222-222222222221', '1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d', 'OPEN', 'https://assets.wardrobe.domain/garments/blazer_beige_open.png', '{"x": 0.30, "y": 0.27, "w": 0.40, "h": 0.38}', '{"x": 0.5, "y": 0.28}', 40),
  ('ba222222-2222-2222-2222-222222222222', '1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d', 'CLOSED', 'https://assets.wardrobe.domain/garments/blazer_beige_closed.png', '{"x": 0.30, "y": 0.27, "w": 0.40, "h": 0.38}', '{"x": 0.5, "y": 0.28}', 45),
  -- 下装牛仔裤
  ('ba333333-3333-3333-3333-333333333331', '3c4d5e6f-7a8b-9c0d-1e2f-3a4b5c6d7e8f', 'DEFAULT', 'https://assets.wardrobe.domain/garments/jeans_blue_straight.png', '{"x": 0.36, "y": 0.50, "w": 0.28, "h": 0.40}', '{"x": 0.5, "y": 0.53}', 20),
  -- 德训鞋
  ('ba444444-4444-4444-4444-444444444441', '4d5e6f7a-8b9c-0d1e-2f3a-4b5c6d7e8f9a', 'DEFAULT', 'https://assets.wardrobe.domain/garments/sneakers_retro.png', '{"x": 0.38, "y": 0.86, "w": 0.24, "h": 0.10}', '{"x": 0.5, "y": 0.88}', 50),
  -- 贝雷帽
  ('ba555555-5555-5555-5555-555555555551', '5e6f7a8b-9c0d-1e2f-3a4b-5c6d7e8f9a0b', 'DEFAULT', 'https://assets.wardrobe.domain/garments/beret_black.png', '{"x": 0.42, "y": 0.08, "w": 0.16, "h": 0.08}', '{"x": 0.5, "y": 0.12}', 60)
ON CONFLICT (id) DO NOTHING;

-- 插入好友关系
INSERT INTO friendships (id, user_id, friend_id, status)
VALUES
  ('fa111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'ACCEPTED'),
  ('fa222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'ACCEPTED')
ON CONFLICT (id) DO NOTHING;
