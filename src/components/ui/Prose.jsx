import { motion, useReducedMotion } from 'motion/react';
import { Reveal } from '../layout/Reveal';
import { VIEWPORT } from '../../lib/anim';

/**
 * content.js 의 sections 배열을 그대로 그린다.
 *   sections: [{ title?: string, paragraphs: string[] }]
 *
 * 소제목은 선택 사항이라, 제목 없이 단락만 넣어도 된다.
 */
export function Prose({ sections = [], className = '' }) {
  const reduced = useReducedMotion();
  if (sections.length === 0) return null;

  return (
    <div className={className}>
      {sections.map((section, i) => (
        <Reveal key={section.title ?? i} className="mt-14 first:mt-10">
          {section.title ? (
            <h3 className="serif text-ink mb-5 flex items-center gap-3 text-xl sm:text-2xl">
              {/* 소제목 앞의 짧은 선이 왼쪽부터 그어진다 — 막 제목 아래 선과 같은 몸짓 */}
              <motion.span
                aria-hidden="true"
                className="h-px w-6 shrink-0 origin-left bg-accent/70"
                initial={reduced ? false : { scaleX: 0 }}
                whileInView={{ scaleX: 1 }}
                viewport={VIEWPORT}
                transition={{ duration: 0.8, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
              />
              {section.title}
            </h3>
          ) : null}

          <div className="space-y-5">
            {section.paragraphs.map((p, j) => (
              <p key={j} className="text-soft kr text-base leading-loose sm:text-lg">
                {p}
              </p>
            ))}
          </div>
        </Reveal>
      ))}
    </div>
  );
}

export default Prose;
