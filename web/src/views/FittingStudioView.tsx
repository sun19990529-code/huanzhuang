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
} from 'lucide-react';
import { CapsuleSlotMachine } from '../components/CapsuleSlotMachine';
import { autoDetectUploadGarments, updateGarmentAsset, compressImageFile, matchGarmentPlacement, GarmentPlacementResult } from '../api';
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
  onSaveLookbook: (title: string) => void;
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
  const [isOutfitChangedSinceRender, setIsOutfitChangedSinceRender] = useState(false);

  // 用户个性化微调记忆库 (单品ID -> 用户手动微调参数)
  const [customAdjustments, setCustomAdjustments] = useState<
    Record<string, { offsetX: number; offsetY: number; scale: number; scaleX: number; scaleY: number }>
  >({});
  const [reMatchingGarmentId, setReMatchingGarmentId] = useState<string | null>(null);

  // 弹窗与控制面板
  const [isSlotMachineOpen, setIsSlotMachineOpen] = useState(false);
  const [isLookbookModalOpen, setIsLookbookModalOpen] = useState(false);
  const [isVtonResultModalOpen, setIsVtonResultModalOpen] = useState(false);
  const [lookbookTitle, setLookbookTitle] = useState('');
  const [isLayerPanelOpen, setIsLayerPanelOpen] = useState(false);
  const [transformMode, setTransformMode] = useState<'SNAP' | 'FREE'>('SNAP');
  const [canvasScale, setCanvasScale] = useState(1);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  // AI 像素级解剖定位与微调状态映射 (garmentId -> placement details)
  const [placementInfoMap, setPlacementInfoMap] = useState<
    Record<string, { anchor: string; confidence: number; isAi: boolean }>
  >({});

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
      setStudioDisplayMode('3D');
      setIsOutfitChangedSinceRender(false);
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

  // 监听 Escape 键：随时取消单品选中缩放框
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedItemId(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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
      alert('请至少勾选一件要添加入衣橱的单品');
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

  // 穿上单品并触发 AI 解剖学像素级对准计算 (优先恢复用户自定义微调)
  const handleWearWithPlacement = async (garment: GarmentItem) => {
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

    // 如果用户曾手动微调过此单品，优先恢复用户的自定义微调记忆 (0ms 极速加载)
    const userAdjust = customAdjustments[garment.id];
    if (userAdjust) {
      onUpdateWornItem(garment.id, {
        offsetX: userAdjust.offsetX,
        offsetY: userAdjust.offsetY,
        scale: userAdjust.scale,
        scaleX: userAdjust.scaleX,
        scaleY: userAdjust.scaleY,
      });
      setPlacementInfoMap((prev) => ({
        ...prev,
        [garment.id]: {
          anchor: 'USER_CUSTOM_ADJUSTED',
          confidence: 100,
          isAi: true,
        },
      }));
      return;
    }

    try {
      console.log('📡 [Studio] 正在发起多模态 AI 像素级解剖对准请求: ', garment.title);
      const res = await matchGarmentPlacement({
        avatarId: avatar?.id,
        avatarImageUrl: avatar?.normalizedImageUrl,
        garmentId: garment.id,
        garmentImageUrl: garment.assets?.[0]?.pngUrl,
        garmentTitle: garment.title,
        garmentCategory: garment.primaryCategory,
        garmentSubCategory: garment.subCategory,
        box_2d: (garment as any).box_2d,
        avatarProfile: profile
          ? {
              gender: profile.gender,
              heightCm: profile.heightCm,
              weightKg: profile.weightKg,
              bustCm: profile.bustCm,
              waistCm: profile.waistCm,
              hipsCm: profile.hipsCm,
            }
          : undefined,
        stageWidth: 390,
        stageHeight: 680,
      });

      console.log('✨ [Studio] AI 解剖对准计算完成:', res);

      onUpdateWornItem(garment.id, {
        offsetX: res.offsetX ?? 0,
        offsetY: res.offsetY ?? 0,
        scale: res.scale,
        scaleX: res.scaleX ?? res.scale,
        scaleY: res.scaleY ?? res.scale,
      });

      setPlacementInfoMap((prev) => ({
        ...prev,
        [garment.id]: {
          anchor: res.anatomicalAnchor,
          confidence: res.confidence,
          isAi: true,
        },
      }));
    } catch (err) {
      console.warn('AI placement match error:', err);
    }
  };

  // 重新启动多模态 AI 智能像素级对准 (清除人工微调，向视觉大模型重新计算)
  const handleReMatchAIPlacement = async (garment: GarmentItem) => {
    setCustomAdjustments((prev) => {
      const next = { ...prev };
      delete next[garment.id];
      return next;
    });

    setReMatchingGarmentId(garment.id);
    try {
      console.log('🔄 [Studio] 正在重新启动多模态 AI 像素级解剖对准: ', garment.title);
      const res = await matchGarmentPlacement({
        avatarId: avatar?.id,
        avatarImageUrl: avatar?.normalizedImageUrl,
        garmentId: garment.id,
        garmentImageUrl: garment.assets?.[0]?.pngUrl,
        garmentTitle: garment.title,
        garmentCategory: garment.primaryCategory,
        garmentSubCategory: garment.subCategory,
        box_2d: (garment as any).box_2d,
        avatarProfile: profile
          ? {
              gender: profile.gender,
              heightCm: profile.heightCm,
              weightKg: profile.weightKg,
              bustCm: profile.bustCm,
              waistCm: profile.waistCm,
              hipsCm: profile.hipsCm,
            }
          : undefined,
        stageWidth: 390,
        stageHeight: 680,
      });

      onUpdateWornItem(garment.id, {
        offsetX: res.offsetX ?? 0,
        offsetY: res.offsetY ?? 0,
        scale: res.scale,
        scaleX: res.scaleX ?? res.scale,
        scaleY: res.scaleY ?? res.scale,
      });

      setPlacementInfoMap((prev) => ({
        ...prev,
        [garment.id]: {
          anchor: res.anatomicalAnchor,
          confidence: res.confidence,
          isAi: true,
        },
      }));
    } catch (err) {
      console.warn('Re-match AI placement error:', err);
    } finally {
      setReMatchingGarmentId(null);
    }
  };

  // 重置单品为默认解剖吸附尺寸
  const handleResetPlacement = (garment: GarmentItem) => {
    setCustomAdjustments((prev) => {
      const next = { ...prev };
      delete next[garment.id];
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
        setCustomAdjustments((prev) => ({
          ...prev,
          [garmentId]: {
            offsetX: newOffX,
            offsetY: newOffY,
            scale: prev[garmentId]?.scale ?? startScale,
            scaleX: prev[garmentId]?.scaleX ?? startScaleX,
            scaleY: prev[garmentId]?.scaleY ?? startScaleY,
          },
        }));
      } else if (type === 'RESIZE_BR') {
        const diagDelta = (deltaX + deltaY) / 2;
        const scaleDelta = diagDelta * 0.0035;
        const newScale = Math.max(0.12, Math.min(2.5, Number((startScale + scaleDelta).toFixed(3))));
        onUpdateWornItem(garmentId, {
          scale: newScale,
          scaleX: newScale,
          scaleY: newScale,
        });
        setCustomAdjustments((prev) => ({
          ...prev,
          [garmentId]: {
            offsetX: prev[garmentId]?.offsetX ?? startOffsetX,
            offsetY: prev[garmentId]?.offsetY ?? startOffsetY,
            scale: newScale,
            scaleX: newScale,
            scaleY: newScale,
          },
        }));
      } else if (type === 'STRETCH_R' || type === 'STRETCH_L') {
        const factor = type === 'STRETCH_R' ? 1 : -1;
        const scaleXDelta = deltaX * 0.0035 * factor;
        const newScaleX = Math.max(0.12, Math.min(2.5, Number((startScaleX + scaleXDelta).toFixed(3))));
        onUpdateWornItem(garmentId, {
          scaleX: newScaleX,
        });
        setCustomAdjustments((prev) => ({
          ...prev,
          [garmentId]: {
            offsetX: prev[garmentId]?.offsetX ?? startOffsetX,
            offsetY: prev[garmentId]?.offsetY ?? startOffsetY,
            scale: prev[garmentId]?.scale ?? startScale,
            scaleX: newScaleX,
            scaleY: prev[garmentId]?.scaleY ?? startScaleY,
          },
        }));
      } else if (type === 'STRETCH_B' || type === 'STRETCH_T') {
        const factor = type === 'STRETCH_B' ? 1 : -1;
        const scaleYDelta = deltaY * 0.0035 * factor;
        const newScaleY = Math.max(0.12, Math.min(2.5, Number((startScaleY + scaleYDelta).toFixed(3))));
        onUpdateWornItem(garmentId, {
          scaleY: newScaleY,
        });
        setCustomAdjustments((prev) => ({
          ...prev,
          [garmentId]: {
            offsetX: prev[garmentId]?.offsetX ?? startOffsetX,
            offsetY: prev[garmentId]?.offsetY ?? startOffsetY,
            scale: prev[garmentId]?.scale ?? startScale,
            scaleX: prev[garmentId]?.scaleX ?? startScaleX,
            scaleY: newScaleY,
          },
        }));
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

  const handleCanvasMouseUp = () => {
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
                  <h3 className="text-sm font-extrabold text-stone-900">✨ AI 高清试穿成片已就绪</h3>
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
      <div className="w-full md:w-[45%] h-full flex flex-col border-r border-[#EAE6DF] bg-white/95 backdrop-blur-xl shrink-0 z-20 shadow-xs">
        
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
                <span>上传单品</span>
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
                    className={`w-5 h-5 rounded-full border transition-all flex items-center justify-center shrink-0 relative ${
                      isSelected
                        ? 'ring-2 ring-[#D63031] ring-offset-1 scale-110 border-stone-800'
                        : 'border-stone-300/80 hover:scale-105'
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
        className="w-full md:w-[55%] h-full flex flex-col justify-between relative bg-[#FAF8F5] overflow-hidden select-none"
      >
        {/* 画布中央模特舞台 (3:4 黄金画幅) */}
        <div className="absolute inset-0 flex items-center justify-center p-4 pointer-events-none">
          <div
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setSelectedItemId(null);
              }
            }}
            className="relative h-[85vh] max-h-[860px] aspect-[3/4] rounded-3xl border border-stone-200/80 bg-white/95 shadow-2xl shadow-stone-300/40 flex items-center justify-center overflow-hidden pointer-events-auto transition-all"
          >
            {/* 模特景深光晕底座 */}
            <div className="absolute inset-x-8 bottom-0 h-16 bg-stone-300/30 blur-xl rounded-full pointer-events-none" />

            {/* 选项 B：3D 影棚大片原位呈现模式 */}
            {studioDisplayMode === '3D' && renderedImageUrl ? (
              <div className="relative w-full h-full rounded-3xl overflow-hidden border border-white/20 shadow-2xl bg-stone-950 flex items-center justify-center pointer-events-auto animate-in fade-in zoom-in-95 duration-200">
                <img
                  src={renderedImageUrl}
                  alt="AI 8K 影棚试穿大片"
                  className="w-full h-full object-cover select-none"
                />
                
                {/* 3D 大片悬浮控制胶囊 */}
                <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-white text-[11px] font-bold flex items-center gap-1.5 shadow-lg">
                  <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-spin" />
                  <span>8K 商业大片已呈现</span>
                </div>

                <div className="absolute bottom-4 inset-x-4 flex items-center justify-between gap-2 p-2 bg-black/60 backdrop-blur-md rounded-2xl border border-white/10">
                  <button
                    type="button"
                    onClick={() => setStudioDisplayMode('2D')}
                    className="px-3.5 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-xl text-xs font-bold transition-colors"
                  >
                    返回 2D 微调
                  </button>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsLookbookModalOpen(true)}
                      className="px-3.5 py-1.5 bg-white text-stone-900 hover:bg-stone-100 rounded-xl text-xs font-bold shadow-xs flex items-center gap-1 transition-colors"
                    >
                      <Heart className="w-3.5 h-3.5 text-[#D63031]" />
                      <span>收录 Lookbook</span>
                    </button>
                    <a
                      href={renderedImageUrl}
                      download="SmartWardrobe_VTON_8K.jpg"
                      target="_blank"
                      rel="noreferrer"
                      className="px-3.5 py-1.5 bg-[#D63031] hover:bg-[#c0392b] text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1 transition-colors"
                    >
                      <span>高清下载</span>
                    </a>
                  </div>
                </div>
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
                    className="h-full w-full object-contain pointer-events-auto cursor-default select-none"
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
                  const placement = placementInfoMap[worn.garment.id];
                  const rawConf = placement?.confidence ?? 98;
                  const confidence = Math.round(rawConf > 1 ? rawConf : rawConf * 100);
                  const activeAsset = worn.garment.assets?.find((a) => a.stateType === worn.state) || worn.garment.assets?.[0];
                  const isUserCustom = !!customAdjustments[worn.garment.id];
                  const invScX = 1 / Math.max(0.01, scX);
                  const invScY = 1 / Math.max(0.01, scY);
                  const invScMin = 1 / Math.max(0.01, Math.min(scX, scY));

                  return (
                    <div
                      key={worn.garment.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedItemId(worn.garment.id);
                      }}
                      style={{
                        zIndex: isSelected ? 80 : worn.zIndex,
                        transform: `translate(${offX}px, ${offY}px) scale(${scX}, ${scY})`,
                      }}
                      className="absolute inset-0 flex items-center justify-center pointer-events-auto cursor-pointer"
                    >
                      <div className="relative inline-flex items-center justify-center">
                        <img
                          src={activeAsset?.pngUrl || worn.garment.assets?.[0]?.pngUrl}
                          alt={worn.garment.title}
                          className="max-h-[580px] max-w-[340px] object-contain filter drop-shadow-sm pointer-events-auto"
                        />

                        {/* Figma Pro 级交互式微调与缩放选框 (视口解耦，绝对恒定尺寸与清晰度) */}
                        {isSelected && (
                          <div
                            onMouseDown={(e) => handleTransformMouseDown(e, worn.garment.id, 'MOVE')}
                            style={{
                              borderWidth: `${Math.max(1.5, 2 * invScMin)}px`,
                            }}
                            className="absolute -inset-2.5 border-dashed border-[#D63031] rounded-2xl cursor-move pointer-events-auto bg-[#D63031]/5"
                          >
                            {/* 顶部 AI 像素对准状态胶囊 (固定 12px 文字，恒定视口大小) */}
                            <div
                              style={{
                                top: `${-22 * invScY}px`,
                                transform: `translate(-50%, -100%) scale(${invScX}, ${invScY})`,
                                transformOrigin: 'center bottom',
                              }}
                              className="absolute left-1/2 bg-[#D63031] text-white px-3 py-1 rounded-full text-xs font-bold shadow-md flex items-center gap-1.5 whitespace-nowrap pointer-events-none z-30"
                            >
                              <Sparkles className={`w-3.5 h-3.5 ${reMatchingGarmentId === worn.garment.id ? 'animate-spin' : ''}`} />
                              <span>
                                {reMatchingGarmentId === worn.garment.id
                                  ? '正在重新多模态 AI 对准...'
                                  : isUserCustom
                                  ? '✨ 用户微调记忆 (已锁定)'
                                  : `📐 AI 像素级对准 (${confidence}%)`}
                              </span>
                            </div>

                            {/* 右上角删除/脱下单品按钮 (固定 28px 圆形尺寸，恒定易点) */}
                            <button
                              type="button"
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
                              className="absolute w-7 h-7 bg-[#D63031] hover:bg-[#b02526] text-white rounded-full flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-transform z-30"
                              title="脱下此单品"
                            >
                              <X className="w-4 h-4 stroke-[3]" />
                            </button>

                            {/* 右下角等比缩放手柄 (固定 28px 圆形尺寸，恒定易握) */}
                            <div
                              onMouseDown={(e) => handleTransformMouseDown(e, worn.garment.id, 'RESIZE_BR')}
                              style={{
                                bottom: `${-14 * invScY}px`,
                                right: `${-14 * invScX}px`,
                                transform: `scale(${invScX}, ${invScY})`,
                                transformOrigin: 'center center',
                              }}
                              className="absolute w-7 h-7 bg-[#D63031] hover:bg-[#b02526] text-white rounded-full flex items-center justify-center shadow-lg cursor-nwse-resize hover:scale-110 active:scale-95 transition-transform z-30"
                              title="拖拽等比缩放"
                            >
                              <Maximize2 className="w-3.5 h-3.5 stroke-[2.5]" />
                            </div>

                            {/* 四边拉伸控制点 (上下左右，固定物理尺寸) */}
                            <div
                              onMouseDown={(e) => handleTransformMouseDown(e, worn.garment.id, 'STRETCH_T')}
                              style={{
                                top: `${-4 * invScY}px`,
                                transform: `translate(-50%, -50%) scale(${invScX}, ${invScY})`,
                              }}
                              className="absolute left-1/2 w-4 h-1.5 bg-[#D63031] rounded-full cursor-ns-resize z-20"
                              title="上下拉伸"
                            />
                            <div
                              onMouseDown={(e) => handleTransformMouseDown(e, worn.garment.id, 'STRETCH_B')}
                              style={{
                                bottom: `${-4 * invScY}px`,
                                transform: `translate(-50%, 50%) scale(${invScX}, ${invScY})`,
                              }}
                              className="absolute left-1/2 w-4 h-1.5 bg-[#D63031] rounded-full cursor-ns-resize z-20"
                              title="上下拉伸"
                            />
                            <div
                              onMouseDown={(e) => handleTransformMouseDown(e, worn.garment.id, 'STRETCH_L')}
                              style={{
                                left: `${-4 * invScX}px`,
                                transform: `translate(-50%, -50%) scale(${invScX}, ${invScY})`,
                              }}
                              className="absolute top-1/2 w-1.5 h-4 bg-[#D63031] rounded-full cursor-ew-resize z-20"
                              title="左右拉伸"
                            />
                            <div
                              onMouseDown={(e) => handleTransformMouseDown(e, worn.garment.id, 'STRETCH_R')}
                              style={{
                                right: `${-4 * invScX}px`,
                                transform: `translate(50%, -50%) scale(${invScX}, ${invScY})`,
                              }}
                              className="absolute top-1/2 w-1.5 h-4 bg-[#D63031] rounded-full cursor-ew-resize z-20"
                              title="左右拉伸"
                            />

                            {/* 底部微调控制胶囊组：复位 + 重新启动 AI 对准 (固定物理尺寸与字号，清晰易点) */}
                            <div
                              style={{
                                bottom: `${-22 * invScY}px`,
                                transform: `translate(-50%, 100%) scale(${invScX}, ${invScY})`,
                                transformOrigin: 'center top',
                              }}
                              className="absolute left-1/2 flex items-center gap-1.5 pointer-events-auto z-30"
                            >
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleResetPlacement(worn.garment);
                                }}
                                className="bg-white hover:bg-stone-50 text-stone-700 hover:text-stone-900 border border-[#EAE6DF] px-3 py-1 rounded-full text-xs font-bold shadow-md flex items-center gap-1 whitespace-nowrap transition-colors"
                                title="恢复至默认解剖吸附尺寸"
                              >
                                <RotateCcw className="w-3 h-3" />
                                <span>磁吸复位</span>
                              </button>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleReMatchAIPlacement(worn.garment);
                                }}
                                disabled={reMatchingGarmentId === worn.garment.id}
                                className="bg-[#D63031] hover:bg-[#b02526] text-white px-3 py-1 rounded-full text-xs font-bold shadow-md flex items-center gap-1 whitespace-nowrap transition-colors disabled:opacity-50"
                                title="清除微调，重新发起多模态 AI 像素级对齐计算"
                              >
                                <Sparkles className="w-3 h-3" />
                                <span>重新 AI 对准</span>
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

        {/* 顶部工具条 (含原位 2D/3D 分段模式切换器) */}
        <div className="p-4 flex items-center justify-between z-30 pointer-events-auto">
          <div className="flex items-center gap-2">
            <button
              onClick={onOpenProfileSettings}
              className="px-3.5 py-1.5 bg-white/90 backdrop-blur-md border border-[#EAE6DF] hover:border-stone-400 text-stone-800 rounded-xl text-xs font-bold shadow-2xs flex items-center gap-1.5 transition-colors"
            >
              <Sliders className="w-3.5 h-3.5 stroke-[1.75]" />
              <span>身材设置</span>
            </button>

            {/* 选项 B：原位 2D 搭配 / 3D 真人大片分段切换器 */}
            <div className="flex items-center bg-stone-200/70 backdrop-blur-md p-0.5 rounded-xl border border-[#EAE6DF]">
              <button
                type="button"
                onClick={() => setStudioDisplayMode('2D')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  studioDisplayMode === '2D'
                    ? 'bg-white text-[#D63031] shadow-2xs font-extrabold'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                👗 2D 拼搭
              </button>
              <button
                type="button"
                onClick={() => {
                  if (renderedImageUrl) {
                    setStudioDisplayMode('3D');
                  } else {
                    alert('请先点击「AI 试穿大片」生成 3D 影棚商业大片！');
                  }
                }}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                  studioDisplayMode === '3D'
                    ? 'bg-white text-[#D63031] shadow-2xs font-extrabold'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <Sparkles className="w-3 h-3 text-[#D63031]" />
                <span>3D 大片</span>
                {renderedImageUrl && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                )}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClearCanvas}
              className="p-2 bg-white/90 backdrop-blur-md border border-[#EAE6DF] hover:bg-stone-50 text-stone-600 rounded-xl text-xs font-bold shadow-2xs transition-colors"
              title="清空画布"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => setIsLookbookModalOpen(true)}
              className="px-3.5 py-1.5 bg-white/90 backdrop-blur-md border border-[#EAE6DF] hover:border-stone-400 text-stone-800 rounded-xl text-xs font-bold shadow-2xs flex items-center gap-1.5 transition-colors"
            >
              <Heart className="w-3.5 h-3.5 text-[#D63031]" />
              <span>保存搭配</span>
            </button>

            <button
              onClick={() => onRenderVton()}
              disabled={isRendering}
              className="px-4 py-1.5 bg-[#D63031] hover:bg-[#c0392b] text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <Sparkles className={`w-3.5 h-3.5 ${isRendering ? 'animate-spin' : ''}`} />
              <span>{isRendering ? 'AI 渲染中...' : 'AI 试穿大片'}</span>
            </button>
          </div>
        </div>

        {/* 底部信息与图层/形态控制栏 */}
        <div className="p-3 bg-white/95 backdrop-blur-md border-t border-[#EAE6DF] flex flex-wrap items-center justify-between gap-2 z-30 pointer-events-auto">
          {(() => {
            const selectedWorn = wornItems.find((i) => i.garment.id === selectedItemId);
            const placement = selectedItemId ? placementInfoMap[selectedItemId] : null;
            const isUserCustom = selectedItemId ? !!customAdjustments[selectedItemId] : false;

            if (selectedWorn) {
              const rawConf = placement?.confidence ?? 98;
              const confidence = Math.round(rawConf <= 1 ? rawConf * 100 : rawConf);

              return (
                <>
                  <div className="flex items-center gap-2">
                    <span className="text-[#D63031] font-bold text-xs">✦ {selectedWorn.garment.title}</span>
                    <span className="bg-rose-50 text-[#D63031] px-2 py-0.5 rounded-lg border border-rose-100 font-mono font-bold text-[10px]">
                      {isUserCustom
                        ? '✨ 用户微调记忆 (已锁定)'
                        : `📐 AI 像素级对准 (${confidence}%)`}
                    </span>
                    <span className="text-stone-400 text-[10px] hidden lg:inline">
                      🖐️ 拖拽定位, 右下角等比缩放, 四边拉伸高矮胖瘦
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {selectedWorn.garment.primaryCategory === 'TOPS' && (
                      <button
                        type="button"
                        onClick={() => handleToggleGarmentState(selectedWorn.garment.id)}
                        className="px-3 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-xl text-[11px] font-bold transition-all flex items-center gap-1 shadow-2xs"
                      >
                        <Shirt className="w-3.5 h-3.5 text-amber-700" />
                        <span>
                          {selectedWorn.state === 'TUCKED'
                            ? '内搭: 已塞入 (点击外放)'
                            : '内搭: 已外放 (点击塞入)'}
                        </span>
                      </button>
                    )}
                    {selectedWorn.garment.primaryCategory === 'OUTERWEAR' && (
                      <button
                        type="button"
                        onClick={() => handleToggleGarmentState(selectedWorn.garment.id)}
                        className="px-3 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 rounded-xl text-[11px] font-bold transition-all flex items-center gap-1 shadow-2xs"
                      >
                        <Shirt className="w-3.5 h-3.5 text-indigo-700" />
                        <span>
                          {selectedWorn.state === 'CLOSED'
                            ? '外套: 已合拢 (点击敞开)'
                            : '外套: 已敞开 (点击扣起)'}
                        </span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setSelectedItemId(null)}
                      className="text-stone-400 hover:text-stone-700 text-xs px-2 py-1"
                    >
                      完成微调
                    </button>
                  </div>
                </>
              );
            }

            return (
              <div className="flex items-center justify-between w-full text-[11px] text-stone-400 font-mono">
                <div className="flex items-center gap-2">
                  <span>已穿戴单品: {wornItems.length} 件 (点击模特身上的衣物可进行微调与缩放)</span>
                  {isOutfitChangedSinceRender && (
                    <span className="text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 font-sans font-bold">
                      ✨ 搭配已变动，可点击「AI 试穿大片」重新生成
                    </span>
                  )}
                </div>
                <span>自由大画布工作台 · 9:16</span>
              </div>
            );
          })()}
        </div>
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
                onSaveLookbook(lookbookTitle.trim() || '我的专属搭配');
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
                <h4 className="text-sm font-extrabold text-stone-900">✨ AI 高清试穿成片已生成</h4>
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
    </div>
  );
};
