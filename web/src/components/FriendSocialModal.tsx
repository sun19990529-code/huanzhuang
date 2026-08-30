import React from 'react';
import { OutfitSuggestionData } from '../api';
import { GarmentItem, UserProfile } from '@smart-wardrobe/shared';
import { Users, X, Share2, Sparkles, Check, Download, Heart } from 'lucide-react';

interface FriendSocialModalProps {
  isOpen: boolean;
  onClose: () => void;
  suggestions: OutfitSuggestionData[];
  onAcceptSuggestion: (suggestionId: string) => void;
  onSelectFriendProfile: () => void;
}

export const FriendSocialModal: React.FC<FriendSocialModalProps> = ({
  isOpen,
  onClose,
  suggestions,
  onAcceptSuggestion,
  onSelectFriendProfile,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
      <div className="bg-slate-900 border border-purple-500/30 w-full max-w-2xl rounded-3xl p-6 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-400" />
            <h2 className="font-bold text-base text-slate-100">好友社交与借穿互动中心</h2>
            <span className="text-[10px] text-indigo-300 bg-indigo-950/60 px-2 py-0.5 rounded-full border border-indigo-800/40">
              PRD 3.6.3
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
        <div className="space-y-6 text-left">
          {/* Section 1: 好友借穿入口 */}
          <div className="p-4 bg-gradient-to-r from-purple-950/40 to-indigo-950/30 rounded-2xl border border-indigo-500/30 flex items-center justify-between">
            <div className="space-y-1">
              <h3 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <Heart className="w-4 h-4 text-pink-400 fill-pink-400" /> 进入好友专属衣柜（“帮TA搭配”模式）
              </h3>
              <p className="text-[11px] text-slate-400">
                可浏览好友开放了权限的私有单品，在其素体上自由试穿编排并一键推给好友。
              </p>
            </div>
            <button
              onClick={() => {
                onSelectFriendProfile();
                onClose();
              }}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/30 transition-all shrink-0"
            >
              进入小美的衣柜
            </button>
          </div>

          {/* Section 2: 收到的好友穿搭推送 */}
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase mb-3">
              收到的好友穿搭建议 ({suggestions.length})
            </h3>

            {suggestions.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs bg-slate-950/40 rounded-2xl border border-slate-800">
                暂无新的好友穿搭推荐，快去帮好友搭配一套吧！
              </div>
            ) : (
              <div className="space-y-2.5">
                {suggestions.map((sug) => (
                  <div
                    key={sug.id}
                    className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-2xl flex items-center justify-between hover:border-purple-500/30 transition-all"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-purple-300">
                          {sug.fromNickname}
                        </span>
                        <span className="text-[10px] text-slate-400">为你量身搭配：</span>
                        <span className="font-semibold text-xs text-slate-100">{sug.title}</span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1">
                        包含 {sug.garmentIds.length} 件心选单品 · {new Date(sug.createdAt).toLocaleDateString()}
                      </p>
                    </div>

                    {sug.isAccepted ? (
                      <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-semibold bg-emerald-950/40 px-2.5 py-1 rounded-xl border border-emerald-800/30">
                        <Check className="w-3.5 h-3.5" /> 已收入 Lookbook
                      </span>
                    ) : (
                      <button
                        onClick={() => onAcceptSuggestion(sug.id)}
                        className="flex items-center gap-1.5 text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white px-3.5 py-1.5 rounded-xl shadow-md shadow-purple-600/30 transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" />
                        采纳并存为套装
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
