import type { ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}

export function Sheet({ open, onClose, title, children }: SheetProps) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-[480px] rounded-t-4xl bg-card shadow-floating safe-bottom"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
          >
            <div className="mx-auto mt-3 h-1.5 w-10 rounded-full bg-[var(--border-strong)] opacity-60" />
            <div className="flex items-center justify-between px-6 pt-4">
              {title && <h3 className="font-display text-lg font-bold text-body">{title}</h3>}
              <button
                onClick={onClose}
                aria-label="Close"
                className="ml-auto grid h-9 w-9 place-items-center rounded-full bg-card-elevated text-muted"
              >
                <X size={18} />
              </button>
            </div>
            <div className="px-6 pb-6 pt-4 max-h-[75vh] overflow-y-auto">{children}</div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
