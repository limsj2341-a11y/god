import { useMemo, useRef, useState } from 'react';
import { questions } from '../../data/questions';
import { answeredCount, isComplete, scoreAnswers } from '../../lib/scoring';
import { usePersistentState } from '../../hooks/usePersistentState';
import { ScaleInput } from './ScaleInput';
import { ResultFlipCard } from './ResultFlipCard';
import { Button } from '../ui/Button';
import { ProgressLine } from '../ui/ProgressLine';
import { act2 } from '../../data/content';
import { JUMP_EVENT } from '../../hooks/useViewportFrame';

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

  /*
   * 결과를 펼치면 문항 열 개가 사라진다. 그만큼 2막의 글이 짧아지고,
   * Page 가 그 높이를 다시 재서 문서 전체가 줄어든다(실측: 1315px).
   *
   * 줄어드는 것은 지금 보고 있는 자리보다 위쪽이라, 가만히 두면 발밑이 꺼지면서
   * 스크롤 위치가 그만큼 뒤로 밀린다 — 3막 자리로 넘어가 버렸다.
   * 게다가 예전에는 거기서 scrollIntoView 로 부드럽게 이동해서, 3막을 한 번
   * 훑고 지나온 뒤에야 결과 카드에 닿았다.
   *
   * 줄어든 만큼 스크롤을 같이 당겨 제자리에 붙들어 둔다. 화면은 움직이지 않고
   * 문항이 있던 자리에 결과 카드가 놓인다.
   *
   * 두 프레임을 기다리는 이유: 문서가 줄어드는 것은 React 가 DOM 을 고친
   * 다음이 아니라, Page 의 ResizeObserver 가 .page 높이를 다시 쓴 다음이다.
   */
  const submit = () => {
    const beforeDocH = document.documentElement.scrollHeight;
    const beforeY = window.scrollY;

    setSubmitted(true);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const delta = document.documentElement.scrollHeight - beforeDocH;
        if (delta === 0) return;

        window.scrollTo({ top: Math.max(0, beforeY + delta), left: 0, behavior: 'instant' });
        // 막들이 새 위치에 맞춰 곧바로 제 상태를 잡도록 알린다.
        window.dispatchEvent(new Event(JUMP_EVENT));
      });
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
