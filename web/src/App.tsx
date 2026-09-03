import React, { useState, useEffect } from 'react';
import {
 UserProfile,
 UserAvatar,
 GarmentItem,
 OutfitWearItem,
 GarmentCategory,
 GarmentState,
} from '@smart-wardrobe/shared';
import {
 fetchCurrentUser,
 fetchProfiles,
 fetchProfileAvatar,
 fetchProfileGarments,
 fetchPublicGarments,
 clonePublicGarment,
 deleteGarment,
 fetchProfileOutfits,
 fetchOotdLogs,
 fetchSuggestions,
 renderVtonOutfit,
 fetchTaskStatus,
  fetchUserTasks,
  UserTaskItem,
 saveOutfit,
 logOotdEntry,
 suggestOutfitToFriend,
 acceptOutfitSuggestion,
 autoDetectUploadGarments,
 connectTaskWebSocket,
 compressImageFile,
 uploadAvatarAsset,
 resetCreditsAdmin,
 setAuthSession,
 CurrentUser,
 UserData,
 ProfileData,
 ExtendedGarmentItem,
 OutfitData,
 OotdEntry,
 OutfitSuggestionData,
 FriendItem,
 fetchFriendProfileData,
} from './api';
import { getCategoryDefaultOffsets } from './utils/imageProcess';

import { Header } from './components/Header';
import { AuthView } from './views/AuthView';
import { AdminLoginView } from './views/AdminLoginView';
import { AccountSettingsModal } from './views/AccountSettingsModal';
import { WardrobeGalleryView } from './views/WardrobeGalleryView';
import { FittingStudioView, WornItemData } from './views/FittingStudioView';
import { OotdGalleryView } from './views/OotdGalleryView';
import { FriendSocialView } from './views/FriendSocialView';
import { CmsAdminView } from './views/CmsAdminView';
import { ProfileModal } from './components/ProfileModal';
import { TaskCenterDrawer } from './components/TaskCenterDrawer';
import { ToastContainer, showToast } from './components/Toast';
import { Shirt } from 'lucide-react';

