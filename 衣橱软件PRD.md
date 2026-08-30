# **智能虚拟衣橱与多模态试穿平台（SmartWardrobe）**

## **产品需求文档 (Product Requirement Document, PRD)**

| 文档版本 | 编写日期 | 状态 | 目标平台 | 数据层架构 |
| :---- | :---- | :---- | :---- | :---- |
| **V1.0.0** | 2026-08-25 | 正式发布 (Ready for Dev) | Responsive Web (PC+H5) / 原生 Android (Kotlin) | PostgreSQL 16+ / Room (SQLite) |

## **一、 项目概述与系统架构**

### **1.1 背景与产品定位**

SmartWardrobe 是一款面向多角色的个人与家庭数字化衣橱管理及虚拟试穿应用。系统通过 **2D 极速拼装画布（毫秒级 Canvas 渲染）** 结合 **生成式 AI 高清试穿（Diffusion VTON）** 的混合架构，解决传统衣橱应用“拍图不标准、图层穿透错乱、试穿算力成本高/等待时间长”的痛点。

### **1.2 总体业务架构图**

\+-----------------------------------------------------------------------------------+  
|                                  客户端展现层                                       |  
|  \+------------------------------------+  \+-------------------------------------+  |  
|  |     Responsive Web (PC / H5)       |  |     Native Android (Compose)        |  |  
|  |   Fabric.js / Canvas 2D 拼装引擎   |  |   Jetpack Compose Canvas 引擎 \+     |  |  
|  |   WebSocket 实时任务状态推送       |  |   Room 本地离线优先存储架构         |  |  
|  \+------------------------------------+  \+-------------------------------------+  |  
\+------------------------------------------+----------------------------------------+  
                                           | HTTP/HTTPS & WSS (JWT Auth)  
\+------------------------------------------v----------------------------------------+  
|                                  业务服务网关层                                     |  
|  \+------------------+  \+------------------+  \+-----------------+  \+------------+  |  
|  | 账号与 Profile   |  | 衣橱与资产管理   |  | 画布与穿搭编排  |  | 社交与权限 |  |  
|  | 积分经济引擎     |  | 公共衣柜 CMS     |  | OOTD 日历       |  | 任务调度器 |  |  
\+------------------------------------------+----------------------------------------+  
                                           |  
\+------------------------------------------v----------------------------------------+  
|                              异步计算与数据持久层                                 |  
|  \+------------------------------------+  \+-------------------------------------+  |  
|  |        PostgreSQL 16 主数据库      |  |        AI 异步渲染管线集群          |  |  
|  | \- 资产/用户/搭配数据/分布式锁      |  | \- Vision LLM (属性解析/打标)        |  |  
|  | \- 每日积分定时重置与流水记账       |  | \- ControlNet A-Pose 素体标准化       |  |  
|  | \- 归一化坐标与多态图层元数据       |  | \- 隐形模特多态重构 (Open/Closed)    |  |  
|  |                                    |  | \- Diffusion VTON 高清试穿生成       |  |  
|  \+------------------------------------+  \+-------------------------------------+  |  
\+-----------------------------------------------------------------------------------+

## **二、 用户角色与权限拓扑体系**

### **2.1 角色定义**

> 1. **系统管理员（Admin）：** 访问独立 Web 管理后台，拥有全量用户管理、积分调控、公共衣柜资产 CRUD 及下架权限。  
> 2. **注册用户（User Account）：** 拥有独立账户系统与每日积分配额（100分/天），可在账户内创建多个独立 Profile（多角色）。  
> 3. **好友（Friend）：** 双向好友关系，经授权可查看好友 Profile 衣柜、使用好友衣物进行试穿并保存搭配。

### **2.2 多角色（Profile）与隐私拓扑**

User Account (全局积分池: 100/日)  
   ├── Profile 1: 自己 (默认) ──\> \[专属衣柜\] ──\> \[搭配库/OOTD\] (隐私: 私密 / 仅好友 / 公开)  
   ├── Profile 2: 伴侣        ──\> \[专属衣柜\] ──\> \[搭配库/OOTD\] (隐私: 私密 / 仅好友 / 公开)  
   └── Profile 3: 孩子        ──\> \[专属衣柜\] ──\> \[搭配库/OOTD\] (隐私: 私密 / 仅好友 / 公开)

| 隐私等级 | 适用对象 | 浏览权限 | 穿搭与借穿权限 |
| :---- | :---- | :---- | :---- |
| **私密 (Private)** | 默认状态 | 仅主账号登录后自身可见 | 仅限主账号操作 |
| **仅好友 (Friends)** | 双向好友 | 好友可浏览该 Profile 的所有单品与搭配 | 好友可将该 Profile 的衣服拖拽至该 Profile 的素体进行试穿并推送搭配 |
| **公开 (Public)** | 全网用户 | 仅可查看标记为“公开”的**成套搭配（Lookbook）**；**禁止**穿透查看单品列表 | 仅限点赞、收藏成套搭配 |

