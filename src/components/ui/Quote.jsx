import { useEffect, useRef } from 'react';
import { useReducedMotion } from 'motion/react';
import { animate, cubicBezier, linear } from 'animejs';
import { useInView } from '../../hooks/useInView';

const SWEEP_H = 64; // 훑고 지나가는 빛의 길이(px)

/**
 * 책 인용 블록.
 * text 가 비어 있으면(아직 채우지 않았으면) 아무것도 렌더링하지 않는다.
 *
 * 눈에 들어오면 왼쪽 세로선을 빛이 한 번 훑고 내려간다. 등불이 글을 비추고
 * 지나가는 모양새라, 인용이 시작된다는 신호가 색이 아니라 움직임으로 온다.
 * 한 번만 돈다 — 스크롤할 때마다 다시 빛나면 읽는 데 방해가 된다.
 */
export function Quote({ quote, className = '' }) {
  const [inViewRef, inView] = useInView();
  const sweepRef = useRef(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (!inView || reduced) return undefined;

    const el = sweepRef.current;
    if (!el) return undefined;

    // 인용문 높이는 글 길이에 따라 매번 다르다. 고정값으로 두면 짧은 인용에서는
    // 빛이 블록을 한참 지나쳐 허공을 훑는다.
    const travel = (el.parentElement?.offsetHeight ?? 0) + SWEEP_H;

    let move;
    let fade;
    try {
      move = animate(el, {
        translateY: [-SWEEP_H, travel],
        duration: 1500,
        delay: 220,
        ease: cubicBezier(0.4, 0, 0.2, 1),
      });
      fade = animate(el, {
        opacity: [0, 1],
        duration: 300,
        delay: 220,
        ease: linear,
        onComplete: () => {
          animate(el, { opacity: 0, duration: 900, ease: linear });
        },
      });
    } catch {
      return undefined;
    }

    return () => {
      move.revert();
      fade.revert();
    };
  }, [inView, reduced]);

  if (!quote?.text?.trim()) return null;

  return (
    <figure
      ref={inViewRef}
      className={`relative border-l-2 border-accent/60 pl-5 sm:pl-6 ${className}`}
    >
      {!reduced ? (
        <span
          ref={sweepRef}
          aria-hidden="true"
          className="pointer-events-none absolute left-[-2px] top-0 w-[2px] opacity-0"
          style={{
            height: SWEEP_H,
            background:
              'linear-gradient(to bottom, transparent, var(--color-accent), transparent)',
          }}
        />
      ) : null}

      <blockquote className="serif text-ink kr text-lg leading-relaxed sm:text-xl">
        “{quote.text}”
      </blockquote>
      {quote.source ? (
        <figcaption className="text-faint mt-3 text-xs tracking-wide">— {quote.source}</figcaption>
      ) : null}
    </figure>
  );
}

export default Quote;
