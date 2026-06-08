import { useState,useEffect,useCallback } from 'react';
import { api } from '../api';

export default function TodayScreen({user,onOpenAky}){
  const[checklist,setChecklist]=useState([]);const[date,setDate]=useState('');const[loading,setLoading]=useState(true);
  const fetchToday=useCallback(async()=>{try{const data=await api.getToday();setChecklist(data.checklist);setDate(data.date);}catch(err){}finally{setLoading(false);}},[]);
  useEffect(()=>{fetchToday();},[fetchToday]);
  const handleToggle=async(itemId)=>{setChecklist(prev=>prev.map(i=>i.id===itemId?{...i,completed:!i.completed}:i));try{await api.toggleItem(itemId);}catch{setChecklist(prev=>prev.map(i=>i.id===itemId?{...i,completed:!i.completed}:i));}};
  if(loading)return(<div className="flex justify-center py-20"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"/></div>);
  const today=date?new Date(date+'T00:00:00'):new Date();
  const japaItem=checklist.find(i=>(i.name||'').toLowerCase().includes('japa'));
  const akyItems=checklist.filter(i=>{const n=(i.name||'').toLowerCase();return!n.includes('japa')&&!['exercise','water','study','abhishekam'].includes(n);});
  const quickItems=checklist.filter(i=>['exercise','water','study','abhishekam'].includes((i.name||'').toLowerCase()));
  const akyDone=akyItems.filter(i=>i.completed).length;const akyTotal=akyItems.length||12;const akyPct=akyTotal>0?Math.round((akyDone/akyTotal)*100):0;

  return(<div className="space-y-12">
    <header className="flex justify-between items-end border-b-4 border-primary pb-6"><div><h2 className="font-headline-xl text-headline-xl text-primary">Today's Focus</h2><p className="font-body-lg text-body-lg text-on-surface-variant mt-2">Maintain your discipline. The path is the goal.</p></div><div className="text-right"><p className="font-label-sm text-label-sm uppercase bg-primary text-on-primary px-3 py-1 inline-block">{today.toLocaleDateString('en-US',{day:'numeric',month:'short',year:'numeric'})}</p></div></header>
    <StreakBanner/>
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      <JapaRing item={japaItem}/>
      <div className="lg:col-span-4 flex flex-col gap-8">
        <button onClick={onOpenAky} className="bg-surface border-4 border-primary p-6 woodcut-shadow relative overflow-hidden text-left"><div className="absolute -right-8 -top-8 w-32 h-32 halftone-bg opacity-20 rounded-full"/><h3 className="font-headline-sm text-headline-sm uppercase border-b-2 border-primary pb-2 mb-6 relative z-10">Atma Kriya</h3><div className="relative z-10 flex items-end gap-2 mb-2"><span className="font-headline-lg text-headline-lg text-primary leading-none">{akyDone}</span><span className="font-body-lg text-body-lg text-on-surface-variant pb-1">/ {akyTotal}</span></div><p className="font-label-sm text-label-sm uppercase mb-6 text-on-surface-variant relative z-10">Techniques Completed</p><div className="w-full h-6 border-2 border-primary flex relative z-10"><div className="h-full diagonal-stripes opacity-80" style={{width:`${akyPct}%`}}/><div className="bg-surface-variant h-full" style={{width:`${100-akyPct}%`}}/></div></button>
        <QuickLogs items={quickItems} onToggle={handleToggle}/>
      </div>
    </div>
  </div>);
}

function StreakBanner(){return(<div className="w-full border-4 border-primary bg-surface-bright flex overflow-hidden woodcut-shadow"><div className="w-24 diagonal-stripes border-r-4 border-primary"/><div className="flex-1 p-6 flex items-center justify-between bg-surface-bright"><div className="flex items-center gap-4"><span className="material-symbols-outlined text-secondary" style={{fontVariationSettings:"'FILL' 1",fontSize:'32px'}}>local_fire_department</span><div><h3 className="font-headline-sm text-headline-sm uppercase">7 Day Streak</h3><p className="font-body-md text-body-md text-on-surface-variant">Your momentum is building.</p></div></div></div></div>);}

function QuickLogs({items,onToggle}){const icons={exercise:'fitness_center',water:'water_drop',study:'menu_book',abhishekam:'water'};return(<div className="grid grid-cols-2 gap-4 flex-1">{items.map(item=>{const name=item.name||'';const done=item.completed;const icon=icons[name.toLowerCase()]||'check_circle';return(<button key={item.id} onClick={()=>onToggle(item.id)} className={`border-2 border-primary p-4 flex flex-col items-center justify-center gap-3 transition-colors group ${done?'bg-primary text-on-primary woodcut-shadow-sm':'hover:bg-secondary hover:text-on-secondary hover:border-secondary'}`}><span className="material-symbols-outlined text-[32px] group-hover:scale-110 transition-transform" style={{fontVariationSettings:`'FILL' ${done?1:0}`}}>{icon}</span><span className="font-label-sm text-label-sm uppercase text-center">{name}{done?' (Done)':''}</span></button>);})}</div>);}

function JapaRing({item}){
  const GOAL_MIN=60;const[elapsed,setElapsed]=useState(()=>{try{return JSON.parse(localStorage.getItem('sadhana_japa_timer')||'{}').elapsed||0}catch{return 0;}});const[running,setRunning]=useState(false);
  useEffect(()=>{if(!running)return;const id=setInterval(()=>{setElapsed(prev=>{const next=prev+1;localStorage.setItem('sadhana_japa_timer',JSON.stringify({elapsed:next}));return next;});},1000);return()=>clearInterval(id);},[running]);
  const elapsedMin=Math.floor(elapsed/60);const pct=Math.min(100,Math.round((elapsedMin/GOAL_MIN)*100));
  return(<div className="lg:col-span-8 bg-surface border-4 border-primary p-12 flex flex-col items-center justify-center relative woodcut-shadow"><div className="absolute top-4 left-4 bg-primary text-on-primary px-2 py-1 font-label-sm text-label-sm uppercase">JAPA MEDITATION</div><div className="relative w-80 h-80 flex items-center justify-center mt-6"><svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100"><circle cx="50" cy="50" fill="none" r="45" stroke="#e2e2e2" strokeWidth="4"/><circle cx="50" cy="50" fill="none" r="45" stroke="#000000" strokeDasharray="283" strokeDashoffset={283-(pct/100)*283} strokeWidth="8" className="transition-all duration-1000 ease-out"/></svg><div className="absolute flex flex-col items-center text-center"><span className="font-headline-lg text-headline-lg text-primary tracking-tighter">{elapsedMin}</span><span className="font-label-sm text-label-sm uppercase border-t-2 border-primary pt-1 mt-1">/ {GOAL_MIN} MIN</span></div></div><button onClick={()=>setRunning(!running)} className="mt-12 bg-primary text-on-primary border-4 border-primary px-12 py-4 font-headline-sm text-headline-sm uppercase tracking-widest hover:bg-secondary hover:border-secondary transition-colors woodcut-shadow-sm group">{running?'Pause':elapsed>0?'Resume':'Begin'}<span className="material-symbols-outlined ml-2 align-middle group-hover:translate-x-1 transition-transform">arrow_forward</span></button></div>);
}