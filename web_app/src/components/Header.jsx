import { motion } from "motion/react";

const buildAvatarUrl = (user) => {
  if (!user?.avatar || !user?.id) return null;
  return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=64`;
};

export function Header({
  user,
  onLogin,
  onLogout,
  onToggleSnapshots,
  snapshotsOpen,
  onOpenAdmin,
  isAdmin,
}) {
  const avatarUrl = buildAvatarUrl(user);

  return (
    <motion.header
      className="header"
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, type: "spring", stiffness: 100 }}
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "12px 24px",
        background: "rgba(15, 23, 42, 0.8)",
        backdropFilter: "blur(12px)",
        borderRadius: "16px",
        border: "1px solid rgba(148, 163, 184, 0.15)",
        boxShadow: "0 4px 20px rgba(0, 0, 0, 0.2)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, type: "spring" }}
          style={{
            width: "40px",
            height: "40px",
            background: "linear-gradient(135deg, #38bdf8, #818cf8)",
            borderRadius: "10px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "20px",
          }}
        >
          🎨
        </motion.div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <motion.h1
            initial="hidden"
            animate="visible"
            variants={{
              hidden: { opacity: 0 },
              visible: {
                opacity: 1,
                transition: {
                  staggerChildren: 0.1,
                },
              },
            }}
            style={{
              display: "flex",
              overflow: "hidden",
              fontSize: "20px",
              margin: 0,
            }}
          >
            {Array.from("Pixel War").map((char, index) => (
              <motion.span
                key={index}
                variants={{
                  hidden: { y: 20, opacity: 0 },
                  visible: { y: 0, opacity: 1 },
                }}
                style={{
                  display: "block",
                  marginRight: char === " " ? "6px" : 0,
                }}
              >
                {char}
              </motion.span>
            ))}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 1, duration: 0.5 }}
            style={{ fontSize: "12px", color: "#94a3b8", margin: 0 }}
          >
            Canvas minimaliste, réinventé.
          </motion.p>
        </div>
      </div>
      <div className="auth-block">
        {isAdmin && (
          <button
            className="burger-button"
            onClick={onOpenAdmin}
            style={{
              backgroundColor: "#ff4757",
              color: "white",
              marginRight: "8px",
            }}
          >
            ⚙️ Admin
          </button>
        )}
        <button
          className="burger-button"
          onClick={onToggleSnapshots}
          aria-pressed={snapshotsOpen}
          aria-label="Basculer l'historique des snapshots"
          type="button"
        >
          ☰ Snapshots
        </button>
        <button
          className="burger-button"
          onClick={() =>
            window.open("https://github.com/Maxenc/pixel-cloud", "_blank")
          }
          aria-label="Voir le code sur GitHub"
          title="Code source sur GitHub"
          style={{
            padding: "8px 14px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <svg height="20" width="20" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
          </svg>
          <span>GitHub</span>
        </button>
        {user ? (
          <>
            <div className="user-chip">
              {avatarUrl ? (
                <img src={avatarUrl} alt={user.username} />
              ) : (
                <span className="avatar-fallback">
                  {user.username?.[0]?.toUpperCase() ?? "?"}
                </span>
              )}
              <span>Connecté·e : {user.username}</span>
            </div>
            <button className="ghost-button" onClick={onLogout}>
              Déconnexion
            </button>
          </>
        ) : (
          <button className="ghost-button" onClick={onLogin}>
            Connexion Discord
          </button>
        )}
      </div>
    </motion.header>
  );
}