## **三、 功能模块详细需求（FRD）**

### **3.1 账号、档案与体型管理模块**

#### **3.1.1 注册与体型录入**

* **注册引导流程：**  
  1. 输入账号密码 / 快捷登录。  
  2. 引导创建默认 Profile（昵称、性别、年龄）。  
  3. **体型参数录入项：** 身高（cm）、体重（kg）、胸围（cm）、腰围（cm）、臀围（cm）。  
  4. **跳过机制：** 用户可选择“跳过”，系统自动采用内置**男女黄金比例标准参数**，并在素体生成界面显示小字提示：当前使用系统默认身材参数，可在“档案设置”中随时修正以提升贴合度。  
* **多角色切换：** 支持在 App/Web 顶部快速切换当前操作的 Profile，不同 Profile 之间的衣橱数据、素体数据物理隔离。

### **3.2 人像与服装标准化流水线（AI Pipeline）**

\[原始照片输入\]  
      │  
      ├─► 人像照片 ──► Vision 姿态估算 ──► ControlNet A-Pose ──► 贴身素衣重构 ──► \[标准透明素体 PNG\]  
      │  
      └─► 服装照片 ──► Vision LLM 打标 ──► 隐形模特重构 ──► 资产裂变 (Open/Closed) ──► \[标准化图层切片\]

#### **3.2.1 人像标准化（Avatar Normalization）**

> 1. **上传约束：** 允许任意背景、任意日常姿态、任意着装的照片。  
> 2. **生成规范：**  
   * 背景强制替换为白色/浅灰/透明。  
   * 姿态强制重定向为**标准正面直立、双臂向两侧微张（A-Pose）**。  
   * 着装强制重构为**中性素色贴身内衣/背心与平角短裤**，露出颈部、锁骨、手腕、脚踝等关键锚点。  
   * 面部与发型保留原图面部特征（Face Embeddings）。  
> 3. **容错兜底策略：** 若原图由于光线过暗、遮挡严重无法提取体态，系统自动结合 Profile 填写的身高、体重、三围数据直接生成标准身材素体。  
> 4. **消耗：** 成功生成扣除 **1 积分**（失败不扣除并退还）。

#### **3.2.2 服装标准化与自动打标（Garment Ingestion）**

> 1. **多模态结构化打标（Vision LLM）：**  
   * **主类目：** 上装 (Tops)、下装 (Bottoms)、外套 (Outerwear)、鞋履 (Footwear)、配饰 (Accessories)。  
   * **细分类目：** T恤、衬衫、卫衣、西装外套、夹克、阔腿裤、短裙、连衣裙等。  
   * **颜色识别：** 支持多色提取（主色、副色，标准 HEX 映射与标准中文名）。  
   * **花纹与材质：** 纯色、条纹、格纹、印花、波点、牛仔、皮革、针织等。  
   * **版型与领型：** 圆领、V领、连帽、修身、宽松（Oversize）、长款、短款。  
> 2. **多态标准资产生成：**  
   * 消除拍摄褶皱与光影差异，生成统一比例尺的“隐形模特（Ghost Mannequin）”正视图。  
   * **外套（Outerwear）自动裂变：** AI 自动生成两套切片资产：  
     * state\_open（敞开）：两侧衣襟分开，露出胸口内搭通道。  
     * state\_closed（合拢）：拉链/纽扣扣合状态。  
> 3. **消耗：** 成功生成扣除 **1 积分/件**。

### **3.3 双模 2D 画布穿搭编排引擎（Canvas Dressing Engine）**

#### **3.3.1 图层层级权重（Z-Index Matrix）与运算公式**

图层在画布中的绝对层级由如下公式实时计算：

$$\\text{Render\\\_Z\\\_Index} \= \\text{Base\\\_Layer\\\_Weight} \+ \\Delta\\text{State\\\_Modifier} \+ \\text{User\\\_Offset}$$

