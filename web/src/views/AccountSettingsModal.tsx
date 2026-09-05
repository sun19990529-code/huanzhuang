import { showToast } from '../components/Toast';
import React, { useState, useEffect, useRef } from 'react';
import {
 UserProfile,
 UserAvatar,
 calculateGoldenRatioBody,
 deriveBodyTypeFromMeasurements,
 getBodyTypePresetMeasurements,
 calculateBmi,
 calculateWhr,
 FEMALE_BODY_TYPE_CONFIGS,
 MALE_BODY_TYPE_CONFIGS,
 SKIN_TONE_CONFIGS,
 HAIRSTYLE_CONFIGS,
} from '@smart-wardrobe/shared';
import {
 X,
 User,
 Sliders,
 Camera,
 KeyRound,
 Users,
 Sparkles,
 Shield,
 CreditCard,
 History,
 Check,
 Wand2,
 Lock,
 Plus,
 RefreshCw,
 Ruler,
 Globe,
 Trash2,
 Crown,
 Upload,
 UserCheck,
 Activity,
} from 'lucide-react';
import {
 CurrentUser,
 CreditLedgerItem,
 changePassword,
 updateProfileInfo,
 updateProfile,
 createProfile,
 uploadAvatarPhoto,
 compressImageFile,
 regenerateAvatarByBodyParams,
 fetchMyCreditsLedger,
} from '../api';

interface AccountSettingsModalProps {
 isOpen: boolean;
 user: CurrentUser | null;
 currentProfile: UserProfile | null;
 profiles: UserProfile[];
 avatar: UserAvatar | null;
 onClose: () => void;
 onSelectProfile: (profile: UserProfile) => void;
 onProfileUpdated: (profile: UserProfile) => void;
 onAvatarUpdated: (avatar: UserAvatar) => void;
 onUserUpdated: (user: CurrentUser) => void;
}

