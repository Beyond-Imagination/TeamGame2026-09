import { useGame, roundDuels, roundWins, roundGameChampion, ROUND_WIN_TARGET } from '../lib/store.jsx'

/**
 * 라운드 승점 현황 (스피드 퀴즈 · 순발력 퀴즈 공용)
 * 같은 라운드를 두 팀이 번갈아 진행하고, 더 많이 맞힌 팀이 1점. 2점 선취 시 게임 승리.
 */
export default function RoundDuel({ game, unit }) {
  const { state } = useGame()
  const duels = roundDuels(state, game)
  const winsA = roundWins(state, game, 'A')
  const winsB = roundWins(state, game, 'B')
  const champ = roundGameChampion(state, game)

  return (
    <div className="card duel">
      <div className="duel-head">
        <h2 style={{ margin: 0 }}>라운드 승점</h2>
        <div className="duel-tally">
          <span className="t-A">{state.teams.A.name} <b>{winsA}</b></span>
          <i>:</i>
          <span className="t-B"><b>{winsB}</b> {state.teams.B.name}</span>
        </div>
        <span className={`chip ${champ ? 'done' : ''}`}>
          {champ ? `${state.teams[champ].name} 승리 확정` : `${ROUND_WIN_TARGET}점 선취 시 승리`}
        </span>
      </div>

      <div className="duel-rows">
        {duels.map((d) => (
          <div className={`duel-row ${d.done ? 'done' : ''}`} key={d.round}>
            <span className="round-no">R{d.round}</span>
            <span className={`side t-A ${d.winner === 'A' ? 'win' : ''}`}>
              {d.a === null ? '—' : `${d.a}${unit}`}
            </span>
            <span className="mid">
              {d.done ? (d.winner ? `${state.teams[d.winner].name} +1점` : '동점 · 무득점') : '진행 전'}
            </span>
            <span className={`side t-B ${d.winner === 'B' ? 'win' : ''}`}>
              {d.b === null ? '—' : `${d.b}${unit}`}
            </span>
          </div>
        ))}
      </div>
      <p className="hint" style={{ marginTop: 12 }}>
        한 라운드는 두 팀이 모두 진행해야 승점이 계산됩니다. 같은 개수면 두 팀 모두 0점입니다.
      </p>
    </div>
  )
}