| 层级代号 | 类目名称 | 默认 Base Z-Index | 塞衣角 (Tuck-in) 修正值 | 外套合拢 (Closed) 修正值 | 状态联动描述 |
| :---- | :---- | :---- | :---- | :---- | :---- |
| **L0** | 人物素体 (Avatar) | 0 | 0 | 0 | 始终位于最底层 |
| **L1** | 内搭/打底/T恤/衬衫 | 10 | 0 (被 L2 遮挡下摆) | 0 (被 L4 覆盖) | 塞衣角时切片裁切下摆或 Z-Index 低于下装 |
| **L1-Untuck** | 内搭外放状态 | 25 | \+15 (覆盖下装腰线) | 0 | 覆盖 L2 裤腰部分 |
| **L2** | 下装 (长裤/短裤/裙) | 20 | 0 | 0 | 位于内搭与外套之间 |
| **L3** | 中层保暖 (开衫/马甲) | 30 | 0 | 0 | 覆盖 L1、L2 |
| **L4** | 外套 (夹克/大衣) | 40 | 0 | \+5 (完全遮挡中内层) | **Open:** 渲染敞开图 **Closed:** 渲染合拢图 |
| **L5** | 鞋袜 | 50 | 0 | 0 | 覆盖长裤脚或与腿部锚点结合 |
| **L6** | 配饰 (帽子/包/首饰) | 60+ | 0 | 0 | 最顶层覆盖 |

#### **3.3.2 交互操作模式**

> 1. **智能吸附模式（Snap Mode，默认启用）：**  
   * 用户在衣柜列表中点击单品，系统自动识别其分类，直接将单品映射至素体预设的**归一化关键锚点（Normalized Anchor Points）**（如：肩颈中心点 \[0.50, 0.28\]，腰部中心点 \[0.50, 0.55\]）。  
   * 自动互斥替换：穿上同层级冲突单品（如长裤换短裤），原单品自动脱下并放回衣柜，非冲突单品（如T恤）保留。  
> 2. **自由微调模式（Free Transform Mode，可一键切换）：**  
   * 选中衣物出现标准 Bounding Box（支持 8 点缩放、单轴旋转柄、自由拖拽平移）。  
   * 提供微调控制盘（X/Y 轴 1px 步进微调、层级临时手动升降）。  
> 3. **形态动态控制器（State Bar）：**  
   * 当画布中存在外搭时，悬浮工具栏显示 **【敞开 / 合拢】** 切换按钮。  
   * 当画布中存在内搭与下装时，显示 **【塞衣角 / 外放】** 切换按钮。

### **3.4 AI 高清试穿渲染（VTON Engine）**

> 1. **触发机制：** 用户在 2D 画布完成满意搭配后，点击 **【一键生成 AI 高清试穿照】**。  
> 2. **参数编排：**  
   * 系统导出当前画布配置清单：包含原人像 Profile 特征、穿戴单品列表、单品形态（Open/Closed/Tucked）。  
   * 扣除账户 **5 积分**，生成异步任务。  
> 3. **任务流水线状态流转：**  
   * 客户端展示**动态百分比进度条与阶段文案**（排队中... $\\to$ 正在解析搭配拓扑... $\\to$ 光影与褶皱融合中... $\\to$ 高清渲染完成）。  
   * 支持通过 WebSocket / Server-Sent Events (SSE) 实时推送状态。  
> 4. **失败退款保护：** 任务超时（\>90s）或渲染异常，后端自动触发回滚事务，返还 5 积分并弹窗友好提示。

### **3.5 公共衣柜与官方 CMS 系统**

> 1. **官方管理后台（Web Admin CMS）：**  
   * 支持官方运营人员批量上传服装素材、触发 AI 标准化打标。  
   * 配置单品基本信息：品牌、吊牌价、外部电商跳转链接（预留字段）。  
   * 上架/下架开关控制。  
> 2. **端侧公共衣柜体验：**  
   * 用户可按季节、风格、颜色、分类多维检索公共衣物。  
   * **一键保存至我的衣柜（Prototype 深度克隆模式）：** 点击后系统在用户当前 Profile 的私有衣柜中创建一条独立副本。  
   * **解耦规则：** 用户可自由编辑副本的标签与分类；官方下架或删除该公共单品，**完全不影响**用户私有衣柜中已保存的副本。

### **3.6 搭配库（Lookbook）、OOTD 穿搭日历与社交互动**

> 1. **Lookbook 搭配存档：**  
   * 用户可将画布中的组合一键保存为“套装”，记录包含的单品 ID 及变换矩阵。  
   * 支持一键整套上身换装。  
> 2. **OOTD 穿搭日历：**  
   * 日历视图展示历史/未来计划穿搭。  
   * 支持指定日期绑定套装，添加穿搭心得、天气标签。  
> 3. **好友互动（“帮TA搭配”模式）：**  
   * 进入好友主页，切换至好友开放了权限的 Profile。  
   * 使用好友衣柜里的衣服在其素体上进行 2D 拖拽搭配。  
   * 点击 **【推给好友】**，生成一条穿搭建议推送，好友确认后可一键收入自身 Lookbook。

### **3.7 积分经济系统（Credit System）**

