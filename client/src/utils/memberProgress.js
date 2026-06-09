const PILLAR_ICONS = {
  aky: '🧘',
  japa: '📿',
  water: '💧',
  exercise: '🏃',
  study: '📖',
  abhishekam: '🪷',
};

export function getMemberMotivationalDisplay(member) {
  const dayComplete = !!member.dayComplete;
  const akyLevel = member.akyLevel || 'none';
  const pillarsMet = member.pillarsMet ?? 0;
  const pillarsTotal = member.pillarsTotal ?? 6;

  if (dayComplete && akyLevel === 'green') {
    return {
      displayPct: 108,
      ringPct: 100,
      color: '#15803d',
      statusLabel: 'Full Practice',
      badge: 'Complete',
      badgeClass: 'bg-[#15803d] text-white border-[#15803d]',
      message: '108% — full sadhana today',
    };
  }

  if (dayComplete) {
    return {
      displayPct: 100,
      ringPct: 100,
      color: '#ea580c',
      statusLabel: 'Partial Practice',
      badge: 'Partial',
      badgeClass: 'bg-[#ea580c] text-white border-[#ea580c]',
      message: '100% — all pillars met',
    };
  }

  const ringPct = pillarsTotal > 0 ? Math.round((pillarsMet / pillarsTotal) * 100) : 0;

  return {
    displayPct: ringPct,
    ringPct,
    color: ringPct > 0 ? '#b22a27' : '#cfc4c5',
    statusLabel: pillarsMet > 0 ? 'In Progress' : 'Awaiting',
    badge: pillarsMet > 0 ? 'Partial' : 'Awaiting',
    badgeClass: pillarsMet > 0
      ? 'bg-secondary text-on-secondary border-secondary'
      : 'text-on-surface-variant border-outline-variant',
    message: `${pillarsMet}/${pillarsTotal} pillars`,
  };
}

export function getMemberPillarRows(member) {
  const pillars = member.pillars || [];

  return pillars.map(pillar => ({
    key: pillar.key,
    icon: PILLAR_ICONS[pillar.key] || '○',
    label: pillar.label,
    val: pillar.key === 'japa'
      ? (pillar.met ? '60m' : '--')
      : (pillar.met ? '✓' : '--'),
    met: pillar.met,
  }));
}

export function getMemberOptionalItems(member) {
  return (member.items || []).filter(i => {
    const c = (i.category || '').toLowerCase();
    const n = (i.name || '').toLowerCase();
    if (c === 'custom') return true;
    return c === 'quick' && (n === 'music' || n === 'morning mantras');
  });
}
