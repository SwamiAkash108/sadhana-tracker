import { getCounter, isItemPracticedToday } from './sadhanaStorage';

const GREEN = {
  mainKriya: 6,
  trinity: 5,
  suka: 5,
  nadhi: 5,
};

const ORANGE = {
  mainKriya: 1,
};

function findByName(items, name) {
  const lower = name.toLowerCase();
  return items.find(i => (i.name || '').toLowerCase() === lower);
}

export function getAkyCounts(items, date) {
  const mainKriya = findByName(items, 'Main Kriya');
  const secondKriyaItem = findByName(items, 'Kriya Level 2');
  const trinity = findByName(items, 'Trinity Meditation');
  const suka = findByName(items, 'Suka Purvaka');
  const nadhi = findByName(items, 'Nadhi Shuddhi');

  return {
    mainKriya: mainKriya ? getCounter(date, mainKriya.id) : 0,
    secondKriya: secondKriyaItem
      ? isItemPracticedToday(date, secondKriyaItem.id)
      : false,
    trinity: trinity ? getCounter(date, trinity.id) : 0,
    suka: suka ? getCounter(date, suka.id) : 0,
    nadhi: nadhi ? getCounter(date, nadhi.id) : 0,
  };
}

export function getAkySessionLevel(items, date) {
  const c = getAkyCounts(items, date);

  const isGreen =
    c.mainKriya >= GREEN.mainKriya &&
    c.trinity >= GREEN.trinity &&
    c.suka >= GREEN.suka &&
    c.nadhi >= GREEN.nadhi &&
    c.secondKriya;

  if (isGreen) return 'green';

  const isOrange = c.mainKriya >= ORANGE.mainKriya && c.secondKriya;
  if (isOrange) return 'orange';

  return 'none';
}

export function getAkySessionMeta(level) {
  if (level === 'green') {
    return {
      label: 'Full Practice',
      description: 'All core requirements met for today.',
      border: 'border-[#15803d]',
      badge: 'bg-[#15803d] text-white',
      accent: '#15803d',
    };
  }
  if (level === 'orange') {
    return {
      label: 'Partial Practice',
      description: 'Main Kriya started and Second Kriya done.',
      border: 'border-[#ea580c]',
      badge: 'bg-[#ea580c] text-white',
      accent: '#ea580c',
    };
  }
  return {
    label: 'In Progress',
    description: 'Complete Main Kriya + Second Kriya for partial, or all targets for full.',
    border: 'border-primary',
    badge: 'bg-primary text-on-primary',
    accent: '#000000',
  };
}

export function getAkyGreenChecklist(counts) {
  return [
    { label: 'Main Kriya', met: counts.mainKriya >= GREEN.mainKriya, detail: `${counts.mainKriya}/${GREEN.mainKriya} rounds` },
    { label: 'Second Kriya', met: counts.secondKriya, detail: counts.secondKriya ? 'Done' : 'Not done' },
    { label: 'Trinity Meditation', met: counts.trinity >= GREEN.trinity, detail: `${counts.trinity}/${GREEN.trinity} rounds` },
    { label: 'Suka Purvaka', met: counts.suka >= GREEN.suka, detail: `${counts.suka}/${GREEN.suka} rounds` },
    { label: 'Nadhi Shuddhi', met: counts.nadhi >= GREEN.nadhi, detail: `${counts.nadhi}/${GREEN.nadhi} rounds` },
  ];
}

export const AKY_COLORS = { green: '#15803d', orange: '#ea580c' };
