import { showToast } from '../components/Toast';
import React, { useState, useEffect } from 'react';
import {
  ExtendedGarmentItem,
  CurrentUser,
  CreditLedgerItem,
  DashboardStats,
  DashboardTrends,
  fetchCmsDashboardTrends,
  updateCmsUserTags,
  batchUpdateUserStatus,
  batchDeleteCmsUsers,
  batchAdjustUserCredits,
  batchToggleGarmentStatus,
  batchDeleteGarments,
  uploadOfficialGarment,
  updateOfficialGarment,
  toggleOfficialGarmentStatus,
  toggleOfficialGarmentFeatured,
  deleteOfficialGarment,
  fetchCmsUsers,
  fetchCmsUserDetails,
  updateCmsUserStatus,
  resetCmsUserPassword,
  updateCmsUserRole,
  adjustUserCredits,
  broadcastCmsCredits,
  deleteCmsUser,
  fetchCmsLedger,
  fetchCmsDashboardStats,
  resetCreditsAdmin,
} from '../api';
import {
  CheckSquare,
  Square,
  BarChart2,
  Command,
  ChevronDown,
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
  Trash2,
  HelpCircle,
} from 'lucide-react';
import { GarmentCategory } from '@smart-wardrobe/shared';

interface CmsAdminViewProps {
  publicGarments: ExtendedGarmentItem[];
  onRefreshPublicGarments: () => void;
  onLogoutAdmin: () => void;
}

const PRESET_USER_TAGS = ['VIP高定会员', '优质创作者', '高频试衣', '新手体验', '测试账号'];

