import { useMemo, useRef, useState } from 'react';
import { questions } from '../../data/questions';
import { answeredCount, isComplete, scoreAnswers } from '../../lib/scoring';
import { usePersistentState } from '../../hooks/usePersistentState';
import { ScaleInput } from './ScaleInput';
import { ResultFlipCard } from './ResultFlipCard';
import { Button } from '../ui/Button';
import { act2 } from '../../data/content';

const STORAGE_KEY = 'tangbu.quiz.v1';

export function Quiz() {
  const [answers, setAnswers, resetAnswers] = usePersistentState(STORAGE_KEY, {});
  const [submitted, setSubmitted] = useState(false);
  const resultRef = useRef(null);

  const done = answeredCount(answers);
  const complete = isComplete(answers);
  const score = useMemo(() => (submitted ? scoreAnswers(answers) : null), [submitted, answers]);

  const setAnswer = (id, value) => {
    setAnswers((prev) => ({ ...prev, [id]: value }));
  };

  const submit = () => {
    setSubmitted(true);
    // 카드가 붙은 다음 프레임에 이동
    requestAnimationFrame(() => {
      resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  };

  const retake = () => {
    resetAnswers();
    setSubmitted(false);
  };

  if (submitted && score) {
    return (
      <div ref={resultRef}>
        <ResultFlipCard score={score} onRetake={retake} />
      </div>
    );
  }

  return (
    <div className="mt-10">
      {/* 진행 표시 */}
      <div className="sticky top-0 z-10 -mx-6 mb-8 bg-[var(--paper)] px-6 py-3 sm:-mx-10 sm:px-10">
        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-[color-mix(in_srgb,var(--fg)_14%,transparent)]">
            <div
              className="h-px bg-accent transition-[width] duration-500 ease-out"
              style={{ width: `${(done / questions.length) * 100}%` }}
            />
          </div>
          <span className="text-faint text-xs tabular-nums">
            {done} / {questions.length}
          </span>
        </div>
      </div>

      <ol className="space-y-10">
        {questions.map((q, i) => {
          const labelId = `${q.id}-label`;
          return (
            <li key={q.id}>
              <p id={labelId} className="kr text-ink text-base leading-relaxed sm:text-lg">
                <span className="text-faint mr-2 text-sm tabular-nums">
                  {String(i + 1).padStart(2, '0')}
                </span>
                {q.text}
              </p>
              <ScaleInput
                name={q.id}
                labelledBy={labelId}
                value={answers[q.id] ?? null}
                onChange={(v) => setAnswer(q.id, v)}
              />
            </li>
          );
        })}
      </ol>

      <div className="mt-12 flex flex-wrap items-center gap-3">
        <Button onClick={submit} disabled={!complete}>
          결과 보기
        </Button>
        {!complete ? (
          <span className="text-faint text-xs">
            {questions.length - done}문항이 남았습니다
          </span>
        ) : null}
        {done > 0 ? (
          <Button variant="quiet" onClick={retake} className="ml-auto">
            답안 지우기
          </Button>
        ) : null}
      </div>

      <p className="text-faint kr mt-6 text-xs leading-relaxed">{act2.quizIntro.desc}</p>
    </div>
  );
}

export default Quiz;
