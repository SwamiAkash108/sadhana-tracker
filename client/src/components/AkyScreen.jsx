import { useState, useEffect, useCallback } from 'react';
import { api } from '../api';
import {
  getCounter, setCounter, getDoneSessions, markDoneSession,
  getMaxDoneSessions, getCounterMax, getCounterDisplay, getCounterMaxDisplay,
  itemShouldBeComplete, isAkyCategory,
} from '../utils/sadhanaStorage';
import {
  getAkyCounts, getAkySessionLevel, getAkySessionMeta, getAkyGreenChecklist, AKY_COLORS,
} from '../utils/akyCompletion';

const SECTIONS = [
  { key: 'kriya', title: 'I. Core Kriya' },
  { key: 'pranayama', title: 'II. Pranayama' },
  { key: 'mudras', title: 'III. Mudras & Asanas' },
  { key: 'meditation', title: 'IV. Meditation' },
  { key: 'advanced', title: 'V. Advanced' },
];

export default function AkyScreen({ onClose }) {
  const [items, setItems] = useState([]);
  const [date, setDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tick, setTick] = useState(0);

  const fetchToday = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getToday();
      setItems(data.checklist.filter(i => isAkyCategory(i.category)));
      setDate(data.date);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchToday(); }, [fetchToday]);

  const bump = () => setTick(t => t + 1);

  const syncItemCompletion = async (item, doneSessions) => {
    const shouldComplete = itemShouldBeComplete(item, doneSessions);
    const practicedToday = doneSessions > 0;
    const wantComplete = shouldComplete || practicedToday;

    if (wantComplete && !item.completed) {
      try {
        await api.toggleItem(item.id);
        return true;
      } catch {
        return item.completed;
      }
    }
    return item.completed;
  };

  const updateItem = (itemId, updater) => {
    setItems(prev => prev.map(i => i.id === itemId ? updater(i) : i));
    bump();
  };

  const handleCounterChange = (item, delta) => {
    setCounter(date, item.id, getCounter(date, item.id) + delta, item);
    bump();
  };

  const handleDoneSession = async (item) => {
    const max = getMaxDoneSessions(item);
    const current = getDoneSessions(date, item.id);
    if (current >= max) return;

    const next = markDoneSession(date, item.id, max);
    const completed = await syncItemCompletion(item, next);
    updateItem(item.id, i => ({ ...i, completed }));
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-surface border-4 border-primary woodcut-shadow p-8 text-center">
        <p className="font-body-md text-body-md text-secondary mb-4">{error}</p>
        <button onClick={fetchToday} className="btn-woodcut px-6 py-3">Retry</button>
      </div>
    );
  }

  void tick;
  const counts = getAkyCounts(items, date);
  const sessionLevel = getAkySessionLevel(items, date);
  const meta = getAkySessionMeta(sessionLevel);
  const checklist = getAkyGreenChecklist(counts);
  const practicedCount = items.filter(i => getDoneSessions(date, i.id) > 0).length;

  return (
    <div className="flex flex-col gap-8 md:gap-12 py-4 md:py-12">
      <header className={`flex flex-col sm:flex-row sm:items-center sm:justify-between border-b-4 pb-8 mb-4 gap-4 transition-colors duration-500 ${meta.border}`}>
        <div className="flex items-center gap-4">
          <button
            onClick={onClose}
            className="flex items-center justify-center w-12 h-12 border border-primary bg-surface hover:bg-secondary hover:text-on-secondary transition-colors group"
          >
            <span className="material-symbols-outlined group-hover:-translate-x-1 transition-transform">arrow_back</span>
          </button>
          <div>
            <h1 className="font-headline-lg text-headline-lg text-primary uppercase tracking-tighter">Atma Kriya</h1>
            <p className="font-label-sm text-label-sm text-on-surface-variant tracking-widest uppercase mt-2">Daily Practice Routine</p>
          </div>
        </div>
        <div className="sm:text-right">
          <span className={`font-label-sm text-label-sm uppercase tracking-widest px-3 py-1 inline-block ${meta.badge}`}>
            {meta.label}
          </span>
          <p className="font-label-sm text-label-sm text-on-surface-variant mt-2 max-w-xs sm:ml-auto">{meta.description}</p>
        </div>
      </header>

      <div className={`border-4 bg-surface-bright flex overflow-hidden woodcut-shadow transition-colors duration-500 ${meta.border}`}>
        <div
          className="w-16 md:w-24 border-r-4 shrink-0 transition-colors duration-500"
          style={{
            borderColor: meta.accent,
            background: sessionLevel === 'green'
              ? `repeating-linear-gradient(45deg, ${AKY_COLORS.green}, ${AKY_COLORS.green} 2px, #ffffff 2px, #ffffff 6px)`
              : sessionLevel === 'orange'
                ? `repeating-linear-gradient(45deg, ${AKY_COLORS.orange}, ${AKY_COLORS.orange} 2px, #ffffff 2px, #ffffff 6px)`
                : undefined,
          }}
        >
          {sessionLevel === 'none' && <div className="w-full h-full diagonal-stripes" />}
        </div>
        <div className="flex-1 p-4 md:p-6">
          <h3 className="font-headline-sm text-headline-sm uppercase mb-3">Full Practice Targets</h3>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {checklist.map(row => (
              <li key={row.label} className="flex items-center justify-between gap-2 font-label-sm text-label-sm">
                <span className="flex items-center gap-2">
                  <span
                    className="material-symbols-outlined text-base"
                    style={{
                      fontVariationSettings: "'FILL' 1",
                      color: row.met ? (sessionLevel === 'green' ? AKY_COLORS.green : AKY_COLORS.orange) : '#7e7576',
                    }}
                  >
                    {row.met ? 'check_circle' : 'radio_button_unchecked'}
                  </span>
                  {row.label}
                </span>
                <span className="text-on-surface-variant tabular-nums">{row.detail}</span>
              </li>
            ))}
          </ul>
          <p className="font-label-sm text-label-sm text-on-surface-variant mt-4 opacity-80">
            Tap Done when you finish a session · Most practices allow 2× per day
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-gutter">
        {SECTIONS.map(section => {
          const sectionItems = items.filter(i => (i.category || '').toLowerCase() === section.key);
          if (sectionItems.length === 0) return null;
          return (
            <section key={section.key} className="flex flex-col gap-6">
              <h2 className="font-headline-md text-headline-md border-b border-primary pb-4">{section.title}</h2>
              {sectionItems.map(item => (
                <ItemCard
                  key={item.id}
                  item={item}
                  date={date}
                  sessionLevel={sessionLevel}
                  onCounterChange={handleCounterChange}
                  onDoneSession={handleDoneSession}
                />
              ))}
            </section>
          );
        })}
      </div>

      <div className={`mt-8 pt-8 border-t-4 flex justify-between items-center gap-4 ${meta.border}`}>
        <p className="font-label-sm text-label-sm text-on-surface-variant uppercase">
          {practicedCount} practices started · {meta.label}
        </p>
        <button
          onClick={onClose}
          className="bg-primary text-on-primary border border-primary px-8 md:px-12 py-4 font-headline-sm text-headline-sm hover:bg-secondary hover:border-secondary hover:text-on-secondary transition-all woodcut-shadow uppercase tracking-wider group"
        >
          <span className="flex items-center gap-3">
            Complete Session
            <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">arrow_forward</span>
          </span>
        </button>
      </div>
    </div>
  );
}

