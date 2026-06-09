import { getDayStatus } from './dayCompletion';
import { getSadhanaDate, enumerateDates, getRecentDates, getMonthBounds } from './sadhanaDate';
import { getAllActivityDates } from './sadhanaStorage';

export function buildStatusByDate(items, progressByDate) {
  const statusByDate = {};
  const dates = new Set([
    ...Object.keys(progressByDate || {}),
    ...getAllActivityDates(),
  ]);

  for (const date of dates) {
    statusByDate[date] = getDayStatus({
      items,
      date,
      completedIds: progressByDate[date] || [],
    }).status;
  }

  return statusByDate;
}

export function isStreakDay(status) {
  return status === 'orange' || status === 'green';
}

export function computeCurrentStreak(statusByDate, today = getSadhanaDate(), windowDays = 30) {
  const dates = getRecentDates(windowDays, today);
  let streak = 0;

  for (let i = dates.length - 1; i >= 0; i--) {
    const date = dates[i];
    if (isStreakDay(statusByDate[date])) {
      streak++;
    } else if (date !== today) {
      break;
    }
  }

  return streak;
}

export function computeLongestStreak(statusByDate, today = getSadhanaDate()) {
  const datesWithData = Object.keys(statusByDate);
  if (datesWithData.length === 0) return { longest: 0, endDate: '' };

  const sorted = [...datesWithData].sort();
  const allDates = enumerateDates(sorted[0], today);

  let longest = 0;
  let current = 0;
  let longestEndDate = '';

  for (const date of allDates) {
    if (isStreakDay(statusByDate[date])) {
      current++;
      if (current > longest) {
        longest = current;
        longestEndDate = date;
      }
    } else {
      current = 0;
    }
  }

  return { longest, endDate: longestEndDate };
}

export function getMonthDayStatuses(statusByDate, year, month) {
  const { start, end } = getMonthBounds(year, month);

  return enumerateDates(start, end).map(date => ({
    date,
    status: statusByDate[date] || 'none',
  }));
}