> 1. **基础规则：**  
   * 账户共享积分池，每日服务器时间 00:00:00 (UTC+8) 自动重置为 **100 积分**（不跨日累计）。  
> 2. **计费表单：**  
   * 2D Canvas 实时拼装与拖拽：**0 积分（永久免费）**  
   * 上传人像生成标准素体：**1 积分/次**  
   * 上传衣物生成标准切片：**1 积分/件**  
   * 触发 AI 高清成片渲染（VTON）：**5 积分/次**  
> 3. **商业化扩展预留：** 数据库预留 permanent\_credits（付费永久积分字段），结算时优先扣除 daily\_credits，耗尽后再扣除 permanent\_credits。

### **3.8 原生 Android 端离线优先架构（Offline-First）**

\[Android UI (Jetpack Compose)\]  
          │  
          ▼  
   \[Repository Layer\]  
          │  
     \+----+----+  
     │         │ (网络可用)  
     │         ▼  
     │   \[Retrofit Remote API\] ──► \[PostgreSQL Server\]  
     │         │ (增量同步)  
     ▼         ▼  
\[Room Local SQLite Database\] \+ \[Coil Disk Cache (PNG 切片/素体)\]

> 1. **本地离线可用项：**  
   * 离线浏览本地缓存的 Profile、私有衣柜单品列表、Lookbook 套装。  
   * 离线进行 2D Canvas 智能吸附拖拽、自由变换、形态切换（切片由 Coil 自动进行 Disk LRU 缓存）。  
   * 离线创建/编辑搭配方案，本地暂存至 Room 数据库并标记 sync\_status \= PENDING。  
> 2. **在线同步机制：**  
   * 监听网络恢复，后台 WorkManager 自动触发双向增量同步，将本地新增搭配与编辑提交至服务端。  
   * 触发 AI 素图标准化与 VTON 渲染时，若检测到断网，直接阻断并提示联网需求。

## **四、 PostgreSQL 物理数据模型设计（DDL）**

以下为基于 PostgreSQL 16+ 编写的完整 DDL 脚本，包含枚举、索引、级联外键约束与触发器。

SQL  
\-- 启用 UUID 扩展  
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

\-- \====================================================================  
\-- 1\. 枚举类型定义  
\-- \====================================================================  
CREATE TYPE user\_role\_enum AS ENUM ('USER', 'ADMIN');  
CREATE TYPE gender\_enum AS ENUM ('MALE', 'FEMALE', 'OTHER');  
CREATE TYPE privacy\_level\_enum AS ENUM ('PRIVATE', 'FRIENDS\_ONLY', 'PUBLIC');  
CREATE TYPE garment\_category\_enum AS ENUM ('TOPS', 'BOTTOMS', 'OUTERWEAR', 'FOOTWEAR', 'ACCESSORIES', 'ONE\_PIECE');  
CREATE TYPE garment\_state\_enum AS ENUM ('DEFAULT', 'OPEN', 'CLOSED', 'TUCKED', 'UNTUCKED');  
CREATE TYPE task\_type\_enum AS ENUM ('AVATAR\_NORMALIZE', 'GARMENT\_NORMALIZE', 'VTON\_RENDER');  
CREATE TYPE task\_status\_enum AS ENUM ('PENDING', 'PROCESSING', 'SUCCESS', 'FAILED', 'TIMEOUT');  
CREATE TYPE credit\_tx\_type\_enum AS ENUM ('DAILY\_RESET', 'AVATAR\_GEN', 'GARMENT\_GEN', 'VTON\_RENDER', 'REFUND', 'MANUAL\_ADJUST');

\-- \====================================================================  
\-- 2\. 用户与认证表 (users)  
\-- \====================================================================  
CREATE TABLE users (  
    id UUID PRIMARY KEY DEFAULT uuid\_generate\_v4(),  
    email VARCHAR(255) UNIQUE NOT NULL,  
    password\_hash VARCHAR(255) NOT NULL,  
    nickname VARCHAR(100) NOT NULL,  
    avatar\_url TEXT,  
    role user\_role\_enum NOT NULL DEFAULT 'USER',  
    daily\_credits INT NOT NULL DEFAULT 100 CHECK (daily\_credits \>= 0),  
    permanent\_credits INT NOT NULL DEFAULT 0 CHECK (permanent\_credits \>= 0),  
    created\_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT\_TIMESTAMP,  
    updated\_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT\_TIMESTAMP  
);

CREATE INDEX idx\_users\_email ON users(email);

