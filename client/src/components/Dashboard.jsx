import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import TodayScreen from './TodayScreen';
import ProgressScreen from './ProgressScreen';
import TeamScreen from './TeamScreen';
import AkyScreen from './AkyScreen';

const TABS=[{key:'today',label:'Today',icon:'calendar_today'},{key:'progress',label:'Progress',icon:'insights'},{key:'community',label:'Community',icon:'groups'}];

export default function Dashboard(){
  const{user,logout}=useAuth();
  const[tab,setTab]=useState('today');
  const[showAky,setShowAky]=useState(false);
  const handleStartJapa=()=>{setTab('today');setShowAky(false);};
  const topBarTitle=tab==='today'?'Daily Tracker':tab==='progress'?'My Progress':'Sangha';

  return(<div className="min-h-screen flex">
    <nav className="sidebar">
      <div className="p-6 border-b-4 border-primary"><h1 className="font-headline-md text-headline-md font-bold tracking-tighter text-primary uppercase">SADHANA</h1><p className="font-label-sm text-label-sm mt-1 uppercase text-on-surface-variant">Atma Kriya Path</p></div>
      <div className="flex-1 py-6 flex flex-col gap-2">
        {TABS.map(t=>{const active=tab===t.key;return(<button key={t.key} onClick={()=>{setTab(t.key);setShowAky(false);}} className={`flex items-center gap-3 px-4 py-3 mx-4 transition-colors font-label-sm text-label-sm uppercase tracking-wide ${active?'bg-secondary text-on-secondary font-bold border-b-2 border-primary':'text-on-surface hover:bg-surface-variant border border-transparent hover:border-outline'}`}><span className="material-symbols-outlined" style={{fontVariationSettings:`'FILL' ${active?1:0}`}}>{t.icon}</span><span>{t.label}</span></button>);})}
      </div>
      <div className="p-4 border-t-4 border-primary">
        <button onClick={handleStartJapa} className="w-full bg-primary text-on-primary border-2 border-primary py-3 font-label-sm text-label-sm uppercase tracking-wider hover:bg-secondary hover:border-secondary transition-colors woodcut-shadow-sm mb-4">START JAPA</button>
        <button onClick={()=>{setShowAky(false);}} className="flex items-center gap-3 px-4 py-3 text-on-surface hover:bg-surface-variant transition-colors border border-transparent hover:border-outline w-full font-label-sm text-label-sm uppercase tracking-wide"><span className="material-symbols-outlined">settings</span><span>Settings</span></button>
      </div>
    </nav>
    <header className="topbar"><div className="font-headline-sm text-headline-sm font-bold text-primary uppercase tracking-tight">{topBarTitle}</div><div className="flex items-center gap-4 text-primary"><button className="p-2 hover:bg-surface-variant rounded-full transition-colors"><span className="material-symbols-outlined hover:text-secondary">notifications</span></button><button onClick={logout} className="p-2 hover:bg-surface-variant rounded-full transition-colors"><span className="material-symbols-outlined hover:text-secondary">account_circle</span></button></div></header>
    <main className="main-canvas relative"><div className="absolute inset-0 halftone-bg opacity-[0.03] pointer-events-none"/><div className="max-w-7xl mx-auto relative z-10">{showAky?<AkyScreen onClose={()=>setShowAky(false)}/>:<>{tab==='today'&&<TodayScreen user={user} onOpenAky={()=>setShowAky(true)}/>}{tab==='progress'&&<ProgressScreen user={user}/>}{tab==='community'&&<TeamScreen/>}</>}</div></main>
  </div>);
}