import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/index.css';

/**
 * 새로고침은 이 사이트를 다시 시작하는 일이다 — 첫 화면부터 다시 읽는다.
 * 브라우저가 읽던 위치를 복원해 버리면 시작 안내가 뜰 자리가 없어지므로
 * 복원을 끄고 맨 위에서 시작한다. React 가 붙기 전에 정해야 늦지 않는다.
 *
 * 다만 #act2 같은 앵커로 들어온 경우는 그 자리로 가려는 뜻이므로 두 손 뗀다
 * (본문으로 건너뛰기 링크가 그렇게 동작한다).
 */
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
if (!window.location.hash) window.scrollTo(0, 0);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
