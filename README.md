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

## 담벼락 (Supabase)

모든 방문자가 **같은 담벼락**을 본다. 데이터는 Supabase 프로젝트
`limsj2341-a11y's Project` (ap-northeast-2) 의 `public.wall_entries` 에 쌓인다.

```
src/storage/
├── index.js            # 어댑터 선택 + 인터페이스 정의
├── supabaseConfig.js   # 접속 주소와 publishable 키
├── supabaseAdapter.js  # 현재 사용 중 (fetch 로 PostgREST 직접 호출)
├── httpAdapter.js      # 직접 만든 API 를 붙일 때
└── localAdapter.js     # 저장소 없이 이 브라우저에만 쌓을 때
```

`@supabase/supabase-js` 는 쓰지 않는다. 필요한 것이 목록 읽기와 한 줄
넣기뿐이라 클라이언트 라이브러리를 번들에 싣지 않았다.

### 키가 저장소에 있는 이유

`supabaseConfig.js` 의 `sb_publishable_...` 키는 **브라우저에 실려 나가라고
만들어진 키다.** 배포된 사이트의 JS 번들 안에 어차피 들어 있고 개발자 도구를
열면 누구나 볼 수 있다. 실제 보호는 키가 아니라 데이터베이스의 RLS 정책이 한다.

절대 `service_role` 키(`sb_secret_...`)를 여기에 넣지 말 것. 그 키는 RLS 를
통째로 우회한다.

### 걸려 있는 정책 (`wall_entries`)

| 동작 | 허용 |
| --- | --- |
| SELECT | 누구나 (담벼락이므로) |
| INSERT | 누구나, 단 1~80자 |
| UPDATE | 정책 없음 → 아무도 못 고침 |
| DELETE | 정책 없음 → 아무도 못 지움 |

실제로 찔러서 확인했다. 80자 초과·빈 문자열 등록은 거부되고, 남의 글을
수정하거나 지우려는 요청은 0건 처리된다. 글을 지우려면 Supabase 대시보드를
쓴다(service_role).

**익명은 진짜 익명이다.** IP 도, 해시한 IP 도 저장하지 않는다. 스팸을 막는
장치가 그만큼 없다는 뜻이기도 하다 — 문제가 생기면 Turnstile 이나 엣지 함수를
앞에 두는 쪽으로 가야 한다.

### 무료 플랜 주의

Supabase 무료 프로젝트는 **약 일주일간 아무 요청이 없으면 자동으로 멈춘다.**
멈춘 동안 담벼락은 비어 보이고 등록도 실패한다. 대시보드에서 Restore 를
누르면 1~2분 안에 돌아온다. (이 프로젝트도 한 번 멈춰 있었다.)

### 저장 위치 바꾸기

`.env` 파일로 덮어쓴다.

