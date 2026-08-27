import { useCallback, useEffect, useRef } from 'react';
import { useViewportFrame } from '../../hooks/useViewportFrame';
import { TURN_PHASE, TURN_READ_START, TURN_RUNWAY } from '../../lib/anim';
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion';
import {
  ALLOW_BLUR,
  MAX_BLUR_PX,
  SUPPORTS_MASK,
  clamp01,
  easeTurn,
  easeSoft,
  stage,
} from '../../lib/motion';

/**
 * 책의 한 페이지.
 *
 * A. 넘김 — 스크롤에 물린 평면 슬라이드.
 *    들어올 때 translateX(6%) → 0, 나갈 때 0 → translateX(-8%).
 *    시간 기반 트랜지션이면 스크롤을 되감는 동안 제 시간표대로 진행돼서
 *    "언제든 되돌릴 수 있어야 한다"는 조건과 충돌하므로 진행도에 건다.
 *    램프 구간은 뷰포트 높이의 35% — 보통 속도에서 대략 700ms 에 해당한다.
 *    곡선은 easeTurn(smoothstep)이다. 명세의 cubic-bezier(0.16,1,0.3,1) 은
 *    감속 곡선이라 스크롤 거리에 얹으면 이동량이 진입 직후 40px 안에서
 *    다 끝나 버려 넘김이 보이지 않는다. motion.js 의 주석 참고.
 *
 * B. 소멸 — dissolve 페이지(3막)에서만. 3단계 전부 스크롤 진행도에 물려 있어
 *    되감으면 그대로 되돌아온다. 이 페이지는 퇴장 슬라이드를 걸지 않는다.
 *    "퍼져나가는" 소멸과 왼쪽으로 빠지는 슬라이드는 방향이 어긋나기 때문이다.
 */

const EXIT_WINDOW = 0.35; // 뷰포트 높이 대비

/**
 * 섹션 상단 여백을 아직 못 쟀을 때 쓰는 값 (py-32 = 8rem).
 * 첫 글줄은 페이지 윗변보다 이만큼 아래에 있다 — 넘김 램프의 기준점이다.
 */
const FALLBACK_PAD = 128;

/**
 * 3막의 글이 끝난 뒤 소멸이 시작되기까지 머무는 구간 (뷰포트 높이 대비).
 * 3막의 끝은 담벼락이라 글을 쓸 시간이 필요하다.
 *
 * 0.6 은 너무 길었다 — 아무 일도 안 일어나는 구간을 한 화면 넘게 굴려야 했다.
 * 0.28 도 여전히 길었다. 멈췄다가 갑자기 다 일어나니 뚝 끊겼다 몰아치는 것처럼
 * 보였다. 멈춤을 줄인 만큼 소멸(DISSOLVE_SPAN)에 넘겨서, 서 있는 시간 대신
 * 움직이는 시간을 늘렸다. 전체 길이는 거의 그대로다.
 */
const DISSOLVE_HOLD = 0.14;

/**
 * 소멸이 도는 거리 (뷰포트 높이 대비).
 *
 * 좁히면 빨리 지나가지만 그만큼 급해 보인다. 멈춰 있던 구간을 줄여
 * 여기에 돌려주었으므로, 전체 길이는 그대로 두면서 움직임만 완만해진다.
 */
const DISSOLVE_SPAN = 1.0;

const ENTER_X = 6; // %
const EXIT_X = -8; // %

/** 같은 값을 다시 쓰지 않는다 — 불필요한 스타일 무효화를 막는다 */
function write(el, cache, prop, value) {
  if (cache[prop] === value) return;
  cache[prop] = value;
  el.style[prop] = value;
}

/** 커스텀 속성은 style[prop] 대입으로는 안 먹는다 — setProperty 를 써야 한다 */
function writeCustom(el, cache, name, value) {
  if (cache[name] === value) return;
  cache[name] = value;
  el.style.setProperty(name, value);
}

