import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, ExternalLink, X, Sparkles, TrendingUp } from 'lucide-react';
import { VerseCoinLogo } from './VerseBrand';

export interface ToastNotification {
  id: string;
  type: 'claim_success' | 'balance_updated' | 'info';
  title: string;
  message: string;
  verseAmount?: number;
  txHash?: string;
}

interface NotificationToastProps {
  notifications: ToastNotification[];
  onDismiss: (id: string) => void;
}

export const NotificationToast: React.FC<NotificationToastProps> = ({
  notifications,
  onDismiss,
}) => {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none px-4 sm:px-0">
      <AnimatePresence>
        {notifications.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className="pointer-events-auto relative p-4 rounded-2xl bg-[#080C1A] border border-cyan-500/50 shadow-[0_0_30px_rgba(0,229,255,0.25)] overflow-hidden"
          >
            {/* Top Metallic Rainbow Gradient Stripe */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#00E5FF] via-[#3B82F6] via-[#9333EA] to-[#FF00A0]" />

            <div className="flex items-start gap-3">
              <div className="mt-0.5">
                <VerseCoinLogo size={28} glow={true} />
              </div>

              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-white tracking-wide flex items-center gap-1.5">
                    <CheckCircle2 size={14} className="text-emerald-400" />
                    {toast.title}
                  </span>
                  <button
                    onClick={() => onDismiss(toast.id)}
                    className="text-slate-400 hover:text-white p-0.5 cursor-pointer"
                  >
                    <X size={14} />
                  </button>
                </div>

                <p className="text-xs text-slate-300 leading-snug">{toast.message}</p>

                {toast.verseAmount && (
                  <div className="flex items-center gap-1.5 text-xs font-extrabold text-[#00E5FF] pt-1">
                    <TrendingUp size={13} />
                    <span>+{toast.verseAmount.toLocaleString()} VERSE Balance Credited</span>
                  </div>
                )}

                {toast.txHash && (
                  <a
                    href={`https://polygonscan.com/tx/${toast.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-cyan-400 hover:underline pt-1 font-mono font-medium"
                  >
                    <span>View on PolygonScan</span>
                    <ExternalLink size={11} />
                  </a>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
