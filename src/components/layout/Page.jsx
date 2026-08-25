import { useCallback, useRef } from 'react';
import { useViewportFrame } from '../../hooks/useViewportFrame';
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

const ENTER_WINDOW = 0.35; // 뷰포트 높이 대비
const EXIT_WINDOW = 0.35;

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
  const lightRef = useRef(null);

  const pageCache = useRef({});
  const contentCache = useRef({});
  const lightCache = useRef({});
  const rootCache = useRef({});

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

        if (dissolve) {
          const d = clamp01((vh - rect.bottom) / vh);
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
      const enter = easeTurn(clamp01((vh - rect.top) / (vh * ENTER_WINDOW)));
      const exitRaw = clamp01((vh * EXIT_WINDOW - rect.bottom) / (vh * EXIT_WINDOW));
      const exit = dissolve ? 0 : easeTurn(exitRaw);

      const x = ENTER_X * (1 - enter) + EXIT_X * exit;
      const pageOpacity = enter * (1 - exit);

      const moving = Math.abs(x) > 0.02 || pageOpacity < 0.999;
      write(page, pc, 'willChange', moving ? 'transform, opacity' : 'auto');
      write(page, pc, 'transform', moving ? `translate3d(${x.toFixed(2)}%,0,0)` : '');
      write(page, pc, 'opacity', moving ? pageOpacity.toFixed(3) : '');

      if (!dissolve) return;

      /* ── B. 소멸 (3막 → 4막) ── */
      const d = clamp01((vh - rect.bottom) / vh);

      const s1 = easeSoft(stage(d, 0, 0.4)); // 스밈
      const s2 = easeSoft(stage(d, 0.4, 0.75)); // 용해
      const s3 = easeSoft(stage(d, 0.75, 1)); // 흘러내림

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
        const mask = `radial-gradient(115% 85% at 50% 45%, #000 ${inner.toFixed(1)}%, transparent ${outer.toFixed(1)}%)`;
        const size = `100% ${bandH.toFixed(0)}px`;
        const pos = `50% ${bandTopEl.toFixed(0)}px`;
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
        writeCustom(light, lc, '--light-solid', `${((bandH / total) * 55).toFixed(1)}%`);
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
      writeVar(rc, '--act4-in', easeSoft(stage(d, 0.3, 0.9)).toFixed(3));
    },
    [reduced, dissolve],
  );

  useViewportFrame(pageRef, onFrame);

  return (
    <div ref={pageRef} data-page={index} className={`page ${className}`}>
      <div ref={contentRef} className="page-content">
        {children}
        {/* 제본 쪽 접힘과 바깥쪽 종이 끝 */}
        <span aria-hidden="true" className="page-gutter" />
        <span aria-hidden="true" className="page-edge" />
      </div>

      {dissolve ? <span ref={lightRef} aria-hidden="true" className="page-light" /> : null}
    </div>
  );
}

export default Page;
