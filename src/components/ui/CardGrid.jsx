import { useState } from 'react';
import { motion, useMotionValue, useSpring, useTransform, useReducedMotion } from 'motion/react';
import { hasFinePointer, softSpring } from '../../lib/anim';

/**
 * 나란히 놓고 비교하는 카드 묶음.
 *   items: [{ label?, title, text?, points?: string[] }]
 *
 * 모바일에서는 한 줄로 쌓이고, sm 이상에서 columns 만큼 나뉜다.
 * 3열만 예외로 태블릿에서 2열을 거친다 — 본문 칼럼이 672px 라 태블릿에서
 * 3열이면 한 칸이 213px 밖에 안 되고, 제목이 "바리새인과 / 서기관들" 처럼
 * 두 줄로 끊겼다.
 */
/*
 * 열 수는 화면이 아니라 "담긴 상자"에 반응해야 한다.
 *
 * 전에는 sm:/lg: 를 썼다. 그때는 본문이 화면 폭을 그대로 받았으니 맞았지만,
 * 지금 본문은 책 안에 있고 책은 화면보다 좁다(1440 화면에서 675px).
 * 화면 기준으로는 lg 가 걸려 3열이 되는데 상자는 675px 뿐이라 한 칸이
 * 190px 로 쪼그라들었다 — 예전에 213px 에서 제목이 두 줄로 깨진 그 폭보다도 좁다.
 *
 * @lg / @4xl 은 컨테이너 기준이다(각각 32rem, 56rem). 675px 책에서는 2열까지만
 * 열리고, 책이 그보다 훨씬 넓어질 때에야 3열이 된다.
 */
const COLS = {
  1: '@lg:grid-cols-1',
  2: '@lg:grid-cols-2',
  3: '@lg:grid-cols-2 @4xl:grid-cols-3',
};

const MAX_TILT = 2.5; // 도(°)

/**
 * 포인터를 따라 아주 조금 기우는 카드.
 *
 * 기울기를 2.5°로 묶어 둔 이유: 이 사이트는 카드에 본문을 담는다. 더 키우면
 * 글줄이 사다리꼴로 눕고, 읽는 중에 카드가 살아 움직여 시선을 뺏는다.
 * 여기서 원하는 건 "손이 닿았다"는 정도의 기별이다.
 */
function TiltCard({ children, className = '' }) {
  const reduced = useReducedMotion();
  // 포인터 판정은 마운트 이후에 한다. 렌더 중에 matchMedia 를 부르면
  // 서버·클라이언트가 서로 다른 결과를 낼 수 있다.
  const [fine] = useState(hasFinePointer);

  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);

  const rotateX = useSpring(useTransform(py, [0, 1], [MAX_TILT, -MAX_TILT]), softSpring);
  const rotateY = useSpring(useTransform(px, [0, 1], [-MAX_TILT, MAX_TILT]), softSpring);

  const active = fine && !reduced;

  const onMove = (e) => {
    if (!active) return;
    const r = e.currentTarget.getBoundingClientRect();
    px.set((e.clientX - r.left) / r.width);
    py.set((e.clientY - r.top) / r.height);
  };

  const onLeave = () => {
    // 손을 떼면 제자리로. 값을 그대로 두면 다음에 다가올 때 이전 각도에서 튄다.
    px.set(0.5);
    py.set(0.5);
  };

  if (!active) {
    return <li className={className}>{children}</li>;
  }

  return (
    <motion.li
      className={className}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      whileHover={{ y: -3 }}
      transition={softSpring}
      style={{ rotateX, rotateY, transformPerspective: 900 }}
    >
      {children}
    </motion.li>
  );
}

export function CardGrid({ items = [], columns = 2, numbered = false, className = '' }) {
  if (items.length === 0) return null;

  return (
    // 컨테이너 질의의 기준점. 자기 자신은 기준이 될 수 없으므로 한 겹 감싼다.
    <div className={`@container ${className}`}>
      <ul className={`grid grid-cols-1 gap-3 ${COLS[columns] ?? COLS[2]}`}>
      {items.map((item, i) => (
        <TiltCard key={item.title ?? i} className="surface rounded-xl p-5 sm:p-6">
          {numbered ? (
            <span className="text-accent mb-3 block text-xs tabular-nums tracking-[0.2em]">
              {String(i + 1).padStart(2, '0')}
            </span>
          ) : item.label ? (
            <span className="text-faint mb-2 block text-[11px] tracking-[0.08em]">
              {item.label}
            </span>
          ) : null}

          <h4 className="serif text-ink text-lg sm:text-xl">{item.title}</h4>

          {item.text ? (
            <p className="text-soft kr mt-3 text-sm leading-relaxed sm:text-base">{item.text}</p>
          ) : null}

          {item.points?.length ? (
            <ul className="mt-4 space-y-2.5">
              {item.points.map((point, j) => (
                <li key={j} className="text-soft kr flex gap-2.5 text-sm leading-relaxed">
                  <span
                    aria-hidden="true"
                    className="mt-2 h-1 w-1 shrink-0 rounded-full bg-clay/80"
                  />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </TiltCard>
      ))}
      </ul>
    </div>
  );
}

export default CardGrid;
