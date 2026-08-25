/**
 * 색 단일 소스(single source of truth).
 * 배경 보간, 텍스트 색 전환, 카드 이미지 렌더링이 모두 이 파일을 참조한다.
 */

/** 4막의 배경/텍스트 색. 순서가 곧 스크롤 순서다. */
export const ACTS = [
  { id: 'act1', label: '떠남', bg: '#0D0E11', fg: '#D8D6D1' },
  { id: 'act2', label: '두 아들', bg: '#1C1E23', fg: '#D8D6D1' },
  { id: 'act3', label: '진짜 맏형', bg: '#2E3138', fg: '#D8D6D1' },
  { id: 'act4', label: '잔치', bg: '#F6F3EE', fg: '#16171A' },
];

/** 뮤트 앰버 — 버튼, 강조, 등불 */
export const ACCENT = '#E0A75C';

/** 더스티 클레이 — 보조 강조 */
export const CLAY = '#B4705A';

export const BG_STOPS = ACTS.map((a) => a.bg);
export const FG_STOPS = ACTS.map((a) => a.fg);
