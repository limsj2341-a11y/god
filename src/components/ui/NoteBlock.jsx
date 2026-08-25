/**
 * 본문 흐름을 한 번 끊고 강조하는 블록.
 *   note: { label?, title, paragraphs: string[] }
 */
export function NoteBlock({ note, className = '' }) {
  if (!note) return null;

  return (
    <aside
      className={`rounded-2xl border border-accent/25 bg-[color-mix(in_srgb,var(--color-accent)_6%,transparent)] p-6 sm:p-8 ${className}`}
    >
      {note.label ? (
        <p className="text-accent mb-3 text-[11px] tracking-[0.08em]">{note.label}</p>
      ) : null}

      <h3 className="serif text-ink text-2xl sm:text-3xl">{note.title}</h3>

      <div className="mt-5 space-y-4">
        {note.paragraphs.map((p, i) => (
          <p key={i} className="text-soft kr text-sm leading-loose sm:text-base">
            {p}
          </p>
        ))}
      </div>
    </aside>
  );
}

export default NoteBlock;
