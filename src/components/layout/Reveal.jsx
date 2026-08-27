import { motion, useReducedMotion } from 'motion/react';
import { EASE_RISE, RISE_PX, RISE_SEC, VIEWPORT } from '../../lib/anim';

/**
 * 뷰포트에 들어오면 opacity/transform 으로 떠오른다.
 *
 * 전에는 IntersectionObserver 훅과 CSS(.reveal)가 나눠 맡았는데 이제 motion 이
 * 둘 다 한다. delay 는 예전처럼 ms 로 받는다 — 부르는 자리가 서른 곳 가까이 되는데
 * 단위까지 바꾸면 그 전부가 조용히 1000배 느려진다.
 *
 * 모션 축소일 때 MotionConfig 에 맡기지 않고 여기서 통째로 빠지는 이유:
 * MotionConfig 의 reducedMotion="user" 는 transform 만 끄고 opacity 는 그대로
 * 애니메이션한다. 그런데 원래 CSS 는 .reveal 의 opacity 도 1 로 못박아
 * 페이드조차 남기지 않았다. 그 뜻을 지킨다.
 */
export function Reveal({ as = 'div', delay = 0, className = '', children, ...rest }) {
  const reduced = useReducedMotion();

  if (reduced) {
    const Plain = as;
    return (
      <Plain className={className} {...rest}>
        {children}
      </Plain>
    );
  }

  const Tag = motion[as] ?? motion.div;

  return (
    <Tag
      className={className}
      initial={{ opacity: 0, y: RISE_PX }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={VIEWPORT}
      transition={{ duration: RISE_SEC, ease: EASE_RISE, delay: delay / 1000 }}
      {...rest}
    >
      {children}
    </Tag>
  );
}

export default Reveal;
