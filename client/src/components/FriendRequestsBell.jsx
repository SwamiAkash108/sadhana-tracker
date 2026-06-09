export default function FriendRequestsBell({ count, onClick }) {
  const hasRequests = count > 0;

  return (
    <button
      type="button"
      onClick={onClick}
      className="relative flex items-center justify-center shrink-0 w-10 h-10 sm:w-11 sm:h-11 overflow-visible rounded-full hover:bg-surface-variant transition-colors"
      title={hasRequests ? `${count} friend request${count !== 1 ? 's' : ''}` : 'Friend requests'}
      aria-label={hasRequests ? `${count} pending friend requests` : 'Friend requests'}
    >
      <span
        className="material-symbols-outlined text-[24px] leading-none"
        style={{ fontVariationSettings: hasRequests ? "'FILL' 1" : "'FILL' 0" }}
      >
        person_add
      </span>
      {hasRequests && (
        <span
          className="absolute top-0 right-0 z-10 min-w-[1.25rem] h-5 px-1 flex items-center justify-center translate-x-1/4 -translate-y-1/4 bg-secondary text-on-secondary border-2 border-primary rounded-full font-label-sm text-[11px] font-bold leading-none shadow-[1px_1px_0_0_#000]"
          aria-hidden="true"
        >
          {count > 9 ? '9+' : count}
        </span>
      )}
    </button>
  );
}
