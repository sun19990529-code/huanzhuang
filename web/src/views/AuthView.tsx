import React, { useState } from 'react';
import {
  User,
  Check,
  ArrowRight,
  ShieldCheck,
  KeyRound,
  Camera,
  Shirt,
  Sliders,
  Sparkles,
} from 'lucide-react';
import { calculateGoldenRatioBody } from '@smart-wardrobe/shared';
import { BrandLogo } from '../components/BrandLogo';
import { loginUser, registerUser, compressImageFile, CurrentUser } from '../api';

interface AuthViewProps {
  onLoginSuccess: (user: CurrentUser) => void;
}

export const AuthView: React.FC<AuthViewProps> = ({ onLoginSuccess }) => {
  const [mode, setMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');

  // 登录表单
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // 注册 3 步向导状态
  const [regStep, setRegStep] = useState<1 | 2 | 3>(1);
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regNickname, setRegNickname] = useState('');
  const [regGender, setRegGender] = useState<'FEMALE' | 'MALE'>('FEMALE');

  // 身材五维
  const [heightCm, setHeightCm] = useState(168);
  const [weightKg, setWeightKg] = useState(50);
  const [bustCm, setBustCm] = useState(84);
  const [waistCm, setWaistCm] = useState(62);
  const [hipsCm, setHipsCm] = useState(89);

  // 全身照上传
  const [avatarImageBase64, setAvatarImageBase64] = useState<string>('');
  const [avatarPreview, setAvatarPreview] = useState<string>('');

  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // 一键黄金比例
  const handleApplyGolden = () => {
    const golden = calculateGoldenRatioBody(regGender, heightCm);
    setWeightKg(golden.weightKg);
    setBustCm(golden.bustCm);
    setWaistCm(golden.waistCm);
    setHipsCm(golden.hipsCm);
  };

  // 处理照片选择
  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImageFile(file);
      setAvatarImageBase64(compressed);
      setAvatarPreview(compressed);
    } catch (err) {
      console.warn('图片读取失败', err);
    }
  };

  // 提交登录
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail.trim() || !loginPassword.trim()) {
      setErrorMsg('请填写登录邮箱与密码');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');
    try {
      const user = await loginUser(loginEmail.trim(), loginPassword.trim());
      onLoginSuccess(user);
    } catch (err: any) {
      setErrorMsg(err.message || '登录失败，请核对邮箱与密码');
    } finally {
      setIsLoading(false);
    }
  };

  // 完成注册 (执行注册 API)
  const handleFinalRegister = async (skipPhoto = false) => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const result = await registerUser({
        email: regEmail.trim(),
        password: regPassword.trim(),
        nickname: regNickname.trim() || '用户',
        gender: regGender,
        heightCm,
        weightKg,
        bustCm,
        waistCm,
        hipsCm,
        isCustomBodyParams: true,
        avatarImageUrl: skipPhoto ? undefined : avatarImageBase64 || undefined,
      });
      onLoginSuccess(result.user);
    } catch (err: any) {
      setErrorMsg(err.message || '注册失败，请稍后重试');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4 selection:bg-[#D63031]/20">
      <div className="w-full max-w-3xl bg-white/95 backdrop-blur-2xl border border-[#EAE6DF] rounded-[36px] shadow-2xl p-8 md:p-12 flex flex-col md:flex-row items-center gap-10">
        
        {/* 左侧：专属品牌 Logo 与极简定位 */}
        <div className="w-full md:w-5/12 flex flex-col items-center md:items-start text-center md:text-left space-y-4">
          <BrandLogo variant="stacked" size="lg" />
          <div className="pt-2 border-t border-[#EAE6DF] w-full">
            <p className="text-xs text-stone-500 font-medium leading-relaxed">
              数字化高定衣橱 · 多模态试穿工坊
            </p>
          </div>
        </div>

        {/* 右侧：极简登录 / 注册表单 */}
        <div className="w-full md:w-7/12 bg-[#FAF8F5]/80 p-6 md:p-8 rounded-[28px] border border-[#EAE6DF] shadow-sm text-left space-y-5">
          
          {/* Tab 切换 */}
          <div className="flex items-center bg-stone-200/60 p-1 rounded-2xl">
            <button
              type="button"
              onClick={() => {
                setMode('LOGIN');
                setErrorMsg('');
              }}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                mode === 'LOGIN' ? 'bg-[#D63031] text-white shadow-xs font-extrabold' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              账号登录
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('REGISTER');
                setRegStep(1);
                setErrorMsg('');
              }}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                mode === 'REGISTER' ? 'bg-[#D63031] text-white shadow-xs font-extrabold' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              用户注册
            </button>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-[#D63031] text-xs font-bold animate-in fade-in">
              {errorMsg}
            </div>
          )}

          {/* 模式 1: 账号登录 (极简、无预设、无废话) */}
          {mode === 'LOGIN' && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-700 block">邮箱地址</label>
                <input
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full bg-white border border-[#EAE6DF] focus:border-[#D63031] rounded-2xl px-4 py-2.5 text-base sm:text-xs text-stone-900 focus:outline-none transition-colors"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-700 block">登录密码</label>
                <input
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="请输入登录密码"
                  className="w-full bg-white border border-[#EAE6DF] focus:border-[#D63031] rounded-2xl px-4 py-2.5 text-base sm:text-xs text-stone-900 focus:outline-none transition-colors"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 bg-[#D63031] hover:bg-[#c0392b] text-white text-xs font-extrabold rounded-2xl shadow-md transition-all disabled:opacity-50 active:scale-[0.98] cursor-pointer"
              >
                {isLoading ? '正在验证...' : '立即登录'}
              </button>
            </form>
          )}

          {/* 模式 2: 三步式向导注册 */}
          {mode === 'REGISTER' && (
            <div className="space-y-4">
              
              {/* 步骤条 */}
              <div className="flex items-center justify-between px-2 text-[10px] font-bold text-stone-400">
                <span className={regStep >= 1 ? 'text-[#D63031]' : ''}>1. 账号信息</span>
                <span>→</span>
                <span className={regStep >= 2 ? 'text-[#D63031]' : ''}>2. 身材三围</span>
                <span>→</span>
                <span className={regStep >= 3 ? 'text-[#D63031]' : ''}>3. 模特素体</span>
              </div>

              {/* STEP 1: 账号与密码 */}
              {regStep === 1 && (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-stone-700 block">注册邮箱</label>
                    <input
                      type="email"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="name@example.com"
                      className="w-full bg-white border border-[#EAE6DF] focus:border-[#D63031] rounded-2xl px-3.5 py-2 text-base sm:text-xs text-stone-800 focus:outline-none"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-stone-700 block">登录密码</label>
                    <input
                      type="password"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="不少于 6 位密码"
                      className="w-full bg-white border border-[#EAE6DF] focus:border-[#D63031] rounded-2xl px-3.5 py-2 text-base sm:text-xs text-stone-800 focus:outline-none"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-stone-700 block">昵称</label>
                      <input
                        type="text"
                        value={regNickname}
                        onChange={(e) => setRegNickname(e.target.value)}
                        placeholder="如: 用户昵称"
                        className="w-full bg-white border border-[#EAE6DF] focus:border-[#D63031] rounded-2xl px-3.5 py-2 text-base sm:text-xs text-stone-800 focus:outline-none"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-stone-700 block">性别</label>
                      <select
                        value={regGender}
                        onChange={(e) => setRegGender(e.target.value as any)}
                        className="w-full bg-white border border-[#EAE6DF] focus:border-[#D63031] rounded-2xl px-3 py-2 text-base sm:text-xs text-stone-800 focus:outline-none"
                      >
                        <option value="FEMALE">女性</option>
                        <option value="MALE">男性</option>
                      </select>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (!regEmail.trim() || !regPassword.trim()) {
                        setErrorMsg('请填写注册邮箱与密码');
                        return;
                      }
                      if (regPassword.length < 6) {
                        setErrorMsg('密码长度不能少于 6 位');
                        return;
                      }
                      setErrorMsg('');
                      setRegStep(2);
                    }}
                    className="w-full py-2.5 bg-[#D63031] hover:bg-[#c0392b] text-white text-xs font-bold rounded-2xl shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>下一步：录入身材参数</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* STEP 2: 身材五维录入 */}
              {regStep === 2 && (
                <div className="space-y-3">
                  <div className="p-3.5 bg-white rounded-2xl border border-[#EAE6DF] space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-stone-800">五维身材初始参数</span>
                      <button
                        type="button"
                        onClick={handleApplyGolden}
                        className="text-[10px] font-bold text-[#D63031] bg-rose-50 px-2.5 py-1 rounded-xl border border-rose-200 hover:bg-rose-100 flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <Sparkles className="w-3 h-3 text-[#D63031]" />
                        <span>一键黄金比例</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-[11px]">
                      <div>
                        <label className="text-stone-400 block text-[10px]">身高(cm)</label>
                        <input
                          type="number"
                          value={heightCm}
                          onChange={(e) => setHeightCm(Number(e.target.value))}
                          className="w-full bg-[#FAF8F5] border border-[#EAE6DF] rounded-xl p-1.5 text-center font-bold text-stone-800 text-base sm:text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-stone-400 block text-[10px]">体重(kg)</label>
                        <input
                          type="number"
                          value={weightKg}
                          onChange={(e) => setWeightKg(Number(e.target.value))}
                          className="w-full bg-[#FAF8F5] border border-[#EAE6DF] rounded-xl p-1.5 text-center font-bold text-stone-800 text-base sm:text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-stone-400 block text-[10px]">胸围(cm)</label>
                        <input
                          type="number"
                          value={bustCm}
                          onChange={(e) => setBustCm(Number(e.target.value))}
                          className="w-full bg-[#FAF8F5] border border-[#EAE6DF] rounded-xl p-1.5 text-center font-bold text-stone-800 text-base sm:text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-stone-400 block text-[10px]">腰围(cm)</label>
                        <input
                          type="number"
                          value={waistCm}
                          onChange={(e) => setWaistCm(Number(e.target.value))}
                          className="w-full bg-[#FAF8F5] border border-[#EAE6DF] rounded-xl p-1.5 text-center font-bold text-stone-800 text-base sm:text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-stone-400 block text-[10px]">臀围(cm)</label>
                        <input
                          type="number"
                          value={hipsCm}
                          onChange={(e) => setHipsCm(Number(e.target.value))}
                          className="w-full bg-[#FAF8F5] border border-[#EAE6DF] rounded-xl p-1.5 text-center font-bold text-stone-800 text-base sm:text-xs"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setRegStep(1)}
                      className="w-1/3 py-2 bg-white hover:bg-stone-100 border border-[#EAE6DF] text-stone-600 text-xs font-bold rounded-2xl cursor-pointer"
                    >
                      上一步
                    </button>
                    <button
                      type="button"
                      onClick={() => setRegStep(3)}
                      className="w-2/3 py-2 bg-[#D63031] hover:bg-[#c0392b] text-white text-xs font-bold rounded-2xl shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <span>下一步：模特素体</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3: 人像素图生成 (可选上传或跳过) */}
              {regStep === 3 && (
                <div className="space-y-3.5">
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-stone-800">模特素体生成 (选填)</h4>
                    <p className="text-[10px] text-stone-400">
                      可上传全身照重构面部素体，亦可直接使用五维身材参数生成默认模特。
                    </p>
                  </div>

                  {avatarPreview ? (
                    <div className="p-3 bg-white rounded-2xl border border-[#EAE6DF] flex items-center gap-3">
                      <img
                        src={avatarPreview}
                        alt="照片预览"
                        className="w-12 h-16 object-cover rounded-xl border border-stone-300"
                      />
                      <div className="text-left flex-1">
                        <span className="text-xs font-bold text-stone-700 block">已就绪照片</span>
                        <span className="text-[10px] text-stone-400">注册后自动重构专属模特</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setAvatarImageBase64('');
                          setAvatarPreview('');
                        }}
                        className="text-xs text-[#D63031] hover:underline cursor-pointer"
                      >
                        移除
                      </button>
                    </div>
                  ) : (
                    <label className="block p-4 border-2 border-dashed border-[#EAE6DF] hover:border-stone-400 rounded-2xl text-center cursor-pointer transition-colors bg-white">
                      <Camera className="w-5 h-5 text-stone-400 mx-auto mb-1" />
                      <span className="text-xs font-bold text-stone-700 block">点击上传全身照片 (可选)</span>
                      <span className="text-[10px] text-stone-400 block">支持 JPG / PNG 格式</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handlePhotoSelect}
                      />
                    </label>
                  )}

                  <div className="space-y-2 pt-1">
                    <button
                      type="button"
                      disabled={isLoading}
                      onClick={() => handleFinalRegister(false)}
                      className="w-full py-2.5 bg-[#D63031] hover:bg-[#c0392b] text-white text-xs font-extrabold rounded-2xl shadow-md transition-all disabled:opacity-50 cursor-pointer"
                    >
                      {isLoading ? '正在完成注册...' : '完成注册'}
                    </button>

                    <button
                      type="button"
                      disabled={isLoading}
                      onClick={() => handleFinalRegister(true)}
                      className="w-full py-2 bg-white hover:bg-stone-100 border border-[#EAE6DF] text-stone-600 text-xs font-bold rounded-2xl transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      {isLoading ? '正在完成注册...' : '跳过照片，直接生成默认模特'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
