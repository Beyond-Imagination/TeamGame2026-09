// id 충돌로 사진과 이름이 어긋난 것을 고친다.
// 각 항목의 source URL 에서 사진을 다시 받고, id/파일명을 유일하게 재부여한다.
import { readFileSync, writeFileSync, rmSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

const UA = 'BeyondImaginationCampQuiz/1.0 (offline team event quiz; jayden.bin@kakaocorp.com)'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const DIR = 'public/people'

const db = JSON.parse(readFileSync('data/people.json', 'utf8'))

rmSync(DIR, { recursive: true, force: true })
mkdirSync(DIR, { recursive: true })

const out = []
const failed = []

for (const [i, p] of db.people.entries()) {
  const id = `p${String(i + 1).padStart(3, '0')}`
  const clean = p.source.split('?')[0]
  const ext = (clean.match(/\.(jpe?g|png)$/i)?.[1] ?? 'jpg').toLowerCase()
  const file = `${id}.${ext === 'jpeg' ? 'jpg' : ext}`
  await sleep(220)
  let ok = false
  for (let t = 0; t < 3 && !ok; t++) {
    try {
      const res = await fetch(clean, { headers: { 'User-Agent': UA } })
      if (res.ok) {
        writeFileSync(join(DIR, file), Buffer.from(await res.arrayBuffer()))
        ok = true
      } else if (res.status === 429) {
        await sleep(2000 * (t + 1))
      } else break
    } catch {
      await sleep(1000)
    }
  }
  if (!ok) { failed.push(p.name); continue }
  out.push({ ...p, id, file })
  if ((i + 1) % 20 === 0) console.log(`  ${i + 1}/${db.people.length}`)
}

const kr = out.filter((p) => p.origin === '국내').length
writeFileSync(
  'data/people.json',
  JSON.stringify({
    설명: db.설명,
    통계: { 전체: out.length, 국내: kr, 해외: out.length - kr, 국내비율: `${Math.round((kr / out.length) * 100)}%` },
    people: out,
  }, null, 2) + '\n',
)
console.log(`복구 완료: ${out.length}명` + (failed.length ? ` / 실패: ${failed.join(', ')}` : ''))
