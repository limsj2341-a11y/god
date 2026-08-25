# 탕부 하나님 — 독서 성찰

팀 켈러 「탕부 하나님」을 따라 걷는 원페이지 스크롤 사이트.
스크롤을 내릴수록 배경이 밤(#0D0E11)에서 잔치의 아침(#F6F3EE)으로 넘어간다.

## 실행

```bash
npm install
npm run dev      # http://localhost:5173/god/
npm run build
npm run preview  # http://localhost:4173/god/
```

`base` 가 `/god/` 이므로 개발 서버에서도 주소 끝에 `/god/` 이 붙는다.

## 배포 (GitHub Pages)

1. 저장소 → **Settings → Pages → Build and deployment → Source** 를 **GitHub Actions** 로 변경
2. `main` 브랜치에 푸시하면 [.github/workflows/deploy.yml](.github/workflows/deploy.yml) 이 빌드·배포한다
3. 주소: `https://<계정>.github.io/god/`

저장소 이름을 바꾸면 [vite.config.js](vite.config.js) 의 `BASE` 한 줄만 고치면 된다.

## 내가 고칠 파일들

| 파일 | 내용 |
| --- | --- |
| [src/data/content.js](src/data/content.js) | 4막의 모든 카피 — 제목, 본문 `sections`, 버튼 라벨, 인용 블록, 나눔 질문 |
| [src/data/questions.js](src/data/questions.js) | 자가진단 10문항 (**초안 있음** — 다듬어 쓰세요) |
| [src/data/results.js](src/data/results.js) | 결과 카드 두(세) 종류의 설명과 인용문 |
| [src/data/practice.js](src/data/practice.js) | 일주일 실천 7개 항목 |
| [src/theme/palette.js](src/theme/palette.js) | 4막 배경색, 액센트, 보조색 |

### ⚠️ 인용문은 비워 두었습니다

`content.js` 와 `results.js` 안에서 `// 출처: 책 인용` 주석이 달린 `quote.text`
필드는 전부 빈 문자열입니다. 실제 책 문장을 대신 지어내지 않기 위해서입니다.
책에서 직접 옮겨 적어 주세요. **비어 있으면 인용 블록은 화면에 나타나지 않습니다.**

### 본문 구조

각 막의 본문은 `sections` 배열이다.

```js
sections: [
  { title: '요구', paragraphs: ['...', '...'] },
  { title: '먼 나라', paragraphs: ['...'] },
]
```

소제목을 빼려면 `title` 을 지우고, 단락을 늘리려면 배열에 문자열을 더한다.
섹션을 추가하거나 순서를 바꿔도 화면이 알아서 따라온다.

막마다 붙는 특수 블록:

| 키 | 위치 | 화면 |
| --- | --- | --- |
| `act1.audience` | 1막 | 누가복음 15장 청중 구조, 카드 3개 |
| `act2.contrast` | 2막 | 두 아들 대비, 카드 2개 |
| `act3.note` | 3막 | 앰버 강조 블록 |
| `act4.discussion` | 4막 | 번호 붙은 나눔 질문 |

### 자가진단 문항 다듬기

`questions.js` 의 `text` 만 바꾸면 됩니다. 지금 들어 있는 10문항은 초안입니다.

- `axis: 'younger'` → 동생형(자기실현형) 문항
- `axis: 'elder'` → 형형(도덕적 순응형) 문항
- `reverse: true` → "아니다"가 그 성향을 뜻하는 문항 (점수 1↔5 반전)

문항 수를 늘리거나 줄여도 됩니다. 점수는 축별 문항 수로 정규화되므로
두 축의 문항 수가 달라도 결과가 한쪽으로 기울지 않습니다.
(`src/lib/scoring.js`)

## 담벼락을 백엔드로 옮길 때

지금은 `localStorage` 에 저장된다. 저장 로직은 어댑터로 분리되어 있어
컴포넌트를 건드릴 필요가 없다.

```
src/storage/
├── index.js         # 어댑터 선택 + 인터페이스 정의
├── localAdapter.js  # 현재 사용 중
└── httpAdapter.js   # 서버용 (스텁, 구현 완료)
```

`.env` 파일에 한 줄을 넣으면 자동으로 서버 어댑터로 전환된다:

```
VITE_WALL_API=https://example.com/api
```

서버가 맞춰야 할 계약:

```
GET  {base}/entries  ->  [{ id, text, createdAt }, ...]   (최신순)
POST {base}/entries  <-  { text }  ->  { id, text, createdAt }
```

## 구조 메모

- **배경 보간** — `BackgroundStage` 가 각 막(`section[data-act]`)의 실제 중심
  좌표를 stop 으로 잡고, 뷰포트 중앙이 어디에 있는지에 따라 색을 섞어
  `--bg` / `--fg` CSS 변수에 직접 쓴다. 스크롤마다 React 리렌더가 일어나지 않는다.
  보간은 감마를 푼 선형 광량 공간에서 한다 (`src/lib/color.js`) — sRGB 값을
  그냥 섞으면 어둠→밝음 구간의 중간색이 탁하게 가라앉는다.
- **애니메이션** — 전부 `transform` / `opacity`. 레이아웃을 다시 계산하는
  속성은 쓰지 않는다.
- **모션 축소** — `prefers-reduced-motion: reduce` 에서 전환·애니메이션이 꺼지고,
  잔치 연출의 떠오르는 빛은 아예 렌더링되지 않는다 (`FeastMoment`).
- **카드 이미지 저장** — Canvas 2D 로 직접 그린다 (`src/lib/cardImage.js`).
  html2canvas 계열은 한글 웹폰트 임베드에서 자주 깨져서 쓰지 않았다.

## 책 메타포 레이어

기존 연출(fade-up, 등불, hover)은 그대로 두고 그 위에 얹은 상위 레이어다.

| 파일 | 역할 |
| --- | --- |
| [src/components/layout/Page.jsx](src/components/layout/Page.jsx) | 페이지 넘김(A)과 소멸 3단계(B). 스크롤 진행도를 받아 인라인 스타일을 직접 쓴다 |
| [src/components/layout/TableLight.jsx](src/components/layout/TableLight.jsx) | 흘러내린 빛이 남아 4막의 상시 조명이 되는 고정 레이어 |
| [src/hooks/useViewportFrame.js](src/hooks/useViewportFrame.js) | IntersectionObserver 로 켜고 끄는 rAF 루프. scroll 이벤트에는 아무 연산도 붙이지 않는다 |
| [src/lib/motion.js](src/lib/motion.js) | cubic-bezier 직접 계산, mask/blur 지원 판별 |

### 조절할 수 있는 값

| 위치 | 상수 | 지금 값 | 뜻 |
| --- | --- | --- | --- |
| Page.jsx | `ENTER_WINDOW` / `EXIT_WINDOW` | 0.35 | 넘김 램프 구간(뷰포트 높이 대비) |
| Page.jsx | `ENTER_X` / `EXIT_X` | 6% / -8% | 넘김 이동량 |
| Page.jsx | `stage(d, ...)` | 0/0.4/0.75/1 | 소멸 3단계 경계 |
| motion.js | `MAX_BLUR_PX` | 6 | 2단계 블러 상한 |
| motion.js | `detectBlur()` | — | 블러를 켤지 판단(모바일·저사양은 끔) |
| BackgroundStage.jsx | `FG_STEPS` | 12 | 글자 색 보간을 끊는 단계 수 |

### 설계 판단 두 가지

**넘김도 스크롤 연동이다.** 명세의 `700ms`를 시간 기반 트랜지션으로 두면
"스크롤에 물려서 되감기도 가능해야 함"과 충돌한다(되감는 동안 넘김은 제
시간표대로 진행). `cubic-bezier(0.16, 1, 0.3, 1)`은 진행도 램프의 이징으로
적용하고, 램프 구간을 뷰포트 35%로 잡았다 — 보통 속도에서 대략 700ms.

**3막은 퇴장 슬라이드를 걸지 않는다.** 퍼져나가는 소멸과 왼쪽으로 빠지는
슬라이드는 방향이 어긋난다. 3막의 퇴장은 소멸 연출이 전담한다.

### 배경 전환이 소멸 구간과 맞물리는 방법

`BackgroundStage` 는 막마다 색 stop 을 둘 잡는다 — 도착 지점과 출발 지점.
그 사이에는 색을 붙잡고 있다가, 한 막의 출발 지점에서 다음 막의 도착
지점까지 정확히 뷰포트 한 화면에 걸쳐 넘어간다. 3막의 출발 지점이 곧
소멸의 시작(`d=0`)이라, 소멸이 끝나는 순간 `#F6F3EE` 전환도 끝난다.

램프에는 `easeTrailing`(뒤로 실은 곡선)을 쓴다. 대칭 곡선이면 종이가 아직
불투명한 시점에 배경이 이미 절반 넘게 밝아져서, 어두운 페이지가 가장자리부터
빛나야 할 자리에 회색 종이가 놓인다.

### 측정치 (Whale / CDP / 144Hz)

`d = 0 → 1` 구간을 실제로 스크롤시키며 rAF 간격을 측정한 값. ms.

| 구간 | p50 | p95 |
| --- | --- | --- |
| 기준선(2막 본문) | 6.9 | 7.0 |
| 소멸 · 느린 스크롤(2.5s) | 7.0 | 27.7 |
| 소멸 · 빠른 스크롤(0.4s) | 13.9 | 27.9 |
| 소멸 · 되감기 | 13.9 | 20.9 |

남은 비용은 소멸 연출이 아니라 **화면 전체 배경색이 바뀌는 것 자체**다.
`--fg` 갱신을 막으면 20.9 → 7ms 로 떨어지는데, 글자 색이 바뀔 때마다 보이는
글리프가 전부 재래스터화되고 `color-mix(in srgb, var(--fg) …)` 로 파생된
유틸까지 재계산되기 때문이다. `FG_STEPS` 로 보간 계수를 끊어 이 비용을 줄였다.
mask / blur / scale / 빛 레이어를 각각 꺼 봐도 프레임 차이는 없었다.
