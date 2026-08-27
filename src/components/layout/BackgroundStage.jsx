import { useCallback, useEffect, useRef } from 'react';
import { useScrollProgress } from '../../hooks/useScrollProgress';
import { ACTS } from '../../theme/palette';
import { easeTrailing, sampleStops } from '../../lib/color';
import { documentTop } from '../../lib/dom';

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


export function BackgroundStage({ onActChange }) {
  const stopsRef = useRef({ positions: [], bg: [] });
  const activeRef = useRef(-1);

  const measure = useCallback(() => {
    const els = Array.from(document.querySelectorAll('[data-act]'));
    const vh = window.innerHeight;

    const positions = [];
    const bg = [];

    for (let i = 0; i < els.length; i += 1) {
      const el = els[i];
      const act = ACTS[Number(el.dataset.act)];
      if (!act) continue;

      // 마지막 막만 늦게 도착시킨다.
      //
      // 색은 앞 막의 출발 지점부터 다음 막의 도착 지점까지 이어지므로,
      // 도착을 늦추면 그만큼 천천히 물든다. 1~3막이 같은 어둠을 쓰게 되면서
      // 마지막 변화 폭이 밝기 13 → 243 으로 커졌는데, 예전(50 → 243)과 같은
      // 거리에 그 폭을 밀어 넣으니 급해 보였다. 이 막에만 반 화면을 더 준다.
      // 4막 도착을 늦추면 색이 천천히 물들지만, 너무 늦추면 "잔치" 글씨가
      // 다 떠오른 뒤에도 배경이 중간 회색에 머문다(실측: --act4-in 1.000 인데
      // 밝기 149, 최대 243 은 한참 뒤). 4막 본문은 소멸 진행도 d 가 1 로
      // 포화하는 지점 — 3막 페이지의 아랫변이 화면 위로 빠지는 그 순간 —
      // 에 완성되므로, 색도 거기서 끝나야 한다. 늦추지 않는다.
      const arriveLift = 0;

      // 마지막 바로 앞 막(3막)의 출발점.
      //
      // 0.6 화면을 당겼더니 3막이 아직 opacity 1.00 으로 또렷한데 배경이
      // 벌써 밝기 98(중간 회색)까지 올라 있었다 — 밝은 바탕에 밝은 글씨라
      // 읽히지 않았다. 물드는 것은 3막이 녹기 시작한 뒤여야 한다.
      // 살짝만 당겨 소멸이 시작되는 지점에 맞추고, 완만함은 도착을 늦춰서 낸다.
      // 완만함은 도착을 늦추는 대신 출발을 당겨서 낸다.
      // 너무 당기면 3막이 아직 또렷한데 배경이 떠오르므로 조금만 당긴다.
      const departPull = i === els.length - 2 ? vh * 0.15 : 0;

      // 막이 페이지 안에 들어 있으면 페이지를 기준으로 잰다.
      //
      // 막은 sticky 로 화면에 붙어 있고 글은 transform 으로 밀린다. 그래서
      // 섹션의 레이아웃 위치와 높이는 "이 막을 읽는 데 드는 스크롤"과 더 이상
      // 같지 않다. 섹션 기준으로 색 지점을 잡았더니 3막이 아직 화면에 또렷한데
      // 배경이 먼저 밝아졌다 — 밝은 바탕에 밝은 글씨라 담벼락이 안 읽혔다
      // (실측: 담벼락 짙기 1.00 인데 배경 밝기가 176).
      //
      // 페이지는 들어오는 구간·글·머무는 구간을 모두 자기 높이에 싣고 있으므로,
      // 그 높이가 곧 스크롤 길이다. 색은 그것을 따라가야 한다.
      const host = el.closest('[data-page]') ?? el;
      const top = documentTop(host);
      const h = host.offsetHeight;

      // 도착: 그 막의 첫 화면이 뷰포트 중앙에 올 때
      const arrive = top + Math.min(h, vh) / 2 + arriveLift;
      // 출발: 그 막의 끝이 뷰포트 바닥에 닿을 때
      const depart = Math.max(arrive, top + h - vh / 2 - departPull);

      positions.push(arrive, depart);
      bg.push(act.bg, act.bg);
    }

    stopsRef.current = { positions, bg };
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
      const { positions, bg } = stopsRef.current;
      if (positions.length === 0) return;

      // 판단 기준은 뷰포트 중앙 — 화면 가운데 있는 막의 색이 지배한다
      const focus = scrollY + viewportH / 2;

      const root = document.documentElement;

      // 배경만 보간한다. 글자 색은 건드리지 않는다.
      //
      // 전에는 --fg 도 같이 보간했는데, 어두운배경+밝은글자에서
      // 밝은배경+어두운글자로 가는 도중 두 색이 서로를 통과하면서 4막 본문이
      // 통째로 사라졌다. 한 지점에서 갈아타게 고쳤더니 이번엔 글자색이 "탁"
      // 하고 튀었다. 둘 다 같은 뿌리였다 — 하나의 --fg 로 두 세계를 다 덮으려 한 것.
      //
      // 지금은 1~3막이 --fg 를 밝은 값으로 계속 쓰고, 4막은 자기 섹션에서
      // 어두운 값으로 덮어쓴 뒤 내용을 서서히 띄운다(--act4-in). 갈아타는
      // 순간 자체가 없다. 덤으로 램프 구간에서 글리프 재래스터도 사라져서
      // 프레임도 같이 좋아진다.
      root.style.setProperty('--bg', sampleStops(bg, positions, focus, 0, easeTrailing));

      // 지나온 도착 지점 중 마지막 것이 지금 막이다.
      //
      // 전에는 가장 가까운 stop 을 골랐다. 막마다 스크롤 길이가 비슷할 때는
      // 그래도 됐지만, 막이 sticky 로 붙고 넘김 구간까지 자기 높이에 실으면서
      // 길이가 제각각이 됐다. 그러자 앞 막의 출발 지점이 다음 막의 도착
      // 지점보다 가까운 구간이 생겨 목차가 뒤로 튀었다
      // (실측: 1-2-1-3-2-3-4 순서로 움직였다).
      //
      // 지나왔는지로 판단하면 스크롤을 내리는 동안 번호가 줄어들 수 없다.
      // stop 은 막마다 둘(도착, 출발)이라 짝수 자리가 도착 지점이다.
      let act = 0;
      for (let i = 0; i < positions.length; i += 2) {
        if (focus >= positions[i]) act = i / 2;
      }
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
