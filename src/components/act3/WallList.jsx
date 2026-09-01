import { useEffect, useMemo, useState } from 'react';
import { act3 } from '../../data/content';

/** 한 쪽에 놓는 글 수. 넘치면 오래된 것이 뒷쪽으로 밀린다. */
const PER_PAGE = 6;

/** 쪽 번호를 한 줄에 다 늘어놓을 수 있는 한계. 넘으면 가운데를 줄임표로 접는다. */
const MAX_TABS = 7;

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

/**
 * 보여 줄 쪽 번호. 적으면 전부, 많으면 처음·끝과 현재 주변만 남기고 접는다.
 * 접은 자리는 null 로 표시한다.
 */
function pageTabs(current, total) {
  if (total <= MAX_TABS) return Array.from({ length: total }, (_, i) => i);

  const tabs = new Set([0, total - 1, current]);
  if (current - 1 > 0) tabs.add(current - 1);
  if (current + 1 < total - 1) tabs.add(current + 1);
  // 앞뒤 끝에 붙어 있을 때는 반대쪽을 한 칸 더 보여 준다 — 폭이 들쭉날쭉하지 않게
  if (current <= 1) tabs.add(2);
  if (current >= total - 2) tabs.add(total - 3);

  const sorted = [...tabs].filter((n) => n >= 0 && n < total).sort((a, b) => a - b);

  const out = [];
  let prev = -1;
  for (const n of sorted) {
    if (prev >= 0 && n - prev > 1) out.push(null);
    out.push(n);
    prev = n;
  }
  return out;
}

/**
 * 익명 담벼락 목록.
 *
 * 최신 글이 첫 쪽 맨 위에 온다. 한 쪽에 여섯 개까지 놓고, 넘치면 오래된 것이
 * 다음 쪽으로 밀린다 — 담벼락이 길어져도 3막 본문이 목록에 파묻히지 않는다.
 *
 * jumpToFirst 는 "방금 내가 글을 남겼다"는 신호다. 그때만 첫 쪽으로 돌아온다.
 * 새 글이 들어올 때마다 무조건 돌아오면, 뒷쪽을 읽고 있던 사람이 남의 글
 * 하나에 첫 쪽으로 끌려간다.
 */
export function WallList({ entries, jumpToFirst = false }) {
  const [page, setPage] = useState(0);

  // 어댑터가 무엇이든 최신이 앞이도록 여기서 한 번 더 세운다
  const ordered = useMemo(
    () => [...entries].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
    [entries],
  );

  const total = Math.max(1, Math.ceil(ordered.length / PER_PAGE));

  // 글이 지워져 쪽수가 줄면 빈 쪽에 남지 않도록 끌어온다
  useEffect(() => {
    setPage((p) => Math.min(p, total - 1));
  }, [total]);

  useEffect(() => {
    if (jumpToFirst) setPage(0);
  }, [jumpToFirst]);

  if (ordered.length === 0) {
    return <p className="text-faint kr mt-8 text-sm">{act3.wall.empty}</p>;
  }

  const start = page * PER_PAGE;
  const visible = ordered.slice(start, start + PER_PAGE);
  const tabs = pageTabs(page, total);

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
            {/* min-w-0 이 없으면 flex 칸이 min-content 아래로 줄지 않는다.
                kr 은 word-break: keep-all 이라 한글 한 덩어리의 min-content 가
                문장 전체 길이다 — 띄어쓰기 없이 길게 쓴 글이 그대로 밖으로
                삐져나갔다(실측 961px > 600px). */}
            <p className="text-ink kr min-w-0 flex-1 text-base leading-relaxed">{entry.text}</p>
            <time
              dateTime={entry.createdAt}
              className="text-faint mt-1 shrink-0 text-[11px] tabular-nums"
            >
              {relativeTime(entry.createdAt)}
            </time>
          </li>
        ))}
      </ul>

      {total > 1 ? (
        <nav aria-label={act3.wall.pagerLabel} className="mt-6 flex items-center gap-1">
          {tabs.map((n, i) =>
            n === null ? (
              <span key={`gap${i}`} aria-hidden="true" className="text-faint px-1 text-xs">
                ⋯
              </span>
            ) : (
              <button
                key={n}
                type="button"
                onClick={() => setPage(n)}
                aria-current={n === page ? 'page' : undefined}
                aria-label={act3.wall.pageLabel(n + 1)}
                // 44px 은 목차 점·실천 카드 등 사이트 전체가 따르는 손가락 터치 기준
                // (Apple HIG 44pt, WCAG 2.5.5 와 같은 값). 이 버튼만 36px 로 빠져 있었다 —
                // 담벼락 쪽 나눔을 나중에 추가하면서 놓친 것.
                className={`flex h-11 min-w-11 items-center justify-center rounded-full px-2 text-xs tabular-nums transition-colors duration-300 ${
                  n === page
                    ? 'text-ink bg-[color-mix(in_srgb,var(--color-accent)_18%,transparent)]'
                    : 'text-faint hover:text-soft'
                }`}
              >
                {n + 1}
              </button>
            ),
          )}
        </nav>
      ) : null}
    </div>
  );
}

export default WallList;
