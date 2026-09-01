import { GarmentDetailDrawer } from '../components/GarmentDetailDrawer';
import { generate2DCanvasSnapshot } from '../utils/canvasSnapshot';
import React, { useState, useRef, useEffect } from 'react';
import {
  UserProfile,
  UserAvatar,
  GarmentItem,
  GarmentCategory,
  GarmentState,
  calculateRenderZIndex,
} from '@smart-wardrobe/shared';
import {
  Sliders,
  Upload,
  User,
  Trash2,
  Eye,
  Heart,
  Save,
  Send,
  Wand2,
  Camera,
  Check,
  Lock,
  Unlock,
  CloudSun,
  Dices,
  Copy,
  Plus,
  Search,
  Sparkles,
  RefreshCw,
  Share2,
  Move,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  X,
  Filter,
  ChevronDown,
  ChevronUp,
  Tag,
  CheckSquare,
  Square,
  Shirt,
  Layers,
  Maximize2,
  PanelLeftClose,
  PanelLeftOpen,
  Info,
  Calendar,
  UploadCloud,
} from 'lucide-react';
import { CapsuleSlotMachine } from '../components/CapsuleSlotMachine';
import { showToast } from '../components/Toast';
import { autoDetectUploadGarments, updateGarmentAsset, compressImageFile } from '../api';
import { cropImageRegion, getCategoryDefaultOffsets, removeWhiteBackground } from '../utils/imageProcess';

export interface WornItemData {
 garment: GarmentItem;
 state: GarmentState;
 zIndex: number;
 offsetX: number;
 offsetY: number;
 scale: number;
 scaleX?: number;
 scaleY?: number;
}

interface FittingStudioViewProps {
 profile: UserProfile | null;
 avatar: UserAvatar | null;
 wornItems: WornItemData[];
 allGarments: GarmentItem[];
 publicGarments: GarmentItem[];
 dailyCredits: number;
 onUpdateWornItem: (
 garmentId: string,
 updates: Partial<{ state: GarmentState; offsetX: number; offsetY: number; scale: number; scaleX: number; scaleY: number; zIndex: number }>
 ) => void;
 onWearGarment: (garment: GarmentItem) => void;
 onRemoveWornItem: (garmentId: string) => void;
 onClearCanvas: () => void;
 onSaveLookbook: (title: string, syncToOotdToday?: boolean, sceneTag?: string) => void;
 onRenderVton: (compositeCanvasBase64?: string) => void;
 onSuggestToFriend: () => void;
 onUploadCustomAvatar: (file: File) => void;
 onUploadGarmentWithFile?: (file: File) => void;
 onUploadBatchWithFile?: (file: File) => void;
 onBatchAddGarments?: (garments: GarmentItem[], shouldWear: boolean) => void;
 onClonePublicGarment: (publicGarmentId: string) => void;
 onApplySlotOutfit: (garments: GarmentItem[], states: Record<string, GarmentState>) => void;
 onBindSlotToOotd: (garments: GarmentItem[], notes: string) => void;
 onDeleteGarment: (garmentId: string) => void;
 onOpenProfileSettings?: () => void;
 isRendering?: boolean;
 renderProgress?: number;
 renderStage?: string;
 renderedImageUrl?: string | null;
}

// 12 标准色谱
const COLOR_PALETTE = [
 { key: 'black', label: '黑色', hex: '#1A1A1A', matchHexes: ['#000000', '#1a1a1a', '#212121', '#0f0c29', '#24243e', '#333333'] },
 { key: 'white', label: '白色', hex: '#FFFFFF', matchHexes: ['#ffffff', '#fafafa', '#f5f5f5', '#f8f9fa', '#eeeeee'] },
 { key: 'grey', label: '灰色', hex: '#808080', matchHexes: ['#808080', '#9e9e9e', '#757575', '#616161'] },
 { key: 'beige', label: '米杏', hex: '#E8D8C8', matchHexes: ['#e8d8c8', '#f5f2eb', '#f7ebd2', '#eae0d0', '#d7ccc8'] },
 { key: 'red', label: '红色', hex: '#E74C3C', matchHexes: ['#e74c3c', '#ff4d4f', '#f5222d', '#d63031', '#c0392b'] },
 { key: 'pink', label: '粉色', hex: '#FF85A2', matchHexes: ['#ff85a2', '#ff69b4', '#ffc0cb', '#f759ab', '#e84393'] },
 { key: 'orange', label: '橙色', hex: '#E67E22', matchHexes: ['#e67e22', '#fa8c16', '#ff7a45', '#d35400'] },
 { key: 'yellow', label: '黄色', hex: '#F1C40F', matchHexes: ['#f1c40f', '#ffd700', '#fadb14', '#ffec3d'] },
 { key: 'green', label: '绿色', hex: '#2ECC71', matchHexes: ['#2ecc71', '#52c41a', '#389e0d', '#27ae60', '#135200'] },
 { key: 'blue', label: '蓝色', hex: '#3498DB', matchHexes: ['#3498db', '#1890ff', '#096dd9', '#2980b9', '#302b63'] },
 { key: 'purple', label: '紫色', hex: '#9B59B6', matchHexes: ['#9b59b6', '#722ed1', '#531dab', '#8e44ad', '#800080'] },
 { key: 'brown', label: '棕褐', hex: '#8D6E63', matchHexes: ['#8d6e63', '#795548', '#5d4037', '#4e342e', '#a1887f'] },
];

const SUB_CATEGORIES = [
 'T恤', '衬衫', '卫衣', '西装', '夹克', '大衣', '短裙', '长裤', '阔腿裤', '牛仔裤', '连衣裙', '礼服', '发冠/配饰'
];

const PATTERN_OPTIONS = [
 { key: 'SOLID', label: '纯色' },
 { key: 'STRIPED', label: '条纹' },
 { key: 'PLAID', label: '格纹' },
 { key: 'FLORAL', label: '印花/碎花' },
];

