import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import TodayScreen from './TodayScreen';
import ProgressScreen from './ProgressScreen';
import TeamScreen from './TeamScreen';
import AkyScreen from './AkyScreen';
import NotificationToggle from './NotificationToggle';

const TABS = [
  { key: 'today', label: 'Today', icon: 'event_note' },
  { key: 'progress', label: 'Progress', icon: 'trending_up' },
  { key: 'community', label: 'Team', icon: 'groups' },
];

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [tab, setTab] = useState('today');
  const [showAky, setShowAky] = useState(false);

  const today = new Date();
  const dateStr = today.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }).toUpperCase();

  return (
    <div className="bg-background text-on-background font-body-md min-h-screen flex flex-col pt-20 pb-24 md:pb-0">
      {/* Top bar — Stitch design: logo + date */}
      <header className="bg-background text-primary font-headline-sm flex justify-between items-center w-full px-margin-mobile py-4 fixed top-0 z-50 border-b-4 border-primary">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-3xl">self_improvement</span>
          <h1 className="font-headline-md text-headline-md font-bold tracking-tighter text-primary">SADHANA</h1>
        </div>
        <div className="flex items-center gap-2">
          <NotificationToggle />
          <span className="font-label-sm text-label-sm font-bold border-2 border-primary px-3 py-1 bg-surface">{dateStr}</span>
          <button onClick={logout} className="ml-2 p-2 hover:bg-surface-variant rounded-full transition-colors">
            <span className="material-symbols-outlined">logout</span>
          </button>
        </div>
      </header>

      {/* Main content area */}
      <main className="flex-grow container mx-auto px-margin-mobile md:px-margin-desktop py-8 max-w-lg md:max-w-4xl flex flex-col gap-8">
        {showAky ? (
          <AkyScreen onClose={() => setShowAky(false)} />
        ) : (
          <>
            {tab === 'today' && <TodayScreen user={user} onOpenAky={() => setShowAky(true)} />}
            {tab === 'progress' && <ProgressScreen user={user} />}
            {tab === 'community' && <TeamScreen />}
          </>
        )}
      </main>

      {/* Bottom nav — mobile only */}
      <nav className="md:hidden bg-background text-primary font-label-sm fixed bottom-0 w-full z-50 border-t-4 border-primary flex justify-around items-center h-20">
        {TABS.map(t => {
          const active = tab === t.key && !showAky;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex flex-col items-center justify-center p-2 w-1/3 h-full border-r-2 border-primary last:border-r-0 transition-colors ${
                active ? 'bg-secondary text-on-secondary' : 'hover:bg-surface-container-high'
              }`}
            >
              <span className="material-symbols-outlined mb-1" style={{fontVariationSettings: `'FILL' ${active ? 1 : 0}`}}>
                {t.icon}
              </span>
              <span className="uppercase font-bold text-[11px]">{t.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Desktop icon rail — hidden on mobile */}
      <div className="hidden md:flex fixed left-0 top-1/2 -translate-y-1/2 flex-col gap-4 p-2 border-r-4 border-primary bg-surface z-40 shadow-[4px_0px_0px_0px_#000]">
        {TABS.map(t => {
          const active = tab === t.key && !showAky;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`w-10 h-10 flex items-center justify-center border-2 border-primary transition-all group relative ${
                active
                  ? 'bg-secondary text-on-secondary shadow-[2px_2px_0px_0px_#000]'
                  : 'bg-surface shadow-[2px_2px_0px_0px_#000] hover:translate-y-[1px] hover:translate-x-[1px] hover:shadow-[1px_1px_0px_0px_#000]'
              }`}
              title={t.label}
            >
              <span className="material-symbols-outlined" style={{fontVariationSettings: `'FILL' ${active ? 1 : 0}`}}>
                {t.icon}
              </span>
              <div className="absolute left-14 bg-primary text-on-primary font-label-sm px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap border-2 border-primary">
                {t.label}
              </div>
            </button>
          );
        })}
        <button
          onClick={() => setTab('today')}
          className="w-10 h-10 bg-surface flex items-center justify-center border-2 border-primary shadow-[2px_2px_0px_0px_#000] hover:translate-y-[1px] hover:translate-x-[1px] hover:shadow-[1px_1px_0px_0px_#000] transition-all group relative"
          title="Start Japa"
        >
          <span className="material-symbols-outlined">timer</span>
          <div className="absolute left-14 bg-primary text-on-primary font-label-sm px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap border-2 border-primary">
            Start Japa
          </div>
        </button>
      </div>
    </div>
  );
}