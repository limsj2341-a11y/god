import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// 커스텀 도메인(www.tangbu-jesus.kro.kr)으로 서비스하므로 사이트가 루트에 놓인다.
// 전에는 저장소 이름을 붙인 '/god/' 이었는데, 도메인을 붙이자 빌드된 HTML 이
// /god/assets/... 를 찾다가 404 가 나서 흰 화면이 됐다.
//
// 도메인을 떼고 <user>.github.io/god/ 로 돌아가려면 '/god/' 로 되돌리고
// public/CNAME 도 함께 지울 것. 둘은 한 짝이다.
const BASE = '/';

export default defineConfig({
  base: BASE,
  plugins: [react(), tailwindcss()],
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
});
