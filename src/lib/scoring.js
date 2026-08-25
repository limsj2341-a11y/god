import { questions } from '../data/questions';
import { BALANCED_THRESHOLD, results } from '../data/results';

const MIN = 1;
const MAX = 5;

/**
 * 답안(id → 1..5)에서 두 축의 점수를 낸다.
 *
 * 각 축을 0~100 으로 정규화하므로 축별 문항 수가 달라도 공정하다.
 * questions.js 에서 문항을 늘리거나 줄여도 이 함수는 그대로 동작한다.
 */
export function scoreAnswers(answers) {
  const acc = {
    younger: { sum: 0, count: 0 },
    elder: { sum: 0, count: 0 },
  };

  for (const q of questions) {
    const raw = answers[q.id];
    if (raw == null) continue;
    const bucket = acc[q.axis];
    if (!bucket) continue;
    const value = q.reverse ? MAX + MIN - raw : raw;
    bucket.sum += value;
    bucket.count += 1;
  }

  const pct = (b) => {
    if (b.count === 0) return 0;
    const lo = b.count * MIN;
    const hi = b.count * MAX;
    return Math.round(((b.sum - lo) / (hi - lo)) * 100);
  };

  const younger = pct(acc.younger);
  const elder = pct(acc.elder);
  const gap = Math.abs(younger - elder);

  let key;
  if (gap <= BALANCED_THRESHOLD) key = 'balanced';
  else key = younger > elder ? 'younger' : 'elder';

  return {
    younger,
    elder,
    gap,
    key,
    result: results[key],
  };
}

/** 모든 문항에 답했는지 */
export function isComplete(answers) {
  return questions.every((q) => answers[q.id] != null);
}

export function answeredCount(answers) {
  return questions.reduce((n, q) => n + (answers[q.id] != null ? 1 : 0), 0);
}

export default scoreAnswers;
