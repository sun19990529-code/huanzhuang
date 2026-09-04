import {
  UserProfile,
  UserAvatar,
  GarmentItem,
  OutfitWearItem,
  GarmentCategory,
  GarmentState,
} from '@smart-wardrobe/shared';

// 动态自适应 API 与 WebSocket 根地址（支持 localhost、suncraft.site 域名及外网反向代理）
const getBaseUrls = () => {
  if (typeof window === 'undefined') {
    return {
      api: 'http://127.0.0.1:3001/v1',
      ws: 'ws://127.0.0.1:3001/v1/ws/tasks',
    };
  }

  const isHttps = window.location.protocol === 'https:';
  const protocol = isHttps ? 'https:' : 'http:';
  const wsProtocol = isHttps ? 'wss:' : 'ws:';
  const host = window.location.host; // e.g. "suncraft.site:5173", "suncraft.site" or "localhost:5173"

  return {
    api: `${protocol}//${host}/v1`,
    ws: `${wsProtocol}//${host}/v1/ws/tasks`,
  };
};

const { api: API_BASE, ws: WS_BASE } = getBaseUrls();

export type UserData = CurrentUser;
export type ProfileData = UserProfile;

export interface ExtendedGarmentItem extends GarmentItem {
  brand?: string;
  priceCents?: number;
  externalBuyUrl?: string;
  isArchived?: boolean;
  isFeatured?: boolean;
}

export interface CurrentUser {
  id: string;
  username?: string;
  email: string;
  nickname: string;
  avatarUrl?: string;
  role: 'USER' | 'ADMIN';
  dailyCredits: number;
  permanentCredits: number;
  totalCredits: number;
  token?: string;
}

export interface CreditLedgerItem {
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

let activeToken: string | null = localStorage.getItem('SW_AUTH_TOKEN');
let activeUserId: string | null = localStorage.getItem('SW_USER_ID');

export function setAuthSession(token: string | null, userId: string | null) {
  activeToken = token;
  activeUserId = userId;
  if (token) {
    localStorage.setItem('SW_AUTH_TOKEN', token);
  } else {
    localStorage.removeItem('SW_AUTH_TOKEN');
  }
  if (userId) {
    localStorage.setItem('SW_USER_ID', userId);
  } else {
    localStorage.removeItem('SW_USER_ID');
  }
}

export function getActiveUserId(): string | null {
  return activeUserId;
}

export function setActiveUserId(userId: string | null) {
  setAuthSession(activeToken, userId);
}

function authHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const headers: Record<string, string> = { ...extra };
  const tok = activeToken || (typeof window !== 'undefined' ? localStorage.getItem('SW_AUTH_TOKEN') : null);
  const uid = activeUserId || (typeof window !== 'undefined' ? localStorage.getItem('SW_USER_ID') : null);
  if (tok) {
    headers['Authorization'] = `Bearer ${tok}`;
    headers['x-auth-token'] = tok;
  }
  if (uid) {
    headers['x-user-id'] = uid;
  }
  return headers;
}

// --------------------------------------------------------------------
// 1. 认证与账号 API
// --------------------------------------------------------------------
export async function fetchCurrentUser(): Promise<CurrentUser> {
  const res = await fetch(`${API_BASE}/auth/me`, {
    headers: authHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || '获取用户信息失败');
  return data.data;
}

export async function loginUser(email: string, password?: string): Promise<CurrentUser> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: password || '123456' }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || '登录失败');
  setAuthSession(data.data.token, data.data.id);
  return data.data;
}