function itemTierAccent(item, sessionLevel) {
  const name = (item.name || '').toLowerCase();
  const isCore = name === 'main kriya' || name === 'kriya level 2';
  if (sessionLevel === 'green') return AKY_COLORS.green;
  if (sessionLevel === 'orange' && isCore) return AKY_COLORS.orange;
  return null;
}

function ItemCard({ item, date, sessionLevel, onCounterChange, onDoneSession }) {
  const type = item.item_type || 'toggle';
  const count = getCounter(date, item.id);
  const doneSessions = getDoneSessions(date, item.id);
  const maxSessions = getMaxDoneSessions(item);
  const accent = itemTierAccent(item, sessionLevel);
  const borderClass = accent ? 'border-2' : 'border';
  const borderStyle = accent ? { borderColor: accent } : undefined;
  const hasCounter = type === 'counter' || type === 'timer';
  const displayCount = Math.min(getCounterDisplay(item, count), maxDisplay);
  const maxDisplay = getCounterMaxDisplay(item);
  const atMin = count <= 0;
  const atMax = count >= getCounterMax(item);
  const minusDelta = type === 'timer' ? -60 : -1;
  const plusDelta = type === 'timer' ? 60 : 1;

  return (
    <article
      className={`woodcut-shadow bg-surface ${borderClass} border-primary p-6 transition-colors duration-500`}
      style={borderStyle}
    >
      <div className="flex justify-between items-start mb-4 gap-4">
        <div className="flex-1 min-w-0">
          <h3 className="font-headline-sm text-headline-sm text-primary mb-1">{item.name}</h3>
          {item.description && (
            <p className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">{item.description}</p>
          )}
        </div>
        {doneSessions > 0 && (
          <span
            className="material-symbols-outlined shrink-0"
            style={{ fontVariationSettings: "'FILL' 1", color: accent || '#000' }}
          >
            check_circle
          </span>
        )}
      </div>

      {hasCounter && (
        <div className="flex flex-col gap-2 mb-4">
          <label className="font-label-sm text-label-sm uppercase tracking-widest">
            {type === 'timer' ? 'Minutes' : 'Rounds'}
          </label>
          <div className="flex items-center gap-4 bg-surface-container-low border border-outline p-2 w-max">
            <button
              onClick={() => onCounterChange(item, minusDelta)}
              disabled={atMin}
              className="w-8 h-8 flex items-center justify-center border border-primary bg-surface hover:bg-surface-variant transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <span className="material-symbols-outlined text-sm">remove</span>
            </button>
            <span className="font-label-sm text-label-sm w-10 text-center tabular-nums">
              {displayCount}
            </span>
            <button
              onClick={() => onCounterChange(item, plusDelta)}
              disabled={atMax}
              className="w-8 h-8 flex items-center justify-center border border-primary bg-surface hover:bg-surface-variant transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <span className="material-symbols-outlined text-sm">add</span>
            </button>
          </div>
          <p className="font-label-sm text-label-sm text-on-surface-variant">
            Max: {maxDisplay}{type === 'timer' ? ' min' : ' rounds'}
          </p>
        </div>
      )}

      <div className="flex items-center justify-between gap-4 pt-2 border-t border-outline">
        <SessionDots sessions={doneSessions} max={maxSessions} accent={accent} />
        <DoneButton
          sessions={doneSessions}
          max={maxSessions}
          onDone={() => onDoneSession(item)}
          accent={accent}
        />
      </div>
    </article>
  );
}

function SessionDots({ sessions, max, accent }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: max }).map((_, i) => (
        <div
          key={i}
          className="w-3 h-3 border-2 border-primary transition-colors duration-300"
          style={{
            backgroundColor: i < sessions ? (accent || '#000') : 'transparent',
            borderColor: i < sessions ? (accent || '#000') : undefined,
          }}
        />
      ))}
      <span className="font-label-sm text-label-sm text-on-surface-variant ml-1 tabular-nums">
        {sessions}/{max}
      </span>
    </div>
  );
}

function DoneButton({ sessions, max, onDone, accent }) {
  const full = sessions >= max;

  if (full) {
    return (
      <span
        className="font-label-sm text-label-sm uppercase px-4 py-2 border-2 text-white"
        style={{ backgroundColor: accent || '#000', borderColor: accent || '#000' }}
      >
        Done {sessions}/{max}
      </span>
    );
  }

  const label = sessions === 0 ? 'Done' : `Done ${sessions}/${max}`;

  return (
    <button
      onClick={onDone}
      className="font-label-sm text-label-sm uppercase px-4 py-2 border-2 border-primary bg-surface hover:bg-primary hover:text-on-primary transition-colors woodcut-shadow-sm"
    >
      {label}
    </button>
  );
}
