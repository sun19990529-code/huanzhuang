import { showToast } from '../components/Toast';
import React, { useState, useEffect } from 'react';
import {
 ExtendedGarmentItem,
 CurrentUser,
 CreditLedgerItem,
 DashboardStats,
 uploadOfficialGarment,
 updateOfficialGarment,
 toggleOfficialGarmentStatus,
 toggleOfficialGarmentFeatured,
 fetchCmsUsers,
 fetchCmsUserDetails,
 updateCmsUserStatus,
 resetCmsUserPassword,
 updateCmsUserRole,
 adjustUserCredits,
 broadcastCmsCredits,
 fetchCmsLedger,
 fetchCmsDashboardStats,
 resetCreditsAdmin,
} from '../api';
import {
 ShieldCheck,
 Plus,
 ExternalLink,
 Tag,
 Sparkles,
 ShoppingBag,
 Users,
 History,
 Edit,
 Check,
 X,
 RefreshCw,
 Search,
 Lock,
 Star,
 Download,
 AlertTriangle,
 UserCheck,
 UserX,
 KeyRound,
 Coins,
 Send,
 Eye,
 Sliders,
 LogOut,
 ChevronRight,
 TrendingUp,
 Activity,
 Layers,
 Shirt,
 Calendar,
} from 'lucide-react';
import { GarmentCategory } from '@smart-wardrobe/shared';

interface CmsAdminViewProps {
 publicGarments: ExtendedGarmentItem[];
 onRefreshPublicGarments: () => void;
 onLogoutAdmin: () => void;
}

