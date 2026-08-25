/**
 * 책 메타포 연출에 쓰는 이징과 런타임 능력 판별.
 *
 * 애니메이션 라이브러리를 쓰지 않으므로 cubic-bezier 를 직접 푼다.
 */

export function clamp01(v) {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/** a→b 구간에서의 위치를 0~1 로 (구간 밖은 잘라낸다) */
export function stage(v, a, b) {
  if (b === a) return v >= b ? 1 : 0;
  return clamp01((v - a) / (b - a));
}

/**
 * CSS 의 cubic-bezier(x1,y1,x2,y2) 와 같은 곡선.
 * x 에 대해 뉴턴-랩슨으로 t 를 찾고 y 를 돌려준다.
 */
export function cubicBezier(x1, y1, x2, y2) {
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;

  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;

  const sampleX = (t) => ((ax * t + bx) * t + cx) * t;
  const sampleY = (t) => ((ay * t + by) * t + cy) * t;
  const slopeX = (t) => (3 * ax * t + 2 * bx) * t + cx;

  return function ease(x) {
    if (x <= 0) return 0;
    if (x >= 1) return 1;

    let t = x;
    for (let i = 0; i < 5; i += 1) {
      const dx = slopeX(t);
      if (Math.abs(dx) < 1e-6) break;
      const err = sampleX(t) - x;
      if (Math.abs(err) < 1e-5) break;
      t -= err / dx;
    }
    return sampleY(clamp01(t));
  };
}

/**
 * 명세가 지정한 넘김 곡선. 시간 기반 트랜지션이라면 이걸 그대로 쓰면 된다.
 * 다만 스크롤 거리에 매핑하면 t=0.35 에서 이미 0.9 에 닿아, 이동량 전부가
 * 경계에 들어서자마자 끝나 버린다(실측: 램프 중간 지점에서 1.8px).
 */
export const easeBook = cubicBezier(0.16, 1, 0.3, 1);

/**
 * 스크롤 연동 넘김에 실제로 쓰는 곡선.
 * 이동량을 램프 구간 전체에 고르게 펴서, 넘김이 눈에 보이게 한다.
 * 양 끝 기울기가 0이라 시작과 끝에서 튀지 않는다.
 */
export const easeTurn = (t) => t * t * (3 - 2 * t);

/** 소멸 단계에 쓰는 부드러운 곡선 */
export const easeSoft = cubicBezier(0.4, 0, 0.2, 1);

/* ─────────────────────────  런타임 능력 판별  ───────────────────────── */

const supports = (prop, value) => {
  if (typeof CSS === 'undefined' || !CSS.supports) return false;
  return CSS.supports(prop, value) || CSS.supports(`-webkit-${prop}`, value);
};

/** mask-image 미지원이면 단순 opacity 페이드로 폴백한다 */
export const SUPPORTS_MASK = supports('mask-image', 'radial-gradient(#000, transparent)');

const SUPPORTS_BACKDROP = supports('backdrop-filter', 'blur(4px)');

/**
 * 블러 허용 여부.
 *
 * 블러는 이 연출에서 유일하게 매 프레임 리페인트를 강제하는 속성이라
 * 저사양·모바일에서는 처음부터 버린다. 나머지 단계(transform/opacity/mask)는
 * 그대로 돌아가므로 연출이 깨지지는 않는다.
 */
function detectBlur() {
  if (!SUPPORTS_BACKDROP) return false;
  if (typeof window === 'undefined') return false;

  const coarse = window.matchMedia?.('(pointer: coarse)').matches;
  if (coarse) return false;

  const mem = navigator.deviceMemory;
  if (typeof mem === 'number' && mem < 4) return false;

  const cores = navigator.hardwareConcurrency;
  if (typeof cores === 'number' && cores < 4) return false;

  return window.innerWidth >= 768;
}

export const ALLOW_BLUR = detectBlur();

/** 명세 상한 */
export const MAX_BLUR_PX = 6;
