import React, { useState } from 'react';
import { UserProfile, calculateGoldenRatioBody } from '@smart-wardrobe/shared';
import { User, Plus, X, Sparkles, Shield, Check, Trash2, Edit3 } from 'lucide-react';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profiles: UserProfile[];
  currentProfile: UserProfile | null;
  onSelectProfile: (p: UserProfile) => void;
  onCreateProfile: (payload: {
    name: string;
    gender: 'MALE' | 'FEMALE';
    heightCm: number;
    weightKg: number;
    bustCm: number;
    waistCm: number;
    hipsCm: number;
    privacyLevel: 'PRIVATE' | 'FRIENDS_ONLY' | 'PUBLIC';
    useGoldenRatio: boolean;
  }) => void;
  onUpdateProfile: (id: string, updates: Partial<UserProfile>) => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  profiles,
  currentProfile,
  onSelectProfile,
  onCreateProfile,
  onUpdateProfile,
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [name, setName] = useState('');
  const [gender, setGender] = useState<'MALE' | 'FEMALE'>('FEMALE');
  const [heightCm, setHeightCm] = useState(168);
  const [weightKg, setWeightKg] = useState(50);
  const [bustCm, setBustCm] = useState(84);
  const [waistCm, setWaistCm] = useState(62);
  const [hipsCm, setHipsCm] = useState(89);
  const [privacyLevel, setPrivacyLevel] = useState<'PRIVATE' | 'FRIENDS_ONLY' | 'PUBLIC'>('PRIVATE');

  if (!isOpen) return null;

  // 一键计算并填入男女黄金比例身材
  const handleApplyGoldenRatio = () => {
    const golden = calculateGoldenRatioBody(gender, heightCm);
    setWeightKg(golden.weightKg);
    setBustCm(golden.bustCm);
    setWaistCm(golden.waistCm);
    setHipsCm(golden.hipsCm);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    onCreateProfile({
      name,
      gender,
      heightCm,
      weightKg,
      bustCm,
      waistCm,
      hipsCm,
      privacyLevel,
      useGoldenRatio: false,
    });
    setIsCreating(false);
    setName('');
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
      <div className="bg-slate-900 border border-purple-500/30 w-full max-w-2xl rounded-3xl p-6 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-purple-400" />
            <h2 className="font-bold text-base text-slate-100">多角色档案与身材定制中心</h2>
            <span className="text-[10px] text-purple-300 bg-purple-950/60 px-2 py-0.5 rounded-full border border-purple-800/40">
              PRD 3.1 & 3.2.1
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
        <div className="space-y-4 text-left">
          {/* Profile List Grid */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <h3 className="text-xs font-bold text-slate-400 uppercase">已建角色档案 ({profiles.length})</h3>
              <button
                onClick={() => setIsCreating(!isCreating)}
                className="flex items-center gap-1 text-[11px] font-semibold text-purple-300 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 px-2.5 py-1 rounded-lg transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                {isCreating ? '取消新建' : '新建角色 (伴侣/孩子)'}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {profiles.map((p) => {
                const isSelected = currentProfile?.id === p.id;
                return (
                  <div
                    key={p.id}
                    className={`p-3 rounded-2xl border transition-all ${
                      isSelected
                        ? 'bg-purple-950/40 border-purple-500/60 shadow-md shadow-purple-500/10'
                        : 'bg-slate-950/60 border-slate-800 hover:border-purple-500/30'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-200">{p.name}</span>
                        {p.isDefault && (
                          <span className="text-[9px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded">默认</span>
                        )}
                      </div>
                      <span className="text-[10px] text-purple-400 bg-purple-950 px-1.5 py-0.5 rounded border border-purple-800/40">
                        {p.gender === 'FEMALE' ? '女性' : '男性'} · {p.privacyLevel}
                      </span>
                    </div>

                    <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between">
                      <span>{p.heightCm}cm / {p.weightKg}kg</span>
                      <span>三围: {p.bustCm}/{p.waistCm}/{p.hipsCm}cm</span>
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-slate-800/60 flex items-center justify-between">
                      <button
                        onClick={() => {
                          onSelectProfile(p);
                          onClose();
                        }}
                        className={`text-[10px] font-bold px-3 py-1 rounded-lg transition-all ${
                          isSelected
                            ? 'bg-purple-600 text-white shadow-xs'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                        }`}
                      >
                        {isSelected ? '当前操作中' : '切换至该角色'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Create Profile Form */}
          {isCreating && (
            <form onSubmit={handleCreateSubmit} className="p-4 bg-slate-950/90 rounded-2xl border border-purple-500/30 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-purple-300">录入新角色体型与隐私参数</h4>
                <button
                  type="button"
                  onClick={handleApplyGoldenRatio}
                  className="flex items-center gap-1 text-[11px] font-semibold text-yellow-300 bg-yellow-950/50 border border-yellow-500/30 px-2 py-0.5 rounded-lg hover:bg-yellow-900/40 transition-colors"
                >
                  <Sparkles className="w-3 h-3 text-yellow-400" />
                  一键应用男女黄金比例身材
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-xs">
                <div>
                  <label className="text-slate-400 text-[10px] block mb-1">昵称 / 角色备注</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="如: 伴侣、宝贝女儿"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-purple-500"
                    required
                  />
                </div>
                <div>
                  <label className="text-slate-400 text-[10px] block mb-1">性别</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value as any)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-purple-500"
                  >
                    <option value="FEMALE">女性</option>
                    <option value="MALE">男性</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-400 text-[10px] block mb-1">隐私级别</label>
                  <select
                    value={privacyLevel}
                    onChange={(e) => setPrivacyLevel(e.target.value as any)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-purple-500"
                  >
                    <option value="PRIVATE">私密 (仅主账号可见)</option>
                    <option value="FRIENDS_ONLY">仅好友 (允许好友借穿)</option>
                    <option value="PUBLIC">公开 (全网公开成套搭配)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-5 gap-2 text-xs">
                <div>
                  <label className="text-slate-400 text-[10px] block mb-1">身高 (cm)</label>
                  <input
                    type="number"
                    value={heightCm}
                    onChange={(e) => setHeightCm(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2 py-1 text-xs text-slate-100"
                  />
                </div>
                <div>
                  <label className="text-slate-400 text-[10px] block mb-1">体重 (kg)</label>
                  <input
                    type="number"
                    value={weightKg}
                    onChange={(e) => setWeightKg(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2 py-1 text-xs text-slate-100"
                  />
                </div>
                <div>
                  <label className="text-slate-400 text-[10px] block mb-1">胸围 (cm)</label>
                  <input
                    type="number"
                    value={bustCm}
                    onChange={(e) => setBustCm(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2 py-1 text-xs text-slate-100"
                  />
                </div>
                <div>
                  <label className="text-slate-400 text-[10px] block mb-1">腰围 (cm)</label>
                  <input
                    type="number"
                    value={waistCm}
                    onChange={(e) => setWaistCm(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2 py-1 text-xs text-slate-100"
                  />
                </div>
                <div>
                  <label className="text-slate-400 text-[10px] block mb-1">臀围 (cm)</label>
                  <input
                    type="number"
                    value={hipsCm}
                    onChange={(e) => setHipsCm(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2 py-1 text-xs text-slate-100"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl shadow-md shadow-purple-600/30 transition-all"
                >
                  创建并生成 A-Pose 素体
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
