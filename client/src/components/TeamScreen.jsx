import { useState, useEffect, useCallback } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';

export default function TeamScreen() {
  const { user } = useAuth();
  const [team, setTeam] = useState(null);
  const [requests, setRequests] = useState({ incoming: [], outgoing: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [practitioners, setPractitioners] = useState([]);
  const [directoryError, setDirectoryError] = useState('');
  const [actionId, setActionId] = useState(null);
  const [requestsError, setRequestsError] = useState('');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    let teamError = '';

    try {
      const teamData = await api.getTeam();
      setTeam(teamData);
    } catch (err) {
      teamError = err.message;
      setTeam(null);
    }

    try {
      const requestData = await api.getFriendRequests();
      setRequests(requestData);
      setRequestsError('');
    } catch (err) {
      setRequests({ incoming: [], outgoing: [] });
      setRequestsError(err.message);
    }

    try {
      const directoryData = await api.listPractitioners();
      setPractitioners(directoryData.users || []);
      setDirectoryError('');
    } catch (err) {
      setPractitioners([]);
      setDirectoryError(err.message);
    }

    setError(teamError);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const refreshDirectory = async () => {
    const directoryData = await api.listPractitioners();
    setPractitioners(directoryData.users || []);
  };

  const handleSendRequest = async (userId) => {
    setActionId(userId);
    try {
      await api.sendFriendRequest(userId);
      const requestData = await api.getFriendRequests();
      setRequests(requestData);
      await refreshDirectory();
      await fetchAll();
    } catch (err) {
      setDirectoryError(err.message);
    } finally {
      setActionId(null);
    }
  };

  const handleAccept = async (requestId) => {
    setActionId(requestId);
    try {
      await api.acceptFriendRequest(requestId);
      await fetchAll();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionId(null);
    }
  };

  const handleDecline = async (requestId) => {
    setActionId(requestId);
    try {
      await api.declineFriendRequest(requestId);
      const requestData = await api.getFriendRequests();
      setRequests(requestData);
    } catch (err) {
      setError(err.message);
    } finally {
      setActionId(null);
    }
  };

  const handleRemoveFriend = async (userId) => {
    setActionId(userId);
    try {
      await api.removeFriend(userId);
      await fetchAll();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error && !team) {
    return (
      <div className="bg-surface border-4 border-primary woodcut-shadow p-8 text-center">
        <p className="font-body-md text-body-md text-secondary mb-4">{error}</p>
        <button onClick={fetchAll} className="btn-woodcut px-6 py-3">Retry</button>
      </div>
    );
  }

  const members = team?.members || [];
  const friends = members.filter(m => m.id !== user?.id);
  const incoming = requests.incoming || [];
  const outgoing = requests.outgoing || [];
  const pendingCount = incoming.length + outgoing.length;
  const incomingByUserId = Object.fromEntries(incoming.map(r => [r.user_id, r.id]));

  const q = searchQuery.trim().toLowerCase();
  const filteredPractitioners = q
    ? practitioners.filter(u =>
        u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
      )
    : practitioners;

  return (
    <div className="space-y-10">
      <div className="border-b-4 border-primary pb-6 relative">
        <div className="absolute inset-0 halftone-bg opacity-10 -z-10" />
        <h2 className="font-headline-xl text-headline-xl text-primary mb-2">Sangha</h2>
        <p className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest bg-black text-white inline-block px-3 py-1">
          {friends.length} Sangha member{friends.length !== 1 ? 's' : ''}
        </p>
      </div>

      <section>
        <h3 className="font-headline-sm text-headline-sm uppercase mb-4">Today&apos;s Practice</h3>

        {members.length === 0 ? (
          <div className="bg-surface border-4 border-primary woodcut-shadow p-12 text-center">
            <span className="material-symbols-outlined text-5xl text-outline mb-4">groups</span>
            <p className="font-body-lg text-body-lg text-on-surface-variant">
              No sangha members yet. Use Add to Sangha below to find fellow practitioners.
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-8">
            {members.map(m => (
              <MemberCard
                key={m.id}
                member={m}
                isSelf={m.id === user?.id}
                removing={actionId === m.id}
                onRemove={handleRemoveFriend}
              />
            ))}
          </div>
        )}
      </section>

      <CollapsibleSection title="Add to Sangha">
        <p className="font-body-md text-body-md text-on-surface-variant mb-4">
          Browse everyone on the server and send a Sangha request, or filter by name or email.
        </p>

        <div className="relative mb-4">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">search</span>
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter practitioners…"
            className="w-full border-2 border-primary bg-surface-bright pl-10 pr-4 py-3 font-body-md text-body-md focus:outline-none focus:ring-2 focus:ring-secondary"
          />
        </div>

        {directoryError && (
          <p className="font-label-sm text-label-sm text-secondary mb-3">{directoryError}</p>
        )}

        {practitioners.length === 0 && !directoryError ? (
          <p className="font-label-sm text-label-sm text-on-surface-variant">
            No other practitioners on the server yet.
          </p>
        ) : filteredPractitioners.length > 0 ? (
          <ul className="divide-y-2 divide-primary border-2 border-primary max-h-80 overflow-y-auto">
            {filteredPractitioners.map(u => (
              <li key={u.id} className="flex items-center justify-between gap-3 p-3 bg-surface-bright">
                <div className="min-w-0">
                  <p className="font-body-md text-body-md text-primary truncate">{u.name}</p>
                  <p className="font-label-sm text-label-sm text-on-surface-variant truncate">{u.email}</p>
                </div>
                <RelationButton
                  relation={u.relation}
                  loading={actionId === u.id || actionId === incomingByUserId[u.id]}
                  requestId={incomingByUserId[u.id]}
                  onRequest={() => handleSendRequest(u.id)}
                  onAccept={(id) => handleAccept(id)}
                  onDecline={(id) => handleDecline(id)}
                />
              </li>
            ))}
          </ul>
        ) : (
          <p className="font-label-sm text-label-sm text-on-surface-variant">No practitioners match your filter.</p>
        )}
      </CollapsibleSection>

      <CollapsibleSection
        title="Pending Requests"
        badge={pendingCount > 0 ? pendingCount : null}
        defaultOpen={incoming.length > 0}
      >
        {requestsError && (
          <p className="font-label-sm text-label-sm text-secondary mb-4">
            Could not load requests: {requestsError}
          </p>
        )}

        {incoming.length > 0 && (
          <div className="mb-6">
            <p className="font-label-sm text-label-sm uppercase text-on-surface-variant mb-3">
              Wants to join your Sangha
            </p>
            <ul className="space-y-3">
              {incoming.map(r => (
                <li key={r.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-2 border-primary p-3 bg-surface-bright">
                  <div className="min-w-0">
                    <p className="font-body-md text-body-md text-primary truncate">{r.name}</p>
                    <p className="font-label-sm text-label-sm text-on-surface-variant truncate">{r.email}</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      type="button"
                      disabled={actionId === r.id}
                      onClick={() => handleAccept(r.id)}
                      className="flex-1 sm:flex-none border-2 border-primary bg-primary text-on-primary px-4 py-2 font-label-sm text-label-sm uppercase hover:bg-secondary hover:border-secondary transition-colors disabled:opacity-50"
                    >
                      Accept
                    </button>
                    <button
                      type="button"
                      disabled={actionId === r.id}
                      onClick={() => handleDecline(r.id)}
                      className="flex-1 sm:flex-none border-2 border-primary px-4 py-2 font-label-sm text-label-sm uppercase hover:bg-surface-variant transition-colors disabled:opacity-50"
                    >
                      Decline
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {outgoing.length > 0 && (
          <div className={incoming.length > 0 ? 'mb-4' : ''}>
            <p className="font-label-sm text-label-sm uppercase text-on-surface-variant mb-3">
              Sent by you
            </p>
            <ul className="space-y-3">
              {outgoing.map(r => (
                <li key={r.id} className="flex items-center justify-between gap-3 border-2 border-primary p-3 bg-surface-bright">
                  <div className="min-w-0">
                    <p className="font-body-md text-body-md text-primary truncate">{r.name}</p>
                    <p className="font-label-sm text-label-sm text-on-surface-variant truncate">{r.email}</p>
                  </div>
                  <span className="font-label-sm text-label-sm uppercase text-on-surface-variant border-2 border-outline-variant px-3 py-1.5 shrink-0">
                    Pending
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {pendingCount === 0 && !requestsError && (
          <p className="font-body-md text-body-md text-on-surface-variant">
            No pending requests. When someone sends you a request, it will appear here to accept or decline.
          </p>
        )}
      </CollapsibleSection>
    </div>
  );
}

function CollapsibleSection({ title, badge, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);

  useEffect(() => {
    if (defaultOpen) setOpen(true);
  }, [defaultOpen]);

  return (
    <section className="border-4 border-primary bg-surface woodcut-shadow">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between gap-3 p-4 text-left hover:bg-surface-variant transition-colors"
        aria-expanded={open}
      >
        <span className="font-headline-sm text-headline-sm uppercase">{title}</span>
        <span className="flex items-center gap-2 shrink-0">
          {badge != null && (
            <span className="font-label-sm text-label-sm uppercase bg-secondary text-on-secondary px-2 py-0.5">
              {badge}
            </span>
          )}
          <span className="material-symbols-outlined text-primary transition-transform duration-200" style={{ transform: open ? 'rotate(180deg)' : undefined }}>
            expand_more
          </span>
        </span>
      </button>
      {open && <div className="px-6 pb-6 pt-2 border-t-2 border-primary">{children}</div>}
    </section>
  );
}

function RelationButton({ relation, loading, requestId, onRequest, onAccept, onDecline }) {
  if (relation === 'friend') {
    return (
      <span className="font-label-sm text-label-sm uppercase text-[#15803d] border-2 border-[#15803d] px-3 py-1.5 shrink-0">
        In Sangha
      </span>
    );
  }
  if (relation === 'pending_outgoing') {
    return (
      <span className="font-label-sm text-label-sm uppercase text-on-surface-variant border-2 border-outline-variant px-3 py-1.5 shrink-0">
        Pending
      </span>
    );
  }
  if (relation === 'pending_incoming' && requestId) {
    return (
      <div className="flex gap-2 shrink-0">
        <button
          type="button"
          disabled={loading}
          onClick={() => onAccept(requestId)}
          className="border-2 border-primary bg-primary text-on-primary px-3 py-1.5 font-label-sm text-label-sm uppercase hover:bg-secondary hover:border-secondary transition-colors disabled:opacity-50"
        >
          Accept
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={() => onDecline(requestId)}
          className="border-2 border-primary px-3 py-1.5 font-label-sm text-label-sm uppercase hover:bg-surface-variant transition-colors disabled:opacity-50"
        >
          Decline
        </button>
      </div>
    );
  }
  return (
    <button
      type="button"
      disabled={loading}
      onClick={onRequest}
      className="border-2 border-primary bg-primary text-on-primary px-3 py-1.5 font-label-sm text-label-sm uppercase hover:bg-secondary hover:border-secondary transition-colors shrink-0 disabled:opacity-50"
    >
      {loading ? '…' : 'Request'}
    </button>
  );
}

function MemberCard({ member, isSelf, removing, onRemove }) {
  const pct = member.percentage || 0;
  const done = pct >= 100;
  const quickItems = (member.items || []).filter(i => (i.category || '').toLowerCase() === 'quick');

  const stats = [
    { icon: '📿', label: 'Japa', val: member.japaDone ? '60m' : '--' },
    { icon: '🧘', label: 'AKY', val: `${member.akyDone || 0}/${member.akyTotal || 0}` },
  ];

  for (const item of quickItems) {
    stats.push({
      icon: item.name === 'Water' ? '💧' : item.name === 'Study' ? '📖' : item.name === 'Abhishekam' ? '🪷' : '🏃',
      label: item.name,
      val: item.completed ? '✅' : '--',
    });
  }

  return (
    <article className={`bg-surface woodcut-shadow border-4 border-primary p-6 relative ${!done ? 'opacity-80' : ''}`}>
      <div className="absolute inset-0 halftone-bg opacity-5 pointer-events-none" />
      <div className="flex justify-between items-start mb-6 border-b border-outline pb-4 relative z-10">
        <div>
          <h3 className="font-headline-sm text-headline-sm text-primary">
            {member.name || 'Practitioner'}
            {isSelf && (
              <span className="font-label-sm text-label-sm text-on-surface-variant normal-case ml-2">(You)</span>
            )}
          </h3>
          <p className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider mt-1">
            {done ? 'Full Practice' : 'In Progress'}
          </p>
        </div>
        <span className={`font-label-sm text-label-sm uppercase tracking-widest px-3 py-1 border-2 ${
          done ? 'bg-primary text-on-primary border-primary'
            : pct > 0 ? 'bg-secondary text-on-secondary border-secondary'
              : 'text-on-surface-variant border-outline-variant'
        }`}>
          {done ? 'Complete' : pct > 0 ? 'Partial' : 'Awaiting'}
        </span>
      </div>
      <div className="flex items-center gap-6 mb-6 relative z-10">
        <div className="relative w-20 h-20">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" fill="none" r="42" stroke="#e5e2e1" strokeWidth="8" />
            <circle
              cx="50" cy="50" fill="none" r="42"
              stroke={done ? '#000' : '#b22a27'}
              strokeDasharray={`${(pct / 100) * 264} 264`}
              strokeWidth="8"
              strokeLinecap="square"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="font-headline-sm text-headline-sm text-primary">{pct}%</span>
          </div>
        </div>
        <div className="flex-1 space-y-2">
          {stats.map(s => (
            <div key={s.label} className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 font-body-md text-body-md text-on-surface-variant">
                <span>{s.icon}</span> {s.label}
              </span>
              <span className="font-label-sm text-label-sm font-bold text-primary">{s.val}</span>
            </div>
          ))}
        </div>
      </div>
      {!isSelf && (
        <button
          type="button"
          disabled={removing}
          onClick={() => onRemove(member.id)}
          className="relative z-10 w-full mt-2 border-2 border-primary py-2.5 font-label-sm text-label-sm uppercase flex items-center justify-center gap-2 hover:bg-secondary hover:text-on-secondary hover:border-secondary transition-colors disabled:opacity-50"
        >
          <span className="material-symbols-outlined text-lg">person_remove</span>
          {removing ? 'Removing…' : 'Remove from Sangha'}
        </button>
      )}
    </article>
  );
}
