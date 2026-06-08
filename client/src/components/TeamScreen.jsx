import { useState, useEffect, useCallback } from 'react';
import { api } from '../api';

export default function TeamScreen() {
  const [team, setTeam] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchTeam = useCallback(async () => {
    try { const data = await api.getTeam(); setTeam(data); } catch (err) {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchTeam(); }, [fetchTeam]);

  if (loading) return <div className="flex justify-center py-20"><div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin"/></div>;

  const members = team?.members || [];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="mb-6">
        <h2 className="text-4xl font-display font-bold text-black border-b-4 border-black inline-block pr-8 pb-2">Sangha</h2>
        <p className="text-sm text-gray-500 mt-3 max-w-xl leading-relaxed">
          Observe the discipline of your fellow practitioners. The path is solitary, yet we walk together.
        </p>
      </div>
      {members.length===0?(
        <div className="card-woodcut p-12 text-center"><p className="text-base text-gray-500">No members yet. Invite your sangha to walk the path together.</p></div>
      ):(<div className="grid md:grid-cols-2 gap-6">{members.map(m=><MemberCard key={m.id} member={m}/>)}</div>)}
    </div>
  );
}

function MemberCard({ member }) {
  const pct=member.percentage||0;
  const isDone=pct>=100,isPartial=pct>0&&pct<100,isResting=pct===0;
  const stats=[
    {icon:'📿',label:'Japa',value:isResting?'--':isDone?'42m':'--',done:isDone},
    {icon:'🧘',label:'AKY',value:isResting?'--':`${member.completed||0}/${member.total||0}`,done:isDone},
    {icon:'🏃',label:'Exercise',value:isDone?'✅':isPartial?'➖':'➖',done:isDone},
    {icon:'💧',label:'Water',value:isDone?'✅':isPartial?'➖':'➖',done:isDone},
    {icon:'📖',label:'Study',value:isDone?'✅':isPartial?'➖':'➖',done:isDone},
    {icon:'🪷',label:'Abhishekam',value:isDone?'✅':isPartial?'➖':'➖',done:isDone},
  ];
  return (
    <article className={`card-woodcut p-5 relative group ${isResting?'opacity-75':''}`}>
      <div className="absolute inset-0 bg-black translate-x-1 translate-y-1 -z-10"/>
      <header className="flex justify-between items-center mb-4 border-b border-black pb-2">
        <h3 className="text-xl font-display font-bold text-black flex items-center gap-2">{member.name}{isDone&&<span className="text-[#b22a27] text-base">★</span>}</h3>
        <span className={`text-[10px] uppercase tracking-widest font-bold px-2 py-1 ${isDone?'bg-black text-white':isPartial?'bg-[#b22a27] text-white':'bg-gray-300 text-gray-600'}`}>{isDone?'Active':isPartial?'Partial':'Resting'}</span>
      </header>
      <div className={`grid grid-cols-3 sm:grid-cols-6 gap-3 text-[11px] ${isResting?'grayscale':''}`}>
        {stats.map(s=>(<div key={s.label} className="flex items-center gap-1.5 border border-black p-2 bg-white"><span className={`text-base ${isResting?'opacity-50':''}`}>{s.icon}</span><div className="flex flex-col min-w-0"><span className={`text-[9px] uppercase tracking-wider ${isResting?'text-gray-400':'text-gray-500'}`}>{s.label}</span><span className={`font-bold ${s.done?'text-[#b22a27]':isResting?'text-gray-400':'text-black'}`}>{s.value}</span></div></div>))}
      </div>
    </article>
  );
}