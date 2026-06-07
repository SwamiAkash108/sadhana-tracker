import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import TodayScreen from './TodayScreen';
import ProgressScreen from './ProgressScreen';
import TeamScreen from './TeamScreen';
import AkyScreen from './AkyScreen';

const NAV_ITEMS = [
  { key: 'today', label: 'Today', icon: CalendarIcon },
  { key: 'progress', label: 'Progress', icon: ChartIcon },
  { key: 'community', label: 'Community', icon: PeopleIcon },
];

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [tab, setTab] = useState('today');
  const [showAky, setShowAky] = useState(false);

  const sidebar = (
    <aside className="sidebar-desktop hidden lg:flex">
      <div className="px-5 pt-8 pb-6 border-b border-ink-light/30">
        <h1 className="text-[28px] font-display font-black text-paper leading-none tracking-tight">SADHANA</h1>
        <p className="text-[9px] text-mute uppercase tracking-[0.25em] mt-1 font-bold">Atma Kriya Path</p>
      </div>
      <nav className="flex-1 pt-4">
        {NAV_ITEMS.map(item => {
          const active = tab === item.key;
          return (
            <button
              key={item.key}
              onClick={() => setTab(item.key)}
              className={`sidebar-nav-item w-full ${active ? 'active' : ''}`}
            >
              <item.icon />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
      <div className="px-4 pb-6 space-y-3">
        <button className="btn-rust w-full flex items-center justify-center gap-2 text-[11px]">
          <TimerIcon />
          Start Japa
        </button>
        <button className="sidebar-nav-item w-full text-[10px]">
          <GearIcon />
          Settings
        </button>
      </div>
      <div className="px-4 py-4 border-t border-ink-light/30">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-rust flex items-center justify-center">
            <span className="text-[9px] font-black text-paper">
              {(user?.name || 'P')[0].toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-bold text-paper truncate">
              {user?.name || 'Practitioner'}
            </p>
            <p className="text-[8px] text-mute uppercase tracking-wider font-bold">Level 1</p>
          </div>
        </div>
      </div>
    </aside>
  );

  const mobileHeader = (
    <header className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-paper border-b-2 border-ink">
      <div className="px-4 h-12 flex items-center justify-between">
        <h1 className="text-lg font-display font-black text-ink">SADHANA</h1>
        <button onClick={logout} className="text-[10px] font-bold uppercase tracking-wider text-mute hover:text-ink">
          Sign Out
        </button>
      </div>
    </header>
  );

  return (
    <div className="min-h-screen lg:flex">
      {sidebar}
      {mobileHeader}

      <div className="lg:ml-[220px] flex-1 bg-dot-grid min-h-screen lg:pt-0 pt-14 pb-20 lg:pb-0">
        <div className="hidden lg:flex items-center justify-between px-6 py-4 border-b-2 border-ink bg-paper">
          <h2 className="text-sm font-display font-black text-ink tracking-tight">
            {tab === 'today' ? 'DAILY TRACKER' : tab === 'progress' ? 'MY PROGRESS' : 'SANGHA'}
          </h2>
          <div className="flex items-center gap-3">
            <button className="w-8 h-8 flex items-center justify-center">
              <BellIcon />
            </button>
            <button onClick={logout} className="text-[10px] font-bold uppercase tracking-wider text-mute hover:text-ink hover:underline">
              Sign Out
            </button>
          </div>
        </div>

        <div className={showAky ? 'p-6 lg:p-8' : 'p-4 lg:p-6'}>
          {showAky ? (
            <AkyScreen onClose={() => setShowAky(false)} />
          ) : (
            <>
              {tab === 'today' && <TodayScreen user={user} onOpenAky={() => setShowAky(true)} />}
              {tab === 'progress' && <ProgressScreen user={user} />}
              {tab === 'community' && <TeamScreen />}
            </>
          )}
        </div>
      </div>

      {!showAky && (
        <nav className="nav-bottom">
          <div className="flex">
            {NAV_ITEMS.map(item => {
              const active = tab === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => setTab(item.key)}
                  className={`flex-1 flex flex-col items-center py-2.5 gap-0.5 transition-colors ${
                    active ? 'text-ink' : 'text-mute hover:text-ink'
                  }`}
                >
                  <item.icon />
                  <span className="text-[10px] font-bold uppercase tracking-wider">{item.label}</span>
                </button>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}

function CalendarIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square">
      <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4" /><path d="M8 2v4" /><path d="M3 10h18" />
    </svg>
  );
}
function ChartIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square" strokeLinejoin="round">
      <path d="M3 3v18h18" /><path d="M7 16l4-7 3 4 4-3" />
    </svg>
  );
}
function PeopleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" />
    </svg>
  );
}
function BellIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square">
      <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 01-3.46 0" />
    </svg>
  );
}
function TimerIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square">
      <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
    </svg>
  );
}
function GearIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square">
      <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
    </svg>
  );
}