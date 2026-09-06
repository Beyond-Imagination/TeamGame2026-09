// 알아보기 어려운 인물의 대체 사진 후보를 모아 검수용 페이지(public/_cand.html)를 만든다.
import { writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

const UA = 'BeyondImaginationCampQuiz/1.0 (offline team event quiz; jayden.bin@kakaocorp.com)'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function api(params) {
  const url = `https://commons.wikimedia.org/w/api.php?${new URLSearchParams(params)}`
  for (let i = 0; i < 5; i++) {
    await sleep(i === 0 ? 600 : 1500 * 2 ** i)
    const r = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } })
    if (r.ok) return r.json()
    if (r.status !== 429) throw new Error(String(r.status))
  }
  throw new Error('429')
}

const QUERIES = JSON.parse(process.argv[2])
mkdirSync('public/_cand', { recursive: true })
const rows = []

for (const [label, query] of Object.entries(QUERIES)) {
  const d = await api({
    action: 'query', format: 'json', generator: 'search', gsrnamespace: '6',
    gsrsearch: query, gsrlimit: '8', prop: 'imageinfo', iiprop: 'url|extmetadata', iiurlwidth: '500',
  })
  const cands = Object.values(d.query?.pages ?? {})
    .map((p) => ({ title: p.title, info: p.imageinfo?.[0] }))
    .filter((x) => x.info?.thumburl && /\.(jpe?g|png)$/i.test(new URL(x.info.url).pathname))
    .slice(0, 6)
  const items = []
  for (const [i, c] of cands.entries()) {
    await sleep(250)
    const res = await fetch(c.info.thumburl, { headers: { 'User-Agent': UA } })
    if (!res.ok) continue
    const file = `${label}-${i}.jpg`
    writeFileSync(join('public/_cand', file), Buffer.from(await res.arrayBuffer()))
    const meta = c.info.extmetadata ?? {}
    const strip = (h) => (h ? String(h).replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim() : '')
    items.push({ file, title: c.title, url: c.info.url, artist: strip(meta.Artist?.value), license: strip(meta.LicenseShortName?.value) })
  }
  rows.push({ label, items })
  console.log(`${label}: ${items.length}개`)
}

writeFileSync('public/_cand.json', JSON.stringify(rows, null, 2))
writeFileSync('public/_cand.html', `<!doctype html><meta charset="utf-8">
<body style="background:#111;color:#fff;font-family:sans-serif;margin:14px">
${rows.map((r) => `<h3 style="margin:10px 0 6px">${r.label}</h3><div style="display:flex;gap:8px;flex-wrap:wrap">
${r.items.map((it, i) => `<div style="width:180px"><img src="./_cand/${it.file}" style="width:180px;height:220px;object-fit:cover;border-radius:6px"><div style="font-size:11px;line-height:1.3;margin-top:3px">${i}. ${it.title.replace('File:', '')}</div></div>`).join('')}
</div>`).join('')}
</body>`)
console.log('검수 페이지: /_cand.html')
