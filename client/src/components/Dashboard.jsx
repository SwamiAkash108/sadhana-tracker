import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import TodayScreen from './TodayScreen';
import ProgressScreen from './ProgressScreen';
import TeamScreen from './TeamScreen';
import AkyScreen from './AkyScreen';
import NotificationToggle from './NotificationToggle';

const TABS = [
  { key: 'today', label: 'Today', icon: 'calendar_today' },
  { key: 'progress', label: 'Progress', icon: 'insights' },
  { key: 'community', label: 'Community', icon: 'groups' },
];

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [tab, setTab] = useState('today');
  const [showAky, setShowAky] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleNav = (key) => { setTab(key); setShowAky(false); setSidebarOpen(false); };
  const handleStartJapa = () => { setTab('today'); setShowAky(false); setSidebarOpen(false); };
  const topBarTitle = showAky ? 'Atma Kriya' : tab === 'today' ? 'Daily Tracker' : tab === 'progress' ? 'My Progress' : 'Sangha';

  const sidebarContent = (
    <>
      <div className="p-6 border-b-4 border-primary shrink-0">
        <h1 className="font-headline-md text-headline-md font-bold tracking-tighter text-primary uppercase">SADHANA</h1>
        <p className="font-label-sm text-label-sm mt-1 uppercase text-on-surface-variant">Atma Kriya Path</p>
      </div>

      <div className="flex-1 py-6 flex flex-col gap-2 overflow-y-auto">
        {TABS.map(t => {
          const active = tab === t.key && !showAky;
          return (
            <button
              key={t.key}
              onClick={() => handleNav(t.key)}
              className={`flex items-center gap-3 px-4 py-3 mx-4 transition-colors font-label-sm text-label-sm uppercase tracking-wide ${
                active
                  ? 'bg-secondary text-on-secondary font-bold border-b-2 border-primary'
                  : 'text-on-surface hover:bg-surface-variant border border-transparent hover:border-outline'
              }`}
            >
              <span className="material-symbols-outlined" style={{fontVariationSettings:`'FILL' ${active?1:0}`}}>{t.icon}</span>
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      <div className="p-4 border-t-4 border-primary shrink-0 space-y-2">
        <button
          onClick={handleStartJapa}
          className="w-full bg-primary text-on-primary border-2 border-primary py-3 font-label-sm text-label-sm uppercase tracking-wider hover:bg-secondary hover:border-secondary transition-colors woodcut-shadow-sm"
        >
          START JAPA
        </button>
        <NotificationToggle />
      </div>
    </>
  );

  return (
    <div className="min-h-screen flex">
      {/* Mobile backdrop when sidebar is open */}
      <div
        className={`sidebar-backdrop ${sidebarOpen ? 'open' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Sidebar — desktop always shown, mobile slides in */}
      <nav className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        {sidebarContent}
      </nav>

      {/* Topbar */}
      <header className="topbar flex items-center justify-between">
        {/* Hamburger (mobile) */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="md:hidden p-2 -ml-2 hover:text-secondary transition-colors"
        >
          <span className="material-symbols-outlined text-2xl">
            {sidebarOpen ? 'close' : 'menu'}
          </span>
        </button>

        <div className="font-headline-sm text-headline-sm font-bold text-primary uppercase tracking-tight max-md:flex-1 max-md:text-center">
          {topBarTitle}
        </div>

        <div className="flex items-center gap-2">
          <button onClick={logout} className="p-2 hover:bg-surface-variant rounded-full transition-colors">
            <span className="material-symbols-outlined hover:text-secondary">account_circle</span>
          </button>
        </div>
      </header>

      {/* Main canvas */}
      <main className="main-canvas relative">
        <div className="absolute inset-0 halftone-bg opacity-[0.03] pointer-events-none" />
        <div className="max-w-7xl mx-auto relative z-10">
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
      </main>
    </div>
  );
}