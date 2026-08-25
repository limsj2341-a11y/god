import { useEffect } from 'react';

/**
 * 요소가 뷰포트 근처에 있는 동안에만 rAF 루프를 돌린다.
 *
 * scroll 이벤트에는 아무 연산도 붙이지 않는다. IntersectionObserver 는
 * 루프를 켜고 끄는 스위치로만 쓰고, 실제 위치는 rAF 안에서 한 번씩 읽는다.
 * iOS 처럼 스크롤 이벤트가 관성 구간에 드문드문 오는 환경에서도
 * 프레임마다 값이 갱신되므로 연출이 끊기지 않는다.
 *
 * onFrame 안에서는 state 를 건드리지 말고 DOM 스타일을 직접 써야 한다.
 *
 * @param {React.RefObject<HTMLElement>} ref
 * @param {(rect: DOMRect, viewportH: number) => void} onFrame
 */
export function useViewportFrame(ref, onFrame, { rootMargin = '30% 0px' } = {}) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;

    let raf = 0;
    let lastY = NaN;
    let lastH = NaN;

    const measure = () => {
      lastY = window.scrollY;
      lastH = window.innerHeight;
      onFrame(el.getBoundingClientRect(), lastH);
    };

    const loop = () => {
      raf = requestAnimationFrame(loop);
      // 스크롤도 리사이즈도 없었으면 레이아웃을 읽지 않고 그대로 넘어간다
      if (window.scrollY === lastY && window.innerHeight === lastH) return;
      measure();
    };

    const start = () => {
      if (raf) return;
      lastY = NaN;
      loop();
    };

    const stop = () => {
      if (!raf) return;
      cancelAnimationFrame(raf);
      raf = 0;
      // 루프를 끄기 전에 마지막 상태를 확정해 둔다 (0 또는 1 로 고정)
      measure();
    };

    if (typeof IntersectionObserver === 'undefined') {
      start();
      return () => stop();
    }

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) start();
        else stop();
      },
      { rootMargin, threshold: 0 },
    );

    io.observe(el);

    return () => {
      io.disconnect();
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    };
  }, [ref, onFrame, rootMargin]);
}

export default useViewportFrame;
