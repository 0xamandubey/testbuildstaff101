import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export default function Modal({ isOpen, onClose, title, children }: ModalProps) {
  // Lock background body scroll when modal is active
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-0 sm:p-4">
          {/* Backdrop Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.6 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80"
          />

          {/* Modal Panel Container */}
          <motion.div
            initial={{ y: '100%', opacity: 1 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 1 }}
            transition={{ type: 'spring', damping: 25, stiffness: 250 }}
            className="relative w-full max-w-md bg-brand-darkGray rounded-t-2xl sm:rounded-2xl border border-zinc-800 overflow-hidden shadow-2xl z-10 flex flex-col max-h-[85vh] sm:max-h-[90vh] text-brand-lightGray"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-4 bg-brand-black text-white border-b border-zinc-800">
              <h2 className="text-sm font-bold uppercase tracking-wider select-none truncate">
                {title}
              </h2>
              <button
                onClick={onClose}
                className="p-1 -mr-1 hover:text-brand-yellow active:scale-95 transition-transform flex items-center justify-center rounded-lg text-zinc-400"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Area */}
            <div className="p-5 overflow-y-auto no-scrollbar flex-1 bg-brand-darkGray">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
