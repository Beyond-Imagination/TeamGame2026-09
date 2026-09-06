// 인물이 아닌 사진(동상·비석·문장 등)을 실제 초상으로 교체하거나 목록에서 제거한다.
import { writeFileSync, readFileSync, unlinkSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const UA = 'BeyondImaginationCampQuiz/1.0 (offline team event quiz; jayden.bin@kakaocorp.com)'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function api(host, params) {
  const url = `https://${host}/w/api.php?${new URLSearchParams(params)}`
  for (let i = 0; i < 5; i++) {
    await sleep(i === 0 ? 600 : 1500 * 2 ** i)
    const r = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } })
    if (r.ok) return r.json()
    if (r.status !== 429) throw new Error(String(r.status))
  }
  throw new Error('429')
}

/** 커먼즈 파일 검색으로 초상 후보를 찾는다 */
async function findFile(query) {
  const d = await api('commons.wikimedia.org', {
    action: 'query', format: 'json', generator: 'search', gsrnamespace: '6',
    gsrsearch: query, gsrlimit: '6', prop: 'imageinfo', iiprop: 'url|extmetadata', iiurlwidth: '800',
  })
  const pages = Object.values(d.query?.pages ?? {})
  return pages
    .map((p) => ({ title: p.title, info: p.imageinfo?.[0] }))
    .filter((x) => x.info?.thumburl)
}

const BAD_WORDS = /statue|stele|monument|coat of arms|memorial|bust|tomb|기념|동상|비석/i

const TARGETS = [
  { name: '나폴레옹 1세', query: 'Napoleon Bonaparte portrait painting David' },
  { name: '세종', query: 'Sejong the Great portrait painting' },
  { name: '이황', query: 'Yi Hwang portrait' },
  { name: '이이', query: 'Yi I portrait Confucian scholar' },
  { name: '장영실', query: 'Jang Yeong-sil portrait' },
  { name: '광개토대왕', query: 'Gwanggaeto the Great portrait' },
]

const db = JSON.parse(readFileSync('data/people.json', 'utf8'))

for (const t of TARGETS) {
  const entry = db.people.find((p) => p.name === t.name)
  if (!entry) { console.log(`- ${t.name}: 목록에 없음`); continue }
  const cands = await findFile(t.query)
  const good = cands.find((c) => !BAD_WORDS.test(c.title))
  if (!good) {
    console.log(`✗ ${t.name}: 초상 후보 없음 → 후보 ${cands.map((c) => c.title).join(' | ') || '없음'}`)
    continue
  }
  const ext = (good.info.thumburl.match(/\.(jpe?g|png)$/i)?.[1] ?? 'jpg').toLowerCase()
  const file = `${entry.id}.${ext === 'jpeg' ? 'jpg' : ext}`
  await sleep(300)
  const res = await fetch(good.info.thumburl, { headers: { 'User-Agent': UA } })
  if (!res.ok) { console.log(`✗ ${t.name}: 다운로드 실패`); continue }
  if (entry.file !== file && existsSync(join('public/people', entry.file))) {
    unlinkSync(join('public/people', entry.file))
  }
  writeFileSync(join('public/people', file), Buffer.from(await res.arrayBuffer()))
  const meta = good.info.extmetadata ?? {}
  const strip = (h) => (h ? String(h).replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim() : '')
  entry.file = file
  entry.source = good.info.url
  entry.artist = strip(meta.Artist?.value)
  entry.license = strip(meta.LicenseShortName?.value)
  console.log(`✓ ${t.name} → ${good.title}`)
}

writeFileSync('data/people.json', JSON.stringify(db, null, 2) + '\n')
