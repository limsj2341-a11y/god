import { useCallback, useEffect, useRef } from 'react';
import { useScrollProgress } from '../../hooks/useScrollProgress';
import { ACTS } from '../../theme/palette';
import { easeSnap, easeTrailing, sampleStops } from '../../lib/color';

/**
 * 스크롤 위치에 따라 배경/글자 색을 보간해 CSS 변수(--bg, --fg)에 직접 쓴다.
 *
 * 색 stop 은 막마다 둘이다 — 도착 지점과 출발 지점.
 * 그 사이(막을 읽는 동안)에는 같은 색이 유지되고, 한 막의 출발 지점에서
 * 다음 막의 도착 지점까지 정확히 뷰포트 한 화면에 걸쳐 색이 넘어간다.
 * 3막의 출발 지점과 4막의 도착 지점 사이가 곧 페이지 소멸 구간이라,
 * 소멸이 끝나는 순간 #F6F3EE 전환도 함께 끝난다.
 *
 * 이 컴포넌트는 아무것도 렌더링하지 않는다. 스크롤마다 state 를 갱신하면
 * 트리 전체가 리렌더되므로, DOM 스타일만 직접 만진다.
 */

/** 글자 색 보간을 끊어 쓰는 단계 수. 아래 handleScroll 의 주석 참고. */
const FG_STEPS = 12;

/** 글자 색은 회색 지대를 건너뛴다. color.js 의 easeSnap 주석 참고. */
const EASE_FG = easeSnap(0.55, 0.07);

/**
 * 문서 기준 top.
 * getBoundingClientRect 는 조상의 transform 을 반영하므로 쓰지 않는다 —
 * 페이지 넘김/소멸이 걸리면 색 stop 이 같이 흔들린다.
 * offsetTop 은 레이아웃 값이라 transform 의 영향을 받지 않는다.
 */
function documentTop(el) {
  let y = 0;
  let node = el;
  while (node) {
    y += node.offsetTop;
    node = node.offsetParent;
  }
  return y;
}

export function BackgroundStage({ onActChange }) {
  const stopsRef = useRef({ positions: [], bg: [], fg: [] });
  const activeRef = useRef(-1);

  const measure = useCallback(() => {
    const els = Array.from(document.querySelectorAll('[data-act]'));
    const vh = window.innerHeight;

    const positions = [];
    const bg = [];
    const fg = [];

    for (const el of els) {
      const act = ACTS[Number(el.dataset.act)];
      if (!act) continue;

      const top = documentTop(el);
      const h = el.offsetHeight;

      // 도착: 그 막의 첫 화면이 뷰포트 중앙에 올 때
      const arrive = top + Math.min(h, vh) / 2;
      // 출발: 그 막의 끝이 뷰포트 바닥에 닿을 때
      const depart = Math.max(arrive, top + h - vh / 2);

      positions.push(arrive, depart);
      bg.push(act.bg, act.bg);
      fg.push(act.fg, act.fg);
    }

    stopsRef.current = { positions, bg, fg };
  }, []);

  // 레이아웃이 바뀔 때만 다시 잰다 (스크롤 프레임 안에서 레이아웃을 읽지 않도록)
  useEffect(() => {
    measure();

    const ro = new ResizeObserver(measure);
    ro.observe(document.body);
    window.addEventListener('resize', measure);
    if (document.fonts?.ready) document.fonts.ready.then(measure).catch(() => {});

    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [measure]);

  const handleScroll = useCallback(
    ({ scrollY, viewportH }) => {
      const { positions, bg, fg } = stopsRef.current;
      if (positions.length === 0) return;

      // 판단 기준은 뷰포트 중앙 — 화면 가운데 있는 막의 색이 지배한다
      const focus = scrollY + viewportH / 2;

      const root = document.documentElement;

      // 배경은 넓은 단색 면이라 한 단계만 건너뛰어도 띠가 보인다 — 매끄럽게 둔다.
      root.style.setProperty('--bg', sampleStops(bg, positions, focus, 0, easeTrailing));

      // 글자 색은 배경을 따라가지 않고 한 지점에서 갈아탄다.
      // 같은 곡선으로 천천히 따라가면 중간에서 배경과 글자가 같은 밝기가 되어
      // 본문이 통째로 사라진다(3막→4막 한가운데에서 실제로 그랬다).
      //
      // 덤으로 성능도 여기서 나온다. --fg 가 바뀌면 화면에 보이는 글리프가
      // 전부 다시 래스터화되고, 파생 유틸(text-soft / border-hair / surface 의
      // color-mix)도 함께 재계산된다. 갈아타는 구간이 좁을수록 그 횟수가 줄고,
      // 12단계 양자화가 남은 프레임을 더 줄인다(측정: 20.9ms → 7ms).
      root.style.setProperty('--fg', sampleStops(fg, positions, focus, FG_STEPS, EASE_FG));

      let nearest = 0;
      let best = Infinity;
      for (let i = 0; i < positions.length; i += 1) {
        const d = Math.abs(positions[i] - focus);
        if (d < best) {
          best = d;
          nearest = i;
        }
      }

      const act = Math.floor(nearest / 2); // stop 두 개가 막 하나
      if (act !== activeRef.current) {
        activeRef.current = act;
        onActChange?.(act);

        const meta = document.querySelector('meta[name="theme-color"]');
        if (meta) meta.setAttribute('content', ACTS[act].bg);
      }
    },
    [onActChange],
  );

  useScrollProgress(handleScroll);

  return null;
}

export default BackgroundStage;
