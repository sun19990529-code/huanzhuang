import { showToast } from '../components/Toast';
import React, { useState, useEffect } from 'react';
import {
 UserProfile,
 UserAvatar,
 calculateGoldenRatioBody,
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
} from 'lucide-react';
import {
 CurrentUser,
 CreditLedgerItem,
 changePassword,
 updateProfileInfo,
 updateProfile,
 createProfile,
 uploadAvatarAsset,
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

// 女性与男性体型形态
const FEMALE_BODY_TYPES = [
 { key: 'HOURGLASS', label: '沙漏型', desc: '胸臀丰满，细腰明显' },
 { key: 'PEAR', label: '梨型', desc: '肩窄腰细，臀部丰满' },
 { key: 'RECTANGLE', label: 'H 矩形', desc: '胸腰臀线条平缓匀称' },
 { key: 'INVERTED_TRIANGLE', label: '倒三角', desc: '肩部较宽，下身纤细' },
 { key: 'APPLE', label: '苹果型', desc: '上身圆润，腰腹饱满' },
];

const MALE_BODY_TYPES = [
 { key: 'ATHLETIC', label: '倒三角健美型', desc: '宽肩阔背，紧实细腰' },
 { key: 'AVERAGE', label: '匀称标准型', desc: '比例协调，线条自然' },
 { key: 'SLIM', label: '修长消瘦型', desc: '骨架细长，清瘦轻盈' },
 { key: 'ROBUST', label: '微胖丰满型', desc: '骨架厚实，体态饱满' },
];

// 肤色基调
const SKIN_TONES = [
 { key: 'FAIR', label: '冷白皮', hex: '#FDF1E7' },
 { key: 'WARM_NATURAL', label: '自然暖杏', hex: '#F3DEC9' },
 { key: 'WHEAT_TAN', label: '健康小麦', hex: '#DDB68F' },
 { key: 'BRONZE_DEEP', label: '古铜深色', hex: '#9C7A5B' },
];

// 发型偏好
const FEMALE_HAIRSTYLES = [
 { key: 'FRENCH_WAVY_LONG', label: '法式微卷长发' },
 { key: 'SHOULDER_BOB', label: '及肩波波头' },
 { key: 'CHIC_SHORT', label: '干练短发' },
 { key: 'HIGH_PONYTAIL', label: '法式高马尾' },
];

const MALE_HAIRSTYLES = [
 { key: 'CLEAN_SHORT', label: '清爽短发' },
 { key: 'KOREAN_SIDE_PART', label: '韩系侧分' },
 { key: 'BUSINESS_POMPADOUR', label: '商务油头' },
 { key: 'BUZZ_CUT', label: '清爽寸头' },
];

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
 const [activeTab, setActiveTab] = useState<'BODY' | 'AVATAR' | 'SECURITY' | 'PROFILES' | 'CREDITS' | 'PRIVACY'>('BODY');

 // 身材参数状态
 const [gender, setGender] = useState<'FEMALE' | 'MALE'>(currentProfile?.gender === 'MALE' ? 'MALE' : 'FEMALE');
 const [heightCm, setHeightCm] = useState(currentProfile?.heightCm || 168);
 const [weightKg, setWeightKg] = useState(currentProfile?.weightKg || 50);
 const [bustCm, setBustCm] = useState(currentProfile?.bustCm || 84);
 const [waistCm, setWaistCm] = useState(currentProfile?.waistCm || 62);
 const [hipsCm, setHipsCm] = useState(currentProfile?.hipsCm || 89);
 const [bodyType, setBodyType] = useState<string>((currentProfile as any)?.bodyType || 'HOURGLASS');
 const [skinTone, setSkinTone] = useState<string>((currentProfile as any)?.skinTone || 'WARM_NATURAL');
 const [hairstyle, setHairstyle] = useState<string>((currentProfile as any)?.hairstyle || 'FRENCH_WAVY_LONG');

 const [bodySaveMsg, setBodySaveMsg] = useState('');
 const [isAiRegenerating, setIsAiRegenerating] = useState(false);

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

 // 模特工坊重新上传
 const [isAvatarGenerating, setIsAvatarGenerating] = useState(false);
 const [avatarUploadProgress, setAvatarUploadProgress] = useState<number | null>(null);
 const [avatarUploadStageText, setAvatarUploadStageText] = useState('');
 const [avatarUploadMsg, setAvatarUploadMsg] = useState('');
 const [avatarUploadErr, setAvatarUploadErr] = useState('');

 // 新建家庭成员状态
 const [isCreatingProfile, setIsCreatingProfile] = useState(false);
 const [newProfileName, setNewProfileName] = useState('');
 const [newProfileGender, setNewProfileGender] = useState<'FEMALE' | 'MALE'>('FEMALE');

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
 }
 }, [currentProfile]);

 useEffect(() => {
 if (user) {
 setNickname(user.nickname);
 }
 }, [user]);

 useEffect(() => {
 if (activeTab === 'CREDITS') {
 loadLedger();
 }
 }, [activeTab]);

 useEffect(() => {
 const handleKeyDown = (e: KeyboardEvent) => {
 if (e.key === 'Escape' && isOpen) onClose();
 };
 window.addEventListener('keydown', handleKeyDown);
 return () => window.removeEventListener('keydown', handleKeyDown);
 }, [isOpen, onClose]);

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

 if (!isOpen || !user) return null;

 // 切换性别
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

 // 一键黄金比例
 const handleApplyGolden = () => {
 const golden = calculateGoldenRatioBody(gender, heightCm);
 setWeightKg(golden.weightKg);
 setBustCm(golden.bustCm);
 setWaistCm(golden.waistCm);
 setHipsCm(golden.hipsCm);
 };

 // 保存身材参数
 const handleSaveBody = async () => {
 if (!currentProfile) return;
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
 } as any);
 onProfileUpdated(updated);
 setBodySaveMsg('身材参数已成功保存并同步至试衣间');
 setTimeout(() => setBodySaveMsg(''), 3000);
 } catch (err: any) {
 alert(err.message || '保存失败');
 }
 };

 // 基于五维身材一键 AI 高清重构模特
 const handleAiRegenerateAvatar = async () => {
 if (!currentProfile) return;
 setIsAiRegenerating(true);
 setBodySaveMsg('');
 try {
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
 });
 onProfileUpdated(res.profile);
 onAvatarUpdated(res.avatar);
 if (user) {
 onUserUpdated({ ...user, dailyCredits: res.remainingDailyCredits });
 }
 setBodySaveMsg(' 已成功根据您的五维参数与体型生成专属 A-Pose 模特！');
 setTimeout(() => setBodySaveMsg(''), 4000);
 } catch (err: any) {
 alert(err.message || 'AI 模特重塑失败');
 } finally {
 setIsAiRegenerating(false);
 }
 };

 // 拍照上传全身照更新素体
 const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
 const file = e.target.files?.[0];
 if (!file || !currentProfile) return;

 setIsAvatarGenerating(true);
 setAvatarUploadProgress(15);
 setAvatarUploadStageText('正在提取面部五官与发型廓形...');
 setAvatarUploadErr('');
 setAvatarUploadMsg('');

 const timer1 = setTimeout(() => {
 setAvatarUploadProgress(45);
 setAvatarUploadStageText('正在结合五维身材参数进行 3:4 解剖重构...');
 }, 4000);

 const timer2 = setTimeout(() => {
 setAvatarUploadProgress(75);
 setAvatarUploadStageText('gemini-3.1-flash-image 正在渲染 3:4 标准 A-Pose 素体...');
 }, 12000);

 try {
 const newAvatar = await uploadAvatarAsset(currentProfile.id, file);
 clearTimeout(timer1);
 clearTimeout(timer2);
 setAvatarUploadProgress(100);
 setAvatarUploadStageText('A-Pose 素体模特重构完成！');
 onAvatarUpdated(newAvatar);
 setAvatarUploadMsg('模特素体已重新生成并装载');
 setTimeout(() => {
 setAvatarUploadProgress(null);
 }, 1200);
 } catch (err: any) {
 clearTimeout(timer1);
 clearTimeout(timer2);
 setAvatarUploadProgress(null);
 setAvatarUploadErr(err.message || '模特素体生成失败');
 } finally {
 setIsAvatarGenerating(false);
 }
 };

 // 修改昵称
 const handleUpdateNickname = async () => {
 if (!nickname.trim()) return;
 try {
 const res = await updateProfileInfo(nickname.trim());
 onUserUpdated({ ...user, nickname: res.nickname });
 setSecurityMsg('昵称修改成功');
 setTimeout(() => setSecurityMsg(''), 3000);
 } catch (err: any) {
 setSecurityErr(err.message || '修改昵称失败');
 }
 };

 // 修改密码
 const handleChangePassword = async (e: React.FormEvent) => {
 e.preventDefault();
 setSecurityErr('');
 setSecurityMsg('');

 if (newPass !== confirmPass) {
 setSecurityErr('两次输入的新密码不一致');
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
 setSecurityErr(err.message || '修改密码失败');
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
 alert(err.message || '创建角色失败');
 }
 };

 // 是否上传过真人全身照
 const hasRealPhoto = Boolean(avatar?.originalImageUrl && avatar.originalImageUrl.startsWith('data:image'));

 return (
 <div
 onClick={(e) => {
 if (e.target === e.currentTarget) onClose();
 }}
 className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 pb-8 md:pb-4 animate-in fade-in"
 >
 <div className="bg-white rounded-3xl border border-[#EAE6DF] shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden text-left">
 
 {/* Header */}
 <div className="px-6 py-4 border-b border-[#EAE6DF] flex items-center justify-between bg-[#FAF8F5]/80">
 <div className="flex items-center gap-2.5">
 <div className="w-8 h-8 rounded-xl bg-stone-900 text-white flex items-center justify-center">
 <Sliders className="w-4 h-4 stroke-[1.75]" />
 </div>
 <div>
 <h3 className="text-sm font-extrabold text-stone-900">个性化设置与身材工坊</h3>
 <p className="text-[10px] text-stone-400">精确三围解剖 · 性别与体型偏好 · 账户安全</p>
 </div>
 </div>
 <button
 onClick={onClose}
 className="p-1.5 rounded-xl hover:bg-stone-100 text-stone-400 hover:text-stone-700 transition-colors"
 >
 <X className="w-4 h-4 stroke-[2]" />
 </button>
 </div>

 {/* Tab 导航 */}
 <div className="flex items-center gap-1 px-6 pt-3 border-b border-[#EAE6DF] bg-white overflow-x-auto scrollbar-none">
 {[
 { key: 'BODY', label: '身材与模特', icon: Ruler },
 { key: 'AVATAR', label: '真人照片重构', icon: Camera },
 { key: 'PROFILES', label: '多角色档案', icon: Users },
 { key: 'CREDITS', label: '积分与流水', icon: CreditCard },
 { key: 'SECURITY', label: '账号安全', icon: Shield },
 ].map((tab) => {
 const Icon = tab.icon;
 const isActive = activeTab === tab.key;
 return (
 <button
 key={tab.key}
 onClick={() => setActiveTab(tab.key as any)}
 className={`flex items-center gap-1.5 px-3.5 py-2 border-b-2 text-xs font-bold transition-all whitespace-nowrap ${
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
 <div className="p-6 overflow-y-auto space-y-6 flex-1 scrollbar-thin">
 
 {/* TAB 1: 身材与模特 (Gender + 5D Sliders + Morphology + Skin Tone + Hairstyle) */}
 {activeTab === 'BODY' && (
 <div className="space-y-5 animate-in fade-in">
 
 {/* 顶部性别切换与黄金比例重算 */}
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#FAF8F5] p-3.5 rounded-2xl border border-[#EAE6DF]">
 <div>
 <div className="flex items-center gap-2">
 <span className="text-xs font-extrabold text-stone-900">当前档案: {currentProfile?.name}</span>
 <span className="text-[10px] px-2 py-0.5 rounded-md font-mono bg-white border border-[#EAE6DF] text-stone-600 font-bold">
 {gender === 'FEMALE' ? '女性' : '男性'}
 </span>
 </div>
 <p className="text-[10px] text-stone-400 mt-0.5">切换性别自动联动专属黄金身材比例与 A-Pose 模特</p>
 </div>

 <div className="flex items-center gap-2 shrink-0">
 {/* 性别选择胶囊 */}
 <div className="flex items-center bg-white p-0.5 rounded-xl border border-[#EAE6DF]">
 <button
 type="button"
 onClick={() => handleToggleGender('FEMALE')}
 className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
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
 className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
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
 className="px-3 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl text-xs font-bold transition-colors flex items-center gap-1"
 title="根据身高一键计算黄金三围"
 >
 <Sparkles className="w-3.5 h-3.5 text-amber-600 stroke-[1.75]" />
 <span>黄金比例</span>
 </button>
 </div>
 </div>

 {/* 五维身材参数滑动器 */}
 <div className="space-y-2">
 <h5 className="text-xs font-extrabold text-stone-800">精确五维身材尺寸</h5>
 <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
 <div className="bg-[#FAF8F5] p-3 rounded-2xl border border-[#EAE6DF] space-y-1">
 <div className="flex justify-between text-xs font-bold">
 <span className="text-stone-600">身高</span>
 <span className="font-mono text-[#D63031]">{heightCm} cm</span>
 </div>
 <input
 type="range"
 min="140"
 max="210"
 value={heightCm}
 onChange={(e) => setHeightCm(Number(e.target.value))}
 className="w-full accent-[#D63031]"
 />
 </div>

 <div className="bg-[#FAF8F5] p-3 rounded-2xl border border-[#EAE6DF] space-y-1">
 <div className="flex justify-between text-xs font-bold">
 <span className="text-stone-600">体重</span>
 <span className="font-mono text-[#D63031]">{weightKg} kg</span>
 </div>
 <input
 type="range"
 min="35"
 max="130"
 value={weightKg}
 onChange={(e) => setWeightKg(Number(e.target.value))}
 className="w-full accent-[#D63031]"
 />
 </div>

 <div className="bg-[#FAF8F5] p-3 rounded-2xl border border-[#EAE6DF] space-y-1">
 <div className="flex justify-between text-xs font-bold">
 <span className="text-stone-600">{gender === 'MALE' ? '胸围 (胸肌)' : '胸围'}</span>
 <span className="font-mono text-[#D63031]">{bustCm} cm</span>
 </div>
 <input
 type="range"
 min="60"
 max="140"
 value={bustCm}
 onChange={(e) => setBustCm(Number(e.target.value))}
 className="w-full accent-[#D63031]"
 />
 </div>

 <div className="bg-[#FAF8F5] p-3 rounded-2xl border border-[#EAE6DF] space-y-1">
 <div className="flex justify-between text-xs font-bold">
 <span className="text-stone-600">腰围</span>
 <span className="font-mono text-[#D63031]">{waistCm} cm</span>
 </div>
 <input
 type="range"
 min="45"
 max="130"
 value={waistCm}
 onChange={(e) => setWaistCm(Number(e.target.value))}
 className="w-full accent-[#D63031]"
 />
 </div>

 <div className="bg-[#FAF8F5] p-3 rounded-2xl border border-[#EAE6DF] space-y-1 md:col-span-2">
 <div className="flex justify-between text-xs font-bold">
 <span className="text-stone-600">臀围</span>
 <span className="font-mono text-[#D63031]">{hipsCm} cm</span>
 </div>
 <input
 type="range"
 min="65"
 max="140"
 value={hipsCm}
 onChange={(e) => setHipsCm(Number(e.target.value))}
 className="w-full accent-[#D63031]"
 />
 </div>
 </div>
 </div>

 {/* 体型形态特征选择 (未上传真人照片时自由调整) */}
 <div className="space-y-2">
 <div className="flex items-center justify-between">
 <h5 className="text-xs font-extrabold text-stone-800">体型形态特征</h5>
 {hasRealPhoto && (
 <span className="text-[10px] text-emerald-600 font-bold">
 已从真人全身照继承原生体态
 </span>
 )}
 </div>

 <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
 {(gender === 'FEMALE' ? FEMALE_BODY_TYPES : MALE_BODY_TYPES).map((bt) => {
 const isSelected = bodyType === bt.key;
 return (
 <button
 key={bt.key}
 type="button"
 onClick={() => setBodyType(bt.key)}
 className={`p-2.5 rounded-2xl border text-left transition-all ${
 isSelected
 ? 'bg-rose-50/80 border-[#D63031] shadow-2xs'
 : 'bg-white border-[#EAE6DF] hover:border-stone-400'
 }`}
 >
 <div className="text-xs font-extrabold text-stone-800">{bt.label}</div>
 <div className="text-[9px] text-stone-400 leading-tight mt-0.5 line-clamp-1">
 {bt.desc}
 </div>
 </button>
 );
 })}
 </div>
 </div>

 {/* 肤色基调偏好 (未上传照片时自由调节) 与发型偏好 (自由选择) */}
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 {/* 肤色基调 */}
 <div className="space-y-1.5">
 <span className="text-xs font-extrabold text-stone-800 block">肤色基调偏好</span>
 <div className="flex items-center gap-2">
 {SKIN_TONES.map((st) => {
 const isSelected = skinTone === st.key;
 return (
 <button
 key={st.key}
 type="button"
 onClick={() => setSkinTone(st.key)}
 title={st.label}
 className={`flex-1 py-1.5 px-2 rounded-xl border text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all ${
 isSelected
 ? 'ring-2 ring-[#D63031] border-stone-800 shadow-2xs'
 : 'border-[#EAE6DF] hover:border-stone-400'
 }`}
 >
 <span
 className="w-3 h-3 rounded-full border border-black/10 shrink-0"
 style={{ backgroundColor: st.hex }}
 />
 <span>{st.label}</span>
 </button>
 );
 })}
 </div>
 </div>

 {/* 发型偏好 */}
 <div className="space-y-1.5">
 <span className="text-xs font-extrabold text-stone-800 block">发型风格偏好</span>
 <select
 value={hairstyle}
 onChange={(e) => setHairstyle(e.target.value)}
 className="w-full bg-[#FAF8F5] border border-[#EAE6DF] rounded-xl px-3 py-2 text-xs text-stone-800 font-bold focus:outline-none"
 >
 {(gender === 'FEMALE' ? FEMALE_HAIRSTYLES : MALE_HAIRSTYLES).map((hs) => (
 <option key={hs.key} value={hs.key}>
 {hs.label}
 </option>
 ))}
 </select>
 </div>
 </div>

 {bodySaveMsg && (
 <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2 animate-in fade-in">
 <Check className="w-4 h-4 stroke-[2]" />
 <span>{bodySaveMsg}</span>
 </div>
 )}

 {/* 操作按钮区 */}
 <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
 <button
 type="button"
 onClick={handleSaveBody}
 className="flex-1 py-2.5 bg-stone-900 hover:bg-black text-white rounded-xl text-xs font-bold transition-all shadow-xs"
 >
 保存身材并同步至试衣间
 </button>

 <button
 type="button"
 disabled={isAiRegenerating}
 onClick={handleAiRegenerateAvatar}
 className="flex-1 py-2.5 bg-gradient-to-r from-[#D63031] to-[#E17055] hover:from-[#c0392b] hover:to-[#d63031] text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
 >
 <Sparkles className={`w-3.5 h-3.5 stroke-[2] ${isAiRegenerating ? 'animate-spin' : ''}`} />
 <span>{isAiRegenerating ? 'AI 生成重塑中...' : ' 基于五维身材 AI 重构模特'}</span>
 </button>
 </div>
 </div>
 )}

 {/* TAB 2: 真人照片重构 (Photo Upload to Standard Mannequin) */}
 {activeTab === 'AVATAR' && (
 <div className="space-y-6 animate-in fade-in">
 <div className="flex flex-col sm:flex-row gap-6 items-center">
 <div className="w-40 h-56 bg-[#FAF8F5] rounded-2xl border border-[#EAE6DF] flex items-center justify-center overflow-hidden p-2 relative shrink-0 shadow-xs">
 {avatar?.normalizedImageUrl ? (
 <img
 src={avatar.normalizedImageUrl}
 alt="当前模特素体"
 className="max-h-full max-w-full object-contain"
 />
 ) : (
 <div className="text-xs text-stone-400 text-center">暂无模特素体</div>
 )}
 </div>

 <div className="space-y-3 flex-1 text-left">
 <h4 className="text-xs font-extrabold text-stone-800">重新生成正面 A-Pose 素体</h4>
 <p className="text-xs text-stone-500 leading-relaxed">
 上传您的正面全身或半身照，系统将 100% 锁定五官面容与发型，并根据当前五维身材解剖重构为标准试衣模特。
 </p>

 <div className="flex items-center gap-3 pt-2">
 <label className="px-4 py-2 bg-[#2D3436] hover:bg-black text-white rounded-xl text-xs font-bold cursor-pointer transition-colors flex items-center gap-1.5 shadow-xs">
 <Camera className="w-3.5 h-3.5 stroke-[1.75]" />
 <span>{isAvatarGenerating ? '重构生成中...' : '上传全身照片'}</span>
 <input
 type="file"
 accept="image/*"
 disabled={isAvatarGenerating}
 onChange={handleAvatarFileChange}
 className="hidden"
 />
 </label>
 </div>

 {/* 进度条 */}
 {avatarUploadProgress !== null && (
 <div className="space-y-1.5 pt-2 animate-in fade-in">
 <div className="flex items-center justify-between text-[11px] font-bold">
 <span className="text-stone-700 flex items-center gap-1">
 <Sparkles className="w-3 h-3 text-[#D63031] animate-spin" />
 <span>{avatarUploadStageText}</span>
 </span>
 <span className="font-mono text-[#D63031]">{avatarUploadProgress}%</span>
 </div>
 <div className="w-full h-2 bg-[#FAF8F5] rounded-full overflow-hidden border border-[#EAE6DF]">
 <div
 className="h-full bg-gradient-to-r from-[#D63031] to-[#E17055] transition-all duration-300 rounded-full"
 style={{ width: `${avatarUploadProgress}%` }}
 />
 </div>
 </div>
 )}

 {avatarUploadMsg && (
 <div className="text-xs font-bold text-emerald-600 flex items-center gap-1">
 <Check className="w-3.5 h-3.5 stroke-[2]" />
 <span>{avatarUploadMsg}</span>
 </div>
 )}
 {avatarUploadErr && (
 <div className="text-xs font-bold text-[#D63031]">{avatarUploadErr}</div>
 )}
 </div>
 </div>
 </div>
 )}

 {/* TAB 3: 多角色档案管理 */}
 {activeTab === 'PROFILES' && (
 <div className="space-y-5 animate-in fade-in text-left">
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
 <div className="space-y-5 animate-in fade-in text-left">
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
 <div className="space-y-5 animate-in fade-in text-left">
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
 </div>
 </div>
 );
};
