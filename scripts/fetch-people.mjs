// 인물 맞추기용 사진을 위키백과/위키미디어 커먼즈(자유 이용 라이선스)에서 미리 내려받는다.
// 결과: public/people/pNN.jpg + src/lib/people.json (이름/파일/출처 표기)
import { writeFileSync, readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const OUT_JSON = 'data/people.json'

const NAMES = [
  // 스포츠
  '손흥민', '김민재', '이강인', '황희찬', '류현진', '김연아', '박지성', '오타니 쇼헤이',
  '리오넬 메시', '크리스티아누 호날두', '킬리안 음바페', '엘링 홀란',
  // 가수 / 아이돌
  '아이유', '지드래곤', '싸이', '태연', '제니 (가수)', '리사 (가수)', '로제 (가수)', '지수 (가수)',
  '정국', '뷔 (가수)', '지민 (1995년)', 'RM (가수)', '진 (가수)', '슈가 (가수)', '제이홉',
  '임영웅', '이영지', '카리나 (가수)', '장원영', '아이브',
  // 배우
  '마동석', '송강호', '이정재', '정호연', '김고은', '박서준', '한소희', '김수현 (배우)',
  '공유 (배우)', '하정우', '이병헌', '전지현', '손예진', '현빈', '박보검', '차은우', '전종서',
  // 방송인
  '유재석', '강호동', '신동엽 (희극인)', '조세호', '양세형', '양세찬', '기안84', '백종원',
  // 해외 유명인
  '일론 머스크', '테일러 스위프트', '빌리 아일리시', '로버트 다우니 주니어', '톰 크루즈',
  '마크 저커버그', '스티브 잡스', '엠마 왓슨',
  // 1차에서 실패한 인물 대체 표제어
  '김민재 (축구 선수)', '제니 (1996년)', '라리사 마노발', '김태형 (1995년)',
  '박지민 (1995년)', '민윤기', '김수현 (1988년)',
  // 한국 위인 (초상화/사진)
  '세종', '이순신', '안중근', '유관순', '김구', '신사임당', '정약용', '이황', '이이',
  '장영실', '윤봉길', '김유신', '광개토대왕', '대조영', '허준', '방정환',
  // 해외 위인
  '알베르트 아인슈타인', '에이브러햄 링컨', '나폴레옹 1세', '마하트마 간디',
  '볼프강 아마데우스 모차르트', '루트비히 판 베토벤', '빈센트 반 고흐',
  '레오나르도 다 빈치', '아이작 뉴턴', '윌리엄 셰익스피어', '마틴 루서 킹 주니어',
  '넬슨 만델라', '마리 퀴리', '찰스 다윈', '크리스토퍼 콜럼버스', '클레오파트라 7세',
  '소크라테스', '갈릴레오 갈릴레이', '빌 게이츠', '헬렌 켈러', '나이팅게일',
  '파블로 피카소', '토머스 에디슨', '조지 워싱턴', '율리우스 카이사르',
]

const ARGV_NAMES = process.argv[2] ? JSON.parse(process.argv[2]) : null

const UA = 'BeyondImaginationCampQuiz/1.0 (offline team event quiz; jayden.bin@kakaocorp.com)'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// 위키미디어는 짧은 시간에 많이 부르면 429를 준다. 간격 + 백오프 재시도.
async function api(host, params) {
  const url = `https://${host}/w/api.php?${new URLSearchParams(params)}`
  for (let attempt = 0; attempt < 5; attempt++) {
    await sleep(attempt === 0 ? 700 : 1500 * 2 ** attempt)
    const r = await fetch(url, { headers: { 'User-Agent': UA, 'Accept': 'application/json' } })
    if (r.ok) return r.json()
    if (r.status !== 429) throw new Error(`${r.status}`)
  }
  throw new Error('429 (재시도 초과)')
}

async function lookup(name) {
  for (const host of ['ko.wikipedia.org', 'en.wikipedia.org']) {
    try {
      const d = await api(host, {
        action: 'query', format: 'json', redirects: '1', titles: name,
        prop: 'pageimages', piprop: 'thumbnail|name', pithumbsize: '900',
      })
      const pages = Object.values(d.query?.pages ?? {})
      const p = pages[0]
      if (p && !p.missing && p.thumbnail?.source) {
        return { title: p.title, src: p.thumbnail.source, file: p.pageimage, host }
      }
    } catch (e) {
      console.error(`  ! ${host} ${name}: ${e.message}`)
    }
  }
  return null
}

async function credit(file) {
  try {
    const d = await api('commons.wikimedia.org', {
      action: 'query', format: 'json', titles: `File:${file}`,
      prop: 'imageinfo', iiprop: 'extmetadata',
    })
    const meta = Object.values(d.query?.pages ?? {})[0]?.imageinfo?.[0]?.extmetadata ?? {}
    const strip = (h) => (h ? String(h).replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim() : '')
    return { artist: strip(meta.Artist?.value), license: strip(meta.LicenseShortName?.value) }
  } catch {
    return { artist: '', license: '' }
  }
}

const out = existsSync(OUT_JSON) ? JSON.parse(readFileSync(OUT_JSON, 'utf8')).people : []
const haveNames = new Set(out.map((p) => p.name))
// 기존 id 와 절대 겹치지 않게 최대 번호에서 이어 붙인다 (겹치면 사진 파일이 덮어써진다)
let n = out.reduce((m, p) => Math.max(m, Number(String(p.id).slice(1)) || 0), 0)
for (const name of (ARGV_NAMES ?? NAMES)) {
  const display0 = name.replace(/\s*\([^)]*\)\s*$/, '').trim()
  if (haveNames.has(display0)) continue
  const hit = await lookup(name)
  if (!hit) { console.log(`✗ ${name} — 사진 없음`); continue }
  if (out.some((p) => p.source === hit.src)) { console.log(`= ${name} — 같은 사진 중복, 건너뜀`); continue }
  n += 1
  const id = `p${String(n).padStart(3, '0')}`
  const ext = (hit.src.match(/\.(jpe?g|png)(?=$|\?)/i)?.[1] ?? 'jpg').toLowerCase()
  const filename = `${id}.${ext === 'jpeg' ? 'jpg' : ext}`
  await sleep(400)
  const res = await fetch(hit.src, { headers: { 'User-Agent': UA } })
  if (!res.ok) { console.log(`✗ ${name} — 다운로드 실패 ${res.status}`); n -= 1; continue }
  const buf = Buffer.from(await res.arrayBuffer())
  writeFileSync(join('public/people', filename), buf)
  const c = await credit(hit.file)
  // 표기용 이름은 위키 문서 제목의 괄호 설명을 떼고 사용
  out.push({ id, name: display0, file: filename, source: hit.src, ...c })
  haveNames.add(display0)
  console.log(`✓ ${display0} → ${filename} (${Math.round(buf.length / 1024)}KB)`)
}

writeFileSync(
  OUT_JSON,
  JSON.stringify({
    설명: '인물 맞추기 문제. name = 정답으로 인정할 이름, file = public/people/ 안의 사진. 사람을 빼려면 항목을 지우면 되고, 사진을 바꾸려면 같은 파일명으로 덮어쓰세요.',
    people: out,
  }, null, 2) + '\n',
)
console.log(`\n총 ${out.length}명 저장 완료 → ${OUT_JSON}`)
