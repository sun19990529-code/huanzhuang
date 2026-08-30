import React, { useState } from 'react';
import {
  Sparkles,
  Heart,
  User,
  Check,
  ArrowRight,
  ShieldCheck,
  Wand2,
  KeyRound,
  UserCheck,
  Camera,
  Shirt,
  Sliders,
} from 'lucide-react';
import { calculateGoldenRatioBody } from '@smart-wardrobe/shared';
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
      setErrorMsg(err.message || '登录失败，请检查账号密码');
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
        nickname: regNickname.trim() || '时尚达人',
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
      setErrorMsg(err.message || '注册失败');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4 selection:bg-rose-200">
      <div className="w-full max-w-4xl bg-white/90 backdrop-blur-2xl border border-[#EAE6DF]/90 rounded-[36px] shadow-lg p-8 md:p-12 flex flex-col md:flex-row items-center gap-10">
        
        {/* 左侧：品牌与特性 */}
        <div className="w-full md:w-1/2 space-y-6 text-left">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-rose-50 border border-rose-200 text-rose-600 text-xs font-bold shadow-xs">
            <Heart className="w-3.5 h-3.5 fill-rose-500 text-[#D63031]" />
            SmartWardrobe · 数字化衣橱与虚拟试衣间
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-stone-800 leading-tight">
              把你的个人衣橱，<br />
              <span className="text-[#D63031]">
                装进随身试衣间
              </span>
            </h1>
            <p className="text-stone-500 text-xs leading-relaxed">
              随时随地管理私有衣物 · 自由情绪板大画布 · 多模态解剖贴合 · AI 高清商业大片
            </p>
          </div>

          <div className="space-y-2.5 pt-2">
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-[#FAF8F5] border border-[#EAE6DF]">
              <div className="w-8 h-8 rounded-xl bg-white text-[#D63031] flex items-center justify-center shadow-xs">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="text-left">
                <h4 className="text-xs font-bold text-stone-800">自由大画布与智能吸附</h4>
                <p className="text-[10px] text-stone-400">单品拖离身为对比情绪板，拖近人体智能微光穿搭</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-2xl bg-[#FAF8F5] border border-[#EAE6DF]">
              <div className="w-8 h-8 rounded-xl bg-white text-[#D63031] flex items-center justify-center shadow-xs">
                <UserCheck className="w-4 h-4" />
              </div>
              <div className="text-left">
                <h4 className="text-xs font-bold text-stone-800">身材五维与标准素体重构</h4>
                <p className="text-[10px] text-stone-400">根据身材参数定制专属模特，支持全身照 A-Pose 重构</p>
              </div>
            </div>
          </div>
        </div>

        {/* 右侧：登录 / 注册向导 */}
        <div className="w-full md:w-1/2 bg-white p-6 md:p-8 rounded-[32px] border border-rose-100/80 shadow-md text-left space-y-5">
          
          {/* Tab 切换 */}
          <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-2xl">
            <button
              onClick={() => {
                setMode('LOGIN');
                setErrorMsg('');
              }}
              className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all ${
                mode === 'LOGIN' ? 'bg-[#D63031] text-white shadow-xs' : 'text-stone-600'
              }`}
            >
              账号登录
            </button>
            <button
              onClick={() => {
                setMode('REGISTER');
                setRegStep(1);
                setErrorMsg('');
              }}
              className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all ${
                mode === 'REGISTER' ? 'bg-[#D63031] text-white shadow-xs' : 'text-stone-600'
              }`}
            >
              新用户注册
            </button>
          </div>

          {errorMsg && (
            <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-xs font-bold animate-in fade-in">
              {errorMsg}
            </div>
          )}

          {/* 模式 1: 登录 */}
          {mode === 'LOGIN' && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">登录邮箱</label>
                <input
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full bg-[#FAF8F5] border border-[#EAE6DF] rounded-2xl px-3.5 py-2 text-xs text-stone-800 focus:outline-none focus:border-rose-400"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">登录密码</label>
                <input
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#FAF8F5] border border-[#EAE6DF] rounded-2xl px-3.5 py-2 text-xs text-stone-800 focus:outline-none focus:border-rose-400"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 bg-gradient-to-r from-rose-400 to-pink-400 hover:from-rose-500 hover:to-pink-500 text-white text-xs font-bold rounded-2xl shadow-md transition-all disabled:opacity-50 active:scale-98"
              >
                {isLoading ? '登录中...' : '立即登录进入衣橱'}
              </button>
            </form>
          )}

          {/* 模式 2: 三步式向导注册 */}
          {mode === 'REGISTER' && (
            <div className="space-y-4">
              
              {/* 步骤条 */}
              <div className="flex items-center justify-between px-2 text-[10px] font-bold text-stone-400">
                <span className={regStep >= 1 ? 'text-rose-600' : ''}>1. 账号密码</span>
                <span>→</span>
                <span className={regStep >= 2 ? 'text-rose-600' : ''}>2. 身材三围</span>
                <span>→</span>
                <span className={regStep >= 3 ? 'text-rose-600' : ''}>3. 人像素体</span>
              </div>

              {/* STEP 1: 账号与密码 */}
              {regStep === 1 && (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-bold text-stone-700 block mb-1">注册邮箱</label>
                    <input
                      type="email"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="name@example.com"
                      className="w-full bg-[#FAF8F5] border border-[#EAE6DF] rounded-2xl px-3 py-1.5 text-xs text-stone-800"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-stone-700 block mb-1">设置登录密码</label>
                    <input
                      type="password"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="不少于 6 位密码"
                      className="w-full bg-[#FAF8F5] border border-[#EAE6DF] rounded-2xl px-3 py-1.5 text-xs text-stone-800"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs font-bold text-stone-700 block mb-1">个性昵称</label>
                      <input
                        type="text"
                        value={regNickname}
                        onChange={(e) => setRegNickname(e.target.value)}
                        placeholder="如: 法式穿搭达人"
                        className="w-full bg-[#FAF8F5] border border-[#EAE6DF] rounded-2xl px-3 py-1.5 text-xs text-stone-800"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-stone-700 block mb-1">性别</label>
                      <select
                        value={regGender}
                        onChange={(e) => setRegGender(e.target.value as any)}
                        className="w-full bg-[#FAF8F5] border border-[#EAE6DF] rounded-2xl px-3 py-1.5 text-xs text-stone-800"
                      >
                        <option value="FEMALE">女性 (Female)</option>
                        <option value="MALE">男性 (Male)</option>
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
                    className="w-full py-2.5 bg-[#D63031] hover:bg-rose-600 text-white text-xs font-bold rounded-2xl shadow-md transition-all flex items-center justify-center gap-1.5"
                  >
                    <span>下一步：录入身材参数</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* STEP 2: 身材五维录入 */}
              {regStep === 2 && (
                <div className="space-y-3">
                  <div className="p-3 bg-rose-50/60 rounded-2xl border border-rose-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-rose-700">五维身材初始参数</span>
                      <button
                        type="button"
                        onClick={handleApplyGolden}
                        className="text-[10px] font-bold text-[#D63031] bg-white px-2 py-0.5 rounded-full border border-rose-200 hover:bg-rose-50 flex items-center gap-1"
                      >
                        <Wand2 className="w-3 h-3" /> 一键黄金比例
                      </button>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-[11px]">
                      <div>
                        <label className="text-stone-500 block">身高(cm)</label>
                        <input
                          type="number"
                          value={heightCm}
                          onChange={(e) => setHeightCm(Number(e.target.value))}
                          className="w-full bg-white border border-[#EAE6DF] rounded-lg p-1 text-center font-bold"
                        />
                      </div>
                      <div>
                        <label className="text-stone-500 block">体重(kg)</label>
                        <input
                          type="number"
                          value={weightKg}
                          onChange={(e) => setWeightKg(Number(e.target.value))}
                          className="w-full bg-white border border-[#EAE6DF] rounded-lg p-1 text-center font-bold"
                        />
                      </div>
                      <div>
                        <label className="text-stone-500 block">胸围(cm)</label>
                        <input
                          type="number"
                          value={bustCm}
                          onChange={(e) => setBustCm(Number(e.target.value))}
                          className="w-full bg-white border border-[#EAE6DF] rounded-lg p-1 text-center font-bold"
                        />
                      </div>
                      <div>
                        <label className="text-stone-500 block">腰围(cm)</label>
                        <input
                          type="number"
                          value={waistCm}
                          onChange={(e) => setWaistCm(Number(e.target.value))}
                          className="w-full bg-white border border-[#EAE6DF] rounded-lg p-1 text-center font-bold"
                        />
                      </div>
                      <div>
                        <label className="text-stone-500 block">臀围(cm)</label>
                        <input
                          type="number"
                          value={hipsCm}
                          onChange={(e) => setHipsCm(Number(e.target.value))}
                          className="w-full bg-white border border-[#EAE6DF] rounded-lg p-1 text-center font-bold"
                        />
                      </div>
                    </div>
                  </div>

                  <p className="text-[10px] text-stone-400">
                    💡 提示：若不清楚具体三围，可直接点击“一键黄金比例”，注册后随时在账号设置中修正。
                  </p>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setRegStep(1)}
                      className="w-1/3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-600 text-xs font-bold rounded-2xl"
                    >
                      上一步
                    </button>
                    <button
                      type="button"
                      onClick={() => setRegStep(3)}
                      className="w-2/3 py-2 bg-[#D63031] hover:bg-rose-600 text-white text-xs font-bold rounded-2xl shadow-md flex items-center justify-center gap-1.5"
                    >
                      <span>下一步：人像素图生成</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3: 人像素图生成 (可选上传或跳过) */}
              {regStep === 3 && (
                <div className="space-y-3.5">
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-stone-800">📸 模特素体生成 (选填)</h4>
                    <p className="text-[10px] text-stone-400">
                      上传全身照片可重构真实面部素体；若跳过，系统将直接根据您填写的五维身材生成标准模特。
                    </p>
                  </div>

                  {avatarPreview ? (
                    <div className="p-3 bg-[#FAF8F5] rounded-2xl border border-[#EAE6DF] flex items-center gap-3">
                      <img
                        src={avatarPreview}
                        alt="照片预览"
                        className="w-12 h-16 object-cover rounded-xl border border-stone-300"
                      />
                      <div className="text-left flex-1">
                        <span className="text-xs font-bold text-stone-700 block">已就绪照片</span>
                        <span className="text-[10px] text-stone-400">注册后自动重构 A-Pose 素体</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setAvatarImageBase64('');
                          setAvatarPreview('');
                        }}
                        className="text-xs text-[#D63031] hover:underline"
                      >
                        移除
                      </button>
                    </div>
                  ) : (
                    <label className="block p-4 border-2 border-dashed border-rose-200 hover:border-rose-400 rounded-2xl text-center cursor-pointer transition-colors bg-rose-50/30">
                      <Camera className="w-5 h-5 text-rose-400 mx-auto mb-1" />
                      <span className="text-xs font-bold text-rose-600 block">点击上传全身照片 (可选)</span>
                      <span className="text-[10px] text-stone-400 block">支持 JPG / PNG 照片</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handlePhotoSelect}
                      />
                    </label>
                  )}

                  <div className="space-y-2 pt-1">
                    {isLoading && (
                      <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-center">
                        <span className="text-[11px] font-bold text-rose-600 block animate-pulse">
                          ✨ 正在调用 gemini-3.1-flash-image 根据您的身材参数生成专属模特素体...
                        </span>
                      </div>
                    )}

                    <button
                      type="button"
                      disabled={isLoading}
                      onClick={() => handleFinalRegister(false)}
                      className="w-full py-2.5 bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white text-xs font-bold rounded-2xl shadow-md transition-all disabled:opacity-50"
                    >
                      {isLoading ? '正在生成素体与账号...' : '完成注册并获赠 100 初始积分 🎉'}
                    </button>

                    <button
                      type="button"
                      disabled={isLoading}
                      onClick={() => handleFinalRegister(true)}
                      className="w-full py-2 bg-stone-100 hover:bg-stone-200 text-stone-600 text-xs font-bold rounded-2xl transition-colors disabled:opacity-50"
                    >
                      {isLoading ? '正在生成素体与账号...' : '跳过照片，直接使用身材参数生成默认素体'}
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
