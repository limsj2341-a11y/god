import { useState } from 'react';
import { Button } from '../ui/Button';
import { MAX_LENGTH, normalizeEntryText } from '../../storage';
import { act3 } from '../../data/content';

export function WallForm({ onSubmit, busy }) {
  const [text, setText] = useState('');
  const [error, setError] = useState('');

  const remaining = MAX_LENGTH - text.length;
  const canSubmit = text.trim().length > 0 && !busy;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const value = normalizeEntryText(text);
    if (!value) return;

    setError('');
    try {
      await onSubmit(value);
      setText('');
    } catch (err) {
      setError(err?.message ?? '등록하지 못했습니다.');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-8">
      <label htmlFor="wall-input" className="sr-only">
        {act3.wall.placeholder}
      </label>

      <div className="surface flex flex-col gap-3 rounded-xl p-3 sm:flex-row sm:items-center">
        <input
          id="wall-input"
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, MAX_LENGTH))}
          maxLength={MAX_LENGTH}
          placeholder={act3.wall.placeholder}
          autoComplete="off"
          className="text-ink placeholder:text-faint min-h-11 min-w-0 flex-1 bg-transparent px-2 text-base outline-none"
        />
        <div className="flex items-center justify-between gap-3 sm:justify-end">
          {/* 아직 아무것도 안 썼을 때 숫자만 떠 있으면 무슨 뜻인지 알 수 없다 */}
          <span
            className={`text-xs tabular-nums transition-opacity duration-300 ${
              text.length === 0 ? 'opacity-0' : remaining <= 10 ? 'text-clay' : 'text-faint'
            }`}
            aria-hidden="true"
          >
            {remaining}
          </span>
          <Button type="submit" disabled={!canSubmit}>
            {act3.wall.submit}
          </Button>
        </div>
      </div>

      <p role="status" aria-live="polite" className="mt-2 min-h-5 text-xs text-clay">
        {error}
      </p>
    </form>
  );
}

export default WallForm;
