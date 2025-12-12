import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";

export function Credits() {
  const [mode, setMode] = useState("intro"); // 'intro', 'collapsed', 'expanded'

  useEffect(() => {
    const timer = setTimeout(() => {
      setMode("collapsed");
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  const handleToggle = () => {
    if (mode === "collapsed") setMode("expanded");
    else setMode("collapsed");
  };

  const variants = {
    collapsed: {
      borderRadius: 24,
      padding: "8px 20px",
      borderWidth: "1px",
      width: "240px",
      height: "42px",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
    },
    expanded: {
      borderRadius: 24,
      padding: 32,
      width: "600px",
      display: "block",
    },
    intro: {
      borderRadius: 24,
      padding: 32,
      width: "600px",
      display: "block",
    },
  };

  return (
    <motion.div
      className={`credits-container ${mode}`}
      layout
      variants={variants}
      initial="intro"
      animate={mode}
      transition={{ type: "spring", stiffness: 200, damping: 25, mass: 0.8 }}
      onClick={mode === "collapsed" ? handleToggle : undefined}
    >
      <AnimatePresence mode="wait">
        {mode === "collapsed" ? (
          <motion.div
            key="collapsed"
            className="credits-summary"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 1, scale: 0.9, y: 10 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <span
              className="credits-role-micro"
              style={{ fontSize: "10px", lineHeight: 1 }}
            >
              Created by
            </span>
            <span
              className="credits-name-micro"
              style={{ fontSize: "12px", lineHeight: 1 }}
            >
              Maxence Amouroux
            </span>
            <span
              className="credits-info-icon"
              style={{ fontSize: "10px", lineHeight: 1 }}
            >
              ℹ️
            </span>
          </motion.div>
        ) : (
          <motion.div
            key="expanded"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <button
              className="credits-close"
              onClick={(e) => {
                e.stopPropagation();
                setMode("collapsed");
              }}
            >
              ×
            </button>
            <div className="credits-header">
              <span className="credits-role">Architect & Lead Developer</span>
              <h3 style={{ fontSize: "24px" }}>Maxence Amouroux</h3>
              <p style={{ fontSize: "14px" }}>Expert Cloud & Serverless</p>
            </div>

            <p className="credits-description" style={{ fontSize: "14px" }}>
              Pixel Cloud est une réinvention Serverless de la célèbre
              expérience sociale r/place. Construit intégralement sur AWS
              (Lambda, DynamoDB, WebSocket API) pour démontrer la puissance des
              architectures événementielles.
            </p>

            <div className="credits-links">
              <a
                href="https://www.linkedin.com/in/maxence-amouroux/"
                target="_blank"
                rel="noopener noreferrer"
                className="credit-link linkedin"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                </svg>
                LinkedIn
              </a>

              <a
                href="https://medium.com/@maxenc"
                target="_blank"
                rel="noopener noreferrer"
                className="credit-link medium"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M13.54 12a6.8 6.8 0 01-6.77 6.82A6.8 6.8 0 010 12a6.8 6.8 0 016.77-6.82A6.8 6.8 0 0113.54 12zM20.96 12c0 3.54-1.51 6.42-3.38 6.42-1.87 0-3.39-2.88-3.39-6.42s1.52-6.42 3.39-6.42 3.38 2.88 3.38 6.42M24 12c0 3.17-.53 5.75-1.19 5.75-.66 0-1.19-2.58-1.19-5.75s.53-5.75 1.19-5.75C23.47 6.25 24 8.83 24 12z" />
                </svg>
                Medium
              </a>

              <a
                href="https://github.com/Maxenc/pixel-cloud"
                target="_blank"
                rel="noopener noreferrer"
                className="credit-link github"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
                GitHub
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
