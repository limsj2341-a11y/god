import { useEffect, useRef } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { animate, linear } from 'animejs';
import { flowSpring } from '../../lib/anim';

/**
 * 한 줄짜리 진행 표시. 퀴즈와 실천 카드가 같은 것을 쓴다.
 *
 * 막대는 motion 이 스프링으로 늘린다. width 를 CSS 트랜지션으로 밀면 답을
 * 빠르게 연달아 고를 때 앞의 전환이 잘리면서 뚝뚝 끊기는데, 스프링은
 * 진행 중인 속도를 이어받아 이어 달린다.
 *
 * 한 칸 늘어날 때마다 끝점에서 등불빛이 한 번 번진다(anime). 답을 눌렀다는
 * 기별을 색이 아니라 빛으로 준다 — 이 사이트에서 accent 는 등불이다.
 */
export function ProgressLine({ value, max, label }) {
  const reduced = useReducedMotion();
  const sparkRef = useRef(null);
  const prev = useRef(value);

  const ratio = max > 0 ? Math.min(Math.max(value / max, 0), 1) : 0;

  useEffect(() => {
    const grew = value > prev.current;
    prev.current = value;

    if (!grew || reduced) return undefined;

    const el = sparkRef.current;
    if (!el) return undefined;

    let a;
    try {
      a = animate(el, {
        opacity: [0, 0.9, 0],
        scale: [0.4, 1.6],
        duration: 620,
        ease: linear,
      });
    } catch {
      return undefined;
    }

    return () => a.revert();
  }, [value, reduced]);

  return (
    <div className="flex items-center gap-3">
      <div className="relative h-px flex-1 bg-[color-mix(in_srgb,var(--fg)_14%,transparent)]">
        <motion.div
          className="h-px bg-accent"
          animate={{ width: `${ratio * 100}%` }}
          initial={false}
          transition={reduced ? { duration: 0 } : flowSpring}
        />

        {!reduced ? (
          // 막대 끝을 따라다니는 자리. 평소에는 아무것도 그리지 않는다 —
          // 늘 켜 두면 없던 점이 하나 생긴 셈이라 원래 화면과 달라진다.
          // 한 칸 늘어나는 순간에만 안쪽 불씨가 번쩍인다.
          <motion.span
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2"
            animate={{ left: `${ratio * 100}%` }}
            initial={false}
            transition={flowSpring}
          >
            <span
              ref={sparkRef}
              className="block h-full w-full rounded-full opacity-0"
              style={{
                background:
                  'radial-gradient(circle, color-mix(in srgb, var(--color-accent) 85%, transparent), transparent 70%)',
              }}
            />
          </motion.span>
        ) : null}
      </div>

      <span className="text-faint text-xs tabular-nums">{label}</span>
    </div>
  );
}

export default ProgressLine;
