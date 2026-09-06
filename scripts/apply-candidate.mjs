// candidates.mjs 로 뽑은 후보 중 고른 것을 data/people.json 에 적용한다.
// 사용: node scripts/apply-candidate.mjs '{"류현진":["ryu",4],"세종":["sejong",2]}'
import { readFileSync, writeFileSync, copyFileSync, unlinkSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const picks = JSON.parse(process.argv[2])
const cands = JSON.parse(readFileSync('public/_cand.json', 'utf8'))
const db = JSON.parse(readFileSync('data/people.json', 'utf8'))

const nextId = () => {
  const max = db.people.reduce((m, p) => Math.max(m, Number(p.id.slice(1)) || 0), 0)
  return `p${String(max + 1).padStart(2, '0')}`
}

for (const [name, [label, idx, origin, category]] of Object.entries(picks)) {
  const row = cands.find((r) => r.label === label)
  const item = row?.items[idx]
  let entry = db.people.find((p) => p.name === name)
  if (!entry && item) {
    // 목록에 없던 인물이면 새로 추가한다
    entry = { id: nextId(), name, origin: origin ?? '국내', category: category ?? '위인', file: '', source: '', artist: '', license: '' }
    db.people.push(entry)
  }
  if (!entry || !item) { console.log(`✗ ${name}: 대상 또는 후보 없음`); continue }
  const file = `${entry.id}.jpg`
  if (entry.file && entry.file !== file && existsSync(join('public/people', entry.file))) unlinkSync(join('public/people', entry.file))
  copyFileSync(join('public/_cand', item.file), join('public/people', file))
  entry.file = file
  entry.source = item.url
  entry.artist = item.artist
  entry.license = item.license
  console.log(`✓ ${name} → ${item.title}`)
}
writeFileSync('data/people.json', JSON.stringify(db, null, 2) + '\n')
