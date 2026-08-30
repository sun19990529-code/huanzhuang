import React, { useState } from 'react';
import { GarmentCategory, analyzeGarmentAttributes } from '@smart-wardrobe/shared';
import { Sparkles, Upload, X, Check, Layers, Tag } from 'lucide-react';

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
    }, 400);
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
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
      <div className="bg-slate-900 border border-purple-500/30 w-full max-w-xl rounded-3xl p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-yellow-400" />
            <h2 className="font-bold text-base text-slate-100">AI 视觉多模态单品录入与打标</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-100 rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">
              单品名称 / 描述
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-purple-500"
              placeholder="例如：复古条纹短袖T恤、法式西装大衣..."
            />
          </div>

          {/* Vision LLM 自动提取的结构化特征面板 */}
          <div className="p-4 bg-slate-950/80 rounded-2xl border border-purple-500/20 space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-purple-300">
              <span className="flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5" /> Vision LLM 识别特征
              </span>
              {isAnalyzing ? (
                <span className="text-yellow-400 text-[10px] animate-pulse">分析中...</span>
              ) : (
                <span className="text-emerald-400 text-[10px]">识别完成 (1 积分)</span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-400 text-[10px]">主类目:</span>
                <p className="font-semibold text-slate-200">{analysisResult.primaryCategory}</p>
              </div>
              <div>
                <span className="text-slate-400 text-[10px]">细分类目:</span>
                <p className="font-semibold text-slate-200">{analysisResult.subCategory}</p>
              </div>
              <div>
                <span className="text-slate-400 text-[10px]">色彩提取:</span>
                <div className="flex items-center gap-1 mt-0.5">
                  {analysisResult.colors.map((c, i) => (
                    <div
                      key={i}
                      className="w-4 h-4 rounded-full border border-slate-700 shadow-xs"
                      style={{ backgroundColor: c }}
                      title={analysisResult.colorNames[i]}
                    />
                  ))}
                  <span className="text-[10px] text-slate-400 ml-1">
                    {analysisResult.colorNames.join(', ')}
                  </span>
                </div>
              </div>
              <div>
                <span className="text-slate-400 text-[10px]">材质与版型:</span>
                <p className="font-semibold text-slate-200 truncate">
                  {analysisResult.material} · {analysisResult.silhouette}
                </p>
              </div>
            </div>

            {/* 多态切片裂变提示 */}
            <div className="mt-2 pt-2 border-t border-slate-800 text-[11px] text-purple-300 flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-yellow-400" />
              <span>
                {category === 'OUTERWEAR'
                  ? '⚡ 检测为外套类目：将自动生成【敞开 (Open)】与【合拢 (Closed)】两套切片资产。'
                  : '⚡ 将自动生成【标准 (Default)】与【塞衣角 (Tucked)】两套切片。'}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-purple-600/30"
            >
              确认并收入衣橱 (-1 积分)
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
