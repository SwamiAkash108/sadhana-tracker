const MAX_STREAK_FREEZES = 3;
const STARTING_STREAK_FREEZES = 2;
const FREEZE_EARN_EVERY_DAYS = 5;

function addDays(dateStr, delta) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + delta));
  return dt.toISOString().slice(0, 10);
}

function isStreakDayStatus(status) {
  return status === 'orange' || status === 'green';
}

function computeStreakWithFreezes(statusByDate, frozenDates, today, windowDays = 90) {
  const frozen = frozenDates instanceof Set ? frozenDates : new Set(frozenDates || []);
  const dates = [];
  for (let i = windowDays - 1; i >= 0; i--) {
    dates.push(addDays(today, -i));
  }

  let streak = 0;
  for (let i = dates.length - 1; i >= 0; i--) {
    const date = dates[i];
    if (isStreakDayStatus(statusByDate[date])) {
      streak++;
    } else if (frozen.has(date)) {
      continue;
    } else if (date === today) {
      continue;
    } else {
      break;
    }
  }
  return streak;
}

function daysUntilNextFreeze(streakLength) {
  if (streakLength <= 0) return FREEZE_EARN_EVERY_DAYS;
  const rem = streakLength % FREEZE_EARN_EVERY_DAYS;
  return rem === 0 ? FREEZE_EARN_EVERY_DAYS : FREEZE_EARN_EVERY_DAYS - rem;
}

async function getUserFreezeRow(db, userId) {
  const result = await db.execute(
    'SELECT streak_freeze_count, streak_freeze_milestone FROM users WHERE id = ?',
    [userId]
  );
  const row = result.rows[0];
  return {
    count: Math.min(MAX_STREAK_FREEZES, Number(row?.streak_freeze_count ?? STARTING_STREAK_FREEZES)),
    milestone: Number(row?.streak_freeze_milestone ?? 0),
  };
}

async function setUserFreezeCount(db, userId, count, milestone) {
  await db.execute(
    'UPDATE users SET streak_freeze_count = ?, streak_freeze_milestone = ? WHERE id = ?',
    [Math.min(MAX_STREAK_FREEZES, Math.max(0, count)), milestone, userId]
  );
}

async function getFrozenDates(db, userId) {
  const result = await db.execute(
    'SELECT protected_date FROM streak_freeze_uses WHERE user_id = ? ORDER BY protected_date ASC',
    [userId]
  );
  return result.rows.map(r => r.protected_date);
}

async function awardFreezesForStreak(db, userId, streakLength) {
  const { count, milestone } = await getUserFreezeRow(db, userId);
  const earnedTier = Math.floor(streakLength / FREEZE_EARN_EVERY_DAYS);
  const paidTier = Math.floor(milestone / FREEZE_EARN_EVERY_DAYS);
  if (earnedTier <= paidTier || count >= MAX_STREAK_FREEZES) {
    return { awarded: 0, count, milestone };
  }
  const slots = earnedTier - paidTier;
  const toAdd = Math.min(slots, MAX_STREAK_FREEZES - count);
  const newCount = count + toAdd;
  const newMilestone = earnedTier * FREEZE_EARN_EVERY_DAYS;
  await setUserFreezeCount(db, userId, newCount, newMilestone);
  return { awarded: toAdd, count: newCount, milestone: newMilestone };
}

async function applyFreezeForDate(db, userId, date) {
  const { count } = await getUserFreezeRow(db, userId);
  if (count <= 0) return false;

  const existing = await db.execute(
    'SELECT 1 FROM streak_freeze_uses WHERE user_id = ? AND protected_date = ?',
    [userId, date]
  );
  if (existing.rows[0]) return false;

  await db.execute(
    'INSERT INTO streak_freeze_uses (user_id, protected_date) VALUES (?, ?)',
    [userId, date]
  );
  await setUserFreezeCount(db, userId, count - 1, (await getUserFreezeRow(db, userId)).milestone);
  return true;
}

async function tryAutoFreezeYesterday(db, userId, statusByDate, today) {
  const yesterday = addDays(today, -1);
  if (isStreakDayStatus(statusByDate[yesterday])) return null;

  const frozen = await getFrozenDates(db, userId);
  if (frozen.includes(yesterday)) return null;

  const frozenSet = new Set(frozen);
  const streakBeforeMiss = computeStreakWithFreezes(statusByDate, frozenSet, yesterday, 90);
  if (streakBeforeMiss <= 0) return null;

  const applied = await applyFreezeForDate(db, userId, yesterday);
  return applied ? yesterday : null;
}

module.exports = {
  MAX_STREAK_FREEZES,
  STARTING_STREAK_FREEZES,
  FREEZE_EARN_EVERY_DAYS,
  addDays,
  isStreakDayStatus,
  computeStreakWithFreezes,
  daysUntilNextFreeze,
  getUserFreezeRow,
  setUserFreezeCount,
  getFrozenDates,
  awardFreezesForStreak,
  applyFreezeForDate,
  tryAutoFreezeYesterday,
};
