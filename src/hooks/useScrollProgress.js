import { useEffect } from 'react';

/**
 * rAF 로 묶은 스크롤 구독.
 *
 * 값을 state 로 돌려주지 않는다 — 스크롤마다 리렌더가 일어나면
 * 프레임을 놓치기 때문이다. 대신 콜백으로 넘겨서 호출부가 CSS 변수를
 * 직접 쓰도록 한다.
 *
 * @param {(metrics: {scrollY:number, viewportH:number, docH:number}) => void} onScroll
 */
export function useScrollProgress(onScroll) {
  useEffect(() => {
    let frame = 0;
    let alive = true;

    const emit = () => {
      frame = 0;
      if (!alive) return;
      onScroll({
        scrollY: window.scrollY || window.pageYOffset || 0,
        viewportH: window.innerHeight,
        docH: document.documentElement.scrollHeight,
      });
    };

    const schedule = () => {
      if (frame) return;
      frame = requestAnimationFrame(emit);
    };

    emit();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);

    // 웹폰트가 늦게 붙으면 섹션 높이가 바뀐다 — 그때 한 번 다시 측정
    if (document.fonts?.ready) document.fonts.ready.then(schedule).catch(() => {});

    return () => {
      alive = false;
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
    };
  }, [onScroll]);
}

export default useScrollProgress;
