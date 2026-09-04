// ====================================================================
// SmartWardrobe 共享核心类型定义 (Shared Types)
// ====================================================================

export type UserRole = 'USER' | 'ADMIN';
export type Gender = 'MALE' | 'FEMALE' | 'OTHER';
export type PrivacyLevel = 'PRIVATE' | 'FRIENDS_ONLY' | 'PUBLIC';

export type GarmentCategory = 
  | 'TOPS' 
  | 'BOTTOMS' 
  | 'OUTERWEAR' 
  | 'FOOTWEAR' 
  | 'ACCESSORIES' 
  | 'ONE_PIECE';

export type GarmentState = 
  | 'DEFAULT' 
  | 'OPEN' 
  | 'CLOSED' 
  | 'TUCKED' 
  | 'UNTUCKED';

export type TaskType = 
  | 'AVATAR_NORMALIZE' 
  | 'GARMENT_NORMALIZE' 
  | 'GARMENT_DETECTION'
  | 'VTON_RENDER';

export type TaskStatus = 
  | 'PENDING' 
  | 'PROCESSING' 
  | 'SUCCESS' 
  | 'FAILED' 
  | 'TIMEOUT';

export interface NormalizedPoint {
  x: number; // 0.0000 ~ 1.0000
  y: number; // 0.0000 ~ 1.0000
}

export interface PixelPoint {
  x: number;
  y: number;
}

export interface CanvasDimensions {
  width: number;
  height: number;
}

export interface BoundingBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface TransformMatrix {
  scaleX: number;
  scaleY: number;
  offsetX: number;
  offsetY: number;
  rotation: number;
}

export interface GarmentAssetItem {
  id: string;
  garmentId: string;
  stateType: GarmentState;
  pngUrl: string;
  boundingBox?: BoundingBox;
  defaultAnchor: NormalizedPoint;
  baseLayerWeight: number;
}

export interface GarmentItem {
  id: string;
  profileId?: string | null;
  isPublic: boolean;
  clonedFromId?: string | null;
  title: string;
  primaryCategory: GarmentCategory;
  subCategory: string;
  colors: string[];
  patterns: string[];
  material?: string;
  brand?: string;
  priceCents?: number;
  assets: GarmentAssetItem[];
}

export interface OutfitWearItem {
  garmentId: string;
  appliedState: GarmentState;
  zIndex: number;
  transformMatrix: TransformMatrix;
}

export interface UserProfile {
  id: string;
  userId: string;
  name: string;
  gender: Gender;
  isDefault: boolean;
  heightCm: number;
  weightKg: number;
  bustCm: number;
  waistCm: number;
  hipsCm: number;
  isCustomBodyParams: boolean;
  privacyLevel: PrivacyLevel;
}

export interface UserAvatar {
  id: string;
  profileId: string;
  originalImageUrl: string;
  normalizedImageUrl?: string;
  anchorPoints: Record<string, [number, number]>;
  isActive: boolean;
}
