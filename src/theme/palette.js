/**
 * 색 단일 소스(single source of truth).
 * 배경 보간, 텍스트 색 전환, 카드 이미지 렌더링이 모두 이 파일을 참조한다.
 */

/**
 * 4막의 배경/텍스트 색. 순서가 곧 스크롤 순서다.
 *
 * 1~3막은 같은 어둠을 쓴다. 전에는 막마다 조금씩 밝아졌는데(#0D0E11 →
 * #1C1E23 → #2E3138), 장을 넘길 때마다 화면이 들뜨는 것으로 보였다.
 * 밝아지는 일은 이 이야기에서 한 번뿐이어야 한다 — 3막이 빛으로 흩어지고
 * 4막 잔치가 도착하는 그때.
 */
/*
 * ground 는 페이지 맨 밑바닥(--bg)에 칠하는 색이다. bg 와 대개 같지만 4막만 다르다.
 * 4막의 밝음은 바닥색을 섞어서 내지 않는다 — 3막 끝의 등불이 새벽으로 번져
 * 화면을 덮는 레이어(Dawn)가 맡는다. 바닥색을 어둠 → 밝음으로 섞으면 도중이
 * 중간 회색이라, 전환 내내 화면이 회색 안개처럼 탁했다.
 * bg 는 그 막이 "보이는" 색이다(브라우저 테마색, 카드 이미지).
 */
export const ACTS = [
  { id: 'act1', label: '떠남', bg: '#0D0E11', ground: '#0D0E11', fg: '#D8D6D1' },
  { id: 'act2', label: '두 아들', bg: '#0D0E11', ground: '#0D0E11', fg: '#D8D6D1' },
  { id: 'act3', label: '진짜 맏형', bg: '#0D0E11', ground: '#0D0E11', fg: '#D8D6D1' },
  { id: 'act4', label: '잔치', bg: '#F6F3EE', ground: '#0D0E11', fg: '#16171A' },
];

/** 뮤트 앰버 — 버튼, 강조, 등불 */
export const ACCENT = '#E0A75C';

/** 더스티 클레이 — 보조 강조 */
export const CLAY = '#B4705A';

export const BG_STOPS = ACTS.map((a) => a.bg);
export const FG_STOPS = ACTS.map((a) => a.fg);