\-- \====================================================================  
\-- 3\. 角色档案表 (profiles \- 支持多角色)  
\-- \====================================================================  
CREATE TABLE profiles (  
    id UUID PRIMARY KEY DEFAULT uuid\_generate\_v4(),  
    user\_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,  
    name VARCHAR(100) NOT NULL,  
    gender gender\_enum NOT NULL DEFAULT 'FEMALE',  
    is\_default BOOLEAN NOT NULL DEFAULT FALSE,  
    height\_cm NUMERIC(5,2) NOT NULL DEFAULT 165.00,  
    weight\_kg NUMERIC(5,2) NOT NULL DEFAULT 52.00,  
    bust\_cm NUMERIC(5,2) NOT NULL DEFAULT 86.00,  
    waist\_cm NUMERIC(5,2) NOT NULL DEFAULT 66.00,  
    hips\_cm NUMERIC(5,2) NOT NULL DEFAULT 90.00,  
    is\_custom\_body\_params BOOLEAN NOT NULL DEFAULT FALSE,  
    privacy\_level privacy\_level\_enum NOT NULL DEFAULT 'PRIVATE',  
    created\_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT\_TIMESTAMP,  
    updated\_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT\_TIMESTAMP  
);

CREATE INDEX idx\_profiles\_user\_id ON profiles(user\_id);

\-- \====================================================================  
\-- 4\. 素体资产表 (avatars)  
\-- \====================================================================  
CREATE TABLE avatars (  
    id UUID PRIMARY KEY DEFAULT uuid\_generate\_v4(),  
    profile\_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,  
    original\_image\_url TEXT NOT NULL,  
    normalized\_image\_url TEXT, \-- A-Pose 透明 PNG  
    face\_embedding\_vector JSONB, \-- 人脸特征向量  
    anchor\_points JSONB NOT NULL DEFAULT '{}'::jsonb, \-- 关键锚点归一化坐标 {"neck": \[0.5, 0.28\], "waist": \[0.5, 0.55\]}  
    is\_active BOOLEAN NOT NULL DEFAULT TRUE,  
    created\_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT\_TIMESTAMP  
);

CREATE INDEX idx\_avatars\_profile\_id ON avatars(profile\_id);

\-- \====================================================================  
\-- 5\. 衣物主表 (garments \- 涵盖私有与公共衣柜)  
\-- \====================================================================  
CREATE TABLE garments (  
    id UUID PRIMARY KEY DEFAULT uuid\_generate\_v4(),  
    profile\_id UUID REFERENCES profiles(id) ON DELETE CASCADE, \-- NULL 表示官方公共衣柜资产  
    is\_public BOOLEAN NOT NULL DEFAULT FALSE,  
    cloned\_from\_id UUID REFERENCES garments(id) ON DELETE SET NULL, \-- 追溯公共衣物源头  
    title VARCHAR(200) NOT NULL,  
    primary\_category garment\_category\_enum NOT NULL,  
    sub\_category VARCHAR(100) NOT NULL, \-- e.g., 'T-Shirt', 'Blazer', 'Jeans'  
    colors JSONB NOT NULL DEFAULT '\[\]'::jsonb, \-- e.g., \["\#008000", "\#FFFFFF"\]  
    patterns JSONB NOT NULL DEFAULT '\[\]'::jsonb, \-- e.g., \["STRIPED"\]  
    material VARCHAR(100),  
    brand VARCHAR(100),  
    external\_buy\_url TEXT, \-- 电商外链（待选项/预留）  
    price\_cents INT, \-- 预估价（分）  
    is\_archived BOOLEAN NOT NULL DEFAULT FALSE,  
    created\_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT\_TIMESTAMP,  
    updated\_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT\_TIMESTAMP  
);

CREATE INDEX idx\_garments\_profile\_id ON garments(profile\_id);  
CREATE INDEX idx\_garments\_is\_public ON garments(is\_public);  
CREATE INDEX idx\_garments\_category ON garments(primary\_category, sub\_category);

\-- \====================================================================  
\-- 6\. 服装形态资产切片表 (garment\_assets \- 支持 Open/Closed/Tucked)  
\-- \====================================================================  
CREATE TABLE garment\_assets (  
    id UUID PRIMARY KEY DEFAULT uuid\_generate\_v4(),  
    garment\_id UUID NOT NULL REFERENCES garments(id) ON DELETE CASCADE,  
    state\_type garment\_state\_enum NOT NULL DEFAULT 'DEFAULT',  
    png\_url TEXT NOT NULL, \-- 标准平铺透明切片  
    bounding\_box JSONB, \-- 边界盒 \[x, y, w, h\] 归一化比例  
    default\_anchor JSONB NOT NULL DEFAULT '{"x": 0.5, "y": 0.5}'::jsonb,  
    base\_layer\_weight INT NOT NULL DEFAULT 10,  
    created\_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT\_TIMESTAMP  
);

CREATE INDEX idx\_garment\_assets\_garment\_id ON garment\_assets(garment\_id);

