import { useState, useEffect, useCallback } from 'react';
import { api } from '../api';

export default function AkyScreen({ onClose }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchItems = useCallback(async () => {
    try {
      const data = await api.getItems();
      setItems(data.items.filter(i =>
        !(i.name || '').toLowerCase().includes('japa') &&
        !['exercise', 'water', 'study', 'abhishekam'].includes((i.name || '').toLowerCase())
      ));
    } catch (err) { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const handleToggle = async (itemId) => {
    setItems(prev => prev.map(i =>
      i.id === itemId ? { ...i, completed: !i.completed } : i
    ));
    try { await api.toggleItem(itemId); } catch {
      setItems(prev => prev.map(i =>
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

  const done = items.filter(i => i.completed).length;
  const total = items.length || 12;

  const groups = {};
  for (const item of items) {
    const cat = item.category || 'other';
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(item);
  }

  const categoryMeta = {
    pranayama: { label: 'Pranayama', roman: 'I' },
    kriya: { label: 'Core Kriya', roman: 'II' },
    mudras: { label: 'Mudras & Asanas', roman: 'III' },
    meditation: { label: 'Meditation', roman: 'IV' },
    advanced: { label: 'Advanced', roman: 'V' },
  };

  return (
    <>
      <div className="lg:hidden space-y-5">
        <div>
          <button onClick={onClose} className="text-xs text-mute uppercase tracking-widest font-bold mb-1 block hover:text-ink">
            ← Today
          </button>
          <h2 className="text-2xl font-display font-black text-ink">Atma Kriya Yoga</h2>
        </div>
        {renderSections(groups, categoryMeta, handleToggle)}
        <button className="btn-wood w-full text-[11px]">COMPLETE SESSION</button>
      </div>

      <div className="hidden lg:block max-w-4xl mx-auto">
        <div className="flex items-start justify-between mb-6">
          <div>
            <button onClick={onClose} className="text-xs text-mute uppercase tracking-widest font-bold mb-1 block hover:text-ink">
              ← Back to Today
            </button>
            <h2 className="text-3xl font-display font-black text-ink">Atma Kriya Yoga</h2>
            <p className="text-xs text-mute mt-1">Daily Practice Routine</p>
          </div>
          <div className="text-right">
            <span className="text-xs text-mute uppercase tracking-widest font-bold">{done} / {total} Completed</span>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-4">
          {renderDesktopSections(groups, categoryMeta, handleToggle)}
        </div>

        <div className="mt-6 flex justify-end">
          <button className="btn-wood text-[11px] px-8">COMPLETE SESSION →</button>
        </div>
      </div>
    </>
  );
}

function renderSections(groups, meta, onToggle) {
  return Object.entries(groups).map(([cat, groupItems]) => {
    const m = meta[cat] || { label: cat, roman: '' };
    return (
      <div key={cat} className="card-wood p-4">
        <h3 className="text-xs font-display font-bold text-rust uppercase tracking-widest mb-3 pb-2 border-b-2 border-ink">
          {m.roman}. {m.label}
        </h3>
        <div className="space-y-1">
          {groupItems.map(item => (
            <ItemRow key={item.id} item={item} onToggle={onToggle} />
          ))}
        </div>
      </div>
    );
  });
}

function renderDesktopSections(groups, meta, onToggle) {
  return Object.entries(groups).map(([cat, groupItems]) => {
    const m = meta[cat] || { label: cat, roman: '' };
    return (
      <div key={cat} className="card-wood p-5">
        <h3 className="text-xs font-display font-bold text-rust uppercase tracking-widest mb-4 pb-2 border-b-2 border-ink">
          {m.roman}. {m.label}
        </h3>
        <div className="space-y-2">
          {groupItems.map(item => (
            <ItemRowDesktop key={item.id} item={item} onToggle={onToggle} />
          ))}
        </div>
      </div>
    );
  });
}

function ItemRow({ item, onToggle }) {
  const completed = item.completed;
  const isToggle = !item.item_type || item.item_type === 'toggle';
  const isCounter = item.item_type === 'counter';

  return (
    <button
      onClick={() => isToggle ? onToggle(item.id) : null}
      className={`w-full flex items-center justify-between py-2.5 px-2 hover:bg-paper-dark/30 transition-colors ${
        completed ? 'opacity-60' : ''
      }`}
    >
      <div className="flex items-center gap-2">
        <span className="text-sm">{item.emoji || '•'}</span>
        <span className={`text-sm font-medium ${completed ? 'line-through text-mute' : 'text-ink'}`}>
          {item.name}
        </span>
      </div>
      {isToggle ? (
        <div className={`w-5 h-5 border-2 flex items-center justify-center transition-all ${
          completed ? 'bg-sage border-sage' : 'border-mute'
        }`}>
          {completed && (
            <svg className="w-3 h-3 text-paper animate-check-pop" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="square">
              <path d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>
      ) : isCounter ? (
        <Counter />
      ) : (
        <span className="text-xs font-display font-bold text-ink tabular-nums">05:00</span>
      )}
    </button>
  );
}

function ItemRowDesktop({ item, onToggle }) {
  const completed = item.completed;
  const isToggle = !item.item_type || item.item_type === 'toggle';
  const isCounter = item.item_type === 'counter';

  return (
    <div className={`flex items-center justify-between py-3 px-3 hover:bg-paper-dark/30 transition-colors ${
      completed ? 'opacity-60' : ''
    }`}>
      <div className="flex items-center gap-3">
        <div className={`w-5 h-5 border-2 flex items-center justify-center transition-all cursor-pointer ${
          completed ? 'bg-sage border-sage' : 'border-mute'
        }`}
        onClick={() => isToggle ? onToggle(item.id) : null}>
          {completed && (
            <svg className="w-3 h-3 text-paper animate-check-pop" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="square">
              <path d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>
        <div>
          <span className={`text-sm font-medium ${completed ? 'line-through text-mute' : 'text-ink'}`}>
            {item.name}
          </span>
          {item.tag && (
            <span className="ml-2 text-[8px] text-mute uppercase tracking-widest font-bold">{item.tag}</span>
          )}
        </div>
      </div>
      <div>
        {isCounter ? (
          <Counter />
        ) : isToggle ? (
          <div className={`w-6 h-6 border-2 flex items-center justify-center ${
            completed ? 'bg-ink border-ink' : 'border-mute'
          }`}>
            {completed && <span className="text-[11px] text-paper font-bold">✓</span>}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <SunIcon />
            <MoonIcon />
          </div>
        )}
      </div>
    </div>
  );
}

function Counter() {
  return (
    <div className="flex items-center gap-1.5">
      <button className="btn-wood text-[9px] px-2.5 py-1">−</button>
      <span className="text-sm font-bold text-ink tabular-nums w-6 text-center">0</span>
      <button className="btn-wood text-[9px] px-2.5 py-1">+</button>
    </div>
  );
}

function SunIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="12" cy="12" r="5" /><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
    </svg>
  );
}
function MoonIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
    </svg>
  );
}