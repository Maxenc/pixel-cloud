import { motion } from "motion/react";

export function StatusToast({ status }) {
  if (!status?.type) return null;
  return (
    <motion.div
      className={`status status-${status.type}`}
      initial={{ y: 50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 50, opacity: 0 }}
      transition={{ type: "spring", stiffness: 400, damping: 20 }}
    >
      {status.message}
    </motion.div>
  );
}
