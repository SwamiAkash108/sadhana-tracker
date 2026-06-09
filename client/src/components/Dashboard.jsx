import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import TodayScreen from './TodayScreen';
import ProgressScreen from './ProgressScreen';
import TeamScreen from './TeamScreen';
import AkyScreen from './AkyScreen';
import FriendRequestsBell from './FriendRequestsBell';
import NotificationToggle from './NotificationToggle';
import CommitmentModal from './CommitmentModal';
import NotificationPromptModal from './NotificationPromptModal';
import { checkServerPushConfigured } from '../utils/enablePush';
import {
  isNotificationPromptDismissed,
  isPushSubscribed,
} from '../utils/pushNotifications';

const TABS = [
  { key: 'today', label: 'Today', icon: 'event_note' },
  { key: 'progress', label: 'Progress', icon: 'trending_up' },
  { key: 'community', label: 'Sangha', icon: 'groups' },
];

export default function Dashboard() {
  const { user, logout, acceptCommitment } = useAuth();
  const [tab, setTab] = useState('today');
  const [showAky, setShowAky] = useState(false);
  const [incomingRequestCount, setIncomingRequestCount] = useState(0);
  const [focusPendingRequests, setFocusPendingRequests] = useState(false);
  const [acceptingCommitment, setAcceptingCommitment] = useState(false);
  const [commitmentError, setCommitmentError] = useState('');
  const [showNotificationPrompt, setShowNotificationPrompt] = useState(false);

  const maybeShowNotificationPrompt = useCallback(async () => {
    if (isNotificationPromptDismissed()) return;
    if (await isPushSubscribed()) return;
    if (!await checkServerPushConfigured()) return;
    setShowNotificationPrompt(true);
  }, []);

  const refreshFriendRequests = useCallback(async () => {
    try {
      const [friendData, groupData] = await Promise.all([
        api.getFriendRequests(),
        api.getGroupInvitations(),
      ]);
      const friendCount = friendData.incoming?.length || 0;
      const groupCount = groupData.incoming?.length || 0;
      setIncomingRequestCount(friendCount + groupCount);
    } catch {
      setIncomingRequestCount(0);
    }
  }, []);

  useEffect(() => {
    refreshFriendRequests();
    const id = setInterval(refreshFriendRequests, 60_000);
    const onFocus = () => refreshFriendRequests();
    const onVisible = () => {
      if (document.visibilityState === 'visible') refreshFriendRequests();
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(id);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [refreshFriendRequests]);

  useEffect(() => {
    if (!user?.commitmentAccepted) return;
    maybeShowNotificationPrompt();
  }, [user?.commitmentAccepted, maybeShowNotificationPrompt]);

  const openFriendRequests = () => {
    setShowAky(false);
    setTab('community');
    setFocusPendingRequests(true);
  };

  const handleAcceptCommitment = async () => {
    setCommitmentError('');
    setAcceptingCommitment(true);
    try {
      await acceptCommitment();
      await maybeShowNotificationPrompt();
    } catch (err) {
      setCommitmentError(err.message || 'Could not save your commitment. Please try again.');
    } finally {
      setAcceptingCommitment(false);
    }
  };

  const today = new Date();
  const dateStr = today.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }).toUpperCase();

  return (
    <div className="bg-background text-on-background font-body-md min-h-0 md:min-h-screen flex flex-col pt-[5.875rem] sm:pt-[8.375rem] md:pt-[9.875rem] lg:pt-[11.375rem] pb-24 md:pb-0">
      <header className="bg-background text-primary font-headline-sm flex justify-between items-center gap-2 w-full px-margin-mobile py-2 sm:py-3 fixed top-0 z-50 border-b-4 border-primary">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          <img
            src="/icons/hanuman.png"
            alt="Hanuman"
            className="h-[5.25rem] sm:h-[7.5rem] md:h-36 lg:h-[10.5rem] w-auto object-contain shrink-0"
          />
          <h1 className="font-headline-md font-bold tracking-tighter text-primary leading-none text-[clamp(1.125rem,4.5vw,2rem)] min-w-0">
            SADHANA
          </h1>
        </div>
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          <span className="hidden sm:inline-block font-label-sm text-label-sm font-bold border-2 border-primary px-2 sm:px-3 py-1 bg-surface">{dateStr}</span>
          <FriendRequestsBell count={incomingRequestCount} onClick={openFriendRequests} />
          <NotificationToggle />
          <button
            onClick={logout}
            className="flex items-center justify-center shrink-0 w-10 h-10 sm:w-11 sm:h-11 rounded-full hover:bg-surface-variant transition-colors"
            title="Sign out"
          >
            <span className="material-symbols-outlined text-[24px] leading-none">logout</span>
          </button>
        </div>
      </header>

      <main className="container mx-auto px-margin-mobile md:px-margin-desktop pt-8 pb-4 md:py-8 max-w-lg md:max-w-4xl flex flex-col gap-8">
        {showAky ? (
          <AkyScreen onClose={() => setShowAky(false)} />
        ) : (
          <>
            {tab === 'today' && <TodayScreen user={user} onOpenAky={() => setShowAky(true)} />}
            {tab === 'progress' && <ProgressScreen user={user} />}
            {tab === 'community' && (
              <TeamScreen
                focusPendingRequests={focusPendingRequests}
                onPendingRequestsViewed={() => setFocusPendingRequests(false)}
                onRequestsChange={refreshFriendRequests}
              />
            )}
          </>
        )}
      </main>

      <nav className="md:hidden bg-background text-primary font-label-sm fixed bottom-0 w-full z-50 border-t-4 border-primary flex justify-around items-center h-20">
        {TABS.map(t => {
          const active = tab === t.key && !showAky;
          return (
            <button
              key={t.key}
              onClick={() => { setShowAky(false); setTab(t.key); }}
              className={`flex flex-col items-center justify-center p-2 w-1/3 h-full border-r-2 border-primary last:border-r-0 transition-colors ${
                active ? 'bg-secondary text-on-secondary' : 'hover:bg-surface-container-high'
              }`}
            >
              <span className="material-symbols-outlined mb-1" style={{ fontVariationSettings: `'FILL' ${active ? 1 : 0}` }}>
                {t.icon}
              </span>
              <span className="uppercase font-bold text-[11px]">{t.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="hidden md:flex fixed left-0 top-1/2 -translate-y-1/2 flex-col gap-4 p-2 border-r-4 border-primary bg-surface z-40 shadow-[4px_0px_0px_0px_#000]">
        {TABS.map(t => {
          const active = tab === t.key && !showAky;
          return (
            <button
              key={t.key}
              onClick={() => { setShowAky(false); setTab(t.key); }}
              className={`w-10 h-10 flex items-center justify-center border-2 border-primary transition-all group relative ${
                active
                  ? 'bg-secondary text-on-secondary shadow-[2px_2px_0px_0px_#000]'
                  : 'bg-surface shadow-[2px_2px_0px_0px_#000] hover:translate-y-[1px] hover:translate-x-[1px] hover:shadow-[1px_1px_0px_0px_#000]'
              }`}
              title={t.label}
            >
              <span className="material-symbols-outlined" style={{ fontVariationSettings: `'FILL' ${active ? 1 : 0}` }}>
                {t.icon}
              </span>
              <div className="absolute left-14 bg-primary text-on-primary font-label-sm px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap border-2 border-primary">
                {t.label}
              </div>
            </button>
          );
        })}
      </div>

      {user && !user.commitmentAccepted && (
        <CommitmentModal
          userName={user.name}
          onAccept={handleAcceptCommitment}
          accepting={acceptingCommitment}
        />
      )}
      {showNotificationPrompt && user?.commitmentAccepted && (
        <NotificationPromptModal onDone={() => setShowNotificationPrompt(false)} />
      )}
      {commitmentError && !user?.commitmentAccepted && (
        <div className="fixed bottom-24 md:bottom-6 left-1/2 -translate-x-1/2 z-[111] max-w-sm w-[calc(100%-2rem)] bg-error-container text-on-error-container border-2 border-error px-4 py-3 font-label-sm text-label-sm text-center">
          {commitmentError}
        </div>
      )}
    </div>
  );
}