export async function adminLogin(username: string, password: string): Promise<CurrentUser> {
  const res = await fetch(`${API_BASE}/auth/admin-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || '管理员登录失败');
  setAuthSession(data.data.token, data.data.id);
  return data.data;
}

export async function registerUser(payload: {
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
}): Promise<{ user: CurrentUser; profile: UserProfile; avatar: UserAvatar }> {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || '注册失败');
  setAuthSession(data.data.token, data.data.user.id);
  return data.data;
}

export async function changePassword(oldPassword: string, newPassword: string): Promise<void> {
  const res = await fetch(`${API_BASE}/auth/change-password`, {
    method: 'PUT',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ oldPassword, newPassword }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || '修改密码失败');
}

export async function updateProfileInfo(nickname: string, avatarUrl?: string): Promise<any> {
  const res = await fetch(`${API_BASE}/auth/update-profile`, {
    method: 'PUT',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ nickname, avatarUrl }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || '更新个人信息失败');
  return data.data;
}

export async function fetchMyCreditsLedger(): Promise<{
  dailyCredits: number;
  permanentCredits: number;
  totalCredits: number;
  ledger: CreditLedgerItem[];
}> {
  const res = await fetch(`${API_BASE}/credits/my-ledger`, {
    headers: authHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || '获取积分账单失败');
  return data.data;
}

// --------------------------------------------------------------------
// 2. Profile 多角色与身材管理
// --------------------------------------------------------------------
export async function fetchProfiles(): Promise<UserProfile[]> {
  const res = await fetch(`${API_BASE}/profiles`, {
    headers: authHeaders(),
  });
  const data = await res.json();
  return data.data || [];
}

export async function createProfile(payload: {
  name: string;
  gender?: 'MALE' | 'FEMALE';
  heightCm?: number;
  weightKg?: number;
  bustCm?: number;
  waistCm?: number;
  hipsCm?: number;
  privacyLevel?: 'PRIVATE' | 'FRIENDS_ONLY' | 'PUBLIC';
  useGoldenRatio?: boolean;
}): Promise<UserProfile> {
  const res = await fetch(`${API_BASE}/profiles`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || '创建角色失败');
  return data.data;
}

export async function updateProfile(id: string, updates: Partial<UserProfile>): Promise<UserProfile> {
  const res = await fetch(`${API_BASE}/profiles/${id}`, {
    method: 'PUT',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(updates),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || '更新角色失败');
  return data.data;
}

export async function fetchProfileAvatar(profileId: string): Promise<UserAvatar> {
  const res = await fetch(`${API_BASE}/profiles/${profileId}/avatar`, {
    headers: authHeaders(),
  });
  const data = await res.json();
  return data.data;
}

export async function uploadAvatarPhoto(profileId: string, imageBase64: string): Promise<UserAvatar> {
  const res = await fetch(`${API_BASE}/profiles/${profileId}/avatar/upload`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ imageBase64 }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || '模特素体生成失败');
  return data.data.avatar;
}

export async function uploadAvatarAsset(profileId: string, file: File): Promise<UserAvatar> {
  const compressedBase64 = await compressImageFile(file);
  const av = await uploadAvatarPhoto(profileId, compressedBase64);
  return av;
}

export async function regenerateAvatarByBodyParams(
  profileId: string,
  params: {
    gender: 'FEMALE' | 'MALE';
    heightCm: number;
    weightKg: number;
    bustCm?: number;
    waistCm?: number;
    hipsCm?: number;
    bodyType?: string;
    skinTone?: string;
    hairstyle?: string;
  }
): Promise<{ profile: UserProfile; avatar: UserAvatar; remainingDailyCredits: number }> {
  const res = await fetch(`${API_BASE}/profiles/${profileId}/regenerate-avatar-by-params`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(params),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'AI 模特重塑失败');
  return data.data;
}

// --------------------------------------------------------------------
// 3. 衣橱单品与切片 API
// --------------------------------------------------------------------
export async function fetchProfileGarments(profileId: string, category = 'ALL'): Promise<ExtendedGarmentItem[]> {
  const url = category === 'ALL'
    ? `${API_BASE}/garments?profileId=${profileId}`
    : `${API_BASE}/garments?profileId=${profileId}&category=${category}`;
  const res = await fetch(url, { headers: authHeaders() });
  const data = await res.json();
  return data.data || [];
}

export async function fetchPublicGarments(category = 'ALL', includeArchived = true): Promise<ExtendedGarmentItem[]> {
  const url = `${API_BASE}/garments/public?category=${category}&includeArchived=${includeArchived}`;
  const res = await fetch(url);
  const data = await res.json();
  return data.data || [];
}

export async function clonePublicGarment(garmentId: string, targetProfileId: string): Promise<ExtendedGarmentItem> {
  const res = await fetch(`${API_BASE}/garments/public/${garmentId}/clone`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ targetProfileId }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || '克隆单品失败');
  return data.data;
}

export async function deleteGarment(garmentId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/garments/${garmentId}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || '删除衣物失败');
}

export async function batchDeleteUserGarments(garmentIds: string[]): Promise<{ deletedCount: number }> {
  const res = await fetch(`${API_BASE}/garments/batch-delete`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ garmentIds }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || '批量删除衣物失败');
  return data.data;
}

export async function generateFissionStateAsset(
  garmentId: string,
  stateType: 'OPEN' | 'CLOSED' | 'TUCKED'
): Promise<{ garmentId: string; stateType: string; pngUrl: string; asset: any }> {
  const res = await fetch(`${API_BASE}/garments/${garmentId}/generate-fission-state`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ stateType }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || '生成形态切片失败');
  return data.data;
}

export async function autoDetectUploadGarments(
  profileId: string,
  imageBase64: string
): Promise<{ taskId?: string; garments?: ExtendedGarmentItem[] }> {
  const res = await fetch(`${API_BASE}/garments/auto-detect-upload`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ profileId, imageBase64 }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || '识别入库失败');
  return data.data;
}

export async function updateGarmentAsset(garmentId: string, pngUrl: string): Promise<ExtendedGarmentItem> {
  const res = await fetch(`${API_BASE}/garments/${garmentId}/asset`, {
    method: 'PUT',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ pngUrl }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || '更新单品切片失败');
  return data.data;
}

export async function uploadCustomGarment(
  profileId: string,
  title: string,
  categoryHint: GarmentCategory,
  imageFile?: File
): Promise<any> {
  const res = await fetch(`${API_BASE}/garments/upload`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ profileId, title, categoryHint }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || '上传衣物失败');
  return data.data;
}

export async function uploadBatchSegmentedGarments(profileId: string, imageDesc: string): Promise<any> {
  const res = await fetch(`${API_BASE}/garments/upload-batch-segment`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ profileId, imageDesc }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || '一拍多衣上传失败');
  return data.data;
}

// --------------------------------------------------------------------
// 4. 多模态 AI 对齐与 VTON
// --------------------------------------------------------------------
export interface GarmentPlacementResult {
  top?: number;
  left?: number;
  width?: number;
  height?: number;
  offsetX?: number;
  offsetY?: number;
  scale: number;
  scaleX?: number;
  scaleY?: number;
  anatomicalAnchor: string;
  confidence: number;
  description: string;
  isFromMemory?: boolean;
}

export async function matchGarmentPlacement(params: {
  avatarId?: string;
  avatarImageUrl?: string;
  garmentId?: string;
  garmentImageUrl?: string;
  garmentTitle: string;
  garmentCategory: string;
  garmentSubCategory?: string;
  box_2d?: [number, number, number, number];
  avatarProfile?: any;
  stageWidth?: number;
  stageHeight?: number;
}): Promise<GarmentPlacementResult> {
  const res = await fetch(`${API_BASE}/ai/match-garment-placement`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || '解剖匹配失败');
  return data.data;
}

export async function renderVtonOutfit(
  profileId: string,
  items: OutfitWearItem[],
  canvasSnapshotBase64?: string
): Promise<{ taskId: string; remainingDailyCredits: number }> {
  const res = await fetch(`${API_BASE}/outfits/render-vton`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ profileId, items, canvasSnapshotBase64 }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || '发起 VTON 失败');
  return data.data;
}

export interface UserTaskItem {
  taskId: string;
  taskType: string;
  status: 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILED' | 'TIMEOUT';
  progressPercent: number;
  currentStage: string;
  costCredits?: number;
  inputPayload?: any;
  resultUrl: string | null;
  outputResult?: any;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

export async function fetchUserTasks(): Promise<{ runningTasks: UserTaskItem[]; historyTasks: UserTaskItem[] }> {
  const res = await fetch(`${API_BASE}/tasks`, {
    headers: authHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || '获取任务列表失败');
  return data.data || { runningTasks: [], historyTasks: [] };
}

export async function fetchTaskStatus(taskId: string): Promise<{
  taskId: string;
  taskType: string;
  status: 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILED';
  progressPercent: number;
  currentStage: string;
  resultUrl: string | null;
  outputResult?: any;
  error: string | null;
}> {
  const res = await fetch(`${API_BASE}/tasks/${taskId}`, {
    headers: authHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || '查询任务状态失败');
  return data.data;
}

export async function deleteTaskApi(taskId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/tasks/${taskId}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || '删除任务记录失败');
}

export async function clearHistoryTasksApi(): Promise<{ deletedCount: number }> {
  const res = await fetch(`${API_BASE}/tasks/history/clear`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || '清空历史任务记录失败');
  return data.data || { deletedCount: 0 };
}

export async function saveOutfit(payload: {
  profileId: string;
  title: string;
  previewImageUrl?: string;
  sceneTag?: string;
  items: OutfitWearItem[];
}): Promise<OutfitData> {
  const res = await fetch(`${API_BASE}/outfits`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || '保存套装失败');
  return data.data;
}

export async function fetchProfileOutfits(profileId?: string): Promise<OutfitData[]> {
  const url = profileId ? `${API_BASE}/outfits?profileId=${profileId}` : `${API_BASE}/outfits`;
  const res = await fetch(url, { headers: authHeaders() });
  const data = await res.json();
  return data.data || [];
}

export async function deleteOutfit(outfitId: string): Promise<boolean> {
  const res = await fetch(`${API_BASE}/outfits/${outfitId}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.message || '删除搭配失败');
  }
  return true;
}

