import React, { useState } from 'react';
import { ShieldCheck, Lock, User, ArrowRight, Sparkles, KeyRound } from 'lucide-react';
import { adminLogin, CurrentUser } from '../api';

interface AdminLoginViewProps {
  onAdminLoginSuccess: (user: CurrentUser) => void;
  onExitAdmin: () => void;
}

export const AdminLoginView: React.FC<AdminLoginViewProps> = ({ onAdminLoginSuccess, onExitAdmin }) => {
  const [username, setUsername] = useState('suncraft');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setErrorMsg('请填写管理员账号与安全口令');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');
    try {
      const user = await adminLogin(username.trim(), password.trim());
      onAdminLoginSuccess(user);
    } catch (err: any) {
      setErrorMsg(err.message || '管理员身份验证失败');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-950 via-stone-900 to-black text-stone-100 flex items-center justify-center p-4 selection:bg-rose-500 selection:text-white">
      <div className="w-full max-w-md bg-stone-900/90 backdrop-blur-2xl border border-stone-800 rounded-3xl p-8 shadow-2xl space-y-6 text-left relative overflow-hidden">
        
        {/* 顶部安全光晕 */}
        <div className="absolute -top-16 -right-16 w-32 h-32 bg-rose-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="space-y-2 text-center">
          <div className="w-14 h-14 rounded-2xl bg-stone-800 border border-stone-700 text-rose-400 flex items-center justify-center mx-auto shadow-inner">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-stone-800 border border-stone-700/80 text-amber-300 text-[11px] font-bold">
            <Lock className="w-3 h-3" />
            官方 CMS 运营特权通道
          </div>
          <h2 className="text-xl font-black text-white tracking-wide">
            SmartWardrobe 管理员认证
          </h2>
          <p className="text-xs text-stone-400">
            该入口仅限系统运维与公共库运营人员使用，严禁外传
          </p>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-300 text-xs font-bold animate-in fade-in">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-stone-300 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-stone-400" />
              <span>管理员账号</span>
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="请输入管理员账号 (如: suncraft)"
              className="w-full bg-stone-950 border border-stone-800 focus:border-rose-500 rounded-xl px-3.5 py-2.5 text-xs text-stone-100 placeholder-stone-600 focus:outline-none transition-colors"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-stone-300 flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-stone-400" />
              <span>安全口令 (密文存储)</span>
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-stone-950 border border-stone-800 focus:border-rose-500 rounded-xl px-3.5 py-2.5 text-xs text-stone-100 placeholder-stone-600 focus:outline-none transition-colors"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white text-xs font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98]"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>{isLoading ? '安全校验中...' : '验证管理员权限进入 CMS'}</span>
          </button>
        </form>

        <div className="pt-2 text-center">
          <button
            type="button"
            onClick={onExitAdmin}
            className="text-xs text-stone-500 hover:text-stone-300 transition-colors"
          >
            ← 返回普通前台用户入口
          </button>
        </div>
      </div>
    </div>
  );
};