\-- \====================================================================  
\-- 7\. 搭配套装表 (outfits)  
\-- \====================================================================  
CREATE TABLE outfits (  
    id UUID PRIMARY KEY DEFAULT uuid\_generate\_v4(),  
    profile\_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,  
    creator\_user\_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,  
    title VARCHAR(150) NOT NULL DEFAULT '未命名搭配',  
    preview\_image\_url TEXT, \-- 2D 画布快照或 AI VTON 最终图  
    is\_vton\_rendered BOOLEAN NOT NULL DEFAULT FALSE,  
    is\_public BOOLEAN NOT NULL DEFAULT FALSE,  
    created\_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT\_TIMESTAMP,  
    updated\_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT\_TIMESTAMP  
);

CREATE INDEX idx\_outfits\_profile\_id ON outfits(profile\_id);  
CREATE INDEX idx\_outfits\_is\_public ON outfits(is\_public);

\-- \====================================================================  
\-- 8\. 搭配单品穿戴明细表 (outfit\_items \- 记录几何变换与层级)  
\-- \====================================================================  
CREATE TABLE outfit\_items (  
    id UUID PRIMARY KEY DEFAULT uuid\_generate\_v4(),  
    outfit\_id UUID NOT NULL REFERENCES outfits(id) ON DELETE CASCADE,  
    garment\_id UUID NOT NULL REFERENCES garments(id) ON DELETE CASCADE,  
    applied\_state garment\_state\_enum NOT NULL DEFAULT 'DEFAULT',  
    z\_index INT NOT NULL,  
    transform\_matrix JSONB NOT NULL DEFAULT '{"scaleX": 1.0, "scaleY": 1.0, "offsetX": 0.0, "offsetY": 0.0, "rotation": 0.0}'::jsonb,  
    created\_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT\_TIMESTAMP  
);

CREATE INDEX idx\_outfit\_items\_outfit\_id ON outfit\_items(outfit\_id);

\-- \====================================================================  
\-- 9\. OOTD 穿搭日历表 (ootd\_logs)  
\-- \====================================================================  
CREATE TABLE ootd\_logs (  
    id UUID PRIMARY KEY DEFAULT uuid\_generate\_v4(),  
    profile\_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,  
    outfit\_id UUID NOT NULL REFERENCES outfits(id) ON DELETE CASCADE,  
    log\_date DATE NOT NULL,  
    weather\_tag VARCHAR(50),  
    notes TEXT,  
    created\_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT\_TIMESTAMP,  
    CONSTRAINT uq\_profile\_date UNIQUE (profile\_id, log\_date)  
);

CREATE INDEX idx\_ootd\_profile\_date ON ootd\_logs(profile\_id, log\_date);

\-- \====================================================================  
\-- 10\. 好友关系表 (friendships)  
\-- \====================================================================  
CREATE TABLE friendships (  
    id UUID PRIMARY KEY DEFAULT uuid\_generate\_v4(),  
    user\_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,  
    friend\_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,  
    status VARCHAR(20) NOT NULL DEFAULT 'ACCEPTED', \-- 'PENDING', 'ACCEPTED', 'BLOCKED'  
    created\_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT\_TIMESTAMP,  
    CONSTRAINT uq\_friendship UNIQUE (user\_id, friend\_id),  
    CONSTRAINT chk\_not\_self CHECK (user\_id \<\> friend\_id)  
);

CREATE INDEX idx\_friendships\_lookup ON friendships(user\_id, friend\_id);

\-- \====================================================================  
\-- 11\. 异步 AI 计算任务队列表 (async\_tasks)  
\-- \====================================================================  
CREATE TABLE async\_tasks (  
    id UUID PRIMARY KEY DEFAULT uuid\_generate\_v4(),  
    user\_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,  
    task\_type task\_type\_enum NOT NULL,  
    status task\_status\_enum NOT NULL DEFAULT 'PENDING',  
    progress\_percent INT NOT NULL DEFAULT 0 CHECK (progress\_percent BETWEEN 0 AND 100),  
    input\_payload JSONB NOT NULL,  
    output\_result JSONB,  
    cost\_credits INT NOT NULL DEFAULT 0,  
    error\_message TEXT,  
    created\_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT\_TIMESTAMP,  
    updated\_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT\_TIMESTAMP  
);

CREATE INDEX idx\_async\_tasks\_user\_status ON async\_tasks(user\_id, status);