```
VITE_WALL_LOCAL=1          # 저장소 없이 이 브라우저에만
VITE_WALL_API=https://…    # 직접 만든 API 로
VITE_SUPABASE_URL=…        # 다른 Supabase 프로젝트로
VITE_SUPABASE_KEY=…
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
| [src/lib/motion.js](src/lib/motion.js) | cubic-bezier 직접 계산, mask 지원 판별 |
| [src/components/layout/Dawn.jsx](src/components/layout/Dawn.jsx) | 3막 끝의 등불이 새벽으로 번져 화면을 덮는 원. 다 번지면 4막의 바탕이 된다 |

## 모션 그래픽 레이어

이야기의 흐름(밤 → 새벽, 떠남 → 잔치)을 빛 하나로 잇는다. 등불이 책장을
비추고, 책을 열면 빛이 새어 나오고, 글은 읽는 만큼 밝아지고, 3막 끝의
등불이 새벽이 되어 4막을 연다. 전부 스크롤에 물려 있어 되감으면 되돌아간다
(버튼 반응 같은 한 번짜리 몸짓만 시간 기반).

| 장면 | 파일 | 무엇이 움직이나 |
| --- | --- | --- |
| 책장 | [ShelfLantern.jsx](src/components/layout/ShelfLantern.jsx) | 어두운 방의 등불이 포인터를 느긋하게 따라오고(손가락 기기에서는 제자리에서 흔들림) 빛 속에 먼지가 떠오른다 |
| 책 꺼내기·펼치기 | index.css `.book-cover-front::after` / `.book-spill` | 표지 위를 빛이 한 번 스치고, 표지가 열릴 때 책등 쪽에서 빛이 새어 나온다 |
| 막 제목 | [SplitText.jsx](src/components/ui/SplitText.jsx) `variant="flip"` | 글자가 아랫변을 축으로 한 자씩 일어선다. 다 선 뒤에는 3D 변환을 걷어 글자가 흐려지지 않는다 |
| 막 번호 | [Section.jsx](src/components/layout/Section.jsx) `ActNumeral` | 윤곽선 숫자(01~04)가 글보다 느리게 흐른다 |
| 첫 문장·인용 | [ScrubText.jsx](src/components/ui/ScrubText.jsx) | 단어가 스크롤을 따라 하나씩 밝아진다 |
| 비교 카드 | [CardGrid.jsx](src/components/ui/CardGrid.jsx) | 두 장짜리 비교는 양쪽에서 마주 들어오고, 그 밖에는 차례로 떠오른다 |
| 목차 | [ActNav.jsx](src/components/layout/ActNav.jsx) | 지금 막을 읽은 만큼 점 둘레의 링이 차오른다 |
| 3막 → 4막 | [Page.jsx](src/components/layout/Page.jsx) · [Dawn.jsx](src/components/layout/Dawn.jsx) | 지면이 가장자리부터 녹고, 등불 자리에서 빛의 원이 자라 화면을 덮으며 불씨가 떠오른다 |
| 4막 | [TableLight.jsx](src/components/layout/TableLight.jsx) | 식탁 조명 속에서 빛 알갱이가 천천히 떠오른다 |

모션 축소 설정에서는 등불·먼지·불씨·빛 알갱이를 그리지 않고, 글은 처음부터
다 밝으며, 새벽은 번지지 않고 한 번에 바뀐다.

### 조절할 수 있는 값

| 위치 | 상수 | 지금 값 | 뜻 |
| --- | --- | --- | --- |
| Page.jsx | `ENTER_WINDOW` / `EXIT_WINDOW` | 0.35 | 넘김 램프 구간(뷰포트 높이 대비) |
| Page.jsx | `ENTER_X` / `EXIT_X` | 6% / -8% | 넘김 이동량 |
| Page.jsx | `stage(d, ...)` | 스밈 0~0.45 / 용해 0.22~0.8 / 번짐 0.06~0.9 | 소멸 단계 경계 |
| ScrubText.jsx | `from` / `to` | 0.92 / 0.62 | 단어가 밝아지기 시작하는 자리와 다 밝아지는 자리(화면 높이 대비) |
| ShelfLantern.jsx | `FOLLOW` | 0.075 | 등불이 포인터를 따라오는 빠르기 |
| BackgroundStage.jsx | `FG_STEPS` | 12 | 글자 색 보간을 끊는 단계 수 |

### 설계 판단 두 가지

**넘김도 스크롤 연동이다.** 명세의 `700ms`를 시간 기반 트랜지션으로 두면
"스크롤에 물려서 되감기도 가능해야 함"과 충돌한다(되감는 동안 넘김은 제
시간표대로 진행). `cubic-bezier(0.16, 1, 0.3, 1)`은 진행도 램프의 이징으로
적용하고, 램프 구간을 뷰포트 35%로 잡았다 — 보통 속도에서 대략 700ms.

**3막은 퇴장 슬라이드를 걸지 않는다.** 퍼져나가는 소멸과 왼쪽으로 빠지는
슬라이드는 방향이 어긋난다. 3막의 퇴장은 소멸 연출이 전담한다.

### 배경 전환이 소멸 구간과 맞물리는 방법

바닥색(`--bg`)은 끝까지 어둠에 머문다(`palette.js` 의 `ground`). 4막의 밝음은
바닥색을 섞어서 내지 않고, 새벽(`Dawn`)의 빛의 원이 화면을 덮어서 낸다.
예전에는 바닥색을 어둠 → `#F6F3EE` 로 섞었는데, 섞는 도중이 중간 회색이라
그 위에 얹은 빛 레이어·배경 블러와 함께 전환 내내 화면이 회색 안개처럼
탁했다. 지금은 어둠과 새벽이 한 화면에 또렷하게 갈린다.

### 측정치 (Whale / CDP / 144Hz)

> 아래 표는 새벽(Dawn)으로 바꾸기 전, 배경색 보간과 블러가 있던 때의 값이다.
> 바꾼 뒤 헤드리스 Chromium(60Hz, GPU 없음)에서 같은 구간을 2초에 걸쳐 스크롤하면
> p50 이 49.9ms → 16.7ms 로 내려왔다.

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
