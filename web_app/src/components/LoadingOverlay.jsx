import { motion } from "motion/react";
import { useEffect, useState } from "react";

export function LoadingOverlay({ loading }) {
  const [show, setShow] = useState(true);

  useEffect(() => {
    if (!loading) {
      // Small delay to ensure smooth exit
      const timer = setTimeout(() => setShow(false), 800);
      return () => clearTimeout(timer);
    }
  }, [loading]);

  if (!show) return null;

  return (
    <motion.div
      className="loading-overlay"
      initial={{ opacity: 1 }}
      animate={{ opacity: loading ? 1 : 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      style={{
        position: "fixed",
        inset: 0,
        background: "#050912",
        zIndex: 9000,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div style={{ display: "flex", gap: "8px", marginBottom: "24px" }}>
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            style={{
              width: "24px",
              height: "24px",
              background: i === 0 ? "#38bdf8" : i === 1 ? "#818cf8" : "#c084fc",
              borderRadius: "4px",
            }}
            animate={{
              y: [-10, 0, -10],
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: 0.8,
              repeat: Infinity,
              delay: i * 0.1,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>
      <motion.h2
        style={{
          color: "#f8fafc",
          fontFamily: "Inter, sans-serif",
          fontSize: "24px",
          fontWeight: 600,
        }}
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      >
        Chargement du monde...
      </motion.h2>
    </motion.div>
  );
}
