import { useEffect, useState } from "react";
import { motion } from "motion/react";

export function Cursor() {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [clicked, setClicked] = useState(false);
  const [linkHovered, setLinkHovered] = useState(false);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const addEventListeners = () => {
      document.addEventListener("mousemove", mMove);
      document.addEventListener("mousedown", mDown);
      document.addEventListener("mouseup", mUp);
      document.addEventListener("mouseenter", mEnter);
      document.addEventListener("mouseleave", mLeave);
    };

    const removeEventListeners = () => {
      document.removeEventListener("mousemove", mMove);
      document.removeEventListener("mousedown", mDown);
      document.removeEventListener("mouseup", mUp);
      document.removeEventListener("mouseenter", mEnter);
      document.removeEventListener("mouseleave", mLeave);
    };

    const mMove = (el) => {
      setPosition({ x: el.clientX, y: el.clientY });

      // Check if hovering interactive element
      const target = el.target;
      const isLink =
        target.tagName === "BUTTON" ||
        target.tagName === "A" ||
        target.closest("button") ||
        target.closest("a") ||
        target.classList.contains("pixel-canvas") ||
        target.classList.contains("color-swatch");

      setLinkHovered(isLink);
    };

    const mDown = () => setClicked(true);
    const mUp = () => setClicked(false);
    const mEnter = () => setHidden(false);
    const mLeave = () => setHidden(true);

    addEventListeners();
    return () => removeEventListeners();
  }, []);

  if (
    typeof navigator !== "undefined" &&
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    )
  ) {
    return null;
  }

  return (
    <>
      <style>{`
        body { cursor: none; }
        a, button, input { cursor: none !important; }
      `}</style>
      <motion.div
        className="custom-cursor"
        style={{
          position: "fixed",
          left: 0,
          top: 0,
          zIndex: 9999,
          pointerEvents: "none",
        }}
        animate={{
          x: position.x - (linkHovered ? 20 : 10),
          y: position.y - (linkHovered ? 20 : 10),
          scale: clicked ? 0.8 : linkHovered ? 1.5 : 1,
          opacity: hidden ? 0 : 1,
        }}
        transition={{
          type: "spring",
          stiffness: 800,
          damping: 35,
          mass: 0.5,
        }}
      >
        <div
          style={{
            width: linkHovered ? 40 : 20,
            height: linkHovered ? 40 : 20,
            border: "2px solid #38bdf8",
            borderRadius: "50%",
            backgroundColor: linkHovered
              ? "rgba(56, 189, 248, 0.1)"
              : "transparent",
            transition: "width 0.2s, height 0.2s, background-color 0.2s",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: 4,
            height: 4,
            backgroundColor: "#38bdf8",
            borderRadius: "50%",
          }}
        />
      </motion.div>
    </>
  );
}
