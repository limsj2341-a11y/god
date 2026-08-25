import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// GitHub Pages: https://<user>.github.io/god/ 로 배포되므로 base 에 저장소 이름이 필요하다.
// 저장소 이름을 바꾸면 아래 한 줄만 고치면 된다. (사용자 페이지 저장소라면 '/')
const BASE = '/god/';

export default defineConfig({
  base: BASE,
  plugins: [react(), tailwindcss()],
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
});
