/**
 * 나란히 놓고 비교하는 카드 묶음.
 *   items: [{ label?, title, text?, points?: string[] }]
 *
 * 모바일에서는 한 줄로 쌓이고, sm 이상에서 columns 만큼 나뉜다.
 */
const COLS = {
  1: 'sm:grid-cols-1',
  2: 'sm:grid-cols-2',
  3: 'sm:grid-cols-3',
};

export function CardGrid({ items = [], columns = 2, numbered = false, className = '' }) {
  if (items.length === 0) return null;

  return (
    <ul className={`grid grid-cols-1 gap-3 ${COLS[columns] ?? COLS[2]} ${className}`}>
      {items.map((item, i) => (
        <li key={item.title ?? i} className="surface rounded-xl p-5 sm:p-6">
          {numbered ? (
            <span className="text-accent mb-3 block text-xs tabular-nums tracking-[0.2em]">
              {String(i + 1).padStart(2, '0')}
            </span>
          ) : item.label ? (
            <span className="text-faint mb-2 block text-[11px] tracking-[0.08em]">
              {item.label}
            </span>
          ) : null}

          <h4 className="serif text-ink text-lg sm:text-xl">{item.title}</h4>

          {item.text ? (
            <p className="text-soft kr mt-3 text-sm leading-relaxed sm:text-base">{item.text}</p>
          ) : null}

          {item.points?.length ? (
            <ul className="mt-4 space-y-2.5">
              {item.points.map((point, j) => (
                <li key={j} className="text-soft kr flex gap-2.5 text-sm leading-relaxed">
                  <span
                    aria-hidden="true"
                    className="mt-2 h-1 w-1 shrink-0 rounded-full bg-clay/80"
                  />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

export default CardGrid;
