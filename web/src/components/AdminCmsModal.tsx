import React, { useState } from 'react';
import { GarmentItem } from '@smart-wardrobe/shared';
import { ShieldCheck, Plus, X, Tag, ExternalLink, Check, Trash2, Eye, EyeOff } from 'lucide-react';

interface ExtendedGarmentItem extends GarmentItem {
  externalBuyUrl?: string;
  isArchived?: boolean;
}

interface AdminCmsModalProps {
  isOpen: boolean;
  onClose: () => void;
  publicGarments: ExtendedGarmentItem[];
  onAddNewPublicGarment: (title: string, category: string, price: number, externalBuyUrl?: string) => void;
  onToggleGarmentStatus?: (id: string) => void;
  onUpdateGarmentInfo?: (id: string, updates: Partial<ExtendedGarmentItem>) => void;
}

export const AdminCmsModal: React.FC<AdminCmsModalProps> = ({
  isOpen,
  onClose,
  publicGarments,
  onAddNewPublicGarment,
  onToggleGarmentStatus,
  onUpdateGarmentInfo,
}) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('TOPS');
  const [price, setPrice] = useState(299);
  const [externalBuyUrl, setExternalBuyUrl] = useState('https://item.taobao.com/item.htm?id=example');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;
    onAddNewPublicGarment(title, category, price, externalBuyUrl);
    setTitle('');
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
      <div className="bg-slate-900 border border-purple-500/30 w-full max-w-5xl max-h-[88vh] rounded-3xl p-6 shadow-2xl flex flex-col space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-purple-400" />
            <h2 className="font-bold text-base text-slate-100">官方公共衣柜 CMS 运营与电商工作台</h2>
            <span className="text-[10px] text-purple-400 bg-purple-950/60 px-2 py-0.5 rounded-full border border-purple-800/40">
              PRD 3.5 官方管理后台
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-100 rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto space-y-6 pr-2">
          {/* Quick Ingestion Form */}
          <form onSubmit={handleSubmit} className="bg-slate-950/80 p-4 rounded-2xl border border-purple-500/20 space-y-3">
            <h3 className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
              <Plus className="w-4 h-4" /> 批量发布官方公共资产 (触发 Vision LLM 标准化)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="衣物标题 (如: 极简纯色短袖)"
                className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
                required
              />
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
              >
                <option value="TOPS">上装 (TOPS)</option>
                <option value="BOTTOMS">下装 (BOTTOMS)</option>
                <option value="OUTERWEAR">外套 (OUTERWEAR)</option>
                <option value="FOOTWEAR">鞋履 (FOOTWEAR)</option>
                <option value="ACCESSORIES">配饰 (ACCESSORIES)</option>
              </select>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(Number(e.target.value))}
                placeholder="吊牌价 (元)"
                className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
              />
              <input
                type="text"
                value={externalBuyUrl}
                onChange={(e) => setExternalBuyUrl(e.target.value)}
                placeholder="外部电商购买外链 (预留字段)"
                className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
              />
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs px-5 py-2 rounded-xl transition-all shadow-md shadow-purple-600/30"
              >
                发布并上架至公共衣柜
              </button>
            </div>
          </form>

          {/* Public Garments Table */}
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase mb-3">
              官方公共单品管理清单 ({publicGarments.length})
            </h3>
            <div className="border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="p-3">单品</th>
                    <th className="p-3">主分类</th>
                    <th className="p-3">品牌/价格</th>
                    <th className="p-3">电商外链</th>
                    <th className="p-3">形态切片</th>
                    <th className="p-3 text-right">上架状态与操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 bg-slate-900/40">
                  {publicGarments.map((g) => {
                    const isArchived = g.isArchived;
                    return (
                      <tr key={g.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="p-3 font-semibold text-slate-100 flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full border border-slate-700"
                            style={{ backgroundColor: g.colors[0] || '#7c3aed' }}
                          />
                          {g.title}
                        </td>
                        <td className="p-3">
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800/40">
                            {g.primaryCategory}
                          </span>
                        </td>
                        <td className="p-3 font-mono">
                          {g.brand || '官方正品'} · ¥{g.priceCents ? (g.priceCents / 100).toFixed(0) : '299'}
                        </td>
                        <td className="p-3">
                          {g.externalBuyUrl ? (
                            <a
                              href={g.externalBuyUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[10px] text-indigo-400 hover:underline flex items-center gap-1"
                            >
                              <ExternalLink className="w-3 h-3" /> 点击跳转
                            </a>
                          ) : (
                            <span className="text-[10px] text-slate-500">未配置</span>
                          )}
                        </td>
                        <td className="p-3">
                          <span className="text-[10px] text-yellow-300 font-mono">
                            {g.assets.map((a) => a.stateType).join(' / ')}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => onToggleGarmentStatus && onToggleGarmentStatus(g.id)}
                            className={`flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-lg transition-all ml-auto ${
                              isArchived
                                ? 'bg-amber-950/60 text-amber-300 border border-amber-800/40 hover:bg-amber-900/60'
                                : 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/40 hover:bg-emerald-900/60'
                            }`}
                          >
                            {isArchived ? (
                              <>
                                <EyeOff className="w-3 h-3" /> 已下架 (点击重新上架)
                              </>
                            ) : (
                              <>
                                <Eye className="w-3 h-3" /> 正常在售 (点击下架)
                              </>
                            )}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
