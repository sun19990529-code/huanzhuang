import React, { useState, useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X, HelpCircle } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

// 全局事件监听器与分发器
type ToastListener = (toasts: ToastItem[]) => void;
let toastList: ToastItem[] = [];
let listeners: ToastListener[] = [];

export function showToast(message: string, type: ToastType = 'success', duration = 3000) {
  const id = 'toast-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
  const item: ToastItem = { id, message, type };
  toastList = [...toastList, item];
  listeners.forEach((fn) => fn(toastList));

  setTimeout(() => {
    toastList = toastList.filter((t) => t.id !== id);
    listeners.forEach((fn) => fn(toastList));
  }, duration);
}

// 确认弹窗 Promise 全局状态
interface ConfirmState {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  resolve: (val: boolean) => void;
}

let confirmResolve: ((val: boolean) => void) | null = null;
let confirmListeners: ((state: ConfirmState | null) => void)[] = [];

export function showConfirm(
  title: string,
  message: string,
  confirmText = '确定',
  cancelText = '取消'
): Promise<boolean> {
  return new Promise((resolve) => {
    confirmResolve = resolve;
    const state: ConfirmState = {
      isOpen: true,
      title,
      message,
      confirmText,
      cancelText,
      resolve,
    };
    confirmListeners.forEach((fn) => fn(state));
  });
}

export const ToastContainer: React.FC = () => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);

  useEffect(() => {
    const handleToasts = (items: ToastItem[]) => setToasts(items);
    listeners.push(handleToasts);

    const handleConfirm = (st: ConfirmState | null) => setConfirmState(st);
    confirmListeners.push(handleConfirm);

    return () => {
      listeners = listeners.filter((fn) => fn !== handleToasts);
      confirmListeners = confirmListeners.filter((fn) => fn !== handleConfirm);
    };
  }, []);

  const handleCloseToast = (id: string) => {
    toastList = toastList.filter((t) => t.id !== id);
    setToasts(toastList);
  };

  const handleConfirmAction = (accepted: boolean) => {
    if (confirmResolve) {
      confirmResolve(accepted);
      confirmResolve = null;
    }
    setConfirmState(null);
    confirmListeners.forEach((fn) => fn(null));
  };

  return (
    <>
      {/* 浮动 Toast 提示容器 */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 md:left-auto md:right-5 md:translate-x-0 z-[9999] flex flex-col items-center md:items-end gap-2.5 max-w-sm w-[92%] sm:w-full pointer-events-none px-2 md:px-0">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-center justify-between gap-3 px-4 py-3 rounded-2xl shadow-xl border backdrop-blur-md transition-all duration-300 animate-in slide-in-from-top-2 text-left ${
              t.type === 'success'
                ? 'bg-white/95 border-emerald-200 text-emerald-950 shadow-emerald-500/10'
                : t.type === 'error'
                ? 'bg-white/95 border-rose-200 text-rose-950 shadow-rose-500/10'
                : 'bg-[#2D3436]/95 border-stone-700 text-white shadow-black/20'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              {t.type === 'success' && (
                <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                </div>
              )}
              {t.type === 'error' && (
                <div className="w-6 h-6 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
                  <AlertCircle className="w-4 h-4 text-rose-600" />
                </div>
              )}
              {t.type === 'info' && (
                <div className="w-6 h-6 rounded-full bg-stone-700 flex items-center justify-center shrink-0">
                  <Info className="w-4 h-4 text-stone-200" />
                </div>
              )}
              <span className="text-xs font-bold leading-tight break-words">{t.message}</span>
            </div>
            <button
              onClick={() => handleCloseToast(t.id)}
              className="p-1 hover:bg-stone-200/40 rounded-lg text-stone-400 hover:text-stone-700 transition-colors shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      {/* 优雅确认模态框 */}
      {confirmState && confirmState.isOpen && (
        <div className="fixed inset-0 z-[10000] bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl border border-[#EAE6DF] shadow-2xl p-6 max-w-sm w-full space-y-4 text-left animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 shadow-2xs">
                <HelpCircle className="w-5 h-5 stroke-[2]" />
              </div>
              <div>
                <h4 className="text-sm font-extrabold text-stone-900">{confirmState.title}</h4>
                <p className="text-xs text-stone-500 mt-0.5">{confirmState.message}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => handleConfirmAction(false)}
                className="flex-1 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-bold transition-colors"
              >
                {confirmState.cancelText}
              </button>
              <button
                type="button"
                onClick={() => handleConfirmAction(true)}
                className="flex-1 py-2 bg-[#D63031] hover:bg-[#c0392b] text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
              >
                {confirmState.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
