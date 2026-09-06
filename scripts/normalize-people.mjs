// data/people.json 정리: 설명/통계 갱신, id·파일 중복 검사, 누락 필드 경고
import { readFileSync, writeFileSync, readdirSync, unlinkSync } from 'node:fs'

const DESC =
  '게임4 인물 맞추기 문제. name = 정답으로 인정할 이름, origin = 국내/해외, category = 분류, ' +
  'file = public/people/ 안의 사진 파일, crop = 지폐처럼 인물이 한쪽에 치우친 사진에서 얼굴 위치(가로% 세로%). ' +
  '항목을 지우면 그 인물은 출제되지 않습니다. 사진을 바꾸려면 같은 파일명으로 덮어쓰세요. ' +
  '사진 출처는 위키미디어(자유 이용 라이선스)이며 artist/license 에 표기가 들어 있습니다.'

const db = JSON.parse(readFileSync('data/people.json', 'utf8'))
const people = db.people.map((p) => ({
  id: p.id, name: p.name, origin: p.origin, category: p.category,
  file: p.file, ...(p.crop ? { crop: p.crop } : {}), ...(p.zoom ? { zoom: p.zoom } : {}),
  source: p.source, artist: p.artist, license: p.license,
}))

const dup = (key) =>
  Object.entries(people.reduce((m, p) => ({ ...m, [p[key]]: (m[p[key]] ?? 0) + 1 }), {}))
    .filter(([, v]) => v > 1)
    .map(([k]) => k)

const dupId = dup('id')
const dupFile = dup('file')
const missing = people.filter((p) => !p.origin || !p.category).map((p) => p.name)
if (dupId.length) console.error(`⚠️ 중복 id: ${dupId.join(', ')}`)
if (dupFile.length) console.error(`⚠️ 중복 파일: ${dupFile.join(', ')}`)
if (missing.length) console.error(`⚠️ origin/category 누락: ${missing.join(', ')}`)

// 목록에 없는 사진 파일 정리
const used = new Set(people.map((p) => p.file))
const orphans = readdirSync('public/people').filter((f) => !used.has(f))
orphans.forEach((f) => unlinkSync(`public/people/${f}`))

const kr = people.filter((p) => p.origin === '국내').length
writeFileSync(
  'data/people.json',
  JSON.stringify({
    설명: DESC,
    통계: { 전체: people.length, 국내: kr, 해외: people.length - kr, 국내비율: `${Math.round((kr / people.length) * 100)}%` },
    people,
  }, null, 2) + '\n',
)
console.log(`정리 완료: ${people.length}명 (국내 ${kr} / 해외 ${people.length - kr}) · 미사용 사진 ${orphans.length}개 삭제`)
