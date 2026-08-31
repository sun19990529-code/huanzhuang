import React, { useState } from 'react';
import { UserData, ProfileData } from '../api';
import {
  Sparkles,
  RefreshCw,
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
  onResetCredits: () => void;
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
  onResetCredits,
  onLogout,
}) => {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [prevCredits, setPrevCredits] = useState<number | null>(null);
  const [creditDelta, setCreditDelta] = useState<number | null>(null);

  // 监听积分扣减变动并触发优雅浮动微动效
  React.useEffect(() => {
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

  // 普通用户展示前 3 个 Tab；ADMIN 角色额外展示 CMS
  const navTabs: { key: 'STUDIO' | 'OOTD' | 'FRIENDS' | 'CMS'; label: string; icon: React.ReactNode }[] = [
    { key: 'STUDIO', label: '试衣间', icon: <Shirt className="w-4 h-4 stroke-[1.75]" /> },
    { key: 'OOTD', label: '日历', icon: <Calendar className="w-4 h-4 stroke-[1.75]" /> },
    { key: 'FRIENDS', label: '好友', icon: <Users className="w-4 h-4 stroke-[1.75]" /> },
  ];

  if (user?.role === 'ADMIN') {
    navTabs.push({ key: 'CMS', label: '运营', icon: <ShieldCheck className="w-4 h-4 stroke-[1.75]" /> });
  }

  return (
    <header className="sticky top-0 z-40 bg-[#FAF8F5]/90 backdrop-blur-xl border-b border-[#EAE6DF] px-4 md:px-8 py-3 flex items-center justify-between gap-4">
      {/* 左侧：Logo */}
      <div
        onClick={() => onSelectView('STUDIO')}
        className="flex items-center gap-2.5 cursor-pointer select-none shrink-0"
      >
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#D63031] to-[#E17055] flex items-center justify-center text-white shadow-xs">
          <Heart className="w-4.5 h-4.5 fill-white stroke-[1.5]" />
        </div>
        <div className="text-left">
          <div className="flex items-center gap-1.5">
            <span className="font-extrabold text-base tracking-tight text-stone-800">
              SmartWardrobe
            </span>
          </div>
          <p className="text-[10px] text-stone-400 font-medium">
            数字化衣橱与试衣平台
          </p>
        </div>
      </div>

      {/* 中部：导航胶囊 */}
      <nav className="hidden md:flex items-center gap-1 bg-[#EFECE6] p-1 rounded-2xl border border-[#EAE6DF]/60">
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

      {/* 右侧：100 积分胶囊 + 多 Profile 角色切换 + 用户身份与设置 */}
      <div className="flex items-center gap-2.5">
        {/* 每日 100 积分胶囊 */}
        <div
          title="每日零点自动补齐至 100 积分"
          className="relative flex items-center gap-1.5 bg-amber-50/80 border border-amber-200/80 px-2.5 py-1 rounded-2xl shadow-xs"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-600 stroke-[1.75]" />
          <div className="text-left leading-tight">
            <div className="text-xs font-extrabold font-mono text-amber-900">
              {user?.dailyCredits ?? 100}{' '}
              <span className="text-[9px] text-amber-700 font-normal">/ 100分</span>
            </div>
          </div>
          <button
            onClick={onResetCredits}
            title="模拟补齐积分"
            className="p-1 rounded-lg hover:bg-amber-200/50 text-amber-700 transition-colors"
          >
            <RefreshCw className="w-3 h-3 stroke-[1.75]" />
          </button>

          {/* 积分变动动态浮层 (Defect 15) */}
          {creditDelta && (
            <span className="absolute -top-3.5 right-0 bg-[#D63031] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-md animate-bounce">
              -{creditDelta} 分
            </span>
          )}
        </div>

        {/* 多 Profile 角色切换 */}
        {currentProfile && (
          <div className="flex items-center gap-1 bg-[#EFECE6] p-1 rounded-2xl border border-[#EAE6DF]">
            <select
              value={currentProfile.id}
              onChange={(e) => {
                const found = profiles.find((p) => p.id === e.target.value);
                if (found) onSelectProfile(found);
              }}
              className="bg-transparent text-xs font-bold text-stone-700 px-1.5 py-0.5 focus:outline-none cursor-pointer"
            >
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* 当前登录用户身份胶囊与下拉菜单 */}
        {user && (
          <div className="relative">
            <div
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="flex items-center gap-2 pl-2 pr-1.5 py-1 bg-white hover:bg-stone-50 rounded-2xl border border-[#EAE6DF] cursor-pointer select-none transition-colors shadow-xs"
            >
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.nickname}
                  className="w-7 h-7 rounded-full object-cover border border-[#EAE6DF] shadow-xs"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-[#D63031] to-[#E17055] text-white font-bold text-xs flex items-center justify-center shadow-xs">
                  {user.nickname[0]}
                </div>
              )}
              <div className="hidden lg:block text-left text-xs font-bold text-stone-800 truncate max-w-[90px]">
                {user.nickname}
              </div>
              <ChevronDown className="w-3 h-3 text-stone-400 stroke-[1.75]" />
            </div>

            {/* 下拉悬浮菜单 */}
            {isUserMenuOpen && (
              <div className="absolute right-0 mt-2 w-40 bg-white rounded-2xl shadow-xl border border-[#EAE6DF] p-1.5 space-y-1 z-50 text-left animate-in fade-in">
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
  );
};