\-- \====================================================================  
\-- 12\. 积分流水记账表 (credit\_ledger)  
\-- \====================================================================  
CREATE TABLE credit\_ledger (  
    id UUID PRIMARY KEY DEFAULT uuid\_generate\_v4(),  
    user\_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,  
    task\_id UUID REFERENCES async\_tasks(id) ON DELETE SET NULL,  
    tx\_type credit\_tx\_type\_enum NOT NULL,  
    delta\_daily INT NOT NULL DEFAULT 0,  
    delta\_permanent INT NOT NULL DEFAULT 0,  
    balance\_daily\_after INT NOT NULL,  
    balance\_permanent\_after INT NOT NULL,  
    description VARCHAR(255),  
    created\_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT\_TIMESTAMP  
);

CREATE INDEX idx\_credit\_ledger\_user\_id ON credit\_ledger(user\_id);

## **五、 核心 API 契约设计**

### **5.1 异步任务状态长轮询与 WebSocket 规范**

* **WebSocket 端点：** wss://api.wardrobe.domain/v1/ws/tasks?token={JWT}  
* **推送消息体结构（JSON）：**

JSON  
{  
  "event": "TASK\_PROGRESS\_UPDATED",  
  "data": {  
    "taskId": "7e9b08f4-2c1a-4d92-9382-3e2840d21e56",  
    "taskType": "VTON\_RENDER",  
    "status": "PROCESSING",  
    "progress": 68,  
    "currentStage": "Blending garment light and shadow...",  
    "resultUrl": null,  
    "error": null  
  }  
}

### **5.2 核心 RESTful 端点定义**

#### **1\. 提交服装上传与标准化**

* **POST /v1/garments/upload**  
* **Content-Type:** multipart/form-data  
* **Request Params:**  
  * profileId (UUID, optional \- 为空时管理员操作视为公共衣物)  
  * imageFile (Binary)  
* **Response (202 Accepted):**

JSON  
{  
  "code": 200,  
  "message": "衣物上传成功，标准化分析任务已进入队列",  
  "data": {  
    "taskId": "4a7f05b1-12ec-4993-87a2-f8d9758112d4",  
    "estimatedTimeSeconds": 8  
  }  
}

#### **2\. 公共衣柜单品深度克隆（保存到我的衣柜）**

* **POST /v1/garments/public/{garmentId}/clone**  
* **Request Body:**

JSON  
{  
  "targetProfileId": "c4d3b2a1-0000-0000-0000-123456789abc"  
}

* **Response (201 Created):**

JSON  
{  
  "code": 200,  
  "message": "已成功复制到您的专属衣橱",  
  "data": {  
    "clonedGarmentId": "9f8e7d6c-5b4a-3210-fedc-ba9876543210",  
    "title": "经典复古白绿条纹短袖T恤",  
    "primaryCategory": "TOPS",  
    "assets": \[  
      {  
        "stateType": "DEFAULT",  
        "pngUrl": "https://cdn.wardrobe.domain/assets/garments/ghost\_9f8e\_default.png",  
        "baseLayerWeight": 10  
      }  
    \]  
  }  
}

#### **3\. 提交 2D 画布编排并发起 AI VTON 高清试穿**

* **POST /v1/outfits/render-vton**  
* **Request Body:**

JSON  
{  
  "profileId": "c4d3b2a1-0000-0000-0000-123456789abc",  
  "canvasSnapshotBase64": "data:image/png;base64,iVBORw0KGgo...",  
  "items": \[  
    {  
      "garmentId": "9f8e7d6c-5b4a-3210-fedc-ba9876543210",  
      "appliedState": "TUCKED",  
      "zIndex": 10,  
      "transformMatrix": { "scaleX": 1.0, "scaleY": 1.0, "offsetX": 0.0, "offsetY": 0.02, "rotation": 0.0 }  
    },  
    {  
      "garmentId": "1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d",  
      "appliedState": "OPEN",  
      "zIndex": 40,  
      "transformMatrix": { "scaleX": 1.05, "scaleY": 1.05, "offsetX": 0.0, "offsetY": 0.0, "rotation": 0.0 }  
    }  
  \]  
}

* **Response (202 Accepted):**

JSON  
{  
  "code": 200,  
  "message": "试穿任务已提交，已锁定扣除 5 积分",  
  "data": {  
    "taskId": "7e9b08f4-2c1a-4d92-9382-3e2840d21e56",  
    "remainingDailyCredits": 94  
  }  
}

#### **4\. 好友互动：为好友提交穿搭推荐**

* **POST /v1/friends/{friendUserId}/profiles/{friendProfileId}/suggest-outfit**  
* **Request Body:**

JSON  
{  
  "title": "周末休闲条纹叠穿风",  
  "garmentIds": \[  
    "9f8e7d6c-5b4a-3210-fedc-ba9876543210",  
    "1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d"  
  \],  
  "previewImageUrl": "https://cdn.wardrobe.domain/snapshots/outfit\_preview\_123.png"  
}

