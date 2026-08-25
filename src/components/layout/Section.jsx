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

/** 막 번호 + 제목 */
export function ActHeading({ eyebrow, title }) {
  return (
    <header className="mb-10 sm:mb-14">
      <p className="text-faint mb-3 text-xs tracking-[0.08em] sm:text-sm">{eyebrow}</p>
      <h2 className="serif text-ink text-4xl font-bold sm:text-6xl">{title}</h2>
      <div className="mt-6 h-px w-16 bg-accent/70" />
    </header>
  );
}

export default Section;
