import { Lantern } from '../ui/Lantern';
import { act3 } from '../../data/content';

const MAX_SHOWN = 24;

/**
 * 글 하나당 등불 하나. 최근에 켜진 것만 등장 애니메이션을 준다.
 * 표시 상한을 넘으면 개수만 숫자로 덧붙인다.
 */
export function LanternRow({ count, justAdded = 0 }) {
  const shown = Math.min(count, MAX_SHOWN);
  const slots = Array.from({ length: Math.max(shown, 8) });

  return (
    <div className="mt-8">
      <div className="flex flex-wrap items-end gap-x-1.5 gap-y-2">
        {slots.map((_, i) => {
          const lit = i < shown;
          const fresh = lit && i < justAdded;
          return (
            <span key={i} className={fresh ? 'lantern-enter' : undefined}>
              <Lantern lit={lit} size={22} delay={(i % 7) * 420} className="text-ink" />
            </span>
          );
        })}
        {count > MAX_SHOWN ? (
          <span className="text-faint ml-2 pb-1 text-xs tabular-nums">+{count - MAX_SHOWN}</span>
        ) : null}
      </div>

      <p className="text-faint mt-3 text-xs tracking-wide">{act3.wall.counter(count)}</p>
    </div>
  );
}

export default LanternRow;
