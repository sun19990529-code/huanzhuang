import React, { useState, useEffect, useRef } from 'react';
import { UserData, ProfileData } from '../api';
import { BrandLogo } from './BrandLogo';
import {
  Sparkles,
  RefreshCw,
  Clock,
  User,
  Heart,
  Plus,
  Layers,
  Shirt,
  Calendar,
  Users,
  ShieldCheck,
  ShoppingBag,
  Settings,
  LogOut,
  ChevronDown,
} from 'lucide-react';

interface HeaderProps {
  user: UserData | null;
  profiles: ProfileData[];
  currentProfile: ProfileData | null;
  activeView: 'AUTH' | 'WARDROBE' | 'STUDIO' | 'OOTD' | 'FRIENDS' | 'CMS';
  onSelectView: (view: 'AUTH' | 'WARDROBE' | 'STUDIO' | 'OOTD' | 'FRIENDS' | 'CMS') => void;
  onSelectProfile: (profile: ProfileData) => void;
  onOpenProfileModal: () => void;
  onOpenAccountSettings: () => void;
  onOpenTaskCenter?: () => void;
  runningTaskCount?: number;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  profiles,
  currentProfile,
  activeView,
  onSelectView,
  onSelectProfile,
  onOpenProfileModal,
  onOpenAccountSettings,
  onOpenTaskCenter,
  runningTaskCount = 0,
  onLogout,
}) => {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [prevCredits, setPrevCredits] = useState<number | null>(null);
  const [creditDelta, setCreditDelta] = useState<number | null>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // 点击外部自动收起个人菜单 (Defect 13)
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 监听积分扣减变动并触发优雅浮动微动效
  useEffect(() => {
    if (user?.dailyCredits !== undefined) {
      if (prevCredits !== null && user.dailyCredits < prevCredits) {
        const delta = prevCredits - user.dailyCredits;
        setCreditDelta(delta);
        const timer = setTimeout(() => setCreditDelta(null), 2500);
        return () => clearTimeout(timer);
      }
      setPrevCredits(user.dailyCredits);
    }
  }, [user?.dailyCredits]);

  // 全局导航 Tab 清单 (Defect 1: 补齐【我的衣橱】全局一级入口)
  const navTabs: { key: 'STUDIO' | 'WARDROBE' | 'OOTD' | 'FRIENDS' | 'CMS'; label: string; icon: React.ReactNode }[] = [
    { key: 'STUDIO', label: '试衣间', icon: <Shirt className="w-4 h-4 stroke-[1.75]" /> },
    { key: 'WARDROBE', label: '我的衣橱', icon: <Layers className="w-4 h-4 stroke-[1.75]" /> },
    { key: 'OOTD', label: '穿搭日历', icon: <Calendar className="w-4 h-4 stroke-[1.75]" /> },
    { key: 'FRIENDS', label: '好友协同', icon: <Users className="w-4 h-4 stroke-[1.75]" /> },
  ];

  if (user?.role === 'ADMIN') {
    navTabs.push({ key: 'CMS', label: '运营管理', icon: <ShieldCheck className="w-4 h-4 stroke-[1.75]" /> });
  }

  return (
    <>
      <header className="sticky top-0 z-40 bg-[#FAF8F5]/90 backdrop-blur-xl border-b border-[#EAE6DF] px-2 sm:px-4 md:px-8 py-2 md:py-3 flex items-center justify-between gap-1.5 sm:gap-2 md:gap-4">
        {/* 左侧：全新定制高定矢量 Logo + 角色形象选择器 (移至左侧) */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0 z-10">
          <BrandLogo
            variant="horizontal"
            size="md"
            onClick={() => onSelectView('STUDIO')}
          />

          {currentProfile && (
            <div
              className="flex items-center gap-1 sm:gap-1.5 bg-[#EFECE6] px-2 py-1 sm:px-2.5 sm:py-1 rounded-xl sm:rounded-2xl border border-[#EAE6DF] hover:border-stone-400 transition-colors shadow-2xs shrink-0"
              title="切换模特角色形象"
            >
              <User className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-stone-500 stroke-[2] shrink-0" />
              <select
                value={currentProfile.id}
                onChange={(e) => {
                  if (e.target.value === '__NEW_PROFILE__') {
                    onOpenProfileModal();
                    return;
                  }
                  const found = profiles.find((p) => p.id === e.target.value);
                  if (found) onSelectProfile(found);
                }}
                className="bg-transparent text-[11px] sm:text-xs font-bold text-stone-800 pr-0.5 focus:outline-none cursor-pointer max-w-[65px] xs:max-w-[85px] sm:max-w-none truncate"
              >
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
                <option value="__NEW_PROFILE__">➕ 新建模特形象...</option>
              </select>
            </div>
          )}
        </div>

        {/* 中部：桌面端导航胶囊 (绝对居中，视口数学中心) */}
        <nav className="hidden md:flex absolute left-1/2 -translate-x-1/2 items-center gap-1 bg-[#EFECE6] p-1 rounded-2xl border border-[#EAE6DF]/60 shadow-xs pointer-events-auto z-10">
          {navTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => onSelectView(tab.key)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeView === tab.key
                  ? 'bg-white text-[#D63031] shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>

        {/* 右侧：100 积分胶囊 + 任务中心 + 用户身份与设置 */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0 z-10">
          {/* 每日 100 积分胶囊 */}
          <div
            title="每日零点自动补齐至 100 积分"
            className="relative flex items-center gap-1 bg-gradient-to-r from-amber-50/90 via-amber-100/60 to-amber-50/90 border border-amber-300/80 px-1.5 sm:px-3 py-1 sm:py-1.5 rounded-xl sm:rounded-2xl shadow-xs hover:border-amber-400 transition-all group shrink-0"
          >
            {/* 香槟金呼吸微光光环 */}
            <span className="absolute inset-0 rounded-xl sm:rounded-2xl bg-amber-400/10 animate-pulse pointer-events-none" />
            
            <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-700 stroke-[2] group-hover:rotate-12 transition-transform shrink-0" />
            <div className="text-left leading-tight">
              <div className="text-[11px] sm:text-xs font-black font-mono text-amber-950 flex items-center gap-0.5 sm:gap-1 whitespace-nowrap">
                <span>{user?.dailyCredits ?? 100}</span>
                <span className="text-[9px] text-amber-800 font-semibold hidden sm:inline">/ 100分</span>
              </div>
            </div>

            {/* 积分变动动态浮层 */}
            {creditDelta && (
              <span className="absolute -top-3.5 right-0 bg-[#D63031] text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-md animate-bounce">
                -{creditDelta} 分
              </span>
            )}
          </div>

          {/* 任务中心入口 (实时进行中任务呼吸红点/数字徽标) */}
          <button
            onClick={onOpenTaskCenter}
            title="任务中心 (查看正在运行的任务与历史成片)"
            className={`relative flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-2xl border transition-all shadow-xs shrink-0 ${
              runningTaskCount > 0
                ? 'bg-rose-50 border-rose-300 text-[#D63031] hover:bg-rose-100/80'
                : 'bg-[#EFECE6]/80 hover:bg-[#EAE6DF] border-[#EAE6DF] text-stone-700'
            }`}
          >
            <Clock className={`w-3.5 h-3.5 stroke-[2] ${runningTaskCount > 0 ? 'animate-spin text-[#D63031]' : 'text-stone-600'}`} />
            <span className="text-xs font-bold hidden sm:inline whitespace-nowrap">任务中心</span>
            {runningTaskCount > 0 && (
              <span className="flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-[#D63031] text-white text-[10px] font-black animate-pulse shadow-xs">
                {runningTaskCount}
              </span>
            )}
          </button>

          {/* 当前登录用户身份胶囊与下拉菜单 */}
          {user && (
            <div ref={userMenuRef} className="relative shrink-0 mr-1 sm:mr-0">
              <div
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-1 sm:gap-2 p-1 sm:pl-2 sm:pr-1.5 sm:py-1 bg-white hover:bg-stone-50 rounded-2xl border border-[#EAE6DF] cursor-pointer select-none transition-colors shadow-xs shrink-0"
              >
                {user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.nickname}
                    className="w-7 h-7 rounded-full object-cover border border-[#EAE6DF] shadow-xs shrink-0"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-[#D63031] to-[#E17055] text-white font-bold text-xs flex items-center justify-center shadow-xs shrink-0">
                    {user.nickname[0]}
                  </div>
                )}
                <div className="hidden lg:block text-left text-xs font-bold text-stone-800 truncate max-w-[90px]">
                  {user.nickname}
                </div>
                <ChevronDown className="w-3 h-3 text-stone-400 stroke-[1.75] shrink-0" />
              </div>

              {/* 下拉悬浮菜单 (带 Click-Outside 自动关闭) */}
              {isUserMenuOpen && (
                <div className="absolute right-0 mt-2 w-44 bg-white rounded-2xl shadow-xl border border-[#EAE6DF] p-1.5 space-y-1 z-50 text-left animate-in fade-in">
                  <button
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      onOpenProfileModal();
                    }}
                    className="w-full px-3 py-2 text-xs font-bold text-stone-700 hover:text-[#D63031] hover:bg-rose-50/50 rounded-xl flex items-center gap-2 transition-colors"
                  >
                    <User className="w-3.5 h-3.5 stroke-[1.75]" />
                    <span>模特身材管理</span>
                  </button>

                  <button
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      onOpenAccountSettings();
                    }}
                    className="w-full px-3 py-2 text-xs font-bold text-stone-700 hover:text-[#D63031] hover:bg-rose-50/50 rounded-xl flex items-center gap-2 transition-colors"
                  >
                    <Settings className="w-3.5 h-3.5 stroke-[1.75]" />
                    <span>账号设置</span>
                  </button>

                  <div className="border-t border-[#EAE6DF]/60 my-1" />

                  <button
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      onLogout();
                    }}
                    className="w-full px-3 py-2 text-xs font-bold text-stone-600 hover:text-[#D63031] hover:bg-stone-50 rounded-xl flex items-center gap-2 transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5 stroke-[1.75]" />
                    <span>退出登录</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      {/* 移动端底部悬浮导航栏 (层级z-[60]绝对置顶，高奢反向漫反射微阴影确立物理边界) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-[60] bg-[#FAF8F5]/98 backdrop-blur-md border-t border-stone-200/90 shadow-[0_-4px_24px_rgba(0,0,0,0.08)] px-2 pt-1.5 pb-[max(env(safe-area-inset-bottom),0.5rem)] flex items-center justify-around">
        {navTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => onSelectView(tab.key)}
            className={`flex flex-col items-center gap-0.5 px-2.5 py-1 rounded-xl text-[10px] font-bold transition-all ${
              activeView === tab.key
                ? 'text-[#D63031]'
                : 'text-stone-500 hover:text-stone-800'
            }`}
          >
            <div className={`p-1 rounded-lg ${activeView === tab.key ? 'bg-rose-100/60' : ''}`}>
              {tab.icon}
            </div>
            <span>{tab.label}</span>
          </button>
        ))}
      </nav>
    </>
  );
};
