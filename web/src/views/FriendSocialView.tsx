import React, { useState } from 'react';
import { OutfitSuggestionData } from '../api';
import { GarmentItem } from '@smart-wardrobe/shared';
import {
  Users,
  Send,
  Sparkles,
  Check,
  Heart,
  Shirt,
  ShieldCheck,
  ArrowRight,
  Gift,
  Inbox,
  UserCheck,
  Search,
  UserPlus,
} from 'lucide-react';

interface FriendSocialViewProps {
  suggestions: OutfitSuggestionData[];
  onAcceptSuggestion: (suggestionId: string) => void;
  onNavigateToStudio: () => void;
}

export const FriendSocialView: React.FC<FriendSocialViewProps> = ({
  suggestions,
  onAcceptSuggestion,
  onNavigateToStudio,
}) => {
  const [friendSearch, setFriendSearch] = useState('');

  const friends = [
    {
      id: 'f1',
      name: '小美',
      roleTag: '法式复古 · 显高穿搭',
      garmentCount: 18,
      privacy: 'FRIENDS_ONLY',
    },
    {
      id: 'f2',
      name: '欣欣',
      roleTag: '甜酷美式 · Y2K辣妹',
      garmentCount: 24,
      privacy: 'FRIENDS_ONLY',
    },
    {
      id: 'f3',
      name: '林峰',
      roleTag: '极简山系 · Cleanfit',
      garmentCount: 12,
      privacy: 'PUBLIC',
    },
  ];

  const filteredFriends = friends.filter((f) =>
    f.name.toLowerCase().includes(friendSearch.toLowerCase()) ||
    f.roleTag.toLowerCase().includes(friendSearch.toLowerCase())
  );

  return (
    <div className="h-full flex flex-col md:flex-row bg-[#FAF8F5] text-stone-800 select-none overflow-hidden font-sans">
      
      {/* ------------------------------------------------------------- */}
      {/* 左侧 38%：好友与授权衣橱列表 */}
      {/* ------------------------------------------------------------- */}
      <div className="w-full md:w-[38%] h-full flex flex-col border-r border-[#EAE6DF] bg-white/95 backdrop-blur-xl shrink-0 z-20 p-5 space-y-4 overflow-y-auto scrollbar-thin text-left shadow-xs">
        
        {/* 顶部标题 */}
        <div className="flex items-center justify-between pb-2 border-b border-[#EAE6DF]">
          <div>
            <h3 className="text-sm font-extrabold text-stone-800">好友衣橱 ({friends.length})</h3>
            <p className="text-[10px] text-stone-400">双向授权私有单品互借与穿搭</p>
          </div>
          <button
            onClick={() => alert('✨ 请输入好友的专属衣橱邀请码')}
            className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-bold transition-colors flex items-center gap-1"
          >
            <UserPlus className="w-3.5 h-3.5 stroke-[1.75]" />
            <span>添加好友</span>
          </button>
        </div>

        {/* 搜索好友 */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={friendSearch}
            onChange={(e) => setFriendSearch(e.target.value)}
            placeholder="搜索好友姓名或穿搭风格..."
            className="w-full bg-[#FAF8F5] border border-[#EAE6DF] rounded-xl pl-8 pr-3 py-1.5 text-xs text-stone-800 focus:outline-none focus:border-[#D63031]"
          />
        </div>

        {/* 好友卡片流 */}
        <div className="space-y-2.5 flex-1">
          {filteredFriends.map((f) => (
            <div
              key={f.id}
              className="bg-[#FAF8F5] rounded-2xl border border-[#EAE6DF] p-3.5 shadow-2xs hover:border-stone-400 transition-all flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white text-[#D63031] border border-rose-100 flex items-center justify-center font-bold text-sm shadow-xs">
                  {f.name[0]}
                </div>
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <h4 className="text-xs font-extrabold text-stone-800">{f.name}</h4>
                    <span className="text-[9px] text-emerald-600 bg-emerald-50 px-1.5 py-0.2 rounded font-bold border border-emerald-200/60">
                      已授权
                    </span>
                  </div>
                  <p className="text-[10px] text-stone-400">{f.roleTag}</p>
                  <p className="text-[10px] font-mono text-stone-500">开放单品: {f.garmentCount} 件</p>
                </div>
              </div>

              <button
                onClick={onNavigateToStudio}
                className="px-3 py-1.5 bg-[#2D3436] hover:bg-black text-white rounded-xl text-xs font-bold flex items-center gap-1 transition-colors shadow-2xs shrink-0"
              >
                <span>为TA搭配</span>
                <ArrowRight className="w-3 h-3 stroke-[2]" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 右侧 62%：收到的好友穿搭建议流 (满高沉浸式) */}
      {/* ------------------------------------------------------------- */}
      <div className="w-full md:w-[62%] h-full relative overflow-y-auto bg-gradient-to-b from-[#F5F2EB] via-[#F2EFE8] to-[#EAE6DF] p-6 space-y-4 text-left scrollbar-thin">
        
        {/* 顶部指示条 */}
        <div className="flex items-center justify-between bg-white/90 backdrop-blur-md border border-[#EAE6DF] px-5 py-3 rounded-2xl shadow-xs">
          <div>
            <h3 className="text-xs font-extrabold text-stone-800 uppercase tracking-wide">
              好友推送的搭配方案 ({suggestions.length})
            </h3>
            <p className="text-[10px] text-stone-400">点击【一键采纳】自动将好友的穿搭建议收录进我的 Lookbook</p>
          </div>
        </div>

        {/* 建议卡片网格 */}
        {suggestions.length === 0 ? (
          <div className="text-center py-24 bg-white/90 backdrop-blur-md rounded-3xl border border-[#EAE6DF] space-y-3 shadow-xs">
            <div className="w-12 h-12 rounded-2xl bg-[#FAF8F5] text-stone-400 border border-[#EAE6DF] flex items-center justify-center mx-auto">
              <Inbox className="w-6 h-6 stroke-[1.5]" />
            </div>
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-stone-700">暂无未处理的穿搭建议</h4>
              <p className="text-[11px] text-stone-400">邀请好友在试衣间为您设计穿搭并一键推送</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {suggestions.map((sug) => (
              <div
                key={sug.id}
                className="bg-white/95 rounded-2xl border border-[#EAE6DF] p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-rose-50 text-[#D63031] border border-rose-100 flex items-center justify-center font-bold text-xs">
                        {(sug.fromNickname || '友')[0]}
                      </div>
                      <span className="text-xs font-bold text-stone-800">{sug.fromNickname || '好友'}</span>
                    </div>
                    <span className="text-[10px] text-stone-400 font-mono">
                      {new Date(sug.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  <h4 className="text-sm font-extrabold text-stone-800">{sug.title}</h4>

                  {sug.previewImageUrl ? (
                    <div className="w-full aspect-[4/3] bg-[#FAF8F5] rounded-xl overflow-hidden flex items-center justify-center border border-[#EAE6DF]">
                      <img src={sug.previewImageUrl} alt={sug.title} className="max-h-full max-w-full object-contain" />
                    </div>
                  ) : (
                    <div className="text-xs text-stone-400 bg-[#FAF8F5] p-4 rounded-xl border border-[#EAE6DF]/60 text-center">
                      包含 {sug.garmentIds.length} 件单品搭配
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-[#EAE6DF]">
                  <button
                    onClick={() => onAcceptSuggestion(sug.id)}
                    className="flex-1 py-2 bg-[#D63031] hover:bg-[#c0392b] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-colors"
                  >
                    <Check className="w-3.5 h-3.5 stroke-[2]" />
                    <span>一键采纳</span>
                  </button>
                  <button
                    onClick={onNavigateToStudio}
                    className="px-3.5 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-bold transition-colors"
                  >
                    试衣间查看
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
