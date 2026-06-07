import { useState, useEffect, useCallback } from 'react';
import { api } from '../api';

export default function TeamScreen() {
  const [team, setTeam] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchTeam = useCallback(async () => {
    try {
      const data = await api.getTeam();
      setTeam(data);
    } catch (err) { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchTeam(); }, [fetchTeam]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-6 h-6 border-2 border-ink border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const today = new Date();

  return (
    <>
      <div className="lg:hidden space-y-5">
        <div>
          <p className="text-xs text-mute uppercase tracking-widest font-bold">
            {today.toLocaleDateString('en-US', { weekday: 'long' })}
          </p>
          <h2 className="text-2xl font-display font-black text-ink">Sangha</h2>
        </div>
        {renderMemberList(team)}
      </div>

      <div className="hidden lg:block">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-1 h-8 bg-ink" />
            <h2 className="text-3xl font-display font-black text-ink">Sangha</h2>
          </div>
          <p className="text-xs text-mute leading-relaxed max-w-xl">
            Observe the discipline of your fellow practitioners. The path is solitary, yet we walk together.
          </p>
        </div>
        <div className="grid lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {renderMemberCards(team)}
        </div>
      </div>
    </>
  );
}

function renderMemberList(team) {
  if (!team || !team.members || team.members.length === 0) {
    return (
      <div className="card-wood p-8 text-center">
        <p className="text-sm text-mute">No members yet. Invite your sangha.</p>
      </div>
    );
  }
  return team.members.map(member => (
    <MemberCardMobile key={member.id} member={member} />
  ));
}

function renderMemberCards(team) {
  if (!team || !team.members || team.members.length === 0) {
    return (
      <div className="card-wood p-12 text-center col-span-full">
        <p className="text-sm text-mute">No members yet. Invite your sangha to walk the path together.</p>
      </div>
    );
  }
  return team.members.map(member => (
    <MemberCardDesktop key={member.id} member={member} />
  ));
}

function MemberCardMobile({ member }) {
  const pct = member.percentage || 0;
  const isDone = pct >= 100;
  return (
    <div className={`card-wood p-5 ${pct === 0 ? 'opacity-50' : ''}`}>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs font-display font-black text-ink">{member.name}</span>
        <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 border-2 ${
          isDone ? 'bg-ink text-paper border-ink' : 'bg-paper text-mute border-mute'
        }`}>
          {isDone ? 'Active' : pct > 0 ? 'Partial' : 'Resting'}
        </span>
      </div>
      <div className="grid grid-cols-6 gap-2 text-center">
        <MiniStat icon="🔵" value={pct > 0 ? '42m' : '--'} label="Japa" />
        <MiniStat icon="🕉️" value={`${member.completed || 0}/${member.total || 0}`} label="AKY" />
        <MiniStat icon="🏃" value={isDone ? '✅' : '—'} label="Ex" />
        <MiniStat icon="💧" value={isDone ? '✅' : '—'} label="H₂O" />
        <MiniStat icon="📖" value={isDone ? '✅' : '—'} label="Study" />
        <MiniStat icon="🪷" value={isDone ? '✅' : '—'} label="Abhi" />
      </div>
    </div>
  );
}

function MemberCardDesktop({ member }) {
  const pct = member.percentage || 0;
  const isDone = pct >= 100;
  const isPartial = pct > 0 && pct < 100;
  const isResting = pct === 0;

  const role = member.role || (isDone ? 'MANTRA DIKSHA' : isResting ? 'INITIATE' : 'SENIOR');

  return (
    <div className={`card-wood p-6 ${isResting ? 'opacity-50' : ''}`}>
      <div className="flex items-center gap-2 mb-4">
        <div className="w-10 h-10 rounded-full bg-ink flex items-center justify-center shrink-0">
          <span className="text-[13px] font-black text-paper">
            {(member.name || '?')[0].toUpperCase()}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-display font-black text-ink truncate">{member.name}</p>
          <p className="text-[8px] text-mute uppercase tracking-widest font-bold">{role}</p>
        </div>
        <span className={`text-[9px] font-bold uppercase tracking-widest px-2.5 py-1 border-2 shrink-0 ${
          isDone ? 'bg-ink text-paper border-ink' :
          isPartial ? 'bg-rust text-paper border-rust' :
          'bg-paper text-mute border-mute'
        }`}>
          {isDone ? 'ACTIVE' : isPartial ? 'PARTIAL' : 'RESTING'}
        </span>
      </div>

      <div className="space-y-3">
        <StatRow icon={<MalaIcon />} label="Japa" value={isResting ? '—' : '108/108 Rnds'} pct={isResting ? 0 : isDone ? 100 : 59} unit="rounds" />
        <StatRow icon={<AkyIcon />} label="AKY" value={isResting ? 'Pending' : isDone ? 'Complete' : 'In Progress'} pct={isResting ? 0 : isDone ? 100 : Math.round((member.completed || 0) / (member.total || 12) * 100)} unit="techniques" />
        <StatRow icon={<DumbbellIcon />} label="Exercise" value={isResting ? '—' : '60/60 Min'} pct={isResting ? 0 : 100} unit="min" />
        <StatRow icon={<WaterIcon />} label="Water" value={isResting ? '—' : '3.0/3 L'} pct={isResting ? 0 : 100} unit="liters" />
        <StatRow icon={<BookIcon />} label="Study" value={isResting ? '—' : 'Complete'} pct={isResting ? 0 : 100} unit="" />
        <StatRow icon={<LotusIcon />} label="Abhishekam" value={isResting ? 'Pending' : 'Complete'} pct={isResting ? 0 : 100} unit="" />
      </div>
    </div>
  );
}

function StatRow({ icon, label, value, pct, unit }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <span className="text-mute">{icon}</span>
          <span className="text-[10px] text-mute uppercase tracking-widest font-bold">{label}</span>
        </div>
        <span className="text-[10px] font-bold text-ink tabular-nums">{value}</span>
      </div>
      <div className="bar-wood ml-7">
        <div
          className={`bar-wood-fill ${pct >= 100 ? '' : pct > 0 ? 'rust' : ''}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function MiniStat({ icon, value, label }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="text-sm">{icon}</span>
      <span className="text-[10px] font-bold text-ink tabular-nums">{value}</span>
      <span className="text-[8px] text-mute uppercase tracking-wider">{label}</span>
    </div>
  );
}

function MalaIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="6" r="4"/><circle cx="12" cy="18" r="4"/></svg>; }
function AkyIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>; }
function DumbbellIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M5 12h14"/><circle cx="12" cy="7" r="4"/><circle cx="12" cy="17" r="4"/></svg>; }
function WaterIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 2C10 6 6 8.5 6 12a6 6 0 0012 0C18 8.5 14 6 12 2z"/></svg>; }
function BookIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>; }
function LotusIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 3c-3 4-3 10 0 18 3-8 3-14 0-18z"/></svg>; }