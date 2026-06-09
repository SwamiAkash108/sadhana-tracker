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

/** Push local timer/counter progress to the server when goals are met. */
export async function syncLocalPillarsToServer(checklist, date) {
  if (!date || !checklist.length) return checklist;

  let next = checklist;

  const ensureComplete = async (item, localMet) => {
    if (!item || !localMet) return;
    try {
      await api.completeItem(item.id);
      next = next.map(i => (i.id === item.id ? { ...i, completed: true } : i));
    } catch {
      /* retry on next load or visibility */
    }
  };

  const quickItems = checklist.filter(i => (i.category || '').toLowerCase() === 'quick');
  const japaItem = checklist.find(i => (i.category || '').toLowerCase() === 'japa');
  const waterItem = quickItems.find(i => (i.name || '').toLowerCase() === 'water');
  const exerciseItem = quickItems.find(i => (i.name || '').toLowerCase() === 'exercise');

  const japaState = getJapaState(date);
  if (japaState.elapsed >= JAPA_GOAL_SEC) {
    await ensureComplete(japaItem, true);
  }

  if (isWaterGoalMet(getWaterState(date))) {
    await ensureComplete(waterItem, true);
  }

  const exerciseState = getExerciseState(date);
  const exerciseMet =
    isExerciseGoalMet(exerciseState.elapsed) || isPushupGoalMet(exerciseState.pushups);
  await ensureComplete(exerciseItem, exerciseMet);

  return next;
}
