import { useMemo, useRef, useState } from 'react';
import { questions } from '../../data/questions';
import { answeredCount, isComplete, scoreAnswers } from '../../lib/scoring';
import { usePersistentState } from '../../hooks/usePersistentState';
import { ScaleInput } from './ScaleInput';
import { ResultFlipCard } from './ResultFlipCard';
import { Button } from '../ui/Button';
import { ProgressLine } from '../ui/ProgressLine';
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
        <ProgressLine value={done} max={questions.length} label={`${done} / ${questions.length}`} />
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

      {/* 결과 보기 아래 여백.
          누르기 전에 답을 한 번 훑어보게 되는 자리인데, 버튼 바로 밑에서
          다음 내용이 올라오면 화면이 빡빡하다. 담벼락(32dvh)만큼은 필요 없고
          한 번 숨 쉴 만큼 둔다. */}
      <div aria-hidden="true" className="h-[22dvh]" />
    </div>
  );
}

export default Quiz;
