import { getAkySessionLevel } from './akyCompletion';
import {
  getJapaState,
  getWaterGlasses,
  isWaterGoalMet,
  getExerciseState,
  isExerciseGoalMet,
  isPushupGoalMet,
} from './sadhanaStorage';

export const JAPA_GOAL_SEC = 60 * 60;
export const DAY_PILLAR_COUNT = 6;

export function getDayPillars({ checklist, date }) {
  const akyItems = checklist.filter(i => {
    const c = (i.category || '').toLowerCase();
    return c !== 'quick' && c !== 'japa';
  });
  const quickItems = checklist.filter(i => (i.category || '').toLowerCase() === 'quick');
  const japaItem = checklist.find(i => (i.category || '').toLowerCase() === 'japa');
  const waterItem = quickItems.find(i => (i.name || '').toLowerCase() === 'water');
  const exerciseItem = quickItems.find(i => (i.name || '').toLowerCase() === 'exercise');
  const studyItem = quickItems.find(i => (i.name || '').toLowerCase() === 'study');
  const abhishekamItem = quickItems.find(i => (i.name || '').toLowerCase() === 'abhishekam');

  const akyLevel = getAkySessionLevel(akyItems, date);
  const akyMet = akyLevel === 'orange' || akyLevel === 'green';

  const japaState = getJapaState(date);
  const japaMet = japaState.elapsed >= JAPA_GOAL_SEC || !!japaItem?.completed;

  const waterMet = isWaterGoalMet(getWaterGlasses(date)) || !!waterItem?.completed;

  const exerciseState = getExerciseState(date);
  const exerciseMet =
    isExerciseGoalMet(exerciseState.elapsed) ||
    isPushupGoalMet(exerciseState.pushups) ||
    !!exerciseItem?.completed;

  const studyMet = !!studyItem?.completed;
  const abhishekamMet = !!abhishekamItem?.completed;

  const pillars = [
    { key: 'aky', label: 'Atma Kriya', detail: 'Orange level minimum', met: akyMet },
    { key: 'japa', label: 'Japa', detail: '60 minutes', met: japaMet },
    { key: 'water', label: 'Water', detail: '2 litres', met: waterMet },
    { key: 'exercise', label: 'Exercise', detail: '10 minutes', met: exerciseMet },
    { key: 'study', label: 'Study', detail: null, met: studyMet },
    { key: 'abhishekam', label: 'Abhishekam', detail: null, met: abhishekamMet },
  ];

  const metCount = pillars.filter(p => p.met).length;

  return {
    pillars,
    metCount,
    total: DAY_PILLAR_COUNT,
    pct: Math.round((metCount / DAY_PILLAR_COUNT) * 100),
    complete: metCount === DAY_PILLAR_COUNT,
  };
}

export function isDayComplete(params) {
  return getDayPillars(params).complete;
}
