import { useMemo } from 'react';
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion';
import { act4 } from '../../data/content';

const EMBER_COUNT = 12;

/**
 * 완료 연출. 폭죽 대신 등불빛이 한 번 부풀었다가 잦아든다.
 * 모션 축소 설정에서는 떠오르는 빛 없이 문구만 남는다.
 */
export function FeastMoment({ active }) {
  const reduced = usePrefersReducedMotion();

  const embers = useMemo(
    () =>
      Array.from({ length: EMBER_COUNT }, (_, i) => ({
        id: i,
        left: `${6 + (i * 88) / EMBER_COUNT + (i % 3) * 2}%`,
        size: 3 + (i % 3),
        delay: (i % 6) * 0.32,
        dur: 3.8 + (i % 4) * 0.6,
        drift: `${(i % 2 === 0 ? 1 : -1) * (10 + (i % 5) * 6)}px`,
      })),
    [],
  );

  if (!active) return null;

  return (
    <div className="relative mt-10 overflow-hidden rounded-2xl border border-accent/25 bg-[color-mix(in_srgb,var(--color-accent)_7%,transparent)] px-6 py-10 text-center">
      {!reduced ? (
        <>
          <div
            aria-hidden="true"
            className="glow-swell pointer-events-none absolute inset-x-0 bottom-0 h-40"
            style={{
              background:
                'radial-gradient(50% 100% at 50% 100%, color-mix(in srgb, var(--color-accent) 34%, transparent), transparent 72%)',
            }}
          />
          <div aria-hidden="true" className="pointer-events-none absolute inset-0">
            {embers.map((e) => (
              <span
                key={e.id}
                className="ember absolute bottom-2 rounded-full bg-accent"
                style={{
                  left: e.left,
                  width: e.size,
                  height: e.size,
                  '--delay': `${e.delay}s`,
                  '--dur': `${e.dur}s`,
                  '--drift': e.drift,
                }}
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
