import { useAuth } from '../context/AuthContext';

export default function Navbar({ user, onLogout }) {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-cream/90 backdrop-blur-sm border-b border-sand/60">
      <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="text-lg">🙏</span>
          <h1 className="text-[17px] font-display font-medium text-deepink">Sadhana</h1>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-linen border border-sand flex items-center justify-center">
              <span className="text-[11px] font-medium text-ink">
                {user?.name?.charAt(0).toUpperCase()}
              </span>
            </div>
            <span className="text-xs text-bark">{user?.name}</span>
          </div>
          <button onClick={onLogout} className="btn-ghost text-[11px]">
            Sign out
          </button>
        </div>
      </div>
    </nav>
  );
}