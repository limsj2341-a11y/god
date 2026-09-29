import { useCallback, useEffect, useRef } from 'react';
import { useViewportFrame } from '../../hooks/useViewportFrame';
import { TURN_PHASE, TURN_READ_START, TURN_RUNWAY } from '../../lib/anim';
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion';
import {
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
 * B. 소멸 — dissolve 페이지(3막)에서만. 지면이 녹고 등불 자리에서 새벽이 번진다
 *    (Dawn). 전부 스크롤 진행도에 물려 있어 되감으면 그대로 되돌아온다.
 *    이 페이지는 퇴장 슬라이드를 걸지 않는다.
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
  if (cache[name] === value) return;
  for (const el of homesOf(name)) el.style.setProperty(name, value);
  cache[name] = value;
}

/**
 * 소멸 연출 값을 받는 자리.
 *
 * 전에는 전부 루트(html)에 썼다. 루트의 사용자 정의 속성은 페이지 전체가 물려받아
 * 매 프레임 1,400개 요소의 스타일을 다시 계산했다 — 새벽 전환에서 렉이 걸린
 * 까닭이다. 값을 실제로 읽는 요소(또는 그 작은 상자)에만 쓴다.
 */
const VAR_HOME = {
  '--dawn-s': '.dawn',
  '--dawn': '.dawn',
  '--dissolve': '.dawn',
  '--book-gone': '.book-stage',
  '--flow-y': '.table-scope',
  '--flow-o': '.table-scope',
};

const homeEls = {};

/** 값을 받는 요소들. 책(.book-stage)처럼 같은 값을 읽는 요소가 둘 이상일 수 있다. */
function homesOf(name) {
  const sel = VAR_HOME[name];
  if (!sel) return [document.documentElement];
  const cached = homeEls[sel];
  if (cached && cached.length && cached.every((el) => el.isConnected)) return cached;
  const els = Array.from(document.querySelectorAll(sel));
  homeEls[sel] = els;
  return els.length ? els : [document.documentElement];
}

/** 4막이 떠오르는 정도. 4막 상자의 투명도에 바로 쓴다 — 변수로 두면 4막 전체가 물려받는다. */
function writeAct4(cache, value) {
  if (cache.act4 === value) return;
  const el = document.querySelector('.act4-arrive');
  if (!el) return;
  cache.act4 = value;
  el.style.opacity = value;
}

/**
 * 새벽(Dawn)과 식탁 조명을 그릴지.
 *
 * 둘 다 화면보다 훨씬 큰 판이라, 안 보이는 동안에도 그려 두면 그만큼 합성
 * 메모리를 쥐고 있다(휴대폰에서 판 하나가 1,700px 사방). 소멸이 시작되기 전에는
 * 아예 그리지 않는다 — index.css 가 이 표시가 없으면 display: none 으로 둔다.
 */
function markDawn(cache, on) {
  const v = on ? '1' : '';
  if (cache.dawnMark === v) return;
  cache.dawnMark = v;
  if (on) document.documentElement.dataset.dawn = '';
  else delete document.documentElement.dataset.dawn;
}

