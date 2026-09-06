import { useGame, g3Score, TEAM_IDS } from '../lib/store.jsx'
import Intro from '../ui/Intro.jsx'
import { useConfirm } from '../ui/Confirm.jsx'

export function YangIntro() {
  const { dispatch } = useGame()
  return (
    <Intro
      no="03" title="양세찬 게임" tagline="내 이마에 붙은 제시어는 빨리, 상대의 제시어는 최대한 늦게."
      rules={[
        '두 팀에서 한 명씩 나와 1:1로 붙습니다. 1라운드는 두 팀장의 대결입니다.',
        '각자 자기 제시어는 모르고 상대의 제시어만 보이는 상태로 시작합니다.',
        '번갈아 질문을 던져 내 제시어를 추리하고, 상대의 질문에는 최대한 애매하게 대답합니다.',
        '자기 제시어를 먼저 정확히 말한 사람이 그 라운드의 승자입니다.',
        '진행자가 승자 버튼을 눌러 기록하고, 3라운드를 모두 마치면 더 많이 이긴 팀이 승리합니다.',
      ]}
      onBack={() => dispatch({ type: 'go', screen: 'home' })}
      onStart={() => dispatch({ type: 'go', screen: 'g3-board' })}
    />
  )
}

export function YangBoard() {
  const { state, dispatch } = useGame()
  const ask = useConfirm()
  const { matches } = state.g3
  const decided = matches.filter((m) => m.winner).length

  return (
    <div className="wrap">
      <div className="page-head center-col">
        <div className="eyebrow">GAME 03</div>
        <h1>양세찬 게임 대결표</h1>
        <p className="lead">
          제시어는 진행자가 직접 정합니다. 각 라운드의 승자 쪽을 누르면 기록되고, 다시 누르면 취소됩니다.
        </p>
      </div>

      {matches.length === 0 ? (
        <div className="card center-col" style={{ padding: '70px 24px' }}>
          <p className="lead">아직 대결 구도가 없습니다. 1라운드는 팀장전으로 자동 배치됩니다.</p>
          <div className="spacer" />
          <button className="btn primary xl" onClick={() => dispatch({ type: 'g3Generate' })}>대결 구도 뽑기</button>
        </div>
      ) : (
        <>
          {matches.map((m) => (
            <div className="match" key={m.round}>
              {TEAM_IDS.map((id, idx) => {
                const player = idx === 0 ? m.a : m.b
                const won = m.winner === id
                return (
                  <div key={id} className={`side t-${id} ${won ? 'win' : ''}`} style={idx === 1 ? { order: 3 } : undefined}>
                    <span className="tm">{state.teams[id].name}</span>
                    <span className="nm">{player}</span>
                    {won ? (
                      <span className="win-tag">WINNER</span>
                    ) : (
                      <button className="btn tiny" onClick={() => dispatch({ type: 'g3SetWinner', round: m.round, team: id })}>
                        이 팀 승리
                      </button>
                    )}
                    {won && (
                      <button className="btn ghost tiny" onClick={() => dispatch({ type: 'g3SetWinner', round: m.round, team: id })}>
                        취소
                      </button>
                    )}
                  </div>
                )
              })}
              <div className="mid" style={{ order: 2 }}>
                <div className="rn">ROUND {m.round}</div>
                <div className="vs">VS</div>
                {m.round === 1 && <div className="rn" style={{ marginTop: 6 }}>팀장전</div>}
              </div>
            </div>
          ))}

          <div className="grid2" style={{ marginTop: 18 }}>
            {TEAM_IDS.map((id) => (
              <div className={`card team-card t-${id}`} key={id}>
                <div className="total-bar" style={{ marginTop: 0, paddingTop: 0, borderTop: 'none' }}>
                  <span className="round-sub">{state.teams[id].name} 승수</span>
                  <b>{g3Score(state, id)}</b>
                </div>
              </div>
            ))}
          </div>

          <div className="spacer" />
          <div className="row center">
            <button className="btn ghost" onClick={() => dispatch({ type: 'g3Generate', keepDecided: true })}>
              미결정 라운드 다시 뽑기
            </button>
            <button
              className="btn ghost"
              onClick={async () => {
                const ok = await ask({
                  title: '승패 초기화',
                  message: '기록된 승패를 모두 지웁니다. 대결 구도는 그대로 남습니다.',
                  confirmLabel: '승패 초기화',
                  danger: true,
                })
                if (ok) dispatch({ type: 'g3ResetAll' })
              }}
            >
              승패 초기화
            </button>
            <button
              className="btn ghost"
              onClick={async () => {
                if (decided > 0) {
                  const ok = await ask({
                    message: '기록된 승패까지 지우고 대결 구도를 새로 뽑을까요?',
                    confirmLabel: '전체 다시 뽑기',
                    danger: true,
                  })
                  if (!ok) return
                }
                dispatch({ type: 'g3Generate' })
              }}
            >
              전체 다시 뽑기
            </button>
          </div>
        </>
      )}

      <div className="spacer" />
      <div className="row center">
        <button className="btn ghost" onClick={() => dispatch({ type: 'go', screen: 'home' })}>← 메인으로</button>
        <button className="btn ghost" onClick={() => dispatch({ type: 'go', screen: 'g3-intro' })}>게임 설명 보기</button>
      </div>
    </div>
  )
}