export const CmsAdminView: React.FC<CmsAdminViewProps> = ({
 publicGarments,
 onRefreshPublicGarments,
 onLogoutAdmin,
}) => {
 const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'USERS' | 'GARMENTS' | 'LEDGER'>('DASHBOARD');

 // 大盘统计数据
 const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
 const [isStatsLoading, setIsStatsLoading] = useState(false);

 // 用户大盘列表与检索过滤
 const [usersList, setUsersList] = useState<any[]>([]);
 const [isUsersLoading, setIsUsersLoading] = useState(false);
 const [userSearchQuery, setUserSearchQuery] = useState('');
 const [userStatusFilter, setUserStatusFilter] = useState<'ALL' | 'NORMAL' | 'FROZEN' | 'BANNED'>('ALL');
 const [userRoleFilter, setUserRoleFilter] = useState<'ALL' | 'USER' | 'ADMIN'>('ALL');

 // 用户详情 360° 抽屉状态
 const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
 const [userDetails, setUserDetails] = useState<any | null>(null);
 const [isDetailsLoading, setIsDetailsLoading] = useState(false);

 // 积分调整弹窗状态
 const [adjustTargetUser, setAdjustTargetUser] = useState<any | null>(null);
 const [adjustDeltaDaily, setAdjustDeltaDaily] = useState('50');
 const [adjustDeltaPermanent, setAdjustDeltaPermanent] = useState('0');
 const [adjustReason, setAdjustReason] = useState('官方活动奖励赠送');
 const [isAdjusting, setIsAdjusting] = useState(false);

 // 密码重置弹窗状态
 const [resetPassTargetUser, setResetPassTargetUser] = useState<any | null>(null);
 const [newPasswordVal, setNewPasswordVal] = useState('123456');
 const [isResettingPass, setIsResettingPass] = useState(false);

 // 全员活动积分广播弹窗状态
 const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState(false);
 const [broadcastPermCredits, setBroadcastPermCredits] = useState('20');
 const [broadcastDailyCredits, setBroadcastDailyCredits] = useState('0');
 const [broadcastReason, setBroadcastReason] = useState('早秋法式高定时装周全员活动赠礼');
 const [isBroadcasting, setIsBroadcasting] = useState(false);

 // 官方单品录入弹窗状态
 const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
 const [uploadTitle, setUploadTitle] = useState('');
 const [uploadCategory, setUploadCategory] = useState<GarmentCategory>('TOPS');
 const [uploadSubCategory, setUploadSubCategory] = useState('Evening Dress');
 const [uploadBrand, setUploadBrand] = useState('SmartWardrobe 官方高定');
 const [uploadPriceYuan, setUploadPriceYuan] = useState('299');
 const [uploadBuyUrl, setUploadBuyUrl] = useState('');
 const [uploadImageBase64, setUploadImageBase64] = useState('');
 const [isUploading, setIsUploading] = useState(false);

 // 单品编辑弹窗状态
 const [editingGarment, setEditingGarment] = useState<ExtendedGarmentItem | null>(null);
 const [editTitle, setEditTitle] = useState('');
 const [editBrand, setEditBrand] = useState('');
 const [editPriceYuan, setEditPriceYuan] = useState('');
 const [editBuyUrl, setEditBuyUrl] = useState('');
 const [isSavingEdit, setIsSavingEdit] = useState(false);

 // 全局审计流水
 const [globalLedger, setGlobalLedger] = useState<CreditLedgerItem[]>([]);
 const [ledgerFilterType, setLedgerFilterType] = useState<string>('ALL');
 const [isLedgerLoading, setIsLedgerLoading] = useState(false);

 useEffect(() => {
 loadDashboard();
 }, []);

 useEffect(() => {
 if (activeTab === 'DASHBOARD') {
 loadDashboard();
 } else if (activeTab === 'USERS') {
 loadUsers();
 } else if (activeTab === 'LEDGER') {
 loadLedger();
 }
 }, [activeTab]);

 const loadDashboard = async () => {
 setIsStatsLoading(true);
 try {
 const stats = await fetchCmsDashboardStats();
 setDashboardStats(stats);
 } catch (e: any) {
 console.warn('获取大盘数据失败:', e);
 } finally {
 setIsStatsLoading(false);
 }
 };

 const loadUsers = async () => {
 setIsUsersLoading(true);
 try {
 const data = await fetchCmsUsers();
 setUsersList(data);
 } catch (e: any) {
 alert(e.message || '获取用户列表失败');
 } finally {
 setIsUsersLoading(false);
 }
 };

 const loadLedger = async () => {
 setIsLedgerLoading(true);
 try {
 const data = await fetchCmsLedger();
 setGlobalLedger(data);
 } catch (e: any) {
 alert(e.message || '获取全局流水失败');
 } finally {
 setIsLedgerLoading(false);
 }
 };

 const handleOpenUserDetails = async (userId: string) => {
 setSelectedUserId(userId);
 setIsDetailsLoading(true);
 try {
 const details = await fetchCmsUserDetails(userId);
 setUserDetails(details);
 } catch (e: any) {
 alert(e.message || '获取用户详情失败');
 } finally {
 setIsDetailsLoading(false);
 }
 };

 // 修改用户状态 (NORMAL / FROZEN / BANNED)
 const handleUpdateStatus = async (user: any, newStatus: 'NORMAL' | 'FROZEN' | 'BANNED') => {
 const actionName = newStatus === 'NORMAL' ? '解封恢复' : newStatus === 'FROZEN' ? '冻结账号' : '永久封禁';
 if (!confirm(`确认要将用户【${user.nickname || user.email}】设为【${actionName}】状态吗？`)) return;

 try {
 await updateCmsUserStatus(user.id, newStatus, '管理员后台操作');
 showToast(`用户状态已成功更新为【${actionName}】！`, "info");
 loadUsers();
 if (selectedUserId === user.id) {
 handleOpenUserDetails(user.id);
 }
 } catch (e: any) {
 alert(e.message || '修改状态失败');
 }
 };

 // 重置用户密码
 const handleConfirmResetPassword = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!resetPassTargetUser || !newPasswordVal.trim()) return;

 setIsResettingPass(true);
 try {
 await resetCmsUserPassword(resetPassTargetUser.id, newPasswordVal.trim());
 showToast(`用户【${resetPassTargetUser.nickname}】登录密码已成功重置为: ${newPasswordVal.trim()}`, "info");
 setResetPassTargetUser(null);
 } catch (e: any) {
 alert(e.message || '密码重置失败');
 } finally {
 setIsResettingPass(false);
 }
 };

 // 调整用户积分
 const handleConfirmAdjustCredits = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!adjustTargetUser) return;

 setIsAdjusting(true);
 try {
 await adjustUserCredits(
 adjustTargetUser.id,
 Number(adjustDeltaDaily),
 Number(adjustDeltaPermanent),
 adjustReason.trim() || '管理员手动调控积分'
 );
 showToast('积分调整成功并已记录审计流水！', "info");
 setAdjustTargetUser(null);
 loadUsers();
 if (selectedUserId === adjustTargetUser.id) {
 handleOpenUserDetails(adjustTargetUser.id);
 }
 } catch (e: any) {
 alert(e.message || '调整失败');
 } finally {
 setIsAdjusting(false);
 }
 };

 // 全员活动积分广播
 const handleConfirmBroadcast = async (e: React.FormEvent) => {
 e.preventDefault();
 setIsBroadcasting(true);
 try {
 const res = await broadcastCmsCredits(
 Number(broadcastPermCredits),
 Number(broadcastDailyCredits),
 broadcastReason.trim()
 );
 showToast(`全员活动积分已成功发放给 ${res.count} 位用户！`, "info");
 setIsBroadcastModalOpen(false);
 loadDashboard();
 } catch (e: any) {
 alert(e.message || '发放失败');
 } finally {
 setIsBroadcasting(false);
 }
 };

 // 切换管理员角色
 const handleToggleAdminRole = async (user: any) => {
 const newRole = user.role === 'ADMIN' ? 'USER' : 'ADMIN';
 if (!confirm(`确认要将用户【${user.nickname}】角色修改为【${newRole}】吗？`)) return;

 try {
 await updateCmsUserRole(user.id, newRole);
 showToast(`用户角色已成功修改为 ${newRole}`, "info");
 loadUsers();
 } catch (e: any) {
 alert(e.message || '修改角色失败');
 }
 };

 // 切换单品置顶推荐
 const handleToggleGarmentFeatured = async (garment: ExtendedGarmentItem) => {
 try {
 const featured = await toggleOfficialGarmentFeatured(garment.id);
 onRefreshPublicGarments();
 alert(featured ? '单品已成功置顶到公共试衣间首位！' : '已取消置顶推荐');
 } catch (e: any) {
 alert(e.message || '操作失败');
 }
 };

 // 导出用户 CSV 报表
 const handleExportUsersCsv = () => {
 const headers = ['UID,邮箱,昵称,角色,状态,每日积分,永久积分,总积分,档案数,注册时间'];
 const rows = filteredUsers.map((u) =>
 `"${u.id}","${u.email}","${u.nickname}","${u.role}","${u.status}","${u.dailyCredits}","${u.permanentCredits}","${u.totalCredits}","${u.profilesCount}","${u.createdAt}"`
 );
 const csvContent = 'data:text/csv;charset=utf-8,﻿' + [headers, ...rows].join('\n');
 const encodedUri = encodeURI(csvContent);
 const link = document.createElement('a');
 link.setAttribute('href', encodedUri);
 link.setAttribute('download', `users_report_${new Date().toISOString().split('T')[0]}.csv`);
 document.body.appendChild(link);
 link.click();
 document.body.removeChild(link);
 };

 // 导出全局流水 CSV 报表
 const handleExportLedgerCsv = () => {
 const headers = ['流水号,用户ID,交易类型,每日变动,永久变动,变动后每日余额,变动后永久余额,说明,时间戳'];
 const rows = filteredLedger.map((l) =>
 `"${l.id}","${l.userId}","${l.txType}","${l.deltaDaily}","${l.deltaPermanent}","${l.balanceDailyAfter}","${l.balancePermanentAfter}","${l.description}","${l.createdAt}"`
 );
 const csvContent = 'data:text/csv;charset=utf-8,﻿' + [headers, ...rows].join('\n');
 const encodedUri = encodeURI(csvContent);
 const link = document.createElement('a');
 link.setAttribute('href', encodedUri);
 link.setAttribute('download', `credit_ledger_${new Date().toISOString().split('T')[0]}.csv`);
 document.body.appendChild(link);
 link.click();
 document.body.removeChild(link);
 };

 // 提交官方单品录入
 const handleOfficialUpload = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!uploadTitle.trim()) return;

 setIsUploading(true);
 try {
 await uploadOfficialGarment({
 title: uploadTitle.trim(),
 primaryCategory: uploadCategory,
 subCategory: uploadSubCategory.trim(),
 brand: uploadBrand.trim(),
 priceCents: Math.round(Number(uploadPriceYuan) * 100),
 externalBuyUrl: uploadBuyUrl.trim(),
 imageBase64: uploadImageBase64 || undefined,
 });
 setIsUploadModalOpen(false);
 setUploadTitle('');
 setUploadBuyUrl('');
 setUploadImageBase64('');
 onRefreshPublicGarments();
 showToast('官方公共单品已成功录入！', "info");
 } catch (err: any) {
 alert(err.message || '录入失败');
 } finally {
 setIsUploading(false);
 }
 };

 // 保存单品编辑
 const handleSaveGarmentEdit = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!editingGarment) return;

 setIsSavingEdit(true);
 try {
 await updateOfficialGarment(editingGarment.id, {
 title: editTitle.trim(),
 brand: editBrand.trim(),
 priceCents: Math.round(Number(editPriceYuan) * 100),
 externalBuyUrl: editBuyUrl.trim(),
 });
 setEditingGarment(null);
 onRefreshPublicGarments();
 showToast('单品运营信息已更新！', "info");
 } catch (err: any) {
 alert(err.message || '更新失败');
 } finally {
 setIsSavingEdit(false);
 }
 };

 // 过滤用户列表
 const filteredUsers = usersList.filter((u) => {
 const matchSearch =
 !userSearchQuery ||
 u.email.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
 u.nickname.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
 u.id.toLowerCase().includes(userSearchQuery.toLowerCase());
 const matchStatus = userStatusFilter === 'ALL' || u.status === userStatusFilter;
 const matchRole = userRoleFilter === 'ALL' || u.role === userRoleFilter;
 return matchSearch && matchStatus && matchRole;
 });

 // 过滤流水列表
 const filteredLedger = globalLedger.filter((l) => {
 if (ledgerFilterType === 'ALL') return true;
 return l.txType === ledgerFilterType;
 });

 return (
 <div className="h-full flex flex-col bg-[#FAF8F5] text-stone-800 font-sans select-none overflow-hidden text-left">
 
 {/* ------------------------------------------------------------- */}
 {/* 顶部管理员专业控制台 Header */}
 {/* ------------------------------------------------------------- */}
 <header className="h-16 px-8 border-b border-[#EAE6DF] bg-white/95 backdrop-blur-xl flex items-center justify-between z-30 shrink-0 shadow-2xs">
 <div className="flex items-center gap-3">
 <div className="w-10 h-10 rounded-2xl bg-stone-900 text-[#FAF8F5] flex items-center justify-center shadow-xs">
 <ShieldCheck className="w-5 h-5 stroke-[1.75]" />
 </div>
 <div>
 <div className="flex items-center gap-2">
 <h2 className="text-sm font-extrabold text-stone-900 tracking-tight">
 SmartWardrobe 运营管理中心
 </h2>
 <span className="text-[9px] font-bold font-mono px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
 SuperAdmin (suncraft)
 </span>
 </div>
 <p className="text-[10px] text-stone-400">
 全平台用户生命周期 · 公共衣橱运营 · 全局资金与积分审计
 </p>
 </div>
 </div>

 {/* 4 大核心 Tab 切换 */}
 <div className="flex items-center gap-1.5 bg-[#FAF8F5] p-1 rounded-2xl border border-[#EAE6DF]">
 {[
 { key: 'DASHBOARD', label: '运营总览', icon: Activity },
 { key: 'USERS', label: '用户与权限大盘', icon: Users },
 { key: 'GARMENTS', label: '官方公共单品', icon: ShoppingBag },
 { key: 'LEDGER', label: '全局审计流水', icon: History },
 ].map((tab) => {
 const Icon = tab.icon;
 const isActive = activeTab === tab.key;
 return (
 <button
 key={tab.key}
 onClick={() => setActiveTab(tab.key as any)}
 className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
 isActive
 ? 'bg-[#2D3436] text-white shadow-xs'
 : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100/60'
 }`}
 >
 <Icon className="w-3.5 h-3.5 stroke-[1.75]" />
 <span>{tab.label}</span>
 </button>
 );
 })}
 </div>

 {/* 退出管理员控制台 */}
 <div className="flex items-center gap-2">
 <button
 onClick={onLogoutAdmin}
 className="px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-[#D63031] border border-rose-200/80 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
 >
 <LogOut className="w-3.5 h-3.5 stroke-[1.75]" />
 <span>退出控制台</span>
 </button>
 </div>
 </header>

 {/* ------------------------------------------------------------- */}
 {/* 主工作区 */}
 {/* ------------------------------------------------------------- */}
 <main className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 scrollbar-thin">
 
 {/* ----------------------------------------------------------- */}
 {/* TAB 1: 运营概览大盘 (Dashboard KPI) */}
 {/* ----------------------------------------------------------- */}
 {activeTab === 'DASHBOARD' && (
 <div className="max-w-7xl mx-auto space-y-6">
 
 {/* 4 大核心 KPI 概览卡片 */}
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
 <div className="bg-white rounded-3xl border border-[#EAE6DF] p-5 shadow-xs flex flex-col justify-between space-y-3">
 <div className="flex items-center justify-between">
 <span className="text-xs font-bold text-stone-500">全平台注册用户</span>
 <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
 <Users className="w-4 h-4 stroke-[1.75]" />
 </div>
 </div>
 <div>
 <h3 className="text-3xl font-extrabold text-stone-900 font-mono">
 {dashboardStats?.totalUsers ?? '...'}
 </h3>
 <div className="flex items-center gap-2 mt-1 text-[10px] text-stone-400 font-mono">
 <span className="text-emerald-600">正常: {dashboardStats?.normalUsers ?? 0}</span>
 <span className="text-amber-600">冻结: {dashboardStats?.frozenUsers ?? 0}</span>
 <span className="text-rose-600">封禁: {dashboardStats?.bannedUsers ?? 0}</span>
 </div>
 </div>
 </div>

 <div className="bg-white rounded-3xl border border-[#EAE6DF] p-5 shadow-xs flex flex-col justify-between space-y-3">
 <div className="flex items-center justify-between">
 <span className="text-xs font-bold text-stone-500">累计 AI 试穿任务</span>
 <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
 <Sparkles className="w-4 h-4 stroke-[1.75]" />
 </div>
 </div>
 <div>
 <h3 className="text-3xl font-extrabold text-stone-900 font-mono">
 {dashboardStats?.totalTasks ?? '...'}
 </h3>
 <p className="text-[10px] text-stone-400 mt-1 font-mono">
 累计生成 Lookbook 搭配: {dashboardStats?.totalOutfits ?? 0} 套
 </p>
 </div>
 </div>

 <div className="bg-white rounded-3xl border border-[#EAE6DF] p-5 shadow-xs flex flex-col justify-between space-y-3">
 <div className="flex items-center justify-between">
 <span className="text-xs font-bold text-stone-500">全网积分流通总池</span>
 <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
 <Coins className="w-4 h-4 stroke-[1.75]" />
 </div>
 </div>
 <div>
 <h3 className="text-3xl font-extrabold text-amber-600 font-mono">
 {dashboardStats ? dashboardStats.totalDailyPool + dashboardStats.totalPermanentPool : '...'}
 </h3>
 <div className="flex items-center gap-2 mt-1 text-[10px] text-stone-400 font-mono">
 <span>每日池: {dashboardStats?.totalDailyPool ?? 0}</span>
 <span className="text-amber-700">永久池: {dashboardStats?.totalPermanentPool ?? 0}</span>
 </div>
 </div>
 </div>

 <div className="bg-white rounded-3xl border border-[#EAE6DF] p-5 shadow-xs flex flex-col justify-between space-y-3">
 <div className="flex items-center justify-between">
 <span className="text-xs font-bold text-stone-500">官方公共单品库</span>
 <div className="w-8 h-8 rounded-xl bg-rose-50 text-[#D63031] flex items-center justify-center">
 <Shirt className="w-4 h-4 stroke-[1.75]" />
 </div>
 </div>
 <div>
 <h3 className="text-3xl font-extrabold text-stone-900 font-mono">
 {dashboardStats?.totalPublicGarments ?? '...'}
 </h3>
 <div className="flex items-center gap-2 mt-1 text-[10px] text-stone-400 font-mono">
 <span className="text-emerald-600">在售上架: {dashboardStats?.activePublicGarments ?? 0}</span>
 <span className="text-amber-600">⭐ 置顶爆款: {dashboardStats?.featuredPublicGarments ?? 0}</span>
 </div>
 </div>
 </div>
 </div>

 {/* 运营全局控制捷径卡片 */}
 <div className="bg-white rounded-3xl border border-[#EAE6DF] p-6 shadow-xs space-y-4">
 <div className="flex items-center justify-between border-b border-stone-100 pb-3">
 <div>
 <h4 className="text-sm font-extrabold text-stone-900">平台级运营快捷动作</h4>
 <p className="text-xs text-stone-400">一键全局调控积分、系统广播与运维指令</p>
 </div>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div className="p-4 bg-[#FAF8F5] rounded-2xl border border-[#EAE6DF] flex items-center justify-between">
 <div className="space-y-0.5">
 <h5 className="text-xs font-bold text-stone-800">全员活动积分广播发放</h5>
 <p className="text-[10px] text-stone-400">为全平台普通用户统一发放节日或时装周活动积分</p>
 </div>
 <button
 onClick={() => setIsBroadcastModalOpen(true)}
 className="px-4 py-2 bg-[#D63031] hover:bg-[#c0392b] text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-colors"
 >
 <Send className="w-3.5 h-3.5 stroke-[2]" />
 <span>发起广播发放</span>
 </button>
 </div>

 <div className="p-4 bg-[#FAF8F5] rounded-2xl border border-[#EAE6DF] flex items-center justify-between">
 <div className="space-y-0.5">
 <h5 className="text-xs font-bold text-stone-800">每日 100 积分重置补齐</h5>
 <p className="text-[10px] text-stone-400">手动触发每日零点定时任务，为所有不足 100 分的用户补齐</p>
 </div>
 <button
 onClick={async () => {
 if (!confirm('确认要手动触发全员每日 100 积分重置补齐吗？')) return;
 await resetCreditsAdmin();
 showToast('每日 100 积分已全员重置补齐！', "info");
 loadDashboard();
 }}
 className="px-4 py-2 bg-stone-800 hover:bg-black text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-colors"
 >
 <RefreshCw className="w-3.5 h-3.5 stroke-[2]" />
 <span>立即补齐重置</span>
 </button>
 </div>
 </div>
 </div>
 </div>
 )}

 {/* ----------------------------------------------------------- */}
 {/* TAB 2: 账户与权限大盘 (User Management) */}
 {/* ----------------------------------------------------------- */}
 {activeTab === 'USERS' && (
 <div className="max-w-7xl mx-auto space-y-4">
 
 {/* 顶部过滤工具栏 */}
 <div className="bg-white p-4 rounded-2xl border border-[#EAE6DF] shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
 <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
 <div className="relative w-64">
 <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-2.5" />
 <input
 type="text"
 value={userSearchQuery}
 onChange={(e) => setUserSearchQuery(e.target.value)}
 placeholder="搜索 UID / 邮箱 / 昵称..."
 className="w-full bg-[#FAF8F5] border border-[#EAE6DF] rounded-xl pl-8 pr-3 py-1.5 text-xs text-stone-800 focus:outline-none focus:border-[#D63031]"
 />
 </div>

 <select
 value={userStatusFilter}
 onChange={(e) => setUserStatusFilter(e.target.value as any)}
 className="bg-[#FAF8F5] border border-[#EAE6DF] rounded-xl px-3 py-1.5 text-xs text-stone-700 focus:outline-none"
 >
 <option value="ALL">全部状态</option>
 <option value="NORMAL">正常 (NORMAL)</option>
 <option value="FROZEN">已冻结 (FROZEN)</option>
 <option value="BANNED">已封禁 (BANNED)</option>
 </select>

 <select
 value={userRoleFilter}
 onChange={(e) => setUserRoleFilter(e.target.value as any)}
 className="bg-[#FAF8F5] border border-[#EAE6DF] rounded-xl px-3 py-1.5 text-xs text-stone-700 focus:outline-none"
 >
 <option value="ALL">全部角色</option>
 <option value="USER">普通用户</option>
 <option value="ADMIN">管理员</option>
 </select>
 </div>

 <div className="flex items-center gap-2">
 <button
 onClick={handleExportUsersCsv}
 className="px-3.5 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
 >
 <Download className="w-3.5 h-3.5 stroke-[1.75]" />
 <span>导出用户报表</span>
 </button>
 <button
 onClick={loadUsers}
 className="p-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl transition-colors"
 title="刷新用户列表"
 >
 <RefreshCw className={`w-4 h-4 stroke-[1.75] ${isUsersLoading ? 'animate-spin' : ''}`} />
 </button>
 </div>
 </div>

 {/* 用户列表数据表格 */}
 <div className="bg-white rounded-3xl border border-[#EAE6DF] shadow-xs overflow-hidden">
 <div className="overflow-x-auto">
 <table className="w-full text-left text-xs border-collapse">
 <thead>
 <tr className="bg-[#FAF8F5] border-b border-[#EAE6DF] text-stone-500 font-bold">
 <th className="py-3.5 px-4">用户标识</th>
 <th className="py-3.5 px-4">昵称 / 邮箱</th>
 <th className="py-3.5 px-4">角色</th>
 <th className="py-3.5 px-4">账号状态</th>
 <th className="py-3.5 px-4">积分余额 (每日/永久)</th>
 <th className="py-3.5 px-4">档案数</th>
 <th className="py-3.5 px-4">注册时间</th>
 <th className="py-3.5 px-4 text-right">运营操作</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-stone-100">
 {filteredUsers.length === 0 ? (
 <tr>
 <td colSpan={8} className="text-center py-12 text-stone-400">
 未检索到符合条件的用户数据
 </td>
 </tr>
 ) : (
 filteredUsers.map((u) => (
 <tr key={u.id} className="hover:bg-[#FAF8F5]/80 transition-colors">
 <td className="py-3 px-4 font-mono text-[11px] text-stone-400">
 {u.id.slice(0, 12)}...
 </td>
 <td className="py-3 px-4">
 <div className="flex items-center gap-2.5">
 <div className="w-7 h-7 rounded-full bg-rose-50 text-[#D63031] border border-rose-100 flex items-center justify-center font-bold text-xs">
 {(u.nickname || u.email)[0]}
 </div>
 <div>
 <div className="font-bold text-stone-900">{u.nickname || '未设置'}</div>
 <div className="text-[10px] text-stone-400">{u.email}</div>
 </div>
 </div>
 </td>
 <td className="py-3 px-4">
 <span
 className={`px-2 py-0.5 rounded-md font-bold text-[10px] font-mono ${
 u.role === 'ADMIN'
 ? 'bg-amber-50 text-amber-700 border border-amber-200'
 : 'bg-stone-100 text-stone-600'
 }`}
 >
 {u.role}
 </span>
 </td>
 <td className="py-3 px-4">
 <span
 className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
 u.status === 'BANNED'
 ? 'bg-rose-100 text-rose-700 border border-rose-200'
 : u.status === 'FROZEN'
 ? 'bg-amber-100 text-amber-700 border border-amber-200'
 : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
 }`}
 >
 {u.status === 'BANNED' ? '已封禁' : u.status === 'FROZEN' ? '已冻结' : '正常'}
 </span>
 </td>
 <td className="py-3 px-4 font-mono">
 <span className="font-bold text-stone-900">{u.dailyCredits}</span>
 <span className="text-stone-400"> / </span>
 <span className="text-amber-600 font-bold">+{u.permanentCredits}</span>
 </td>
 <td className="py-3 px-4 font-mono text-stone-600">
 {u.profilesCount} 个
 </td>
 <td className="py-3 px-4 text-stone-400 font-mono text-[10px]">
 {new Date(u.createdAt).toLocaleDateString()}
 </td>
 <td className="py-3 px-4 text-right">
 <div className="inline-flex items-center gap-1.5">
 {/* 查看画像抽屉 */}
 <button
 onClick={() => handleOpenUserDetails(u.id)}
 className="p-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 transition-colors"
 title="查看 360° 资产画像"
 >
 <Eye className="w-3.5 h-3.5 stroke-[1.75]" />
 </button>

 {/* 调控积分 */}
 <button
 onClick={() => {
 setAdjustTargetUser(u);
 setAdjustDeltaDaily('50');
 setAdjustDeltaPermanent('0');
 }}
 className="p-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200/60 transition-colors"
 title="调整用户积分"
 >
 <Coins className="w-3.5 h-3.5 stroke-[1.75]" />
 </button>

 {/* 重置密码 */}
 <button
 onClick={() => {
 setResetPassTargetUser(u);
 setNewPasswordVal('123456');
 }}
 className="p-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 transition-colors"
 title="重置登录密码"
 >
 <KeyRound className="w-3.5 h-3.5 stroke-[1.75]" />
 </button>

 {/* 封禁/解封状态切换 */}
 {u.role !== 'ADMIN' && (
 <>
 {u.status === 'NORMAL' ? (
 <button
 onClick={() => handleUpdateStatus(u, 'BANNED')}
 className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-[#D63031] border border-rose-200/60 transition-colors"
 title="封禁账号"
 >
 <UserX className="w-3.5 h-3.5 stroke-[1.75]" />
 </button>
 ) : (
 <button
 onClick={() => handleUpdateStatus(u, 'NORMAL')}
 className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200/60 transition-colors"
 title="解封账号"
 >
 <UserCheck className="w-3.5 h-3.5 stroke-[1.75]" />
 </button>
 )}
 </>
 )}
 </div>
 </td>
 </tr>
 ))
 )}
 </tbody>
 </table>
 </div>
 </div>
 </div>
 )}

 {/* ----------------------------------------------------------- */}
 {/* TAB 3: ️ 官方公共单品与商城运营 (Garment CMS) */}
 {/* ----------------------------------------------------------- */}
 {activeTab === 'GARMENTS' && (
 <div className="max-w-7xl mx-auto space-y-4">
 
 {/* 顶部动作条 */}
 <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-[#EAE6DF] shadow-xs">
 <div>
 <h3 className="text-sm font-extrabold text-stone-900">
 官方公共单品库 ({publicGarments.length})
 </h3>
 <p className="text-xs text-stone-400">管理公共试衣间推荐款式、电商导购链接与置顶推荐</p>
 </div>

 <div className="flex items-center gap-2">
 <button
 onClick={() => setIsUploadModalOpen(true)}
 className="px-4 py-2 bg-[#D63031] hover:bg-[#c0392b] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
 >
 <Plus className="w-4 h-4 stroke-[2]" />
 <span>录入官方新单品</span>
 </button>
 <button
 onClick={onRefreshPublicGarments}
 className="p-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl transition-colors"
 title="刷新单品列表"
 >
 <RefreshCw className="w-4 h-4 stroke-[1.75]" />
 </button>
 </div>
 </div>

 {/* 单品卡片网格 */}
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
 {publicGarments.map((g) => (
 <div
 key={g.id}
 className={`bg-white rounded-3xl border p-4 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-3 relative overflow-hidden ${
 g.isArchived ? 'border-dashed border-stone-300 opacity-60' : 'border-[#EAE6DF]'
 }`}
 >
 {/* 置顶角标 */}
 {g.isFeatured && (
 <div className="absolute top-3 right-3 bg-amber-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5 shadow-xs">
 <Star className="w-2.5 h-2.5 fill-white" /> 置顶爆款
 </div>
 )}

 <div className="space-y-2">
 <div className="w-full aspect-square bg-[#FAF8F5] rounded-2xl border border-[#EAE6DF] flex items-center justify-center p-3 overflow-hidden">
 <img
 src={g.assets?.[0]?.pngUrl}
 alt={g.title}
 className="max-h-full max-w-full object-contain"
 />
 </div>

 <div className="space-y-0.5 text-left">
 <span className="text-[10px] font-mono text-[#D63031] font-bold">
 {g.primaryCategory} · {g.subCategory}
 </span>
 <h4 className="text-xs font-extrabold text-stone-800 line-clamp-1">{g.title}</h4>
 <p className="text-[11px] text-stone-400">{g.brand || 'SmartWardrobe 官方'}</p>
 <div className="text-xs font-mono font-extrabold text-stone-900 mt-1">
 ¥{((g.priceCents || 0) / 100).toFixed(2)}
 </div>
 </div>
 </div>

 <div className="flex items-center gap-1.5 pt-2 border-t border-stone-100">
 <button
 onClick={() => handleToggleGarmentFeatured(g)}
 className={`p-1.5 rounded-xl border text-xs font-bold transition-colors ${
 g.isFeatured
 ? 'bg-amber-50 text-amber-700 border-amber-300'
 : 'bg-[#FAF8F5] text-stone-600 border-[#EAE6DF] hover:bg-stone-100'
 }`}
 title="置顶推荐"
 >
 <Star className={`w-3.5 h-3.5 ${g.isFeatured ? 'fill-amber-500 text-amber-500' : 'stroke-[1.75]'}`} />
 </button>

 <button
 onClick={() => {
 setEditingGarment(g);
 setEditTitle(g.title);
 setEditBrand(g.brand || '');
 setEditPriceYuan(((g.priceCents || 0) / 100).toString());
 setEditBuyUrl(g.externalBuyUrl || '');
 }}
 className="flex-1 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold rounded-xl transition-colors"
 >
 编辑信息
 </button>

 <button
 onClick={async () => {
 await toggleOfficialGarmentStatus(g.id);
 onRefreshPublicGarments();
 }}
 className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-colors ${
 g.isArchived
 ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
 : 'bg-rose-50 text-[#D63031] border-rose-200'
 }`}
 >
 {g.isArchived ? '上架' : '下架'}
 </button>
 </div>
 </div>
 ))}
 </div>
 </div>
 )}

 {/* ----------------------------------------------------------- */}
 {/* TAB 4: 全局审计流水与日志 (Audit Ledger) */}
 {/* ----------------------------------------------------------- */}
 {activeTab === 'LEDGER' && (
 <div className="max-w-7xl mx-auto space-y-4">
 
 {/* 过滤与导出 Bar */}
 <div className="bg-white p-4 rounded-2xl border border-[#EAE6DF] shadow-xs flex items-center justify-between">
 <div className="flex items-center gap-2">
 <span className="text-xs font-bold text-stone-500">交易类型筛选:</span>
 <select
 value={ledgerFilterType}
 onChange={(e) => setLedgerFilterType(e.target.value)}
 className="bg-[#FAF8F5] border border-[#EAE6DF] rounded-xl px-3 py-1.5 text-xs text-stone-700 focus:outline-none"
 >
 <option value="ALL">全部流水</option>
 <option value="ADMIN_ADJUST">管理员手动调控 (ADMIN_ADJUST)</option>
 <option value="BROADCAST_REWARD">全员活动广播 (BROADCAST_REWARD)</option>
 <option value="STATUS_CHANGE">账号状态变更 (STATUS_CHANGE)</option>
 <option value="PASSWORD_RESET">密码重置记录 (PASSWORD_RESET)</option>
 <option value="DAILY_RESET">每日零点定时重置 (DAILY_RESET)</option>
 <option value="TASK_DEDUCT">AI 渲染与识别扣费 (TASK_DEDUCT)</option>
 <option value="REFUND">任务失败退款 (REFUND)</option>
 </select>
 </div>

 <div className="flex items-center gap-2">
 <button
 onClick={handleExportLedgerCsv}
 className="px-3.5 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
 >
 <Download className="w-3.5 h-3.5 stroke-[1.75]" />
 <span>导出审计流水</span>
 </button>
 <button
 onClick={loadLedger}
 className="p-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl transition-colors"
 title="刷新流水"
 >
 <RefreshCw className={`w-4 h-4 stroke-[1.75] ${isLedgerLoading ? 'animate-spin' : ''}`} />
 </button>
 </div>
 </div>

 {/* 流水明细表格 */}
 <div className="bg-white rounded-3xl border border-[#EAE6DF] shadow-xs overflow-hidden">
 <div className="overflow-x-auto">
 <table className="w-full text-left text-xs border-collapse">
 <thead>
 <tr className="bg-[#FAF8F5] border-b border-[#EAE6DF] text-stone-500 font-bold">
 <th className="py-3.5 px-4">流水号</th>
 <th className="py-3.5 px-4">用户 UID</th>
 <th className="py-3.5 px-4">业务类型</th>
 <th className="py-3.5 px-4">变动数额 (每日/永久)</th>
 <th className="py-3.5 px-4">变动后余额</th>
 <th className="py-3.5 px-4">审计说明</th>
 <th className="py-3.5 px-4">时间戳</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-stone-100">
 {filteredLedger.length === 0 ? (
 <tr>
 <td colSpan={7} className="text-center py-12 text-stone-400">
 暂无审计流水记录
 </td>
 </tr>
 ) : (
 filteredLedger.map((l) => (
 <tr key={l.id} className="hover:bg-[#FAF8F5]/80 transition-colors">
 <td className="py-3 px-4 font-mono text-[11px] text-stone-400">
 {l.id}
 </td>
 <td className="py-3 px-4 font-mono text-[11px] text-stone-700">
 {l.userId.slice(0, 14)}...
 </td>
 <td className="py-3 px-4">
 <span className="px-2 py-0.5 rounded-md font-mono text-[10px] font-bold bg-stone-100 text-stone-700">
 {l.txType}
 </span>
 </td>
 <td className="py-3 px-4 font-mono font-bold">
 {l.deltaDaily !== 0 && (
 <span className={l.deltaDaily > 0 ? 'text-emerald-600' : 'text-[#D63031]'}>
 {l.deltaDaily > 0 ? `+${l.deltaDaily}` : l.deltaDaily} (日)
 </span>
 )}
 {l.deltaPermanent !== 0 && (
 <span className={`ml-1.5 ${l.deltaPermanent > 0 ? 'text-amber-600' : 'text-rose-600'}`}>
 {l.deltaPermanent > 0 ? `+${l.deltaPermanent}` : l.deltaPermanent} (永)
 </span>
 )}
 {l.deltaDaily === 0 && l.deltaPermanent === 0 && (
 <span className="text-stone-400">--</span>
 )}
 </td>
 <td className="py-3 px-4 font-mono text-stone-600">
 {l.balanceDailyAfter} / +{l.balancePermanentAfter}
 </td>
 <td className="py-3 px-4 text-stone-700">
 {l.description}
 </td>
 <td className="py-3 px-4 text-stone-400 font-mono text-[10px]">
 {new Date(l.createdAt).toLocaleString()}
 </td>
 </tr>
 ))
 )}
 </tbody>
 </table>
 </div>
 </div>
 </div>
 )}
 </main>

 {/* ------------------------------------------------------------- */}
 {/* 用户 360° 资产画像抽屉 (Drawer) */}
 {/* ------------------------------------------------------------- */}
 {selectedUserId && (
 <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
 <div className="w-full max-w-xl bg-white h-full shadow-2xl p-6 flex flex-col justify-between overflow-y-auto space-y-6 text-left border-l border-[#EAE6DF]">
 <div className="space-y-4">
 <div className="flex items-center justify-between border-b border-stone-100 pb-3">
 <div className="flex items-center gap-2.5">
 <div className="w-9 h-9 rounded-2xl bg-rose-50 text-[#D63031] flex items-center justify-center font-bold text-sm">
 {(userDetails?.user?.nickname || 'U')[0]}
 </div>
 <div>
 <h3 className="text-sm font-extrabold text-stone-900">
 {userDetails?.user?.nickname} 的资产画像
 </h3>
 <p className="text-[10px] text-stone-400 font-mono">{userDetails?.user?.email}</p>
 </div>
 </div>
 <button
 onClick={() => {
 setSelectedUserId(null);
 setUserDetails(null);
 }}
 className="p-1.5 rounded-xl hover:bg-stone-100 text-stone-400 hover:text-stone-700"
 >
 <X className="w-5 h-5 stroke-[1.75]" />
 </button>
 </div>

 {isDetailsLoading ? (
 <div className="py-20 text-center text-stone-400 space-y-2">
 <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#D63031]" />
 <p className="text-xs">加载用户画像数据中...</p>
 </div>
 ) : userDetails ? (
 <div className="space-y-5 text-xs">
 {/* 账户概况卡片 */}
 <div className="p-4 bg-[#FAF8F5] rounded-2xl border border-[#EAE6DF] grid grid-cols-3 gap-2 text-center">
 <div>
 <span className="text-[10px] text-stone-400 block">账号状态</span>
 <span className="font-bold text-stone-800">{userDetails.user.status}</span>
 </div>
 <div>
 <span className="text-[10px] text-stone-400 block">积分余额</span>
 <span className="font-bold font-mono text-amber-600">
 {userDetails.user.dailyCredits} + {userDetails.user.permanentCredits}
 </span>
 </div>
 <div>
 <span className="text-[10px] text-stone-400 block">注册时间</span>
 <span className="font-mono text-stone-600 text-[10px]">
 {new Date(userDetails.user.createdAt).toLocaleDateString()}
 </span>
 </div>
 </div>

 {/* 身材档案 Profiles */}
 <div className="space-y-2">
 <h5 className="font-extrabold text-stone-800">
 家庭与身材档案 ({userDetails.profiles?.length || 0})
 </h5>
 <div className="space-y-2">
 {userDetails.profiles?.map((p: any) => (
 <div key={p.id} className="p-3 rounded-xl border border-[#EAE6DF] bg-white flex items-center justify-between">
 <div>
 <span className="font-bold text-stone-900">{p.name}</span>
 <span className="text-[10px] text-stone-400 ml-2">
 {p.gender === 'FEMALE' ? '女性' : '男性'} · {p.heightCm}cm / {p.weightKg}kg
 </span>
 </div>
 <span className="font-mono text-[10px] text-stone-400">
 三围: {p.bustCm}/{p.waistCm}/{p.hipsCm}
 </span>
 </div>
 ))}
 </div>
 </div>

 {/* 私有单品资产库预览 */}
 <div className="space-y-2">
 <h5 className="font-extrabold text-stone-800">
 私有单品资产 ({userDetails.garmentsCount || 0} 件)
 </h5>
 <div className="grid grid-cols-4 gap-2">
 {userDetails.garments?.map((g: any) => (
 <div key={g.id} className="aspect-square bg-[#FAF8F5] rounded-xl border border-[#EAE6DF] p-1 flex items-center justify-center overflow-hidden">
 <img src={g.assets?.[0]?.pngUrl} alt={g.title} className="max-h-full max-w-full object-contain" />
 </div>
 ))}
 </div>
 </div>

 {/* Lookbook 搭配数 */}
 <div className="space-y-2">
 <h5 className="font-extrabold text-stone-800">
 已保存搭配套装 ({userDetails.outfitsCount || 0} 套)
 </h5>
 <div className="space-y-1.5">
 {userDetails.outfits?.map((o: any) => (
 <div key={o.id} className="p-2.5 rounded-xl border border-[#EAE6DF] bg-white flex items-center justify-between">
 <span className="font-bold text-stone-800">{o.title}</span>
 <span className="text-[10px] font-mono text-stone-400">
 包含 {o.items?.length || 0} 件单品
 </span>
 </div>
 ))}
 </div>
 </div>
 </div>
 ) : null}
 </div>

 <button
 onClick={() => {
 setSelectedUserId(null);
 setUserDetails(null);
 }}
 className="w-full py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-bold transition-colors"
 >
 关闭画像抽屉
 </button>
 </div>
 </div>
 )}

 {/* ------------------------------------------------------------- */}
 {/* 积分调控弹窗 */}
 {/* ------------------------------------------------------------- */}
 {adjustTargetUser && (
 <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
 <div className="bg-white rounded-3xl border border-[#EAE6DF] shadow-2xl p-6 w-full max-w-md space-y-4 text-left">
 <div className="flex items-center justify-between border-b border-stone-100 pb-2">
 <h4 className="text-sm font-extrabold text-stone-900">
 调整用户积分 - {adjustTargetUser.nickname}
 </h4>
 <button onClick={() => setAdjustTargetUser(null)} className="text-stone-400 hover:text-stone-700">
 <X className="w-4 h-4" />
 </button>
 </div>

 <form onSubmit={handleConfirmAdjustCredits} className="space-y-3 text-xs">
 <div>
 <label className="font-bold text-stone-700 block mb-1">每日积分增减数额 (可为负数)</label>
 <input
 type="number"
 value={adjustDeltaDaily}
 onChange={(e) => setAdjustDeltaDaily(e.target.value)}
 className="w-full bg-[#FAF8F5] border border-[#EAE6DF] rounded-xl px-3 py-2 text-stone-900 font-mono focus:outline-none"
 />
 </div>

 <div>
 <label className="font-bold text-stone-700 block mb-1">永久积分增减数额 (可为负数)</label>
 <input
 type="number"
 value={adjustDeltaPermanent}
 onChange={(e) => setAdjustDeltaPermanent(e.target.value)}
 className="w-full bg-[#FAF8F5] border border-[#EAE6DF] rounded-xl px-3 py-2 text-stone-900 font-mono focus:outline-none"
 />
 </div>

 <div>
 <label className="font-bold text-stone-700 block mb-1">调整审计原因</label>
 <input
 type="text"
 value={adjustReason}
 onChange={(e) => setAdjustReason(e.target.value)}
 placeholder="如: 活动奖励发放 / 补账"
 className="w-full bg-[#FAF8F5] border border-[#EAE6DF] rounded-xl px-3 py-2 text-stone-900 focus:outline-none"
 required
 />
 </div>

 <div className="flex gap-2 pt-2">
 <button
 type="button"
 onClick={() => setAdjustTargetUser(null)}
 className="flex-1 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl font-bold transition-colors"
 >
 取消
 </button>
 <button
 type="submit"
 disabled={isAdjusting}
 className="flex-1 py-2 bg-[#D63031] hover:bg-[#c0392b] text-white rounded-xl font-bold shadow-xs transition-colors disabled:opacity-50"
 >
 确认调整
 </button>
 </div>
 </form>
 </div>
 </div>
 )}

 {/* ------------------------------------------------------------- */}
 {/* 密码重置弹窗 */}
 {/* ------------------------------------------------------------- */}
 {resetPassTargetUser && (
 <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
 <div className="bg-white rounded-3xl border border-[#EAE6DF] shadow-2xl p-6 w-full max-w-md space-y-4 text-left">
 <div className="flex items-center justify-between border-b border-stone-100 pb-2">
 <h4 className="text-sm font-extrabold text-stone-900">
 重置登录密码 - {resetPassTargetUser.nickname}
 </h4>
 <button onClick={() => setResetPassTargetUser(null)} className="text-stone-400 hover:text-stone-700">
 <X className="w-4 h-4" />
 </button>
 </div>

 <form onSubmit={handleConfirmResetPassword} className="space-y-3 text-xs">
 <div>
 <label className="font-bold text-stone-700 block mb-1">新登录密码 (不少于 6 位)</label>
 <input
 type="text"
 value={newPasswordVal}
 onChange={(e) => setNewPasswordVal(e.target.value)}
 className="w-full bg-[#FAF8F5] border border-[#EAE6DF] rounded-xl px-3 py-2 text-stone-900 font-mono focus:outline-none"
 required
 />
 </div>

 <div className="flex gap-2 pt-2">
 <button
 type="button"
 onClick={() => setResetPassTargetUser(null)}
 className="flex-1 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl font-bold transition-colors"
 >
 取消
 </button>
 <button
 type="submit"
 disabled={isResettingPass}
 className="flex-1 py-2 bg-[#D63031] hover:bg-[#c0392b] text-white rounded-xl font-bold shadow-xs transition-colors disabled:opacity-50"
 >
 确认重置
 </button>
 </div>
 </form>
 </div>
 </div>
 )}

 {/* ------------------------------------------------------------- */}
 {/* 全员活动广播弹窗 */}
 {/* ------------------------------------------------------------- */}
 {isBroadcastModalOpen && (
 <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
 <div className="bg-white rounded-3xl border border-[#EAE6DF] shadow-2xl p-6 w-full max-w-md space-y-4 text-left">
 <div className="flex items-center justify-between border-b border-stone-100 pb-2">
 <h4 className="text-sm font-extrabold text-stone-900">
 全员活动积分广播发放
 </h4>
 <button onClick={() => setIsBroadcastModalOpen(false)} className="text-stone-400 hover:text-stone-700">
 <X className="w-4 h-4" />
 </button>
 </div>

 <form onSubmit={handleConfirmBroadcast} className="space-y-3 text-xs">
 <div>
 <label className="font-bold text-stone-700 block mb-1">每位用户发放永久积分</label>
 <input
 type="number"
 value={broadcastPermCredits}
 onChange={(e) => setBroadcastPermCredits(e.target.value)}
 className="w-full bg-[#FAF8F5] border border-[#EAE6DF] rounded-xl px-3 py-2 text-stone-900 font-mono focus:outline-none"
 />
 </div>

 <div>
 <label className="font-bold text-stone-700 block mb-1">每位用户发放每日积分</label>
 <input
 type="number"
 value={broadcastDailyCredits}
 onChange={(e) => setBroadcastDailyCredits(e.target.value)}
 className="w-full bg-[#FAF8F5] border border-[#EAE6DF] rounded-xl px-3 py-2 text-stone-900 font-mono focus:outline-none"
 />
 </div>

 <div>
 <label className="font-bold text-stone-700 block mb-1">活动说明原因</label>
 <input
 type="text"
 value={broadcastReason}
 onChange={(e) => setBroadcastReason(e.target.value)}
 className="w-full bg-[#FAF8F5] border border-[#EAE6DF] rounded-xl px-3 py-2 text-stone-900 focus:outline-none"
 required
 />
 </div>

 <div className="flex gap-2 pt-2">
 <button
 type="button"
 onClick={() => setIsBroadcastModalOpen(false)}
 className="flex-1 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl font-bold transition-colors"
 >
 取消
 </button>
 <button
 type="submit"
 disabled={isBroadcasting}
 className="flex-1 py-2 bg-[#D63031] hover:bg-[#c0392b] text-white rounded-xl font-bold shadow-xs transition-colors disabled:opacity-50"
 >
 确认广播发放
 </button>
 </div>
 </form>
 </div>
 </div>
 )}

 {/* ------------------------------------------------------------- */}
 {/* 官方公共单品录入弹窗 */}
 {/* ------------------------------------------------------------- */}
 {isUploadModalOpen && (
 <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
 <div className="bg-white rounded-3xl border border-[#EAE6DF] shadow-2xl p-6 w-full max-w-lg space-y-4 text-left">
 <div className="flex items-center justify-between border-b border-stone-100 pb-2">
 <h4 className="text-sm font-extrabold text-stone-900">
 录入官方公共高定单品
 </h4>
 <button onClick={() => setIsUploadModalOpen(false)} className="text-stone-400 hover:text-stone-700">
 <X className="w-4 h-4" />
 </button>
 </div>

 <form onSubmit={handleOfficialUpload} className="space-y-3 text-xs">
 <div>
 <label className="font-bold text-stone-700 block mb-1">单品名称</label>
 <input
 type="text"
 value={uploadTitle}
 onChange={(e) => setUploadTitle(e.target.value)}
 placeholder="如: 法式米杏色小香风手工西装"
 className="w-full bg-[#FAF8F5] border border-[#EAE6DF] rounded-xl px-3 py-2 text-stone-900 focus:outline-none"
 required
 />
 </div>

 <div className="grid grid-cols-2 gap-2">
 <div>
 <label className="font-bold text-stone-700 block mb-1">一级品类</label>
 <select
 value={uploadCategory}
 onChange={(e) => setUploadCategory(e.target.value as any)}
 className="w-full bg-[#FAF8F5] border border-[#EAE6DF] rounded-xl px-3 py-2 text-stone-900 focus:outline-none"
 >
 <option value="TOPS">上装 (TOPS)</option>
 <option value="BOTTOMS">下装 (BOTTOMS)</option>
 <option value="OUTERWEAR">外套 (OUTERWEAR)</option>
 <option value="FOOTWEAR">鞋履 (FOOTWEAR)</option>
 <option value="ACCESSORIES">配饰 (ACCESSORIES)</option>
 </select>
 </div>
 <div>
 <label className="font-bold text-stone-700 block mb-1">细分子类</label>
 <input
 type="text"
 value={uploadSubCategory}
 onChange={(e) => setUploadSubCategory(e.target.value)}
 className="w-full bg-[#FAF8F5] border border-[#EAE6DF] rounded-xl px-3 py-2 text-stone-900 focus:outline-none"
 />
 </div>
 </div>

 <div className="grid grid-cols-2 gap-2">
 <div>
 <label className="font-bold text-stone-700 block mb-1">品牌名称</label>
 <input
 type="text"
 value={uploadBrand}
 onChange={(e) => setUploadBrand(e.target.value)}
 className="w-full bg-[#FAF8F5] border border-[#EAE6DF] rounded-xl px-3 py-2 text-stone-900 focus:outline-none"
 />
 </div>
 <div>
 <label className="font-bold text-stone-700 block mb-1">公规定价 (元)</label>
 <input
 type="number"
 value={uploadPriceYuan}
 onChange={(e) => setUploadPriceYuan(e.target.value)}
 className="w-full bg-[#FAF8F5] border border-[#EAE6DF] rounded-xl px-3 py-2 text-stone-900 font-mono focus:outline-none"
 />
 </div>
 </div>

 <div>
 <label className="font-bold text-stone-700 block mb-1">外部购买链接 (电商外跳)</label>
 <input
 type="url"
 value={uploadBuyUrl}
 onChange={(e) => setUploadBuyUrl(e.target.value)}
 placeholder="https://..."
 className="w-full bg-[#FAF8F5] border border-[#EAE6DF] rounded-xl px-3 py-2 text-stone-900 focus:outline-none"
 />
 </div>

 <div className="flex gap-2 pt-2">
 <button
 type="button"
 onClick={() => setIsUploadModalOpen(false)}
 className="flex-1 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl font-bold transition-colors"
 >
 取消
 </button>
 <button
 type="submit"
 disabled={isUploading}
 className="flex-1 py-2 bg-[#D63031] hover:bg-[#c0392b] text-white rounded-xl font-bold shadow-xs transition-colors disabled:opacity-50"
 >
 确认录入
 </button>
 </div>
 </form>
 </div>
 </div>
 )}

 {/* ------------------------------------------------------------- */}
 {/* 单品信息编辑弹窗 */}
 {/* ------------------------------------------------------------- */}
 {editingGarment && (
 <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
 <div className="bg-white rounded-3xl border border-[#EAE6DF] shadow-2xl p-6 w-full max-w-md space-y-4 text-left">
 <div className="flex items-center justify-between border-b border-stone-100 pb-2">
 <h4 className="text-sm font-extrabold text-stone-900">
 编辑单品运营信息
 </h4>
 <button onClick={() => setEditingGarment(null)} className="text-stone-400 hover:text-stone-700">
 <X className="w-4 h-4" />
 </button>
 </div>

 <form onSubmit={handleSaveGarmentEdit} className="space-y-3 text-xs">
 <div>
 <label className="font-bold text-stone-700 block mb-1">单品名称</label>
 <input
 type="text"
 value={editTitle}
 onChange={(e) => setEditTitle(e.target.value)}
 className="w-full bg-[#FAF8F5] border border-[#EAE6DF] rounded-xl px-3 py-2 text-stone-900 focus:outline-none"
 required
 />
 </div>

 <div>
 <label className="font-bold text-stone-700 block mb-1">品牌</label>
 <input
 type="text"
 value={editBrand}
 onChange={(e) => setEditBrand(e.target.value)}
 className="w-full bg-[#FAF8F5] border border-[#EAE6DF] rounded-xl px-3 py-2 text-stone-900 focus:outline-none"
 />
 </div>

 <div>
 <label className="font-bold text-stone-700 block mb-1">价格 (元)</label>
 <input
 type="number"
 value={editPriceYuan}
 onChange={(e) => setEditPriceYuan(e.target.value)}
 className="w-full bg-[#FAF8F5] border border-[#EAE6DF] rounded-xl px-3 py-2 text-stone-900 font-mono focus:outline-none"
 />
 </div>

 <div>
 <label className="font-bold text-stone-700 block mb-1">购买链接</label>
 <input
 type="url"
 value={editBuyUrl}
 onChange={(e) => setEditBuyUrl(e.target.value)}
 className="w-full bg-[#FAF8F5] border border-[#EAE6DF] rounded-xl px-3 py-2 text-stone-900 focus:outline-none"
 />
 </div>

 <div className="flex gap-2 pt-2">
 <button
 type="button"
 onClick={() => setEditingGarment(null)}
 className="flex-1 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl font-bold transition-colors"
 >
 取消
 </button>
 <button
 type="submit"
 disabled={isSavingEdit}
 className="flex-1 py-2 bg-[#D63031] hover:bg-[#c0392b] text-white rounded-xl font-bold shadow-xs transition-colors disabled:opacity-50"
 >
 保存修改
 </button>
 </div>
 </form>
 </div>
 </div>
 )}
 </div>
 );
};
