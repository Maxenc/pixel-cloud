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
  isAdmin
}) {
  const avatarUrl = buildAvatarUrl(user);

  return (
    <header className="header">
      <div>
        <h1>Pixel War</h1>
        <p>Canvas minimaliste, réinventé.</p>
      </div>
      <div className="auth-block">
        {isAdmin && (
             <button
             className="burger-button"
             onClick={onOpenAdmin}
             style={{ backgroundColor: '#ff4757', color: 'white', marginRight: '8px' }}
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
    </header>
  );
}
