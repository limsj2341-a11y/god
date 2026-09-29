import { useCallback, useRef } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Reveal } from './Reveal';
import { SplitText } from '../ui/SplitText';
import { useViewportFrame } from '../../hooks/useViewportFrame';
import { VIEWPORT } from '../../lib/anim';

/**
 * 막 하나를 감싸는 공통 셸.
 * data-act 속성이 BackgroundStage 의 색 stop 기준점이 된다.
 */
export function Section({ id, index, children, className = '', innerClassName = '' }) {
  return (
    <section
      id={id}
      data-act={index}
      className={`relative flex min-h-dvh w-full flex-col justify-center px-6 py-24 sm:px-10 sm:py-32 ${className}`}
    >
      <div className={`mx-auto w-full max-w-2xl ${innerClassName}`}>{children}</div>
    </section>
  );
}

/** 큰 막 번호가 글보다 느리게 흐르는 정도. 1 이면 글과 같이 움직인다. */
const NUMERAL_DRIFT = 0.28;

/**
 * 제목 뒤에 크게 깔리는 막 번호.
 *
 * 속이 빈 윤곽선 숫자라 글을 가리지 않는다. 글보다 느리게 흘러서(패럴랙스)
 * 지면에 깊이가 생긴다 — 번호는 종이 안쪽 깊은 곳에, 글은 종이 위에 있는 것처럼.
 */
export function ActNumeral({ n }) {
  const ref = useRef(null);
  const cache = useRef('');
  const reduced = useReducedMotion();

  const onFrame = useCallback(
    (_rect, vh) => {
      const el = ref.current;
      if (!el || reduced) return;
      // 자기 자신이 아니라 부모(제목 머리)의 자리를 잰다. 자기 rect 에는 지난
      // 프레임에 준 transform 이 이미 들어 있어서, 그걸 다시 입력으로 쓰면
      // 스크롤 방식에 따라 번호가 다른 자리에 멈춘다(실측: 같은 위치에서 -9px / +73px).
      const host = el.parentElement ?? el;
      const rect = host.getBoundingClientRect();
      // 화면 한가운데에 왔을 때 제자리. 그보다 아래면 아래로, 위면 위로 밀린다.
      // 글과 반대로 밀어야 느리게 따라오는 것처럼 보인다.
      const off = (rect.top + rect.height / 2 - vh / 2) * -NUMERAL_DRIFT;
      const v = `translate3d(0,${off.toFixed(1)}px,0)`;
      if (cache.current === v) return;
      cache.current = v;
      el.style.transform = v;
    },
    [reduced],
  );

  useViewportFrame(ref, onFrame);

  return (
    <span ref={ref} aria-hidden="true" className="act-numeral serif">
      {String(n).padStart(2, '0')}
    </span>
  );
}

/**
 * 막 번호 + 제목
 *
 * 제목 글자가 한 자씩 뒤에서 일어서고, 그 아래 선이 왼쪽부터 그어진다.
 * 전에는 머리 전체를 Reveal 로 한 번에 띄웠는데, 그러면 글자 등장과 덩어리
 * 페이드가 겹쳐 둘 다 흐려진다(1막 제목에서 이미 겪었다). 그래서 머리를
 * Reveal 로 감싸지 말고 여기 맡긴다.
 */
export function ActHeading({ eyebrow, title, index }) {
  const reduced = useReducedMotion();

  return (
    <header className="relative mb-10 sm:mb-14">
      {index != null ? <ActNumeral n={index + 1} /> : null}

      <Reveal>
        <p className="text-faint mb-3 flex items-center gap-3 text-xs tracking-[0.08em] sm:text-sm">
          {eyebrow}
        </p>
      </Reveal>

      <SplitText
        as="h2"
        text={title}
        variant="flip"
        trigger="view"
        delay={120}
        className="serif text-ink relative block text-4xl font-bold sm:text-6xl"
      />

      {/* 제목이 다 선 다음에 선이 그어진다 */}
      <motion.div
        className="mt-6 h-px w-16 origin-left bg-accent/70"
        initial={reduced ? false : { scaleX: 0 }}
        whileInView={{ scaleX: 1 }}
        viewport={VIEWPORT}
        transition={{ duration: 0.9, delay: 0.55, ease: [0.16, 1, 0.3, 1] }}
      />
    </header>
  );
}

export default Section;
