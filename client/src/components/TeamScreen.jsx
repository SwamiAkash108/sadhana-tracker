import { useState, useEffect, useCallback } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import {
  getMemberMotivationalDisplay,
  getMemberOptionalItems,
  getMemberPillarRows,
} from '../utils/memberProgress';
import SessionErrorPanel from './SessionErrorPanel';

export default function TeamScreen({ focusPendingRequests = false, onPendingRequestsViewed, onRequestsChange }) {
  const { user } = useAuth();
  const [team, setTeam] = useState(null);
  const [groups, setGroups] = useState([]);
  const [groupInvites, setGroupInvites] = useState({ incoming: [], outgoing: [] });
  const [requests, setRequests] = useState({ incoming: [], outgoing: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
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
      const groupData = await api.getGroups();
      setGroups(groupData.groups || []);
    } catch {
      setGroups([]);
    }

    try {
      const inviteData = await api.getGroupInvitations();
      setGroupInvites(inviteData);
    } catch {
      setGroupInvites({ incoming: [], outgoing: [] });
    }

    setError(teamError);
    setLoading(false);
    onRequestsChange?.();
  }, [onRequestsChange]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

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

  const handleAcceptGroupInvite = async (invitationId) => {
    setActionId(invitationId);
    try {
      await api.acceptGroupInvitation(invitationId);
      await fetchAll();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionId(null);
    }
  };

  const handleDeclineGroupInvite = async (invitationId) => {
    setActionId(invitationId);
    try {
      await api.declineGroupInvitation(invitationId);
      const inviteData = await api.getGroupInvitations();
      setGroupInvites(inviteData);
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
    return <SessionErrorPanel error={error} onRetry={fetchAll} />;
  }

  const members = team?.members || [];
  const friends = members.filter(m => m.id !== user?.id);
  const friendIds = new Set(friends.map(m => m.id));
  const incoming = requests.incoming || [];
  const outgoing = requests.outgoing || [];
  const groupIncoming = groupInvites.incoming || [];
  const groupOutgoing = groupInvites.outgoing || [];
  const pendingCount = incoming.length + outgoing.length + groupIncoming.length;

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

        {groups.length === 0 ? (
          <div className="bg-surface border-4 border-primary woodcut-shadow p-12 text-center">
            <span className="material-symbols-outlined text-5xl text-outline mb-4">groups</span>
            <p className="font-body-lg text-body-lg text-on-surface-variant">
              Create a sangha group below to organize your practice circles.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {groups.map(group => {
              const groupMembers = members.filter(m => group.member_ids.includes(m.id));
              return (
                <CollapsibleSection
                  key={group.id}
                  title={group.name}
                  badge={groupMembers.length}
                >
                  {groupMembers.length === 0 ? (
                    <p className="font-body-md text-body-md text-on-surface-variant">
                      No members yet.{group.is_admin ? ' Invite people from Manage Sanghas below.' : ''}
                    </p>
                  ) : (
                    <MemberGrid
                      members={groupMembers}
                      user={user}
                      friendIds={friendIds}
                      actionId={actionId}
                      onRemove={handleRemoveFriend}
                    />
                  )}
                </CollapsibleSection>
              );
            })}
          </div>
        )}
      </section>

      <CollapsibleSection title="Manage Sanghas">
        <SanghaGroupsManager
          groups={groups}
          members={members}
          actionId={actionId}
          setActionId={setActionId}
          onChange={fetchAll}
        />
      </CollapsibleSection>

      <CollapsibleSection
        title="Pending Requests"
        badge={pendingCount > 0 ? pendingCount : null}
        defaultOpen={focusPendingRequests}
        onOpen={onPendingRequestsViewed}
      >
        {requestsError && (
          <p className="font-label-sm text-label-sm text-secondary mb-4">
            Could not load requests: {requestsError}
          </p>
        )}

        {groupIncoming.length > 0 && (
          <div className="mb-6">
            <p className="font-label-sm text-label-sm uppercase text-on-surface-variant mb-3">
              Sangha invitations
            </p>
            <ul className="space-y-3">
              {groupIncoming.map(inv => (
                <li key={inv.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-2 border-primary p-3 bg-surface-bright">
                  <div className="min-w-0">
                    <p className="font-body-md text-body-md text-primary truncate">
                      Join &ldquo;{inv.group_name}&rdquo;
                    </p>
                    <p className="font-label-sm text-label-sm text-on-surface-variant truncate">
                      Invited by {inv.inviter_name}
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      type="button"
                      disabled={actionId === inv.id}
                      onClick={() => handleAcceptGroupInvite(inv.id)}
                      className="flex-1 sm:flex-none border-2 border-primary bg-primary text-on-primary px-4 py-2 font-label-sm text-label-sm uppercase hover:bg-secondary hover:border-secondary transition-colors disabled:opacity-50"
                    >
                      Join
                    </button>
                    <button
                      type="button"
                      disabled={actionId === inv.id}
                      onClick={() => handleDeclineGroupInvite(inv.id)}
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
          <div className={incoming.length > 0 || groupIncoming.length > 0 ? 'mb-4' : ''}>
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

        {groupOutgoing.length > 0 && (
          <div className={incoming.length > 0 || outgoing.length > 0 || groupIncoming.length > 0 ? 'mb-4' : ''}>
            <p className="font-label-sm text-label-sm uppercase text-on-surface-variant mb-3">
              Sangha invites sent
            </p>
            <ul className="space-y-3">
              {groupOutgoing.map(inv => (
                <li key={inv.id} className="flex items-center justify-between gap-3 border-2 border-primary p-3 bg-surface-bright">
                  <div className="min-w-0">
                    <p className="font-body-md text-body-md text-primary truncate">
                      &ldquo;{inv.group_name}&rdquo; → {inv.invitee_name}
                    </p>
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

function MemberGrid({ members, user, friendIds, actionId, onRemove }) {
  return (
    <div className="grid md:grid-cols-2 gap-8">
      {members.map(m => (
        <MemberCard
          key={m.id}
          member={m}
          isSelf={m.id === user?.id}
          isFriend={friendIds.has(m.id)}
          removing={actionId === m.id}
          onRemove={onRemove}
        />
      ))}
    </div>
  );
}

function SanghaGroupsManager({ groups, members, actionId, setActionId, onChange }) {
  const [newGroupName, setNewGroupName] = useState('');
  const [groupError, setGroupError] = useState('');
  const [creating, setCreating] = useState(false);

  const handleCreate = async (e) => {
    e.preventDefault();
    const name = newGroupName.trim();
    if (!name) return;
    setGroupError('');
    setCreating(true);
    try {
      await api.createGroup(name);
      setNewGroupName('');
      await onChange();
    } catch (err) {
      setGroupError(err.message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <p className="font-body-md text-body-md text-on-surface-variant">
        Create a shared sangha and invite people. When they accept, everyone sees the same group.
        Only you (the admin) can invite or delete the sangha.
      </p>

      <form onSubmit={handleCreate} className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          value={newGroupName}
          onChange={(e) => setNewGroupName(e.target.value)}
          placeholder="New group name…"
          maxLength={40}
          className="flex-1 border-2 border-primary bg-surface-bright px-4 py-3 font-body-md text-body-md focus:outline-none focus:ring-2 focus:ring-secondary"
        />
        <button
          type="submit"
          disabled={creating || !newGroupName.trim()}
          className="border-2 border-primary bg-primary text-on-primary px-6 py-3 font-label-sm text-label-sm uppercase hover:bg-secondary hover:border-secondary transition-colors disabled:opacity-50 shrink-0"
        >
          {creating ? 'Creating…' : 'Create Group'}
        </button>
      </form>

      {groupError && (
        <p className="font-label-sm text-label-sm text-secondary">{groupError}</p>
      )}

      {groups.length === 0 ? (
        <p className="font-label-sm text-label-sm text-on-surface-variant">
          No groups yet. Create one above — then add sangha members to it.
        </p>
      ) : (
        <div className="space-y-3">
          {groups.map(group => (
            <GroupEditor
              key={group.id}
              group={group}
              members={members}
              user={user}
              actionId={actionId}
              setActionId={setActionId}
              onChange={onChange}
              setGroupError={setGroupError}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function GroupEditor({ group, members, user, actionId, setActionId, onChange, setGroupError }) {
  const [name, setName] = useState(group.name);
  const [inviteUserId, setInviteUserId] = useState('');
  const isAdmin = group.is_admin;

  useEffect(() => {
    setName(group.name);
  }, [group.name]);

  const memberById = Object.fromEntries(members.map(m => [m.id, m]));
  const groupMembers = group.member_ids
    .map(id => memberById[id])
    .filter(Boolean);
  const pendingInviteIds = new Set((group.pending_invites || []).map(i => i.user_id));
  const availableToInvite = members.filter(m =>
    m.id !== user?.id &&
    !group.member_ids.includes(m.id) &&
    !pendingInviteIds.has(m.id)
  );

  const handleRename = async () => {
    if (!isAdmin) return;
    const trimmed = name.trim();
    if (!trimmed || trimmed === group.name) {
      setName(group.name);
      return;
    }
    setGroupError('');
    setActionId(`rename-${group.id}`);
    try {
      await api.updateGroup(group.id, trimmed);
      await onChange();
    } catch (err) {
      setGroupError(err.message);
      setName(group.name);
    } finally {
      setActionId(null);
    }
  };

  const handleDelete = async () => {
    if (!isAdmin) return;
    if (!window.confirm(`Delete sangha "${group.name}"? This removes it for everyone.`)) return;
    setGroupError('');
    setActionId(`delete-${group.id}`);
    try {
      await api.deleteGroup(group.id);
      await onChange();
    } catch (err) {
      setGroupError(err.message);
    } finally {
      setActionId(null);
    }
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!inviteUserId || !isAdmin) return;
    setGroupError('');
    setActionId(`invite-${group.id}-${inviteUserId}`);
    try {
      await api.inviteToGroup(group.id, inviteUserId);
      setInviteUserId('');
      await onChange();
    } catch (err) {
      setGroupError(err.message);
    } finally {
      setActionId(null);
    }
  };

  const handleRemoveMember = async (userId) => {
    if (!isAdmin) return;
    setGroupError('');
    setActionId(`remove-${group.id}-${userId}`);
    try {
      await api.removeGroupMember(group.id, userId);
      await onChange();
    } catch (err) {
      setGroupError(err.message);
    } finally {
      setActionId(null);
    }
  };

  const busy = actionId?.includes(group.id);

  return (
    <CollapsibleSection title={group.name} badge={groupMembers.length}>
      <div className="space-y-4">
        {!isAdmin && (
          <p className="font-label-sm text-label-sm text-on-surface-variant">
            You are a member of this sangha. Only the admin can invite or manage it.
          </p>
        )}

        {isAdmin && (
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={handleRename}
              maxLength={40}
              disabled={busy}
              className="flex-1 border-2 border-primary bg-surface-bright px-4 py-2 font-body-md text-body-md focus:outline-none focus:ring-2 focus:ring-secondary"
            />
            <button
              type="button"
              onClick={handleDelete}
              disabled={busy}
              className="border-2 border-primary px-4 py-2 font-label-sm text-label-sm uppercase hover:bg-secondary hover:text-on-secondary hover:border-secondary transition-colors disabled:opacity-50 shrink-0"
            >
              Delete Sangha
            </button>
          </div>
        )}

        {groupMembers.length > 0 ? (
          <ul className="divide-y-2 divide-primary border-2 border-primary">
            {groupMembers.map(m => (
              <li key={m.id} className="flex items-center justify-between gap-3 p-3 bg-surface-bright">
                <span className="font-body-md text-body-md text-primary truncate">
                  {m.name}
                  {m.id === group.admin_id && (
                    <span className="font-label-sm text-label-sm text-on-surface-variant normal-case ml-2">(admin)</span>
                  )}
                </span>
                {isAdmin && m.id !== group.admin_id && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => handleRemoveMember(m.id)}
                    className="font-label-sm text-label-sm uppercase border-2 border-primary px-3 py-1 hover:bg-surface-variant transition-colors disabled:opacity-50 shrink-0"
                  >
                    Remove
                  </button>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="font-label-sm text-label-sm text-on-surface-variant">No members yet.</p>
        )}

        {(group.pending_invites || []).length > 0 && isAdmin && (
          <div>
            <p className="font-label-sm text-label-sm uppercase text-on-surface-variant mb-2">Pending invites</p>
            <ul className="space-y-2">
              {(group.pending_invites || []).map(inv => (
                <li key={inv.id} className="font-body-md text-body-md text-on-surface-variant border-2 border-outline-variant px-3 py-2">
                  {memberById[inv.user_id]?.name || 'Invited member'} — waiting
                </li>
              ))}
            </ul>
          </div>
        )}

        {isAdmin && availableToInvite.length > 0 ? (
          <form onSubmit={handleInvite} className="flex flex-col sm:flex-row gap-3">
            <select
              value={inviteUserId}
              onChange={(e) => setInviteUserId(e.target.value)}
              disabled={busy}
              className="flex-1 border-2 border-primary bg-surface-bright px-4 py-3 font-body-md text-body-md focus:outline-none focus:ring-2 focus:ring-secondary"
            >
              <option value="">Invite sangha member…</option>
              {availableToInvite.map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
            <button
              type="submit"
              disabled={busy || !inviteUserId}
              className="border-2 border-primary bg-primary text-on-primary px-6 py-3 font-label-sm text-label-sm uppercase hover:bg-secondary hover:border-secondary transition-colors disabled:opacity-50 shrink-0"
            >
              Invite
            </button>
          </form>
        ) : isAdmin ? (
          <p className="font-label-sm text-label-sm text-on-surface-variant">
            {availableToInvite.length === 0 && groupMembers.length <= 1
              ? 'Add friends to your sangha first, then invite them here.'
              : 'All eligible members have been invited or joined.'}
          </p>
        ) : null}
      </div>
    </CollapsibleSection>
  );
}

function CollapsibleSection({ title, badge, defaultOpen = false, onOpen, children }) {
  const [open, setOpen] = useState(defaultOpen);

  useEffect(() => {
    if (defaultOpen) {
      setOpen(true);
      onOpen?.();
    }
  }, [defaultOpen, onOpen]);

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

function MemberCard({ member, isSelf, isFriend, removing, onRemove }) {
  const [optionalOpen, setOptionalOpen] = useState(false);
  const progress = getMemberMotivationalDisplay(member);
  const pillarRows = getMemberPillarRows(member);
  const optionalItems = getMemberOptionalItems(member);
  const optionalDone = optionalItems.filter(i => i.completed).length;
  const isCelebrating = progress.displayPct >= 100;

  return (
    <article className={`bg-surface woodcut-shadow border-4 border-primary p-6 relative ${!isCelebrating ? 'opacity-90' : ''}`}>
      <div className="absolute inset-0 halftone-bg opacity-5 pointer-events-none" />
      <div className="flex justify-between items-start mb-4 border-b border-outline pb-4 relative z-10">
        <div>
          <h3 className="font-headline-sm text-headline-sm text-primary">
            {member.name || 'Practitioner'}
            {isSelf && (
              <span className="font-label-sm text-label-sm text-on-surface-variant normal-case ml-2">(You)</span>
            )}
          </h3>
          <p className="font-label-sm text-label-sm uppercase tracking-wider mt-1" style={{ color: progress.color }}>
            {progress.statusLabel}
          </p>
        </div>
        <span className={`font-label-sm text-label-sm uppercase tracking-widest px-3 py-1 border-2 ${progress.badgeClass}`}>
          {progress.badge}
        </span>
      </div>

      <p className="font-body-md text-body-md text-on-surface-variant mb-4 relative z-10">
        {progress.message}
      </p>

      <div className="flex items-center gap-6 mb-4 relative z-10">
        <div className="relative w-20 h-20 shrink-0">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" fill="none" r="42" stroke="#e5e2e1" strokeWidth="8" />
            <circle
              cx="50" cy="50" fill="none" r="42"
              stroke={progress.color}
              strokeDasharray={`${(progress.ringPct / 100) * 264} 264`}
              strokeWidth="8"
              strokeLinecap="square"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center px-1">
            <span
              className="font-headline-sm text-[17px] leading-none tabular-nums tracking-tight"
              style={{ color: progress.color }}
            >
              {progress.displayPct}%
            </span>
          </div>
        </div>
        <div className="flex-1 space-y-1.5">
          {pillarRows.map(row => (
            <div key={row.key} className="flex items-center justify-between text-sm">
              <span className={`flex items-center gap-2 font-body-md text-body-md ${row.met ? 'text-[#15803d]' : 'text-on-surface-variant'}`}>
                <span>{row.icon}</span> {row.label}
              </span>
              <span className={`font-label-sm text-label-sm font-bold ${row.met ? 'text-[#15803d]' : 'text-primary'}`}>
                {row.val}
              </span>
            </div>
          ))}
        </div>
      </div>

      {optionalItems.length > 0 && (
        <div className="relative z-10 border-t-2 border-primary pt-3">
          <button
            type="button"
            onClick={() => setOptionalOpen(v => !v)}
            className="w-full flex items-center justify-between gap-2 py-1 text-left hover:opacity-80 transition-opacity"
            aria-expanded={optionalOpen}
          >
            <span className="font-label-sm text-label-sm uppercase text-on-surface-variant">
              Optional {optionalDone > 0 ? `· ${optionalDone}/${optionalItems.length}` : ''}
            </span>
            <span
              className="material-symbols-outlined text-primary text-xl transition-transform"
              style={{ transform: optionalOpen ? 'rotate(180deg)' : undefined }}
            >
              expand_more
            </span>
          </button>
          {optionalOpen && (
            <ul className="mt-2 space-y-1.5">
              {optionalItems.map(item => (
                <li key={item.id} className="flex items-center justify-between">
                  <span className={`font-body-md text-body-md ${item.completed ? 'text-[#15803d]' : 'text-on-surface-variant'}`}>
                    {item.name}
                  </span>
                  <span className={`font-label-sm text-label-sm font-bold ${item.completed ? 'text-[#15803d]' : 'text-primary'}`}>
                    {item.completed ? '✓' : '--'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {!isSelf && isFriend && (
        <button
          type="button"
          disabled={removing}
          onClick={() => onRemove(member.id)}
          className="relative z-10 w-full mt-4 border-2 border-primary py-2.5 font-label-sm text-label-sm uppercase flex items-center justify-center gap-2 hover:bg-secondary hover:text-on-secondary hover:border-secondary transition-colors disabled:opacity-50"
        >
          <span className="material-symbols-outlined text-lg">person_remove</span>
          {removing ? 'Removing…' : 'Remove from Sangha'}
        </button>
      )}
    </article>
  );
}