* **Response (200 OK):**

JSON  
{  
  "code": 200,  
  "message": "已成功向好友推送穿搭建议"  
}

## **六、 2D 坐标系对齐算法规范（Web & Android 跨端统一）**

为了保证 PC Web、手机 H5 以及原生 Android Jetpack Compose 渲染效果像素级一致，画布采用**归一化虚拟坐标系（Normalized Coordinate Space: 0.0000 \~ 1.0000）**。

### **6.1 坐标转换公式**

设画布实际渲染物理宽度为 $W\_{px}$，物理高度为 $H\_{px}$：

$$\\text{Pixel\\\_X} \= \\text{Normalized\\\_X} \\times W\_{px}$$

$$\\text{Pixel\\\_Y} \= \\text{Normalized\\\_Y} \\times H\_{px}$$

### **6.2 锚点吸附对齐算法（Snap Calculation）**

当拖拽衣物切片松手时，计算衣物基准点与素体骨骼锚点的欧几里得距离：

$$\\text{Dist} \= \\sqrt{(X\_{garment} \- X\_{anchor})^2 \+ (Y\_{garment} \- Y\_{anchor})^2}$$

* 若 $\\text{Dist} \< 0.08$（吸附阈值，即 8% 相对距离），触发自动对齐吸附：  
  $$X\_{garment\\\_final} \= X\_{anchor} \+ \\text{Offset\\\_X}\_{preset}$$  
  $$Y\_{garment\\\_final} \= Y\_{anchor} \+ \\text{Offset\\\_Y}\_{preset}$$

## **七、 非功能性需求与性能指标 (NFR)**

> 1. **2D 画布交互流畅度：**  
   * Web 端与 Android 原生端 2D 拖拽、缩放、形态切换帧率 $\\ge 60\\text{ FPS}$。  
   * 单品吸附响应延迟 $\\le 16\\text{ ms}$。  
> 2. **AI 计算响应时延 SLA：**  
   * 人像/服装标准化（Vision \+ ControlNet）：P95 $\\le 10\\text{ 秒}$。  
   * 高清 VTON 试穿成片渲染：P95 $\\le 15\\text{ 秒}$。  
> 3. **数据库并发与原子性：**  
   * 每日 00:00 积分重置采用批量分页更新（Cursor Batch Update），避免死锁与连接池耗尽。  
   * 积分扣减与返还严格包裹在 PostgreSQL 事务中（SELECT ... FOR UPDATE），杜绝并发超扣。  
> 4. **Android 离线存储配额：**  
   * 本地 Room 数据库仅存结构化元数据（限制在 50MB 以内）。  
   * 静态切片图片启用 LRU 磁盘缓存策略，默认上限设为 500MB，支持用户手动一键清理。

## **八、 研发里程碑与实施路径规划**

\+-------------------------------------------------------------------------------+  
| Phase 1: 数据底座与 2D 画布引擎 (第 1-3 周)                                    |  
| \- PostgreSQL 完整 Schema 建表与索引优化                                       |  
| \- Web (Fabric.js) & Android (Compose Canvas) 归一化双模画布实现                |  
| \- 静态图层 Z-Index 矩阵与 Open/Closed/Tuck-in 状态机联动                      |  
\+-------------------------------------------------------------------------------+  
                                │  
                                ▼  
\+-------------------------------------------------------------------------------+  
| Phase 2: AI 管线集成与积分调度 (第 4-6 周)                                    |  
| \- Vision LLM 多色、花纹、类目自动提取打标服务对接                              |  
| \- ControlNet A-Pose 人像标准化与 Ghost Mannequin 服装切片自动化               |  
| \- 异步任务队列、WebSocket 推送与 100 积分原子扣除/退款系统                    |  
\+-------------------------------------------------------------------------------+  
                                │  
                                ▼  
\+-------------------------------------------------------------------------------+  
| Phase 3: 多角色、公共衣柜 CMS 与社交借穿 (第 7-8 周)                           |  
| \- 多 Profile 隔离与隐私拓扑控制                                               |  
| \- Admin CMS 后台（公共衣物 CRUD、克隆解耦逻辑）                               |  
| \- 好友“帮TA搭配”与 OOTD 日历功能闭环                                          |  
\+-------------------------------------------------------------------------------+  
                                │  
                                ▼  
\+-------------------------------------------------------------------------------+  
| Phase 4: Android 离线优先同步与 VTON 终验 (第 9-10 周)                        |  
| \- Android Room \+ Coil 离线缓存与增量同步引擎                                   |  
| \- Diffusion VTON 高清试穿渲染流集成调优                                       |  
| \- 端到端压测、安全审计与上线发布                                             |  
\+-------------------------------------------------------------------------------+  
