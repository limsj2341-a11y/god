/**
 * 책 인용 블록.
 * text 가 비어 있으면(아직 채우지 않았으면) 아무것도 렌더링하지 않는다.
 */
export function Quote({ quote, className = '' }) {
  if (!quote?.text?.trim()) return null;

  return (
    <figure className={`border-l-2 border-accent/60 pl-5 sm:pl-6 ${className}`}>
      <blockquote className="serif text-ink kr text-lg leading-relaxed sm:text-xl">
        “{quote.text}”
      </blockquote>
      {quote.source ? (
        <figcaption className="text-faint mt-3 text-xs tracking-wide">— {quote.source}</figcaption>
      ) : null}
    </figure>
  );
}

export default Quote;
