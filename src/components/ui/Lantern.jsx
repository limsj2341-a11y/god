/**
 * 등불 아이콘. lit=false 면 꺼진 윤곽만 남는다.
 * 켜질 때의 흔들림은 CSS(.lantern-flame)가 담당한다.
 */
export function Lantern({ lit = false, size = 26, delay = 0, className = '' }) {
  return (
    <svg
      width={size}
      height={size * 1.35}
      viewBox="0 0 20 27"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      {/* 고리 */}
      <path
        d="M10 1v3"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinecap="round"
        opacity={lit ? 0.55 : 0.25}
      />
      {/* 갓 */}
      <path
        d="M5 5h10l-1 2H6L5 5z"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinejoin="round"
        opacity={lit ? 0.6 : 0.25}
      />
      {/* 몸통 */}
      <path
        d="M6.2 7h7.6l1.2 12a1.6 1.6 0 0 1-1.6 1.8H6.6A1.6 1.6 0 0 1 5 19L6.2 7z"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinejoin="round"
        opacity={lit ? 0.7 : 0.22}
      />
      {/* 받침 */}
      <path
        d="M7 22.6h6"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinecap="round"
        opacity={lit ? 0.5 : 0.2}
      />

      {lit ? (
        <g className="lantern-flame" style={{ '--flicker-delay': `${delay}ms` }}>
          <ellipse cx="10" cy="14.4" rx="4.6" ry="5.4" fill="var(--color-accent)" opacity="0.16" />
          <path
            d="M10 10.4c1.9 1.6 2.8 3 2.8 4.4a2.8 2.8 0 1 1-5.6 0c0-1.4.9-2.8 2.8-4.4z"
            fill="var(--color-accent)"
          />
        </g>
      ) : null}
    </svg>
  );
}

export default Lantern;
