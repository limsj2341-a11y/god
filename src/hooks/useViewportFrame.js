import { useEffect } from 'react';

/**
 * 순간 이동을 알리는 신호. 보내는 쪽은 ActNav, 받는 쪽은 이 훅이다.
 * 스크롤 위치를 코드로 한 번에 바꾼 직후에 쏘면 된다.
 */
export const JUMP_EVENT = 'tangbu:jump';

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
      if (raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
      // 루프가 한 번도 안 돌았더라도 최종 상태는 확정해 둔다.
      // 4막으로 바로 이동한 경우처럼, 관찰 대상이 처음부터 화면 밖이면
      // 여기서 값을 안 써 주면 4막이 뜨지 않은 채로 남는다.
      measure();
    };

    // 목차 점으로 순간 이동하면 스크롤 위치가 한 번에 바뀌는데, 루프를 켜고 끄는
    // IntersectionObserver 는 그보다 몇 프레임 뒤에 도착한다. 그 사이 도착한
    // 페이지는 "아직 들어오지 않은" 상태(opacity 0, translateX 44px)로 그려진다.
    // 실측 40ms — 데스크톱에서는 거의 안 보이지만 태블릿에서는 깜빡임이 된다.
    // 그래서 이동한 쪽(ActNav)이 알려 주면 그 자리에서 바로 확정한다.
    // 스크롤 이벤트를 구독하지 않는 이유는 이 훅의 존재 이유가 그것이기 때문 —
    // 순간 이동은 드문 사건이라 그때만 값을 치른다.
    const onJump = () => measure();
    window.addEventListener(JUMP_EVENT, onJump);

    if (typeof IntersectionObserver === 'undefined') {
      start();
      return () => {
        window.removeEventListener(JUMP_EVENT, onJump);
        stop();
      };
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
      window.removeEventListener(JUMP_EVENT, onJump);
      io.disconnect();
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    };
  }, [ref, onFrame, rootMargin]);
}

export default useViewportFrame;
