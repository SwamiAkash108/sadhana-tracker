import { useState, useEffect, useCallback } from 'react';
import { api } from '../api';

export default function TodayScreen({ user, onOpenAky }) {
  const [checklist, setChecklist] = useState([]);
  const [date, setDate] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchToday = useCallback(async () => {
    try { const data = await api.getToday(); setChecklist(data.checklist); setDate(data.date); } catch (err) {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchToday(); }, [fetchToday]);

  const handleToggle = async (itemId) => {
    setChecklist(prev => prev.map(i => i.id===itemId?{...i,completed:!i.completed}:i));
    try { await api.toggleItem(itemId); } catch {
      setChecklist(prev => prev.map(i => i.id===itemId?{...i,completed:!i.completed}:i));
    }
  };

  if (loading) return <div className="flex justify-center py-20"><div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin"/></div>;

  const today = new Date(date+'T00:00:00');
  const japaItem = checklist.find(i=>(i.name||'').toLowerCase().includes('japa'));
  const akyItems = checklist.filter(i=>{
    const n=(i.name||'').toLowerCase();
    return !n.includes('japa')&&!['exercise','water','study','abhishekam'].includes(n);
  });
  const quickItems = checklist.filter(i=>['exercise','water','study','abhishekam'].includes((i.name||'').toLowerCase()));
  const akyDone = akyItems.filter(i=>i.completed).length;
  const akyTotal = akyItems.length||12;

  return (
    <div className="max-w-lg md:max-w-4xl mx-auto flex flex-col gap-6">
      <div className="flex justify-between items-end border-b-4 border-black pb-2">
        <h2 className="text-2xl lg:text-3xl font-display font-bold">
          {today.toLocaleDateString('en-US',{weekday:'long',month:'short',day:'numeric'})}
        </h2>
      </div>
      <JapaSection item={japaItem} />
      <div className="grid md:grid-cols-2 gap-6">
        <button onClick={onOpenAky} className="card-woodcut p-5 flex flex-col justify-between relative h-full text-left hover:bg-gray-50/50 transition-colors">
          <div className="absolute top-0 right-0 w-16 h-16 bg-halftone-secondary opacity-20"/>
          <div className="relative z-10 mb-4">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-xl font-display font-bold flex items-center gap-2"><span className="text-[#b22a27]">🕉️</span> Atma Kriya Yoga</h3>
              <span className="text-xs bg-black text-white px-2 py-0.5 font-bold">{akyDone}/{akyTotal}</span>
            </div>
            <p className="text-xs text-gray-500">Daily Practices</p>
          </div>
          <div className="relative z-10 w-full h-7 bg-gray-200 border-2 border-black mt-auto">
            <div className="bg-[#b22a27] h-full border-r-2 border-black relative overflow-hidden" style={{width:`${Math.round((akyDone/akyTotal)*100)}%`}}>
              <div className="absolute inset-0 bg-halftone opacity-30"/>
            </div>
          </div>
        </button>
        <div className="card-woodcut flex flex-col">
          <div className="p-4 border-b-4 border-black bg-black text-white flex justify-between items-center">
            <h3 className="text-xl font-display font-bold">Quick Logs</h3>
          </div>
          <div className="flex-grow flex flex-col divide-y-2 divide-black">
            {['Exercise','Water','Study','Abhishekam'].map(name=>{
              const item = quickItems.find(i=>(i.name||'').toLowerCase()===name.toLowerCase());
              const done = item?.completed;
              return (<button key={name} onClick={()=>item&&handleToggle(item.id)} className="flex items-center justify-between p-4 hover:bg-gray-100 transition-colors cursor-pointer group"><div className="flex items-center gap-3"><div className={`w-5 h-5 border-2 border-black flex items-center justify-center transition-all ${done?'bg-[#b22a27]':''}`}>{done&&<span className="text-white text-xs font-bold">✓</span>}</div><span className={`text-base font-bold ${done?'line-through text-gray-400':''}`}>{name}</span></div><span className={`text-xs border px-2 py-0.5 font-bold ${done?'bg-white border-black':'border-dashed border-gray-400 text-gray-400'}`}>{done?'Done':'Pending'}</span></button>);
            })}
          </div>
        </div>
      </div>
      <div className="card-woodcut p-4 flex items-center justify-center gap-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(0,0,0,0.05)_25%,rgba(0,0,0,0.05)_50%,transparent_50%,transparent_75%,rgba(0,0,0,0.05)_75%)] bg-[length:20px_20px]"/>
        <span className="text-3xl text-[#b22a27] z-10">🔥</span>
        <div className="z-10 flex flex-col items-center">
          <span className="text-4xl font-display font-bold leading-none">7 DAY</span>
          <span className="text-xs uppercase tracking-[0.2em] border-t-2 border-black pt-1 mt-1">Streak</span>
        </div>
        <span className="text-3xl text-[#b22a27] z-10">🔥</span>
      </div>
    </div>
  );
}

function JapaSection({ item }) {
  const GOAL_MIN = 60;
  const [elapsed, setElapsed] = useState(()=>{try{return JSON.parse(localStorage.getItem('sadhana_japa_timer')||'{}').elapsed||0}catch{return 0;}});
  const [running, setRunning] = useState(false);
  useEffect(()=>{if(!running)return;const id=setInterval(()=>{setElapsed(prev=>{const next=prev+1;localStorage.setItem('sadhana_japa_timer',JSON.stringify({elapsed:next}));return next;});},1000);return()=>clearInterval(id);},[running]);

  const elapsedMin = Math.floor(elapsed/60);
  const pct = Math.min(100,Math.round((elapsedMin/GOAL_MIN)*100));
  const mins = Math.floor(elapsed/60);
  const secs = elapsed%60;
  const circumference = 2*Math.PI*45;
  const dash = (pct/100)*circumference;

  return (
    <div className="card-woodcut p-6 flex flex-col items-center justify-center relative overflow-hidden group">
      <div className="absolute inset-0 bg-halftone opacity-5 pointer-events-none"/>
      <h3 className="text-xs uppercase tracking-widest mb-6 border-b-2 border-black pb-1 inline-block z-10 bg-white px-2">Japa Meditation</h3>
      <div className="relative w-56 h-56 flex items-center justify-center z-10 mb-6">
        <div className="absolute inset-0 rounded-full border-4 border-black border-dashed animate-[spin_60s_linear_infinite]"/>
        <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" fill="none" r="45" stroke="#e5e2e1" strokeWidth="6"/>
          <circle cx="50" cy="50" fill="none" r="45" stroke="#b22a27" strokeDasharray={`${dash} ${circumference-dash}`} strokeWidth="6" className="transition-all duration-1000 ease-out"/>
        </svg>
        <div className="text-center bg-white w-40 h-40 rounded-full flex flex-col items-center justify-center border-2 border-black shadow-[inset_0px_0px_20px_rgba(0,0,0,0.1)]">
          <span className="text-3xl font-display font-bold text-[#b22a27] tabular-nums">{mins}:{secs.toString().padStart(2,'0')}</span>
          <span className="text-[10px] font-bold border-t-2 border-black pt-1 mt-1 w-20 text-center">/ {GOAL_MIN} MIN</span>
        </div>
      </div>
      <button onClick={()=>setRunning(!running)} className="btn-woodcut bg-[#b22a27] text-white text-xl font-display font-bold px-12 py-4 z-10 uppercase tracking-wider hover:bg-[#8a1a1a]">
        {running?'Pause':elapsed>0?'Resume':'Begin'}
      </button>
    </div>
  );
}