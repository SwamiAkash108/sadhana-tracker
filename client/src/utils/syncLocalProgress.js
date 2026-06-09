import { api } from '../api';
import {
  getExerciseState,
  getJapaState,
  getWaterState,
  isExerciseGoalMet,
  isPushupGoalMet,
  isWaterGoalMet,
} from './sadhanaStorage';
import { JAPA_GOAL_SEC } from './dayCompletion';

/** Push local timer/counter progress to the server when goals are met but toggles aren't saved yet. */
export async function syncLocalPillarsToServer(checklist, date) {
  if (!date || !checklist.length) return checklist;

  let next = checklist;

  const markComplete = async (item) => {
    if (!item || item.completed) return;
    try {
      await api.toggleItem(item.id);
      next = next.map(i => (i.id === item.id ? { ...i, completed: true } : i));
    } catch {
      /* keep local UI; will retry on next load */
    }
  };

  const quickItems = checklist.filter(i => (i.category || '').toLowerCase() === 'quick');
  const japaItem = checklist.find(i => (i.category || '').toLowerCase() === 'japa');
  const waterItem = quickItems.find(i => (i.name || '').toLowerCase() === 'water');
  const exerciseItem = quickItems.find(i => (i.name || '').toLowerCase() === 'exercise');

  const japaState = getJapaState(date);
  if (japaState.elapsed >= JAPA_GOAL_SEC) {
    await markComplete(japaItem);
  }

  if (isWaterGoalMet(getWaterState(date))) {
    await markComplete(waterItem);
  }

  const exerciseState = getExerciseState(date);
  if (isExerciseGoalMet(exerciseState.elapsed) || isPushupGoalMet(exerciseState.pushups)) {
    await markComplete(exerciseItem);
  }

  return next;
}