export const App: React.FC = () => {
 // 路由与隐藏后台判断
 const [isAdminRoute, setIsAdminRoute] = useState(
 window.location.hash === '#/admin-portal' || window.location.hash === '#admin-portal'
 );

 // 网络在线状态 (Defect 19)
 const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

 useEffect(() => {
 const handleOnline = () => {
 setIsOnline(true);
 showToast('🟢 网络连接已恢复', 'success');
 };
 const handleOffline = () => {
 setIsOnline(false);
 showToast('️ 当前网络已断开，已为您切换至本地离线容灾模式', 'error');
 };
 window.addEventListener('online', handleOnline);
 window.addEventListener('offline', handleOffline);
 return () => {
 window.removeEventListener('online', handleOnline);
 window.removeEventListener('offline', handleOffline);
 };
 }, []);

 // 认证初始化加载状态 (避免刷新页面时登录页 FOUC 闪烁)
 const [isAuthInitializing, setIsAuthInitializing] = useState<boolean>(() => {
   return !!localStorage.getItem('SW_AUTH_TOKEN');
 });
	const [isAuthFadingOut, setIsAuthFadingOut] = useState<boolean>(false);

 // 用户与角色状态
 const [user, setUser] = useState<CurrentUser | null>(null);
 const [profiles, setProfiles] = useState<UserProfile[]>([]);
 const [currentProfile, setCurrentProfile] = useState<UserProfile | null>(null);
 const [currentAvatar, setCurrentAvatar] = useState<UserAvatar | null>(null);

 // 视图与弹窗
 const [activeView, setActiveView] = useState<'AUTH' | 'WARDROBE' | 'STUDIO' | 'OOTD' | 'FRIENDS' | 'CMS'>('STUDIO');
 const [isAccountSettingsOpen, setIsAccountSettingsOpen] = useState(false);
  // 任务中心抽屉与任务列表
  const [isTaskCenterOpen, setIsTaskCenterOpen] = useState(false);
  const [runningTasks, setRunningTasks] = useState<UserTaskItem[]>([]);
  const [historyTasks, setHistoryTasks] = useState<UserTaskItem[]>([]);
  const [isTasksLoading, setIsTasksLoading] = useState(false);
  const [stylingFriend, setStylingFriend] = useState<{ name: string; friendUserId: string } | null>(null);
 const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

 // 资产与业务数据
 const [garments, setGarments] = useState<ExtendedGarmentItem[]>([]);
 const [publicGarments, setPublicGarments] = useState<ExtendedGarmentItem[]>([]);
 const [wornItems, setWornItems] = useState<WornItemData[]>([]);
 const [outfits, setOutfits] = useState<OutfitData[]>([]);
 const [ootdLogs, setOotdLogs] = useState<OotdEntry[]>([]);
 const [suggestions, setSuggestions] = useState<OutfitSuggestionData[]>([]);

 // 异步 VTON 渲染状态
 const [isRendering, setIsRendering] = useState(false);
 const [renderProgress, setRenderProgress] = useState(0);
 const [renderStage, setRenderStage] = useState('');
 const [renderedImageUrl, setRenderedImageUrl] = useState<string | null>(null);

 // 监听 URL Hash 变化
 useEffect(() => {
 const handleHashChange = () => {
 const isAdm = window.location.hash === '#/admin-portal' || window.location.hash === '#admin-portal';
 setIsAdminRoute(isAdm);
 if (isAdm && user?.role === 'ADMIN') {
 setActiveView('CMS');
 }
 };
 window.addEventListener('hashchange', handleHashChange);
 return () => window.removeEventListener('hashchange', handleHashChange);
 }, [user]);

 // 初始化尝试自动获取已登录用户
 useEffect(() => {
 initAuth();
 }, []);

 const initAuth = async () => {
 try {
 const currentUser = await fetchCurrentUser();
 await loadUserData(currentUser);
 setUser(currentUser);
 if (currentUser.role === 'ADMIN' && (window.location.hash === '#/admin-portal' || window.location.hash === '#admin-portal')) {
 setActiveView('CMS');
 }
 } catch (e) {
 console.log('未登录或凭证过期，展示登录注册页');
 setUser(null);
 loadPublicGarments();
 } finally {
		setIsAuthFadingOut(true);
		setTimeout(() => {
			setIsAuthInitializing(false);
			setIsAuthFadingOut(false);
		}, 450);
 }
 };

 
  // 彻底清空上一账号所有内存与会话状态 (Defect: 账号切换数据残留)
  const resetAllAccountState = () => {
    setAuthSession(null, null);
    setUser(null);
    setProfiles([]);
    setCurrentProfile(null);
    setCurrentAvatar(null);
    setGarments([]);
    setWornItems([]);
    setOutfits([]);
    setOotdLogs([]);
    setSuggestions([]);
    setRunningTasks([]);
    setHistoryTasks([]);
    setStylingFriend(null);
    setRenderedImageUrl(null);
    setIsRendering(false);
    setRenderProgress(0);
    setRenderStage('');
  };

  // 加载当前登录用户的任务清单 (进行中 + 最近 5 条历史)
  const loadUserTasks = async () => {
    try {
      setIsTasksLoading(true);
      const { runningTasks: rTasks, historyTasks: hTasks } = await fetchUserTasks();
      setRunningTasks(rTasks);
      setHistoryTasks(hTasks);
    } catch (err) {
      console.warn('加载用户任务列表失败:', err);
    } finally {
      setIsTasksLoading(false);
    }
  };

  const loadUserData = async (currentUser: CurrentUser) => {
    // 切换账号先重置局部数据
    setProfiles([]);
    setCurrentProfile(null);
    setCurrentAvatar(null);
    setGarments([]);
    setWornItems([]);
    setOutfits([]);
    setOotdLogs([]);
    setSuggestions([]);
    setRunningTasks([]);
    setHistoryTasks([]);
    setStylingFriend(null);
    setRenderedImageUrl(null);
    setIsRendering(false);

    try {
      const userProfiles = await fetchProfiles();
      setProfiles(userProfiles);
      const defaultProf = userProfiles.find((p) => p.isDefault) || userProfiles[0] || null;
      setCurrentProfile(defaultProf);

      if (defaultProf) {
        await loadProfileData(defaultProf);
      } else {
        setCurrentAvatar(null);
        setGarments([]);
        setOutfits([]);
        setOotdLogs([]);
      }
      await loadPublicGarments();
      await loadUserTasks();
    } catch (err) {
      console.warn('加载用户数据失败:', err);
    }
  };

  const loadProfileData = async (profile: UserProfile) => {
 try {
 const [av, gList, oList, dLogs] = await Promise.all([
 fetchProfileAvatar(profile.id),
 fetchProfileGarments(profile.id),
 fetchProfileOutfits(profile.id),
 fetchOotdLogs(profile.id),
 ]);
 setCurrentAvatar(av);
 setGarments(gList);
 setOutfits(oList);
 setOotdLogs(dLogs);
 } catch (e) {
 console.warn('加载角色数据失败:', e);
 }
 };

 const loadPublicGarments = async () => {
 try {
 const pub = await fetchPublicGarments('ALL', true);
 setPublicGarments(pub);
 } catch (e) {
 console.warn('获取公共单品失败:', e);
 }
 };

 // WebSocket 任务监听
 useEffect(() => {
 const disconnect = connectTaskWebSocket((event, data) => {
 if (event === 'TASK_PROGRESS_UPDATED') {
          loadUserTasks();
 if (data.taskType === 'VTON_RENDER') {
 setRenderProgress(data.progress || 0);
 setRenderStage(data.currentStage || '正在渲染...');
 if (data.status === 'SUCCESS' && data.resultUrl) {
 setRenderedImageUrl(data.resultUrl);
 setIsRendering(false);
 } else if (data.status === 'FAILED') {
 setIsRendering(false);
 showToast(`渲染失败: ${data.error || '算力超时'}`, "info");
 }
 }
          loadUserTasks();
 if (data.taskType === 'VTON_RENDER') {
 setRenderProgress(data.progress || 0);
 setRenderStage(data.currentStage || '正在渲染...');
 if (data.status === 'SUCCESS' && data.resultUrl) {
 setRenderedImageUrl(data.resultUrl);
 setIsRendering(false);
 } else if (data.status === 'FAILED') {
 setIsRendering(false);
 showToast(`渲染失败: ${data.error || '算力超时'}`, "info");
 }
 }
 }
 });
 return () => disconnect();
 }, []);

  // 普通用户登录成功 (先彻底清空上一账号所有数据再装载新账号)
  const handleLoginSuccess = async (loggedInUser: CurrentUser) => {
    resetAllAccountState();
    if (loggedInUser.token) {
      setAuthSession(loggedInUser.token, loggedInUser.id);
    }
    setUser(loggedInUser);
    await loadUserData(loggedInUser);
    setActiveView('STUDIO');
  };

  // 管理员隐藏登录成功
  const handleAdminLoginSuccess = async (adminUser: CurrentUser) => {
    resetAllAccountState();
    if (adminUser.token) {
      setAuthSession(adminUser.token, adminUser.id);
    }
    setUser(adminUser);
    await loadUserData(adminUser);
    setActiveView('CMS');
  };

  // 退出登录 (彻底清空上一账号所有状态并回到登录页)
  const handleLogout = () => {
    resetAllAccountState();
    loadPublicGarments();
    setActiveView('AUTH');
  };

  // 退出管理员并返回常规前台
  const handleExitAdmin = () => {
    window.location.hash = '';
    setIsAdminRoute(false);
    setActiveView('STUDIO');
  };

  // 切换角色
  const handleSelectProfile = async (profile: UserProfile) => {
 setCurrentProfile(profile);
 setWornItems([]);
 setRenderedImageUrl(null);
 setIsRendering(false);
 await loadProfileData(profile);
 };

 // 穿脱衣物 (基于解剖部位槽位矩阵：支持多件不同部位配饰共存，连衣裙/套装智能互斥)
  const handleWearGarment = (garment: GarmentItem) => {
    setWornItems((prev) => {
      const existingIndex = prev.findIndex((item) => item.garment.id === garment.id);
      if (existingIndex >= 0) {
        return prev.filter((_, i) => i !== existingIndex);
      }

      const getAccessorySlot = (subCategory: string = '', title: string = ''): string => {
        const combined = `${subCategory} ${title}`.toLowerCase();
        if (/帽|冠|发饰|头饰|hat|cap|beanie|headwear|crown/i.test(combined)) return 'HAT';
        if (/链|项链|锁骨|首饰|吊坠|necklace|pendant|choker|jewelry/i.test(combined)) return 'NECKLACE';
        if (/带|腰带|皮带|waistband|belt/i.test(combined)) return 'BELT';
        if (/包|手提|单肩|斜挎|托特|bag|tote|handbag|crossbody|clutch/i.test(combined)) return 'BAG';
        if (/镜|墨镜|太阳镜|眼镜|glasses|sunglasses|eyewear/i.test(combined)) return 'EYEWEAR';
        return 'OTHER_ACCESSORY';
      };

      const isDress = garment.primaryCategory === 'ONE_PIECE' || /裙|礼服|长裙|连衣裙|旗袍|gown|dress/i.test(garment.title);
      let defaultZIndex = 10;
      if (garment.primaryCategory === 'BOTTOMS') defaultZIndex = 20;
      if (isDress) defaultZIndex = 25;
      if (garment.primaryCategory === 'OUTERWEAR') defaultZIndex = 40;
      if (garment.primaryCategory === 'FOOTWEAR') defaultZIndex = 50;
      if (garment.primaryCategory === 'ACCESSORIES') {
        const slot = getAccessorySlot(garment.subCategory, garment.title);
        if (slot === 'BELT') defaultZIndex = 22;
        else if (slot === 'NECKLACE') defaultZIndex = 30;
        else if (slot === 'BAG') defaultZIndex = 60;
        else if (slot === 'HAT') defaultZIndex = 70;
        else defaultZIndex = 65;
      }

      const offsets = getCategoryDefaultOffsets(
        garment.primaryCategory,
        garment.subCategory,
        garment.title
      );

      const newAccSlot = garment.primaryCategory === 'ACCESSORIES' ? getAccessorySlot(garment.subCategory, garment.title) : null;

      const filtered = prev.filter((item) => {
        const itemCat = item.garment.primaryCategory;
        const itemIsDress = itemCat === 'ONE_PIECE' || /裙|礼服|长裙|连衣裙|旗袍|gown|dress/i.test(item.garment.title);

        if (isDress) {
          // 穿连衣裙时，脱下已有连衣裙、上装、下装
          if (itemIsDress || itemCat === 'TOPS' || itemCat === 'BOTTOMS') return false;
        } else if (garment.primaryCategory === 'TOPS' || garment.primaryCategory === 'BOTTOMS') {
          // 穿上装或下装时，脱下连衣裙，并替换同类单品
          if (itemIsDress) return false;
          if (itemCat === garment.primaryCategory) return false;
        } else if (garment.primaryCategory === 'ACCESSORIES') {
          // 配饰：仅当已有配饰处于同一身体部位时才替换，不同部位(如腰带+包包+项链)完全共存
          if (itemCat === 'ACCESSORIES') {
            const existingSlot = getAccessorySlot(item.garment.subCategory, item.garment.title);
            if (newAccSlot === existingSlot) return false;
          }
        } else if (itemCat === garment.primaryCategory) {
          return false;
        }

        return true;
      });

      return [
        ...filtered,
        {
          garment,
          state: 'DEFAULT',
          zIndex: defaultZIndex,
          offsetX: offsets.offsetX,
          offsetY: offsets.offsetY,
          scale: offsets.scale,
          scaleX: offsets.scale,
          scaleY: offsets.scale,
        },
      ];
    });
  };

  const handleUpdateWornItem = (
 garmentId: string,
 updates: Partial<{ state: GarmentState; offsetX: number; offsetY: number; scale: number; scaleX: number; scaleY: number; zIndex: number }>
 ) => {
 setWornItems((prev) =>
 prev.map((item) => (item.garment.id === garmentId ? { ...item, ...updates } : item))
 );
 };

 const handleRemoveWornItem = (garmentId: string) => {
 setWornItems((prev) => prev.filter((i) => i.garment.id !== garmentId));
 };

 // 克隆公共衣物
 const handleClonePublicGarment = async (publicGarmentId: string) => {
 if (!currentProfile) {
 showToast('请先选择角色档案', "info");
 return;
 }
 try {
 const cloned = await clonePublicGarment(publicGarmentId, currentProfile.id);
 setGarments((prev) => [cloned, ...prev]);
 showToast(` 单品「${cloned.title}」已成功复制到您的专属衣橱！`, "info");
 } catch (err: any) {
 alert(err.message || '克隆失败');
 }
 };

 // 删除私有衣物
 const handleDeleteGarment = async (garmentId: string) => {
 if (!confirm('确定要从您的专属衣橱中彻底删除这件衣物吗？')) return;
 try {
 await deleteGarment(garmentId);
 setGarments(garments.filter((g) => g.id !== garmentId));
 setWornItems(wornItems.filter((i) => i.garment.id !== garmentId));
 showToast('单品已从您的衣橱删除', "info");
 } catch (err: any) {
 alert(err.message || '删除失败');
 }
 };

 // 上传单品照片入库 (自动多模态识别)
 const handleUploadGarmentWithFile = async (file: File) => {
 if (!currentProfile) return;
 try {
 const compressed = await compressImageFile(file);
 const newGarments = await autoDetectUploadGarments(currentProfile.id, compressed);
 setGarments((prev) => [...newGarments, ...prev]);
 if (user) {
 setUser({ ...user, dailyCredits: Math.max(0, user.dailyCredits - (newGarments.length >= 2 ? 2 : 1)) });
 }
 showToast(` 识别成功！已将 ${newGarments.length} 件单品切片入库！`, "info");
 } catch (err: any) {
 alert(err.message || '识别入库失败');
 }
 };

 // 批量保存确认入库单品 (支持选择是否立即穿上模特)
 const handleBatchAddGarments = (newGarments: GarmentItem[], shouldWear: boolean) => {
 setGarments((prev) => [...newGarments, ...prev]);
 if (user) {
 setUser({ ...user, dailyCredits: Math.max(0, user.dailyCredits - (newGarments.length >= 2 ? 2 : 1)) });
 }
 if (shouldWear) {
 newGarments.forEach((g) => {
 handleWearGarment(g);
 });
 }
 showToast(` 已成功将 ${newGarments.length} 件单品存入专属衣橱${shouldWear ? '并为模特穿上！' : '！'}`, "info");
 };

 const handleUploadBatchWithFile = async (file: File) => {
 await handleUploadGarmentWithFile(file);
 };

 // 上传人像素体
 const handleUploadCustomAvatar = async (file: File) => {
 if (!currentProfile) return;
 try {
 const av = await uploadAvatarAsset(currentProfile.id, file);
 setCurrentAvatar(av);
 setRenderedImageUrl(null);
 if (user) {
 setUser({ ...user, dailyCredits: Math.max(0, user.dailyCredits - 1) });
 }
 showToast(' A-Pose 模特素体已成功生成并装载！', "info");
 } catch (err: any) {
 alert(err.message || '素体生成失败');
 }
 };

 // 保存搭配 (支持一键同步打卡至今日 OOTD 日历及场景分类)
 const handleSaveLookbook = async (title: string, syncToOotdToday?: boolean, sceneTag?: string) => {
 if (!currentProfile) return;
 try {
 const newOutfit = await saveOutfit({
 profileId: currentProfile.id,
 title: title || '我的专属搭配',
 sceneTag: sceneTag || 'CASUAL',
 previewImageUrl: renderedImageUrl || undefined,
 items: wornItems.map((item) => ({
 garmentId: item.garment.id,
 appliedState: item.state,
 zIndex: item.zIndex,
 transformMatrix: {
 scaleX: item.scaleX ?? item.scale,
 scaleY: item.scaleY ?? item.scale,
 offsetX: item.offsetX,
 offsetY: item.offsetY,
 rotation: 0,
 },
 })),
 });
 setOutfits([newOutfit, ...outfits]);

 if (syncToOotdToday) {
 const todayStr = new Date().toISOString().split('T')[0];
 const newLog = await logOotdEntry({
 profileId: currentProfile.id,
 outfitId: newOutfit.id,
 logDate: todayStr,
 notes: `来自试衣间灵感套装: ${title}`,
 });
 setOotdLogs((prev) => [newLog, ...prev.filter((l) => l.logDate !== todayStr)]);
 showToast(' 搭配已成功保存至 Lookbook，并同步打卡至今日 OOTD 日历！', "info");
 } else {
 showToast(' 搭配已成功保存至 Lookbook 套装库！', "info");
 }
 } catch (err: any) {
 alert(err.message || '保存搭配失败');
 }
 };

 // 跨衣橱为好友搭配
 const handleDressFriend = async (friend: FriendItem) => {
 try {
 const data = await fetchFriendProfileData(friend.friendUserId);
 if (data && data.profile) {
 setCurrentProfile(data.profile);
 setCurrentAvatar(data.avatar || null);
 if (data.garments && data.garments.length > 0) {
 setGarments(data.garments);
 }
 setWornItems([]);
 setRenderedImageUrl(null);
 setActiveView('STUDIO');
 showToast(` 已成功载入好友「${friend.name}」的模特身材与开放衣橱！快为TA定制一套搭配吧！`, "info");
 } else {
 showToast('该好友暂未创建专属模特档案', "info");
 }
 } catch (err: any) {
 alert(err.message || '加载好友档案失败');
 }
 };

 // 发起 AI VTON 高清渲染
 const handleRenderVton = async (compositeCanvasBase64?: string) => {
 if (!currentProfile) return;
 if (wornItems.length === 0) {
 showToast('请先将衣服拖到模特身上搭配！', "info");
 return;
 }
 try {
 setIsRendering(true);
 setRenderProgress(10);
 setRenderStage('正在向扩散模型提交任务并扣除 5 积分...');
 const outfitItems: OutfitWearItem[] = wornItems.map((item) => ({
 garmentId: item.garment.id,
 appliedState: item.state,
 zIndex: item.zIndex,
 transformMatrix: {
 scaleX: item.scaleX ?? item.scale,
 scaleY: item.scaleY ?? item.scale,
 offsetX: item.offsetX,
 offsetY: item.offsetY,
 rotation: 0,
 },
 }));
 const res = await renderVtonOutfit(currentProfile.id, outfitItems, compositeCanvasBase64);
 if (user) {
 setUser({ ...user, dailyCredits: res.remainingDailyCredits });
 }

 // 启动 HTTP 定时轮询兜底与 20 秒安全看门狗 (防止 WebSocket 断连或丢包导致界面卡死)
 const pollTaskId = res.taskId;
 let isCompleted = false;
 const pollTimer = setInterval(async () => {
 if (isCompleted) {
 clearInterval(pollTimer);
 return;
 }
 try {
 const taskData = await fetchTaskStatus(pollTaskId);
 setRenderProgress(taskData.progressPercent || 0);
 setRenderStage(taskData.currentStage || '正在渲染...');
 if (taskData.status === 'SUCCESS' && taskData.resultUrl) {
 isCompleted = true;
 clearInterval(pollTimer);
 setRenderedImageUrl(taskData.resultUrl);
 setIsRendering(false);
 } else if (taskData.status === 'FAILED') {
 isCompleted = true;
 clearInterval(pollTimer);
 setIsRendering(false);
 showToast(`渲染失败: ${taskData.error || '算力超时'}`, "info");
 }
 } catch (e) {
 // 忽略单次网络轮询抖动
 }
 }, 1200);

 // 150 秒安全看门狗 (保障 AI 高清 Diffusion 充分计算时间)
 setTimeout(() => {
 if (!isCompleted) {
 isCompleted = true;
 clearInterval(pollTimer);
 setIsRendering(false);
 }
 }, 150000);
 } catch (err: any) {
 setIsRendering(false);
 alert(err.message || '发起试穿失败');
 }
 };

 // 灵感应用
 const handleApplySlotOutfit = (items: GarmentItem[], states: Record<string, GarmentState>) => {
 const worn: WornItemData[] = items.map((g) => ({
 garment: g,
 state: states[g.id] || 'DEFAULT',
 zIndex: g.primaryCategory === 'BOTTOMS' ? 20 : g.primaryCategory === 'OUTERWEAR' ? 40 : 10,
 offsetX: 0,
 offsetY: 0,
 scale: 1,
 }));
 setWornItems(worn);
 };

 const handleBindSlotToOotd = async (items: GarmentItem[], notes: string) => {
 if (!currentProfile) return;
 try {
 const newOutfit = await saveOutfit({
 profileId: currentProfile.id,
 title: notes || '灵感搭配',
 items: items.map((g) => ({
 garmentId: g.id,
 appliedState: 'DEFAULT',
 zIndex: 10,
 transformMatrix: { scaleX: 1, scaleY: 1, offsetX: 0, offsetY: 0, rotation: 0 },
 })),
 });
 const today = new Date().toISOString().split('T')[0];
 const entry = await logOotdEntry({
 profileId: currentProfile.id,
 outfitId: newOutfit.id,
 logDate: today,
 weatherTag: '灵感推荐',
 notes,
 });
 setOutfits([newOutfit, ...outfits]);
 setOotdLogs([entry, ...ootdLogs.filter((l) => l.logDate !== today)]);
 showToast(' 已将该套灵感搭配记录至今日 OOTD 穿搭日历！', "info");
 } catch (err: any) {
 alert(err.message || '绑定失败');
 }
 };

 // 推荐给好友
 const handleSuggestToFriend = () => {
 showToast('好友协同穿搭建议功能已就绪', "info");
 };

 // 采纳好友建议
 const handleAcceptSuggestion = async (suggestionId: string) => {
 try {
 const accepted = await acceptOutfitSuggestion(suggestionId);
 setOutfits([accepted, ...outfits]);
 showToast(' 已采纳好友搭配并存入您的 Lookbook 套装库！', "info");
 } catch (err: any) {
 alert(err.message || '采纳失败');
 }
 };

 // 重置积分
 const handleResetCredits = async () => {
 try {
 await resetCreditsAdmin();
 if (user) {
 setUser({ ...user, dailyCredits: 100 });
 }
 showToast(' 每日积分已补齐至 100 分！', "info");
 } catch (err: any) {
 alert(err.message || '重置失败');
 }
 };

 return (
 <div className="h-screen h-[100dvh] overflow-hidden flex flex-col font-sans bg-[#FAF8F5] text-stone-800 selection:bg-rose-200">
 
 {/* 认证初始化静默校验中（高质感品牌启动过渡，彻底消除登录界面 FOUC 闪烁） */}
 {isAuthInitializing && (
 <div className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#FAF8F5] transition-all duration-450 ease-[cubic-bezier(0.16,1,0.3,1)] ${isAuthFadingOut ? 'opacity-0 pointer-events-none scale-105 backdrop-blur-none' : 'opacity-100 pointer-events-auto'}`}>
 <div className="flex flex-col items-center gap-4 animate-in fade-in duration-300">
 <div className="w-14 h-14 rounded-2xl bg-stone-900 text-white flex items-center justify-center shadow-lg shadow-stone-900/10">
 <Shirt className="w-7 h-7 stroke-[1.75] animate-pulse text-[#FAF8F5]" />
 </div>
 <div className="flex flex-col items-center gap-1">
 <span className="text-xs font-extrabold text-stone-800 tracking-wider">
 SMARTWARDROBE
 </span>
 <span className="text-[10px] text-stone-400 font-mono tracking-widest uppercase">
 Haute Atelier · 数字化衣橱
 </span>
 </div>
 </div>
 </div>
 )}

 {/* 隐藏管理员登录专页 (URL hash: #/admin-portal 且未登录为 ADMIN 时呈现) */}
 {!isAuthInitializing && isAdminRoute && user?.role !== 'ADMIN' && (
 <AdminLoginView
 onAdminLoginSuccess={handleAdminLoginSuccess}
 onExitAdmin={handleExitAdmin}
 />
 )}

 {/* 常规前台未登录状态 */}
 {!isAuthInitializing && !user && !isAdminRoute && (
 <AuthView onLoginSuccess={handleLoginSuccess} />
 )}

 {/* 已登录状态：顶栏导航 */}
 {(!isAuthInitializing || isAuthFadingOut) && user && (!isAdminRoute || user.role === 'ADMIN') && (
 <Header
 user={user}
 profiles={profiles}
 currentProfile={currentProfile}
 activeView={activeView}
 onSelectView={setActiveView}
 onSelectProfile={handleSelectProfile}
 onOpenProfileModal={() => setIsAccountSettingsOpen(true)}
 onOpenAccountSettings={() => setIsAccountSettingsOpen(true)}
 onOpenTaskCenter={() => { setIsTaskCenterOpen(true); loadUserTasks(); }}
          runningTaskCount={runningTasks.length}
 onLogout={handleLogout}
 />
 )}

 {/* 已登录状态：核心视图路由呈现 */}
 {(!isAuthInitializing || isAuthFadingOut) && user && (
 <main className={`flex-1 min-h-0 overflow-hidden bg-[#FAF8F5] ${activeView !== 'STUDIO' ? 'pb-16 md:pb-0' : ''}`}>
 {activeView === 'WARDROBE' && (
 <WardrobeGalleryView
              key={`wardrobe_${user.id}_${currentProfile?.id || "none"}`}
 garments={garments}
 publicGarments={publicGarments}
 wornGarmentIds={wornItems.map((i) => i.garment.id)}
 onWearGarment={handleWearGarment}
 onClonePublicGarment={handleClonePublicGarment}
 onUploadGarmentWithFile={handleUploadGarmentWithFile}
 onUploadBatchWithFile={handleUploadBatchWithFile}
 onDeleteGarment={handleDeleteGarment}
 onNavigateToStudio={() => setActiveView('STUDIO')}
 />
 )}

 {activeView === 'STUDIO' && (
 <FittingStudioView
              key={`studio_${user.id}_${currentProfile?.id || "none"}`}
 profile={currentProfile}
 avatar={currentAvatar}
 wornItems={wornItems}
 allGarments={garments}
 publicGarments={publicGarments}
 dailyCredits={user.dailyCredits}
 onUpdateWornItem={handleUpdateWornItem}
 onWearGarment={handleWearGarment}
 onRemoveWornItem={handleRemoveWornItem}
 onClearCanvas={() => {
 setWornItems([]);
 setRenderedImageUrl(null);
 }}
 onSaveLookbook={handleSaveLookbook}
 onRenderVton={handleRenderVton}
 onSuggestToFriend={handleSuggestToFriend}
 onUploadCustomAvatar={handleUploadCustomAvatar}
 onUploadGarmentWithFile={handleUploadGarmentWithFile}
 onUploadBatchWithFile={handleUploadBatchWithFile}
 onBatchAddGarments={handleBatchAddGarments}
 onClonePublicGarment={handleClonePublicGarment}
 onApplySlotOutfit={handleApplySlotOutfit}
 onBindSlotToOotd={handleBindSlotToOotd}
 onDeleteGarment={handleDeleteGarment}
 onOpenProfileSettings={() => setIsAccountSettingsOpen(true)}
 isRendering={isRendering}
 renderProgress={renderProgress}
 renderStage={renderStage}
 renderedImageUrl={renderedImageUrl}
 />
 )}

 {activeView === 'OOTD' && (
 <OotdGalleryView
              key={`ootd_${user.id}_${currentProfile?.id || "none"}`}
 outfits={outfits}
 ootdLogs={ootdLogs}
 allGarments={garments}
 onApplyOutfit={(outfit) => {
 const worn: WornItemData[] = (outfit.items || []).map((item) => {
 const g = garments.find((gItem) => gItem.id === item.garmentId) || publicGarments.find((gItem) => gItem.id === item.garmentId);
 return {
 garment: g || {
 id: item.garmentId,
 isPublic: false,
 title: '搭配单品',
 primaryCategory: 'TOPS',
 subCategory: 'Tops',
 colors: ['#000000'],
 patterns: ['SOLID'],
 assets: [],
 },
 state: item.appliedState,
 zIndex: item.zIndex,
 offsetX: item.transformMatrix.offsetX,
 offsetY: item.transformMatrix.offsetY,
 scale: item.transformMatrix.scaleX,
 scaleX: item.transformMatrix.scaleX,
 scaleY: item.transformMatrix.scaleY,
 };
 });
 setWornItems(worn);
 setActiveView('STUDIO');
 }}
 onBindOotd={async (outfitId, date, weather, notes) => {
 if (!currentProfile) return;
 const entry = await logOotdEntry({
 profileId: currentProfile.id,
 outfitId,
 logDate: date,
 weatherTag: weather,
 notes,
 });
 setOotdLogs([entry, ...ootdLogs.filter((l) => l.logDate !== date)]);
 }}
 onNavigateToStudio={() => setActiveView('STUDIO')}
 />
 )}

 {activeView === 'FRIENDS' && (
 <FriendSocialView
              key={`friends_${user.id}_${currentProfile?.id || "none"}`}
 onDressFriend={handleDressFriend}
 onNavigateToStudio={() => setActiveView('STUDIO')}
 />
 )}

 {activeView === 'CMS' && user.role === 'ADMIN' && (
 <CmsAdminView
              key={`cms_${user.id}`}
 publicGarments={publicGarments}
 onRefreshPublicGarments={loadPublicGarments}
 onLogoutAdmin={handleExitAdmin}
 />
 )}
 </main>
 )}

 {/* ️ 账号设置悬浮弹窗 (6大模块: 身材三围/模特素体/密码安全/家庭多角色/积分钱包流水/隐私权限) */}
      <AccountSettingsModal
        isOpen={isAccountSettingsOpen}
        user={user}
        currentProfile={currentProfile}
        profiles={profiles}
        avatar={currentAvatar}
        onClose={() => setIsAccountSettingsOpen(false)}
        onSelectProfile={handleSelectProfile}
        onProfileUpdated={async (updated) => {
          setProfiles(profiles.map((p) => (p.id === updated.id ? updated : p)));
          if (currentProfile?.id === updated.id) {
            setCurrentProfile(updated);
            try {
              const av = await fetchProfileAvatar(updated.id);
              setCurrentAvatar(av);
            } catch (e) {
              console.warn('拉取新素体失败:', e);
            }
          }
        }}
        onAvatarUpdated={(newAv) => {
          setCurrentAvatar(newAv);
        }}
        onUserUpdated={(updatedUser) => {
          setUser(updatedUser);
        }}
      />

      {/* 账号独立任务中心抽屉 (Defect 20: 刷新防丢失与最近 5 条历史存档) */}
      <TaskCenterDrawer
        isOpen={isTaskCenterOpen}
        onClose={() => setIsTaskCenterOpen(false)}
        runningTasks={runningTasks}
        historyTasks={historyTasks}
        isLoading={isTasksLoading}
        onRefresh={loadUserTasks}
      />

      {/* 全局高质感 Toast 提示与确认模态框 */}
      <ToastContainer />
    </div>
  );
};
