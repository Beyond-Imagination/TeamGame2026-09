// vite build 결과를 서버 없이 열 수 있게 후처리한다.
// - ES 모듈 스크립트는 file:// 에서 CORS 로 막히므로, 일반 스크립트(iife)로 바꾼다.
// - 인라인 스크립트는 #root 보다 먼저 실행되면 안 되므로 body 끝으로 옮긴다.
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const dist = join(process.cwd(), 'dist')
const file = join(dist, 'index.html')
let html = readFileSync(file, 'utf8')

const tag = html.match(/<script[^>]*src="([^"]*app\.js)"[^>]*><\/script>/)
if (!tag) throw new Error('app.js 스크립트 태그를 찾지 못했습니다')

html = html.replace(tag[0], '')
html = html.replace('</body>', `  <script src="${tag[1]}"></script>\n</body>`)
if (!html.includes(`<script src="${tag[1]}"></script>`)) throw new Error('스크립트 재배치 실패')

writeFileSync(file, html)
console.log('후처리 완료: dist/index.html (app.js 를 일반 스크립트로 body 끝에 배치)')
