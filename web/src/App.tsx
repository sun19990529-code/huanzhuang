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

export const App: React.FC = () => {
  // 路由与隐藏后台判断
  const [isAdminRoute, setIsAdminRoute] = useState(
    window.location.hash === '#/admin-portal' || window.location.hash === '#admin-portal'
  );

  // 用户与角色状态
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [currentProfile, setCurrentProfile] = useState<UserProfile | null>(null);
  const [currentAvatar, setCurrentAvatar] = useState<UserAvatar | null>(null);

  // 视图与弹窗
  const [activeView, setActiveView] = useState<'AUTH' | 'WARDROBE' | 'STUDIO' | 'OOTD' | 'FRIENDS' | 'CMS'>('STUDIO');
  const [isAccountSettingsOpen, setIsAccountSettingsOpen] = useState(false);
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
      setUser(currentUser);
      await loadUserData(currentUser);
      if (currentUser.role === 'ADMIN' && (window.location.hash === '#/admin-portal' || window.location.hash === '#admin-portal')) {
        setActiveView('CMS');
      }
    } catch (e) {
      console.log('未登录或凭证过期，展示登录注册页');
      setUser(null);
      loadPublicGarments();
    }
  };

  const loadUserData = async (currentUser: CurrentUser) => {
    try {
      const userProfiles = await fetchProfiles();
      setProfiles(userProfiles);
      const defaultProf = userProfiles.find((p) => p.isDefault) || userProfiles[0] || null;
      setCurrentProfile(defaultProf);

      if (defaultProf) {
        await loadProfileData(defaultProf);
      }
      await loadPublicGarments();
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
        if (data.taskType === 'VTON_RENDER') {
          setRenderProgress(data.progress || 0);
          setRenderStage(data.currentStage || '正在渲染...');
          if (data.status === 'SUCCESS' && data.resultUrl) {
            setRenderedImageUrl(data.resultUrl);
            setIsRendering(false);
          } else if (data.status === 'FAILED') {
            setIsRendering(false);
            alert(`渲染失败: ${data.error || '算力超时'}`);
          }
        }
      }
    });
    return () => disconnect();
  }, []);

  // 普通用户登录成功
  const handleLoginSuccess = async (loggedInUser: CurrentUser) => {
    setUser(loggedInUser);
    setWornItems([]);
    setRenderedImageUrl(null);
    setIsRendering(false);
    await loadUserData(loggedInUser);
    setActiveView('STUDIO');
  };

  // 管理员隐藏登录成功
  const handleAdminLoginSuccess = async (adminUser: CurrentUser) => {
    setUser(adminUser);
    setWornItems([]);
    setRenderedImageUrl(null);
    setIsRendering(false);
    await loadUserData(adminUser);
    setActiveView('CMS');
  };

  // 退出登录
  const handleLogout = () => {
    setAuthSession(null, null);
    setUser(null);
    setCurrentProfile(null);
    setCurrentAvatar(null);
    setGarments([]);
    setWornItems([]);
    setRenderedImageUrl(null);
    setIsRendering(false);
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

  // 穿脱衣物
  const handleWearGarment = (garment: GarmentItem) => {
    setWornItems((prev) => {
      const existingIndex = prev.findIndex((item) => item.garment.id === garment.id);
      if (existingIndex >= 0) {
        return prev.filter((_, i) => i !== existingIndex);
      }

      let defaultZIndex = 10;
      if (garment.primaryCategory === 'BOTTOMS') defaultZIndex = 20;
      if (garment.primaryCategory === 'OUTERWEAR') defaultZIndex = 40;
      if (garment.primaryCategory === 'FOOTWEAR') defaultZIndex = 50;
      if (garment.primaryCategory === 'ACCESSORIES') defaultZIndex = 60;

      const offsets = getCategoryDefaultOffsets(
        garment.primaryCategory,
        garment.subCategory,
        garment.title
      );

      const filtered = prev.filter((i) => i.garment.primaryCategory !== garment.primaryCategory);
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
      alert('请先选择角色档案');
      return;
    }
    try {
      const cloned = await clonePublicGarment(publicGarmentId, currentProfile.id);
      setGarments((prev) => [cloned, ...prev]);
      alert(`✨ 单品「${cloned.title}」已成功复制到您的专属衣橱！`);
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
      alert('单品已从您的衣橱删除');
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
      alert(`🎉 识别成功！已将 ${newGarments.length} 件单品切片入库！`);
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
    alert(`🎉 已成功将 ${newGarments.length} 件单品存入专属衣橱${shouldWear ? '并为模特穿上！' : '！'}`);
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
      alert('✨ A-Pose 模特素体已成功生成并装载！');
    } catch (err: any) {
      alert(err.message || '素体生成失败');
    }
  };

  // 保存搭配 (支持一键同步打卡至今日 OOTD 日历)
  const handleSaveLookbook = async (title: string, syncToOotdToday?: boolean) => {
    if (!currentProfile) return;
    try {
      const newOutfit = await saveOutfit({
        profileId: currentProfile.id,
        title: title || '我的专属搭配',
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
        alert('✨ 搭配已成功保存至 Lookbook，并同步打卡至今日 OOTD 日历！');
      } else {
        alert('✨ 搭配已成功保存至 Lookbook 套装库！');
      }
    } catch (err: any) {
      alert(err.message || '保存搭配失败');
    }
  };

  // 发起 AI VTON 高清渲染
  const handleRenderVton = async (compositeCanvasBase64?: string) => {
    if (!currentProfile) return;
    if (wornItems.length === 0) {
      alert('请先将衣服拖到模特身上搭配！');
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
            alert(`渲染失败: ${taskData.error || '算力超时'}`);
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
      alert('✨ 已将该套灵感搭配记录至今日 OOTD 穿搭日历！');
    } catch (err: any) {
      alert(err.message || '绑定失败');
    }
  };

  // 推荐给好友
  const handleSuggestToFriend = () => {
    alert('好友协同穿搭建议功能已就绪');
  };

  // 采纳好友建议
  const handleAcceptSuggestion = async (suggestionId: string) => {
    try {
      const accepted = await acceptOutfitSuggestion(suggestionId);
      setOutfits([accepted, ...outfits]);
      alert('🎉 已采纳好友搭配并存入您的 Lookbook 套装库！');
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
      alert('✨ 每日积分已补齐至 100 分！');
    } catch (err: any) {
      alert(err.message || '重置失败');
    }
  };

  return (
    <div className="h-screen overflow-hidden flex flex-col font-sans bg-[#FAF8F5] text-stone-800 selection:bg-rose-200">
      
      {/* 隐藏管理员登录专页 (URL hash: #/admin-portal 且未登录为 ADMIN 时呈现) */}
      {isAdminRoute && user?.role !== 'ADMIN' && (
        <AdminLoginView
          onAdminLoginSuccess={handleAdminLoginSuccess}
          onExitAdmin={handleExitAdmin}
        />
      )}

      {/* 常规前台未登录状态 */}
      {!user && !isAdminRoute && (
        <AuthView onLoginSuccess={handleLoginSuccess} />
      )}

      {/* 已登录状态：顶栏导航 */}
      {user && (!isAdminRoute || user.role === 'ADMIN') && (
        <Header
          user={user}
          profiles={profiles}
          currentProfile={currentProfile}
          activeView={activeView}
          onSelectView={setActiveView}
          onSelectProfile={handleSelectProfile}
          onOpenProfileModal={() => setIsAccountSettingsOpen(true)}
          onOpenAccountSettings={() => setIsAccountSettingsOpen(true)}
          onResetCredits={handleResetCredits}
          onLogout={handleLogout}
        />
      )}

      {/* 已登录状态：核心视图路由呈现 */}
      {user && (
        <main className="flex-1 min-h-0 overflow-hidden bg-[#FAF8F5]">
          {activeView === 'WARDROBE' && (
            <WardrobeGalleryView
              garments={garments}
              publicGarments={publicGarments}
              wornGarmentIds={wornItems.map((i) => i.garment.id)}
              onWearGarment={handleWearGarment}
              onClonePublicGarment={handleClonePublicGarment}
              onUploadGarmentWithFile={handleUploadGarmentWithFile}
              onUploadBatchWithFile={handleUploadBatchWithFile}
              onNavigateToStudio={() => setActiveView('STUDIO')}
            />
          )}

          {activeView === 'STUDIO' && (
            <FittingStudioView
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
              suggestions={suggestions}
              onAcceptSuggestion={handleAcceptSuggestion}
              onNavigateToStudio={() => setActiveView('STUDIO')}
            />
          )}

          {activeView === 'CMS' && user.role === 'ADMIN' && (
            <CmsAdminView
              publicGarments={publicGarments}
              onRefreshPublicGarments={loadPublicGarments}
              onLogoutAdmin={handleExitAdmin}
            />
          )}
        </main>
      )}

      {/* ⚙️ 账号设置悬浮弹窗 (6大模块: 身材三围/模特素体/密码安全/家庭多角色/积分钱包流水/隐私权限) */}
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
    </div>
  );
};