function writeVar(cache, name, value) {
  writeCustom(document.documentElement, cache, name, value);
}

export function Page({ index, dissolve = false, className = '', children }) {
  const pageRef = useRef(null);
  const contentRef = useRef(null);
  const innerRef = useRef(null);
  const lightRef = useRef(null);

  /* 이 막의 글이 실제로 차지하는 높이. 스크롤 길이를 여기에 맞춰 준다. */
  const innerHRef = useRef(0);

  const pageCache = useRef({});
  const contentCache = useRef({});
  const innerCache = useRef({});
  const lightCache = useRef({});
  const rootCache = useRef({});

  // 첫 글줄까지의 거리(섹션 상단 여백). 넘김 램프의 기준점이라 실제 값을 쓴다.
  // 매 프레임 getComputedStyle 을 부르면 스타일 재계산이 강제되므로 한 번만 재고,
  // sm 경계(py-24 ↔ py-32)를 넘나들 수 있으니 창 크기가 바뀔 때만 다시 잰다.
  const padRef = useRef(FALLBACK_PAD);

  useEffect(() => {
    const measurePad = () => {
      const section = contentRef.current?.querySelector('section');
      if (!section) return;
      const pt = Number.parseFloat(getComputedStyle(section).paddingTop);
      if (Number.isFinite(pt) && pt > 0) padRef.current = pt;
    };

    measurePad();
    window.addEventListener('resize', measurePad);
    return () => window.removeEventListener('resize', measurePad);
  }, []);

  /*
   * 이 막이 화면에 붙어 있는 동안 쓸 스크롤 길이를 만든다.
   *
   * .page-content 를 sticky 로 붙이면 그 안의 글이 흐름에서 빠지므로, 바깥
   * .page 의 높이가 한 화면으로 쪼그라든다. 그러면 붙어 있을 구간 자체가 없다.
   * 글의 실제 높이를 재서 .page 에 그대로 실어 줘야 그만큼 붙어 있을 수 있다.
   *
   * 매 프레임 재지 않는다 — 레이아웃 읽기는 비싸고, 값이 바뀌는 건 창 크기나
   * 웹폰트가 바뀔 때뿐이다.
   */
  useEffect(() => {
    const measureHeight = () => {
      const inner = innerRef.current;
      const page = pageRef.current;
      if (!inner || !page) return;

      const h = inner.scrollHeight;
      if (!h) return;

      innerHRef.current = h;

      // 붙어 있어야 하는 스크롤 길이 = 들어오는 구간 + 글 + 나가는 구간.
      //
      // 처음에는 나가는 구간만 더했다가, sticky 가 넘김이 끝나기 한 구간 전에
      // 풀려 버렸다. 그 사이 앞 막과 뒷 막이 둘 다 또렷하게 남았다
      // (실측: y=5858~6666 에서 2막·3막이 동시에 opacity 1.00).
      // 들어오는 구간도 자기 높이에 들어 있어야 그만큼 붙어 있을 수 있다.
      const runway = window.innerHeight * TURN_RUNWAY;
      const runIn = index === 0 ? 0 : runway;
      // 소멸 페이지(3막)는 넘길 다음 장이 없다 — 책이 빛으로 흩어질 뿐이다.
      // 그래서 넘김 구간(runway)은 필요 없지만, 아예 0 으로 두면 글이 끝나는
      // 그 자리에서 곧바로 소멸이 시작된다. 3막의 끝은 담벼락 — 글을 쓰는
      // 자리다. 소멸이 거기서 시작되면 쓰는 도중에 배경이 밝아지고 입력칸이
      // 녹는다(실측: 담벼락이 화면 한복판 top=239 인데 배경 밝기가 49→85,
      // top=0 에서는 이미 150 이었다).
      //
      // 그래서 넘김 대신 "머무는 구간"을 준다. 여기서는 아무 일도 일어나지
      // 않고 담벼락이 화면에 그대로 있다. 소멸은 이 구간을 지나야 시작된다.
      const runOut = dissolve ? window.innerHeight * DISSOLVE_HOLD : runway;
      // 글이 다시 움직이기 시작하는 지점까지만 넘김 구간을 셈에 넣는다.
      // 구간 전체를 넣으면 넘김이 끝난 뒤에도 굴릴 거리가 남아 텀이 생긴다.
      page.style.height = `${runIn * TURN_READ_START + h + runOut}px`;

      // 첫 막이 아니면, 앞 막의 넘김 구간과 같은 자리에 겹쳐 놓는다.
      // 이 막이 문서에서 뒤에 있으므로 앞 막 위에 그려진다 — 넘김이 끝나면
      // 이 막이 앞 막을 덮어 가린다.
      //
      // 당기는 양이 runway 뿐이면 한 화면만큼 모자란다.
      // 앞 막의 글이 다 밀려 올라간 지점은 (글높이 - 한 화면)이지 글높이가 아니다.
      // 그 차이(vh)를 빼먹었더니 넘김 구간이 앞 막이 떨어져 나간 뒤에 시작해서,
      // 구간 내내 아무 막도 안 보인 채 종이만 넘어갔다(실측: 보이는 막 0개).
      page.style.marginTop = index === 0 ? '' : `${-(runway + window.innerHeight)}px`;
    };

    measureHeight();

    const ro = new ResizeObserver(measureHeight);
    if (innerRef.current) ro.observe(innerRef.current);
    window.addEventListener('resize', measureHeight);
    if (document.fonts?.ready) document.fonts.ready.then(measureHeight).catch(() => {});

    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measureHeight);
    };
  }, [dissolve, index]);

  const reduced = usePrefersReducedMotion();

  const onFrame = useCallback(
    (rect, vh) => {
      const page = pageRef.current;
      const content = contentRef.current;
      if (!page || !content) return;

      const pc = pageCache.current;
      const cc = contentCache.current;
      const lc = lightCache.current;
      const rc = rootCache.current;

      /* ── 모션 축소: 넘김·소멸 생략, 200ms 크로스페이드로 대체 ── */
      if (reduced) {
        write(page, pc, 'transform', '');
        write(page, pc, 'opacity', '');
        write(page, pc, 'willChange', 'auto');

        write(content, cc, 'transform', '');
        write(content, cc, 'maskImage', '');
        write(content, cc, 'WebkitMaskImage', '');

        // 붙여 두지 않는다 — 모션 축소에서는 글이 평범하게 흘러야 한다.
        if (innerRef.current) {
          write(innerRef.current, innerCache.current, 'transform', '');
          write(innerRef.current, innerCache.current, 'willChange', 'auto');
        }

        if (dissolve) {
          const d = clamp01((vh - rect.bottom) / (vh * DISSOLVE_SPAN));
          const past = d > 0.5;
          write(content, cc, 'opacity', past ? '0' : '1');
          if (lightRef.current) write(lightRef.current, lc, 'opacity', '0');
          writeVar(rc, '--flow-o', past ? '0.34' : '0');
          writeVar(rc, '--flow-y', '38vh');
          writeVar(rc, '--act4-in', '1'); // 모션 축소에서는 4막을 그냥 띄워 둔다
        }
        return;
      }

      /* ── A. 넘김 ── */
      //
      // 램프를 페이지 윗변이 아니라 "첫 글줄"에 건다.
      //
      // 전에는 윗변이 화면 아래에서 35vh 올라오는 동안 슬라이드를 다 끝냈다.
      // 그런데 막은 min-h-dvh 에 py-32 라 그 35vh 구간에는 글이 한 줄도 없다.
      // 글이 보이기 시작할 무렵에는 enter 가 이미 1이어서 넘김이 끝나 있었다 —
      // 계산은 매 프레임 돌지만 화면에서는 아무 일도 일어나지 않았다.
      // (1440x900 기준 실측: 글 첫 줄이 화면에 들어올 때 x 는 이미 0.0%)
      //
      //   시작 — 첫 글줄이 화면 아래 끝에 닿는 순간      (rect.top = vh - pad)
      //   끝  — 앞 페이지가 퇴장을 시작하는 지점         (rect.top = vh * EXIT_WINDOW)
      //
      // 끝을 이보다 늦추면 앞 페이지가 나가는 동안 이 페이지가 들어오게 된다.
      // 두 장이 동시에 반투명해지면서 세로 이음매와 잘린 글자가 드러나는데,
      // ActNav 주석에 적힌 그 증상이 스크롤만 해도 나오게 된다. 여기서 끊는다.
      // 막이 화면에 붙어 있는 동안의 스크롤을 세 구간으로 나눈다.
      //
      //   1. 들어옴 — 앞 막의 넘김 구간과 겹친 자리. 종이가 넘어가는 중이라
      //               이 막은 아직 안 보인다. 절반이 지나야 떠오른다.
      //   2. 읽기   — 글이 위로 밀린다.
      //   3. 넘김   — 글은 멈추고 종이만 넘어간다. 이 막은 물러난다.
      //
      // 전에는 1과 2가 한꺼번에 일어나서 "종이가 넘어가는 것"과 "뒷 막의 글이
      // 나타나는 것"이 동시에 보였다. 구간을 갈라야 넘기고 나서 읽게 된다.
      const runway = vh * TURN_RUNWAY;
      const runIn = index === 0 ? 0 : runway; // 첫 막 앞에는 넘길 앞 장이 없다
      const travel = Math.max(innerHRef.current - vh, 0);
      const scrolled = -rect.top;

      const enterP = runIn > 0 ? clamp01(scrolled / runIn) : 1;
      // 종이가 다 넘어간 뒤에야 떠오른다.
      const appear = runIn > 0 ? stage(enterP, ...TURN_PHASE.fadeIn) : 1;

      // 넘김 구간이 다 지나기를 기다리지 않는다. 글이 다 떠오른 지점부터
      // 곧바로 밀린다 — 그래야 넘김과 읽기 사이가 붙는다.
      const readBase = runIn * TURN_READ_START;
      const readP = travel > 0 ? clamp01((scrolled - readBase) / travel) : 0;

      const outP = clamp01((scrolled - readBase - travel) / runway);
      // 종이가 넘어가기 "전에" 걷힌다. 반대로 하면 종이가 또렷한 글 위를 지나가
      // 글자가 종이에 끌려가는 것처럼 보인다.
      //
      // 소멸 페이지(3막)는 예외다. 저 아래 소멸 단계가 직접 걷어 내므로
      // 여기서 또 지우면 빛으로 흩어지는 장면이 통째로 사라진다.
      const recede = dissolve ? 1 : 1 - easeSoft(stage(outP, ...TURN_PHASE.fadeOut));

      // 아래 소멸 단계에도 inner 라는 이름이 있다(마스크 반경). 겹치지 않게 둔다.
      const innerEl = innerRef.current;
      if (innerEl) {
        const ic = innerCache.current;
        const shift = -travel * readP;
        write(innerEl, ic, 'transform', `translate3d(0,${shift.toFixed(1)}px,0)`);

        write(innerEl, ic, 'willChange', readP > 0 && readP < 1 ? 'transform' : 'auto');
      }

      // 막이 통째로 뜨고 지는 것은 여기서, 그 안의 블록이 하나씩 올라오는 것은
      // Reveal 이 맡는다(components/layout/Reveal.jsx).
      //
      // 한때 가림막(mask)을 씌워 위에서 아래로 걷었는데, 그건 "이미 다 적힌
      // 페이지를 덮개만 치우는" 것으로 보였다. 글은 블록마다 제 차례에
      // 올라와야 페이지가 쓰이는 것처럼 읽힌다.
      const pageOpacity = appear * recede;
      const fading = pageOpacity < 0.999;
      write(page, pc, 'transform', '');
      write(page, pc, 'opacity', fading ? pageOpacity.toFixed(3) : '');
      write(page, pc, 'willChange', fading ? 'opacity' : 'auto');

      if (!dissolve) return;

      /* ── B. 소멸 (3막 → 4막) ── */
      const d = clamp01((vh - rect.bottom) / (vh * DISSOLVE_SPAN));

      // 세 단계를 서로 겹쳐 둔다.
      //
      // 예전에는 0~0.4 / 0.4~0.75 / 0.75~1 로 딱딱 끊어 놓았다. 한 단계가
      // 끝나야 다음이 시작되니 이음매마다 속도가 꺾였고, 특히 용해 구간이
      // 좁아서 3막이 뚝 하고 사라졌다(실측: 담벼락 짙기가 1.00 에서 0.08 로
      // 한 걸음에 떨어졌다). 겹쳐 두면 끊기는 자리가 없어진다.
      const s1 = easeSoft(stage(d, 0, 0.45)); // 스밈
      const s2 = easeSoft(stage(d, 0.28, 0.88)); // 용해 — 넉넉하게 끈다
      const s3 = easeSoft(stage(d, 0.72, 1)); // 흘러내림

      // 연출을 걸 자리는 "지금 화면에 남아 있는 페이지 영역"이다.
      // 페이지 하단에 고정하면 스크롤이 올라갈수록 그라데이션 중심이 화면
      // 밖으로 빠져나가고 투명한 한가운데만 보인다 — 아무 일도 안 일어나는 것처럼 보인다.
      const bandTopVp = Math.max(0, rect.top);
      const bandBottomVp = Math.min(vh, rect.bottom);
      const bandH = Math.max(1, bandBottomVp - bandTopVp);
      const bandTopEl = bandTopVp - rect.top; // 요소 좌표로 옮긴 밴드 상단

      // 1단계: 가장자리부터 안쪽으로. 종이는 밝아지고, 바깥부터 마스크가 걷힌다.
      // 2단계: 남은 종이와 글자가 함께 옅어지며 아주 살짝 퍼진다.
      const inner = 100 - 35 * s1 - 45 * s2; // 100 → 65 → 20
      const outer = inner + 25;

      if (SUPPORTS_MASK && d > 0.001) {
        // 마스크가 걸리는 곳은 .page-content 다. 그 상자는 sticky 로 붙어 있어
        // 높이가 화면 한 장(806px)인데, 위에서 잰 밴드는 .page 기준이라
        // 좌표가 2,000px 넘게 어긋난다. 그대로 쓰면 마스크 이미지가 상자 밖에
        // 놓이고, mask-repeat 이 no-repeat 이라 바깥은 전부 투명 —
        // 소멸이 시작되는 순간 내용이 통째로 지워졌다(실측: maskPosition
        // "50% 2328px" 인데 상자 높이는 806px).
        //
        // .page-light 는 .page 안에 놓이므로 위의 밴드를 그대로 쓴다.
        // 마스크만 자기 상자 기준으로 다시 잰다.
        const crect = content.getBoundingClientRect();
        const maskTopVp = Math.max(0, crect.top);
        const maskBottomVp = Math.min(vh, crect.bottom);
        const maskH = Math.max(1, maskBottomVp - maskTopVp);
        const maskTopEl = maskTopVp - crect.top;

        const mask = `radial-gradient(115% 85% at 50% 45%, #000 ${inner.toFixed(1)}%, transparent ${outer.toFixed(1)}%)`;
        const size = `100% ${maskH.toFixed(0)}px`;
        const pos = `50% ${maskTopEl.toFixed(0)}px`;
        write(content, cc, 'maskImage', mask);
        write(content, cc, 'WebkitMaskImage', mask);
        write(content, cc, 'maskSize', size);
        write(content, cc, 'WebkitMaskSize', size);
        write(content, cc, 'maskPosition', pos);
        write(content, cc, 'WebkitMaskPosition', pos);
        write(content, cc, 'maskRepeat', 'no-repeat');
        write(content, cc, 'WebkitMaskRepeat', 'no-repeat');
      } else {
        write(content, cc, 'maskImage', '');
        write(content, cc, 'WebkitMaskImage', '');
      }

      const scale = 1 + 0.04 * s2;
      // 확대 기준점을 지금 보고 있는 지점에 둔다.
      // 막이 뷰포트보다 훨씬 길어서, 요소 중심을 기준으로 키우면 화면 밖에서 부푼다.
      const originY = clamp01((vh / 2 - rect.top) / Math.max(rect.height, 1)) * rect.height;

      // mask-image 를 못 쓰면 1단계의 "가장자리부터"가 표현되지 않으므로,
      // 그때는 전체 구간에 걸친 단순 opacity 페이드로 대체한다.
      const contentOpacity = SUPPORTS_MASK ? 1 - s2 : 1 - easeSoft(stage(d, 0.1, 0.75));

      const dissolving = d > 0.001;
      write(content, cc, 'willChange', dissolving ? 'transform, opacity' : 'auto');
      write(content, cc, 'transformOrigin', `50% ${originY.toFixed(0)}px`);
      write(content, cc, 'transform', dissolving ? `scale(${scale.toFixed(4)})` : '');
      write(content, cc, 'opacity', dissolving ? contentOpacity.toFixed(3) : '');

      // 빛 레이어 — 내용과 함께 사라지면 안 되므로 content 바깥에 둔다
      const light = lightRef.current;
      if (light) {
        const a = 100 - 60 * s1; // 투명한 중심이 좁아진다
        const alpha = 0.12 + 0.46 * s1;
        const lightOpacity = s1 * (1 - 0.9 * s3);

        // 빛은 페이지가 끝나는 자리에서 멈추면 안 된다. 거기서 끊으면
        // 밝은 띠와 어두운 바탕이 가로선으로 맞붙는다. 아래로 한참 흘려보내고
        // 그 구간에서 서서히 사라지게 한다 — 빛이 넘치는 게 개념상으로도 맞다.
        const spill = vh * 0.42;
        const total = bandH + spill;
        write(light, lc, 'top', `${bandTopEl.toFixed(0)}px`);
        write(light, lc, 'height', `${total.toFixed(0)}px`);
        const solid = (bandH / total) * 55;
        // 위쪽도 흐려서 끝낸다. 다만 처음부터는 아니다 —
        // 1단계는 "가장자리부터 안쪽으로"라 위 가장자리도 빛나야 한다.
        // 종이가 옅어지기 시작하면(2단계) 그때부터 위를 걷어서, 남은 빛이
        // 화면 위에 걸린 판때기가 아니라 아래에서 번져 올라온 것으로 읽히게 한다.
        const topSpan = Math.min((bandH * 0.4 * s2) / total * 100, solid * 0.8);
        writeCustom(light, lc, '--light-top', `${topSpan.toFixed(1)}%`);
        writeCustom(light, lc, '--light-solid', `${solid.toFixed(1)}%`);
        writeCustom(light, lc, '--light-end', `${((bandH / total) * 100 + 42).toFixed(1)}%`);

        // 빛은 색을 덧칠하는 게 아니라 밝기를 올려야 한다.
        // 앰버(#E0A75C)를 어두운 슬레이트 위에 얹으면 녹슨 갈색이 된다 —
        // 4막 종이색에 가까운 따뜻한 흰빛으로 번지게 하고,
        // 바깥 가장자리에만 아주 옅은 온기를 남긴다.
        //
        // 크기와 중심을 % 가 아니라 px 로 잡는다. % 로 두고 배경을 페이지
        // 영역 높이에 맞춰 자르면, 흘러내리는 구간에는 그림이 아예 없어서
        // 페이지가 끝나는 자리에 가로선이 그대로 남는다. px 로 고정하면
        // 빛의 중심은 페이지에 붙어 있고, 마지막 색이 아래까지 이어져
        // 마스크가 그 부분을 자연스럽게 걷어 간다.
        const rx = Math.round(rect.width * 1.15);
        const ry = Math.round(bandH * 0.85);
        const cy = Math.round(bandH * 0.45);
        write(
          light,
          lc,
          'background',
          `radial-gradient(${rx}px ${ry}px at 50% ${cy}px, ` +
            `transparent ${a.toFixed(1)}%, ` +
            `rgba(249,242,229,${(alpha * 0.72).toFixed(3)}) ${(a + 20).toFixed(1)}%, ` +
            `rgba(243,221,187,${alpha.toFixed(3)}) ${(a + 34).toFixed(1)}%)`,
        );
        write(light, lc, 'opacity', lightOpacity.toFixed(3));
        write(light, lc, 'willChange', lightOpacity > 0.001 ? 'opacity' : 'auto');

        // 블러는 내용 전체(수천 px)가 아니라 이 레이어 뒤쪽만 흐린다.
        // filter 를 긴 요소에 걸면 매 프레임 그 높이를 다시 그린다.
        if (ALLOW_BLUR) {
          // 3단계에 들어가면 다시 걷는다. 그대로 두면 남은 옅은 레이어가
          // 밑에서 올라오는 4막 본문을 흐리게 비춘다.
          const blur = MAX_BLUR_PX * s2 * (1 - s3);
          const value = blur > 0.05 ? `blur(${blur.toFixed(2)}px)` : '';
          write(light, lc, 'backdropFilter', value);
          write(light, lc, 'WebkitBackdropFilter', value);
        }
      }

      // 3단계: 남은 빛이 화면 아래로 흘러 4막의 식탁 조명이 된다.
      // 고정 레이어(TableLight)가 읽어 가도록 루트 변수로 넘긴다.
      writeVar(rc, '--flow-y', `${(5 + 33 * s3).toFixed(2)}vh`);
      // 배경이 밝아질수록 같은 알파가 과해지므로 끝에서 낮춘다
      writeVar(rc, '--flow-o', (s3 * (0.42 - 0.08 * s3)).toFixed(3));

      // 4막이 도착하는 정도. 4막은 자기 글자색(어두움)을 이미 쓰고 있고,
      // 이 값으로 서서히 떠오른다. 처음에는 어두운 바탕에 어두운 글자라
      // 보이지 않는데, 그게 맞다 — 아직 도착하지 않은 것이다.
      // 3막이 걷히는 것과 4막이 도착하는 것 사이가 비면 허전하다.
      // 겹쳐서 받는다 — 흩어지는 빛 위로 4막이 떠오르는 편이 이어져 보인다.
      // 다만 너무 빨리 다 떠오르면 3막이 아직 녹는 중에 4막이 완성돼 있어
      // 두 장면이 겹쳐 보인다. 용해와 나란히 가도록 끝을 늦춘다.
      writeVar(rc, '--act4-in', easeSoft(stage(d, 0.3, 0.95)).toFixed(3));
    },
    [reduced, dissolve],
  );

  useViewportFrame(pageRef, onFrame);

  return (
    <div ref={pageRef} data-page={index} className={`page ${className}`}>
      {/* 이 막이 화면에 붙어 있는 동안(sticky) 스크롤은 안쪽 글을 밀어 올린다.
          그래서 한 번에 한 막만 화면에 있고, 스크롤은 그 막의 진행을 재생한다.
          animejs.com 이 쓰는 pin + scrub 과 같은 구조다. */}
      <div ref={contentRef} className="page-content">
        <div ref={innerRef} className="page-inner">
          {children}
        </div>
        {/* 제본 접힘과 종이 끝은 고정된 책(BookStage)이 그린다.
            여기서도 그리면 같은 자리에 두 겹이 앉아 이중 테두리가 생긴다. */}
      </div>

      {dissolve ? <span ref={lightRef} aria-hidden="true" className="page-light" /> : null}
    </div>
  );
}

export default Page;
