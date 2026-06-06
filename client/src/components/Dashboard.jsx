import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import Navbar from './Navbar';
import SadhanaChecklist from './SadhanaChecklist';
import StreakTracker from './StreakTracker';
import TeamProgress from './TeamProgress';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [tab, setTab] = useState('today');

  const tabs = [
    { key: 'today', label: 'Today' },
    { key: 'streak', label: 'My Progress' },
    { key: 'team', label: 'Team' },
  ];

  return (
    <div className="min-h-screen pb-12">
      <Navbar user={user} onLogout={logout} />

      <main className="max-w-2xl mx-auto px-4 pt-24">
        {/* Tab bar */}
        <div className="flex gap-1 mb-6 p-0.5 bg-linen rounded-lg border border-sand/60">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 py-2 text-xs font-medium rounded-md transition-all duration-200 ${
                tab === t.key
                  ? 'bg-deepink text-cream shadow-warm-sm'
                  : 'text-walnut hover:text-ink hover:bg-khaki/50'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'today' && <SadhanaChecklist />}
        {tab === 'streak' && <StreakTracker />}
        {tab === 'team' && <TeamProgress />}
      </main>
    </div>
  );
}