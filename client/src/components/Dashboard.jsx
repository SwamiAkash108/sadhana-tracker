import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import TodayScreen from './TodayScreen';
import ProgressScreen from './ProgressScreen';
import TeamScreen from './TeamScreen';
import AkyScreen from './AkyScreen';

const TABS = [
  { key: 'today', label: 'Today', icon: CalendarIcon },
  { key: 'progress', label: 'Progress', icon: ChartIcon },
  { key: 'team', label: 'Team', icon: PeopleIcon },
];

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [tab, setTab] = useState('today');
  const [showAky, setShowAky] = useState(false);

  return (
    <div className="min-h-screen pb-20">
      <header className="fixed top-0 left-0 right-0 z-50 bg-paper border-b-2 border-ink">
        <div className="max-w-lg mx-auto px-4 h-12 flex items-center justify-between">
          <h1 className="text-lg font-display font-black text-ink">SADHANA</h1>
          <button onClick={logout} className="text-[10px] font-bold uppercase tracking-wider text-mute hover:text-ink hover:underline">
            Sign Out
          </button>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 pt-16 pb-4">
        {showAky ? (
          <AkyScreen onClose={() => setShowAky(false)} />
        ) : (
          <>
            {tab === 'today' && <TodayScreen user={user} onOpenAky={() => setShowAky(true)} />}
            {tab === 'progress' && <ProgressScreen user={user} />}
            {tab === 'team' && <TeamScreen />}
          </>
        )}
      </main>

      {!showAky && (
        <nav className="nav-bottom">
          <div className="max-w-lg mx-auto flex">
            {TABS.map(t => {
              const isActive = tab === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`flex-1 flex flex-col items-center py-2.5 gap-0.5 ${
                    isActive ? 'text-ink' : 'text-mute hover:text-ink'
                  }`}
                >
                  <t.icon fill="currentColor" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">
                    {t.label}
                  </span>
                </button>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}

function CalendarIcon({ fill }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={fill || 'currentColor'} strokeWidth="2" strokeLinecap="square">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4" /><path d="M8 2v4" /><path d="M3 10h18" />
    </svg>
  );
}

function ChartIcon({ fill }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={fill || 'currentColor'} strokeWidth="2" strokeLinecap="square" strokeLinejoin="round">
      <path d="M3 3v18h18" /><path d="M7 16l4-7 3 4 4-3" />
    </svg>
  );
}

function PeopleIcon({ fill }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={fill || 'currentColor'} strokeWidth="2" strokeLinecap="square">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" />
    </svg>
  );
}