import { useState } from 'react';
import { act3 } from '../../data/content';

const PAGE = 12;

function relativeTime(iso) {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const diff = Date.now() - then;
  const min = Math.floor(diff / 60000);
  if (min < 1) return '방금';
  if (min < 60) return `${min}분 전`;
  const hour = Math.floor(min / 60);
  if (hour < 24) return `${hour}시간 전`;
  const day = Math.floor(hour / 24);
  if (day < 7) return `${day}일 전`;
  return new Date(then).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' });
}

export function WallList({ entries }) {
  const [limit, setLimit] = useState(PAGE);

  if (entries.length === 0) {
    return <p className="text-faint kr mt-8 text-sm">{act3.wall.empty}</p>;
  }

  const visible = entries.slice(0, limit);

  return (
    <div className="mt-8">
      <ul className="space-y-px" aria-live="polite">
        {visible.map((entry) => (
          <li
            key={entry.id}
            className="flex items-start gap-3 border-b border-hair py-4 first:border-t"
          >
            <span
              aria-hidden="true"
              className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent/70"
            />
            <p className="text-ink kr flex-1 text-base leading-relaxed">{entry.text}</p>
            <time
              dateTime={entry.createdAt}
              className="text-faint mt-1 shrink-0 text-[11px] tabular-nums"
            >
              {relativeTime(entry.createdAt)}
            </time>
          </li>
        ))}
      </ul>

      {entries.length > limit ? (
        <button
          type="button"
          onClick={() => setLimit((n) => n + PAGE)}
          className="text-soft hover:text-ink mt-6 text-xs tracking-wide"
        >
          더 보기 ({entries.length - limit})
        </button>
      ) : null}
    </div>
  );
}

export default WallList;
