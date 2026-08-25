import { Reveal } from '../layout/Reveal';

/**
 * content.js 의 sections 배열을 그대로 그린다.
 *   sections: [{ title?: string, paragraphs: string[] }]
 *
 * 소제목은 선택 사항이라, 제목 없이 단락만 넣어도 된다.
 */
export function Prose({ sections = [], className = '' }) {
  if (sections.length === 0) return null;

  return (
    <div className={className}>
      {sections.map((section, i) => (
        <Reveal key={section.title ?? i} className="mt-14 first:mt-10">
          {section.title ? (
            <h3 className="serif text-ink mb-5 flex items-center gap-3 text-xl sm:text-2xl">
              <span aria-hidden="true" className="h-px w-6 shrink-0 bg-accent/70" />
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
