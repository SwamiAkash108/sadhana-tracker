import { formatRecordDate } from '../utils/dayRecord';

function StatusBadge({ status }) {
  if (status === 'green') {
    return (
      <span className="font-label-sm text-label-sm uppercase bg-[#15803d] text-white px-2 py-0.5 shrink-0">
        Full
      </span>
    );
  }
  if (status === 'orange') {
    return (
      <span className="font-label-sm text-label-sm uppercase bg-[#ea580c] text-white px-2 py-0.5 shrink-0">
        Partial
      </span>
    );
  }
  return (
    <span className="font-label-sm text-label-sm uppercase border-2 border-primary px-2 py-0.5 shrink-0">
      In progress
    </span>
  );
}

export function DayHistoryCard({ record, compact = false, hideHeader = false, selected = false, onSelect }) {
  if (!record) return null;

  const Wrapper = onSelect ? 'button' : 'div';
  const wrapperProps = onSelect
    ? { type: 'button', onClick: () => onSelect(record.date) }
    : {};

  return (
    <Wrapper
      {...wrapperProps}
      className={`w-full text-left border-2 border-primary bg-surface-bright p-4 transition-colors ${
        selected ? 'ring-2 ring-secondary bg-surface' : 'hover:bg-surface'
      } ${onSelect ? 'cursor-pointer' : ''}`}
    >
      <div className={`flex items-start justify-between gap-3 ${hideHeader ? 'mb-0' : 'mb-3'}`}>
        {!hideHeader && (
          <div className="min-w-0">
            <p className="font-body-md text-body-md text-primary truncate">
              {formatRecordDate(record.date)}
            </p>
            <p className="font-label-sm text-label-sm text-on-surface-variant">
              {record.metCount}/{record.total} pillars
              {record.akyLabel ? ` · ${record.akyLabel}` : ''}
            </p>
          </div>
        )}
        {!hideHeader && <StatusBadge status={record.status} />}
        {hideHeader && (
          <>
            <p className="font-label-sm text-label-sm text-on-surface-variant">
              {record.metCount}/{record.total} pillars
              {record.akyLabel ? ` · ${record.akyLabel}` : ''}
            </p>
            <StatusBadge status={record.status} />
          </>
        )}
      </div>

      <div className={`grid grid-cols-2 sm:grid-cols-3 gap-x-3 gap-y-1 ${hideHeader ? 'mt-3 mb-3' : 'mb-3'}`}>
        {record.pillars.map(p => (
          <span
            key={p.key}
            className={`font-label-sm text-label-sm uppercase truncate ${
              p.met ? 'text-[#15803d]' : 'text-on-surface-variant'
            }`}
          >
            {p.met ? '✓' : '○'} {p.label}
          </span>
        ))}
      </div>

      {!compact && (
        <div className="space-y-3 border-t-2 border-primary pt-3">
          {record.akyPractices?.length > 0 && (
            <div>
              <p className="font-label-sm text-label-sm uppercase text-on-surface-variant mb-1">Atma Kriya</p>
              <ul className="space-y-0.5">
                {record.akyPractices.map(p => (
                  <li key={p.name} className="font-body-md text-body-md text-primary">
                    {p.name}: {p.value}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="grid sm:grid-cols-3 gap-3">
            {record.japa?.elapsed > 0 && (
              <div>
                <p className="font-label-sm text-label-sm uppercase text-on-surface-variant mb-1">Japa</p>
                <p className="font-body-md text-body-md text-primary">{record.japa.label}</p>
              </div>
            )}
            {record.water?.ml > 0 && (
              <div>
                <p className="font-label-sm text-label-sm uppercase text-on-surface-variant mb-1">Water</p>
                <p className="font-body-md text-body-md text-primary">{record.water.ml} ml</p>
              </div>
            )}
            {record.exercise?.label && (
              <div>
                <p className="font-label-sm text-label-sm uppercase text-on-surface-variant mb-1">Exercise</p>
                <p className="font-body-md text-body-md text-primary">{record.exercise.label}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </Wrapper>
  );
}

export function DayHistoryList({ history, selectedDate, onSelect }) {
  if (history.length === 0) {
    return (
      <div className="border-2 border-primary bg-surface-bright p-8 text-center">
        <span className="material-symbols-outlined text-4xl text-outline mb-3">history</span>
        <p className="font-body-md text-body-md text-on-surface-variant">
          No practice history yet. Complete sadhana on Today and it will appear here.
        </p>
      </div>
    );
  }

  return (
    <ul className="space-y-3 max-h-[32rem] overflow-y-auto">
      {history.map(record => (
        <li key={record.date}>
          <DayHistoryCard
            record={record}
            compact
            selected={record.date === selectedDate}
            onSelect={onSelect}
          />
        </li>
      ))}
    </ul>
  );
}
