import { useState, useEffect, useCallback } from 'react';
import { api } from '../api';

export default function AkyScreen({ onClose }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchItems = useCallback(async () => {
    try { const data=await api.getItems(); setItems(data.items.filter(i=>!(i.name||'').toLowerCase().includes('japa')&&!['exercise','water','study','abhishekam'].includes((i.name||'').toLowerCase()))); } catch(err){}
    finally{setLoading(false);}
  },[]);

  useEffect(()=>{fetchItems();},[fetchItems]);

  const handleToggle=async(itemId)=>{setItems(prev=>prev.map(i=>i.id===itemId?{...i,completed:!i.completed}:i));try{await api.toggleItem(itemId);}catch{setItems(prev=>prev.map(i=>i.id===itemId?{...i,completed:!i.completed}:i));}};

  if(loading)return<div className="flex justify-center py-20"><div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin"/></div>;

  const done=items.filter(i=>i.completed).length;
  const total=items.length||12;

  const groups={};
  for(const item of items){const cat=item.category||'other';if(!groups[cat])groups[cat]=[];groups[cat].push(item);}

  const CATEGORY_META={pranayama:{label:'Pranayama',roman:'I',icon:'🌬️'},kriya:{label:'Core Kriya',roman:'II',icon:'🔥',accent:true},mudras:{label:'Mudras & Asanas',roman:'III',icon:'🤲'},meditation:{label:'Meditation',roman:'IV',icon:'🧘'},advanced:{label:'Advanced',roman:'V',icon:'⭐',accent:true}};

  return (<div className="max-w-3xl mx-auto space-y-6">
    <div className="flex items-center justify-between">
      <div><button onClick={onClose} className="text-xs text-gray-500 uppercase tracking-widest font-bold mb-1 hover:text-black">← Today</button><h1 className="text-2xl lg:text-3xl font-display font-bold text-black">Atma Kriya Yoga</h1></div>
      <div className="text-right"><span className="text-xs text-gray-500 uppercase tracking-widest font-bold">{done}/{total} Completed</span></div>
    </div>
    {Object.entries(groups).map(([cat,gItems])=>{const meta=CATEGORY_META[cat]||{label:cat,roman:'',icon:'•'};
      return(<section key={cat} className="flex flex-col gap-3"><h3 className={`text-lg font-display font-bold flex items-center gap-2 pb-2 border-b-2 border-black ${meta.accent?'text-[#b22a27]':'text-black'}`}><span>{meta.icon}</span>{meta.roman}. {meta.label}</h3><div className="flex flex-col gap-3">{gItems.map(item=><PracticeCard key={item.id} item={item} onToggle={handleToggle}/>)}</div></section>);
    })}
    <button className="btn-woodcut w-full py-4 bg-black text-white text-xl font-display font-bold uppercase tracking-wider relative overflow-hidden group"><div className="absolute inset-0 bg-halftone opacity-0 group-hover:opacity-20 transition-opacity"/><span className="relative z-10">Complete Session</span></button>
  </div>);
}

function PracticeCard({item,onToggle}){
  const completed=item.completed;
  const isToggle=!item.item_type||item.item_type==='toggle';
  const isCounter=item.item_type==='counter';
  const isTimer=item.item_type==='timer';
  const isKriya=(item.name||'').toLowerCase().includes('main kriya');
  if(isKriya)return<KriyaCard item={item} onToggle={onToggle}/>;
  return(<div className={`card-woodcut p-4 flex justify-between items-center relative overflow-hidden group hover:bg-gray-50/50 transition-colors ${completed?'opacity-60':''}`}>
    <div className="absolute right-0 top-0 h-full w-16 bg-halftone opacity-10"/>
    <div className="flex flex-col z-10"><span className="text-[10px] bg-black text-white px-2 py-0.5 w-fit uppercase mb-1 font-bold">{item.category||'Practice'}</span><h4 className="text-base font-bold text-black">{item.name}</h4></div>
    <div className="flex items-center gap-4 z-10">
      {isCounter&&<CounterControls/>}
      {isToggle&&<button onClick={()=>onToggle(item.id)} className={`w-6 h-6 border-2 border-black flex items-center justify-center transition-all ${completed?'bg-[#b22a27] border-[#b22a27]':''}`}>{completed&&<span className="text-white text-sm font-bold">✓</span>}</button>}
      {isTimer&&<TimerDisplay/>}
      {item.am_pm?<AmPmToggles/>:null}
    </div>
  </div>);
}

function KriyaCard({item}){
  return(<div className={`card-woodcut p-6 flex flex-col items-center gap-5 relative overflow-hidden ${item.completed?'border-[#b22a27]':''}`}>
    <div className="absolute inset-0 bg-halftone opacity-5 pointer-events-none"/>
    <h4 className="text-2xl font-display font-bold text-center z-10">Main Kriya</h4>
    <div className="flex gap-8 z-10">
      <KriyaSession label="AM Session"/>
      <KriyaSession label="PM Session"/>
    </div>
  </div>);
}

function KriyaSession({label}){
  return(<div className="flex flex-col items-center gap-2"><span className="text-[10px] uppercase tracking-widest font-bold">{label}</span><div className="relative w-20 h-20 flex items-center justify-center"><svg className="w-full h-full -rotate-90 absolute" viewBox="0 0 100 100"><circle cx="50" cy="50" fill="none" r="45" stroke="#e5e2e1" strokeWidth="8"/></svg><span className="text-xl font-display font-bold">0</span></div><div className="flex gap-2"><button className="w-7 h-7 border-2 border-black flex items-center justify-center text-sm">−</button><button className="w-7 h-7 border-2 border-black bg-black text-white flex items-center justify-center text-sm">+</button></div></div>);
}

function CounterControls(){return(<div className="flex items-center gap-2"><button className="w-7 h-7 border-2 border-black flex items-center justify-center text-sm hover:bg-black hover:text-white transition-colors">−</button><span className="text-sm font-bold w-6 text-center tabular-nums">0</span><button className="w-7 h-7 border-2 border-black bg-black text-white flex items-center justify-center text-sm hover:bg-[#b22a27] transition-colors">+</button></div>);}

function TimerDisplay(){return(<button className="px-3 py-1.5 bg-black text-white text-[10px] uppercase tracking-widest font-bold border-2 border-black hover:bg-white hover:text-black transition-colors flex items-center gap-1"><span>▶</span> 05:00</button>);}

function AmPmToggles(){return(<div className="flex items-center gap-3"><label className="flex flex-col items-center gap-0.5 cursor-pointer"><span className="text-[9px] uppercase font-bold">AM</span><div className="w-7 h-7 border-2 border-black flex items-center justify-center"><span className="text-xs">☀️</span></div></label><label className="flex flex-col items-center gap-0.5 cursor-pointer"><span className="text-[9px] uppercase font-bold">PM</span><div className="w-7 h-7 border-2 border-black flex items-center justify-center"><span className="text-xs">🌙</span></div></label></div>);}