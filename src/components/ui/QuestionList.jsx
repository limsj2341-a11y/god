/**
 * 나눔 질문 목록.
 *   items: string[]
 */
export function QuestionList({ items = [], className = '' }) {
  if (items.length === 0) return null;

  return (
    <ol className={`space-y-px ${className}`}>
      {items.map((q, i) => (
        <li key={i} className="flex gap-4 border-b border-hair py-5 first:border-t">
          <span className="text-accent shrink-0 text-xs tabular-nums leading-7 tracking-[0.2em]">
            {String(i + 1).padStart(2, '0')}
          </span>
          <p className="serif text-ink kr text-lg leading-relaxed sm:text-xl">{q}</p>
        </li>
      ))}
    </ol>
  );
}

export default QuestionList;
