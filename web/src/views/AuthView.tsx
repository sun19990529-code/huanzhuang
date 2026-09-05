import React, { useState, useEffect } from 'react';
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
  Trash2,
  UserCheck,
} from 'lucide-react';
import {
  calculateGoldenRatioBody,
  deriveBodyTypeFromMeasurements,
  getBodyTypePresetMeasurements,
  calculateBmi,
  calculateWhr,
  FEMALE_BODY_TYPE_CONFIGS,
  MALE_BODY_TYPE_CONFIGS,
} from '@smart-wardrobe/shared';
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

  // 注册两步式向导状态 (Step 1: 基础账号 -> Step 2: 身材与专属模特一体化)
  const [regStep, setRegStep] = useState<1 | 2>(1);
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regNickname, setRegNickname] = useState('');
  const [regGender, setRegGender] = useState<'FEMALE' | 'MALE'>('FEMALE');

  // 身材五维与形态
  const [heightCm, setHeightCm] = useState(168);
  const [weightKg, setWeightKg] = useState(50);
  const [bustCm, setBustCm] = useState(84);
  const [waistCm, setWaistCm] = useState(62);
  const [hipsCm, setHipsCm] = useState(89);
  const [bodyType, setBodyType] = useState('HOURGLASS');
  const [skinTone, setSkinTone] = useState('WARM_NATURAL');
  const [isManualSelectingBodyType, setIsManualSelectingBodyType] = useState(false);

  // 发型与发型模式
  const [hairstyleMode, setHairstyleMode] = useState<'KEEP_PHOTO' | 'CUSTOM'>('CUSTOM');
  const [hairstyle, setHairstyle] = useState('FRENCH_WAVY_LONG');

  // 全身照片上传
  const [avatarImageBase64, setAvatarImageBase64] = useState<string>('');
  const [avatarPreview, setAvatarPreview] = useState<string>('');

  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // 1. 三围与体型双向智能联动 (向 A: 三围推导体型)
  useEffect(() => {
    if (isManualSelectingBodyType) return;
    const timer = setTimeout(() => {
      const derived = deriveBodyTypeFromMeasurements(
        regGender,
        bustCm,
        waistCm,
        hipsCm,
        heightCm,
        weightKg
      );
      setBodyType(derived);
    }, 150);
    return () => clearTimeout(timer);
  }, [bustCm, waistCm, hipsCm, regGender, isManualSelectingBodyType]);

  // 2. 切换体型 (向 B: 体型反向赋基准三围)
  const handleSelectBodyType = (targetType: string) => {
    setIsManualSelectingBodyType(true);
    setBodyType(targetType);
    const preset = getBodyTypePresetMeasurements(regGender, targetType, heightCm);
    setBustCm(preset.bustCm);
    setWaistCm(preset.waistCm);
    setHipsCm(preset.hipsCm);
    setWeightKg(preset.weightKg);
  };

  // 3. 计算健康体态胶囊
  const bmiInfo = calculateBmi(weightKg, heightCm);
  const whrInfo = calculateWhr(waistCm, hipsCm);

  // 4. 一键黄金比例
  const handleApplyGolden = () => {
    setIsManualSelectingBodyType(true);
    const golden = calculateGoldenRatioBody(regGender, heightCm);
    setWeightKg(golden.weightKg);
    setBustCm(golden.bustCm);
    setWaistCm(golden.waistCm);
    setHipsCm(golden.hipsCm);
    setBodyType(regGender === 'MALE' ? 'ATHLETIC' : 'HOURGLASS');
  };

  // 5. 切换性别重置默认值
  const handleToggleGender = (newGender: 'FEMALE' | 'MALE') => {
    setRegGender(newGender);
    setIsManualSelectingBodyType(true);
    const golden = calculateGoldenRatioBody(newGender, newGender === 'MALE' ? 178 : 165);
    setHeightCm(newGender === 'MALE' ? 178 : 165);
    setWeightKg(golden.weightKg);
    setBustCm(golden.bustCm);
    setWaistCm(golden.waistCm);
    setHipsCm(golden.hipsCm);
    setBodyType(newGender === 'MALE' ? 'ATHLETIC' : 'HOURGLASS');
    setHairstyle(newGender === 'MALE' ? 'CLEAN_SHORT' : 'FRENCH_WAVY_LONG');
  };

  // 处理照片选择
  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImageFile(file);
      setAvatarImageBase64(compressed);
      setAvatarPreview(compressed);
      setHairstyleMode('KEEP_PHOTO');
    } catch (err) {
      console.warn('图片读取失败', err);
    }
  };

  // 移除照片
  const handleRemovePhoto = () => {
    setAvatarImageBase64('');
    setAvatarPreview('');
    setHairstyleMode('CUSTOM');
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
        nickname: regNickname.trim() || '新用户',
        gender: regGender,
        heightCm,
        weightKg,
        bustCm,
        waistCm,
        hipsCm,
        isCustomBodyParams: true,
        bodyType,
        skinTone,
        hairstyle,
        hairstyleMode: skipPhoto ? 'CUSTOM' : hairstyleMode,
        avatarImageUrl: skipPhoto ? undefined : avatarImageBase64 || undefined,
      });
      onLoginSuccess(result.user);
    } catch (err: any) {
      setErrorMsg(err.message || '注册失败，请稍后重试');
    } finally {
      setIsLoading(false);
    }
  };

  const bodyTypeConfigs = regGender === 'MALE' ? MALE_BODY_TYPE_CONFIGS : FEMALE_BODY_TYPE_CONFIGS;

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-3 sm:p-4 selection:bg-[#D63031]/20">
      <div
        className={`w-full ${
          mode === 'REGISTER' && regStep === 2
            ? 'max-w-4xl lg:max-w-5xl'
            : 'max-w-3xl'
        } bg-white/95 backdrop-blur-2xl border border-[#EAE6DF] rounded-[36px] shadow-2xl p-6 md:p-10 flex flex-col md:flex-row items-center gap-8 md:gap-10 transition-all duration-300`}
      >
        {/* 左侧：专属品牌 Logo 与极简定位 (仅在登录或注册第一步显示) */}
        {(mode === 'LOGIN' || regStep === 1) && (
          <div className="w-full md:w-5/12 flex flex-col items-center md:items-start text-center md:text-left space-y-4">
            <BrandLogo variant="stacked" size="lg" />
            <div className="pt-2 border-t border-[#EAE6DF] w-full">
              <p className="text-xs text-stone-500 font-medium leading-relaxed">
                数字化高定衣橱 · 多模态试穿工坊
              </p>
              <div className="mt-3 space-y-1.5 text-[11px] text-stone-400">
                <div className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-[#D63031]" />
                  <span>3:4 黄金画幅解剖级模特生成</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-[#D63031]" />
                  <span>三围体型智能联动 · 消除超模千篇一律</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-[#D63031]" />
                  <span>生活照面容发型解耦 · 自由试穿百变造型</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 主交互容器 */}
        <div
          className={`w-full ${
            mode === 'REGISTER' && regStep === 2 ? 'w-full' : 'md:w-7/12'
          } bg-[#FAF8F5]/80 p-5 sm:p-7 md:p-8 rounded-[28px] border border-[#EAE6DF] shadow-sm text-left space-y-5`}
        >
          {/* Tab 切换 (登录 / 注册) */}
          <div className="flex items-center bg-stone-200/60 p-1 rounded-2xl">
            <button
              type="button"
              onClick={() => {
                setMode('LOGIN');
                setErrorMsg('');
              }}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                mode === 'LOGIN'
                  ? 'bg-[#D63031] text-white shadow-xs font-extrabold'
                  : 'text-stone-600 hover:text-stone-900'
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
                mode === 'REGISTER'
                  ? 'bg-[#D63031] text-white shadow-xs font-extrabold'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              新用户注册
            </button>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-[#D63031] text-xs font-bold animate-in fade-in">
              {errorMsg}
            </div>
          )}

          {/* ======================================================== */}
          {/* 模式 1: 账号登录 */}
          {/* ======================================================== */}
          {mode === 'LOGIN' && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-700 block">邮箱地址</label>
                <input
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full bg-white border border-[#EAE6DF] focus:border-[#D63031] rounded-2xl px-4 py-2.5 text-xs text-stone-900 focus:outline-none transition-colors"
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
                  className="w-full bg-white border border-[#EAE6DF] focus:border-[#D63031] rounded-2xl px-4 py-2.5 text-xs text-stone-900 focus:outline-none transition-colors"
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

          {/* ======================================================== */}
          {/* 模式 2: 两步式注册 (Step 1 -> 一体化 Step 2) */}
          {/* ======================================================== */}
          {mode === 'REGISTER' && (
            <div className="space-y-4">
              {/* 步骤条 */}
              <div className="flex items-center justify-between px-2 text-[10px] font-bold text-stone-400">
                <span className={regStep >= 1 ? 'text-[#D63031]' : ''}>1. 基础账号信息</span>
                <span>→</span>
                <span className={regStep >= 2 ? 'text-[#D63031]' : ''}>2. 身材三围与专属模特定制</span>
              </div>

              {/* ---------------- STEP 1: 账号与密码 ---------------- */}
              {regStep === 1 && (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-stone-700 block">注册邮箱</label>
                    <input
                      type="email"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="name@example.com"
                      className="w-full bg-white border border-[#EAE6DF] focus:border-[#D63031] rounded-2xl px-3.5 py-2 text-xs text-stone-800 focus:outline-none"
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
                      className="w-full bg-white border border-[#EAE6DF] focus:border-[#D63031] rounded-2xl px-3.5 py-2 text-xs text-stone-800 focus:outline-none"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-stone-700 block">用户昵称</label>
                      <input
                        type="text"
                        value={regNickname}
                        onChange={(e) => setRegNickname(e.target.value)}
                        placeholder="如: 时尚先锋"
                        className="w-full bg-white border border-[#EAE6DF] focus:border-[#D63031] rounded-2xl px-3.5 py-2 text-xs text-stone-800 focus:outline-none"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-stone-700 block">初始性别</label>
                      <div className="grid grid-cols-2 gap-1 bg-stone-200/60 p-0.5 rounded-xl">
                        <button
                          type="button"
                          onClick={() => handleToggleGender('FEMALE')}
                          className={`py-1.5 rounded-lg text-xs font-bold transition-all ${
                            regGender === 'FEMALE'
                              ? 'bg-white text-[#D63031] shadow-2xs font-extrabold'
                              : 'text-stone-600'
                          }`}
                        >
                          女性
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleGender('MALE')}
                          className={`py-1.5 rounded-lg text-xs font-bold transition-all ${
                            regGender === 'MALE'
                              ? 'bg-white text-stone-900 shadow-2xs font-extrabold'
                              : 'text-stone-600'
                          }`}
                        >
                          男性
                        </button>
                      </div>
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
                    className="w-full py-2.5 bg-[#D63031] hover:bg-[#c0392b] text-white text-xs font-bold rounded-2xl shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer mt-2"
                  >
                    <span>下一步：定制专属模特与身材</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* ---------------- STEP 2: 身材与模特一体化定制 ---------------- */}
              {regStep === 2 && (
                <div className="space-y-5 animate-in fade-in">
                  
                  {/* 双栏网格排版 */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                    
                    {/* 左侧 (42%): 真人照片上传 + 发型偏好 */}
                    <div className="lg:col-span-5 space-y-3.5 border-b lg:border-b-0 lg:border-r border-[#EAE6DF] pb-4 lg:pb-0 lg:pr-5">
                      
                      {/* 照片上传 */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-extrabold text-stone-800 flex items-center gap-1.5">
                          <Camera className="w-3.5 h-3.5 text-[#D63031]" />
                          <span>真人面容与全身照 (选填)</span>
                        </label>
                        <p className="text-[10px] text-stone-400">
                          上传生活照将重构真人五官；未上传则自动生成写实素体。
                        </p>

                        {avatarPreview ? (
                          <div className="p-3 bg-white rounded-2xl border border-[#EAE6DF] flex items-center gap-3 relative group">
                            <img
                              src={avatarPreview}
                              alt="照片预览"
                              className="w-14 h-18 object-cover rounded-xl border border-stone-200 shadow-2xs"
                            />
                            <div className="flex-1 text-left">
                              <span className="text-xs font-bold text-stone-800 block">已载入面容照</span>
                              <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-0.5 mt-0.5">
                                <UserCheck className="w-3 h-3" />
                                <span>注册后自动生成专属 3:4 素体</span>
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={handleRemovePhoto}
                              className="p-1.5 text-stone-400 hover:text-[#D63031] hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                              title="移除照片"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <label className="block p-4 border-2 border-dashed border-[#EAE6DF] hover:border-stone-400 rounded-2xl text-center cursor-pointer transition-colors bg-white group">
                            <Camera className="w-6 h-6 text-stone-400 group-hover:text-[#D63031] mx-auto mb-1 transition-colors" />
                            <span className="text-xs font-bold text-stone-700 block">点击上传真人生活照</span>
                            <span className="text-[9px] text-stone-400 block mt-0.5">
                              推荐正面全身/半身清晰照 · 支持 JPG/PNG
                            </span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={handlePhotoSelect}
                            />
                          </label>
                        )}
                      </div>

                        {/* 专属模特生成特性卡片 */}
                        <div className="bg-white/80 p-3.5 rounded-2xl border border-[#EAE6DF] space-y-2 text-left">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-stone-800">
                            <Sparkles className="w-3.5 h-3.5 text-[#D63031]" />
                            <span>专属 3:4 黄金画幅模特</span>
                          </div>
                          <p className="text-[10px] text-stone-500 leading-relaxed">
                            系统将基于您的五维身材参数与所选体型，为您生成高定 3:4 A-Pose 模特素体。若上传生活照，将 100% 提取并保留真人面容五官。
                          </p>
                          <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-stone-100 text-[10px] text-stone-400">
                            <div className="flex items-center gap-1">
                              <Check className="w-3 h-3 text-[#D63031]" />
                              <span>解剖级骨骼比例</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Check className="w-3 h-3 text-[#D63031]" />
                              <span>发型面容解耦换装</span>
                            </div>
                          </div>
                        </div>
                      </div>

                    {/* 右侧 (58%): 体型联动 + 五维三围滑块 + BMI/WHR 反馈 */}
                    <div className="lg:col-span-7 space-y-3.5">
                      
                      {/* 体型选择与智能推导标签 */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-extrabold text-stone-800">
                            体型形态 (与三围智能联动)
                          </label>
                          <button
                            type="button"
                            onClick={handleApplyGolden}
                            className="text-[10px] font-bold text-[#D63031] bg-rose-50 hover:bg-rose-100 px-2 py-0.5 rounded-lg border border-rose-200 flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            <Sparkles className="w-3 h-3 text-[#D63031]" />
                            <span>一键黄金比例</span>
                          </button>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                          {bodyTypeConfigs.map((cfg) => {
                            const isSelected = bodyType === cfg.key;
                            return (
                              <button
                                key={cfg.key}
                                type="button"
                                onClick={() => handleSelectBodyType(cfg.key)}
                                className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${
                                  isSelected
                                    ? 'bg-rose-50/90 border-[#D63031] ring-1 ring-[#D63031] text-[#D63031]'
                                    : 'bg-white border-[#EAE6DF] hover:border-stone-300 text-stone-700'
                                }`}
                              >
                                <div className="text-[11px] font-extrabold flex items-center justify-between">
                                  <span>{cfg.label}</span>
                                  {isSelected && <span className="text-[9px]">✓ 推荐</span>}
                                </div>
                                <div className="text-[9px] text-stone-400 mt-0.5 truncate">{cfg.desc}</div>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* 五维三围精细调节 */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-extrabold text-stone-800">
                            五维身材参数
                          </label>
                          <span className="text-[10px] text-stone-400">滑动实时推导形态</span>
                        </div>

                        <div className="grid grid-cols-2 gap-2.5">
                          {/* 身高 */}
                          <div className="bg-white p-2.5 rounded-xl border border-[#EAE6DF] space-y-1">
                            <div className="flex justify-between text-[11px] font-bold">
                              <span className="text-stone-600">身高</span>
                              <span className="font-mono text-[#D63031]">{heightCm} cm</span>
                            </div>
                            <input
                              type="range"
                              min="140"
                              max="210"
                              value={heightCm}
                              onChange={(e) => {
                                setIsManualSelectingBodyType(false);
                                setHeightCm(Number(e.target.value));
                              }}
                              className="w-full accent-[#D63031] cursor-pointer"
                            />
                          </div>

                          {/* 体重 + 实时 BMI */}
                          <div className="bg-white p-2.5 rounded-xl border border-[#EAE6DF] space-y-1">
                            <div className="flex justify-between text-[11px] font-bold">
                              <span className="text-stone-600">体重</span>
                              <div className="flex items-center gap-1">
                                <span
                                  className="text-[9px] px-1 py-0.2 rounded font-bold text-white"
                                  style={{ backgroundColor: bmiInfo.color }}
                                >
                                  BMI {bmiInfo.bmi}
                                </span>
                                <span className="font-mono text-[#D63031]">{weightKg} kg</span>
                              </div>
                            </div>
                            <input
                              type="range"
                              min="35"
                              max="130"
                              value={weightKg}
                              onChange={(e) => {
                                setIsManualSelectingBodyType(false);
                                setWeightKg(Number(e.target.value));
                              }}
                              className="w-full accent-[#D63031] cursor-pointer"
                            />
                          </div>

                          {/* 胸围 */}
                          <div className="bg-white p-2.5 rounded-xl border border-[#EAE6DF] space-y-1">
                            <div className="flex justify-between text-[11px] font-bold">
                              <span className="text-stone-600">胸围</span>
                              <span className="font-mono text-[#D63031]">{bustCm} cm</span>
                            </div>
                            <input
                              type="range"
                              min="60"
                              max="140"
                              value={bustCm}
                              onChange={(e) => {
                                setIsManualSelectingBodyType(false);
                                setBustCm(Number(e.target.value));
                              }}
                              className="w-full accent-[#D63031] cursor-pointer"
                            />
                          </div>

                          {/* 腰围 */}
                          <div className="bg-white p-2.5 rounded-xl border border-[#EAE6DF] space-y-1">
                            <div className="flex justify-between text-[11px] font-bold">
                              <span className="text-stone-600">腰围</span>
                              <span className="font-mono text-[#D63031]">{waistCm} cm</span>
                            </div>
                            <input
                              type="range"
                              min="45"
                              max="130"
                              value={waistCm}
                              onChange={(e) => {
                                setIsManualSelectingBodyType(false);
                                setWaistCm(Number(e.target.value));
                              }}
                              className="w-full accent-[#D63031] cursor-pointer"
                            />
                          </div>

                          {/* 臀围 + WHR 腰臀比 */}
                          <div className="bg-white p-2.5 rounded-xl border border-[#EAE6DF] space-y-1 col-span-2">
                            <div className="flex justify-between text-[11px] font-bold">
                              <span className="text-stone-600">臀围</span>
                              <div className="flex items-center gap-1.5">
                                <span className="text-[9px] px-1.5 py-0.2 rounded-full font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                  腰臀比 {whrInfo.whr} ({whrInfo.label})
                                </span>
                                <span className="font-mono text-[#D63031]">{hipsCm} cm</span>
                              </div>
                            </div>
                            <input
                              type="range"
                              min="65"
                              max="140"
                              value={hipsCm}
                              onChange={(e) => {
                                setIsManualSelectingBodyType(false);
                                setHipsCm(Number(e.target.value));
                              }}
                              className="w-full accent-[#D63031] cursor-pointer"
                            />
                          </div>
                        </div>
                      </div>

                      {/* 发型设定 (右移配置) */}
                      <div className="space-y-1.5 pt-1 border-t border-[#EAE6DF]">
                        <label className="text-xs font-extrabold text-stone-800 block">发型偏好设定</label>
                        
                        {avatarPreview && (
                          <button
                            type="button"
                            onClick={() => setHairstyleMode('KEEP_PHOTO')}
                            className={`w-full p-2.5 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer mb-1.5 ${
                              hairstyleMode === 'KEEP_PHOTO'
                                ? 'bg-rose-50 border-[#D63031] ring-1 ring-[#D63031]'
                                : 'bg-white border-[#EAE6DF] hover:border-stone-300'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span>📸</span>
                              <div>
                                <div className="text-[11px] font-extrabold text-stone-800">保持照片原生发型 (推荐)</div>
                                <div className="text-[9px] text-stone-400">保留生活照发型与个人辨识度</div>
                              </div>
                            </div>
                            {hairstyleMode === 'KEEP_PHOTO' && (
                              <Check className="w-3.5 h-3.5 text-[#D63031] stroke-[2.5]" />
                            )}
                          </button>
                        )}

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                          {(regGender === 'FEMALE'
                            ? [
                                { key: 'FRENCH_WAVY_LONG', label: '法式微卷' },
                                { key: 'SHOULDER_BOB', label: '及肩波波头' },
                                { key: 'CHIC_SHORT', label: '干练短发' },
                                { key: 'HIGH_PONYTAIL', label: '高马尾' },
                              ]
                            : [
                                { key: 'CLEAN_SHORT', label: '清爽短发' },
                                { key: 'KOREAN_SIDE_PART', label: '韩系侧分' },
                                { key: 'BUSINESS_POMPADOUR', label: '商务背头' },
                                { key: 'BUZZ_CUT', label: '寸头' },
                              ]
                          ).map((hs) => {
                            const isSelected = hairstyleMode === 'CUSTOM' && hairstyle === hs.key;
                            return (
                              <button
                                key={hs.key}
                                type="button"
                                onClick={() => {
                                  setHairstyleMode('CUSTOM');
                                  setHairstyle(hs.key);
                                }}
                                className={`p-2 rounded-xl border text-left text-[11px] font-bold transition-all cursor-pointer ${
                                  isSelected
                                    ? 'bg-rose-50 border-[#D63031] text-[#D63031] ring-1 ring-[#D63031]'
                                    : 'bg-white border-[#EAE6DF] hover:border-stone-300 text-stone-700'
                                }`}
                              >
                                {hs.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* 肤色基调 (右移配置) */}
                      <div className="space-y-1 pt-1 border-t border-[#EAE6DF]">
                        <label className="text-[10px] font-bold text-stone-500 block">肤色基调</label>
                        <div className="grid grid-cols-4 gap-1.5">
                          {[
                            { key: 'FAIR', label: '瓷白', color: '#FCEFE9' },
                            { key: 'WARM_NATURAL', label: '暖自然', color: '#F7D6BD' },
                            { key: 'WHEAT', label: '小麦', color: '#E4B68E' },
                            { key: 'COOL_IVORY', label: '冷白', color: '#FDF1EC' },
                          ].map((sk) => (
                            <button
                              key={sk.key}
                              type="button"
                              onClick={() => setSkinTone(sk.key)}
                              className={`py-1.5 px-1 rounded-xl border text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-all ${
                                skinTone === sk.key
                                  ? 'border-[#D63031] ring-1 ring-[#D63031] bg-white text-[#D63031]'
                                  : 'border-[#EAE6DF] bg-white text-stone-600 hover:border-stone-300'
                              }`}
                            >
                              <span
                                className="w-2.5 h-2.5 rounded-full border border-black/10 shrink-0"
                                style={{ backgroundColor: sk.color }}
                              />
                              <span className="truncate">{sk.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                    </div>
                  </div>

                  {/* 底部操作区 */}
                  <div className="pt-3 border-t border-[#EAE6DF] flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => setRegStep(1)}
                      className="px-4 py-2.5 bg-white hover:bg-stone-100 border border-[#EAE6DF] text-stone-600 text-xs font-bold rounded-2xl transition-colors cursor-pointer"
                    >
                      上一步
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={isLoading}
                        onClick={() => handleFinalRegister(true)}
                        className="px-3.5 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold rounded-2xl transition-colors disabled:opacity-50 cursor-pointer hidden sm:block"
                      >
                        跳过照片直接生成
                      </button>
                      <button
                        type="button"
                        disabled={isLoading}
                        onClick={() => handleFinalRegister(false)}
                        className="px-6 py-2.5 bg-gradient-to-r from-[#D63031] to-[#E17055] hover:from-[#c0392b] hover:to-[#d63031] text-white text-xs font-extrabold rounded-2xl shadow-md hover:shadow-lg transition-all disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                      >
                        <Sparkles className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                        <span>{isLoading ? '正在完成注册并重构模特...' : '✨ 完成注册并生成专属模特'}</span>
                      </button>
                    </div>
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
