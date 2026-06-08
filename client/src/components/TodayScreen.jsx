import { useState, useEffect, useCallback } from 'react';
import { api } from '../api';

export default function TodayScreen({ user, onOpenAky }) {
  const [checklist, setChecklist] = useState([]);
  const [date, setDate] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchToday = useCallback(async () => {
    try {
      const data = await api.getToday();
      setChecklist(data.checklist);
      setDate(data.date);
    } catch (err) { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchToday(); }, [fetchToday]);

  const handleToggle = async (itemId) => {
    setChecklist(prev => prev.map(i =>
      i.id === itemId ? { ...i, completed: !i.completed } : i
    ));
    try { await api.toggleItem(itemId); } catch {
      setChecklist(prev => prev.map(i =>
        i.id === itemId ? { ...i, completed: !i.completed } : i
      ));
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-6 h-6 border-2 border-ink border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const today = new Date(date + 'T00:00:00');
  const japaItem = checklist.find(i => (i.name || '').toLowerCase().includes('japa'));
  const akyItems = checklist.filter(i => {
    const n = (i.name || '').toLowerCase();
    return !n.includes('japa') && !['exercise','water','study','abhishekam'].includes(n);
  });
  const quickItems = checklist.filter(i => {
    const n = (i.name || '').toLowerCase();
    return ['exercise','water','study','abhishekam'].includes(n);
  });

  return (
    <>
      <div className="lg:hidden space-y-5">
        <MobileDateHeader today={today} />
        <JapaCard item={japaItem} />
        <AkySummaryCard items={akyItems} onClick={onOpenAky} />
        <QuickLogs items={quickItems} onToggle={handleToggle} />
        <StreakBanner />
      </div>

      <div className="hidden lg:grid lg:grid-cols-12 lg:gap-4">
        <div className="col-span-8 space-y-4">
          <div className="card-wood p-6">
            <JapaRingCard item={japaItem} />
          </div>
          <div className="card-wood p-6">
            <AkySummaryCard items={akyItems} onClick={onOpenAky} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <QuickLogs items={quickItems} onToggle={handleToggle} />
            <RatingCard />
          </div>
        </div>
        <div className="col-span-4 space-y-4">
          <DateBlock today={today} />
          <StreakBannerDesktop />
          <FocusCard />
        </div>
      </div>
    </>
  );
}

function MobileDateHeader({ today }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-xs text-mute uppercase tracking-widest font-bold">
          {today.toLocaleDateString('en-US', { weekday: 'long' })}
        </p>
        <p className="text-2xl font-display font-black text-ink">
          {today.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
        </p>
      </div>
      <div className="relative w-16 h-16">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 40 40">
          <circle cx="20" cy="20" r="17" fill="none" stroke="#D4D4D0" strokeWidth="4" />
          <circle cx="20" cy="20" r="17" fill="none" stroke="#1A1A1A" strokeWidth="4"
            strokeDasharray="50 107" strokeLinecap="round" />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-sm font-display font-black text-ink leading-none">47%</span>
        </div>
      </div>
    </div>
  );
}

function DateBlock({ today }) {
  return (
    <div className="card-wood p-5">
      <div className="inline-block bg-ink text-paper text-[11px] font-bold uppercase tracking-widest px-3 py-1.5 mb-3">
        {today.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()}
      </div>
      <p className="text-sm font-display font-black text-ink">
        {today.toLocaleDateString('en-US', { weekday: 'long' })}
      </p>
    </div>
  );
}

function StreakBanner() {
  return (
    <div className="card-wood p-5 flex items-center gap-4">
      <div className="w-10 h-10 flex items-center justify-center">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#C4633A" strokeWidth="2" strokeLinecap="round">
          <path d="M12 20c-4 0-7-3-7-7 0-2 1-4 3-5.5 1-0.8 2.5-1.5 4-1.5s3 0.7 4 1.5c2 1.5 3 3.5 3 5.5 0 4-3 7-7 7z" />
          <path d="M12 20V12" />
        </svg>
      </div>
      <div>
        <p className="text-xl font-display font-black text-ink">7 DAY STREAK</p>
        <p className="text-[10px] text-mute uppercase tracking-wider font-medium">Your momentum is building</p>
      </div>
    </div>
  );
}

function StreakBannerDesktop() {
  return (
    <div className="card-wood overflow-hidden">
      <div className="flex items-center gap-3 p-5">
        <div className="w-11 h-11 flex items-center justify-center shrink-0">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#C4633A" strokeWidth="2" strokeLinecap="round">
            <path d="M12 20c-3 0-5.5-2-6-5 0.5 1 2 1.5 3.5 1 1.5-0.5 2-2 3.5-2.5 1.5-0.5 3 0.5 3.5 2 0.5-3-2-6.5-5-6.5-1 0-2 0.5-3 1.5 0 0-2-1.5-2.5-3" />
          </svg>
        </div>
        <div>
          <p className="text-lg font-display font-black text-ink leading-none">7 DAY STREAK</p>
          <p className="text-[10px] text-mute uppercase tracking-wider font-medium mt-0.5">Your momentum is building</p>
        </div>
      </div>
      <div className="hatch-diagonal h-1.5" />
    </div>
  );
}

function FocusCard() {
  return (
    <div className="card-wood p-5">
      <p className="text-[10px] text-mute uppercase tracking-widest font-bold mb-2">Focus</p>
      <h3 className="text-base font-display font-black text-ink mb-2">Steady the Mind</h3>
      <p className="text-xs text-mute leading-relaxed">
        &ldquo;The mind is like a turbulent river. Kriya is the dam that harnesses its power.&rdquo;
      </p>
    </div>
  );
}

function RatingCard() {
  const [rating, setRating] = useState(3);
  return (
    <div className="card-wood p-5">
      <p className="text-[10px] text-mute uppercase tracking-widest font-bold mb-3">Rating</p>
      <div className="flex gap-2.5">
        {[1,2,3,4,5].map(i => (
          <button
            key={i}
            onClick={() => setRating(i)}
            className={`w-8 h-8 border-2 border-ink transition-all ${
              i <= rating ? 'bg-ink' : 'bg-paper hover:bg-paper-dark'
            }`}
          />
        ))}
      </div>
    </div>
  );
}

/* =========== JAPA =========== */

function JapaCard({ item }) {
  const GOAL_MIN = 60;
  const [elapsed, setElapsed] = useState(() => {
    try { return JSON.parse(localStorage.getItem('sadhana_japa_timer') || '{}').elapsed || 0; } catch { return 0; }
  });
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setElapsed(prev => {
        const next = prev + 1;
        localStorage.setItem('sadhana_japa_timer', JSON.stringify({ elapsed: next }));
        return next;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [running]);

  const elapsedMin = Math.floor(elapsed / 60);
  const pct = Math.min(100, Math.round((elapsedMin / GOAL_MIN) * 100));
  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;

  return (
    <div className="card-wood p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-display font-bold text-ink uppercase tracking-wide">Japa Meditation</p>
          <p className="text-[10px] text-mute">Chanting the Divine Names</p>
        </div>
        <div className="w-20 h-20 relative">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80">
            <circle cx="40" cy="40" r="34" fill="none" stroke="#D4D4D0" strokeWidth="6" />
            <circle cx="40" cy="40" r="34" fill="none" stroke="#C4633A" strokeWidth="6"
              strokeDasharray={`${(pct / 100) * 2 * Math.PI * 34} ${2 * Math.PI * 34}`} strokeLinecap="round" />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xs font-display font-black text-ink leading-none tabular-nums">
              {mins}:{secs.toString().padStart(2, '0')}
            </span>
          </div>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between text-[9px] text-mute font-medium">
        <span>{elapsedMin} min</span>
        <span>Goal: {GOAL_MIN} min</span>
      </div>
      <button
        onClick={() => setRunning(!running)}
        className={`mt-2 w-full text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded border-2 transition-all ${
          running ? 'bg-ink text-paper border-ink' : 'bg-rust text-paper border-ink'
        }`}
      >
        {running ? 'Pause' : elapsed > 0 ? 'Resume' : 'Begin'}
      </button>
    </div>
  );
}

function JapaRingCard({ item }) {
  const GOAL_MIN = 60;
  const [elapsed, setElapsed] = useState(() => {
    try { return JSON.parse(localStorage.getItem('sadhana_japa_timer') || '{}').elapsed || 0; } catch { return 0; }
  });
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setElapsed(prev => {
        const next = prev + 1;
        localStorage.setItem('sadhana_japa_timer', JSON.stringify({ elapsed: next }));
        return next;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [running]);

  const elapsedMin = Math.floor(elapsed / 60);
  const pct = Math.min(100, Math.round((elapsedMin / GOAL_MIN) * 100));
  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;
  const circumference = 2 * Math.PI * 80;
  const dash = (pct / 100) * circumference;

  return (
    <div className="flex items-center gap-8">
      <div className="w-44 h-44 relative shrink-0">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 180 180">
          <circle cx="90" cy="90" r="80" fill="none" stroke="#D4D4D0" strokeWidth="10" />
          <circle cx="90" cy="90" r="80" fill="none" stroke="#1A1A1A" strokeWidth="10"
            strokeDasharray={`${dash} ${circumference - dash}`} strokeLinecap="round" />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-display font-black text-ink leading-none tabular-nums">
            {mins}:{secs.toString().padStart(2, '0')}
          </span>
          <span className="text-[10px] text-mute uppercase tracking-widest font-bold mt-1">/ {GOAL_MIN} min</span>
        </div>
      </div>
      <div className="flex-1 space-y-3">
        <div>
          <p className="text-sm font-display font-black text-ink">Japa Meditation</p>
          <p className="text-[10px] text-mute uppercase tracking-wider">Chanting the Divine Names</p>
        </div>
        <div className="bar-wood">
          <div className="bar-wood-fill rust" style={{ width: `${pct}%` }} />
        </div>
        <div className="flex items-center justify-between text-[9px] text-mute font-medium">
          <span>{elapsedMin} / {GOAL_MIN} min</span>
          <span>{pct}%</span>
        </div>
        <button
          onClick={() => setRunning(!running)}
          className={`btn-wood w-full flex items-center justify-center gap-2 text-[11px] ${running ? '!bg-ink !text-paper' : ''}`}
        >
          {running ? 'Pause' : elapsed > 0 ? 'Resume' : 'Begin'} →
        </button>
      </div>
    </div>
  );
}

/* =========== AKY =========== */

function AkySummaryCard({ items, onClick }) {
  const done = items.filter(i => i.completed).length;
  const total = items.length || 12;
  const pct = Math.round((done / total) * 100);

  return (
    <button onClick={onClick} className="w-full text-left">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display font-bold text-base text-ink">Atma Kriya Yoga</h3>
        <span className="text-[10px] text-mute uppercase tracking-widest font-bold">
          {done}/{total}
        </span>
      </div>
      <div className="bar-wood mb-2">
        <div className="bar-wood-fill" style={{ width: `${pct}%` }} />
      </div>
      <p className="text-[10px] text-mute text-right uppercase tracking-widest font-bold">Daily Practices</p>
    </button>
  );
}

/* =========== QUICK LOGS =========== */

function QuickLogs({ items, onToggle }) {
  const logs = items.length > 0 ? items : [
    { id: 'exercise', name: 'Exercise', completed: false },
    { id: 'water', name: 'Water', completed: false },
    { id: 'study', name: 'Study', completed: false },
    { id: 'abhishekam', name: 'Abhishekam', completed: false },
  ];

  return (
    <div className="card-wood">
      <div className="px-5 py-3 bg-ink text-paper">
        <span className="text-[11px] font-bold uppercase tracking-widest">Quick Logs</span>
      </div>
      <div className="divide-y-2 divide-ink">
        {logs.map(item => (
          <button
            key={item.id}
            onClick={() => onToggle(item.id)}
            className={`w-full flex items-center justify-between px-5 py-4 hover:bg-paper-dark/50 transition-colors ${
              item.completed ? 'opacity-60' : ''
            }`}
          >
            <span className={`text-sm font-medium ${item.completed ? 'line-through text-mute' : 'text-ink'}`}>
              {item.name}
            </span>
            <div className={`w-5 h-5 border-2 flex items-center justify-center transition-all ${
              item.completed ? 'bg-sage border-sage' : 'border-stone-dark'
            }`}>
              {item.completed && (
                <svg className="w-3 h-3 text-paper animate-check-pop" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="square">
                  <path d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}