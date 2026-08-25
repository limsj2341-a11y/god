/**
 * 색 보간 유틸.
 *
 * sRGB 값을 그대로 선형 보간하면 어둠 → 밝음 구간에서 중간색이 탁하게 가라앉는다.
 * 감마를 풀어 선형 광량(linear-light) 공간에서 섞은 뒤 되돌리면 전환이 고르게 보인다.
 */

export function hexToRgb(hex) {
  const h = hex.replace('#', '');
  const v =
    h.length === 3
      ? h
          .split('')
          .map((c) => c + c)
          .join('')
      : h;
  const n = parseInt(v, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgbToHex([r, g, b]) {
  const c = (x) => Math.round(clamp(x, 0, 255)).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`;
}

export function clamp(v, min, max) {
  return v < min ? min : v > max ? max : v;
}

/** 0..1 을 [a, b] 구간에 매핑한 뒤 다시 0..1 로 정규화 */
export function inverseLerp(a, b, v) {
  if (b === a) return 0;
  return clamp((v - a) / (b - a), 0, 1);
}

function srgbToLinear(c) {
  const x = c / 255;
  return x <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
}

function linearToSrgb(x) {
  const c = x <= 0.0031308 ? x * 12.92 : 1.055 * Math.pow(x, 1 / 2.4) - 0.055;
  return c * 255;
}

/** 두 hex 색을 선형 광량 공간에서 섞는다. t=0 이면 a, t=1 이면 b. */
export function mixHex(a, b, t) {
  const ca = hexToRgb(a);
  const cb = hexToRgb(b);
  const k = clamp(t, 0, 1);
  const out = [0, 1, 2].map((i) => {
    const la = srgbToLinear(ca[i]);
    const lb = srgbToLinear(cb[i]);
    return linearToSrgb(la + (lb - la) * k);
  });
  return rgbToHex(out);
}

/**
 * stop 배열 위의 임의 위치 색을 구한다.
 * positions 는 stops 와 같은 길이의 오름차순 배열(각 stop 이 놓인 좌표).
 *
 * steps 를 주면 보간 계수를 그 단계 수로 반올림한다. 결과 색이 프레임마다
 * 미세하게 달라지는 것을 막기 위한 것이다 — 값이 실제로 바뀔 때만 리페인트가
 * 일어나므로, 매 프레임 다시 그려야 하는 대상(특히 글자)에서는 비용 차이가 크다.
 * 계수를 반올림하므로 양 끝 색은 정확히 유지된다.
 */
export function sampleStops(stops, positions, at, steps = 0, ease = easeInOut) {
  if (stops.length === 0) return '#000000';
  if (at <= positions[0]) return stops[0];
  const last = positions.length - 1;
  if (at >= positions[last]) return stops[last];

  for (let i = 0; i < last; i += 1) {
    if (at <= positions[i + 1]) {
      const t = inverseLerp(positions[i], positions[i + 1], at);
      let k = ease(t);
      if (steps > 0) k = Math.round(k * steps) / steps;
      return mixHex(stops[i], stops[i + 1], k);
    }
  }
  return stops[last];
}

/** 구간 경계에서 색이 꺾이지 않도록 부드럽게 */
export function easeInOut(t) {
  return t * t * (3 - 2 * t);
}

/**
 * 뒤로 실은 곡선 — 앞부분에서는 거의 움직이지 않다가 뒤에서 빠르게 간다.
 *
 * 3막→4막에서 색 전환 구간과 페이지 소멸 구간이 정확히 겹치는데, 대칭
 * 곡선을 쓰면 종이가 아직 불투명한 시점에 배경이 이미 절반 넘게 밝아진다.
 * 어두운 페이지가 가장자리부터 빛나야 할 자리에 회색 종이가 놓이는 셈이다.
 * 이 곡선은 종이가 옅어진 뒤에 밝기를 몰아준다.
 * 양 끝의 기울기가 0이라 색을 붙잡고 있는 구간과 이어져도 꺾이지 않는다.
 */
export function easeTrailing(t) {
  const s = t * t * (3 - 2 * t);
  return s * s;
}

/**
 * 한 지점에서 빠르게 갈아타는 곡선.
 *
 * 글자 색에 쓴다. 배경과 글자를 같은 곡선으로 천천히 보간하면 어두운 배경 +
 * 밝은 글자에서 밝은 배경 + 어두운 글자로 가는 도중에 두 색이 서로를 통과한다.
 * 3막→4막 한가운데에서 실제로 대비가 1:1 로 무너져 4막 본문이 통째로 사라졌다.
 * 글자는 회색을 거치지 말고 건너뛰어야 한다 — 어두운 바탕에 밝은 글자이거나,
 * 밝은 바탕에 어두운 글자이거나 둘 중 하나여야 한다.
 *
 * center 는 배경 밝기가 대략 중간을 지나는 지점에 맞춰 둔다.
 */
export function easeSnap(center = 0.55, width = 0.07) {
  const a = center - width / 2;
  const b = center + width / 2;
  return (t) => {
    if (t <= a) return 0;
    if (t >= b) return 1;
    const k = (t - a) / (b - a);
    return k * k * (3 - 2 * k);
  };
}
