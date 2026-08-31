import React, { useState, useEffect } from 'react';
import {
  FriendItem,
  OutfitSuggestionData,
  OutfitData,
  fetchFriends,
  fetchMyFriendCode,
  addFriendByCode,
  removeFriend,
  fetchReceivedSuggestions,
  acceptSuggestion,
  fetchFriendOutfits,
} from '../api';
import { showToast, showConfirm } from '../components/Toast';
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
  Copy,
  Trash2,
  X,
  RefreshCw,
  Eye,
  Layers,
} from 'lucide-react';

interface FriendSocialViewProps {
  onDressFriend?: (friend: FriendItem) => void;
  onApplyOutfit?: (outfit: OutfitData) => void;
  onNavigateToStudio: () => void;
}

export const FriendSocialView: React.FC<FriendSocialViewProps> = ({
  onDressFriend,
  onApplyOutfit,
  onNavigateToStudio,
}) => {
  const [friends, setFriends] = useState<FriendItem[]>([]);
  const [suggestions, setSuggestions] = useState<OutfitSuggestionData[]>([]);
  const [myFriendCode, setMyFriendCode] = useState('SW-0000');
  const [friendSearch, setFriendSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // 添加好友 Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [inputFriendCode, setInputFriendCode] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  // 好友 Lookbook 灵感抽屉 (Defect 16)
  const [selectedFriendForLookbook, setSelectedFriendForLookbook] = useState<FriendItem | null>(null);
  const [friendOutfits, setFriendOutfits] = useState<OutfitData[]>([]);
  const [isFriendOutfitsLoading, setIsFriendOutfitsLoading] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [fList, myCode, sugList] = await Promise.all([
        fetchFriends(),
        fetchMyFriendCode(),
        fetchReceivedSuggestions(),
      ]);
      setFriends(fList);
      setMyFriendCode(myCode);
      setSuggestions(sugList);
    } catch (e) {
      console.warn('加载好友与搭配建议失败:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCopyMyCode = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(myFriendCode);
      showToast(`我的专属邀请码「${myFriendCode}」已复制至剪贴板！`, 'success');
    }
  };

  const handleAddFriend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputFriendCode.trim()) return;
    setIsAdding(true);
    try {
      await addFriendByCode(inputFriendCode.trim());
      showToast('成功添加好友！已互相授权衣橱单品！', 'success');
      setInputFriendCode('');
      setIsAddModalOpen(false);
      await loadData();
    } catch (err: any) {
      showToast(err.message || '添加好友失败', 'error');
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemoveFriend = async (friendUserId: string, friendName: string) => {
    const ok = await showConfirm('解除好友关系', `确定要与好友「${friendName}」解除衣橱授权关系吗？`);
    if (!ok) return;
    try {
      await removeFriend(friendUserId);
      setFriends((prev) => prev.filter((f) => f.friendUserId !== friendUserId));
      showToast('已解除好友关系', 'info');
    } catch (err: any) {
      showToast(err.message || '操作失败', 'error');
    }
  };

  const handleAcceptSuggestion = async (suggestionId: string) => {
    try {
      const outfit = await acceptSuggestion(suggestionId);
      setSuggestions((prev) => prev.map((s) => s.id === suggestionId ? { ...s, isAccepted: true } : s));
      showToast(`搭配「${outfit.title}」已成功收录至 Lookbook！`, 'success');
    } catch (err: any) {
      showToast(err.message || '采纳失败', 'error');
    }
  };

  // 打开好友 Lookbook 抽屉 (Defect 16)
  const handleOpenFriendLookbook = async (friend: FriendItem) => {
    setSelectedFriendForLookbook(friend);
    setIsFriendOutfitsLoading(true);
    try {
      const outfits = await fetchFriendOutfits(friend.friendUserId);
      setFriendOutfits(outfits);
    } catch (err) {
      console.warn('获取好友搭配失败:', err);
      setFriendOutfits([]);
    } finally {
      setIsFriendOutfitsLoading(false);
    }
  };

  const filteredFriends = friends.filter((f) =>
    f.name.toLowerCase().includes(friendSearch.toLowerCase()) ||
    (f.username && f.username.toLowerCase().includes(friendSearch.toLowerCase())) ||
    (f.friendCode && f.friendCode.toLowerCase().includes(friendSearch.toLowerCase()))
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6 text-left animate-in fade-in pb-20 md:pb-6">
      {/* 顶部标题与专属邀请码卡片 */}
      <div className="bg-gradient-to-r from-rose-50/70 via-white to-amber-50/70 rounded-3xl border border-[#EAE6DF] p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white text-[#D63031] text-xs font-extrabold border border-rose-200/60 shadow-2xs">
            <Users className="w-3.5 h-3.5 stroke-[2]" />
            <span>私密衣橱社交网络 · 灵感互借</span>
          </div>
          <h2 className="text-xl font-black text-stone-800 tracking-tight">
            好友衣橱协同与穿搭互荐
          </h2>
          <p className="text-xs text-stone-500 max-w-xl">
            输入好友专属邀请码建立安全连接，即可互相浏览公开衣橱单品、带入对方身材为TA定制出装，或一键采纳好友搭配。
          </p>
        </div>

        {/* 专属邀请码胶囊 */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0 w-full md:w-auto">
          <div className="flex items-center justify-between gap-3 bg-white px-4 py-2.5 rounded-2xl border border-[#EAE6DF] shadow-2xs">
            <div className="text-left">
              <div className="text-[10px] text-stone-500 font-bold uppercase tracking-wider">我的邀请码</div>
              <div className="text-base font-black font-mono tracking-widest text-[#D63031]">{myFriendCode}</div>
            </div>
            <button
              onClick={handleCopyMyCode}
              className="p-2 hover:bg-rose-50 text-[#D63031] rounded-xl transition-colors shrink-0"
              title="复制邀请码"
            >
              <Copy className="w-4 h-4 stroke-[2]" />
            </button>
          </div>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center justify-center gap-2 px-5 py-3 bg-[#D63031] hover:bg-[#c0392b] text-white rounded-2xl text-xs font-extrabold shadow-sm transition-all"
          >
            <UserPlus className="w-4 h-4 stroke-[2]" />
            <span>添加好友</span>
          </button>
        </div>
      </div>

      {/* 2 列主网格：左侧好友列表，右侧收到的穿搭建议 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* 左侧 7 列：我的好友列表 */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-stone-700" />
              <h3 className="text-sm font-extrabold text-stone-800">
                已授权的好友 ({friends.length})
              </h3>
            </div>

            {/* 搜索框 */}
            <div className="relative w-48">
              <Search className="w-3.5 h-3.5 text-stone-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="搜索好友昵称/邀请码..."
                value={friendSearch}
                onChange={(e) => setFriendSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-white text-xs text-stone-800 rounded-xl border border-[#EAE6DF] focus:outline-none focus:border-[#D63031] transition-colors"
              />
            </div>
          </div>

          {filteredFriends.length === 0 ? (
            <div className="bg-white rounded-3xl border border-[#EAE6DF] p-8 text-center space-y-3 shadow-2xs">
              <div className="w-12 h-12 rounded-2xl bg-stone-100 text-stone-400 flex items-center justify-center mx-auto">
                <Users className="w-6 h-6 stroke-[1.5]" />
              </div>
              <div className="space-y-1">
                <h4 className="text-xs font-extrabold text-stone-700">暂无好友</h4>
                <p className="text-[11px] text-stone-500 max-w-xs mx-auto">
                  点击右上角【添加好友】，输入对方的 6 位大写邀请码（如 SW-XXXX）即可开启衣橱互动。
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {filteredFriends.map((friend) => (
                <div
                  key={friend.id}
                  className="bg-white rounded-3xl border border-[#EAE6DF] p-4 space-y-3.5 shadow-2xs hover:shadow-md transition-all relative group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      {friend.avatarUrl ? (
                        <img
                          src={friend.avatarUrl}
                          alt={friend.name}
                          className="w-10 h-10 rounded-2xl object-cover border border-[#EAE6DF] shadow-2xs shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#D63031] to-[#E17055] text-white font-extrabold text-sm flex items-center justify-center shadow-2xs shrink-0">
                          {friend.name[0]}
                        </div>
                      )}
                      <div className="min-w-0">
                        <h4 className="text-xs font-extrabold text-stone-900 truncate flex items-center gap-1.5">
                          <span>{friend.name}</span>
                          <span className="text-[9px] font-mono text-stone-500 font-normal">({friend.friendCode})</span>
                        </h4>
                        <p className="text-[10px] text-stone-500 truncate mt-0.5">{friend.roleTag}</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveFriend(friend.friendUserId, friend.name)}
                      className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-rose-50 text-stone-400 hover:text-rose-600 rounded-xl transition-all"
                      title="解除好友关系"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-stone-500 bg-[#FAF8F5] px-3 py-1.5 rounded-xl border border-[#EAE6DF]/60">
                    <span>开放单品数</span>
                    <span className="font-extrabold font-mono text-stone-800">{friend.garmentCount} 件</span>
                  </div>

                  {/* 项 11: 好友公开单品 3 格横向轮播排版 */}
                  <div className="flex items-center justify-between py-0.5 px-1">
                    <span className="text-[10px] font-bold text-stone-400">公开衣橱缩略:</span>
                    <div className="flex items-center gap-1.5">
                      {[1, 2, 3].map((idx) => (
                        <div
                          key={idx}
                          className="w-7 h-7 rounded-xl bg-[#FAF8F5] border border-[#EAE6DF] flex items-center justify-center text-stone-400 shadow-2xs"
                          title="好友公开衣物缩略"
                        >
                          <Shirt className="w-3.5 h-3.5 stroke-[1.5]" />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenFriendLookbook(friend)}
                      className="flex-1 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5 stroke-[2] text-stone-600" />
                      <span>Lookbook</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onDressFriend && onDressFriend(friend)}
                      className="flex-1 py-2 bg-[#D63031] hover:bg-[#c0392b] text-white rounded-xl text-xs font-extrabold shadow-xs flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Sparkles className="w-3.5 h-3.5 stroke-[2]" />
                      <span>为TA搭配</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 右侧 5 列：收到的好友搭配建议 */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Inbox className="w-4 h-4 text-[#D63031]" />
              <h3 className="text-sm font-extrabold text-stone-800">
                收到的穿搭推送 ({suggestions.filter((s) => !s.isAccepted).length} 未采纳)
              </h3>
            </div>
            <button
              onClick={loadData}
              className="p-1 text-stone-400 hover:text-stone-700 rounded-lg transition-colors"
              title="刷新"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          {suggestions.length === 0 ? (
            <div className="bg-white rounded-3xl border border-[#EAE6DF] p-8 text-center space-y-3 shadow-2xs">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 text-[#D63031] flex items-center justify-center mx-auto">
                <Gift className="w-6 h-6 stroke-[1.5]" />
              </div>
              <div className="space-y-1">
                <h4 className="text-xs font-extrabold text-stone-700">暂无穿搭推送</h4>
                <p className="text-[11px] text-stone-500 max-w-xs mx-auto">
                  邀请好友在试衣间选择您的身材，为您量身定制搭配并推送至此！
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {suggestions.map((sug) => (
                <div
                  key={sug.id}
                  className={`bg-white rounded-3xl border p-4 space-y-3 shadow-2xs transition-all ${
                    sug.isAccepted ? 'border-[#EAE6DF] opacity-75' : 'border-rose-200/80 bg-rose-50/20'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-extrabold text-stone-900 truncate">
                          {sug.title}
                        </span>
                        {sug.isAccepted ? (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold shrink-0">
                            已采纳
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-[#D63031] text-white text-[10px] font-extrabold shrink-0">
                            新灵感
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-stone-500">来自好友 · {sug.fromNickname}</p>
                    </div>

                    {!sug.isAccepted && (
                      <button
                        type="button"
                        onClick={() => handleAcceptSuggestion(sug.id)}
                        className="px-3.5 py-1.5 bg-[#D63031] hover:bg-[#c0392b] text-white rounded-xl text-xs font-extrabold shadow-xs shrink-0 flex items-center gap-1 transition-colors"
                      >
                        <Check className="w-3.5 h-3.5 stroke-[2]" />
                        <span>采纳</span>
                      </button>
                    )}
                  </div>

                  {sug.previewImageUrl && (
                    <div className="w-full h-36 rounded-2xl overflow-hidden border border-[#EAE6DF] bg-stone-100">
                      <img
                        src={sug.previewImageUrl}
                        alt={sug.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}

                  <div className="text-[10px] text-stone-500 bg-[#FAF8F5] px-3 py-1.5 rounded-xl border border-[#EAE6DF]/60 flex items-center justify-between">
                    <span>包含单品: {sug.garmentIds?.length || 0} 件</span>
                    <span className="font-mono">{sug.createdAt?.split('T')[0]}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 好友 Lookbook 灵感抽屉 (Defect 16) */}
      {selectedFriendForLookbook && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-end animate-in fade-in">
          <div className="bg-white w-full max-w-md h-full shadow-2xl p-6 flex flex-col justify-between space-y-4 animate-in slide-in-from-right duration-300">
            {/* 抽屉标头 */}
            <div className="flex items-center justify-between border-b border-[#EAE6DF] pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-rose-50 text-[#D63031] flex items-center justify-center font-bold text-xs">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-stone-900">
                    {selectedFriendForLookbook.name} 的 Lookbook 搭配集
                  </h3>
                  <p className="text-[10px] text-stone-500">点击【试穿同款搭配】带入您的试衣间</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedFriendForLookbook(null)}
                className="p-1.5 hover:bg-stone-100 rounded-xl text-stone-400 hover:text-stone-700 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 搭配列表 */}
            <div className="flex-1 overflow-y-auto space-y-3.5 pr-1">
              {isFriendOutfitsLoading ? (
                <div className="py-12 text-center text-xs text-stone-400">正在加载好友搭配库...</div>
              ) : friendOutfits.length === 0 ? (
                <div className="py-12 text-center space-y-2 text-stone-400">
                  <Shirt className="w-8 h-8 mx-auto stroke-[1.5] text-stone-300" />
                  <p className="text-xs">好友暂未保存 Lookbook 搭配</p>
                </div>
              ) : (
                friendOutfits.map((outfit) => (
                  <div
                    key={outfit.id}
                    className="bg-stone-50 rounded-2xl border border-[#EAE6DF] p-3 space-y-2.5 hover:border-stone-400 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-extrabold text-stone-900 truncate">{outfit.title}</h4>
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-stone-200/70 text-stone-700 font-bold">
                        {outfit.sceneTag || '日常休闲'}
                      </span>
                    </div>

                    {outfit.previewImageUrl && (
                      <div className="w-full h-40 rounded-xl overflow-hidden bg-stone-200">
                        <img
                          src={outfit.previewImageUrl}
                          alt={outfit.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[10px] text-stone-500 font-mono">
                        {outfit.items?.length || 0} 件单品
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          if (onApplyOutfit) {
                            onApplyOutfit(outfit);
                            setSelectedFriendForLookbook(null);
                            onNavigateToStudio();
                            showToast(`已为您加载好友同款搭配「${outfit.title}」至试衣间！`, 'success');
                          }
                        }}
                        className="px-3 py-1.5 bg-[#D63031] hover:bg-[#c0392b] text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1 transition-colors"
                      >
                        <Sparkles className="w-3.5 h-3.5 stroke-[2]" />
                        <span>试穿同款搭配</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <button
              type="button"
              onClick={() => setSelectedFriendForLookbook(null)}
              className="w-full py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-bold transition-colors"
            >
              关闭
            </button>
          </div>
        </div>
      )}

      {/* 添加好友 Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl border border-[#EAE6DF] shadow-2xl p-6 max-w-sm w-full space-y-4 text-left animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-[#EAE6DF] pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-rose-50 text-[#D63031] flex items-center justify-center font-bold text-xs">
                  <UserPlus className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-extrabold text-stone-900">添加衣橱好友</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 hover:bg-stone-100 rounded-xl text-stone-400 hover:text-stone-700 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddFriend} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-stone-700">好友邀请码</label>
                <input
                  type="text"
                  placeholder="例如: SW-8F4F"
                  value={inputFriendCode}
                  onChange={(e) => setInputFriendCode(e.target.value.toUpperCase())}
                  className="w-full px-3.5 py-2 bg-stone-50 border border-[#EAE6DF] rounded-xl text-xs font-mono font-bold tracking-wider text-stone-900 focus:outline-none focus:border-[#D63031] uppercase transition-colors"
                  autoFocus
                  required
                />
                <p className="text-[10px] text-stone-500">
                  请输入好友在上方展示的 6 位大写邀请码。
                </p>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-bold transition-colors"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={isAdding || !inputFriendCode.trim()}
                  className="flex-1 py-2 bg-[#D63031] hover:bg-[#c0392b] text-white rounded-xl text-xs font-bold shadow-xs disabled:opacity-50 transition-colors"
                >
                  {isAdding ? '添加中...' : '确认添加'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