export const FittingStudioView: React.FC<FittingStudioViewProps> = ({
 profile,
 avatar,
 wornItems,
 allGarments,
 publicGarments,
 dailyCredits,
 onUpdateWornItem,
 onWearGarment,
 onRemoveWornItem,
 onClearCanvas,
 onSaveLookbook,
 onRenderVton,
 onSuggestToFriend,
 onUploadCustomAvatar,
 onUploadGarmentWithFile,
 onUploadBatchWithFile,
 onBatchAddGarments,
 onClonePublicGarment,
 onApplySlotOutfit,
 onBindSlotToOotd,
 onDeleteGarment,
 onOpenProfileSettings,
 isRendering,
 renderProgress,
 renderStage,
 renderedImageUrl,
}) => {
 // 衣橱 Tab 与筛选状态
 const [wardrobeTab, setWardrobeTab] = useState<'PRIVATE' | 'PUBLIC'>('PRIVATE');
 const [selectedCategory, setSelectedCategory] = useState<GarmentCategory | 'ALL'>('ALL');
 const [selectedColors, setSelectedColors] = useState<string[]>([]);
 const [selectedSubCategories, setSelectedSubCategories] = useState<string[]>([]);
 const [selectedPatterns, setSelectedPatterns] = useState<string[]>([]);
 const [searchQuery, setSearchQuery] = useState('');
 const [isAdvancedFilterOpen, setIsAdvancedFilterOpen] = useState(false);

 // 选项 B：9:16 画布原位 2D 拼搭 / 3D 真人大片双模切换模式
 const [studioDisplayMode, setStudioDisplayMode] = useState<'2D' | '3D'>('2D');
  const [isSplitCompareMode, setIsSplitCompareMode] = useState(false);
  const [curtainSliderPos, setCurtainSliderPos] = useState<number>(50); // 0% ~ 100%
  const [isDraggingCurtain, setIsDraggingCurtain] = useState<boolean>(false);
  const curtainContainerRef = useRef<HTMLDivElement>(null);
  const [selectedGarmentForDrawer, setSelectedGarmentForDrawer] = useState<GarmentItem | null>(null);
  const [isWardrobeCollapsed, setIsWardrobeCollapsed] = useState<boolean>(false);
  const [splitSliderPos, setSplitSliderPos] = useState(50);
  const [isDraggingSplit, setIsDraggingSplit] = useState(false);
 const [isOutfitChangedSinceRender, setIsOutfitChangedSinceRender] = useState(false);

 // 严格按账号与角色隔离的微调记忆库 (存储键: sw_adjustments_${userId}_${profileId})
 const getStorageKey = () => {
 if (!profile?.userId || !profile?.id) return 'sw_adjustments_guest';
 return `sw_adjustments_${profile.userId}_${profile.id}`;
 };

 const [customAdjustments, setCustomAdjustments] = useState<
 Record<string, { offsetX: number; offsetY: number; scale: number; scaleX: number; scaleY: number }>
 >(() => {
 try {
 const key = profile?.userId && profile?.id ? `sw_adjustments_${profile.userId}_${profile.id}` : 'sw_adjustments_guest';
 const raw = localStorage.getItem(key);
 return raw ? JSON.parse(raw) : {};
 } catch {
 return {};
 }
 });

 // 当 profile (切换用户或切换角色) 改变时，重新加载对应的微调记忆，100% 账号隔离
 useEffect(() => {
 const key = getStorageKey();
 try {
 const raw = localStorage.getItem(key);
 setCustomAdjustments(raw ? JSON.parse(raw) : {});
 } catch {
 setCustomAdjustments({});
 }
 }, [profile?.userId, profile?.id]);

 // 同步更新并落盘微调参数
 const saveCustomAdjustment = (
 garmentId: string,
 adj: { offsetX: number; offsetY: number; scale: number; scaleX: number; scaleY: number }
 ) => {
 setCustomAdjustments((prev) => {
 const next = { ...prev, [garmentId]: adj };
 try {
 localStorage.setItem(getStorageKey(), JSON.stringify(next));
 } catch (e) {
 console.warn('保存微调记忆失败:', e);
 }
 return next;
 });
 };

 // 弹窗与控制面板
 const [isSlotMachineOpen, setIsSlotMachineOpen] = useState(false);
 const [isLookbookModalOpen, setIsLookbookModalOpen] = useState(false);
 const [syncToOotdToday, setSyncToOotdToday] = useState(true);
 const [lookbookSceneTag, setLookbookSceneTag] = useState('CASUAL');
 const [isVtonResultModalOpen, setIsVtonResultModalOpen] = useState(false);
 const [lookbookTitle, setLookbookTitle] = useState('');
 const [isLayerPanelOpen, setIsLayerPanelOpen] = useState(false);
 const [transformMode, setTransformMode] = useState<'SNAP' | 'FREE'>('SNAP');
 const [canvasScale, setCanvasScale] = useState(1);
 const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

 // 交互式微调框 (Figma Pro 级手柄拖拽与缩放拉伸)
 const [transformDrag, setTransformDrag] = useState<{
 type: 'MOVE' | 'RESIZE_BR' | 'STRETCH_T' | 'STRETCH_B' | 'STRETCH_L' | 'STRETCH_R';
 garmentId: string;
 startX: number;
 startY: number;
 startOffsetX: number;
 startOffsetY: number;
 startScale: number;
 startScaleX: number;
 startScaleY: number;
 } | null>(null);

  useEffect(() => {
    if (renderedImageUrl && !isRendering) {
      setSelectedItemId(null);
                setStudioDisplayMode('3D');
      setIsOutfitChangedSinceRender(false);
      showToast('✨ AI 8K 影棚试穿大片已生成完毕，已呈现在画布中央！', 'info');
    }
  }, [renderedImageUrl, isRendering]);

 // 监听穿戴衣物或微调变动：若在 3D 模式下有改动，自动平滑切回 2D 拼搭模式并提示可重新生成
 const prevWornCountRef = useRef(wornItems.length);
 useEffect(() => {
 if (prevWornCountRef.current !== wornItems.length) {
 prevWornCountRef.current = wornItems.length;
 if (renderedImageUrl) {
 setIsOutfitChangedSinceRender(true);
 }
 if (studioDisplayMode === '3D') {
 setStudioDisplayMode('2D');
 }
 }
 }, [wornItems.length, studioDisplayMode, renderedImageUrl]);

 // 监听键盘事件：Escape 取消选中，Delete / Backspace 快捷脱下单品
 useEffect(() => {
 const handleKeyDown = (e: KeyboardEvent) => {
 const isInputActive = ['INPUT', 'TEXTAREA'].includes((document.activeElement?.tagName || '').toUpperCase());
 if (e.key === 'Escape') {
 setSelectedItemId(null);
 } else if ((e.key === 'Delete' || e.key === 'Backspace') && !isInputActive && selectedItemId) {
 onRemoveWornItem(selectedItemId);
 setSelectedItemId(null);
 }
 };
 window.addEventListener('keydown', handleKeyDown);
 return () => window.removeEventListener('keydown', handleKeyDown);
 }, [selectedItemId, onRemoveWornItem]);

 // 监听选中单品有效性：如果单品已被脱下或画布清空，自动清理悬空幽灵选中态
 useEffect(() => {
 if (selectedItemId && !wornItems.some((i) => i.garment.id === selectedItemId)) {
 setSelectedItemId(null);
 }
 }, [wornItems, selectedItemId]);

 // 监听 3D 模式切换：进入 3D 影棚大片模式时自动脱焦 2D 选框
 useEffect(() => {
 if (studioDisplayMode === '3D') {
 setSelectedItemId(null);
 }
 }, [studioDisplayMode]);

 // 自由画板拖拽偏移 (散落衣服在 55% 画布上的绝对位置)
 const [canvasItemPositions, setCanvasItemPositions] = useState<Record<string, { x: number; y: number }>>({});
 const [draggingGarmentId, setDraggingGarmentId] = useState<string | null>(null);
 const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

 // 上传进度与单品确认弹窗状态
 const [uploadProgress, setUploadProgress] = useState<number | null>(null);
 const [uploadStageText, setUploadStageText] = useState<string>('');
 const [detectedGarmentsToConfirm, setDetectedGarmentsToConfirm] = useState<
 Array<{
 id: string;
 title: string;
 primaryCategory: GarmentCategory;
 subCategory: string;
 colors: string[];
 patterns: string[];
 material: string;
 previewUrl?: string;
 selected: boolean;
 rawGarment: GarmentItem;
 }> | null
 >(null);

 const canvasRef = useRef<HTMLDivElement>(null);
 const fileInputRef = useRef<HTMLInputElement>(null);
 const avatarInputRef = useRef<HTMLInputElement>(null);

 // 切换颜色多选
 const handleToggleColor = (colorKey: string) => {
 setSelectedColors((prev) =>
 prev.includes(colorKey) ? prev.filter((k) => k !== colorKey) : [...prev, colorKey]
 );
 };

 // 切换子类多选
 const handleToggleSubCategory = (sub: string) => {
 setSelectedSubCategories((prev) =>
 prev.includes(sub) ? prev.filter((s) => s !== sub) : [...prev, sub]
 );
 };

 // 切换花纹多选
 const handleTogglePattern = (pat: string) => {
 setSelectedPatterns((prev) =>
 prev.includes(pat) ? prev.filter((p) => p !== pat) : [...prev, pat]
 );
 };

 // 一键重置所有筛选
 const handleResetFilters = () => {
 setSelectedCategory('ALL');
 setSelectedColors([]);
 setSelectedSubCategories([]);
 setSelectedPatterns([]);
 setSearchQuery('');
 };

 // 当前源单品池
 const currentGarmentPool = wardrobeTab === 'PRIVATE' ? allGarments : publicGarments;

 // 执行多维交集筛选
 const filteredGarments = currentGarmentPool.filter((item) => {
 if (selectedCategory !== 'ALL' && item.primaryCategory !== selectedCategory) return false;
 if (selectedColors.length > 0) {
 const matchColor = selectedColors.some((cKey) => {
 const pal = COLOR_PALETTE.find((p) => p.key === cKey);
 if (!pal) return false;
 return item.colors.some((itemColor) => {
 const lower = itemColor.toLowerCase();
 return pal.matchHexes.some((hex) => lower.includes(hex.toLowerCase()));
 });
 });
 if (!matchColor) return false;
 }
 if (selectedSubCategories.length > 0) {
 const matchSub = selectedSubCategories.some((sub) =>
 item.subCategory?.toLowerCase().includes(sub.toLowerCase()) ||
 item.title?.toLowerCase().includes(sub.toLowerCase())
 );
 if (!matchSub) return false;
 }
 if (selectedPatterns.length > 0) {
 const matchPat = selectedPatterns.some((pat) =>
 item.patterns?.includes(pat as any)
 );
 if (!matchPat) return false;
 }
 if (searchQuery.trim()) {
 const q = searchQuery.trim().toLowerCase();
 const matchQuery =
 item.title.toLowerCase().includes(q) ||
 (item.subCategory && item.subCategory.toLowerCase().includes(q)) ||
 (item.material && item.material.toLowerCase().includes(q));
 if (!matchQuery) return false;
 }
 return true;
 });

 // 处理文件选择与带进度条多模态识别
 const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
 const file = e.target.files?.[0];
 console.log('handleFileSelected triggered! File:', file?.name, 'profileId:', profile?.id);
 if (!file || !profile) return;

 // 清空 input 避免重复上传同名文件不触发 change
 e.target.value = '';

 setUploadProgress(15);
 setUploadStageText('正在压缩并上传高清单品照片...');

 const timer1 = setTimeout(() => {
 setUploadProgress(40);
 setUploadStageText('调用 Gemini 3.7 Flash 视觉多目标解构检测...');
 }, 400);

 const timer2 = setTimeout(() => {
 setUploadProgress(75);
 setUploadStageText('生成纯白底高定切片与解剖学吸附锚点...');
 }, 1000);

 try {
 const compressed = await compressImageFile(file);
 const newGarments = await autoDetectUploadGarments(profile.id, compressed);

 clearTimeout(timer1);
 clearTimeout(timer2);

 setUploadProgress(90);
 setUploadStageText('正在执行 AI 幽灵模特平铺素图透明通道提纯...');

 // 为每个识别出的单品提纯透明通道，直接使用 AI 重新生成的纯净平铺素图
 const confirmedGarments = await Promise.all(
 newGarments.map(async (g) => {
 let previewUrl = g.assets?.[0]?.pngUrl || '';

 // 1. 如果后端 AI 已生成纯白底平铺素图，对其进行 Alpha 透明化提纯
 if (previewUrl && previewUrl.startsWith('data:image')) {
 try {
 const transparentUrl = await removeWhiteBackground(previewUrl);
 if (transparentUrl) {
 previewUrl = transparentUrl;
 if (g.assets && g.assets.length > 0) {
 g.assets.forEach((a) => {
 a.pngUrl = transparentUrl;
 });
 }
 }
 } catch (err) {
 console.warn('白底透明化异常:', err);
 }
 }

 // 2. 降级回退
 if (!previewUrl) {
 previewUrl = compressed.startsWith('data:image') ? compressed : '';
 }

 return {
 id: g.id,
 title: g.title,
 primaryCategory: g.primaryCategory,
 subCategory: g.subCategory || '单品',
 colors: g.colors,
 patterns: g.patterns,
 material: g.material || '精选面料',
 previewUrl: previewUrl,
 selected: true,
 rawGarment: g,
 };
 })
 );

 setUploadProgress(100);
 setUploadStageText('AI 单品平铺素图生成与提纯完成！');

 setTimeout(() => {
 setUploadProgress(null);
 setDetectedGarmentsToConfirm(confirmedGarments);
 }, 300);
 } catch (err: any) {
 clearTimeout(timer1);
 clearTimeout(timer2);
 setUploadProgress(null);
 alert(err.message || '识别入库失败');
 }
 };

 // 确认入库处理 (Option A 双按钮)
 const handleConfirmBatchUpload = (shouldWear: boolean) => {
 if (!detectedGarmentsToConfirm) return;
 const selectedItems = detectedGarmentsToConfirm
 .filter((item) => item.selected)
 .map((item) => {
 const raw = { ...item.rawGarment };
 if (item.previewUrl && raw.assets && raw.assets.length > 0) {
 raw.assets = raw.assets.map((a: any) => ({
 ...a,
 pngUrl: item.previewUrl!,
 }));
 }
 return {
 ...raw,
 title: item.title,
 primaryCategory: item.primaryCategory,
 subCategory: item.subCategory,
 };
 });

 if (selectedItems.length === 0) {
 showToast('请至少勾选一件要添加入衣橱的单品', "info");
 return;
 }

 // 异步将纯净切片同步回服务端数据库资产
 selectedItems.forEach((g) => {
 if (g.assets && g.assets[0]?.pngUrl) {
 updateGarmentAsset(g.id, g.assets[0].pngUrl).catch((err) => {
 console.warn('同步切片至服务端数据库失败:', err);
 });
 }
 });

 if (onBatchAddGarments) {
 onBatchAddGarments(selectedItems, shouldWear);
 } else if (onUploadGarmentWithFile) {
 selectedItems.forEach((g) => {
 if (shouldWear) onWearGarment(g);
 });
 }

 setDetectedGarmentsToConfirm(null);
 };

 // 穿上单品并装载历史微调记忆 (若已穿戴则脱下并清理选中态)
 const handleWearWithPlacement = async (garment: GarmentItem) => {
 const isAlreadyWorn = wornItems.some((i) => i.garment.id === garment.id);
 if (isAlreadyWorn) {
 onWearGarment(garment);
 if (selectedItemId === garment.id) {
 setSelectedItemId(null);
 }
 return;
 }

 // 自动提取透明通道消除白底
 if (garment.assets && garment.assets[0]?.pngUrl && !garment.assets[0].pngUrl.startsWith('data:image/png')) {
 try {
 const transUrl = await removeWhiteBackground(garment.assets[0].pngUrl);
 if (transUrl) {
 garment.assets[0].pngUrl = transUrl;
 }
 } catch (e) {
 // ignore
 }
 }

 onWearGarment(garment);
 setSelectedItemId(garment.id);

 // 如果用户曾手动微调过此单品，优先恢复该账号该角色的自定义微调记忆
 const userAdjust = customAdjustments[garment.id];
 if (userAdjust) {
 onUpdateWornItem(garment.id, {
 offsetX: userAdjust.offsetX,
 offsetY: userAdjust.offsetY,
 scale: userAdjust.scale,
 scaleX: userAdjust.scaleX,
 scaleY: userAdjust.scaleY,
 });
 }
 };

 // 调整单品图层层级 (上移一层 / 下移一层 / 置顶 / 置底)
 const handleAdjustZIndex = (garmentId: string, direction: 'UP' | 'DOWN' | 'TOP' | 'BOTTOM') => {
 const item = wornItems.find((i) => i.garment.id === garmentId);
 if (!item) return;

 const sorted = [...wornItems].sort((a, b) => a.zIndex - b.zIndex);
 const currentIndex = sorted.findIndex((i) => i.garment.id === garmentId);
 if (currentIndex === -1) return;

 let targetZIndex = item.zIndex;

 if (direction === 'UP') {
 if (currentIndex < sorted.length - 1) {
 const nextItem = sorted[currentIndex + 1];
 targetZIndex = Math.max(item.zIndex + 5, nextItem.zIndex + 2);
 } else {
 targetZIndex = item.zIndex + 5;
 }
 } else if (direction === 'DOWN') {
 if (currentIndex > 0) {
 const prevItem = sorted[currentIndex - 1];
 targetZIndex = Math.min(item.zIndex - 5, Math.max(1, prevItem.zIndex - 2));
 } else {
 targetZIndex = Math.max(1, item.zIndex - 5);
 }
 } else if (direction === 'TOP') {
 const maxZ = Math.max(...wornItems.map((i) => i.zIndex), 10);
 targetZIndex = maxZ + 10;
 } else if (direction === 'BOTTOM') {
 const minZ = Math.min(...wornItems.map((i) => i.zIndex), 10);
 targetZIndex = Math.max(1, minZ - 5);
 }

 onUpdateWornItem(garmentId, { zIndex: targetZIndex });
 };

 // 重置单品为默认解剖吸附尺寸并清理持久化微调记忆
 const handleResetPlacement = (garment: GarmentItem) => {
 setCustomAdjustments((prev) => {
 const next = { ...prev };
 delete next[garment.id];
 try {
 localStorage.setItem(getStorageKey(), JSON.stringify(next));
 } catch (e) {
 console.warn('清理微调记忆失败:', e);
 }
 return next;
 });

 const defaultOffs = getCategoryDefaultOffsets(
 garment.primaryCategory,
 garment.subCategory,
 garment.title
 );
 onUpdateWornItem(garment.id, {
 offsetX: defaultOffs.offsetX,
 offsetY: defaultOffs.offsetY,
 scale: defaultOffs.scale,
 scaleX: defaultOffs.scale,
 scaleY: defaultOffs.scale,
 });
 };

 // 形态切换 (Open / Closed / Tucked) 与 Z-Index 状态机联动
 const handleToggleGarmentState = (garmentId: string) => {
 const item = wornItems.find((i) => i.garment.id === garmentId);
 if (!item) return;

 let nextState: GarmentState = 'DEFAULT';
 if (item.garment.primaryCategory === 'TOPS') {
 nextState = item.state === 'DEFAULT' || item.state === 'UNTUCKED' ? 'TUCKED' : 'UNTUCKED';
 } else if (item.garment.primaryCategory === 'OUTERWEAR') {
 nextState = item.state === 'OPEN' || item.state === 'DEFAULT' ? 'CLOSED' : 'OPEN';
 } else {
 nextState = item.state === 'DEFAULT' ? 'TUCKED' : 'DEFAULT';
 }

 const newZIndex = calculateRenderZIndex(item.garment.primaryCategory, nextState);
 onUpdateWornItem(garmentId, { state: nextState, zIndex: newZIndex });
 };

 // 变换拖拽 Handle Mouse Down (移动、等比缩放、四边拉伸)
 const handleTransformMouseDown = (
 e: React.MouseEvent,
 garmentId: string,
 type: 'MOVE' | 'RESIZE_BR' | 'STRETCH_T' | 'STRETCH_B' | 'STRETCH_L' | 'STRETCH_R'
 ) => {
 e.stopPropagation();
 e.preventDefault();
 const item = wornItems.find((i) => i.garment.id === garmentId);
 if (!item) return;

 const defaultOffs = getCategoryDefaultOffsets(
 item.garment.primaryCategory,
 item.garment.subCategory,
 item.garment.title
 );
 const curOffX = item.offsetX !== 0 ? item.offsetX : defaultOffs.offsetX;
 const curOffY = item.offsetY !== 0 ? item.offsetY : defaultOffs.offsetY;
 const curScale = item.scale !== 1 ? item.scale : defaultOffs.scale;
 const curScaleX = item.scaleX ?? curScale;
 const curScaleY = item.scaleY ?? curScale;

 setSelectedItemId(garmentId);
 setTransformDrag({
 type,
 garmentId,
 startX: e.clientX,
 startY: e.clientY,
 startOffsetX: curOffX,
 startOffsetY: curOffY,
 startScale: curScale,
 startScaleX: curScaleX,
 startScaleY: curScaleY,
 });
 };

 // 全局 Window 级 60fps 丝滑拖拽缩放监听引擎 (彻底消除鼠标移出容器时的掉帧与卡顿)
 useEffect(() => {
 if (!transformDrag) return;

 const onMouseMove = (e: MouseEvent) => {
 const { type, garmentId, startX, startY, startOffsetX, startOffsetY, startScale, startScaleX, startScaleY } = transformDrag;
 const deltaX = e.clientX - startX;
 const deltaY = e.clientY - startY;

 if (type === 'MOVE') {
 const newOffX = Math.round(startOffsetX + deltaX);
 const newOffY = Math.round(startOffsetY + deltaY);
 onUpdateWornItem(garmentId, {
 offsetX: newOffX,
 offsetY: newOffY,
 });
 saveCustomAdjustment(garmentId, {
 offsetX: newOffX,
 offsetY: newOffY,
 scale: customAdjustments[garmentId]?.scale ?? startScale,
 scaleX: customAdjustments[garmentId]?.scaleX ?? startScaleX,
 scaleY: customAdjustments[garmentId]?.scaleY ?? startScaleY,
 });
 } else if (type === 'RESIZE_BR') {
 const diagDelta = (deltaX + deltaY) / 2;
 const scaleDelta = diagDelta * 0.0035;
 const newScale = Math.max(0.12, Math.min(2.5, Number((startScale + scaleDelta).toFixed(3))));
 onUpdateWornItem(garmentId, {
 scale: newScale,
 scaleX: newScale,
 scaleY: newScale,
 });
 saveCustomAdjustment(garmentId, {
 offsetX: customAdjustments[garmentId]?.offsetX ?? startOffsetX,
 offsetY: customAdjustments[garmentId]?.offsetY ?? startOffsetY,
 scale: newScale,
 scaleX: newScale,
 scaleY: newScale,
 });
 } else if (type === 'STRETCH_R' || type === 'STRETCH_L') {
 const factor = type === 'STRETCH_R' ? 1 : -1;
 const scaleXDelta = deltaX * 0.0035 * factor;
 const newScaleX = Math.max(0.12, Math.min(2.5, Number((startScaleX + scaleXDelta).toFixed(3))));
 onUpdateWornItem(garmentId, {
 scaleX: newScaleX,
 });
 saveCustomAdjustment(garmentId, {
 offsetX: customAdjustments[garmentId]?.offsetX ?? startOffsetX,
 offsetY: customAdjustments[garmentId]?.offsetY ?? startOffsetY,
 scale: customAdjustments[garmentId]?.scale ?? startScale,
 scaleX: newScaleX,
 scaleY: customAdjustments[garmentId]?.scaleY ?? startScaleY,
 });
 } else if (type === 'STRETCH_B' || type === 'STRETCH_T') {
 const factor = type === 'STRETCH_B' ? 1 : -1;
 const scaleYDelta = deltaY * 0.0035 * factor;
 const newScaleY = Math.max(0.12, Math.min(2.5, Number((startScaleY + scaleYDelta).toFixed(3))));
 onUpdateWornItem(garmentId, {
 scaleY: newScaleY,
 });
 saveCustomAdjustment(garmentId, {
 offsetX: customAdjustments[garmentId]?.offsetX ?? startOffsetX,
 offsetY: customAdjustments[garmentId]?.offsetY ?? startOffsetY,
 scale: customAdjustments[garmentId]?.scale ?? startScale,
 scaleX: customAdjustments[garmentId]?.scaleX ?? startScaleX,
 scaleY: newScaleY,
 });
 }
 };

 const onMouseUp = () => {
 setTransformDrag(null);
 };

 window.addEventListener('mousemove', onMouseMove);
 window.addEventListener('mouseup', onMouseUp);
 return () => {
 window.removeEventListener('mousemove', onMouseMove);
 window.removeEventListener('mouseup', onMouseUp);
 };
 }, [transformDrag, onUpdateWornItem]);

 // 画布散落单品拖拽事件
 const handleCanvasMouseDown = (garmentId: string, e: React.MouseEvent) => {
 e.stopPropagation();
 setDraggingGarmentId(garmentId);
 setSelectedItemId(garmentId);
 const rect = canvasRef.current?.getBoundingClientRect();
 if (!rect) return;
 const currentPos = canvasItemPositions[garmentId] || { x: 40, y: 120 };
 setDragOffset({
 x: e.clientX - rect.left - currentPos.x,
 y: e.clientY - rect.top - currentPos.y,
 });
 };

 const handleCanvasMouseMove = (e: React.MouseEvent) => {
 // 处理散落单品拖拽
 if (draggingGarmentId && canvasRef.current) {
 const rect = canvasRef.current.getBoundingClientRect();
 const newX = e.clientX - rect.left - 60;
 const newY = e.clientY - rect.top - 60;

 setCanvasItemPositions((prev) => ({
 ...prev,
 [draggingGarmentId]: { x: newX, y: newY },
 }));

 const centerX = rect.width / 2;
 const distToCenter = Math.abs(newX + 60 - centerX);
 const isCloseToBody = distToCenter < 140;

 const isWorn = wornItems.some((i) => i.garment.id === draggingGarmentId);
 if (isCloseToBody && !isWorn) {
 const g = allGarments.find((item) => item.id === draggingGarmentId) || publicGarments.find((item) => item.id === draggingGarmentId);
 if (g) handleWearWithPlacement(g);
 } else if (!isCloseToBody && isWorn) {
 onRemoveWornItem(draggingGarmentId);
 }
 }
 };

  const handleCurtainDrag = (clientX: number) => {
    if (!curtainContainerRef.current) return;
    const rect = curtainContainerRef.current.getBoundingClientRect();
    if (rect.width === 0) return;
    const x = clientX - rect.left;
    const percent = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setCurtainSliderPos(percent);
  };

  useEffect(() => {
    if (!isDraggingCurtain) return;
    const onWindowMouseMove = (e: MouseEvent) => {
      handleCurtainDrag(e.clientX);
    };
    const onWindowMouseUp = () => {
      setIsDraggingCurtain(false);
    };
    const onWindowTouchMove = (e: TouchEvent) => {
      if (e.touches && e.touches[0]) {
        handleCurtainDrag(e.touches[0].clientX);
      }
    };
    window.addEventListener('mousemove', onWindowMouseMove);
    window.addEventListener('mouseup', onWindowMouseUp);
    window.addEventListener('touchmove', onWindowTouchMove, { passive: false });
    window.addEventListener('touchend', onWindowMouseUp);
    return () => {
      window.removeEventListener('mousemove', onWindowMouseMove);
      window.removeEventListener('mouseup', onWindowMouseUp);
      window.removeEventListener('touchmove', onWindowTouchMove);
      window.removeEventListener('touchend', onWindowMouseUp);
    };
  }, [isDraggingCurtain]);

 const handleCanvasMouseUp = () => {
    setIsDraggingCurtain(false);
 setDraggingGarmentId(null);
 };

 return (
 <div className="h-full flex flex-col md:flex-row bg-[#FAF8F5] text-stone-800 select-none overflow-hidden font-sans relative">
 
 {/* ------------------------------------------------------------- */}
 {/* 4 阶段平滑上传进度条浮层 */}
 {/* ------------------------------------------------------------- */}
 {uploadProgress !== null && (
 <div className="absolute inset-0 z-50 bg-black/30 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
 <div className="bg-white rounded-3xl border border-[#EAE6DF] shadow-2xl p-6 w-full max-w-md space-y-4 text-center">
 <div className="w-12 h-12 rounded-2xl bg-rose-50 text-[#D63031] flex items-center justify-center mx-auto shadow-2xs">
 <Sparkles className="w-6 h-6 animate-spin stroke-[1.75]" />
 </div>
 <div className="space-y-1">
 <h4 className="text-sm font-extrabold text-stone-900">正在智能解析衣物</h4>
 <p className="text-xs text-stone-500">{uploadStageText}</p>
 </div>

 <div className="space-y-1.5 pt-1">
 <div className="w-full h-2.5 bg-[#FAF8F5] rounded-full overflow-hidden border border-[#EAE6DF]">
 <div
 className="h-full bg-gradient-to-r from-[#D63031] to-[#E17055] transition-all duration-300 rounded-full"
 style={{ width: `${uploadProgress}%` }}
 />
 </div>
 <div className="flex justify-between text-[10px] font-mono text-stone-400 font-bold">
 <span>Vision AI 解析中</span>
 <span>{uploadProgress}%</span>
 </div>
 </div>
 </div>
 </div>
 )}

 {/* ------------------------------------------------------------- */}
 {/* VTON 高清试穿渲染全屏平滑进度条浮层 */}
 {/* ------------------------------------------------------------- */}
 {isRendering && (
 <div className="absolute inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
 <div className="bg-white rounded-3xl border border-[#EAE6DF] shadow-2xl p-6 w-full max-w-md space-y-4 text-center">
 <div className="w-12 h-12 rounded-2xl bg-rose-50 text-[#D63031] flex items-center justify-center mx-auto shadow-2xs">
 <Sparkles className="w-6 h-6 animate-spin stroke-[1.75]" />
 </div>
 <div className="space-y-1">
 <h4 className="text-sm font-extrabold text-stone-900">AI 高清试穿大片渲染中</h4>
 <p className="text-xs text-stone-500">{renderStage || '多模态扩散模型正在精密解构服饰并融合模特...'}</p>
 </div>

 <div className="space-y-1.5 pt-1">
 <div className="w-full h-2.5 bg-[#FAF8F5] rounded-full overflow-hidden border border-[#EAE6DF]">
 <div
 className="h-full bg-gradient-to-r from-[#D63031] to-[#E17055] transition-all duration-300 rounded-full"
 style={{ width: `${renderProgress || 20}%` }}
 />
 </div>
 <div className="flex justify-between text-[10px] font-mono text-stone-400 font-bold">
 <span>Diffusion VTON 计算中</span>
 <span>{renderProgress || 20}%</span>
 </div>
 </div>

 <p className="text-[10px] text-stone-400">90s SLA 极速保障 · 失败全额原路退还积分</p>
 </div>
 </div>
 )}

 {/* ------------------------------------------------------------- */}
 {/* VTON 高清试穿成片大图预览与下载弹窗 */}
 {/* ------------------------------------------------------------- */}
 {isVtonResultModalOpen && renderedImageUrl && (
 <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
 <div className="bg-white rounded-3xl border border-[#EAE6DF] shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden text-left">
 <div className="px-6 py-4 border-b border-[#EAE6DF] flex items-center justify-between bg-[#FAF8F5]/80">
 <div className="flex items-center gap-2">
 <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#D63031] to-[#E17055] text-white flex items-center justify-center shadow-xs">
 <Sparkles className="w-4 h-4 stroke-[2]" />
 </div>
 <div>
 <h3 className="text-sm font-extrabold text-stone-900"> AI 高清试穿成片已就绪</h3>
 <p className="text-[10px] text-stone-400">Diffusion VTON 商业杂志级 8K 影棚试穿成片</p>
 </div>
 </div>
 <button
 onClick={() => setIsVtonResultModalOpen(false)}
 className="p-1.5 rounded-xl hover:bg-stone-100 text-stone-400 hover:text-stone-700"
 >
 <X className="w-4 h-4 stroke-[2]" />
 </button>
 </div>

 <div className="p-6 flex items-center justify-center bg-stone-900 overflow-hidden flex-1">
 <img
 src={renderedImageUrl}
 alt="AI 高清试穿成片"
 className="max-h-[60vh] max-w-full object-contain rounded-2xl shadow-2xl border border-white/10"
 />
 </div>

 <div className="p-4 border-t border-[#EAE6DF] bg-[#FAF8F5]/80 flex items-center justify-between gap-3">
 <button
 type="button"
 onClick={() => setIsVtonResultModalOpen(false)}
 className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-bold transition-colors"
 >
 返回画布
 </button>

 <div className="flex items-center gap-2">
 <button
 type="button"
 onClick={() => {
 setIsVtonResultModalOpen(false);
 setSelectedItemId(null);
            setIsLookbookModalOpen(true);
 }}
 className="px-4 py-2 bg-stone-900 hover:bg-black text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition-colors"
 >
 <Heart className="w-3.5 h-3.5 text-[#D63031]" />
 <span>保存至 Lookbook</span>
 </button>
 <a
 href={renderedImageUrl}
 download="vton_fashion_magazine_hd.jpg"
 target="_blank"
 rel="noreferrer"
 className="px-4 py-2 bg-[#D63031] hover:bg-[#c0392b] text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition-colors"
 >
 <Eye className="w-3.5 h-3.5" />
 <span>下载 8K 原图</span>
 </a>
 </div>
 </div>
 </div>
 </div>
 )}

 {/* ------------------------------------------------------------- */}
 {/* 入库前单品预览与勾选确认弹窗 (Option A 双按钮) */}
 {/* ------------------------------------------------------------- */}
 {detectedGarmentsToConfirm && (
 <div className="absolute inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
 <div className="bg-white rounded-3xl border border-[#EAE6DF] shadow-2xl w-full max-w-xl max-h-[85vh] flex flex-col overflow-hidden text-left">
 {/* Header */}
 <div className="px-6 py-4 border-b border-[#EAE6DF] flex items-center justify-between bg-[#FAF8F5]/80">
 <div>
 <h3 className="text-sm font-extrabold text-stone-900">
 识别到 {detectedGarmentsToConfirm.length} 件单品，请确认添加入衣橱
 </h3>
 <p className="text-[10px] text-stone-400">
 您可以自由勾选、微调名称与品类，确认后写入私有衣橱
 </p>
 </div>
 <button
 onClick={() => setDetectedGarmentsToConfirm(null)}
 className="p-1.5 rounded-xl hover:bg-stone-100 text-stone-400 hover:text-stone-700"
 >
 <X className="w-4 h-4" />
 </button>
 </div>

 {/* List */}
 <div className="p-6 overflow-y-auto space-y-3 flex-1 scrollbar-thin">
 {detectedGarmentsToConfirm.map((item, idx) => (
 <div
 key={item.id}
 onClick={() => {
 setDetectedGarmentsToConfirm(
 detectedGarmentsToConfirm.map((g, i) =>
 i === idx ? { ...g, selected: !g.selected } : g
 )
 );
 }}
 className={`p-3.5 rounded-2xl border flex items-center gap-3.5 cursor-pointer transition-all ${
 item.selected
 ? 'bg-rose-50/50 border-[#D63031] shadow-2xs'
 : 'bg-white border-[#EAE6DF] opacity-60'
 }`}
 >
 {/* 复选框 */}
 <div className="shrink-0 text-[#D63031]">
 {item.selected ? (
 <CheckSquare className="w-5 h-5 fill-[#D63031] text-white stroke-[2]" />
 ) : (
 <Square className="w-5 h-5 text-stone-300 stroke-[1.75]" />
 )}
 </div>

 {/* 切片缩略图 */}
 <div className="w-16 h-16 rounded-xl bg-[#FAF8F5] border border-[#EAE6DF] p-1 flex items-center justify-center shrink-0 overflow-hidden">
 <img
 src={item.previewUrl || item.rawGarment?.assets?.[0]?.pngUrl}
 alt={item.title}
 className="max-h-full max-w-full object-contain"
 onError={(e) => {
 const color = item.colors?.[0] || '#D63031';
 const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="${encodeURIComponent(color)}"><rect width="100" height="100" fill="#FAF8F5" rx="16"/><path d="M30 20 L70 20 L85 40 L70 45 L70 85 L30 85 L30 45 L15 40 Z" opacity="0.85"/></svg>`;
 (e.target as HTMLImageElement).src = `data:image/svg+xml;utf8,${svg}`;
 }}
 />
 </div>

 {/* 详细属性微调 */}
 <div className="flex-1 space-y-1 text-left" onClick={(e) => e.stopPropagation()}>
 <input
 type="text"
 value={item.title}
 onChange={(e) => {
 const val = e.target.value;
 setDetectedGarmentsToConfirm(
 detectedGarmentsToConfirm.map((g, i) =>
 i === idx ? { ...g, title: val } : g
 )
 );
 }}
 className="w-full bg-white border border-[#EAE6DF] rounded-lg px-2 py-1 text-xs font-bold text-stone-900 focus:outline-none focus:border-[#D63031]"
 />

 <div className="flex items-center gap-2 pt-0.5">
 <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-stone-100 text-stone-700">
 {item.primaryCategory} · {item.subCategory}
 </span>
 <span className="text-[10px] text-stone-400 font-mono">{item.material}</span>
 </div>
 </div>
 </div>
 ))}
 </div>

 {/* Footer Buttons (Option A) */}
 <div className="p-4 border-t border-[#EAE6DF] bg-[#FAF8F5]/80 flex flex-col sm:flex-row items-center justify-between gap-2.5">
 <button
 type="button"
 onClick={() => setDetectedGarmentsToConfirm(null)}
 className="w-full sm:w-auto px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-bold transition-colors"
 >
 取消放弃
 </button>

 <div className="flex items-center gap-2 w-full sm:w-auto">
 <button
 type="button"
 onClick={() => handleConfirmBatchUpload(false)}
 className="flex-1 sm:flex-initial px-4 py-2 bg-stone-900 hover:bg-black text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
 >
 仅添加入衣橱
 </button>
 <button
 type="button"
 onClick={() => handleConfirmBatchUpload(true)}
 className="flex-1 sm:flex-initial px-4 py-2 bg-[#D63031] hover:bg-[#c0392b] text-white rounded-xl text-xs font-bold transition-colors shadow-xs flex items-center justify-center gap-1"
 >
 <Shirt className="w-3.5 h-3.5" />
 <span>确认入库并直接上身</span>
 </button>
 </div>
 </div>
 </div>
 </div>
 )}

 {/* ------------------------------------------------------------- */}
 {/* 左侧 45%：巴黎法式 Ins 数字化衣橱 */}
 {/* ------------------------------------------------------------- */}
 <div className={`h-full flex flex-col border-r border-[#EAE6DF] bg-white/95 backdrop-blur-xl shrink-0 z-20 shadow-xs transition-all duration-300 ${
    isWardrobeCollapsed ? 'w-0 opacity-0 overflow-hidden border-r-0 pointer-events-none' : 'w-full md:w-[48%] lg:w-[46%] xl:w-[45%] 2xl:w-[44%]'
  }`}>
 
 {/* 顶部控制栏 */}
 <div className="p-4 border-b border-[#EAE6DF] space-y-3 bg-[#FAF8F5]/60 shrink-0">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-1 bg-[#EFECE6] p-1 rounded-2xl">
 <button
 onClick={() => setWardrobeTab('PRIVATE')}
 className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
 wardrobeTab === 'PRIVATE'
 ? 'bg-white text-[#D63031] shadow-xs'
 : 'text-stone-600 hover:text-stone-900'
 }`}
 >
 私有衣橱 ({allGarments.length})
 </button>
 <button
 onClick={() => setWardrobeTab('PUBLIC')}
 className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
 wardrobeTab === 'PUBLIC'
 ? 'bg-white text-[#D63031] shadow-xs'
 : 'text-stone-600 hover:text-stone-900'
 }`}
 >
 公共单品 ({publicGarments.length})
 </button>
 </div>

 <div className="flex items-center gap-1.5">
 <button
 onClick={() => setIsSlotMachineOpen(true)}
 className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200/80 rounded-xl text-xs font-bold flex items-center gap-1 transition-all shadow-2xs"
 >
 <Dices className="w-3.5 h-3.5 text-amber-700 stroke-[1.75]" />
 <span>随机推荐</span>
 </button>

 <button
 onClick={() => fileInputRef.current?.click()}
 className="px-3.5 py-1.5 bg-[#2D3436] hover:bg-black text-white rounded-xl text-xs font-bold flex items-center gap-1 transition-all shadow-2xs"
 >
 <Plus className="w-3.5 h-3.5 stroke-[2]" />
 <span>智能录入</span>
 </button>
              <button
                type="button"
                onClick={() => setIsWardrobeCollapsed(true)}
                className="p-1.5 hover:bg-stone-200 text-stone-500 hover:text-stone-800 rounded-xl transition-colors ml-1 cursor-pointer"
                title="折叠衣橱列表，获得全屏沉浸试穿大视野"
              >
                <PanelLeftClose className="w-4 h-4" />
              </button>
 <input
 ref={fileInputRef}
 type="file"
 accept="image/*"
 data-testid="garment-upload-input"
 className="hidden"
 onChange={handleFileSelected}
 />
 </div>
 </div>

 {/* Row 1: 一级大类分类胶囊 */}
 <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
 {[
 { key: 'ALL', label: '全部' },
 { key: 'TOPS', label: '上装' },
 { key: 'BOTTOMS', label: '下装' },
 { key: 'OUTERWEAR', label: '外套' },
 { key: 'FOOTWEAR', label: '鞋履' },
 { key: 'ACCESSORIES', label: '配饰' },
 ].map((cat) => (
 <button
 key={cat.key}
 onClick={() => setSelectedCategory(cat.key as any)}
 className={`px-3 py-1 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
 selectedCategory === cat.key
 ? 'bg-[#2D3436] text-white shadow-xs'
 : 'bg-white border border-[#EAE6DF] text-stone-600 hover:border-stone-400'
 }`}
 >
 {cat.label}
 </button>
 ))}
 </div>

 {/* Row 2: 常驻 12 色谱圆点多选条 */}
 <div className="flex items-center justify-between gap-2 pt-1 border-t border-[#EAE6DF]/60">
 <div className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-none flex-1">
 <span className="text-[10px] font-bold text-stone-400 shrink-0">颜色:</span>
 {COLOR_PALETTE.map((pal) => {
 const isSelected = selectedColors.includes(pal.key);
 return (
 <button
 key={pal.key}
 type="button"
 title={pal.label}
 onClick={() => handleToggleColor(pal.key)}
 className={`w-5 h-5 rounded-full border transition-all flex items-center justify-center shrink-0 relative shadow-2xs ${
 isSelected
 ? 'ring-2 ring-[#D63031] ring-offset-1 scale-110 border-stone-800'
 : 'border-stone-400/80 ring-1 ring-black/10 hover:scale-105'
 }`}
 style={{ backgroundColor: pal.hex }}
 >
 {isSelected && (
 <Check className={`w-3 h-3 stroke-[3] ${pal.key === 'white' || pal.key === 'yellow' || pal.key === 'beige' ? 'text-stone-900' : 'text-white'}`} />
 )}
 </button>
 );
 })}
 </div>

 <button
 type="button"
 onClick={() => setIsAdvancedFilterOpen(!isAdvancedFilterOpen)}
 className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border transition-colors flex items-center gap-1 shrink-0 ${
 isAdvancedFilterOpen || selectedSubCategories.length > 0 || selectedPatterns.length > 0
 ? 'bg-rose-50 border-[#D63031] text-[#D63031]'
 : 'bg-white border-[#EAE6DF] text-stone-600 hover:bg-stone-50'
 }`}
 >
 <Filter className="w-3 h-3" />
 <span>款式/花纹</span>
 {isAdvancedFilterOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
 </button>
 </div>

 {/* Row 3: 展开式高级细分面板 */}
 {isAdvancedFilterOpen && (
 <div className="bg-white p-3.5 rounded-2xl border border-[#EAE6DF] space-y-2.5 animate-in fade-in text-left shadow-sm">
 <div className="space-y-1">
 <span className="text-[10px] font-bold text-stone-400">细分款式 (多选):</span>
 <div className="flex flex-wrap gap-1.5">
 {SUB_CATEGORIES.map((sub) => {
 const isSelected = selectedSubCategories.includes(sub);
 return (
 <button
 key={sub}
 type="button"
 onClick={() => handleToggleSubCategory(sub)}
 className={`px-2.5 py-0.5 rounded-lg text-[11px] font-bold border transition-all ${
 isSelected
 ? 'bg-stone-900 text-white border-stone-900 shadow-2xs'
 : 'bg-[#FAF8F5] text-stone-600 border-[#EAE6DF] hover:border-stone-400'
 }`}
 >
 {sub}
 </button>
 );
 })}
 </div>
 </div>

 <div className="space-y-1 pt-1 border-t border-stone-100">
 <span className="text-[10px] font-bold text-stone-400">面料图案 (多选):</span>
 <div className="flex flex-wrap gap-1.5">
 {PATTERN_OPTIONS.map((pat) => {
 const isSelected = selectedPatterns.includes(pat.key);
 return (
 <button
 key={pat.key}
 type="button"
 onClick={() => handleTogglePattern(pat.key)}
 className={`px-2.5 py-0.5 rounded-lg text-[11px] font-bold border transition-all ${
 isSelected
 ? 'bg-stone-900 text-white border-stone-900 shadow-2xs'
 : 'bg-[#FAF8F5] text-stone-600 border-[#EAE6DF] hover:border-stone-400'
 }`}
 >
 {pat.label}
 </button>
 );
 })}
 </div>
 </div>

 <div className="flex justify-end pt-1">
 <button
 type="button"
 onClick={handleResetFilters}
 className="text-[10px] text-stone-400 hover:text-[#D63031] font-bold flex items-center gap-0.5"
 >
 <RotateCcw className="w-3 h-3" />
 <span>重置所有筛选</span>
 </button>
 </div>
 </div>
 )}
 </div>

 {/* 单品网格列表 */}
 <div className="flex-1 overflow-y-auto p-4 scrollbar-thin">
 {filteredGarments.length === 0 ? (
 <div className="h-full flex flex-col items-center justify-center text-stone-400 space-y-2 py-12">
 <Shirt className="w-8 h-8 stroke-[1.25] text-stone-300" />
 <p className="text-xs">未找到符合当前筛选条件的衣物</p>
 <button
 onClick={handleResetFilters}
 className="text-xs text-[#D63031] font-bold hover:underline"
 >
 清空筛选条件
 </button>
 </div>
 ) : (
 <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
 {filteredGarments.map((garment) => {
 const isWorn = wornItems.some((item) => item.garment.id === garment.id);
 return (
 <div
 key={garment.id}
 data-testid="garment-card"
 onClick={() => handleWearWithPlacement(garment)}
 className={`group relative bg-[#FAF8F5] rounded-2xl border p-2.5 flex flex-col justify-between cursor-pointer transition-all duration-200 hover:shadow-md hover:border-stone-400 ${
 isWorn
 ? 'border-[#D63031] ring-2 ring-[#D63031]/20 shadow-xs'
 : 'border-[#EAE6DF]'
 }`}
 >
 <div className="w-full aspect-square bg-white rounded-xl flex items-center justify-center p-2 overflow-hidden relative">
                    {/* 360° 单品档案与管理详情入口 (ⓘ) */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedGarmentForDrawer(garment);
                      }}
                      className="absolute top-1.5 left-1.5 z-20 p-1.5 rounded-xl bg-white/95 hover:bg-white text-stone-700 hover:text-stone-950 border border-stone-200/90 shadow-sm transition-all hover:scale-110 flex items-center justify-center"
                      title="查看单品 360° 档案与管理"
                    >
                      <Info className="w-3.5 h-3.5 stroke-[2.5]" />
                    </button>
 <img
 src={garment.assets?.[0]?.pngUrl}
 alt={garment.title}
 className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform"
 onError={(e) => {
 const color = garment.colors?.[0] || '#D63031';
 const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="${encodeURIComponent(color)}"><rect width="100" height="100" fill="#FAF8F5" rx="16"/><path d="M30 20 L70 20 L85 40 L70 45 L70 85 L30 85 L30 45 L15 40 Z" opacity="0.85"/></svg>`;
 (e.target as HTMLImageElement).src = `data:image/svg+xml;utf8,${svg}`;
 }}
 />

 {isWorn && (
 <div className="absolute top-1.5 right-1.5 bg-[#D63031] text-white p-0.5 rounded-full shadow-xs">
 <Check className="w-3 h-3 stroke-[3]" />
 </div>
 )}
 </div>

 <div className="mt-2 space-y-0.5 text-left">
 <span className="text-[9px] font-mono font-bold text-[#D63031]">
 {garment.primaryCategory}
 </span>
 <h4 className="text-xs font-bold text-stone-800 line-clamp-1">
 {garment.title}
 </h4>
 </div>
 </div>
 );
 })}
 </div>
 )}
 </div>
 </div>

 {/* ------------------------------------------------------------- */}
 {/* 右侧 55%：自由大画布与模特舞台 */}
 {/* ------------------------------------------------------------- */}
 <div
 ref={canvasRef}
 onClick={() => setSelectedItemId(null)}
 onMouseMove={handleCanvasMouseMove}
 onMouseUp={handleCanvasMouseUp}
 className="flex-1 h-full flex flex-col justify-between relative overflow-hidden select-none"
        style={{
          background: 'radial-gradient(circle at 50% 40%, #FFFFFF 0%, #FAF8F5 55%, #EDE7DD 100%)',
        }}
 >
 {/* 当左侧衣橱折叠时，在画布左上方提供一键展开按钮 */}
        {isWardrobeCollapsed && (
          <div className="absolute top-4 left-4 z-30 pointer-events-auto">
            <button
              type="button"
              onClick={() => setIsWardrobeCollapsed(false)}
              className="px-3.5 py-2 bg-white/95 hover:bg-white text-stone-800 rounded-2xl border border-stone-200/90 shadow-lg text-xs font-bold flex items-center gap-2 transition-all hover:scale-105 cursor-pointer"
              title="展开数字化衣橱"
            >
              <PanelLeftOpen className="w-4 h-4 text-[#D63031]" />
              <span>展开衣橱</span>
            </button>
          </div>
        )}

        {/* 画布中央模特舞台 (3:4 黄金画幅) */}
 <div className="absolute inset-0 flex items-center justify-center p-2 sm:p-3 pointer-events-none">
 <div
 onClick={() => setSelectedItemId(null)}
 className="relative h-[56vh] md:h-[88vh] max-h-[880px] aspect-[3/4] rounded-3xl border border-stone-200/80 bg-white/95 shadow-2xl shadow-stone-300/40 flex items-center justify-center overflow-visible pointer-events-auto transition-all"
 >
 {/* 模特景深光晕底座 */}
 <div className="absolute inset-x-8 bottom-0 h-16 bg-stone-300/30 blur-xl rounded-full pointer-events-none" />

        {/* 选项 B：3D 影棚大片原位呈现模式 (100% 纯净呈现与交互式卷帘对比) */}
        {studioDisplayMode === '3D' && renderedImageUrl ? (
          <div className="relative w-full h-full rounded-3xl overflow-hidden border border-white/20 shadow-2xl bg-stone-950 flex items-center justify-center pointer-events-auto select-none animate-in fade-in zoom-in-95 duration-200">
            {isSplitCompareMode ? (
              /* 交互式卷帘对比分屏渲染 (Split Curtain Slider) */
              <div
                ref={curtainContainerRef}
                className="relative w-full h-full cursor-ew-resize select-none overflow-hidden"
                onMouseDown={(e) => {
                  setIsDraggingCurtain(true);
                  handleCurtainDrag(e.clientX);
                }}
                onTouchStart={(e) => {
                  setIsDraggingCurtain(true);
                  if (e.touches && e.touches[0]) {
                    handleCurtainDrag(e.touches[0].clientX);
                  }
                }}
              >
                {/* 底层/左侧：2D 拼搭模特原图与纯净贴图层 (100% 像素级对齐 2D 拼搭画布，精准左半侧卷帘裁剪) */}
                <div
                  className="absolute inset-0 w-full h-full bg-[#FAF8F5] flex items-center justify-center pointer-events-none select-none"
                  style={{ clipPath: `inset(0 ${100 - curtainSliderPos}% 0 0)` }}
                >
                  {/* 模特底图 */}
                  {avatar?.normalizedImageUrl ? (
                    <img
                      src={avatar.normalizedImageUrl}
                      alt="2D 模特原底"
                      className="h-full w-full object-contain pointer-events-none select-none rounded-3xl"
                    />
                  ) : (
                    <div className="text-xs text-stone-400">2D 原稿</div>
                  )}

                  {/* 穿戴衣物层 - 100% 像素级对齐 2D 拼搭画布 */}
                  {wornItems.map((worn) => {
                    const defaultOffs = getCategoryDefaultOffsets(
                      worn.garment.primaryCategory,
                      worn.garment.subCategory,
                      worn.garment.title
                    );
                    const offX = worn.offsetX !== undefined && worn.offsetX !== 0 ? worn.offsetX : defaultOffs.offsetX;
                    const offY = worn.offsetY !== undefined && worn.offsetY !== 0 ? worn.offsetY : defaultOffs.offsetY;
                    const scX = worn.scaleX !== undefined && worn.scaleX !== 1 ? worn.scaleX : (worn.scale !== 1 ? worn.scale : defaultOffs.scale);
                    const scY = worn.scaleY !== undefined && worn.scaleY !== 1 ? worn.scaleY : (worn.scale !== 1 ? worn.scale : defaultOffs.scale);
                    const activeAsset = worn.garment.assets?.find((a) => a.stateType === worn.state) || worn.garment.assets?.[0];
                    const activePng = activeAsset?.pngUrl || (worn.garment as any).cutoutUrl || (worn.garment as any).previewUrl;
                    if (!activePng) return null;

                    return (
                      <div
                        key={worn.garment.id}
                        style={{
                          zIndex: worn.zIndex,
                          transform: `translate(${offX}px, ${offY}px) scale(${scX}, ${scY})`,
                        }}
                        className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-visible"
                      >
                        <div className="relative inline-flex items-center justify-center pointer-events-none select-none">
                          <img
                            src={activePng}
                            alt={worn.garment.title}
                            draggable={false}
                            className="max-h-[580px] max-w-[340px] object-contain filter drop-shadow-sm pointer-events-none select-none"
                          />
                        </div>
                      </div>
                    );
                  })}

                  <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-xl text-white text-[10px] font-bold border border-white/10 shadow-sm">
                    2D 拼搭原稿
                  </div>
                </div>

                {/* 顶层/右侧：8K AI 试穿成片 (通过 clip-path 遮罩实现精准左右卷帘裁剪) */}
                <div
                  className="absolute inset-0 w-full h-full pointer-events-none select-none"
                  style={{ clipPath: `inset(0 0 0 ${curtainSliderPos}%)` }}
                >
                  <img
                    src={renderedImageUrl}
                    alt="AI 8K 试穿成片"
                    className="w-full h-full object-cover pointer-events-none select-none"
                  />
                  <div className="absolute top-4 right-4 bg-[#D63031]/85 backdrop-blur-md px-2.5 py-1 rounded-xl text-white text-[10px] font-bold shadow-md border border-white/20">
                    8K 试穿大片
                  </div>
                </div>

                {/* 极细 1.5px 轻奢磨砂发丝分割线与精致微缩胶囊把手 */}
                <div
                  style={{ left: `${curtainSliderPos}%` }}
                  className="absolute inset-y-0 w-[1.5px] bg-white/95 shadow-[0_0_10px_rgba(0,0,0,0.4)] z-30 flex items-center justify-center -translate-x-1/2 group pointer-events-auto cursor-ew-resize"
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    setIsDraggingCurtain(true);
                    handleCurtainDrag(e.clientX);
                  }}
                  onTouchStart={(e) => {
                    e.stopPropagation();
                    setIsDraggingCurtain(true);
                    if (e.touches && e.touches[0]) handleCurtainDrag(e.touches[0].clientX);
                  }}
                >
                  <div className="w-5 h-8 rounded-full bg-white/95 backdrop-blur-md text-stone-800 shadow-xl border border-stone-200/80 flex items-center justify-center select-none group-hover:scale-110 active:scale-95 transition-transform">
                    <Sliders className="w-3 h-3 text-[#D63031] rotate-90" />
                  </div>
                </div>
              </div>
            ) : (
              /* 100% 纯净无遮挡 8K 试穿大片呈现 */
              <img
                src={renderedImageUrl}
                alt="AI 8K 影棚试穿大片"
                className="w-full h-full object-cover select-none"
              />
            )}
          </div>
        ) : (
 /* 2D 实时拼搭工作台模式 */
 <>
 {/* 模特底图 */}
 {avatar?.normalizedImageUrl ? (
 <img
 src={avatar.normalizedImageUrl}
 alt="模特素体"
 onClick={(e) => {
 e.stopPropagation();
 setSelectedItemId(null);
 }}
 className="h-full w-full object-contain pointer-events-auto cursor-default select-none rounded-3xl"
 />
 ) : (
 <div className="text-xs text-stone-400">暂无模特素体</div>
 )}

 {/* 穿戴衣物层 */}
 {wornItems.map((worn) => {
 const defaultOffs = getCategoryDefaultOffsets(
 worn.garment.primaryCategory,
 worn.garment.subCategory,
 worn.garment.title
 );
 const offX = worn.offsetX !== undefined && worn.offsetX !== 0 ? worn.offsetX : defaultOffs.offsetX;
 const offY = worn.offsetY !== undefined && worn.offsetY !== 0 ? worn.offsetY : defaultOffs.offsetY;
 const sc = worn.scale !== undefined && worn.scale !== 1 ? worn.scale : defaultOffs.scale;
 const scX = worn.scaleX !== undefined && worn.scaleX !== 1 ? worn.scaleX : (worn.scale !== 1 ? worn.scale : defaultOffs.scale);
 const scY = worn.scaleY !== undefined && worn.scaleY !== 1 ? worn.scaleY : (worn.scale !== 1 ? worn.scale : defaultOffs.scale);
 const isSelected = selectedItemId === worn.garment.id;
 const activeAsset = worn.garment.assets?.find((a) => a.stateType === worn.state) || worn.garment.assets?.[0];
 const invScX = 1 / Math.max(0.01, scX);
 const invScY = 1 / Math.max(0.01, scY);
 const invScMin = 1 / Math.max(0.01, Math.min(scX, scY));

 return (
 <div
 key={worn.garment.id}
 style={{
 zIndex: isSelected ? 90 : worn.zIndex,
 transform: `translate(${offX}px, ${offY}px) scale(${scX}, ${scY})`,
 }}
 className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-visible"
 >
 <div
 onMouseDown={(e) => handleTransformMouseDown(e, worn.garment.id, 'MOVE')}
 onClick={(e) => {
 e.stopPropagation();
 setSelectedItemId(worn.garment.id);
 }}
 className="relative inline-flex items-center justify-center pointer-events-auto cursor-move select-none"
 >
 <img
 src={activeAsset?.pngUrl || worn.garment.assets?.[0]?.pngUrl}
 alt={worn.garment.title}
 draggable={false}
 className="max-h-[580px] max-w-[340px] object-contain filter drop-shadow-sm pointer-events-auto select-none"
 />

 {/* Figma Pro 级交互式微调与缩放选框 (视口解耦，绝对恒定尺寸与清晰度) */}
                  {isSelected && studioDisplayMode === '2D' && !isRendering && !isLookbookModalOpen && !isSlotMachineOpen && !isVtonResultModalOpen && !selectedGarmentForDrawer && (
 <div
 onClick={(e) => e.stopPropagation()}
 style={{
 borderWidth: `${Math.max(1.5, 2 * invScMin)}px`,
 }}
 className="absolute -inset-3 border-2 border-dashed border-[#D63031] rounded-2xl cursor-move pointer-events-auto bg-[#D63031]/5 z-50 overflow-visible"
 >
 {/* 右上角删除/脱下单品按钮 (固定 28px 圆形尺寸，红底白色 X) */}
 <button
 type="button"
 onMouseDown={(e) => e.stopPropagation()}
 onClick={(e) => {
 e.stopPropagation();
 onRemoveWornItem(worn.garment.id);
 if (selectedItemId === worn.garment.id) setSelectedItemId(null);
 }}
 style={{
 top: `${-14 * invScY}px`,
 right: `${-14 * invScX}px`,
 transform: `scale(${invScX}, ${invScY})`,
 transformOrigin: 'center center',
 }}
 className="absolute w-7 h-7 bg-[#D63031] hover:bg-[#b02526] text-white rounded-full flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-transform z-50 cursor-pointer"
 title="脱下此单品 (或按 Delete / Backspace 键)"
 >
 <X className="w-4 h-4 stroke-[3]" />
 </button>

 {/* 右下角等比缩放手柄 (固定 28px 圆形尺寸) */}
 <div
 onMouseDown={(e) => handleTransformMouseDown(e, worn.garment.id, 'RESIZE_BR')}
 onClick={(e) => e.stopPropagation()}
 style={{
 bottom: `${-14 * invScY}px`,
 right: `${-14 * invScX}px`,
 transform: `scale(${invScX}, ${invScY})`,
 transformOrigin: 'center center',
 }}
 className="absolute w-7 h-7 bg-[#D63031] hover:bg-[#b02526] text-white rounded-full flex items-center justify-center shadow-lg cursor-nwse-resize hover:scale-110 active:scale-95 transition-transform z-50"
 title="拖拽等比缩放"
 >
 <Maximize2 className="w-3.5 h-3.5 stroke-[2.5]" />
 </div>

 {/* 四边拉伸控制点 (上下左右) */}
 <div
 onMouseDown={(e) => handleTransformMouseDown(e, worn.garment.id, 'STRETCH_T')}
 onClick={(e) => e.stopPropagation()}
 style={{
 top: `${-4 * invScY}px`,
 transform: `translate(-50%, -50%) scale(${invScX}, ${invScY})`,
 }}
 className="absolute left-1/2 w-6 h-2 bg-[#D63031] rounded-full cursor-ns-resize z-40 border border-white shadow-xs"
 title="上下拉伸"
 />
 <div
 onMouseDown={(e) => handleTransformMouseDown(e, worn.garment.id, 'STRETCH_B')}
 onClick={(e) => e.stopPropagation()}
 style={{
 bottom: `${-4 * invScY}px`,
 transform: `translate(-50%, 50%) scale(${invScX}, ${invScY})`,
 }}
 className="absolute left-1/2 w-6 h-2 bg-[#D63031] rounded-full cursor-ns-resize z-40 border border-white shadow-xs"
 title="上下拉伸"
 />
 <div
 onMouseDown={(e) => handleTransformMouseDown(e, worn.garment.id, 'STRETCH_L')}
 onClick={(e) => e.stopPropagation()}
 style={{
 left: `${-4 * invScX}px`,
 transform: `translate(-50%, -50%) scale(${invScX}, ${invScY})`,
 }}
 className="absolute top-1/2 w-2 h-6 bg-[#D63031] rounded-full cursor-ew-resize z-40 border border-white shadow-xs"
 title="左右拉伸"
 />
 <div
 onMouseDown={(e) => handleTransformMouseDown(e, worn.garment.id, 'STRETCH_R')}
 onClick={(e) => e.stopPropagation()}
 style={{
 right: `${-4 * invScX}px`,
 transform: `translate(50%, -50%) scale(${invScX}, ${invScY})`,
 }}
 className="absolute top-1/2 w-2 h-6 bg-[#D63031] rounded-full cursor-ew-resize z-40 border border-white shadow-xs"
 title="左右拉伸"
 />

 {/* 底部极简控制胶囊：磁吸复位 + 图层层级微调 + 一键脱下 */}
 <div
 onClick={(e) => e.stopPropagation()}
 style={{
 bottom: `${-24 * invScY}px`,
 transform: `translate(-50%, 100%) scale(${invScX}, ${invScY})`,
 transformOrigin: 'center top',
 }}
 className="absolute left-1/2 flex items-center gap-1.5 pointer-events-auto z-50"
 >
 <button
 type="button"
 onMouseDown={(e) => e.stopPropagation()}
 onClick={(e) => {
 e.stopPropagation();
 handleResetPlacement(worn.garment);
 }}
 className="bg-white hover:bg-stone-50 text-stone-700 hover:text-stone-900 border border-[#EAE6DF] px-3 py-1 rounded-full text-xs font-bold shadow-md flex items-center gap-1 whitespace-nowrap transition-colors cursor-pointer"
 title="恢复至默认人体工学基准位"
 >
 <RotateCcw className="w-3 h-3" />
 <span>磁吸复位</span>
 </button>

 <button
 type="button"
 onMouseDown={(e) => e.stopPropagation()}
 onClick={(e) => {
 e.stopPropagation();
 handleAdjustZIndex(worn.garment.id, 'UP');
 }}
 className="bg-white hover:bg-stone-50 text-stone-700 hover:text-stone-900 border border-[#EAE6DF] px-2.5 py-1 rounded-full text-xs font-bold shadow-md flex items-center gap-0.5 whitespace-nowrap transition-colors cursor-pointer"
 title="图层上移 (移向更外层)"
 >
 <ChevronUp className="w-3 h-3 text-[#D63031]" />
 <span>上移</span>
 </button>

 <button
 type="button"
 onMouseDown={(e) => e.stopPropagation()}
 onClick={(e) => {
 e.stopPropagation();
 handleAdjustZIndex(worn.garment.id, 'DOWN');
 }}
 className="bg-white hover:bg-stone-50 text-stone-700 hover:text-stone-900 border border-[#EAE6DF] px-2.5 py-1 rounded-full text-xs font-bold shadow-md flex items-center gap-0.5 whitespace-nowrap transition-colors cursor-pointer"
 title="图层下移 (移向更内层)"
 >
 <ChevronDown className="w-3 h-3 text-[#D63031]" />
 <span>下移</span>
 </button>

 <button
 type="button"
 onMouseDown={(e) => e.stopPropagation()}
 onClick={(e) => {
 e.stopPropagation();
 onRemoveWornItem(worn.garment.id);
 setSelectedItemId(null);
 }}
 className="bg-rose-50 hover:bg-rose-100 text-[#D63031] border border-rose-200 px-2.5 py-1 rounded-full text-xs font-bold shadow-md flex items-center gap-1 whitespace-nowrap transition-colors cursor-pointer"
 title="脱下此单品"
 >
 <Trash2 className="w-3 h-3" />
 <span>脱下</span>
 </button>
 </div>
 </div>
 )}
 </div>
 </div>
 );
 })}
 </>
 )}
 </div>
 </div>

      {/* ========================================================================= */}
      {/* 左翼·创作辅助悬浮坞 (Left Wing Creation & Staging Dock - A1方案) */}
      {/* ========================================================================= */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="absolute left-2 lg:left-3.5 top-1/2 -translate-y-1/2 z-30 pointer-events-auto flex flex-col items-center gap-2 bg-white/95 backdrop-blur-2xl border border-[#EAE6DF] shadow-2xl rounded-3xl p-2.5 transition-all w-12 lg:w-36 text-left"
      >
        {/* 1. 2D / 3D 模式纵向切换 (带平滑丝滑滑块动效) */}
        <div className="w-full relative flex flex-col p-1 bg-stone-100/90 rounded-2xl border border-[#EAE6DF]/60 select-none">
          {/* 红色平滑移动滑块胶囊 (Sliding Pill Indicator) */}
          <div
            className={`absolute left-1 right-1 h-[calc(50%-4px)] bg-[#D63031] rounded-xl shadow-xs transition-all duration-300 ease-out pointer-events-none ${
              studioDisplayMode === '2D' ? 'top-1' : 'top-[calc(50%+2px)]'
            }`}
          />

          <button
            type="button"
            onClick={() => setStudioDisplayMode('2D')}
            title="2D 自由拼搭微调"
            className={`w-full py-2 rounded-xl text-xs font-bold transition-colors duration-200 flex items-center justify-center lg:justify-start lg:px-2.5 gap-2 relative z-10 ${
              studioDisplayMode === '2D'
                ? 'text-white font-extrabold'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Shirt className="w-4 h-4 shrink-0 stroke-[2]" />
            <span className="hidden lg:inline text-xs">2D 拼搭</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (renderedImageUrl) {
                setSelectedItemId(null);
                setStudioDisplayMode('3D');
              } else {
                showToast('请先点击右侧「AI 试穿大片」生成 3D 影棚商业大片！', 'info');
              }
            }}
            title="3D 影棚试穿成片"
            className={`w-full py-2 rounded-xl text-xs font-bold transition-colors duration-200 flex items-center justify-center lg:justify-start lg:px-2.5 gap-2 relative z-10 ${
              studioDisplayMode === '3D'
                ? 'text-white font-extrabold'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Sparkles className="w-4 h-4 shrink-0 stroke-[2]" />
            <span className="hidden lg:inline text-xs">3D 大片</span>
            {renderedImageUrl && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse absolute top-1.5 right-1.5 lg:static lg:ml-auto" />
            )}
          </button>
        </div>

        <div className="w-full h-[1px] bg-stone-200/70 my-0.5" />

        {/* 2. 形态切换 (替换原身材工坊，智能检测选中/穿戴单品并支持置灰) */}
        {(() => {
          const selectedWorn = selectedItemId ? wornItems.find((w) => w.garment.id === selectedItemId) : null;
          const targetWorn = selectedWorn || wornItems.find((w) =>
            w.garment.primaryCategory === 'TOPS' ||
            w.garment.primaryCategory === 'OUTERWEAR' ||
            (w.garment.assets && w.garment.assets.length > 1)
          );

          const canToggle = !!targetWorn && (
            targetWorn.garment.primaryCategory === 'TOPS' ||
            targetWorn.garment.primaryCategory === 'OUTERWEAR' ||
            (targetWorn.garment.assets && targetWorn.garment.assets.length > 1)
          );

          let stateLabel = '形态切换';
          let stateTooltip = '此衣物无形态切换';
          if (canToggle && targetWorn) {
            if (targetWorn.garment.primaryCategory === 'TOPS') {
              stateLabel = targetWorn.state === 'TUCKED' ? '已塞入' : '已外放';
              stateTooltip = `点击切换「${targetWorn.garment.title}」: ${targetWorn.state === 'TUCKED' ? '塞入 ➔ 外放' : '外放 ➔ 塞入'}`;
            } else if (targetWorn.garment.primaryCategory === 'OUTERWEAR') {
              stateLabel = targetWorn.state === 'OPEN' ? '已敞开' : '已扣合';
              stateTooltip = `点击切换「${targetWorn.garment.title}」: ${targetWorn.state === 'OPEN' ? '敞开 ➔ 扣合' : '扣合 ➔ 敞开'}`;
            } else {
              stateLabel = '切换形态';
              stateTooltip = `点击切换「${targetWorn.garment.title}」多态切片`;
            }
          }

          return (
            <button
              type="button"
              disabled={!canToggle}
              onClick={(e) => {
                e.stopPropagation();
                if (canToggle && targetWorn) {
                  handleToggleGarmentState(targetWorn.garment.id);
                }
              }}
              title={stateTooltip}
              className={`w-full py-2 px-1 lg:px-2.5 rounded-2xl text-xs font-bold transition-all flex items-center justify-center lg:justify-start gap-2 ${
                canToggle
                  ? 'bg-amber-50/90 hover:bg-amber-100 text-amber-900 border border-amber-200/80 shadow-2xs cursor-pointer active:scale-95'
                  : 'bg-stone-100/50 text-stone-300 border border-transparent cursor-not-allowed opacity-50'
              }`}
            >
              <Shirt className={`w-4 h-4 shrink-0 stroke-[1.75] ${canToggle ? 'text-amber-700' : 'text-stone-300'}`} />
              <span className="hidden lg:inline text-xs">{stateLabel}</span>
            </button>
          );
        })()}

        {/* 3. 图层管理 */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsLayerPanelOpen(!isLayerPanelOpen);
          }}
          title="穿戴图层层级排序与查看"
          className={`w-full py-2 px-1 lg:px-2.5 rounded-2xl text-xs font-bold transition-all flex items-center justify-center lg:justify-start gap-2 ${
            isLayerPanelOpen
              ? 'bg-[#2D3436] text-white shadow-xs'
              : 'hover:bg-stone-100 text-stone-700 hover:text-stone-950'
          }`}
        >
          <Layers className="w-4 h-4 shrink-0 stroke-[1.75]" />
          <span className="hidden lg:inline text-xs">图层 ({wornItems.length})</span>
        </button>

        {/* 4. 智能搭配推荐 */}
        <button
          type="button"
          onClick={() => setIsSlotMachineOpen(true)}
          title="胶囊衣橱气温智能出装推荐"
          className="w-full py-2 px-1 lg:px-2.5 hover:bg-amber-50 hover:text-amber-900 text-stone-700 rounded-2xl text-xs font-bold transition-all flex items-center justify-center lg:justify-start gap-2"
        >
          <Sparkles className="w-4 h-4 shrink-0 text-amber-600 stroke-[1.75]" />
          <span className="hidden lg:inline text-xs">智能出装</span>
        </button>

        {/* 5. 一键清空画布 (保持常驻，空状态下置灰禁用) */}
        <button
          type="button"
          disabled={wornItems.length === 0}
          onClick={onClearCanvas}
          title={wornItems.length === 0 ? '暂无穿戴单品可清空' : '清空模特身上所有已穿戴单品'}
          className={`w-full py-2 px-1 lg:px-2.5 rounded-2xl text-xs font-bold transition-all flex items-center justify-center lg:justify-start gap-2 ${
            wornItems.length > 0
              ? 'hover:bg-rose-50 text-stone-500 hover:text-rose-600 cursor-pointer active:scale-95'
              : 'text-stone-300 cursor-not-allowed opacity-40'
          }`}
        >
          <RotateCcw className="w-4 h-4 shrink-0 stroke-[1.75]" />
          <span className="hidden lg:inline text-xs">一键清空</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 右翼·成片交付主行动坞 (Right Wing Production & Delivery Dock - A1方案) */}
      {/* ========================================================================= */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="absolute right-2.5 lg:right-4 top-1/2 -translate-y-1/2 z-30 pointer-events-auto flex flex-col items-center gap-2 bg-white/95 backdrop-blur-2xl border border-[#EAE6DF] shadow-2xl rounded-3xl p-2.5 transition-all w-12 lg:w-36 text-center"
      >
        {/* 1. 主行动点：AI 试穿大片 */}
        <button
          type="button"
          onClick={async () => {
            let snapshotBase64 = '';
            try {
              snapshotBase64 = await generate2DCanvasSnapshot(
                avatar?.normalizedImageUrl || '',
                wornItems
              );
            } catch (e) {
              console.warn('Canvas snapshot capture failed:', e);
            }
            setSelectedItemId(null);
            onRenderVton(snapshotBase64);
          }}
          disabled={isRendering || wornItems.length === 0}
          title={wornItems.length === 0 ? '请先穿戴至少 1 件单品上身' : '消耗 5 积分生成 8K 影棚试穿大片'}
          className="w-full py-2.5 px-1 lg:px-2.5 bg-gradient-to-tr from-[#9E1B1B] via-[#D63031] to-[#E17055] hover:opacity-95 text-white rounded-2xl text-xs font-black shadow-md flex flex-col items-center justify-center gap-0.5 transition-all disabled:opacity-40 disabled:cursor-not-allowed group active:scale-95"
        >
          <div className="flex items-center gap-1.5">
            <Sparkles className={`w-4 h-4 ${isRendering ? 'animate-spin' : 'group-hover:rotate-12'} transition-transform`} />
            <span className="hidden lg:inline">{isRendering ? 'AI 渲染中' : 'AI 试穿大片'}</span>
          </div>
          <span className="hidden lg:inline text-[9px] text-white/80 font-mono font-medium">
            8K 影棚 (5分)
          </span>
        </button>

        <div className="w-full h-[1px] bg-stone-200/70 my-0.5" />

        {/* 2. 收录 Lookbook */}
        <button
          type="button"
          onClick={() => setIsLookbookModalOpen(true)}
          disabled={wornItems.length === 0}
          title="保存当前搭配套装至 Lookbook 灵感库"
          className="w-full py-2 px-1 lg:px-2.5 bg-stone-100 hover:bg-stone-200/80 text-stone-800 rounded-2xl text-xs font-bold transition-all flex items-center justify-center lg:justify-start gap-2 disabled:opacity-40"
        >
          <Heart className="w-4 h-4 shrink-0 text-[#D63031] stroke-[2]" />
          <span className="hidden lg:inline text-xs">保存搭配</span>
        </button>

        {/* 3. 今日 OOTD 打卡 */}
        <button
          type="button"
          onClick={() => {
            if (wornItems.length === 0) {
              showToast('请先穿戴衣物后再进行 OOTD 打卡！', 'info');
              return;
            }
            setIsLookbookModalOpen(true);
          }}
          disabled={wornItems.length === 0}
          title="将当前穿搭保存并打卡至今日 OOTD 穿搭日历"
          className="w-full py-2 px-1 lg:px-2.5 bg-stone-100 hover:bg-stone-200/80 text-stone-800 rounded-2xl text-xs font-bold transition-all flex items-center justify-center lg:justify-start gap-2 disabled:opacity-40"
        >
          <Calendar className="w-4 h-4 shrink-0 text-stone-700 stroke-[1.75]" />
          <span className="hidden lg:inline text-xs">打卡 OOTD</span>
        </button>

        {/* 4. 当 3D 渲染成片就绪时的功能 (卷帘对比 & 高清下载) */}
        {renderedImageUrl && (
          <>
            <div className="w-full h-[1px] bg-stone-200/70 my-0.5" />
            <button
              type="button"
              onClick={() => {
                setStudioDisplayMode('3D');
                setIsSplitCompareMode(!isSplitCompareMode);
              }}
              className={`w-full py-2 px-1 lg:px-2.5 rounded-2xl text-xs font-bold transition-all flex items-center justify-center lg:justify-start gap-2 ${
                isSplitCompareMode
                  ? 'bg-amber-400 text-stone-950 font-extrabold shadow-xs'
                  : 'bg-stone-100 hover:bg-stone-200 text-stone-800'
              }`}
              title="左右拖拽对比 2D 原稿 与 8K 试穿成片"
            >
              <Sliders className="w-4 h-4 shrink-0" />
              <span className="hidden lg:inline text-xs">卷帘对比</span>
            </button>

            <a
              href={renderedImageUrl}
              download="SmartWardrobe_VTON_8K.jpg"
              target="_blank"
              rel="noreferrer"
              className="w-full py-2 px-1 lg:px-2.5 bg-stone-900 hover:bg-black text-white rounded-2xl text-xs font-bold shadow-xs flex items-center justify-center lg:justify-start gap-2 transition-colors"
              title="无损下载 8K 商业成片"
            >
              <UploadCloud className="w-4 h-4 shrink-0 rotate-180" />
              <span className="hidden lg:inline text-xs">高清下载</span>
            </a>
          </>
        )}

        {/* 5. 3:4 黄金画幅指示标签 */}
        <div className="hidden lg:flex items-center justify-center gap-1 text-[10px] font-mono text-stone-400 font-bold bg-[#FAF8F5] py-1 px-2 rounded-xl border border-[#EAE6DF] w-full">
          <span>3:4 画幅</span>
        </div>
      </div>

 {/* 图层管理浮动抽屉 (Layer Stack Panel) */}
 {isLayerPanelOpen && (
 <div
 onClick={(e) => e.stopPropagation()}
 className="absolute left-16 lg:left-44 top-1/2 -translate-y-1/2 z-40 w-72 bg-white/95 backdrop-blur-2xl border border-[#EAE6DF] rounded-3xl p-4 shadow-2xl space-y-3 animate-in fade-in zoom-in-95 duration-150 text-left"
 >
 <div className="flex items-center justify-between pb-2 border-b border-[#EAE6DF]">
 <div className="flex items-center gap-1.5">
 <Layers className="w-4 h-4 text-[#D63031]" />
 <h4 className="text-xs font-extrabold text-stone-900">穿戴图层拓扑</h4>
 </div>
 <button
 type="button"
 onClick={() => setIsLayerPanelOpen(false)}
 className="text-stone-400 hover:text-stone-700"
 >
 <X className="w-4 h-4" />
 </button>
 </div>

 {wornItems.length === 0 ? (
 <div className="py-6 text-center text-xs text-stone-400">暂无穿戴单品，请在左侧点击穿上</div>
 ) : (
 <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1 scrollbar-thin">
 <div className="text-[9px] text-stone-400 font-mono px-1">▲ 最外层 (TOP)</div>
 {[...wornItems]
 .sort((a, b) => b.zIndex - a.zIndex)
 .map((item) => {
 const isSelected = selectedItemId === item.garment.id;
 return (
 <div
 key={item.garment.id}
 onClick={() => setSelectedItemId(item.garment.id)}
 className={`p-2 rounded-2xl border transition-all flex items-center justify-between gap-2 cursor-pointer ${
 isSelected
 ? 'bg-rose-50/80 border-[#D63031] ring-1 ring-[#D63031]'
 : 'bg-[#FAF8F5] border-[#EAE6DF] hover:border-stone-400'
 }`}
 >
 <div className="flex items-center gap-2 min-w-0">
 <img
 src={item.garment.assets?.[0]?.pngUrl}
 alt={item.garment.title}
 className="w-9 h-9 rounded-xl object-contain bg-white border border-[#EAE6DF] shrink-0 p-0.5"
 />
 <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-stone-800 truncate">
                            {item.garment.title}
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[9px] font-mono text-stone-400">
                              Z: {item.zIndex}
                            </span>
                            {/* 形态切换快捷开关 */}
                            {item.garment.primaryCategory === 'TOPS' && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleGarmentState(item.garment.id);
                                }}
                                className="px-2 py-0.5 rounded-lg text-[10px] font-bold border transition-colors flex items-center gap-0.5 bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100"
                                title="切换塞衣角 / 外放形态"
                              >
                                <Shirt className="w-3 h-3 text-amber-700" />
                                <span>{item.state === 'TUCKED' ? '已塞入' : '已外放'}</span>
                              </button>
                            )}
                            {item.garment.primaryCategory === 'OUTERWEAR' && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleGarmentState(item.garment.id);
                                }}
                                className="px-2 py-0.5 rounded-lg text-[10px] font-bold border transition-colors flex items-center gap-0.5 bg-indigo-50 text-indigo-900 border-indigo-200 hover:bg-indigo-100"
                                title="切换敞开 / 扣合形态"
                              >
                                <Shirt className="w-3 h-3 text-indigo-700" />
                                <span>{item.state === 'OPEN' ? '已敞开' : '已扣合'}</span>
                              </button>
                            )}
                          </div>
                        </div>
 </div>

 <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
 <button
 type="button"
 onClick={() => handleAdjustZIndex(item.garment.id, 'UP')}
 className="p-1 hover:bg-stone-200 text-stone-600 rounded-lg transition-colors"
 title="图层上移"
 >
 <ChevronUp className="w-3.5 h-3.5" />
 </button>
 <button
 type="button"
 onClick={() => handleAdjustZIndex(item.garment.id, 'DOWN')}
 className="p-1 hover:bg-stone-200 text-stone-600 rounded-lg transition-colors"
 title="图层下移"
 >
 <ChevronDown className="w-3.5 h-3.5" />
 </button>
 <button
 type="button"
 onClick={() => {
 onRemoveWornItem(item.garment.id);
 if (selectedItemId === item.garment.id) setSelectedItemId(null);
 }}
 className="p-1 hover:bg-rose-100 text-[#D63031] rounded-lg transition-colors ml-0.5"
 title="脱下此单品"
 >
 <Trash2 className="w-3.5 h-3.5" />
 </button>
 </div>
 </div>
 );
 })}
 <div className="text-[9px] text-stone-400 font-mono px-1">▼ 贴身层 (BOTTOM)</div>
 </div>
        )}
      </div>
    )}
    </div>

 {/* 灵感抽签转盘 Modal */}
 {isSlotMachineOpen && (
 <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
 <div className="bg-white rounded-3xl border border-[#EAE6DF] shadow-2xl p-6 w-full max-w-xl space-y-4 text-left relative">
 <div className="flex items-center justify-between border-b border-stone-100 pb-2">
 <h4 className="text-sm font-extrabold text-stone-900">胶囊衣橱灵感推荐</h4>
 <button onClick={() => setIsSlotMachineOpen(false)} className="text-stone-400 hover:text-stone-700">
 <X className="w-4 h-4" />
 </button>
 </div>
 <CapsuleSlotMachine
 garments={[...allGarments, ...publicGarments]}
 onApplyOutfitToStudio={(g, s) => {
 onApplySlotOutfit(g, s);
 setIsSlotMachineOpen(false);
 }}
 onBindToOotd={(g, n) => {
 onBindSlotToOotd(g, n);
 setIsSlotMachineOpen(false);
 }}
 />
 </div>
 </div>
 )}

 {/* 保存搭配 Modal */}
 {isLookbookModalOpen && (
 <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
 <div className="bg-white rounded-3xl border border-[#EAE6DF] shadow-2xl p-6 w-full max-w-md space-y-4 text-left">
 <div className="flex items-center justify-between border-b border-stone-100 pb-2">
 <h4 className="text-sm font-extrabold text-stone-900">保存至 Lookbook 套装库</h4>
 <button onClick={() => setIsLookbookModalOpen(false)} className="text-stone-400 hover:text-stone-700">
 <X className="w-4 h-4" />
 </button>
 </div>

 <form
 onSubmit={(e) => {
 e.preventDefault();
 onSaveLookbook(lookbookTitle.trim() || '我的专属搭配', syncToOotdToday, lookbookSceneTag);
 setIsLookbookModalOpen(false);
 setLookbookTitle('');
 }}
 className="space-y-3"
 >
 <div>
 <label className="text-xs font-bold text-stone-700 block mb-1">搭配标题</label>
 <input
 type="text"
 value={lookbookTitle}
 onChange={(e) => setLookbookTitle(e.target.value)}
 placeholder="如: 早秋法式复古出行搭配"
 className="w-full bg-[#FAF8F5] border border-[#EAE6DF] rounded-xl px-3 py-2 text-xs text-stone-900 focus:outline-none"
 required
 />
 </div>

 <div>
 <label className="text-xs font-bold text-stone-700 block mb-1.5">搭配场景分类</label>
 <div className="grid grid-cols-3 gap-1.5">
 {[
 { key: 'CASUAL', label: '日常休闲' },
 { key: 'COMMUTE', label: '职场通勤' },
 { key: 'DATE', label: '浪漫约会' },
 { key: 'VACATION', label: '度假出行' },
 { key: 'PARTY', label: '派对宴会' },
 ].map((sc) => (
 <button
 key={sc.key}
 type="button"
 onClick={() => setLookbookSceneTag(sc.key)}
 className={`px-2 py-1.5 rounded-xl text-xs font-bold border transition-all ${
 lookbookSceneTag === sc.key
 ? 'bg-[#2D3436] text-white border-stone-800 shadow-2xs'
 : 'bg-[#FAF8F5] border-[#EAE6DF] text-stone-600 hover:bg-stone-100'
 }`}
 >
 {sc.label}
 </button>
 ))}
 </div>
 </div>

 <label className="flex items-center gap-2 text-xs font-bold text-stone-700 cursor-pointer pt-1">
 <input
 type="checkbox"
 checked={syncToOotdToday}
 onChange={(e) => setSyncToOotdToday(e.target.checked)}
 className="rounded border-stone-300 text-[#D63031] focus:ring-[#D63031]"
 />
 <span> 同时自动排入今日穿搭日历 (OOTD)</span>
 </label>

 <div className="flex gap-2 pt-2">
 <button
 type="button"
 onClick={() => setIsLookbookModalOpen(false)}
 className="flex-1 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-bold transition-colors"
 >
 取消
 </button>
 <button
 type="submit"
 className="flex-1 py-2 bg-[#D63031] hover:bg-[#c0392b] text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
 >
 确认保存
 </button>
 </div>
 </form>
 </div>
 </div>
 )}

 {/* VTON 成片结果全屏大图预览 Modal */}
 {isVtonResultModalOpen && renderedImageUrl && (
 <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
 <div className="bg-white rounded-3xl border border-[#EAE6DF] shadow-2xl p-6 w-full max-w-lg space-y-4 text-left relative animate-in fade-in zoom-in-95">
 <div className="flex items-center justify-between border-b border-stone-100 pb-2">
 <div className="flex items-center gap-2">
 <Sparkles className="w-4 h-4 text-[#D63031]" />
 <h4 className="text-sm font-extrabold text-stone-900"> AI 高清试穿成片已生成</h4>
 </div>
 <button onClick={() => setIsVtonResultModalOpen(false)} className="text-stone-400 hover:text-stone-700">
 <X className="w-4 h-4" />
 </button>
 </div>

 <div className="relative aspect-[3/4] max-h-[60vh] mx-auto rounded-2xl overflow-hidden bg-stone-100 border border-stone-200 flex items-center justify-center">
 <img
 src={renderedImageUrl}
 alt="AI VTON 成片"
 className="h-full w-full object-contain"
 />
 </div>

 <div className="flex gap-2 pt-2">
 <button
 type="button"
 onClick={() => {
 setIsVtonResultModalOpen(false);
 setIsLookbookModalOpen(true);
 }}
 className="flex-1 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
 >
 <Heart className="w-3.5 h-3.5 text-[#D63031]" />
 <span>保存至 Lookbook</span>
 </button>
 <button
 type="button"
 onClick={() => setIsVtonResultModalOpen(false)}
 className="flex-1 py-2.5 bg-[#D63031] hover:bg-[#c0392b] text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center justify-center gap-1.5"
 >
 <Check className="w-3.5 h-3.5" />
 <span>完成试穿</span>
 </button>
 </div>
 </div>
 </div>
 )}
      {/* 7. 单品 360° 档案详情抽屉 (支持安全删除私人单品) */}
      <GarmentDetailDrawer
        garment={selectedGarmentForDrawer}
        isOpen={!!selectedGarmentForDrawer}
        isWorn={wornItems.some((i) => i.garment.id === selectedGarmentForDrawer?.id)}
        onClose={() => setSelectedGarmentForDrawer(null)}
        onWearGarment={handleWearWithPlacement}
        onCloneGarment={onClonePublicGarment}
        onDeleteGarment={onDeleteGarment}
      />
 </div>
 );
};
