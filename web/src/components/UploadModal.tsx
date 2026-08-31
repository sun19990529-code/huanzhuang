import React, { useState } from 'react';
import { GarmentCategory, analyzeGarmentAttributes } from '@smart-wardrobe/shared';
import { Sparkles, X, Layers, Tag } from 'lucide-react';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmUpload: (title: string, category: GarmentCategory, colors: string[]) => void;
}

export const UploadModal: React.FC<UploadModalProps> = ({
  isOpen,
  onClose,
  onConfirmUpload,
}) => {
  const [title, setTitle] = useState('早秋复古双排扣西装大衣');
  const [category, setCategory] = useState<GarmentCategory>('OUTERWEAR');
  const [analysisResult, setAnalysisResult] = useState(analyzeGarmentAttributes('早秋复古双排扣西装大衣'));
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  if (!isOpen) return null;

  const handleSimulateVision = (newTitle: string, newCat?: GarmentCategory) => {
    setIsAnalyzing(true);
    setTimeout(() => {
      const res = analyzeGarmentAttributes(newTitle, newCat || category);
      setAnalysisResult(res);
      setCategory(res.primaryCategory);
      setIsAnalyzing(false);
    }, 300);
  };

  const handleTitleChange = (val: string) => {
    setTitle(val);
    handleSimulateVision(val);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirmUpload(title, category, analysisResult.colors);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-white border border-[#EAE6DF] w-full max-w-xl rounded-3xl p-6 shadow-2xl space-y-4 text-left">
        <div className="flex items-center justify-between pb-3 border-b border-[#EAE6DF]">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-rose-50 text-[#D63031] rounded-xl border border-rose-100">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-extrabold text-sm text-stone-900">AI 视觉多模态单品录入与打标</h2>
              <p className="text-[10px] text-stone-400">自动提取品类特征、色彩指纹与多态切片</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-stone-400 hover:text-stone-700 rounded-xl hover:bg-stone-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-stone-700 block mb-1.5">
              单品名称 / 风格描述
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              className="w-full bg-[#FAF8F5] border border-[#EAE6DF] rounded-xl px-3.5 py-2.5 text-xs text-stone-900 focus:outline-none focus:border-[#D63031] transition-colors"
              placeholder="例如：复古条纹短袖T恤、法式西装大衣..."
            />
          </div>

          {/* Vision LLM 自动提取的结构化特征面板 */}
          <div className="p-4 bg-[#FAF8F5] rounded-2xl border border-[#EAE6DF] space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-[#D63031]">
              <span className="flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-[#D63031]" /> Vision LLM 识别特征
              </span>
              {isAnalyzing ? (
                <span className="text-amber-600 text-[10px] animate-pulse">分析中...</span>
              ) : (
                <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 text-[10px] font-mono">
                  ✓ 识别完成 (消耗 1 积分)
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-stone-400 text-[10px] block">主类目:</span>
                <p className="font-bold text-stone-800">{analysisResult.primaryCategory}</p>
              </div>
              <div>
                <span className="text-stone-400 text-[10px] block">细分类目:</span>
                <p className="font-bold text-stone-800">{analysisResult.subCategory}</p>
              </div>
              <div>
                <span className="text-stone-400 text-[10px] block">色彩提取:</span>
                <div className="flex items-center gap-1.5 mt-1">
                  {analysisResult.colors.map((c, i) => (
                    <div
                      key={i}
                      className="w-4 h-4 rounded-full border border-stone-300 ring-1 ring-black/5 shadow-2xs"
                      style={{ backgroundColor: c }}
                      title={analysisResult.colorNames[i]}
                    />
                  ))}
                  <span className="text-[10px] text-stone-500 ml-1">
                    {analysisResult.colorNames.join(', ')}
                  </span>
                </div>
              </div>
              <div>
                <span className="text-stone-400 text-[10px] block">材质与版型:</span>
                <p className="font-bold text-stone-800 truncate">
                  {analysisResult.material} · {analysisResult.silhouette}
                </p>
              </div>
            </div>

            {/* 多态切片裂变提示 */}
            <div className="mt-2 pt-2 border-t border-[#EAE6DF] text-[11px] text-stone-600 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-[#D63031] shrink-0" />
              <span>
                {category === 'OUTERWEAR'
                  ? '⚡ 外套类目：自动裂变生成【敞开 (Open)】与【合拢 (Closed)】双态切片。'
                  : '⚡ 标准类目：自动裂变生成【标准 (Default)】与【塞衣角 (Tucked)】双态切片。'}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#EAE6DF]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-bold transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-[#D63031] hover:bg-[#c0392b] text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
            >
              确认并收入衣橱 (-1 积分)
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
