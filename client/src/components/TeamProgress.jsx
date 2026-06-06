import { useState, useEffect, useCallback } from 'react';
import { api } from '../api';

export default function TeamProgress() {
  const [team, setTeam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [userHistory, setUserHistory] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  const fetchTeam = useCallback(async () => {
    try {
      const data = await api.getTeam();
      setTeam(data);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTeam(); }, [fetchTeam]);

  const handleUserClick = async (user) => {
    if (selectedUser?.id === user.id) {
      setSelectedUser(null);
      setUserHistory(null);
      return;
    }
    setSelectedUser(user);
    setHistoryLoading(true);
    try {
      const data = await api.getUserHistory(user.id, 7);
      setUserHistory(data);
    } catch {
      setUserHistory(null);
    } finally {
      setHistoryLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-5 h-5 border-2 border-ink border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="card-paper p-6 text-center">
        <p className="text-sm text-brick mb-3">{error}</p>
        <button onClick={fetchTeam} className="btn-secondary">Retry</button>
      </div>
    );
  }

  if (!team) return null;

  return (
    <div className="space-y-5">
      <div className="card-paper p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-display text-deepink">Team Progress</h2>
          <span className="badge">{team.members.length} members</span>
        </div>
        <p className="text-xs text-walnut">
          {new Date(team.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
      </div>

      <div className="space-y-2">
        {team.members.length === 0 ? (
          <div className="card-paper p-8 text-center">
            <p className="text-3xl mb-2">🕉️</p>
            <p className="text-sm text-walnut">No other members yet. Invite someone to join!</p>
          </div>
        ) : (
          team.members.map(member => {
            const pct = member.percentage;
            let statusColor = 'bg-stone';
            if (pct === 100) statusColor = 'bg-forest';
            else if (pct >= 50) statusColor = 'bg-amber';
            else if (pct > 0) statusColor = 'bg-ink';
            const isSelected = selectedUser?.id === member.id;
            return (
              <div key={member.id}>
                <button
                  onClick={() => handleUserClick(member)}
                  className={`w-full card-paper p-4 text-left transition-all duration-200 hover:shadow-warm ${
                    isSelected ? 'ring-1 ring-ink/20' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-linen border border-sand flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-medium text-ink">
                        {member.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-ink truncate">{member.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 progress-bar max-w-[120px]">
                          <div
                            className={`progress-bar-fill ${statusColor}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-[11px] text-walnut tabular-nums">
                          {member.completed}/{member.total}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={`text-sm font-medium tabular-nums ${pct === 100 ? 'text-forest' : 'text-bark'}`}>
                        {pct}%
                      </span>
                      {pct === 100 && <span className="text-sm">✅</span>}
                    </div>
                  </div>
                </button>
                {isSelected && (
                  <div className="ml-4 pl-4 border-l-2 border-sand/60 mt-2 mb-2 animate-slide-up">
                    {historyLoading ? (
                      <div className="py-3 flex justify-center">
                        <div className="w-4 h-4 border-2 border-ink border-t-transparent rounded-full animate-spin" />
                      </div>
                    ) : userHistory ? (
                      <div className="space-y-1.5 py-2">
                        {userHistory.history.map(day => {
                          const dayDone = day.items.filter(i => i.completed).length;
                          const dayPct = day.items.length > 0 ? Math.round((dayDone / day.items.length) * 100) : 0;
                          return (
                            <div key={day.date} className="flex items-center gap-2 text-xs">
                              <span className="text-walnut w-8 flex-shrink-0">
                                {new Date(day.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short' })}
                              </span>
                              <div className="flex-1 progress-bar">
                                <div
                                  className={`progress-bar-fill ${dayPct === 100 ? 'bg-forest' : 'bg-ink'}`}
                                  style={{ width: `${dayPct}%` }}
                                />
                              </div>
                              <span className="text-walnut tabular-nums w-10 text-right">
                                {dayDone}/{day.items.length}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-xs text-walnut py-2">Could not load history.</p>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}