export const CmsAdminView: React.FC<CmsAdminViewProps> = ({
  publicGarments,
  onRefreshPublicGarments,
  onLogoutAdmin,
}) => {
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'USERS' | 'GARMENTS' | 'LEDGER'>('DASHBOARD');

  // 大盘统计数据与7日趋势
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [dashboardTrends, setDashboardTrends] = useState<DashboardTrends | null>(null);
  const [isStatsLoading, setIsStatsLoading] = useState(false);

  // 用户大盘列表与检索过滤
  const [usersList, setUsersList] = useState<any[]>([]);
  const [isUsersLoading, setIsUsersLoading] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userStatusFilter, setUserStatusFilter] = useState<'ALL' | 'NORMAL' | 'FROZEN' | 'BANNED'>('ALL');
  const [userRoleFilter, setUserRoleFilter] = useState<'ALL' | 'USER' | 'ADMIN'>('ALL');
  const [userTagFilter, setUserTagFilter] = useState<string>('ALL');

  // 用户多选与批量
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [isBatchUserLoading, setIsBatchUserLoading] = useState(false);
  const [isBatchAdjustModalOpen, setIsBatchAdjustModalOpen] = useState(false);
  const [batchAdjustMode, setBatchAdjustMode] = useState<'ADD' | 'SUB'>('ADD');
  const [batchAdjustType, setBatchAdjustType] = useState<'DAILY' | 'PERMANENT'>('DAILY');
  const [batchAdjustAmount, setBatchAdjustAmount] = useState('50');
  const [batchAdjustReason, setBatchAdjustReason] = useState('批量活动奖励发放');

  // 单品多选与批量
  const [selectedGarmentIds, setSelectedGarmentIds] = useState<Set<string>>(new Set());
  const [isBatchGarmentLoading, setIsBatchGarmentLoading] = useState(false);

  // 用户标签编辑弹窗状态
  const [tagTargetUser, setTagTargetUser] = useState<any | null>(null);
  const [editingTags, setEditingTags] = useState<string[]>([]);
  const [isSavingTags, setIsSavingTags] = useState(false);

  // Ctrl+K 全局超级命令调色板
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [commandQuery, setCommandQuery] = useState('');

  // 用户详情抽屉状态
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [userDetails, setUserDetails] = useState<any | null>(null);
  const [isDetailsLoading, setIsDetailsLoading] = useState(false);

  // 单人积分调整弹窗状态
  const [adjustTargetUser, setAdjustTargetUser] = useState<any | null>(null);
  const [adjustMode, setAdjustMode] = useState<'ADD' | 'SUB'>('ADD');
  const [adjustType, setAdjustType] = useState<'DAILY' | 'PERMANENT'>('DAILY');
  const [adjustAmount, setAdjustAmount] = useState('50');
  const [adjustReason, setAdjustReason] = useState('活动奖励发放');
  const [isAdjusting, setIsAdjusting] = useState(false);

  // 密码重置弹窗状态
  const [resetPassTargetUser, setResetPassTargetUser] = useState<any | null>(null);
  const [newPasswordVal, setNewPasswordVal] = useState('123456');
  const [isResettingPass, setIsResettingPass] = useState(false);

  // 全员/分群活动积分广播弹窗状态
  const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState(false);
  const [broadcastTargetTag, setBroadcastTargetTag] = useState('ALL');
  const [broadcastPermCredits, setBroadcastPermCredits] = useState('0');
  const [broadcastDailyCredits, setBroadcastDailyCredits] = useState('50');
  const [broadcastReason, setBroadcastReason] = useState('全员运营活动奖励');
  const [isBroadcasting, setIsBroadcasting] = useState(false);

  // 官方单品录入弹窗状态
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadCategory, setUploadCategory] = useState<GarmentCategory>('TOPS');
  const [uploadSubCategory, setUploadSubCategory] = useState('Evening Dress');
  const [uploadBrand, setUploadBrand] = useState('SmartWardrobe 官方');
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

  // 快捷键监听 (Ctrl+K 全局调色板)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
      if (e.key === 'Escape') {
        setIsCommandPaletteOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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
      const [stats, trends] = await Promise.all([
        fetchCmsDashboardStats(),
        fetchCmsDashboardTrends().catch(() => null),
      ]);
      setDashboardStats(stats);
      if (trends) setDashboardTrends(trends);
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
      showToast(e.message || '获取用户列表失败', 'error');
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
      showToast(e.message || '获取全局流水失败', 'error');
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
      showToast(e.message || '获取用户详情失败', 'error');
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
      showToast(`用户状态已成功更新为【${actionName}】！`, 'info');
      loadUsers();
      if (selectedUserId === user.id) {
        handleOpenUserDetails(user.id);
      }
    } catch (e: any) {
      showToast(e.message || '修改状态失败', 'error');
    }
  };

  // 用户多选控制
  const handleToggleSelectUser = (userId: string) => {
    const next = new Set(selectedUserIds);
    if (next.has(userId)) next.delete(userId);
    else next.add(userId);
    setSelectedUserIds(next);
  };

  const handleSelectAllUsers = () => {
    if (selectedUserIds.size === filteredUsers.length) {
      setSelectedUserIds(new Set());
    } else {
      setSelectedUserIds(new Set(filteredUsers.map((u) => u.id)));
    }
  };

  // 批量操作用户
  const handleBatchStatus = async (status: 'NORMAL' | 'FROZEN' | 'BANNED') => {
    const actionName = status === 'NORMAL' ? '批量解封' : status === 'FROZEN' ? '批量冻结' : '批量封禁';
    if (!confirm(`确认要对选中的 ${selectedUserIds.size} 位用户执行【${actionName}】吗？`)) return;
    setIsBatchUserLoading(true);
    try {
      const res = await batchUpdateUserStatus(Array.from(selectedUserIds), status);
      showToast(res.count ? `成功为 ${res.count} 位用户执行${actionName}` : '批量操作完成', 'info');
      setSelectedUserIds(new Set());
      loadUsers();
    } catch (e: any) {
      showToast(e.message || '批量操作失败', 'error');
    } finally {
      setIsBatchUserLoading(false);
    }
  };

  const handleBatchDeleteUsers = async () => {
    if (!confirm(`⚠️ 高危操作：确认要彻底删除选中的 ${selectedUserIds.size} 位用户及其所有档案、单品资产与打卡记录吗？此操作不可逆！`)) return;
    setIsBatchUserLoading(true);
    try {
      const res = await batchDeleteCmsUsers(Array.from(selectedUserIds));
      showToast(`成功彻底删除 ${res.count} 位用户`, 'info');
      setSelectedUserIds(new Set());
      loadUsers();
    } catch (e: any) {
      showToast(e.message || '批量删除失败', 'error');
    } finally {
      setIsBatchUserLoading(false);
    }
  };

  const handleBatchAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(batchAdjustAmount) || 0;
    if (amt <= 0) return showToast('请输入有效的积分数值', 'error');
    setIsBatchUserLoading(true);
    try {
      const signedAmt = batchAdjustMode === 'ADD' ? amt : -amt;
      const deltaDaily = batchAdjustType === 'DAILY' ? signedAmt : 0;
      const deltaPermanent = batchAdjustType === 'PERMANENT' ? signedAmt : 0;
      const res = await batchAdjustUserCredits(Array.from(selectedUserIds), deltaDaily, deltaPermanent, batchAdjustReason);
      showToast(`已为 ${res.count} 位用户完成批量调分！`, 'info');
      setIsBatchAdjustModalOpen(false);
      setSelectedUserIds(new Set());
      loadUsers();
    } catch (e: any) {
      showToast(e.message || '批量调分失败', 'error');
    } finally {
      setIsBatchUserLoading(false);
    }
  };

  // 单品多选控制
  const handleToggleSelectGarment = (garmentId: string) => {
    const next = new Set(selectedGarmentIds);
    if (next.has(garmentId)) next.delete(garmentId);
    else next.add(garmentId);
    setSelectedGarmentIds(next);
  };

  const handleSelectAllGarments = () => {
    if (selectedGarmentIds.size === publicGarments.length) {
      setSelectedGarmentIds(new Set());
    } else {
      setSelectedGarmentIds(new Set(publicGarments.map((g) => g.id)));
    }
  };

  // 批量操作单品
  const handleBatchGarmentStatus = async (isArchived: boolean) => {
    const action = isArchived ? '批量下架' : '批量上架';
    if (!confirm(`确认要将选中的 ${selectedGarmentIds.size} 件公共单品【${action}】吗？`)) return;
    setIsBatchGarmentLoading(true);
    try {
      const res = await batchToggleGarmentStatus(Array.from(selectedGarmentIds), isArchived);
      showToast(`成功${action} ${res.count} 件单品`, 'info');
      setSelectedGarmentIds(new Set());
      onRefreshPublicGarments();
    } catch (e: any) {
      showToast(e.message || '操作失败', 'error');
    } finally {
      setIsBatchGarmentLoading(false);
    }
  };

  const handleBatchDeleteGarments = async () => {
    if (!confirm(`⚠️ 高危操作：确认要彻底删除选中的 ${selectedGarmentIds.size} 件官方公共单品吗？`)) return;
    setIsBatchGarmentLoading(true);
    try {
      const res = await batchDeleteGarments(Array.from(selectedGarmentIds));
      showToast(`成功彻底删除 ${res.count} 件公共单品`, 'info');
      setSelectedGarmentIds(new Set());
      onRefreshPublicGarments();
    } catch (e: any) {
      showToast(e.message || '删除失败', 'error');
    } finally {
      setIsBatchGarmentLoading(false);
    }
  };

  // 标签编辑
  const handleOpenTagModal = (user: any) => {
    setTagTargetUser(user);
    setEditingTags(user.tags ? [...user.tags] : []);
  };

  const handleToggleTag = (tag: string) => {
    if (editingTags.includes(tag)) {
      setEditingTags(editingTags.filter((t) => t !== tag));
    } else {
      setEditingTags([...editingTags, tag]);
    }
  };

  const handleSaveTags = async () => {
    if (!tagTargetUser) return;
    setIsSavingTags(true);
    try {
      await updateCmsUserTags(tagTargetUser.id, editingTags);
      showToast('用户标签已更新！', 'info');
      setTagTargetUser(null);
      loadUsers();
    } catch (e: any) {
      showToast(e.message || '保存标签失败', 'error');
    } finally {
      setIsSavingTags(false);
    }
  };

  // 删除用户
  const handleDeleteUser = async (user: any) => {
    if (user.role === 'ADMIN' || user.id === 'admin-suncraft-0000') {
      showToast('超级管理员账号受核心安全保护，不可删除', 'error');
      return;
    }
    if (!confirm(`⚠️ 危险操作确认：\n确定要彻底删除用户【${user.nickname || user.email}】吗？\n该用户的所有档案、单品资产、搭配和打卡日记将被全部级联清空且无法恢复！`)) return;

    try {
      await deleteCmsUser(user.id);
      showToast(`用户【${user.nickname || user.email}】已成功彻底删除！`, 'info');
      loadUsers();
      if (selectedUserId === user.id) {
        setSelectedUserId(null);
        setUserDetails(null);
      }
    } catch (e: any) {
      showToast(e.message || '删除用户失败', 'error');
    }
  };

  // 重置用户密码
  const handleConfirmResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPassTargetUser || !newPasswordVal.trim()) return;

    setIsResettingPass(true);
    try {
      await resetCmsUserPassword(resetPassTargetUser.id, newPasswordVal.trim());
      showToast(`用户【${resetPassTargetUser.nickname}】登录密码已成功重置为: ${newPasswordVal.trim()}`, 'info');
      setResetPassTargetUser(null);
    } catch (e: any) {
      showToast(e.message || '密码重置失败', 'error');
    } finally {
      setIsResettingPass(false);
    }
  };

  // 调整用户积分
  const handleConfirmAdjustCredits = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustTargetUser) return;

    const amt = Number(adjustAmount);
    if (isNaN(amt) || amt <= 0) {
      showToast('请输入有效的积分数值', 'error');
      return;
    }

    const delta = adjustMode === 'ADD' ? amt : -amt;
    const deltaDaily = adjustType === 'DAILY' ? delta : 0;
    const deltaPerm = adjustType === 'PERMANENT' ? delta : 0;

    setIsAdjusting(true);
    try {
      await adjustUserCredits(
        adjustTargetUser.id,
        deltaDaily,
        deltaPerm,
        `${adjustReason.trim() || '管理员调控'} (${adjustMode === 'ADD' ? '增加' : '扣减'} ${adjustType === 'DAILY' ? '每日' : '永久'} ${amt})`
      );
      showToast(`已为【${adjustTargetUser.nickname}】${adjustMode === 'ADD' ? '发放' : '扣除'} ${amt} 积分！`, 'info');
      setAdjustTargetUser(null);
      loadUsers();
      if (selectedUserId === adjustTargetUser.id) {
        handleOpenUserDetails(adjustTargetUser.id);
      }
    } catch (e: any) {
      showToast(e.message || '调整失败', 'error');
    } finally {
      setIsAdjusting(false);
    }
  };

  // 全员活动积分广播发放
  const handleConfirmBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    const dPerm = Number(broadcastPermCredits) || 0;
    const dDaily = Number(broadcastDailyCredits) || 0;
    if (dPerm === 0 && dDaily === 0) {
      showToast('发放积分数额不能全为 0', 'error');
      return;
    }

    const normalCount = usersList.filter((u) => u.status === 'NORMAL').length;
    if (!confirm(`确认要向全平台当前 ${normalCount} 位正常状态的用户普发积分吗？\n每人获得: ${dDaily > 0 ? `每日 ${dDaily} 分 ` : ''}${dPerm > 0 ? `永久 ${dPerm} 分` : ''}`)) return;

    setIsBroadcasting(true);
    try {
      const res = await broadcastCmsCredits(dPerm, dDaily, broadcastReason.trim());
      showToast(`全员积分普发成功！已为 ${res.count} 位用户成功发放！`, 'info');
      setIsBroadcastModalOpen(false);
      loadDashboard();
      loadUsers();
    } catch (e: any) {
      showToast(e.message || '广播发放失败', 'error');
    } finally {
      setIsBroadcasting(false);
    }
  };

  // 切换官方单品置顶
  const handleToggleGarmentFeatured = async (garment: ExtendedGarmentItem) => {
    try {
      const featured = await toggleOfficialGarmentFeatured(garment.id);
      onRefreshPublicGarments();
      showToast(featured ? '单品已置顶到公共试衣间首位！' : '已取消置顶推荐', 'info');
    } catch (e: any) {
      showToast(e.message || '操作失败', 'error');
    }
  };

  // 彻底删除官方公共单品
  const handleDeleteGarment = async (garment: ExtendedGarmentItem) => {
    if (!confirm(`确定要彻底删除官方公共单品【${garment.title}】吗？此操作不可撤销！`)) return;
    try {
      await deleteOfficialGarment(garment.id);
      showToast('官方单品已成功彻底删除！', 'info');
      onRefreshPublicGarments();
    } catch (e: any) {
      showToast(e.message || '删除单品失败', 'error');
    }
  };

  // 导出用户 CSV 报表
  const handleExportUsersCsv = () => {
    const headers = ['UID,邮箱,昵称,角色,状态,每日积分,永久积分,总积分,档案数,注册时间'];
    const rows = filteredUsers.map((u) =>
      `"${u.id}","${u.email}","${u.nickname}","${u.role}","${u.status}","${u.dailyCredits}","${u.permanentCredits}","${u.totalCredits}","${u.profilesCount}","${u.createdAt}"`
    );
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers, ...rows].join('\n');
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
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers, ...rows].join('\n');
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
      showToast('官方公共单品已成功录入！', 'info');
    } catch (err: any) {
      showToast(err.message || '录入失败', 'error');
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
      showToast('单品信息已更新！', 'info');
    } catch (err: any) {
      showToast(err.message || '更新失败', 'error');
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
    const matchTag = userTagFilter === 'ALL' || (u.tags && u.tags.includes(userTagFilter));
    return matchSearch && matchStatus && matchRole && matchTag;
  });

  // 过滤流水列表
  const filteredLedger = globalLedger.filter((l) => {
    if (ledgerFilterType === 'ALL') return true;
    return l.txType === ledgerFilterType;
  });

  const normalUsersCount = usersList.filter((u) => u.status === 'NORMAL').length;
  const broadcastTargetCount = broadcastTargetTag === 'ALL'
    ? normalUsersCount
    : usersList.filter((u) => u.status === 'NORMAL' && u.tags && u.tags.includes(broadcastTargetTag)).length;

  return (
    <div className="h-full flex flex-col bg-[#FAF8F5] text-stone-800 font-sans select-none overflow-hidden text-left">
      {/* ------------------------------------------------------------- */}
      {/* 顶部管理员控制台 Header (导航绝对物理居中) */}
      {/* ------------------------------------------------------------- */}
      <header className="relative h-16 px-6 border-b border-[#EAE6DF] bg-white/95 backdrop-blur-xl flex items-center justify-between z-30 shrink-0 shadow-2xs">
        {/* 左侧：系统标识 */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-stone-900 text-[#FAF8F5] flex items-center justify-center shadow-xs">
            <ShieldCheck className="w-5 h-5 stroke-[1.75]" />
          </div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-extrabold text-stone-900 tracking-tight">运营控制台</h2>
            <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 border border-stone-200">
              Admin
            </span>
          </div>
        </div>

        {/* 中间：4 大核心功能 Tab (严格视口几何居中) */}
        <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-1 bg-[#FAF8F5] p-1 rounded-2xl border border-[#EAE6DF] shadow-xs">
          {[
            { key: 'DASHBOARD', label: '运营总览', icon: Activity },
            { key: 'USERS', label: '用户与权限', icon: Users },
            { key: 'GARMENTS', label: '公共衣橱', icon: ShoppingBag },
            { key: 'LEDGER', label: '积分审计', icon: History },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-[#2D3436] text-white shadow-xs'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100/70'
                }`}
              >
                <Icon className="w-3.5 h-3.5 stroke-[1.75]" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* 右侧：Ctrl+K 快捷命令栏唤起 & 返回前台 */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsCommandPaletteOpen(true)}
            className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-[#FAF8F5] hover:bg-stone-100 text-stone-500 hover:text-stone-800 border border-[#EAE6DF] rounded-xl text-xs font-medium transition-colors"
            title="唤起快捷超级命令调色板"
          >
            <Command className="w-3.5 h-3.5 text-stone-400" />
            <span className="text-[11px]">快捷命令</span>
            <kbd className="text-[10px] font-mono bg-white px-1.5 py-0.5 rounded border border-stone-200 text-stone-400">
              Ctrl K
            </kbd>
          </button>
          <button
            onClick={onLogoutAdmin}
            className="px-3.5 py-1.5 bg-stone-100 hover:bg-rose-50 hover:text-[#D63031] text-stone-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors border border-stone-200/80"
          >
            <LogOut className="w-3.5 h-3.5 stroke-[1.75]" />
            <span>返回工作台</span>
          </button>
        </div>
      </header>

      {/* ------------------------------------------------------------- */}
      {/* 主体工作区 */}
      {/* ------------------------------------------------------------- */}
      <main className="flex-1 overflow-y-auto px-4 sm:px-6 py-6">
        {/* ----------------------------------------------------------- */}
        {/* TAB 1: 运营总览 (Dashboard Overview) */}
        {/* ----------------------------------------------------------- */}
        {activeTab === 'DASHBOARD' && (
          <div className="w-full max-w-[1580px] mx-auto space-y-6">
            {/* 统计指标卡片 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-2xl border border-[#EAE6DF] p-5 shadow-xs flex flex-col justify-between space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-stone-500">平台注册用户</span>
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Users className="w-4 h-4 stroke-[1.75]" />
                  </div>
                </div>
                <div>
                  <h3 className="text-2xl font-extrabold text-stone-900 font-mono">
                    {dashboardStats?.totalUsers ?? '...'}
                  </h3>
                  <div className="flex items-center gap-2 mt-1 text-[11px] text-stone-400 font-mono">
                    <span className="text-emerald-600">正常: {dashboardStats?.normalUsers ?? 0}</span>
                    <span>冻结: {dashboardStats?.frozenUsers ?? 0}</span>
                    <span className="text-rose-600">封禁: {dashboardStats?.bannedUsers ?? 0}</span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-[#EAE6DF] p-5 shadow-xs flex flex-col justify-between space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-stone-500">AI 试穿生成总数</span>
                  <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 stroke-[1.75]" />
                  </div>
                </div>
                <div>
                  <h3 className="text-2xl font-extrabold text-stone-900 font-mono">
                    {dashboardStats?.totalTasks ?? '...'}
                  </h3>
                  <p className="text-[11px] text-stone-400 mt-1 font-mono">
                    累计生成搭配: {dashboardStats?.totalOutfits ?? 0} 套
                  </p>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-[#EAE6DF] p-5 shadow-xs flex flex-col justify-between space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-stone-500">积分流通总池</span>
                  <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                    <Coins className="w-4 h-4 stroke-[1.75]" />
                  </div>
                </div>
                <div>
                  <h3 className="text-2xl font-extrabold text-amber-600 font-mono">
                    {dashboardStats ? dashboardStats.totalDailyPool + dashboardStats.totalPermanentPool : '...'}
                  </h3>
                  <div className="flex items-center gap-2 mt-1 text-[11px] text-stone-400 font-mono">
                    <span>每日池: {dashboardStats?.totalDailyPool ?? 0}</span>
                    <span className="text-amber-700">永久池: {dashboardStats?.totalPermanentPool ?? 0}</span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-[#EAE6DF] p-5 shadow-xs flex flex-col justify-between space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-stone-500">官方公共单品</span>
                  <div className="w-8 h-8 rounded-xl bg-rose-50 text-[#D63031] flex items-center justify-center">
                    <Shirt className="w-4 h-4 stroke-[1.75]" />
                  </div>
                </div>
                <div>
                  <h3 className="text-2xl font-extrabold text-stone-900 font-mono">
                    {dashboardStats?.totalPublicGarments ?? '...'}
                  </h3>
                  <div className="flex items-center gap-2 mt-1 text-[11px] text-stone-400 font-mono">
                    <span className="text-emerald-600">上架中: {dashboardStats?.activePublicGarments ?? 0}</span>
                    <span className="text-amber-600">置顶: {dashboardStats?.featuredPublicGarments ?? 0}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 7日关键业务运营走势图 (轻量交互原生 SVG 图表) */}
            {dashboardTrends && (
              <div className="bg-white rounded-2xl border border-[#EAE6DF] p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                  <div>
                    <h4 className="text-sm font-extrabold text-stone-900 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-[#D63031]" />
                      <span>7 日核心业务运营走势</span>
                    </h4>
                    <p className="text-xs text-stone-400">实时反映平台 AI 算力试穿负载、积分流通消费与用户增长曲线</p>
                  </div>
                  <div className="flex items-center gap-4 text-xs font-mono font-bold">
                    <span className="flex items-center gap-1.5 text-purple-600">
                      <span className="w-2 h-2 rounded-full bg-purple-600"></span> 试穿任务
                    </span>
                    <span className="flex items-center gap-1.5 text-amber-600">
                      <span className="w-2 h-2 rounded-full bg-amber-600"></span> 积分消耗
                    </span>
                    <span className="flex items-center gap-1.5 text-blue-600">
                      <span className="w-2 h-2 rounded-full bg-blue-600"></span> 新增用户
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* 图表 1: 任务走势 */}
                  <div className="p-4 bg-[#FAF8F5] rounded-xl border border-[#EAE6DF] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-stone-700">AI 试穿生成走势</span>
                      <span className="text-xs font-mono font-bold text-purple-600">
                        {dashboardTrends.tasksTrend.reduce((a, b) => a + b, 0)} 次 / 7日
                      </span>
                    </div>
                    {(() => {
                      const max = Math.max(...dashboardTrends.tasksTrend, 6);
                      const pts = dashboardTrends.tasksTrend.map((v, i) => {
                        const x = (i / (dashboardTrends.tasksTrend.length - 1)) * 360 + 20;
                        const y = 85 - (v / max) * 60;
                        return { x, y, v };
                      });
                      const path = 'M ' + pts.map((p) => p.x + ' ' + p.y).join(' L ');
                      const area = path + ' L ' + pts[pts.length - 1].x + ' 85 L ' + pts[0].x + ' 85 Z';
                      return (
                        <svg viewBox="0 0 400 110" className="w-full h-24 overflow-visible">
                          <defs>
                            <linearGradient id="purpleGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#9333ea" stopOpacity="0.25" />
                              <stop offset="100%" stopColor="#9333ea" stopOpacity="0" />
                            </linearGradient>
                          </defs>
                          <path d={area} fill="url(#purpleGrad)" />
                          <path d={path} fill="none" stroke="#9333ea" strokeWidth="2.5" strokeLinecap="round" />
                          {pts.map((p, i) => (
                            <g key={i}>
                              <circle cx={p.x} cy={p.y} r="3" fill="#ffffff" stroke="#9333ea" strokeWidth="2" />
                              <text x={p.x} y="105" textAnchor="middle" fill="#a8a29e" fontSize="9" fontFamily="monospace">
                                {dashboardTrends.dates[i]}
                              </text>
                            </g>
                          ))}
                        </svg>
                      );
                    })()}
                  </div>

                  {/* 图表 2: 积分消耗走势 */}
                  <div className="p-4 bg-[#FAF8F5] rounded-xl border border-[#EAE6DF] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-stone-700">算力积分消耗走势</span>
                      <span className="text-xs font-mono font-bold text-amber-600">
                        {dashboardTrends.creditsTrend.reduce((a, b) => a + b, 0)} 分 / 7日
                      </span>
                    </div>
                    {(() => {
                      const max = Math.max(...dashboardTrends.creditsTrend, 30);
                      const pts = dashboardTrends.creditsTrend.map((v, i) => {
                        const x = (i / (dashboardTrends.creditsTrend.length - 1)) * 360 + 20;
                        const y = 85 - (v / max) * 60;
                        return { x, y, v };
                      });
                      const path = 'M ' + pts.map((p) => p.x + ' ' + p.y).join(' L ');
                      const area = path + ' L ' + pts[pts.length - 1].x + ' 85 L ' + pts[0].x + ' 85 Z';
                      return (
                        <svg viewBox="0 0 400 110" className="w-full h-24 overflow-visible">
                          <defs>
                            <linearGradient id="amberGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#d97706" stopOpacity="0.25" />
                              <stop offset="100%" stopColor="#d97706" stopOpacity="0" />
                            </linearGradient>
                          </defs>
                          <path d={area} fill="url(#amberGrad)" />
                          <path d={path} fill="none" stroke="#d97706" strokeWidth="2.5" strokeLinecap="round" />
                          {pts.map((p, i) => (
                            <g key={i}>
                              <circle cx={p.x} cy={p.y} r="3" fill="#ffffff" stroke="#d97706" strokeWidth="2" />
                              <text x={p.x} y="105" textAnchor="middle" fill="#a8a29e" fontSize="9" fontFamily="monospace">
                                {dashboardTrends.dates[i]}
                              </text>
                            </g>
                          ))}
                        </svg>
                      );
                    })()}
                  </div>

                  {/* 图表 3: 新增用户分布柱状图 */}
                  <div className="p-4 bg-[#FAF8F5] rounded-xl border border-[#EAE6DF] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-stone-700">新注册用户分布</span>
                      <span className="text-xs font-mono font-bold text-blue-600">
                        +{dashboardTrends.usersTrend.reduce((a, b) => a + b, 0)} 位 / 7日
                      </span>
                    </div>
                    {(() => {
                      const max = Math.max(...dashboardTrends.usersTrend, 4);
                      return (
                        <svg viewBox="0 0 400 110" className="w-full h-24 overflow-visible">
                          {dashboardTrends.usersTrend.map((u, i) => {
                            const x = (i / (dashboardTrends.usersTrend.length - 1)) * 360 + 20;
                            const barHeight = Math.max(4, (u / max) * 60);
                            const y = 85 - barHeight;
                            return (
                              <g key={i}>
                                <rect x={x - 8} y={y} width="16" height={barHeight} rx="3" fill="#3b82f6" fillOpacity={u > 0 ? 0.85 : 0.2} />
                                <text x={x} y={y - 3} textAnchor="middle" fill="#2563eb" fontSize="9" fontWeight="bold" fontFamily="monospace">
                                  {u}
                                </text>
                                <text x={x} y="105" textAnchor="middle" fill="#a8a29e" fontSize="9" fontFamily="monospace">
                                  {dashboardTrends.dates[i]}
                                </text>
                              </g>
                            );
                          })}
                        </svg>
                      );
                    })()}
                  </div>
                </div>
              </div>
            )}

            {/* 运营快捷操作卡片 */}
            <div className="bg-white rounded-2xl border border-[#EAE6DF] p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                <div>
                  <h4 className="text-sm font-extrabold text-stone-900">快捷运营操作</h4>
                  <p className="text-xs text-stone-400">一键全局调控积分与触发全员定时重置</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-[#FAF8F5] rounded-xl border border-[#EAE6DF] flex items-center justify-between">
                  <div className="space-y-0.5">
                    <h5 className="text-xs font-bold text-stone-800">全员活动积分普发 (广播)</h5>
                    <p className="text-[11px] text-stone-400">向全平台所有正常用户统一充值活动/补偿积分</p>
                  </div>
                  <button
                    onClick={() => setIsBroadcastModalOpen(true)}
                    className="px-3.5 py-2 bg-[#D63031] hover:bg-[#c0392b] text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-colors"
                  >
                    <Send className="w-3.5 h-3.5 stroke-[2]" />
                    <span>全员普发</span>
                  </button>
                </div>

                <div className="p-4 bg-[#FAF8F5] rounded-xl border border-[#EAE6DF] flex items-center justify-between">
                  <div className="space-y-0.5">
                    <h5 className="text-xs font-bold text-stone-800">每日 100 积分定时补齐</h5>
                    <p className="text-[11px] text-stone-400">手动触发每日零点任务，为所有不足 100 分的用户补齐</p>
                  </div>
                  <button
                    onClick={async () => {
                      if (!confirm('确认要手动触发全员每日 100 积分重置补齐吗？')) return;
                      await resetCreditsAdmin();
                      showToast('每日 100 积分已全员重置补齐！', 'info');
                      loadDashboard();
                    }}
                    className="px-3.5 py-2 bg-stone-800 hover:bg-black text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5 stroke-[2]" />
                    <span>立即补齐</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ----------------------------------------------------------- */}
        {/* TAB 2: 用户与权限管理 (User Management) */}
        {/* ----------------------------------------------------------- */}
        {activeTab === 'USERS' && (
          <div className="w-full max-w-[1580px] mx-auto space-y-4">
            {/* 过滤工具栏 */}
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
                  <option value="NORMAL">正常</option>
                  <option value="FROZEN">已冻结</option>
                  <option value="BANNED">已封禁</option>
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

                <select
                  value={userTagFilter}
                  onChange={(e) => setUserTagFilter(e.target.value)}
                  className="bg-[#FAF8F5] border border-[#EAE6DF] rounded-xl px-3 py-1.5 text-xs text-stone-700 focus:outline-none font-bold"
                >
                  <option value="ALL">全部标签</option>
                  {PRESET_USER_TAGS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsBroadcastModalOpen(true)}
                  className="px-3.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200/80 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
                >
                  <Send className="w-3.5 h-3.5 stroke-[1.75]" />
                  <span>全员普发积分</span>
                </button>
                <button
                  onClick={handleExportUsersCsv}
                  className="px-3.5 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
                >
                  <Download className="w-3.5 h-3.5 stroke-[1.75]" />
                  <span>导出报表</span>
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

            {/* 用户列表表格 */}
            <div className="bg-white rounded-2xl border border-[#EAE6DF] shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#FAF8F5] border-b border-[#EAE6DF] text-stone-500 font-bold">
                      <th className="py-3 px-4 w-12 text-center whitespace-nowrap">
                        <button
                          onClick={handleSelectAllUsers}
                          className="text-stone-400 hover:text-stone-700 transition-colors"
                        >
                          {selectedUserIds.size > 0 && selectedUserIds.size === filteredUsers.length ? (
                            <CheckSquare className="w-4 h-4 text-[#D63031]" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </th>
                      <th className="py-3 px-4 whitespace-nowrap">用户标识</th>
                      <th className="py-3 px-4 whitespace-nowrap min-w-[200px]">昵称 / 邮箱</th>
                      <th className="py-3 px-4 whitespace-nowrap text-center">角色</th>
                      <th className="py-3 px-4 whitespace-nowrap text-center">状态</th>
                      <th className="py-3 px-4 whitespace-nowrap min-w-[150px]">标签</th>
                      <th className="py-3 px-4 whitespace-nowrap">积分 (每日 / 永久)</th>
                      <th className="py-3 px-4 whitespace-nowrap text-center">档案数</th>
                      <th className="py-3 px-4 whitespace-nowrap">注册时间</th>
                      <th className="py-3 px-4 text-right whitespace-nowrap">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="text-center py-12 text-stone-400">
                          未检索到符合条件的用户数据
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((u) => {
                        const isSelected = selectedUserIds.has(u.id);
                        return (
                          <tr
                            key={u.id}
                            className={`transition-colors ${
                              isSelected ? 'bg-rose-50/50' : 'hover:bg-[#FAF8F5]/80'
                            }`}
                          >
                            <td className="py-3 px-4 text-center">
                              <button
                                onClick={() => handleToggleSelectUser(u.id)}
                                className="text-stone-400 hover:text-stone-700 transition-colors"
                              >
                                {isSelected ? (
                                  <CheckSquare className="w-4 h-4 text-[#D63031]" />
                                ) : (
                                  <Square className="w-4 h-4" />
                                )}
                              </button>
                            </td>
                            <td className="py-3 px-4 font-mono text-[11px] text-stone-400 whitespace-nowrap">
                            {u.id.slice(0, 12)}...
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-full bg-rose-50 text-[#D63031] border border-rose-100 flex items-center justify-center font-bold text-xs shrink-0">
                                {(u.nickname || u.email)[0]}
                              </div>
                              <div>
                                <div className="font-bold text-stone-900 leading-tight">{u.nickname || '未设置'}</div>
                                <div className="text-[10px] text-stone-400 leading-tight">{u.email}</div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap text-center">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-md font-bold text-[10px] font-mono whitespace-nowrap ${
                                u.role === 'ADMIN'
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                  : 'bg-stone-100 text-stone-600'
                              }`}
                            >
                              {u.role}
                            </span>
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap text-center">
                            <span
                              className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded-md font-bold text-[10px] whitespace-nowrap shrink-0 ${
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
                          <td className="py-3 px-4 whitespace-nowrap">
                            <div className="flex items-center gap-1">
                              {u.tags && u.tags.length > 0 ? (
                                u.tags.map((tag: string) => (
                                  <span
                                    key={tag}
                                    className="px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200 text-[10px] font-bold whitespace-nowrap"
                                  >
                                    {tag}
                                  </span>
                                ))
                              ) : (
                                <span className="text-[10px] text-stone-300">无</span>
                              )}
                              <button
                                onClick={() => handleOpenTagModal(u)}
                                className="p-1 text-stone-400 hover:text-stone-700 rounded hover:bg-stone-100 transition-colors"
                                title="管理用户标签"
                              >
                                <Tag className="w-3 h-3" />
                              </button>
                            </div>
                          </td>
                          <td className="py-3 px-4 font-mono whitespace-nowrap">
                            <span className="font-bold text-stone-900">{u.dailyCredits}</span>
                            <span className="text-stone-400"> / </span>
                            <span className="text-amber-600 font-bold">+{u.permanentCredits}</span>
                          </td>
                          <td className="py-3 px-4 font-mono text-stone-600 whitespace-nowrap text-center">
                            {u.profilesCount} 个
                          </td>
                          <td className="py-3 px-4 text-stone-400 font-mono text-[11px] whitespace-nowrap">
                            {new Date(u.createdAt).toLocaleDateString()}
                          </td>
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <div className="inline-flex items-center gap-1.5">
                              {/* 查看详情 */}
                              <button
                                onClick={() => handleOpenUserDetails(u.id)}
                                className="p-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 transition-colors"
                                title="查看用户详情"
                              >
                                <Eye className="w-3.5 h-3.5 stroke-[1.75]" />
                              </button>

                              {/* 定向调分 */}
                              <button
                                onClick={() => {
                                  setAdjustTargetUser(u);
                                  setAdjustMode('ADD');
                                  setAdjustType('DAILY');
                                  setAdjustAmount('50');
                                  setAdjustReason('活动奖励发放');
                                }}
                                className="p-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200/60 transition-colors"
                                title="给该用户定向调分"
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

                              {/* 冻结/解封状态切换 */}
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

                                  {/* 删除用户 */}
                                  <button
                                    onClick={() => handleDeleteUser(u)}
                                    className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-600 hover:text-white text-rose-600 border border-rose-200/60 transition-colors"
                                    title="彻底删除用户"
                                  >
                                    <Trash2 className="w-3.5 h-3.5 stroke-[1.75]" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    }))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 用户批量操作浮动底栏 (Floating Action Bar) */}
            {selectedUserIds.size > 0 && (
              <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-stone-900/95 backdrop-blur-md text-white px-6 py-3 rounded-2xl shadow-2xl border border-stone-700 flex items-center gap-4">
                <div className="flex items-center gap-2 text-xs font-bold text-stone-300">
                  <span className="w-2 h-2 rounded-full bg-[#D63031] animate-pulse"></span>
                  <span>已选中 {selectedUserIds.size} 位用户</span>
                </div>

                <div className="h-4 w-[1px] bg-stone-700"></div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleBatchStatus('NORMAL')}
                    disabled={isBatchUserLoading}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors disabled:opacity-50"
                  >
                    批量解封
                  </button>
                  <button
                    onClick={() => handleBatchStatus('FROZEN')}
                    disabled={isBatchUserLoading}
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-colors disabled:opacity-50"
                  >
                    批量冻结
                  </button>
                  <button
                    onClick={() => setIsBatchAdjustModalOpen(true)}
                    disabled={isBatchUserLoading}
                    className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-colors disabled:opacity-50"
                  >
                    批量调分
                  </button>
                  <button
                    onClick={handleBatchDeleteUsers}
                    disabled={isBatchUserLoading}
                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-colors disabled:opacity-50"
                  >
                    批量删除
                  </button>
                  <button
                    onClick={() => setSelectedUserIds(new Set())}
                    className="px-2.5 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-white rounded-xl text-xs transition-colors"
                  >
                    取消全选
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ----------------------------------------------------------- */}
        {/* TAB 3: 官方公共单品管理 (Garment CMS) */}
        {/* ----------------------------------------------------------- */}
        {activeTab === 'GARMENTS' && (
          <div className="w-full max-w-[1580px] mx-auto space-y-4">
            {/* 顶部动作条 */}
            <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-[#EAE6DF] shadow-xs">
              <div className="flex items-center gap-3">
                <button
                  onClick={handleSelectAllGarments}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-stone-200 text-xs font-bold text-stone-700 hover:bg-stone-50 transition-colors"
                >
                  {selectedGarmentIds.size > 0 && selectedGarmentIds.size === publicGarments.length ? (
                    <CheckSquare className="w-3.5 h-3.5 text-[#D63031]" />
                  ) : (
                    <Square className="w-3.5 h-3.5" />
                  )}
                  <span>全选单品 ({selectedGarmentIds.size}/{publicGarments.length})</span>
                </button>
                <div>
                  <h3 className="text-sm font-extrabold text-stone-900">
                    官方公共单品 ({publicGarments.length})
                  </h3>
                  <p className="text-xs text-stone-400">管理公共试衣间单品、置顶推荐与上架状态</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsUploadModalOpen(true)}
                  className="px-3.5 py-2 bg-[#D63031] hover:bg-[#c0392b] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
                >
                  <Plus className="w-4 h-4 stroke-[2]" />
                  <span>录入官方单品</span>
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

            {/* 单品网格 */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {publicGarments.map((g) => {
                const isSelected = selectedGarmentIds.has(g.id);
                return (
                  <div
                    key={g.id}
                    className={`bg-white rounded-2xl border p-4 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-3 relative overflow-hidden ${
                      isSelected
                        ? 'border-[#D63031] ring-2 ring-[#D63031]/20'
                        : g.isArchived
                        ? 'border-dashed border-stone-300 opacity-60'
                        : 'border-[#EAE6DF]'
                    }`}
                  >
                    {/* 复选框 */}
                    <button
                      onClick={() => handleToggleSelectGarment(g.id)}
                      className="absolute top-3 left-3 z-10 p-1 rounded-lg bg-white/90 backdrop-blur-xs border border-stone-200 hover:bg-white transition-colors"
                    >
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 text-[#D63031]" />
                      ) : (
                        <Square className="w-4 h-4 text-stone-400" />
                      )}
                    </button>
                  {/* 置顶角标 */}
                  {g.isFeatured && (
                    <div className="absolute top-3 right-3 bg-amber-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5 shadow-xs">
                      <Star className="w-2.5 h-2.5 fill-white" /> 置顶
                    </div>
                  )}

                  <div className="space-y-2">
                    <div className="w-full aspect-square bg-[#FAF8F5] rounded-xl border border-[#EAE6DF] flex items-center justify-center p-3 overflow-hidden">
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

                  {/* 操作栏 */}
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
                      编辑
                    </button>

                    <button
                      onClick={async () => {
                        await toggleOfficialGarmentStatus(g.id);
                        onRefreshPublicGarments();
                      }}
                      className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-colors ${
                        g.isArchived
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-stone-100 text-stone-700 border-stone-200 hover:bg-stone-200'
                      }`}
                    >
                      {g.isArchived ? '上架' : '下架'}
                    </button>

                    {/* 删除单品 */}
                    <button
                      onClick={() => handleDeleteGarment(g)}
                      className="p-1.5 bg-rose-50 hover:bg-rose-600 hover:text-white text-rose-600 border border-rose-200 rounded-xl transition-colors"
                      title="彻底删除单品"
                    >
                      <Trash2 className="w-3.5 h-3.5 stroke-[1.75]" />
                    </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 单品批量浮动操作条 (Floating Action Bar) */}
            {selectedGarmentIds.size > 0 && (
              <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-stone-900/95 backdrop-blur-md text-white px-6 py-3 rounded-2xl shadow-2xl border border-stone-700 flex items-center gap-4">
                <div className="flex items-center gap-2 text-xs font-bold text-stone-300">
                  <span className="w-2 h-2 rounded-full bg-[#D63031] animate-pulse"></span>
                  <span>已选中 {selectedGarmentIds.size} 件公共单品</span>
                </div>

                <div className="h-4 w-[1px] bg-stone-700"></div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleBatchGarmentStatus(false)}
                    disabled={isBatchGarmentLoading}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors disabled:opacity-50"
                  >
                    批量上架
                  </button>
                  <button
                    onClick={() => handleBatchGarmentStatus(true)}
                    disabled={isBatchGarmentLoading}
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-colors disabled:opacity-50"
                  >
                    批量下架
                  </button>
                  <button
                    onClick={handleBatchDeleteGarments}
                    disabled={isBatchGarmentLoading}
                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-colors disabled:opacity-50"
                  >
                    批量彻底删除
                  </button>
                  <button
                    onClick={() => setSelectedGarmentIds(new Set())}
                    className="px-2.5 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-white rounded-xl text-xs transition-colors"
                  >
                    取消全选
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ----------------------------------------------------------- */}
        {/* TAB 4: 全局积分审计流水 (Audit Ledger) */}
        {/* ----------------------------------------------------------- */}
        {activeTab === 'LEDGER' && (
          <div className="w-full max-w-[1580px] mx-auto space-y-4">
            {/* 过滤与导出 Bar */}
            <div className="bg-white p-4 rounded-2xl border border-[#EAE6DF] shadow-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-stone-500">流水类型:</span>
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
                  <span>导出流水</span>
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
            <div className="bg-white rounded-2xl border border-[#EAE6DF] shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#FAF8F5] border-b border-[#EAE6DF] text-stone-500 font-bold">
                      <th className="py-3 px-4 whitespace-nowrap">流水号</th>
                      <th className="py-3 px-4 whitespace-nowrap">用户 UID</th>
                      <th className="py-3 px-4 whitespace-nowrap">业务类型</th>
                      <th className="py-3 px-4 whitespace-nowrap">变动数额 (每日 / 永久)</th>
                      <th className="py-3 px-4 whitespace-nowrap">变动后余额</th>
                      <th className="py-3 px-4 whitespace-nowrap min-w-[200px]">说明</th>
                      <th className="py-3 px-4 whitespace-nowrap">时间戳</th>
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
      {/* 用户详情抽屉 (Drawer) */}
      {/* ------------------------------------------------------------- */}
      {selectedUserId && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-white h-full shadow-2xl p-6 flex flex-col justify-between overflow-y-auto space-y-6 text-left border-l border-[#EAE6DF]">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-2xl bg-rose-50 text-[#D63031] flex items-center justify-center font-bold text-sm">
                    {(userDetails?.user?.nickname || 'U')[0]}
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-stone-900">
                      {userDetails?.user?.nickname || '用户详情'}
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
                  <p className="text-xs">加载用户数据中...</p>
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

                  {/* 身材档案 */}
                  <div className="space-y-2">
                    <h5 className="font-extrabold text-stone-800">
                      身材档案 ({userDetails.profiles?.length || 0})
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

                  {/* 私有单品资产库 */}
                  <div className="space-y-2">
                    <h5 className="font-extrabold text-stone-800">
                      私有单品 ({userDetails.garmentsCount || 0} 件)
                    </h5>
                    <div className="grid grid-cols-4 gap-2">
                      {userDetails.garments?.map((g: any) => (
                        <div key={g.id} className="aspect-square bg-[#FAF8F5] rounded-xl border border-[#EAE6DF] p-1 flex items-center justify-center overflow-hidden">
                          <img src={g.assets?.[0]?.pngUrl} alt={g.title} className="max-h-full max-w-full object-contain" />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 搭配套装 */}
                  <div className="space-y-2">
                    <h5 className="font-extrabold text-stone-800">
                      搭配套装 ({userDetails.outfitsCount || 0} 套)
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

            <div className="space-y-2">
              {userDetails?.user && userDetails.user.role !== 'ADMIN' && (
                <button
                  onClick={() => handleDeleteUser(userDetails.user)}
                  className="w-full py-2.5 bg-rose-50 hover:bg-rose-600 hover:text-white text-rose-600 border border-rose-200 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>彻底删除此用户</span>
                </button>
              )}
              <button
                onClick={() => {
                  setSelectedUserId(null);
                  setUserDetails(null);
                }}
                className="w-full py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-bold transition-colors"
              >
                关闭抽屉
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 单人定向调分弹窗 (Clear UX) */}
      {/* ------------------------------------------------------------- */}
      {adjustTargetUser && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl border border-[#EAE6DF] shadow-2xl p-6 w-full max-w-md space-y-4 text-left">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div>
                <h4 className="text-sm font-extrabold text-stone-900 flex items-center gap-1.5">
                  <Coins className="w-4 h-4 text-amber-600" />
                  <span>用户定向调分</span>
                </h4>
                <p className="text-[11px] text-stone-400 mt-0.5">
                  为【{adjustTargetUser.nickname || adjustTargetUser.email}】单独调整积分
                </p>
              </div>
              <button onClick={() => setAdjustTargetUser(null)} className="text-stone-400 hover:text-stone-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmAdjustCredits} className="space-y-4 text-xs">
              {/* 当前余额卡片 */}
              <div className="p-3 bg-[#FAF8F5] rounded-xl border border-[#EAE6DF] flex items-center justify-between font-mono">
                <span className="text-stone-500">当前余额</span>
                <span className="font-bold text-stone-900">
                  每日: {adjustTargetUser.dailyCredits} | 永久: +{adjustTargetUser.permanentCredits}
                </span>
              </div>

              {/* 调分方向 */}
              <div>
                <label className="font-bold text-stone-700 block mb-1.5">调控方向</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjustMode('ADD')}
                    className={`py-2 rounded-xl font-bold border transition-colors flex items-center justify-center gap-1.5 ${
                      adjustMode === 'ADD'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                        : 'bg-stone-50 text-stone-600 border-stone-200'
                    }`}
                  >
                    <span>[+] 充值发放</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustMode('SUB')}
                    className={`py-2 rounded-xl font-bold border transition-colors flex items-center justify-center gap-1.5 ${
                      adjustMode === 'SUB'
                        ? 'bg-rose-50 text-[#D63031] border-rose-300'
                        : 'bg-stone-50 text-stone-600 border-stone-200'
                    }`}
                  >
                    <span>[-] 扣减扣除</span>
                  </button>
                </div>
              </div>

              {/* 积分类型 */}
              <div>
                <label className="font-bold text-stone-700 block mb-1.5">积分类型</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjustType('DAILY')}
                    className={`py-2 rounded-xl font-bold border text-left px-3 transition-colors ${
                      adjustType === 'DAILY'
                        ? 'bg-amber-50 text-amber-800 border-amber-300'
                        : 'bg-stone-50 text-stone-600 border-stone-200'
                    }`}
                  >
                    <div className="font-bold">每日通用积分</div>
                    <div className="text-[10px] text-stone-400 font-normal">次日 00:00 自动重置</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustType('PERMANENT')}
                    className={`py-2 rounded-xl font-bold border text-left px-3 transition-colors ${
                      adjustType === 'PERMANENT'
                        ? 'bg-amber-50 text-amber-800 border-amber-300'
                        : 'bg-stone-50 text-stone-600 border-stone-200'
                    }`}
                  >
                    <div className="font-bold">永久高定积分</div>
                    <div className="text-[10px] text-stone-400 font-normal">永久有效，不重置</div>
                  </button>
                </div>
              </div>

              {/* 数额输入与预设快捷键 */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-stone-700">积分数值</label>
                  <div className="flex items-center gap-1">
                    {['10', '50', '100', '500'].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setAdjustAmount(preset)}
                        className="px-2 py-0.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-600 font-mono text-[10px] font-bold"
                      >
                        +{preset}
                      </button>
                    ))}
                  </div>
                </div>
                <input
                  type="number"
                  min="1"
                  value={adjustAmount}
                  onChange={(e) => setAdjustAmount(e.target.value)}
                  className="w-full bg-[#FAF8F5] border border-[#EAE6DF] rounded-xl px-3 py-2 text-stone-900 font-mono text-sm font-bold focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              {/* 原因备注与快捷词 */}
              <div>
                <label className="font-bold text-stone-700 block mb-1">操作原因 / 审计备注</label>
                <div className="flex flex-wrap gap-1.5 mb-1.5">
                  {['活动奖励发放', '系统维护补偿', '测试充值', '违规违规扣除'].map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setAdjustReason(tag)}
                      className="px-2 py-0.5 rounded-lg bg-[#FAF8F5] border border-stone-200 hover:border-stone-400 text-stone-600 text-[10px]"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full bg-[#FAF8F5] border border-[#EAE6DF] rounded-xl px-3 py-2 text-stone-900 focus:outline-none"
                  required
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAdjustTargetUser(null)}
                  className="flex-1 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl font-bold transition-colors"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={isAdjusting}
                  className="flex-1 py-2.5 bg-[#D63031] hover:bg-[#c0392b] text-white rounded-xl font-bold shadow-xs transition-colors disabled:opacity-50"
                >
                  {isAdjusting ? '提交中...' : '确认调分'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 全员活动普发积分弹窗 (Clear UX) */}
      {/* ------------------------------------------------------------- */}
      {isBroadcastModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl border border-[#EAE6DF] shadow-2xl p-6 w-full max-w-md space-y-4 text-left">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div>
                <h4 className="text-sm font-extrabold text-stone-900 flex items-center gap-1.5">
                  <Send className="w-4 h-4 text-[#D63031]" />
                  <span>📢 全员活动普发积分</span>
                </h4>
                <p className="text-[11px] text-stone-400 mt-0.5">
                  将同时向全平台所有【正常】状态的用户发放积分
                </p>
              </div>
              <button onClick={() => setIsBroadcastModalOpen(false)} className="text-stone-400 hover:text-stone-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 受众与预算预览 */}
            <div className="p-3 bg-rose-50/60 rounded-xl border border-rose-200/60 text-[11px] text-stone-700 space-y-1">
              <div className="flex justify-between">
                <span>有效接收用户数:</span>
                <span className="font-bold font-mono text-[#D63031]">{normalUsersCount} 人</span>
              </div>
              <div className="flex justify-between">
                <span>预计发放总预算:</span>
                <span className="font-bold font-mono text-stone-900">
                  {normalUsersCount * (Number(broadcastDailyCredits) + Number(broadcastPermCredits))} 积分
                </span>
              </div>
            </div>

            <form onSubmit={handleConfirmBroadcast} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-stone-700 block mb-1">每位用户发放【每日通用积分】</label>
                <input
                  type="number"
                  min="0"
                  value={broadcastDailyCredits}
                  onChange={(e) => setBroadcastDailyCredits(e.target.value)}
                  className="w-full bg-[#FAF8F5] border border-[#EAE6DF] rounded-xl px-3 py-2 text-stone-900 font-mono focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-stone-700 block mb-1">每位用户发放【永久高定积分】</label>
                <input
                  type="number"
                  min="0"
                  value={broadcastPermCredits}
                  onChange={(e) => setBroadcastPermCredits(e.target.value)}
                  className="w-full bg-[#FAF8F5] border border-[#EAE6DF] rounded-xl px-3 py-2 text-stone-900 font-mono focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-stone-700 block mb-1">活动说明 / 广播公告</label>
                <input
                  type="text"
                  value={broadcastReason}
                  onChange={(e) => setBroadcastReason(e.target.value)}
                  placeholder="如: 早秋时装周全员活动奖励"
                  className="w-full bg-[#FAF8F5] border border-[#EAE6DF] rounded-xl px-3 py-2 text-stone-900 focus:outline-none"
                  required
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsBroadcastModalOpen(false)}
                  className="flex-1 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl font-bold transition-colors"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={isBroadcasting}
                  className="flex-1 py-2.5 bg-[#D63031] hover:bg-[#c0392b] text-white rounded-xl font-bold shadow-xs transition-colors disabled:opacity-50"
                >
                  {isBroadcasting ? '广播发放中...' : '确认全员发放'}
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
      {/* 官方公共单品录入弹窗 */}
      {/* ------------------------------------------------------------- */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-[#EAE6DF] shadow-2xl p-6 w-full max-w-lg space-y-4 text-left">
            <div className="flex items-center justify-between border-b border-stone-100 pb-2">
              <h4 className="text-sm font-extrabold text-stone-900">
                录入官方公共单品
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
                  <label className="font-bold text-stone-700 block mb-1">官方定价 (元)</label>
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
    
      {/* ------------------------------------------------------------- */}
      {/* 模态弹窗: 用户标签编辑模态 */}
      {/* ------------------------------------------------------------- */}
      {tagTargetUser && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-[#EAE6DF] space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-purple-600" />
                <h4 className="text-sm font-extrabold text-stone-900">
                  编辑用户标签
                </h4>
              </div>
              <button
                onClick={() => setTagTargetUser(null)}
                className="text-stone-400 hover:text-stone-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-stone-500">
              正在为【{tagTargetUser.nickname || tagTargetUser.email}】配置标签分群：
            </p>

            <div className="flex flex-wrap gap-2 pt-1">
              {PRESET_USER_TAGS.map((tag) => {
                const isChecked = editingTags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => handleToggleTag(tag)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 ${
                      isChecked
                        ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                        : 'bg-[#FAF8F5] text-stone-600 border-stone-200 hover:border-stone-400'
                    }`}
                  >
                    {isChecked && <Check className="w-3 h-3 stroke-[2.5]" />}
                    <span>{tag}</span>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-3 pt-3">
              <button
                type="button"
                onClick={() => setTagTargetUser(null)}
                className="flex-1 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold transition-colors"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleSaveTags}
                disabled={isSavingTags}
                className="flex-1 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-colors shadow-xs"
              >
                {isSavingTags ? '保存中...' : '确认保存'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 模态弹窗: 批量积分调整模态 */}
      {/* ------------------------------------------------------------- */}
      {isBatchAdjustModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-[#EAE6DF] space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <Coins className="w-5 h-5 text-purple-600" />
                <div>
                  <h4 className="text-sm font-extrabold text-stone-900">批量定向调分</h4>
                  <p className="text-[11px] text-stone-400">
                    为已选中的 {selectedUserIds.size} 位用户批量调整积分
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsBatchAdjustModalOpen(false)}
                className="text-stone-400 hover:text-stone-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleBatchAdjustSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1.5">调控方向</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setBatchAdjustMode('ADD')}
                    className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                      batchAdjustMode === 'ADD'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-xs'
                        : 'border-stone-200 text-stone-600 hover:bg-stone-50'
                    }`}
                  >
                    [+] 批量充值
                  </button>
                  <button
                    type="button"
                    onClick={() => setBatchAdjustMode('SUB')}
                    className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                      batchAdjustMode === 'SUB'
                        ? 'bg-rose-50 border-rose-500 text-rose-700 shadow-xs'
                        : 'border-stone-200 text-stone-600 hover:bg-stone-50'
                    }`}
                  >
                    [-] 批量扣减
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1.5">积分类型</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setBatchAdjustType('DAILY')}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      batchAdjustType === 'DAILY'
                        ? 'bg-amber-50/60 border-amber-500 text-amber-900 shadow-xs'
                        : 'border-stone-200 text-stone-600 hover:bg-stone-50'
                    }`}
                  >
                    <div className="text-xs font-bold">每日通用积分</div>
                    <div className="text-[10px] text-stone-400 mt-0.5">次日自动重置</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setBatchAdjustType('PERMANENT')}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      batchAdjustType === 'PERMANENT'
                        ? 'bg-amber-50/60 border-amber-500 text-amber-900 shadow-xs'
                        : 'border-stone-200 text-stone-600 hover:bg-stone-50'
                    }`}
                  >
                    <div className="text-xs font-bold">永久高定积分</div>
                    <div className="text-[10px] text-stone-400 mt-0.5">永久有效</div>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1.5">每人调控数值</label>
                <input
                  type="number"
                  min="1"
                  value={batchAdjustAmount}
                  onChange={(e) => setBatchAdjustAmount(e.target.value)}
                  className="w-full bg-[#FAF8F5] border border-[#EAE6DF] rounded-xl px-3 py-2 text-xs font-mono font-bold text-stone-800 focus:outline-none focus:border-[#D63031]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1.5">批量操作原因</label>
                <input
                  type="text"
                  value={batchAdjustReason}
                  onChange={(e) => setBatchAdjustReason(e.target.value)}
                  className="w-full bg-[#FAF8F5] border border-[#EAE6DF] rounded-xl px-3 py-2 text-xs text-stone-800 focus:outline-none focus:border-[#D63031]"
                  required
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsBatchAdjustModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold transition-colors"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={isBatchUserLoading}
                  className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-colors shadow-xs"
                >
                  {isBatchUserLoading ? '处理中...' : '确认批量调分'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 模态弹窗: Ctrl+K 全局超级命令调色板 (Spotlight) */}
      {/* ------------------------------------------------------------- */}
      {isCommandPaletteOpen && (
        <div
          onClick={() => setIsCommandPaletteOpen(false)}
          className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-start justify-center z-50 pt-24 p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl p-4 max-w-xl w-full shadow-2xl border border-[#EAE6DF] space-y-3"
          >
            {/* 搜索输入栏 */}
            <div className="relative flex items-center border-b border-stone-100 pb-3">
              <Search className="w-4 h-4 text-stone-400 absolute left-3" />
              <input
                type="text"
                autoFocus
                value={commandQuery}
                onChange={(e) => setCommandQuery(e.target.value)}
                placeholder="输入页面、操作指令、用户昵称或单品名称... (Esc 关闭)"
                className="w-full bg-transparent pl-10 pr-12 text-sm font-medium text-stone-800 focus:outline-none"
              />
              <kbd className="text-[10px] font-mono bg-stone-100 px-1.5 py-0.5 rounded border border-stone-200 text-stone-400 absolute right-2">
                ESC
              </kbd>
            </div>

            <div className="max-h-80 overflow-y-auto space-y-3 text-xs">
              {/* 页面快速跳转 */}
              <div>
                <div className="text-[10px] font-bold text-stone-400 uppercase tracking-wider px-2 py-1">
                  页面快速直达
                </div>
                <div className="space-y-0.5">
                  {[
                    { tab: 'DASHBOARD', name: '运营总览大盘 (7日走势)', icon: Activity },
                    { tab: 'USERS', name: '用户与权限管理 (多选/批量/标签)', icon: Users },
                    { tab: 'GARMENTS', name: '官方公共衣橱 (批量管理/上架)', icon: ShoppingBag },
                    { tab: 'LEDGER', name: '积分流水只读审计', icon: History },
                  ].map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.tab}
                        onClick={() => {
                          setActiveTab(item.tab as any);
                          setIsCommandPaletteOpen(false);
                        }}
                        className="w-full px-3 py-2 rounded-xl text-left hover:bg-[#FAF8F5] flex items-center justify-between text-stone-700 hover:text-stone-900 transition-colors"
                      >
                        <div className="flex items-center gap-2.5">
                          <Icon className="w-3.5 h-3.5 text-stone-500" />
                          <span className="font-bold">{item.name}</span>
                        </div>
                        <span className="text-[10px] text-stone-400 font-mono">跳转</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 快捷操作 */}
              <div>
                <div className="text-[10px] font-bold text-stone-400 uppercase tracking-wider px-2 py-1">
                  高频运维指令
                </div>
                <div className="space-y-0.5">
                  <button
                    onClick={() => {
                      setIsCommandPaletteOpen(false);
                      setIsBroadcastModalOpen(true);
                    }}
                    className="w-full px-3 py-2 rounded-xl text-left hover:bg-amber-50/70 flex items-center justify-between text-stone-700 hover:text-amber-800 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <Send className="w-3.5 h-3.5 text-amber-600" />
                      <span className="font-bold">📢 全员活动积分普发 / 分群空投</span>
                    </div>
                    <span className="text-[10px] text-amber-600 font-mono">执行</span>
                  </button>
                  <button
                    onClick={() => {
                      setIsCommandPaletteOpen(false);
                      setIsUploadModalOpen(true);
                    }}
                    className="w-full px-3 py-2 rounded-xl text-left hover:bg-rose-50/70 flex items-center justify-between text-stone-700 hover:text-rose-800 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <Plus className="w-3.5 h-3.5 text-rose-600" />
                      <span className="font-bold">➕ 录入官方公共单品</span>
                    </div>
                    <span className="text-[10px] text-rose-600 font-mono">打开</span>
                  </button>
                  <button
                    onClick={() => {
                      setIsCommandPaletteOpen(false);
                      handleExportUsersCsv();
                    }}
                    className="w-full px-3 py-2 rounded-xl text-left hover:bg-stone-50 flex items-center justify-between text-stone-700 hover:text-stone-900 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <Download className="w-3.5 h-3.5 text-stone-500" />
                      <span className="font-bold">📥 导出用户大盘报表 CSV</span>
                    </div>
                    <span className="text-[10px] text-stone-400 font-mono">导出</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
</div>
  );
};
