import { useGame, overallSummary, TEAM_IDS } from '../lib/store.jsx'

export default function Final() {
  const { state, dispatch } = useGame()
  const { games, wins, champion } = overallSummary(state)
  const anyPlayed = games.some((g) => g.played)

  return (
    <div className="wrap">
      <div className="page-head center-col">
        <div className="eyebrow">Beyond_Imagination · 2026년 9월 여름캠핑 단체전</div>
        <h1>최종 결과</h1>
      </div>

      <div className="final-hero">
        {!anyPlayed ? (
          <p className="lead">아직 진행된 종목이 없습니다.</p>
        ) : champion ? (
          <>
            <div className="eyebrow">우승</div>
            <div className="champion">{state.teams[champion].name}</div>
            <p className="lead" style={{ marginTop: 10 }}>
              5종목 중 {wins[champion]}종목 승리 · {state.teams[champion].members.join(' · ')}
            </p>
          </>
        ) : (
          <>
            <div className="champion">무승부</div>
            <p className="lead" style={{ marginTop: 10 }}>
              {wins.A} : {wins.B} — 남은 종목을 진행하거나 즉석 연장전으로 가려 주세요.
            </p>
          </>
        )}
      </div>

      <div className="trophy-row">
        {TEAM_IDS.map((id, i) => (
          <div key={id} className={`trophy t-${id} ${champion === id ? 'champ' : ''}`} style={i === 1 ? { order: 3 } : undefined}>
            <div className="team-tag">TEAM {id}</div>
            <div className="nm">{state.teams[id].name}</div>
            <div className="wins">{wins[id]}종목 승리</div>
            <div className="mem">{state.teams[id].members.join(' · ')}</div>
          </div>
        ))}
        <div className="mid-vs" style={{ order: 2 }}>VS</div>
      </div>

      <div className="card">
        <h2>종목별 점수</h2>
        <table className="result-table">
          <thead>
            <tr>
              <th style={{ textAlign: 'left' }}>종목</th>
              <th>{state.teams.A.name}</th>
              <th>{state.teams.B.name}</th>
              <th>승</th>
            </tr>
          </thead>
          <tbody>
            {games.map((g) => (
              <tr key={g.key} className={g.played ? '' : 'pend'}>
                <td className="g">GAME {g.no} · {g.label}</td>
                <td className="a">
                  <b>{g.a}</b><span style={{ fontSize: 13, color: 'var(--muted)' }}> {g.unit}</span>
                  {g.detailA !== null && (
                    <div style={{ fontSize: 12, color: 'var(--muted)' }}>{g.detailA}{g.detailUnit}</div>
                  )}
                </td>
                <td className="b">
                  <b>{g.b}</b><span style={{ fontSize: 13, color: 'var(--muted)' }}> {g.unit}</span>
                  {g.detailB !== null && (
                    <div style={{ fontSize: 12, color: 'var(--muted)' }}>{g.detailB}{g.detailUnit}</div>
                  )}
                </td>
                <td>
                  {g.winner ? (
                    <span className="chip done">{state.teams[g.winner].name}</span>
                  ) : (
                    <span className="chip">{g.played ? '동점' : '미진행'}</span>
                  )}
                </td>
              </tr>
            ))}
            <tr>
              <td className="g"><b>종목 승수</b></td>
              <td className="a"><b>{wins.A}</b></td>
              <td className="b"><b>{wins.B}</b></td>
              <td>{champion ? <span className="chip done">{state.teams[champion].name} 우승</span> : <span className="chip">무승부</span>}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="spacer" />
      <div className="row center">
        <button className="btn ghost" onClick={() => dispatch({ type: 'go', screen: 'home' })}>← 메인으로</button>
      </div>
    </div>
  )
}