export function Page({ index, dissolve = false, className = '', children }) {
  const pageRef = useRef(null);
  const contentRef = useRef(null);
  const innerRef = useRef(null);
  const sheetRef = useRef(null);

  /* 이 막의 글이 실제로 차지하는 높이. 스크롤 길이를 여기에 맞춰 준다. */
  const innerHRef = useRef(0);

  const pageCache = useRef({});
  const contentCache = useRef({});
  const innerCache = useRef({});
  const sheetCache = useRef({});
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

        // 지면도 젖히지 않는다. 넘김은 모션 축소에서 생략하기로 한 연출이라
        // .book-leaf 도 display:none 이다 — 지면만 돌면 짝이 맞지 않는다.
        if (sheetRef.current) {
          const sc = sheetCache.current;
          write(sheetRef.current, sc, 'transform', '');
          write(sheetRef.current, sc, 'backgroundColor', '');
          write(sheetRef.current, sc, 'boxShadow', '');
          write(sheetRef.current, sc, 'willChange', 'auto');
        }

        // 넘김이 없으므로 막이 서로 덮지 않는다 — 클릭을 막을 이유도 없다.
        write(page, pc, 'pointerEvents', '');
        write(content, cc, 'pointerEvents', '');

        if (dissolve) {
          const d = clamp01((vh - rect.bottom) / (vh * DISSOLVE_SPAN));
          const past = d > 0.5;
          write(content, cc, 'opacity', past ? '0' : '1');
          writeVar(rc, '--flow-o', past ? '0.34' : '0');
          writeVar(rc, '--flow-y', '38vh');
          // 새벽은 번지지 않고 한 번에 바뀐다. 절반을 넘으면 4막의 밝음이다.
          writeVar(rc, '--dawn-s', past ? '1' : '0');
          writeVar(rc, '--dawn', past ? '1' : '0');
          writeVar(rc, '--dissolve', '0');
          writeVar(rc, '--book-gone', past ? '1' : '0');
          markDawn(rc, past);
          writeAct4(rc, '1'); // 모션 축소에서는 4막을 그냥 띄워 둔다
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

      /*
       * 읽던 지면이 그대로 젖혀진다.
       *
       * 전에는 글을 먼저 걷고 빈 종이(.book-leaf)만 넘겼다. 그러면 방금 읽던
       * 글이 사라진 뒤에 백지가 도는 것이라, 넘기는 것이 아니라 지우고 나서
       * 넘기는 것으로 보였다. 이제 이 지면이 낱장의 앞면이다 — 글을 실은 채
       * 제본선을 축으로 돈다.
       *
       * 90도를 넘어가면 backface-visibility 가 알아서 감춘다. 그 뒤는
       * .book-leaf 의 뒷면이 받는다. 그래서 여기서는 따로 지우지 않는다.
       *
       * BookStage 가 --turn 에 쓰는 것과 같은 식이어야 종이와 글이 어긋나지
       * 않는다. 같은 구간(TURN_PHASE.paper)에 같은 곡선(easeTurn)을 쓴다.
       */
      const sheetTurn = dissolve ? 0 : easeTurn(stage(outP, ...TURN_PHASE.paper));

      const sheetEl = sheetRef.current;
      if (sheetEl) {
        const sc = sheetCache.current;
        const turning = sheetTurn > 0.0001;
        write(
          sheetEl,
          sc,
          'transform',
          turning ? `rotateY(${(sheetTurn * -180).toFixed(2)}deg)` : '',
        );
        // 들린 종이는 지면에서 떨어져 나온 한 장이다. 돌기 시작할 때만
        // 종이 색과 그림자를 입힌다 — 평소에 칠해 두면 고정된 책(.book-page)의
        // 제본 그늘과 종이 끝이 그 아래에 묻힌다.
        write(sheetEl, sc, 'backgroundColor', turning ? 'var(--paper)' : '');
        write(sheetEl, sc, 'boxShadow', turning ? '18px 0 48px rgb(0 0 0 / 0.55)' : '');
        write(sheetEl, sc, 'willChange', turning && sheetTurn < 1 ? 'transform' : 'auto');
      }

      // 소멸 페이지(3막)는 넘길 다음 장이 없다. 저 아래 소멸 단계가 직접
      // 걷어 내므로 여기서 또 지우면 빛으로 흩어지는 장면이 통째로 사라진다.
      // 넘기는 막은 이제 젖혀지면서 뒷면을 보이므로 따로 걷지 않는다.
      const recede = 1;

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

      /*
       * 안 보이는 막은 클릭도 받지 않는다.
       *
       * opacity 0 인 요소도 포인터 이벤트는 그대로 받는다. 그래서 아직 도착하지
       * 않은 다음 막이 지금 읽는 막 위를 덮고 있으면, 보이지도 않으면서 클릭만
       * 가로챈다 — 2막 퀴즈 8~10 번이 3막에 가려 눌리지 않았다
       * (실측: 그 자리에서 elementFromPoint 가 3막의 section 과 제목을 돌려줬다).
       *
       * 넘어가는 중인 막도 마찬가지다. 지면이 90 도를 넘으면 뒷면이 되어
       * 보이지 않는데, 그때도 클릭은 살아 있다.
       */
      const readable = pageOpacity > 0.5 && sheetTurn < 0.5;
      write(page, pc, 'pointerEvents', readable ? '' : 'none');

      if (!dissolve) return;

      /* ── B. 소멸 (3막 → 4막) ── 새벽이 번진다
       *
       * 3막 끝의 등불 하나가 새벽이 되어 화면을 덮고, 그 빛이 곧 4막의 바탕이
       * 된다. 네 가지가 한 진행도(d)에 물려 겹쳐 흐른다.
       *
       *   스밈    3막 지면이 가장자리부터 안쪽으로 걷힌다(마스크)
       *   번짐    등불 자리에서 빛의 원이 자라 화면을 덮는다(Dawn, --dawn-s)
       *   불씨    빛에서 떨어져 나온 불씨가 떠오른다(Dawn, --dissolve)
       *   도착    책이 빛에 녹아 사라지고, 4막이 떠오른다(--book-gone, --act4-in)
       *
       * 전에는 배경색 자체를 어둠 → 밝음으로 섞고, 그 위에 앰버 빛 레이어와
       * 배경 블러를 얹었다. 섞는 도중의 배경이 중간 회색이라 전환 내내 화면이
       * 회색 안개처럼 탁했다(실측: 전환 한가운데 배경 밝기 150 전후, 글도
       * 빛도 없는 회색 판). 이제 배경은 어둠에 머물고, 밝음은 원 안에만 있다 —
       * 어둠과 새벽이 한 화면에 또렷하게 갈린다.
       */
      const d = clamp01((vh - rect.bottom) / (vh * DISSOLVE_SPAN));
      markDawn(rc, d > 0);

      // 세 단계를 서로 겹쳐 둔다. 딱딱 끊으면 이음매마다 속도가 꺾이고
      // 3막이 뚝 하고 사라진다(실측: 담벼락 짙기가 1.00 에서 0.08 로 한 걸음에).
      const s1 = easeSoft(stage(d, 0, 0.45)); // 스밈
      const s2 = easeSoft(stage(d, 0.22, 0.8)); // 용해
      const s3 = easeSoft(stage(d, 0.72, 1)); // 식탁 조명으로 내려앉음

      // 1단계: 가장자리부터 안쪽으로. 2단계: 남은 글이 빛 속으로 옅어진다.
      const inner = 100 - 35 * s1 - 45 * s2; // 100 → 65 → 20
      const outer = inner + 25;

      if (SUPPORTS_MASK && d > 0.001) {
        // 마스크는 자기 상자(.page-content, sticky 로 화면 한 장) 기준으로 잰다.
        // .page 기준으로 쟀더니 좌표가 2,000px 넘게 어긋나 마스크가 상자 밖에
        // 놓였고, 소멸이 시작되는 순간 내용이 통째로 지워졌다.
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

      // 녹는 글은 빛을 따라 조금 떠오른다. 부풀리면(scale) 화면 밖에서 커져
      // 보이지 않으므로 위로만 민다.
      const lift = -28 * s2;
      const contentOpacity = SUPPORTS_MASK ? 1 - s2 : 1 - easeSoft(stage(d, 0.1, 0.75));

      const dissolving = d > 0.001;
      write(content, cc, 'willChange', dissolving ? 'transform, opacity' : 'auto');
      write(content, cc, 'transform', dissolving ? `translate3d(0,${lift.toFixed(1)}px,0)` : '');
      write(content, cc, 'opacity', dissolving ? contentOpacity.toFixed(3) : '');
      // 흩어지는 중인 3막이 그 아래 도착하는 4막의 클릭을 가로채지 않도록.
      // 담벼락에 글을 쓰는 동안에는 아직 살아 있어야 하므로 옅어진 뒤에 끊는다.
      write(content, cc, 'pointerEvents', contentOpacity > 0.5 ? '' : 'none');

      /*
       * 번짐 — 빛의 원 크기(0~1). Dawn 이 이 값으로 원을 키운다.
       *
       * 처음에는 등불 하나 크기로 켜지고, 갈수록 빨리 자란다(제곱). 원의 안쪽이
       * 화면 모서리까지 닿는 것은 0.68 쯤이라 d≈0.76 에서 화면이 다 밝아지고,
       * 나머지는 가장자리 번짐이 화면 밖으로 빠지는 구간이다.
       */
      const grow = stage(d, 0.06, 0.9);
      const dawnS = d > 0.001 ? 0.018 + 0.982 * grow * grow : 0;
      writeVar(rc, '--dawn-s', dawnS.toFixed(4));
      // 원이 켜지는 순간을 부드럽게 — 크기가 0 에서 튀어나오지 않게
      writeVar(rc, '--dawn', easeSoft(stage(d, 0, 0.12)).toFixed(3));
      // 불씨가 읽는 진행도
      writeVar(rc, '--dissolve', d.toFixed(4));

      // 책은 빛이 닿는 대로 녹는다. 원이 책 가장자리를 넘을 무렵 다 사라진다.
      writeVar(rc, '--book-gone', easeSoft(stage(d, 0.18, 0.66)).toFixed(3));

      // 식탁 조명 — 흩어진 빛이 화면 아래로 내려앉아 4막의 상시 조명이 된다.
      writeVar(rc, '--flow-y', `${(5 + 33 * s3).toFixed(2)}vh`);
      writeVar(rc, '--flow-o', (s3 * 0.34).toFixed(3));

      // 4막이 도착하는 정도. 4막 글자는 어두운 색이라 원 바깥(어둠)에서는
      // 보이지 않고, 원이 화면을 거의 덮은 뒤에야 읽힌다 — 새벽이 와야 잔치가 보인다.
      writeAct4(rc, easeSoft(stage(d, 0.55, 1)).toFixed(3));
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
        {/* 넘어가는 낱장 그 자체. 읽던 지면이 글을 실은 채로 젖혀진다.
            빈 종이(.book-leaf)만 넘기면 방금 읽던 글이 먼저 사라진 뒤에
            백지가 돌아가서, 넘기는 것이 아니라 지우고 넘기는 것으로 보였다.
            폭을 책에 맞춰 두어야 왼쪽 모서리가 제본선과 같은 자리에 온다 —
            화면 폭으로 두면 축이 화면 왼쪽 끝이 되어 엉뚱하게 돈다. */}
        <div ref={sheetRef} className="page-sheet">
          <div ref={innerRef} className="page-inner">
            {children}
          </div>
        </div>
        {/* 제본 접힘과 종이 끝은 고정된 책(BookStage)이 그린다.
            여기서도 그리면 같은 자리에 두 겹이 앉아 이중 테두리가 생긴다. */}
      </div>

    </div>
  );
}

export default Page;
