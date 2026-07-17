import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Siren } from "lucide-react";

export function FloatingSosButton() {
  const navigate = useNavigate();

  return (
    <div className="fixed inset-x-0 bottom-24 z-30 mx-auto flex max-w-[480px] justify-end pr-5 pointer-events-none">
      <div className="relative pointer-events-auto">
        <span className="absolute inset-0 rounded-full bg-primary animate-pulse-ring" />
        <motion.button
          onClick={() => navigate("/sos")}
          whileTap={{ scale: 0.92 }}
          aria-label="Trigger SOS"
          className="relative grid h-16 w-16 place-items-center rounded-full bg-primary text-white shadow-[0_16px_32px_-8px_rgb(176_0_32_/_0.55)]"
        >
          <Siren size={26} strokeWidth={2.25} />
        </motion.button>
      </div>
    </div>
  );
}