export async function fetchSuggestions(profileId: string, temperatureC = 22, lockedIds: string[] = []): Promise<any> {
  const lockParam = lockedIds.length > 0 ? `&lockedIds=${lockedIds.join(',')}` : '';
  const res = await fetch(
    `${API_BASE}/outfits/slot-machine?profileId=${profileId}&temperatureC=${temperatureC}${lockParam}`,
    { headers: authHeaders() }
  );
  const data = await res.json();
  return data.data;
}

// --------------------------------------------------------------------
// 5. OOTD 与社交 API
// --------------------------------------------------------------------
export interface OutfitData {
  id: string;
  profileId: string;
  creatorUserId?: string;
  title: string;
  previewImageUrl?: string;
  isVtonRendered: boolean;
  isPublic?: boolean;
  sceneTag?: string;
  items: OutfitWearItem[];
  createdAt: string;
}

export interface FriendItem {
  id: string;
  friendUserId: string;
  name: string;
  username?: string;
  avatarUrl?: string;
  friendCode: string;
  roleTag: string;
  garmentCount: number;
  defaultProfileId?: string | null;
}

export interface OotdEntry {
  id: string;
  profileId: string;
  outfitId: string;
  logDate: string;
  weatherTag?: string;
  notes?: string;
  createdAt?: string;
}

