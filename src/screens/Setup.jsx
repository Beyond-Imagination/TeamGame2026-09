import { useEffect, useState } from 'react'
import { useGame } from '../lib/store.jsx'
import TeamPanel from '../ui/TeamPanel.jsx'

const splitNames = (raw) =>
  raw.split(/[\n,;/·]|\s{1,}/).map((s) => s.trim()).filter(Boolean)

export default function Setup() {
  const { state, dispatch } = useGame()
  const t = state.teams
  const [aLeader, setALeader] = useState(t?.A.leader ?? '')
  const [bLeader, setBLeader] = useState(t?.B.leader ?? '')
  const [pool, setPool] = useState(t ? [...t.A.members.slice(1), ...t.B.members.slice(1)].join(', ') : '')
  const [err, setErr] = useState('')

  // 전체 초기화나 되돌리기로 팀 구성이 바뀌면 입력칸도 같이 맞춘다.
  // (안 그러면 초기화했는데 이름이 그대로 남아 초기화가 안 된 것처럼 보인다)
  useEffect(() => {
    setALeader(t?.A.leader ?? '')
    setBLeader(t?.B.leader ?? '')
    setPool(t ? [...t.A.members.slice(1), ...t.B.members.slice(1)].join(', ') : '')
    setErr('')
  }, [t])

  const names = splitNames(pool)

  const assign = () => {
    const a = aLeader.trim()
    const b = bLeader.trim()
    if (!a || !b) return setErr('두 팀의 팀장 이름을 모두 입력해 주세요.')
    if (names.length !== 4)
      return setErr(`팀장을 뺀 나머지 4명의 이름이 필요합니다. (지금 ${names.length}명 인식됨)`)
    const all = [a, b, ...names]
    const dup = all.filter((n, i) => all.indexOf(n) !== i)
    if (dup.length) return setErr(`이름이 겹칩니다: ${[...new Set(dup)].join(', ')} — 구분되게 적어 주세요.`)
    setErr('')
    dispatch({ type: 'setupTeams', aLeader: a, bLeader: b, pool: names })
  }

  const played =
    state.g1.turns.length > 0 || state.g2.turns.length > 0 ||
    state.g4.turns.length > 0 || state.g3.matches.some((m) => m.winner)

  return (
    <div className="wrap">
      <div className="page-head center-col">
        <div className="eyebrow">Beyond_Imagination · 2026년 9월 여름캠핑</div>
        <h1>단체전 팀 나누기</h1>
        <p className="lead">
          팀장 두 명을 직접 입력하고, 남은 4명은 한 번에 붙여 넣으면 2명씩 랜덤으로 배정됩니다.
          <br />팀 이름은 팀장 이름을 그대로 씁니다.
        </p>
      </div>

      <div className="grid2">
        <div className="card">
          <h2>이름 입력</h2>
          <div className="grid2" style={{ gap: 14 }}>
            <div className="t-A field">
              <label>A팀 팀장</label>
              <input value={aLeader} onChange={(e) => setALeader(e.target.value)} placeholder="팀장 이름" />
              <span className="hint">팀 이름 → {aLeader.trim() ? `${aLeader.trim()}팀` : '—'}</span>
            </div>
            <div className="t-B field">
              <label>B팀 팀장</label>
              <input value={bLeader} onChange={(e) => setBLeader(e.target.value)} placeholder="팀장 이름" />
              <span className="hint">팀 이름 → {bLeader.trim() ? `${bLeader.trim()}팀` : '—'}</span>
            </div>
          </div>

          <div className="field">
            <label>나머지 4명 (쉼표 · 띄어쓰기 · 줄바꿈 모두 가능)</label>
            <textarea
              value={pool}
              onChange={(e) => setPool(e.target.value)}
              placeholder="김철수, 이영희, 박민수, 최지우"
            />
            <span className="hint">
              현재 {names.length}명 인식됨 {names.length ? `(${names.join(' · ')})` : ''} · 4명이 필요합니다.
            </span>
          </div>

          {err && <div className="error">{err}</div>}

          <div className="row">
            <button className="btn primary lg" onClick={assign}>{t ? '다시 배정하기' : '랜덤 배정하기'}</button>
            {t && (
              <button className="btn" onClick={() => dispatch({ type: 'reshuffleTeams' })}>
                팀장 빼고 다시 섞기
              </button>
            )}
          </div>

          {played && (
            <p className="hint" style={{ marginTop: 14 }}>
              ⚠️ 이미 진행된 게임 기록이 있습니다. 팀을 다시 배정하면 기록과 이름이 어긋날 수 있으니,
              처음부터 다시 하려면 상단의 <b>전체 초기화</b>를 이용하세요.
            </p>
          )}
        </div>

        <div>
          {t ? (
            <>
              <div className="grid2" style={{ gap: 14 }}>
                <TeamPanel team={t.A} />
                <TeamPanel team={t.B} />
              </div>
              <div className="spacer" />
              <div className="row center">
                <button className="btn primary lg" onClick={() => dispatch({ type: 'go', screen: 'home' })}>
                  이 조합으로 시작하기 →
                </button>
              </div>
            </>
          ) : (
            <div className="card" style={{ display: 'grid', placeItems: 'center', minHeight: 320 }}>
              <p className="lead">왼쪽에 이름을 넣고 배정하면<br />여기에 팀 구성이 표시됩니다.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
