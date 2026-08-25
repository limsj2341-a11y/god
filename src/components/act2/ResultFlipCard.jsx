import { useState } from 'react';
import { Quote } from '../ui/Quote';
import { Button } from '../ui/Button';
import { resultUi } from '../../data/results';

function ScoreBar({ label, pct, strong }) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className={`text-xs tracking-wide ${strong ? 'text-ink' : 'text-faint'}`}>
          {label}
        </span>
        <span className={`text-xs tabular-nums ${strong ? 'text-accent' : 'text-faint'}`}>
          {pct}%
        </span>
      </div>
      <div className="h-1 w-full overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--fg)_12%,transparent)]">
        <div
          className="h-full rounded-full transition-[width] duration-1000 ease-out"
          style={{
            width: `${pct}%`,
            backgroundColor: strong ? 'var(--color-accent)' : 'var(--color-clay)',
          }}
        />
      </div>
    </div>
  );
}

/**
 * 결과 카드. 처음에는 뒷면(문양)이 보이고, 누르면 뒤집혀 결과가 나온다.
 * 뒤집기는 CSS transform 하나로 끝나므로 모션 축소 설정에서도 자동으로 즉시 전환된다.
 */
export function ResultFlipCard({ score, onRetake }) {
  const [flipped, setFlipped] = useState(false);
  const { result, younger, elder, key } = score;

  return (
    <div className="mt-10">
      <div className="flip-scene">
        <div className="flip-inner" data-flipped={flipped ? 'true' : 'false'}>
          {/* 뒷면(결과) — 흐름 안에 있어 카드 높이를 정한다 */}
          <div className="flip-face flip-face-back surface rounded-2xl p-7 sm:p-9">
            <p className="text-faint text-xs tracking-[0.08em]">{result.tagline}</p>
            <h3 className="serif text-ink mt-2 text-3xl font-bold sm:text-4xl">{result.name}</h3>
            <p className="text-soft kr mt-4 text-base leading-relaxed">{result.summary}</p>

            <div className="mt-7 space-y-4">
              <ScoreBar label="동생형 · 자기실현형" pct={younger} strong={key !== 'elder'} />
              <ScoreBar label="형형 · 도덕적 순응형" pct={elder} strong={key !== 'younger'} />
            </div>

            <div className="mt-7 space-y-4">
              {result.body.map((p, i) => (
                <p key={i} className="text-soft kr text-sm leading-loose sm:text-base">
                  {p}
                </p>
              ))}
            </div>

            <p className="serif kr mt-7 text-lg leading-relaxed text-clay sm:text-xl">
              {result.question}
            </p>

            <Quote quote={result.quote} className="mt-7" />

            <div className="mt-8 flex gap-2">
              <Button variant="ghost" onClick={() => setFlipped(false)}>
                카드 닫기
              </Button>
              <Button variant="quiet" onClick={onRetake}>
                {resultUi.retake}
              </Button>
            </div>
          </div>

          {/* 앞면(뒤집기 전) */}
          <button
            type="button"
            onClick={() => setFlipped(true)}
            aria-hidden={flipped}
            tabIndex={flipped ? -1 : 0}
            className="flip-face flip-face-front surface flex w-full flex-col items-center justify-center gap-4 rounded-2xl p-7"
          >
            <svg width="56" height="56" viewBox="0 0 56 56" fill="none" aria-hidden="true">
              <circle
                cx="28"
                cy="28"
                r="20"
                stroke="var(--color-accent)"
                strokeWidth="1"
                opacity="0.5"
              />
              <circle
                cx="28"
                cy="28"
                r="27"
                stroke="currentColor"
                strokeWidth="1"
                opacity="0.14"
              />
              <path
                d="M28 16v24M16 28h24"
                stroke="var(--color-accent)"
                strokeWidth="1"
                opacity="0.35"
              />
            </svg>
            <span className="serif text-ink text-xl">{resultUi.backPrompt}</span>
            <span className="text-faint text-xs tracking-wide">{resultUi.backHint}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default ResultFlipCard;
