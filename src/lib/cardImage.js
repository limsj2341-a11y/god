import { ACCENT, CLAY } from '../theme/palette';
import { cardFooter } from '../data/practice';

/**
 * 실천 카드를 PNG 로 굽는다.
 *
 * html2canvas 계열 라이브러리는 한글 웹폰트를 임베드하는 과정에서 자주 깨진다.
 * 카드 레이아웃이 단순하므로 Canvas 2D 로 직접 그린다 — 의존성 0,
 * 준비할 것은 폰트 로딩 대기뿐이다.
 */

const W = 1080;
const PAD = 88;
const BG = '#F6F3EE';
const INK = '#16171A';

const SERIF = "'Gowun Batang', serif";
const SANS = "'Pretendard Variable', Pretendard, sans-serif";

/** 캔버스에 그리기 전에 실제 폰트가 준비되었는지 확인 */
async function ensureFonts() {
  if (!document.fonts) return;
  try {
    await Promise.all([
      document.fonts.load(`700 60px ${SERIF}`),
      document.fonts.load(`400 40px ${SERIF}`),
      document.fonts.load(`400 30px ${SANS}`),
      document.fonts.load(`600 26px ${SANS}`),
    ]);
    await document.fonts.ready;
  } catch {
    /* 폰트 로딩에 실패해도 대체 폰트로 그린다 */
  }
}

/** 주어진 폭에 맞춰 줄바꿈 (한글은 글자 단위로 끊어도 자연스럽다) */
function wrap(ctx, text, maxWidth) {
  const words = String(text).split(/(\s+)/);
  const lines = [];
  let line = '';

  const pushChunk = (chunk) => {
    for (const ch of chunk) {
      const next = line + ch;
      if (ctx.measureText(next).width > maxWidth && line) {
        lines.push(line.trimEnd());
        line = ch === ' ' ? '' : ch;
      } else {
        line = next;
      }
    }
  };

  for (const w of words) pushChunk(w);
  if (line.trim()) lines.push(line.trimEnd());
  return lines;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawCheck(ctx, x, y, size, checked) {
  ctx.lineWidth = 3;
  ctx.strokeStyle = checked ? ACCENT : 'rgba(22,23,26,0.28)';
  ctx.fillStyle = checked ? ACCENT : 'transparent';
  roundRect(ctx, x, y, size, size, 8);
  if (checked) ctx.fill();
  ctx.stroke();

  if (!checked) return;
  ctx.strokeStyle = BG;
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(x + size * 0.26, y + size * 0.52);
  ctx.lineTo(x + size * 0.44, y + size * 0.7);
  ctx.lineTo(x + size * 0.76, y + size * 0.3);
  ctx.stroke();
}

/**
 * @param {{days: Array<{day:string,title:string,text:string}>, checked: boolean[]}} data
 * @returns {Promise<HTMLCanvasElement>}
 */
export async function renderPracticeCard({ days, checked }) {
  await ensureFonts();

  const contentW = W - PAD * 2;
  const boxSize = 46;
  const gutter = 30;
  const textX = PAD + boxSize + gutter;
  const textW = W - textX - PAD;

  // 1차 패스: 높이 계산
  const measure = document.createElement('canvas').getContext('2d');
  // 행 안에서 글이 놓이는 자리 (행 상단 기준)
  const DAY_BASE = 28;
  const TITLE_BASE = 76;
  const DESC_BASE = 122;
  const DESC_STEP = 42;
  const DESC_TAIL = 10; // 마지막 줄의 디센더
  const RULE_GAP = 22; // 마지막 줄과 구분선 사이
  const ROW_GAP = 22; // 구분선과 다음 행 사이

  const rows = days.map((d) => {
    measure.font = `400 29px ${SANS}`;
    const lines = wrap(measure, d.text, textW);
    // 행 높이는 설명 줄까지 포함해야 한다. 안 그러면 구분선이 제목과 설명
    // 사이에 그어져서, 설명이 자기 행이 아니라 다음 행에 붙어 보인다.
    const contentBottom = DESC_BASE + (lines.length - 1) * DESC_STEP + DESC_TAIL;
    return { ...d, lines, contentBottom, height: contentBottom + RULE_GAP + ROW_GAP };
  });

  const headerH = 250;
  const footerH = 150;
  const bodyH = rows.reduce((s, r) => s + r.height, 0);
  const H = headerH + bodyH + footerH;

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  // 배경
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);

  // 테두리
  ctx.strokeStyle = 'rgba(22,23,26,0.12)';
  ctx.lineWidth = 2;
  ctx.strokeRect(28, 28, W - 56, H - 56);

  // 헤더
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = CLAY;
  ctx.font = `600 26px ${SANS}`;
  ctx.fillText(cardFooter.subtitle, PAD, 128);

  ctx.fillStyle = INK;
  ctx.font = `700 62px ${SERIF}`;
  ctx.fillText(cardFooter.title, PAD, 200);

  ctx.strokeStyle = ACCENT;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(PAD, 228);
  ctx.lineTo(PAD + 76, 228);
  ctx.stroke();

  // 본문
  let y = headerH;
  rows.forEach((row, idx) => {
    const isChecked = Boolean(checked[idx]);

    drawCheck(ctx, PAD, y + 6, boxSize, isChecked);

    ctx.fillStyle = isChecked ? ACCENT : CLAY;
    ctx.font = `600 25px ${SANS}`;
    ctx.fillText(row.day, textX, y + DAY_BASE);

    ctx.fillStyle = INK;
    ctx.font = `700 38px ${SERIF}`;
    ctx.fillText(row.title, textX, y + TITLE_BASE);

    ctx.fillStyle = 'rgba(22,23,26,0.72)';
    ctx.font = `400 29px ${SANS}`;
    row.lines.forEach((line, i) => {
      ctx.fillText(line, textX, y + DESC_BASE + i * DESC_STEP);
    });

    // 구분선은 이 행의 마지막 줄 아래에 긋는다
    ctx.strokeStyle = 'rgba(22,23,26,0.09)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(PAD, y + row.contentBottom + RULE_GAP);
    ctx.lineTo(W - PAD, y + row.contentBottom + RULE_GAP);
    ctx.stroke();

    y += row.height;
  });

  // 푸터
  const done = checked.filter(Boolean).length;
  ctx.fillStyle = 'rgba(22,23,26,0.55)';
  ctx.font = `400 26px ${SANS}`;
  ctx.fillText(`${done} / ${days.length}일 완료`, PAD, H - 92);

  const stamp = new Date().toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  ctx.textAlign = 'right';
  ctx.fillText(stamp, W - PAD, H - 92);
  ctx.textAlign = 'left';

  return canvas;
}

/** 카드를 그려서 바로 내려받는다. */
export async function downloadPracticeCard(data, filename = '일주일-실천-카드.png') {
  const canvas = await renderPracticeCard(data);

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error('이미지를 만들지 못했습니다.');

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // 브라우저가 다운로드를 붙잡을 시간을 준 뒤 해제
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export default downloadPracticeCard;
