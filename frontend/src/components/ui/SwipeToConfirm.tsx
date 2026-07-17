import { useRef, useState } from "react";
import { motion, useMotionValue, animate } from "framer-motion";
import { ChevronsRight } from "lucide-react";
import { cn } from "@/lib/cn";

interface SwipeToConfirmProps {
  label: string;
  onConfirm: () => void;
  tone?: "primary" | "success";
}

export function SwipeToConfirm({ label, onConfirm, tone = "primary" }: SwipeToConfirmProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const [completed, setCompleted] = useState(false);
  const HANDLE_SIZE = 56;
  const PADDING = 6;

  const handleDragEnd = () => {
    const track = trackRef.current;
    if (!track || completed) return;
    const maxX = track.offsetWidth - HANDLE_SIZE - PADDING * 2;
    if (x.get() >= maxX * 0.82) {
      setCompleted(true);
      animate(x, maxX, { type: "spring", stiffness: 400, damping: 40 });
      onConfirm();
    } else {
      animate(x, 0, { type: "spring", stiffness: 400, damping: 40 });
    }
  };

  return (
    <div
      ref={trackRef}
      className={cn(
        "relative flex h-16 items-center overflow-hidden rounded-full p-1.5 select-none",
        tone === "primary" ? "bg-tint-primary" : "bg-tint-success",
      )}
    >
      <span
        className={cn(
          "pointer-events-none absolute inset-0 flex items-center justify-center text-sm font-bold",
          tone === "primary" ? "text-primary" : "text-success",
        )}
      >
        {completed ? "Confirmed" : label}
      </span>
      <motion.div
        drag="x"
        dragConstraints={trackRef}
        dragElastic={0}
        dragMomentum={false}
        style={{ x }}
        onDragEnd={handleDragEnd}
        whileTap={{ scale: 1.05 }}
        className={cn(
          "relative z-10 grid h-[56px] w-[56px] shrink-0 place-items-center rounded-full text-white shadow-elevated cursor-grab active:cursor-grabbing",
          tone === "primary" ? "bg-primary" : "bg-success",
        )}
      >
        <ChevronsRight size={22} />
      </motion.div>
    </div>
  );
}
