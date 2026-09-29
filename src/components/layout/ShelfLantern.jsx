import { useEffect, useMemo, useRef } from 'react';
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion';
import { hasFinePointer } from '../../lib/anim';
import { PULL_SPAN } from './BookStage';

/** 떠다니는 먼지 수. 빛 안에서만 보이므로 많을 필요가 없다. */
const MOTE_COUNT = 18;

/** 등불이 포인터를 뒤따르는 정도(프레임당). 작을수록 느긋하게 따라온다. */
const FOLLOW = 0.075;

/**
 * 첫 화면의 등불.
 *
 * 어두운 방에서 등불 하나가 책장을 비춘다. 마우스가 있으면 등불이 포인터를
 * 느긋하게 따라오고, 손가락뿐인 기기에서는 제자리에서 천천히 흔들린다.
 * 빛 안에는 먼지가 떠다닌다 — 오래 꽂혀 있던 책장이다.
 *
 * 책을 꺼내면(--shelf-out 이 0 으로) 방이 밝아지며 등불이 걷힌다.
 *
 * 꺼낸 책을 등불 쪽으로 기울여 보기도 했는데 그만뒀다. 다 꺼낸 책은 화면
 * 높이를 꽉 채우므로 조금만 기울여도 모서리가 화면 밖으로 나가고, 책 바깥을
 * 가리는 덮개(.book-mask)가 제자리에 남아 검은 조각으로 드러났다.
 *
 * 등불 그림은 한 장이다. 포인터를 따라 배경 그라데이션을 다시 그리면 매
 * 프레임 화면 전체를 칠해야 하는데, 커다란 판 하나를 transform 으로 옮기면
 * 합성만 다시 한다.
 */
export function ShelfLantern() {
  const rootRef = useRef(null);
  const lightRef = useRef(null);
  const reduced = usePrefersReducedMotion();

  const motes = useMemo(
    () =>
      Array.from({ length: MOTE_COUNT }, (_, i) => {
        // 고르게 흩되 규칙이 보이지 않게 — 황금각으로 돌리며 반경을 늘린다
        const a = i * 2.399963;
        const r = 3 + ((i * 37) % 17);
        return {
          id: i,
          x: `${(Math.cos(a) * r).toFixed(2)}vmax`,
          y: `${(Math.sin(a) * r * 0.8).toFixed(2)}vmax`,
          size: 1.5 + (i % 3),
          dur: `${9 + (i % 5) * 2.2}s`,
          delay: `${-((i * 1.7) % 9).toFixed(1)}s`,
          // 떠오르는 길의 기울기(도). 키프레임에 값을 넣지 않고 요소를 기울인다.
          tilt: `${((i % 2 ? 1 : -1) * (10 + (i % 4) * 7)).toFixed(0)}deg`,
        };
      }),
    [],
  );

  useEffect(() => {
    const el = lightRef.current;
    if (!el) return undefined;

    if (reduced) {
      el.style.transform = 'translate3d(50vw, 44vh, 0) translate(-50%, -50%)';
      return undefined;
    }

    const fine = hasFinePointer();
    // 화면 비율 좌표(0~1). 처음에는 우리 책이 꽂힌 자리를 비춘다.
    let tx = 0.5;
    let ty = 0.44;
    let x = tx;
    let y = ty;
    let raf = 0;
    let last = '';
    const t0 = performance.now();

    const onMove = (e) => {
      tx = e.clientX / Math.max(window.innerWidth, 1);
      ty = e.clientY / Math.max(window.innerHeight, 1);
      wake();
    };

    // 책을 꺼내고 나면 등불이 할 일이 없다. 루프를 세운다.
    const onCover = () => window.scrollY < window.innerHeight * PULL_SPAN;

    // 책장을 떠나면 등불 판(화면보다 훨씬 크다)과 먼지를 아예 그리지 않는다.
    // 투명도 0 으로 남겨 두면 합성 메모리를 쥐고 먼지 애니메이션도 계속 돈다.
    const root = rootRef.current;
    const show = (on) => {
      if (root && root.hidden === on) root.hidden = !on;
    };

    const frame = (now) => {
      raf = 0;
      show(onCover());
      if (!onCover() || document.hidden) return;

      if (!fine) {
        // 손으로 든 등불처럼 두 박자가 어긋난 채 흔들린다
        const t = (now - t0) / 1000;
        tx = 0.5 + Math.sin(t * 0.42) * 0.14 + Math.sin(t * 1.1) * 0.02;
        ty = 0.44 + Math.sin(t * 0.29 + 1.3) * 0.06;
      }

      x += (tx - x) * FOLLOW;
      y += (ty - y) * FOLLOW;

      const w = window.innerWidth;
      const h = window.innerHeight;
      const v = `translate3d(${(x * w).toFixed(1)}px, ${(y * h).toFixed(1)}px, 0) translate(-50%, -50%)`;
      if (v !== last) {
        last = v;
        el.style.transform = v;
      }

      const settled = Math.abs(tx - x) < 0.0005 && Math.abs(ty - y) < 0.0005;
      // 손가락 기기에서는 계속 흔들리고, 마우스는 멈추면 같이 멈춘다
      if (!fine || !settled) raf = requestAnimationFrame(frame);
    };

    function wake() {
      if (!raf) raf = requestAnimationFrame(frame);
    }

    const onScroll = () => {
      show(onCover());
      if (onCover()) wake();
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true });
    document.addEventListener('visibilitychange', onScroll);
    wake();

    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('scroll', onScroll);
      document.removeEventListener('visibilitychange', onScroll);
    };
  }, [reduced]);

  return (
    <div ref={rootRef} className="shelf-lantern" aria-hidden="true">
      <div ref={lightRef} className="shelf-lantern-light">
        {!reduced
          ? motes.map((m) => (
              <span
                key={m.id}
                className="shelf-mote"
                style={{
                  '--mx': m.x,
                  '--my': m.y,
                  rotate: m.tilt,
                  width: m.size,
                  height: m.size,
                  animationDuration: m.dur,
                  animationDelay: m.delay,
                }}
              />
            ))
          : null}
      </div>
    </div>
  );
}

export default ShelfLantern;
