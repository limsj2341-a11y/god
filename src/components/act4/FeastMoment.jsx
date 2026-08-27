import { useEffect, useMemo, useRef } from 'react';
import { useReducedMotion } from 'motion/react';
import { createTimeline, cubicBezier } from 'animejs';
import { act4 } from '../../data/content';

const EMBER_COUNT = 12;
const RISE_PX = 160; // 불씨가 떠오르는 높이

/**
 * 완료 연출. 폭죽 대신 등불빛이 한 번 부풀었다가 잦아든다.
 *
 * 전에는 CSS 키프레임(.ember, .glow-swell)이 각자 돌았다. 지금은 anime 타임라인
 * 하나가 빛과 불씨를 함께 쥔다 — 둘이 같은 시계를 보므로 빛이 부푸는 순간과
 * 불씨가 떠오르기 시작하는 순간이 어긋나지 않는다.
 *
 * 모션 축소 설정에서는 떠오르는 빛 없이 문구만 남는다(예전과 같다).
 */
export function FeastMoment({ active }) {
  const reduced = useReducedMotion();
  const rootRef = useRef(null);

  const embers = useMemo(
    () =>
      Array.from({ length: EMBER_COUNT }, (_, i) => ({
        id: i,
        left: `${6 + (i * 88) / EMBER_COUNT + (i % 3) * 2}%`,
        size: 3 + (i % 3),
        delay: (i % 6) * 320,
        dur: 3800 + (i % 4) * 600,
        drift: (i % 2 === 0 ? 1 : -1) * (10 + (i % 5) * 6),
      })),
    [],
  );

  useEffect(() => {
    if (!active || reduced) return undefined;

    const root = rootRef.current;
    if (!root) return undefined;

    const glow = root.querySelector('[data-glow]');
    const nodes = root.querySelectorAll('[data-ember]');
    if (!glow) return undefined;

    let tl;
    try {
      tl = createTimeline();

      // 단계가 있는 연출은 최상위 keyframes 로 적는다.
      //
      // 처음에는 속성마다 [{to, duration}, ...] 를 넣거나 같은 요소에 add 를 두 번
      // 걸어 봤는데, 둘 다 두 번째 단계가 통째로 사라졌다(빛이 opacity 1 ·
      // scale 1.1 에 멈춰 있었고 불씨는 밝아지는 구간 없이 0 이었다 — 실측).
      // anime v4 에서 속성값 배열은 [from, to] 라는 뜻이고, 단계를 나누는 것은
      // keyframes 파라미터다. 아래는 예전 CSS @keyframes 를 그대로 옮긴 것이다.

      // 빛이 부풀었다가 잦아든다. 불씨는 그 빛에서 떨어져 나온 것처럼 보여야 한다.
      tl.add(
        glow,
        {
          keyframes: {
            '0%': { opacity: 0, scale: 0.85 },
            '40%': { opacity: 1 },
            '100%': { opacity: 0, scale: 1.35 },
          },
          duration: 2600,
          ease: cubicBezier(0.4, 0, 0.2, 1),
        },
        0,
      );

      nodes.forEach((node, i) => {
        const e = embers[i];
        if (!e) return;
        tl.add(
          node,
          {
            keyframes: {
              '0%': { opacity: 0, translateX: 0, translateY: 0, scale: 0.7 },
              '22%': { opacity: 0.75 },
              '100%': { opacity: 0, translateX: e.drift, translateY: -RISE_PX, scale: 1 },
            },
            duration: e.dur,
            ease: cubicBezier(0.2, 0.6, 0.3, 1),
          },
          e.delay,
        );
      });
    } catch {
      // 연출이 서지 않아도 아래 문구는 그대로 읽혀야 한다.
      return undefined;
    }

    return () => tl.revert();
  }, [active, reduced, embers]);

  if (!active) return null;

  return (
    <div
      ref={rootRef}
      className="relative mt-10 overflow-hidden rounded-2xl border border-accent/25 bg-[color-mix(in_srgb,var(--color-accent)_7%,transparent)] px-6 py-10 text-center"
    >
      {!reduced ? (
        <>
          <div
            data-glow=""
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 h-40 opacity-0"
            style={{
              background:
                'radial-gradient(50% 100% at 50% 100%, color-mix(in srgb, var(--color-accent) 34%, transparent), transparent 72%)',
            }}
          />
          <div aria-hidden="true" className="pointer-events-none absolute inset-0">
            {embers.map((e) => (
              <span
                key={e.id}
                data-ember=""
                className="absolute bottom-2 rounded-full bg-accent opacity-0"
                style={{ left: e.left, width: e.size, height: e.size }}
              />
            ))}
          </div>
        </>
      ) : null}

      <div className="relative">
        <h4 className="serif text-ink text-2xl font-bold sm:text-3xl">
          {act4.practice.feastTitle}
        </h4>
        <p className="text-soft kr mx-auto mt-3 max-w-sm text-sm leading-relaxed sm:text-base">
          {act4.practice.feastText}
        </p>
      </div>
    </div>
  );
}

export default FeastMoment;