export const AccountSettingsModal: React.FC<AccountSettingsModalProps> = ({
 isOpen,
 user,
 currentProfile,
 profiles,
 avatar,
 onClose,
 onSelectProfile,
 onProfileUpdated,
 onAvatarUpdated,
 onUserUpdated,
}) => {
  // 一体化 Tab：将身材与模特彻底合并为一个顶层工坊
  const [activeTab, setActiveTab] = useState<'WORKSHOP' | 'PROFILES' | 'CREDITS' | 'SECURITY'>('WORKSHOP');

  // 身材五维状态
  const [gender, setGender] = useState<'FEMALE' | 'MALE'>(currentProfile?.gender === 'MALE' ? 'MALE' : 'FEMALE');
  const [heightCm, setHeightCm] = useState(currentProfile?.heightCm || 168);
  const [weightKg, setWeightKg] = useState(currentProfile?.weightKg || 50);
  const [bustCm, setBustCm] = useState(currentProfile?.bustCm || 84);
  const [waistCm, setWaistCm] = useState(currentProfile?.waistCm || 62);
  const [hipsCm, setHipsCm] = useState(currentProfile?.hipsCm || 89);
  const [bodyType, setBodyType] = useState<string>((currentProfile as any)?.bodyType || 'HOURGLASS');
  const [skinTone, setSkinTone] = useState<string>((currentProfile as any)?.skinTone || 'WARM_NATURAL');

  // 发型与发型模式 (支持保持照片原生发型 KEEP_PHOTO)
  const [hairstyleMode, setHairstyleMode] = useState<'KEEP_PHOTO' | 'CUSTOM'>(
    (currentProfile as any)?.hairstyleMode || (avatar?.originalImageUrl ? 'KEEP_PHOTO' : 'CUSTOM')
  );
  const [hairstyle, setHairstyle] = useState<string>(
    (currentProfile as any)?.hairstyle || (currentProfile?.gender === 'MALE' ? 'CLEAN_SHORT' : 'FRENCH_WAVY_LONG')
  );

  // 本地新选中的照片 Preview (Base64)
  const [selectedPhotoBase64, setSelectedPhotoBase64] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 双向联动控制守卫：防止点击体型反向赋三围时触发循环推导
  const [isManualSelectingBodyType, setIsManualSelectingBodyType] = useState(false);

  // 重构进度条与反馈
  const [isReconstructing, setIsReconstructing] = useState(false);
  const [reconstructProgress, setReconstructProgress] = useState<number | null>(null);
  const [reconstructStageText, setReconstructStageText] = useState('');
  const [reconstructMsg, setReconstructMsg] = useState('');
  const [reconstructErr, setReconstructErr] = useState('');

  // 身材纯保存反馈
  const [bodySaveMsg, setBodySaveMsg] = useState('');
  const [isBodySaving, setIsBodySaving] = useState(false);

  // 账号安全状态
  const [nickname, setNickname] = useState(user?.nickname || '');
  const [oldPass, setOldPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [securityMsg, setSecurityMsg] = useState('');
  const [securityErr, setSecurityErr] = useState('');

  // 积分流水状态
  const [ledgerData, setLedgerData] = useState<{ dailyCredits: number; permanentCredits: number; totalCredits: number; ledger: CreditLedgerItem[] } | null>(null);
  const [isLedgerLoading, setIsLedgerLoading] = useState(false);

  // 新建家庭成员状态
  const [isCreatingProfile, setIsCreatingProfile] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');
  const [newProfileGender, setNewProfileGender] = useState<'FEMALE' | 'MALE'>('FEMALE');

  // 1. 同步当前 Profile 数据
  useEffect(() => {
    if (currentProfile) {
      setGender(currentProfile.gender === 'MALE' ? 'MALE' : 'FEMALE');
      setHeightCm(currentProfile.heightCm);
      setWeightKg(currentProfile.weightKg);
      setBustCm(currentProfile.bustCm);
      setWaistCm(currentProfile.waistCm);
      setHipsCm(currentProfile.hipsCm);
      setBodyType((currentProfile as any).bodyType || (currentProfile.gender === 'MALE' ? 'ATHLETIC' : 'HOURGLASS'));
      setSkinTone((currentProfile as any).skinTone || 'WARM_NATURAL');
      setHairstyle((currentProfile as any).hairstyle || (currentProfile.gender === 'MALE' ? 'CLEAN_SHORT' : 'FRENCH_WAVY_LONG'));
      if ((currentProfile as any).hairstyleMode) {
        setHairstyleMode((currentProfile as any).hairstyleMode);
      } else if (avatar?.originalImageUrl) {
        setHairstyleMode('KEEP_PHOTO');
      }
    }
  }, [currentProfile, avatar]);

  useEffect(() => {
    if (user) setNickname(user.nickname);
  }, [user]);

  useEffect(() => {
    if (activeTab === 'CREDITS') loadLedger();
  }, [activeTab]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // 2. 双向智能联动：根据当前三围防抖推导体型 (向 A)
  const currentDerivedBodyType = deriveBodyTypeFromMeasurements(gender, bustCm, waistCm, hipsCm, heightCm, weightKg);
  useEffect(() => {
    if (isManualSelectingBodyType) {
      setIsManualSelectingBodyType(false);
      return;
    }
    const timer = setTimeout(() => {
      setBodyType(currentDerivedBodyType);
    }, 200);
    return () => clearTimeout(timer);
  }, [gender, bustCm, waistCm, hipsCm, heightCm, weightKg]);

  // 3. 反向联动：点击体型反向赋予基准三围 (向 B)
  const handleSelectBodyType = (targetType: string) => {
    setIsManualSelectingBodyType(true);
    setBodyType(targetType);
    const preset = getBodyTypePresetMeasurements(gender, targetType as any, heightCm);
    setBustCm(preset.bustCm);
    setWaistCm(preset.waistCm);
    setHipsCm(preset.hipsCm);
    setWeightKg(preset.weightKg);
    showToast(`已为您按【${targetType}】设定基准三围与体态`, 'info');
  };

  // 4. 计算健康体态胶囊 (BMI & WHR)
  const bmiInfo = calculateBmi(weightKg, heightCm);
  const whrInfo = calculateWhr(waistCm, hipsCm);

  // 5. 切换性别
  const handleToggleGender = (newGender: 'FEMALE' | 'MALE') => {
    setGender(newGender);
    const golden = calculateGoldenRatioBody(newGender, heightCm);
    setWeightKg(golden.weightKg);
    setBustCm(golden.bustCm);
    setWaistCm(golden.waistCm);
    setHipsCm(golden.hipsCm);
    setBodyType(newGender === 'MALE' ? 'ATHLETIC' : 'HOURGLASS');
    setHairstyle(newGender === 'MALE' ? 'CLEAN_SHORT' : 'FRENCH_WAVY_LONG');
  };

  // 6. 一键黄金比例
  const handleApplyGolden = () => {
    const golden = calculateGoldenRatioBody(gender, heightCm);
    setIsManualSelectingBodyType(true);
    setWeightKg(golden.weightKg);
    setBustCm(golden.bustCm);
    setWaistCm(golden.waistCm);
    setHipsCm(golden.hipsCm);
    setBodyType(gender === 'MALE' ? 'ATHLETIC' : 'HOURGLASS');
    showToast('已匹配黄金比例三围身材', 'success');
  };

  // 7. 处理本地照片选择
  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const base64 = await compressImageFile(file);
      setSelectedPhotoBase64(base64);
      setHairstyleMode('KEEP_PHOTO');
      showToast('真人全身照已载入，默认开启【保持照片原生发型】', 'success');
    } catch (err: any) {
      showToast(err.message || '照片读取压缩失败', 'error');
    }
  };

  // 7.1 加载积分账单流水
  const loadLedger = async () => {
    setIsLedgerLoading(true);
    try {
      const data = await fetchMyCreditsLedger();
      setLedgerData(data);
    } catch (e: any) {
      console.warn('获取账单流水失败', e);
    } finally {
      setIsLedgerLoading(false);
    }
  };

  // 7.2 一键 AI 重构专属模特 (结合真人面容照片或纯身材参数)
  const handleReconstructAvatar = async () => {
    if (!currentProfile) return;
    setIsReconstructing(true);
    setReconstructErr('');
    setReconstructMsg('');
    setReconstructProgress(15);
    setReconstructStageText('正在解析身体形态与解剖结构...');

    const t1 = setTimeout(() => {
      setReconstructProgress(45);
      setReconstructStageText('正在生成 3:4 黄金比例专属模特素体...');
    }, 1200);

    const t2 = setTimeout(() => {
      setReconstructProgress(80);
      setReconstructStageText('正在进行发型与光影高精度对齐...');
    }, 3200);

    try {
      let resAvatar: UserAvatar;
      let resProfile: UserProfile | undefined;
      let resCredits: number | undefined;

      if (selectedPhotoBase64) {
        const res = await uploadAvatarPhoto(currentProfile.id, {
          imageBase64: selectedPhotoBase64,
          gender,
          heightCm,
          weightKg,
          bustCm,
          waistCm,
          hipsCm,
          bodyType,
          skinTone,
          hairstyle,
          hairstyleMode,
        });
        resAvatar = res.avatar;
        resProfile = res.profile;
        resCredits = res.remainingDailyCredits;
      } else {
        const res = await regenerateAvatarByBodyParams(currentProfile.id, {
          gender,
          heightCm,
          weightKg,
          bustCm,
          waistCm,
          hipsCm,
          bodyType,
          skinTone,
          hairstyle,
          hairstyleMode,
        });
        resAvatar = res.avatar;
        resProfile = res.profile;
        resCredits = res.remainingDailyCredits;
      }

      clearTimeout(t1);
      clearTimeout(t2);
      setReconstructProgress(100);
      setReconstructStageText('模特素体重构完成！');

      if (resProfile) onProfileUpdated(resProfile);
      if (resAvatar) onAvatarUpdated(resAvatar);
      if (user && resCredits !== undefined) {
        onUserUpdated({ ...user, dailyCredits: resCredits });
      }

      setReconstructMsg('🎉 专属 3:4 模特素体已重构成功并同步至试衣间！');
      showToast('专属 3:4 模特素体已重构成功', 'success');
      setTimeout(() => {
        setReconstructMsg('');
        setReconstructProgress(null);
        setReconstructStageText('');
      }, 4000);
    } catch (err: any) {
      clearTimeout(t1);
      clearTimeout(t2);
      setReconstructErr(err.message || '重构模特失败');
      showToast(err.message || '重构模特失败', 'error');
    } finally {
      setIsReconstructing(false);
    }
  };

  // 8. 仅保存身材参数 (0 算力)
  const handleSaveOnlyBody = async () => {
    if (!currentProfile) return;
    setIsBodySaving(true);
    setBodySaveMsg('');
    try {
      const updated = await updateProfile(currentProfile.id, {
        gender,
        heightCm,
        weightKg,
        bustCm,
        waistCm,
        hipsCm,
        isCustomBodyParams: true,
        bodyType,
        skinTone,
        hairstyle,
        hairstyleMode,
      } as any);
      onProfileUpdated(updated);
      setBodySaveMsg('身材参数已成功保存并同步至试衣间');
      showToast('身材参数已成功保存', 'success');
      setTimeout(() => setBodySaveMsg(''), 3000);
    } catch (err: any) {
      showToast(err.message || '保存身材参数失败', 'error');
    } finally {
      setIsBodySaving(false);
    }
  };


  // 修改昵称
  const handleUpdateNickname = async () => {
    if (!nickname.trim() || !user) return;
    try {
      const res = await updateProfileInfo(nickname.trim());
      onUserUpdated({ ...user, nickname: res.nickname });
      setSecurityMsg("昵称修改成功");
      setTimeout(() => setSecurityMsg(""), 3000);
    } catch (err: any) {
      setSecurityErr(err.message || "修改昵称失败");
    }
  };

  // 修改密码
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setSecurityErr("");
    setSecurityMsg("");

    if (newPass !== confirmPass) {
      setSecurityErr("两次输入的新密码不一致");
      return;
    }
    if (newPass.length < 6) {
 setSecurityErr('新密码长度不能少于 6 位');
 return;
 }

 try {
 await changePassword(oldPass, newPass);
 setSecurityMsg('登录密码修改成功');
 setOldPass('');
 setNewPass('');
 setConfirmPass('');
} catch (err: any) {
      showToast(err.message || '修改密码失败', 'error');
    }
  };

  // 新增家庭子角色
  const handleCreateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProfileName.trim()) return;
    try {
      const p = await createProfile({
        name: newProfileName.trim(),
        gender: newProfileGender,
        useGoldenRatio: true,
      });
      onSelectProfile(p);
      setIsCreatingProfile(false);
      setNewProfileName('');
    } catch (err: any) {
      showToast(err.message || '创建角色失败', 'error');
    }
  };

  // 是否具备有效真人照片（新选的照片或历史原图）
  const hasRealPhoto = Boolean(
    (selectedPhotoBase64 && selectedPhotoBase64.startsWith('data:image')) ||
    (avatar?.originalImageUrl && avatar.originalImageUrl.startsWith('data:image'))
  );

  const activeOriginalPhoto = selectedPhotoBase64 || avatar?.originalImageUrl || '';

  if (!isOpen || !user) return null;

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-xs flex items-center justify-center p-0 md:p-4 animate-in fade-in"
    >
      <div
        className="bg-white rounded-none md:rounded-3xl border-0 md:border md:border-[#EAE6DF] shadow-2xl w-full h-full md:h-[88vh] max-w-5xl xl:max-w-6xl max-h-[100dvh] md:max-h-[92vh] flex flex-col overflow-hidden text-left transition-all duration-300"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#EAE6DF] flex items-center justify-between bg-[#FAF8F5]/90">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-stone-900 text-white flex items-center justify-center shadow-xs">
              <Sliders className="w-4 h-4 stroke-[1.75]" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-stone-900 flex items-center gap-2">
                <span>个性化身材与模特重构工坊</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-[#D63031] border border-rose-200">
                  一体化工作台
                </span>
              </h3>
              <p className="text-[10px] text-stone-400">
                双向体型三围智能联动 · 真人面容发型解耦 · 3:4 黄金素体一键重构
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-stone-200/60 text-stone-400 hover:text-stone-700 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4 stroke-[2]" />
          </button>
        </div>

        {/* Tab 导航 */}
        <div className="flex items-center gap-2 px-6 pt-2.5 border-b border-[#EAE6DF] bg-white overflow-x-auto scrollbar-none">
          {[
            { key: 'WORKSHOP', label: '🎨 专属模特与身材工坊', icon: Sparkles },
            { key: 'PROFILES', label: '👥 多角色档案', icon: Users },
            { key: 'CREDITS', label: '💎 积分与算力账单', icon: CreditCard },
            { key: 'SECURITY', label: '🔒 账号安全', icon: Shield },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`flex items-center gap-1.5 px-4 py-2 border-b-2 text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'border-[#D63031] text-[#D63031]'
                    : 'border-transparent text-stone-500 hover:text-stone-800'
                }`}
              >
                <Icon className="w-3.5 h-3.5 stroke-[1.75]" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* 主内容区 */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 scrollbar-thin pb-28 md:pb-6">
          
          {/* TAB 1: 一体化【身材与模特重构工坊】 (双栏宽屏布局) */}
          {activeTab === 'WORKSHOP' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in">
              
              {/* ======================================================== */}
              {/* 左栏 (42%): 模特视觉区 + 照片仓 + 发型选择 + 一键重构 CTA */}
              {/* ======================================================== */}
              <div className="lg:col-span-5 space-y-4 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-[#EAE6DF] pb-6 lg:pb-0 lg:pr-6">
                
                <div className="space-y-4">
                  {/* 1. 模特素体画幅展示 */}
                  <div className="bg-[#FAF8F5] rounded-2xl border border-[#EAE6DF] p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-extrabold text-stone-800">
                          {currentProfile?.name || '当前模特'}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-md font-mono bg-white border border-[#EAE6DF] text-stone-600 font-bold">
                          {gender === 'FEMALE' ? '女性' : '男性'}
                        </span>
                      </div>
                      <span className="text-[10px] text-stone-400 font-mono">3:4 黄金画幅</span>
                    </div>

                    <div className="w-full aspect-[3/4] h-[320px] sm:h-[380px] md:h-[440px] lg:h-[480px] xl:h-[500px] bg-white rounded-2xl border border-stone-200/80 flex items-center justify-center overflow-hidden relative shadow-inner mx-auto">
                      {avatar?.normalizedImageUrl ? (
                        <img
                          src={avatar.normalizedImageUrl}
                          alt="当前试衣模特"
                          className="h-full w-full object-contain drop-shadow-sm"
                        />
                      ) : (
                        <div className="text-xs text-stone-400 flex flex-col items-center gap-1">
                          <Sliders className="w-6 h-6 text-stone-300 animate-pulse" />
                          <span>正在等待生成素体</span>
                        </div>
                      )}

                      {/* 悬浮微标 */}
                      <div className="absolute bottom-2 left-2 right-2 bg-black/60 backdrop-blur-xs text-white text-[9px] px-2.5 py-1.5 rounded-xl flex items-center justify-between shadow-xs">
                        <span>当前试衣间标准素体</span>
                        <span className="font-mono text-stone-200 font-bold">
                          {heightCm}cm · {weightKg}kg · {currentDerivedBodyType}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 2. 真人面容照片仓 (上传 / 更换 / 移除) */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-extrabold text-stone-800 flex items-center gap-1.5">
                        <Camera className="w-3.5 h-3.5 text-[#D63031]" />
                        <span>真人面容与生活照 (可选)</span>
                      </label>
                      {hasRealPhoto && (
                        <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-0.5">
                          <UserCheck className="w-3 h-3" />
                          <span>已载入真人五官特征</span>
                        </span>
                      )}
                    </div>

                    {hasRealPhoto ? (
                      <div className="p-2.5 bg-white rounded-xl border border-[#EAE6DF] flex items-center gap-3">
                        <img
                          src={activeOriginalPhoto}
                          alt="真人参考图"
                          className="w-12 h-16 object-cover rounded-lg border border-stone-300 shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-bold text-stone-800 truncate">真人参考照片已就绪</div>
                          <div className="text-[10px] text-stone-400 mt-0.5">
                            AI 重构时将锁定面容五官并注入形体比例
                          </div>
                        </div>
                        <div className="flex flex-col gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="px-2 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 text-[10px] font-bold rounded-lg transition-colors cursor-pointer"
                          >
                            替换照片
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedPhotoBase64('');
                              if (avatar) avatar.originalImageUrl = '';
                              setHairstyleMode('CUSTOM');
                              showToast('已移除真人照片，重构将使用东方青年自然面容', 'info');
                            }}
                            className="px-2 py-1 text-[#D63031] hover:bg-rose-50 text-[10px] font-bold rounded-lg transition-colors cursor-pointer text-center"
                          >
                            移除照片
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        className="p-3 border-2 border-dashed border-[#EAE6DF] hover:border-stone-400 rounded-xl text-center cursor-pointer transition-colors bg-[#FAF8F5]/60 hover:bg-white"
                      >
                        <Upload className="w-4 h-4 text-stone-400 mx-auto mb-1" />
                        <span className="text-xs font-bold text-stone-700 block">点击上传正面生活照 (全身或半身)</span>
                        <span className="text-[9px] text-stone-400 block mt-0.5">
                          AI 将 100% 提取并保留您的真实面容五官与发型
                        </span>
                      </div>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handlePhotoSelect}
                    />
                  </div>
                </div>

                {/* 5. 一键 AI 重构专属模特核心 CTA */}
                <div className="space-y-2 pt-2">
                  {reconstructProgress !== null && (
                    <div className="space-y-1.5 p-3 bg-[#FAF8F5] rounded-xl border border-[#EAE6DF] animate-in fade-in">
                      <div className="flex items-center justify-between text-[11px] font-bold">
                        <span className="text-stone-700 flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-[#D63031] animate-spin" />
                          <span>{reconstructStageText}</span>
                        </span>
                        <span className="font-mono text-[#D63031]">{reconstructProgress}%</span>
                      </div>
                      <div className="w-full h-2 bg-stone-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-[#D63031] to-[#E17055] transition-all duration-300 rounded-full"
                          style={{ width: `${reconstructProgress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {reconstructMsg && (
                    <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2 animate-in fade-in">
                      <Check className="w-4 h-4 stroke-[2]" />
                      <span>{reconstructMsg}</span>
                    </div>
                  )}
                  {reconstructErr && (
                    <div className="p-2 bg-rose-50 border border-rose-200 text-[#D63031] text-xs font-bold rounded-xl">
                      {reconstructErr}
                    </div>
                  )}

                  <button
                    type="button"
                    disabled={isReconstructing}
                    onClick={handleReconstructAvatar}
                    className="w-full py-3 bg-gradient-to-r from-[#D63031] to-[#E17055] hover:from-[#c0392b] hover:to-[#d63031] text-white rounded-2xl text-xs font-extrabold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <Sparkles className={`w-4 h-4 ${isReconstructing ? 'animate-spin' : ''}`} />
                    <span>
                      {isReconstructing ? 'AI 正基于五维身材与面容重塑中...' : '✨ 一键 AI 重构专属模特 (消耗 1 算力)'}
                    </span>
                  </button>
                  <p className="text-[9px] text-stone-400 text-center">
                    同时同步右侧五维三围、体型形态与左侧发型面容，生成 3:4 专属 A-Pose 素体
                  </p>
                </div>
              </div>

              {/* ======================================================== */}
              {/* 右栏 (58%): 性别 + 5 大体型智能联动 + 五维滑块 + 纯保存 */}
              {/* ======================================================== */}
              <div className="lg:col-span-7 space-y-5">
                
                {/* 1. 性别切换与黄金比例快捷胶囊 */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#FAF8F5] p-3 rounded-2xl border border-[#EAE6DF]">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-extrabold text-stone-900">精准身材与解剖参数</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-md font-mono bg-white border border-[#EAE6DF] text-stone-600 font-bold">
                        {gender === 'FEMALE' ? '女性模式' : '男性模式'}
                      </span>
                    </div>
                    <p className="text-[10px] text-stone-400 mt-0.5">三围数值自动防抖推导体型，亦可选择体型反向赋三围</p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <div className="flex items-center bg-white p-0.5 rounded-xl border border-[#EAE6DF]">
                      <button
                        type="button"
                        onClick={() => handleToggleGender('FEMALE')}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          gender === 'FEMALE'
                            ? 'bg-[#D63031] text-white shadow-2xs'
                            : 'text-stone-600 hover:text-stone-900'
                        }`}
                      >
                        女性
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleGender('MALE')}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          gender === 'MALE'
                            ? 'bg-[#2D3436] text-white shadow-2xs'
                            : 'text-stone-600 hover:text-stone-900'
                        }`}
                      >
                        男性
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={handleApplyGolden}
                      className="px-3 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                      title="根据身高一键计算黄金三围"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-600 stroke-[1.75]" />
                      <span>黄金比例</span>
                    </button>
                  </div>
                </div>

                {/* 2. 五大体型智能联动卡片 (双向推导) */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h5 className="text-xs font-extrabold text-stone-800 flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5 text-[#D63031]" />
                      <span>智能体型形态联动</span>
                    </h5>
                    <span className="text-[10px] text-[#D63031] font-bold">
                      当前三围智能推导: {currentDerivedBodyType}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                    {(gender === 'FEMALE' ? FEMALE_BODY_TYPE_CONFIGS : MALE_BODY_TYPE_CONFIGS).map((bt) => {
                      const isSelected = bodyType === bt.key;
                      const isDerived = currentDerivedBodyType === bt.key;
                      return (
                        <button
                          key={bt.key}
                          type="button"
                          onClick={() => handleSelectBodyType(bt.key)}
                          className={`p-2.5 rounded-2xl border text-left transition-all relative cursor-pointer ${
                            isSelected
                              ? 'bg-rose-50/90 border-[#D63031] ring-1 ring-[#D63031] shadow-2xs'
                              : 'bg-white border-[#EAE6DF] hover:border-stone-400'
                          }`}
                        >
                          {isDerived && (
                            <span className="absolute -top-1.5 right-1.5 text-[8px] font-extrabold px-1.5 py-0.2 rounded-full bg-[#D63031] text-white">
                              智能推导
                            </span>
                          )}
                          <div className="text-xs font-extrabold text-stone-800">{bt.label}</div>
                          <div className="text-[9px] text-stone-400 leading-tight mt-1 line-clamp-2">
                            {bt.desc}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 3. 精准五维三围滑块 (带分类、BMI 胶囊与 WHR 胶囊) */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h5 className="text-xs font-extrabold text-stone-800">五维三围尺寸精度微调</h5>
                    <span className="text-[10px] text-stone-400">支持 1cm/1kg 级精细调节</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* 身高 */}
                    <div className="bg-[#FAF8F5] p-3 rounded-2xl border border-[#EAE6DF] space-y-1.5">
                      <div className="flex justify-between items-center text-xs font-bold">
                        <span className="text-stone-600">身高</span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] px-1.5 py-0.2 rounded font-bold bg-white text-stone-600 border border-[#EAE6DF]">
                            {heightCm < 160 ? '娇小玲珑' : heightCm > 172 ? '高挑修长' : '匀称标准'}
                          </span>
                          <span className="font-mono text-[#D63031] font-extrabold">{heightCm} cm</span>
                        </div>
                      </div>
                      <input
                        type="range"
                        min="140"
                        max="210"
                        value={heightCm}
                        onChange={(e) => setHeightCm(Number(e.target.value))}
                        className="w-full accent-[#D63031] cursor-pointer"
                      />
                    </div>

                    {/* 体重 + 实时 BMI 胶囊 */}
                    <div className="bg-[#FAF8F5] p-3 rounded-2xl border border-[#EAE6DF] space-y-1.5">
                      <div className="flex justify-between items-center text-xs font-bold">
                        <span className="text-stone-600">体重</span>
                        <div className="flex items-center gap-1.5">
                          <span
                            className="text-[10px] px-1.5 py-0.2 rounded font-bold text-white"
                            style={{ backgroundColor: bmiInfo.color }}
                          >
                            BMI {bmiInfo.bmi} ({bmiInfo.label})
                          </span>
                          <span className="font-mono text-[#D63031] font-extrabold">{weightKg} kg</span>
                        </div>
                      </div>
                      <input
                        type="range"
                        min="35"
                        max="130"
                        value={weightKg}
                        onChange={(e) => setWeightKg(Number(e.target.value))}
                        className="w-full accent-[#D63031] cursor-pointer"
                      />
                    </div>

                    {/* 胸围 */}
                    <div className="bg-[#FAF8F5] p-3 rounded-2xl border border-[#EAE6DF] space-y-1.5">
                      <div className="flex justify-between items-center text-xs font-bold">
                        <span className="text-stone-600">{gender === 'MALE' ? '胸围 (胸肌)' : '胸围'}</span>
                        <span className="font-mono text-[#D63031] font-extrabold">{bustCm} cm</span>
                      </div>
                      <input
                        type="range"
                        min="60"
                        max="140"
                        value={bustCm}
                        onChange={(e) => setBustCm(Number(e.target.value))}
                        className="w-full accent-[#D63031] cursor-pointer"
                      />
                    </div>

                    {/* 腰围 */}
                    <div className="bg-[#FAF8F5] p-3 rounded-2xl border border-[#EAE6DF] space-y-1.5">
                      <div className="flex justify-between items-center text-xs font-bold">
                        <span className="text-stone-600">腰围</span>
                        <span className="font-mono text-[#D63031] font-extrabold">{waistCm} cm</span>
                      </div>
                      <input
                        type="range"
                        min="45"
                        max="130"
                        value={waistCm}
                        onChange={(e) => setWaistCm(Number(e.target.value))}
                        className="w-full accent-[#D63031] cursor-pointer"
                      />
                    </div>

                    {/* 臀围 + 实时 WHR 腰臀比胶囊 */}
                    <div className="bg-[#FAF8F5] p-3 rounded-2xl border border-[#EAE6DF] space-y-1.5 sm:col-span-2">
                      <div className="flex justify-between items-center text-xs font-bold">
                        <span className="text-stone-600">臀围</span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            腰臀比 {whrInfo.whr} ({whrInfo.label})
                          </span>
                          <span className="font-mono text-[#D63031] font-extrabold">{hipsCm} cm</span>
                        </div>
                      </div>
                      <input
                        type="range"
                        min="65"
                        max="140"
                        value={hipsCm}
                        onChange={(e) => setHipsCm(Number(e.target.value))}
                        className="w-full accent-[#D63031] cursor-pointer"
                      />
                    </div>
                  </div>
                </div>

                {/* 4. 发型解耦与自由切换 (右移配置) */}
                <div className="space-y-2 pt-1 border-t border-[#EAE6DF]">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-stone-800 block">发型偏好与面貌设定</span>
                    <span className="text-[10px] text-stone-400">
                      {hairstyleMode === 'KEEP_PHOTO' ? '1:1 保留原图发型' : '换发不换脸 (面容锁定)'}
                    </span>
                  </div>

                  {/* 首项置顶：保持照片原生发型 (当有照片时优先展示) */}
                  {hasRealPhoto && (
                    <button
                      type="button"
                      onClick={() => {
                        setHairstyleMode('KEEP_PHOTO');
                        showToast('已锁定【保持照片原生发型】', 'info');
                      }}
                      className={`w-full p-2.5 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                        hairstyleMode === 'KEEP_PHOTO'
                          ? 'bg-rose-50 border-[#D63031] shadow-2xs ring-1 ring-[#D63031]'
                          : 'bg-white border-[#EAE6DF] hover:border-stone-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-base">📸</span>
                        <div>
                          <div className="text-xs font-extrabold text-stone-800">保持照片原生发型 (推荐)</div>
                          <div className="text-[10px] text-stone-400 mt-0.5">
                            原汁原味继承生活照发型、长短与个人辨识度
                          </div>
                        </div>
                      </div>
                      {hairstyleMode === 'KEEP_PHOTO' && (
                        <Check className="w-4 h-4 text-[#D63031] stroke-[2.5]" />
                      )}
                    </button>
                  )}

                  {/* 潮流发型库 (响应式 2~4 列排布) */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {(gender === 'FEMALE'
                      ? [
                          { key: 'FRENCH_WAVY_LONG', label: '法式微卷长发' },
                          { key: 'SHOULDER_BOB', label: '及肩波波头' },
                          { key: 'CHIC_SHORT', label: '干练短发' },
                          { key: 'HIGH_PONYTAIL', label: '法式高马尾' },
                        ]
                      : [
                          { key: 'CLEAN_SHORT', label: '清爽短发' },
                          { key: 'KOREAN_SIDE_PART', label: '韩系侧分' },
                          { key: 'BUSINESS_POMPADOUR', label: '商务油头' },
                          { key: 'BUZZ_CUT', label: '清爽寸头' },
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
                            showToast(`已选择发型【${hs.label}】`, 'info');
                          }}
                          className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-rose-50/80 border-[#D63031] ring-1 ring-[#D63031] text-[#D63031]'
                              : 'bg-white border-[#EAE6DF] hover:border-stone-300 text-stone-700'
                          }`}
                        >
                          <div className="text-[11px] font-bold truncate">{hs.label}</div>
                          <div className="text-[9px] text-stone-400 mt-0.5">
                            {isSelected ? '✓ 换发不换脸' : '选择发型'}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 5. 肤色基调偏好 (右移配置) */}
                <div className="space-y-1.5 pt-1 border-t border-[#EAE6DF]">
                  <span className="text-xs font-extrabold text-stone-800 block">肤色基调偏好</span>
                  <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
                    {SKIN_TONE_CONFIGS.map((st) => {
                      const isSelected = skinTone === st.key;
                      return (
                        <button
                          key={st.key}
                          type="button"
                          onClick={() => setSkinTone(st.key)}
                          title={st.label}
                          className={`py-2 px-1.5 rounded-xl border text-[10px] font-bold flex flex-col items-center gap-1 transition-all cursor-pointer ${
                            isSelected
                              ? 'ring-2 ring-[#D63031] border-stone-800 bg-rose-50/50 text-[#D63031]'
                              : 'border-[#EAE6DF] hover:border-stone-400 bg-white text-stone-700'
                          }`}
                        >
                          <span
                            className="w-4 h-4 rounded-full border border-black/10 shrink-0"
                            style={{ backgroundColor: st.hex }}
                          />
                          <span className="truncate w-full text-center">{st.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 6. 右侧底部独立保存操作栏 (PC 端常驻，移动端由吸底操作栏统一承载) */}
                <div className="pt-2 hidden md:flex items-center justify-between border-t border-[#EAE6DF]">
                  <div className="text-[10px] text-stone-400">
                    只想修改三围？点击此处纯保存，不消耗任何算力
                  </div>
                  <button
                    type="button"
                    disabled={isBodySaving}
                    onClick={handleSaveOnlyBody}
                    className="px-5 py-2.5 bg-stone-900 hover:bg-black text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>{isBodySaving ? '正在保存...' : '💾 仅保存身材数据 (0 算力)'}</span>
                  </button>
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: 多角色档案管理 */}
          {activeTab === 'PROFILES' && (
            <div className="max-w-3xl mx-auto space-y-5 animate-in fade-in text-left w-full">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-extrabold text-stone-800">家庭与好友身材档案</h4>
                  <p className="text-[10px] text-stone-400">一键切换不同人物模特，各自独立保存身材与试穿搭配</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCreatingProfile(true)}
                  className="px-3 py-1.5 bg-[#D63031] hover:bg-[#c0392b] text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-xs transition-colors"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[2]" />
                  <span>添加新成员</span>
                </button>
              </div>

              {isCreatingProfile && (
                <form onSubmit={handleCreateProfile} className="p-4 bg-[#FAF8F5] rounded-2xl border border-[#EAE6DF] space-y-3">
                  <div className="text-xs font-extrabold text-stone-900">创建新角色档案</div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
 placeholder="角色名称 (如: 男友 / 闺蜜)"
 value={newProfileName}
 onChange={(e) => setNewProfileName(e.target.value)}
 className="bg-white border border-[#EAE6DF] rounded-xl px-3 py-1.5 text-xs text-stone-800 focus:outline-none"
 required
 />
 <select
 value={newProfileGender}
 onChange={(e) => setNewProfileGender(e.target.value as any)}
 className="bg-white border border-[#EAE6DF] rounded-xl px-3 py-1.5 text-xs text-stone-800 font-bold focus:outline-none"
 >
 <option value="FEMALE">女性角色</option>
 <option value="MALE">男性角色</option>
 </select>
 </div>
 <div className="flex gap-2">
 <button
 type="button"
 onClick={() => setIsCreatingProfile(false)}
 className="flex-1 py-1.5 bg-stone-200 text-stone-700 rounded-xl text-xs font-bold"
 >
 取消
 </button>
 <button
 type="submit"
 className="flex-1 py-1.5 bg-stone-900 text-white rounded-xl text-xs font-bold"
 >
 确认创建
 </button>
 </div>
 </form>
 )}

 <div className="space-y-2">
 {profiles.map((p) => {
 const isCurrent = currentProfile?.id === p.id;
 return (
 <div
 key={p.id}
 className={`p-3.5 rounded-2xl border flex items-center justify-between transition-all ${
 isCurrent
 ? 'bg-rose-50/50 border-[#D63031] shadow-xs'
 : 'bg-white border-[#EAE6DF] hover:bg-stone-50'
 }`}
 >
 <div className="flex items-center gap-3">
 <div className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center font-bold text-xs text-stone-700">
 {p.name[0]}
 </div>
 <div>
 <div className="flex items-center gap-2">
 <span className="text-xs font-extrabold text-stone-900">{p.name}</span>
 {p.isDefault && (
 <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-stone-100 text-stone-600">
 默认
 </span>
 )}
 </div>
 <p className="text-[10px] text-stone-400">
 {p.gender === 'FEMALE' ? '女性' : '男性'} · {p.heightCm}cm / {p.weightKg}kg · 三围: {p.bustCm}/{p.waistCm}/{p.hipsCm}
 </p>
 </div>
 </div>

 <button
 type="button"
 onClick={() => onSelectProfile(p)}
 className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
 isCurrent
 ? 'bg-[#D63031] text-white shadow-2xs'
 : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
 }`}
 >
 {isCurrent ? '当前使用中' : '切换到该角色'}
 </button>
 </div>
 );
 })}
 </div>
 </div>
 )}

 {/* TAB 4: 积分与流水 */}
 {activeTab === 'CREDITS' && (
            <div className="max-w-3xl mx-auto space-y-5 animate-in fade-in text-left w-full">
 <div className="p-4 bg-[#FAF8F5] rounded-2xl border border-[#EAE6DF] grid grid-cols-3 gap-2 text-center">
 <div>
 <span className="text-[10px] text-stone-400 block font-bold">每日免费积分</span>
 <span className="text-xl font-extrabold text-stone-900 font-mono">
 {ledgerData?.dailyCredits ?? user.dailyCredits}
 </span>
 </div>
 <div>
 <span className="text-[10px] text-stone-400 block font-bold">永久充值积分</span>
 <span className="text-xl font-extrabold text-amber-600 font-mono">
 +{ledgerData?.permanentCredits ?? user.permanentCredits}
 </span>
 </div>
 <div>
 <span className="text-[10px] text-stone-400 block font-bold">总可用积分</span>
 <span className="text-xl font-extrabold text-[#D63031] font-mono">
 {ledgerData?.totalCredits ?? user.dailyCredits + user.permanentCredits}
 </span>
 </div>
 </div>

 <div className="space-y-2">
 <h5 className="text-xs font-extrabold text-stone-800">近期收支明细</h5>
 <div className="max-h-60 overflow-y-auto space-y-1.5 scrollbar-thin">
 {isLedgerLoading ? (
 <div className="text-center py-6 text-xs text-stone-400">加载流水中...</div>
 ) : ledgerData?.ledger?.length ? (
 ledgerData.ledger.map((item) => (
 <div
 key={item.id}
 className="p-2.5 bg-white rounded-xl border border-[#EAE6DF] flex items-center justify-between text-xs"
 >
 <div>
 <div className="font-bold text-stone-800">{item.description}</div>
 <div className="text-[10px] text-stone-400 font-mono">
 {new Date(item.createdAt).toLocaleString()}
 </div>
 </div>
 <div className="font-mono font-bold">
 {item.deltaDaily !== 0 && (
 <span className={item.deltaDaily > 0 ? 'text-emerald-600' : 'text-[#D63031]'}>
 {item.deltaDaily > 0 ? `+${item.deltaDaily}` : item.deltaDaily}
 </span>
 )}
 {item.deltaPermanent !== 0 && (
 <span className="text-amber-600 ml-1">
 {item.deltaPermanent > 0 ? `+${item.deltaPermanent}` : item.deltaPermanent} (永)
 </span>
 )}
 </div>
 </div>
 ))
 ) : (
 <div className="text-center py-6 text-xs text-stone-400">暂无积分变动记录</div>
 )}
 </div>
 </div>
 </div>
 )}

 {/* TAB 5: 账号安全 */}
 {activeTab === 'SECURITY' && (
            <div className="max-w-3xl mx-auto space-y-5 animate-in fade-in text-left w-full">
 {/* 昵称修改 */}
 <div className="p-4 bg-[#FAF8F5] rounded-2xl border border-[#EAE6DF] space-y-3">
 <h5 className="text-xs font-extrabold text-stone-800">修改用户昵称</h5>
 <div className="flex gap-2">
 <input
 type="text"
 value={nickname}
 onChange={(e) => setNickname(e.target.value)}
 className="flex-1 bg-white border border-[#EAE6DF] rounded-xl px-3 py-1.5 text-xs text-stone-800 focus:outline-none"
 placeholder="输入新昵称"
 />
 <button
 type="button"
 onClick={handleUpdateNickname}
 className="px-4 py-1.5 bg-stone-900 hover:bg-black text-white rounded-xl text-xs font-bold transition-colors"
 >
 保存昵称
 </button>
 </div>
 </div>

 {/* 密码修改 */}
 <form onSubmit={handleChangePassword} className="p-4 bg-[#FAF8F5] rounded-2xl border border-[#EAE6DF] space-y-3">
 <h5 className="text-xs font-extrabold text-stone-800">修改登录密码</h5>
 <div className="space-y-2">
 <input
 type="password"
 value={oldPass}
 onChange={(e) => setOldPass(e.target.value)}
 className="w-full bg-white border border-[#EAE6DF] rounded-xl px-3 py-1.5 text-xs text-stone-800 focus:outline-none"
 placeholder="当前密码"
 required
 />
 <input
 type="password"
 value={newPass}
 onChange={(e) => setNewPass(e.target.value)}
 className="w-full bg-white border border-[#EAE6DF] rounded-xl px-3 py-1.5 text-xs text-stone-800 focus:outline-none"
 placeholder="新密码 (不少于6位)"
 required
 />
 <input
 type="password"
 value={confirmPass}
 onChange={(e) => setConfirmPass(e.target.value)}
 className="w-full bg-white border border-[#EAE6DF] rounded-xl px-3 py-1.5 text-xs text-stone-800 focus:outline-none"
 placeholder="确认新密码"
 required
 />
 </div>

 {securityMsg && <div className="text-xs font-bold text-emerald-600">{securityMsg}</div>}
 {securityErr && <div className="text-xs font-bold text-[#D63031]">{securityErr}</div>}

 <button
 type="submit"
 className="w-full py-2 bg-stone-900 hover:bg-black text-white rounded-xl text-xs font-bold transition-colors"
 >
 确认修改密码
 </button>
 </form>
 </div>
 )}
 </div>

 {/* 移动端专属吸底操作栏 (位于滚动容器外部，常驻吸附于弹窗底部) */}
 {activeTab === 'WORKSHOP' && (
 <div className="md:hidden border-t border-[#EAE6DF] bg-white/95 backdrop-blur-md px-4 py-2.5 flex items-center gap-2.5 shadow-lg pb-[max(env(safe-area-inset-bottom),0.75rem)] z-20 shrink-0">
 <button
 type="button"
 disabled={isBodySaving}
 onClick={handleSaveOnlyBody}
 className="flex-1 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 border border-stone-200"
 >
 <Check className="w-3.5 h-3.5" />
 <span>{isBodySaving ? '保存中...' : '仅保存 (0算力)'}</span>
 </button>
 <button
 type="button"
 disabled={isReconstructing}
 onClick={handleReconstructAvatar}
 className="flex-[1.3] py-2.5 bg-gradient-to-r from-[#D63031] to-[#E17055] text-white rounded-xl text-xs font-extrabold shadow-md flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
 >
 <Sparkles className={`w-3.5 h-3.5 ${isReconstructing ? 'animate-spin' : ''}`} />
 <span>{isReconstructing ? 'AI重塑中...' : '✨ 重构模特 (1算力)'}</span>
 </button>
 </div>
 )}
 </div>
 </div>
 );
};