export interface OutfitSuggestionData {
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

export async function fetchOotdLogs(profileId: string): Promise<OotdEntry[]> {
  const res = await fetch(`${API_BASE}/ootd?profileId=${profileId}`, { headers: authHeaders() });
  const data = await res.json();
  return data.data || [];
}

export async function logOotdEntry(payload: {
  profileId: string;
  outfitId: string;
  logDate: string;
  weatherTag?: string;
  notes?: string;
}): Promise<OotdEntry> {
  const res = await fetch(`${API_BASE}/ootd`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  return data.data;
}

export async function deleteOotdEntry(id: string): Promise<boolean> {
  const res = await fetch(`${API_BASE}/ootd/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  return res.ok;
}

export async function fetchMyFriendCode(): Promise<string> {
  const res = await fetch(`${API_BASE}/friends/my-code`, { headers: authHeaders() });
  const data = await res.json();
  return data.data?.friendCode || 'SW-0000';
}

export async function fetchFriends(): Promise<FriendItem[]> {
  const res = await fetch(`${API_BASE}/friends`, { headers: authHeaders() });
  const data = await res.json();
  return data.data || [];
}

export async function addFriendByCode(friendCode: string): Promise<any> {
  const res = await fetch(`${API_BASE}/friends/add`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ friendCode }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || '添加好友失败');
  return data.data;
}

export async function removeFriend(friendUserId: string): Promise<void> {
  await fetch(`${API_BASE}/friends/${friendUserId}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
}

export async function fetchFriendOutfits(friendUserId: string): Promise<OutfitData[]> {
  const res = await fetch(`${API_BASE}/friends/${friendUserId}/outfits`, { headers: authHeaders() });
  const data = await res.json();
  return data.data || [];
}

export async function fetchFriendProfileData(friendUserId: string): Promise<{ profile: any; avatar: any; garments: any[] }> {
  const res = await fetch(`${API_BASE}/friends/${friendUserId}/profile-data`, { headers: authHeaders() });
  const data = await res.json();
  return data.data;
}

export async function fetchReceivedSuggestions(): Promise<OutfitSuggestionData[]> {
  const res = await fetch(`${API_BASE}/friends/suggestions`, { headers: authHeaders() });
  const data = await res.json();
  return data.data || [];
}

export async function sendOutfitSuggestion(payload: {
  targetUserId: string;
  targetProfileId: string;
  title: string;
  garmentIds: string[];
  previewImageUrl?: string;
  notes?: string;
}): Promise<any> {
  const res = await fetch(`${API_BASE}/friends/suggest-outfit`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || '推送建议失败');
  return data.data;
}

export async function acceptSuggestion(suggestionId: string): Promise<OutfitData> {
  const res = await fetch(`${API_BASE}/friends/suggestions/${suggestionId}/accept`, {
    method: 'POST',
    headers: authHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || '采纳建议失败');
  return data.data;
}

export const suggestOutfitToFriend = sendOutfitSuggestion;
export const acceptOutfitSuggestion = acceptSuggestion;

// --------------------------------------------------------------------
// 6. CMS 官方运营管理 API (需管理员权限)
// --------------------------------------------------------------------
export async function uploadOfficialGarment(payload: {
  title: string;
  primaryCategory: GarmentCategory;
  subCategory?: string;
  colors?: string[];
  brand?: string;
  priceCents?: number;
  externalBuyUrl?: string;
  imageBase64?: string;
}): Promise<ExtendedGarmentItem> {
  const res = await fetch(`${API_BASE}/cms/garments/upload-official`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || '官方录入单品失败');
  return data.data;
}

export async function updateOfficialGarment(
  id: string,
  payload: { title?: string; brand?: string; priceCents?: number; externalBuyUrl?: string }
): Promise<ExtendedGarmentItem> {
  const res = await fetch(`${API_BASE}/cms/garments/${id}`, {
    method: 'PUT',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || '更新单品信息失败');
  return data.data;
}

export async function toggleOfficialGarmentStatus(id: string): Promise<boolean> {
  const res = await fetch(`${API_BASE}/cms/garments/${id}/toggle-status`, {
    method: 'POST',
    headers: authHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || '切换上下架状态失败');
  return data.data.isArchived;
}

export async function fetchCmsUsers(): Promise<any[]> {
  const res = await fetch(`${API_BASE}/cms/users`, { headers: authHeaders() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || '获取用户大盘失败');
  return data.data || [];
}

export async function adjustUserCredits(
  userId: string,
  deltaDaily: number,
  deltaPermanent: number,
  reason: string
): Promise<any> {
  const res = await fetch(`${API_BASE}/cms/users/${userId}/adjust-credits`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ deltaDaily, deltaPermanent, reason }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || '调整用户积分失败');
  return data.data;
}

export async function fetchCmsLedger(): Promise<CreditLedgerItem[]> {
  const res = await fetch(`${API_BASE}/cms/ledger`, { headers: authHeaders() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || '获取全局流水失败');
  return data.data || [];
}

export interface DashboardStats {
  totalUsers: number;
  totalAdmins: number;
  normalUsers: number;
  frozenUsers: number;
  bannedUsers: number;
  totalProfiles: number;
  totalOutfits: number;
  totalTasks: number;
  totalPublicGarments: number;
  activePublicGarments: number;
  featuredPublicGarments: number;
  totalDailyPool: number;
  totalPermanentPool: number;
  totalLedgerTransactions: number;
}

export async function fetchCmsDashboardStats(): Promise<DashboardStats> {
  const res = await fetch(`${API_BASE}/cms/stats/dashboard`, { headers: authHeaders() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || '获取运营大盘指标失败');
  return data.data;
}

export async function fetchCmsUserDetails(userId: string): Promise<any> {
  const res = await fetch(`${API_BASE}/cms/users/${userId}/details`, { headers: authHeaders() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || '获取用户资产画像失败');
  return data.data;
}

export async function updateCmsUserStatus(
  userId: string,
  status: 'NORMAL' | 'FROZEN' | 'BANNED',
  reason?: string
): Promise<any> {
  const res = await fetch(`${API_BASE}/cms/users/${userId}/status`, {
    method: 'PUT',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ status, reason }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || '修改用户状态失败');
  return data.data;
}

export async function resetCmsUserPassword(userId: string, newPassword: string): Promise<void> {
  const res = await fetch(`${API_BASE}/cms/users/${userId}/reset-password`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ newPassword }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || '重置用户密码失败');
}

export async function updateCmsUserRole(userId: string, role: 'USER' | 'ADMIN'): Promise<any> {
  const res = await fetch(`${API_BASE}/cms/users/${userId}/role`, {
    method: 'PUT',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ role }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || '修改用户角色失败');
  return data.data;
}

export interface DashboardTrends {
  dates: string[];
  tasksTrend: number[];
  creditsTrend: number[];
  usersTrend: number[];
}

export async function fetchCmsDashboardTrends(): Promise<DashboardTrends> {
  const res = await fetch(`${API_BASE}/cms/stats/trends`, { headers: authHeaders() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || '获取趋势走势失败');
  return data.data;
}

export async function updateCmsUserTags(userId: string, tags: string[]): Promise<any> {
  const res = await fetch(`${API_BASE}/cms/users/${userId}/tags`, {
    method: 'PUT',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ tags }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || '更新用户标签失败');
  return data.data;
}

export async function batchUpdateUserStatus(
  userIds: string[],
  status: 'NORMAL' | 'FROZEN' | 'BANNED',
  reason?: string
): Promise<{ count: number }> {
  const res = await fetch(`${API_BASE}/cms/users/batch-status`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ userIds, status, reason }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || '批量修改用户状态失败');
  return data.data;
}

export async function batchDeleteCmsUsers(userIds: string[]): Promise<{ count: number }> {
  const res = await fetch(`${API_BASE}/cms/users/batch-delete`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ userIds }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || '批量删除用户失败');
  return data.data;
}

export async function batchAdjustUserCredits(
  userIds: string[],
  deltaDaily: number,
  deltaPermanent: number,
  reason: string
): Promise<{ count: number }> {
  const res = await fetch(`${API_BASE}/cms/users/batch-adjust-credits`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ userIds, deltaDaily, deltaPermanent, reason }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || '批量调分失败');
  return data.data;
}

export async function batchToggleGarmentStatus(garmentIds: string[], isArchived: boolean): Promise<{ count: number }> {
  const res = await fetch(`${API_BASE}/cms/garments/batch-toggle-status`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ garmentIds, isArchived }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || '批量切换单品上下架失败');
  return data.data;
}

export async function batchDeleteGarments(garmentIds: string[]): Promise<{ count: number }> {
  const res = await fetch(`${API_BASE}/cms/garments/batch-delete`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ garmentIds }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || '批量删除单品失败');
  return data.data;
}

export async function broadcastCmsCredits(
  deltaPermanent: number,
  deltaDaily: number,
  reason: string,
  targetTag?: string
): Promise<{ count: number }> {
  const res = await fetch(`${API_BASE}/cms/credits/broadcast`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ deltaPermanent, deltaDaily, reason, targetTag }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || '活动广播发放积分失败');
  return data.data;
}

export async function deleteCmsUser(userId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/cms/users/${userId}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || '删除用户失败');
}

export async function deleteOfficialGarment(garmentId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/cms/garments/${garmentId}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || '删除公共单品失败');
}

export async function toggleOfficialGarmentFeatured(id: string): Promise<boolean> {
  const res = await fetch(`${API_BASE}/cms/garments/${id}/toggle-featured`, {
    method: 'POST',
    headers: authHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || '切换单品置顶失败');
  return data.data.isFeatured;
}

export async function resetCreditsAdmin(): Promise<void> {
  const res = await fetch(`${API_BASE}/credits/reset-daily`, {
    method: 'POST',
    headers: authHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || '重置积分失败');
}

// --------------------------------------------------------------------
// 7. 辅助图片压缩与 WebSocket
// --------------------------------------------------------------------
export async function compressImageFile(file: File, maxWidth = 1200, maxHeight = 1600, quality = 0.85): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            width = Math.max(1, width);
            height = maxHeight;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(e.target?.result as string);
        ctx.drawImage(img, 0, 0, width, height);

        // WebP 优先压缩转码 (Defect 9 优化，体积降低 40%)
        const webpDataUrl = canvas.toDataURL('image/webp', quality);
        if (webpDataUrl.startsWith('data:image/webp')) {
          resolve(webpDataUrl);
        } else {
          resolve(canvas.toDataURL('image/jpeg', quality));
        }
      };
      img.onerror = () => resolve(e.target?.result as string);
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function connectTaskWebSocket(onMessage: (event: string, data: any) => void) {
  let ws: WebSocket | null = null;
  try {
    const url = activeUserId ? `${WS_BASE}?userId=${encodeURIComponent(activeUserId)}` : WS_BASE;
    ws = new WebSocket(url);
    ws.onopen = () => {
      if (activeUserId) {
        ws?.send(JSON.stringify({ type: 'AUTH', userId: activeUserId, token: activeToken }));
      }
    };
    ws.onmessage = (e) => {
      try {
        const payload = JSON.parse(e.data);
        onMessage(payload.event, payload.data);
      } catch (err) {
        console.warn('WS JSON Parse Error:', err);
      }
    };
    ws.onerror = (e) => console.warn('WS Error:', e);
  } catch (e) {
    console.warn('WS Connect Error:', e);
  }
  return () => {
    if (ws) ws.close();
  };
}
