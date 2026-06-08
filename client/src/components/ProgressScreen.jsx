import { useState, useEffect, useCallback } from 'react';
import { api } from '../api';

export default function ProgressScreen({ user }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  const fetchStats = useCallback(async (d) => {
    setLoading(true);
    try { const data = await api.getStats(d); setStats(data); } catch (err) {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchStats(days); }, [days, fetchStats]);

  if (loading) return <div className="flex justify-center py-20"><div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin"/></div>;
  if (!stats) return null;

  const currentStreak = stats.streak || 0;
  const longestStreak = 48;
  const today = new Date();
  const monthDates = [];
  for (let i=29;i>=0;i--) { const d=new Date(today); d.setDate(d.getDate()-i); monthDates.push(d); }
  const dayMap={};
  (stats.dailyData||[]).forEach(day=>{dayMap[day.date]=day;});

  return (
    <div className="max-w-4xl mx-auto">
      <div className="space-y-8">
        <JourneyHeader />
        <div className="grid md:grid-cols-2 gap-4">
          <StreakCards current={currentStreak} longest={longestStreak} />
        </div>
        <div className="card-woodcut p-6">
          <div className="flex justify-between items-end mb-6 border-b border-black pb-2">
            <h2 className="text-2xl font-display font-bold text-black">Consistency</h2>
            <DaySelector days={days} setDays={setDays} />
          </div>
          <CalGrid monthDates={monthDates} dayMap={dayMap} today={today} />
        </div>
        <AveragesBars />
      </div>
    </div>
  );
}

function JourneyHeader() {
  return (
    <div className="flex flex-col gap-4 border-l-4 border-black pl-4">
      <h1 className="text-4xl lg:text-5xl font-display font-bold text-black tracking-tight">My Journey</h1>
      <p className="text-base text-gray-500 italic border-l-2 border-[#b22a27] pl-4 py-1">
        &ldquo;The mind is restless and difficult to restrain, but it is subdued by practice.&rdquo;
      </p>
    </div>
  );
}

function StreakCards({ current, longest }) {
  return (<>
    <div className="card-woodcut p-5 relative overflow-hidden group cursor-default col-span-1">
      <div className="absolute inset-0 bg-[#b22a27] translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
      <div className="relative z-10 flex flex-col justify-between h-full group-hover:text-white transition-colors duration-300">
        <span className="text-xs uppercase tracking-wider text-gray-500 group-hover:text-white/80">Current Streak</span>
        <div className="flex items-baseline gap-2 mt-4"><span className="text-5xl font-display font-bold">{current}</span><span className="text-base">days</span></div>
      </div>
    </div>
    <div className="card-woodcut p-5 bg-black text-white relative overflow-hidden col-span-1">
      <div className="absolute inset-0 bg-halftone opacity-40 mix-blend-overlay" />
      <div className="relative z-10 flex flex-col justify-between h-full">
        <span className="text-xs uppercase tracking-wider text-white/60">Longest Streak</span>
        <div className="flex items-baseline gap-2 mt-4"><span className="text-5xl font-display font-bold text-[#b22a27]">{longest}</span><span className="text-base text-white/60">days</span></div>
      </div>
    </div>
  </>);
}

function DaySelector({ days, setDays }) {
  return (<div className="flex gap-1">{[7,14,30,60].map(d=><button key={d} onClick={()=>setDays(d)} className={`text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 border-2 border-black transition-all ${days===d?'bg-black text-white':'bg-white text-gray-500 hover:text-black'}`}>{d}D</button>)}</div>);
}

function CalGrid({ monthDates, dayMap, today }) {
  const dayNames=['S','M','T','W','T','F','S'];
  const firstDate=monthDates[0];
  const leadingBlanks=firstDate.getDay();
  return (<div>
    <div className="grid grid-cols-7 gap-2">
      {dayNames.map(d=><div key={d} className="text-center text-xs text-gray-500 font-bold py-0.5">{d}</div>)}
      {Array.from({length:leadingBlanks}).map((_,i)=><div key={`l-${i}`} className="aspect-square"/>)}
      {monthDates.map(d=>{const ds=d.toISOString().split('T')[0];const has=dayMap[ds];const pct=has?dayMap[ds].percentage:0;let bg='bg-white border border-gray-300';if(has&&pct>=100)bg='bg-black border border-black text-white';else if(has&&pct>=50)bg='bg-halftone border border-black';else if(has&&pct>0)bg='bg-gray-300 border border-black';return <div key={ds} className={`aspect-square flex items-center justify-center text-[11px] font-bold ${bg} ${d>today?'opacity-20':''}`}>{d.getDate()}</div>;})}
    </div>
    <div className="mt-3 flex gap-4 text-[10px] text-gray-500 justify-end">
      <span className="flex items-center gap-1"><span className="w-3 h-3 border border-gray-300"/> Missed</span>
      <span className="flex items-center gap-1"><span className="w-3 h-3 bg-halftone border border-black"/> Partial</span>
      <span className="flex items-center gap-1"><span className="w-3 h-3 bg-black"/> Complete</span>
    </div>
  </div>);
}

function AveragesBars() {
  const items=[{label:'Japa Mala',val:85},{label:'Atma Kriya Yoga',val:60,sec:true},{label:'Hydration',val:92}];
  return (<div className="card-woodcut p-6 space-y-5">
    <h3 className="text-sm font-display font-bold text-black pb-2 border-b-4 border-black inline-block">30-Day Averages</h3>
    {items.map(it=>(<div key={it.label}><div className="flex justify-between text-[10px] mb-1 uppercase tracking-wide"><span className="font-bold">{it.label}</span><span className={it.sec?'text-[#b22a27]':'text-gray-500'}>{it.val}%</span></div><div className="h-4 w-full bg-white border border-black overflow-hidden"><div className={`h-full ${it.sec?'bg-halftone bg-black':'bg-black'}`} style={{width:`${it.val}%`}}/></div></div>))}
  </div>);
}