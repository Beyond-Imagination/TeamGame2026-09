import { useGame, teamTurns, g2Score, nextTelepathyRound, TEAM_IDS } from '../lib/store.jsx'
import { TELEPATHY_QUESTIONS } from '../lib/data.js'
import { splitCommon } from '../lib/utils.js'
import TeamPanel from '../ui/TeamPanel.jsx'
import Intro from '../ui/Intro.jsx'
import { useConfirm } from '../ui/Confirm.jsx'

export function TelepathyIntro() {
  const { dispatch } = useGame()
  return (
    <Intro
      no="02" title="이심전심 퀴즈" tagline="말은 한마디도 못 합니다. 오직 감으로 서로를 맞혀 보세요."
      rules={[
        '한 팀에서 랜덤으로 2명을 뽑습니다. 나머지 한 명은 옆에서 지켜만 봅니다.',
        '화면에 딱 반으로 갈릴 만한 양자택일 문제가 나옵니다. (예: 탕수육 부먹 vs 찍먹)',
        '두 사람은 눈짓·입모양·손짓 없이, 진행자의 신호에 맞춰 동시에 답을 외칩니다.',
        '답이 같으면 통과(일치), 다르면 불일치. 진행자가 버튼으로 판정합니다.',
        '한 세션이 끝나면 결과 보기를 눌러 그 팀의 일치 횟수를 공개합니다.',
      ]}
      onBack={() => dispatch({ type: 'go', screen: 'home' })}
      onStart={() => dispatch({ type: 'go', screen: 'g2-board' })}
    />
  )
}

export function TelepathyBoard() {
  const { state, dispatch } = useGame()
  const ask = useConfirm()
  const act = state.g2.active

  return (
    <div className="wrap wide">
      <div className="page-head center-col">
        <div className="eyebrow">GAME 02</div>
        <h1>이심전심 진행판</h1>
        <p className="lead">진행할 팀의 <b>세션 시작</b>을 누르세요. 세션 안에서 문제를 원하는 만큼 진행할 수 있습니다.</p>
      </div>

      {act && (
        <div className="resume-bar">
          <span>
            진행 중: {state.teams[act.team].name} {act.round}번째 세션 · 문제 {act.items.length}개 진행
          </span>
          <button className="btn primary" onClick={() => dispatch({ type: 'go', screen: 'g2-play' })}>
            이어서 진행하기
          </button>
          <button
            className="btn ghost tiny"
            onClick={async () => {
              const ok = await ask({ message: '진행 중인 세션을 기록 없이 취소할까요?', confirmLabel: '취소하기', danger: true })
              if (ok) dispatch({ type: 'g2Discard' })
            }}
          >
            취소
          </button>
        </div>
      )}

      <div className="grid2">
        {TEAM_IDS.map((id) => {
          const team = state.teams[id]
          const turns = teamTurns(state.g2.turns, id)
          return (
            <TeamPanel key={id} team={team} badge={<span className="chip">세션 {turns.length}회 진행</span>}>
              <div className="spacer" />
              {turns.length === 0 && <p className="hint">아직 진행한 세션이 없습니다.</p>}
              {turns.map((t) => (
                <div className="round-row done" key={t.round}>
                  <div className="round-no">R{t.round}</div>
                  <div className="round-main">
                    <div className="round-name">일치 {t.items.filter((i) => i.matched).length}회</div>
                    <div className="round-sub">문제 {t.items.length}개 진행</div>
                  </div>
                  <div className="row" style={{ gap: 8 }}>
                    <span className="round-score">{t.items.filter((i) => i.matched).length}</span>
                    <button
                      className="btn ghost tiny"
                      onClick={async () => {
                        const later = turns.filter((x) => x.round > t.round).length
                        const ok = await ask({
                          title: `${team.name} ${t.round}번째 세션 기록 삭제`,
                          message: later
                            ? `R${t.round} 기록을 지웁니다.\n이후 세션(${later}개)도 함께 지워집니다.`
                            : `R${t.round} 기록을 지웁니다.`,
                          confirmLabel: '기록 삭제',
                          danger: true,
                        })
                        if (ok) dispatch({ type: 'g2ResetTurn', team: id, round: t.round })
                      }}
                    >
                      기록 삭제
                    </button>
                  </div>
                </div>
              ))}
              <div className="spacer" />
              <button
                className="btn primary"
                onClick={async () => {
                  if (act) {
                    const ok = await ask({
                      message: '다른 세션이 진행 중입니다.\n새로 시작하면 그 진행 내용은 사라집니다.',
                      confirmLabel: '새로 시작',
                      danger: true,
                    })
                    if (!ok) return
                  }
                  dispatch({ type: 'g2Start', team: id })
                }}
              >
                {turns.length ? `${nextTelepathyRound(state, id)}번째 세션 시작` : '세션 시작'}
              </button>
              <div className="total-bar">
                <span className="round-sub">일치 합계</span>
                <b>{g2Score(state, id)}</b>
              </div>
            </TeamPanel>
          )
        })}
      </div>

      <div className="spacer" />
      <div className="row center">
        <button className="btn ghost" onClick={() => dispatch({ type: 'go', screen: 'home' })}>← 메인으로</button>
        <button className="btn ghost" onClick={() => dispatch({ type: 'go', screen: 'g2-intro' })}>게임 설명 보기</button>
        <button
          className="btn ghost"
          onClick={async () => {
            const ok = await ask({
              title: '이심전심 기록 초기화',
              message: '이 게임의 모든 세션 기록을 지웁니다.',
              confirmLabel: '기록 초기화',
              danger: true,
            })
            if (ok) dispatch({ type: 'g2ResetAll' })
          }}
        >
          이 게임 기록 초기화
        </button>
      </div>
    </div>
  )
}

export function TelepathyPlay() {
  const { state, dispatch } = useGame()
  const a = state.g2.active
  if (!a) return null
  const team = state.teams[a.team]
  const q = a.q === null || a.q === undefined ? null : TELEPATHY_QUESTIONS[a.q]
  // 공통된 단어는 위/아래로 빼고, 갈리는 부분만 좌우에 크게 보여 준다.
  const parts = q ? splitCommon(q.a, q.b) : null
  const bench = a.pair ? team.members.find((m) => !a.pair.includes(m)) : null

  return (
    <div className={`wrap t-${a.team}`}>
      <div className="page-head center-col">
        <div className="eyebrow">GAME 02 · {team.name} · {a.round}번째 세션</div>
        <h1>{a.pair ? '동시에 답해 주세요' : '두 사람을 뽑습니다'}</h1>
        <div className="row center" style={{ gap: 8 }}>
          <span className="chip">진행한 문제 {a.items.length}개</span>
          {a.items.length > 0 && (
            <span className="chip">
              {a.items.map((i, idx) => (
                <span key={idx} style={{ color: i.matched ? 'var(--ok)' : 'var(--no)', marginRight: 3 }}>
                  {i.matched ? '○' : '✕'}
                </span>
              ))}
            </span>
          )}
        </div>
      </div>

      {a.pair ? (
        <>
          <div className="pair">
            <div className="p">{a.pair[0]}</div>
            <div className="amp">&amp;</div>
            <div className="p">{a.pair[1]}</div>
          </div>
          {bench && <p className="hint" style={{ textAlign: 'center', marginTop: 12 }}>{bench} 님은 이번 문제에서 대기합니다.</p>}

          {parts?.prefix && <div className="vs-lead">{parts.prefix}</div>}
          <div className="vs-card">
            <div className="opt">{parts?.a}</div>
            <div className="vs">VS</div>
            <div className="opt">{parts?.b}</div>
          </div>
          {parts?.suffix && <div className="vs-lead tail">{parts.suffix}</div>}

          <div className="row center">
            <button className="btn no xl" onClick={() => dispatch({ type: 'g2Judge', matched: false })}>불일치 ✕</button>
            <button className="btn ok xl" onClick={() => dispatch({ type: 'g2Judge', matched: true })}>일치 ○</button>
          </div>
          <div className="spacer" />
          <div className="row center">
            <button className="btn ghost tiny" onClick={() => dispatch({ type: 'g2Repick' })}>사람 다시 뽑기</button>
            <button className="btn ghost tiny" onClick={() => dispatch({ type: 'g2Requestion' })}>문제 바꾸기</button>
          </div>
        </>
      ) : (
        <div className="card center-col" style={{ padding: '60px 24px' }}>
          <p className="lead">
            {a.items.length === 0
              ? '사람 뽑기를 누르면 이 팀에서 랜덤으로 2명과 문제가 함께 정해집니다.'
              : '다음 문제로 넘어갈 준비가 되면 눌러 주세요.'}
          </p>
          <div className="spacer" />
          <button className="btn primary xl" onClick={() => dispatch({ type: 'g2Draw' })}>
            {a.items.length === 0 ? '사람 뽑기' : '다음 사람 뽑기'}
          </button>
        </div>
      )}

      <div className="spacer" />
      <div className="row center">
        <button className="btn ghost" onClick={() => dispatch({ type: 'g2Discard' })}>← 진행판으로 (기록 없음)</button>
        {a.items.length > 0 && (
          <>
            <button className="btn ghost" onClick={() => dispatch({ type: 'g2Undo' })}>직전 판정 취소</button>
            <button className="btn primary" onClick={() => dispatch({ type: 'g2ShowResult' })}>결과 보기</button>
          </>
        )}
      </div>
    </div>
  )
}

function qLabel(qi) {
  const q = TELEPATHY_QUESTIONS[qi]
  if (!q) return ''
  const { prefix, suffix, a, b } = splitCommon(q.a, q.b)
  return `${prefix ? prefix + ' ' : ''}${a} vs ${b}${suffix ? ' ' + suffix : ''}`
}

export function TelepathyResult() {
  const { state, dispatch } = useGame()
  const ask = useConfirm()
  const a = state.g2.active
  if (!a) return null
  const team = state.teams[a.team]
  const hit = a.items.filter((i) => i.matched).length

  return (
    <div className={`wrap t-${a.team}`}>
      <div className="page-head center-col">
        <div className="eyebrow">GAME 02 · {team.name} · {a.round}번째 세션 결과</div>
        <h1>이심전심 결과</h1>
      </div>

      <div className="card center-col">
        <span className="round-sub">일치 횟수</span>
        <div className="big-score">{hit}</div>
        <div className="row center">
          <span className="chip">전체 {a.items.length}문제</span>
          <span className="chip">불일치 {a.items.length - hit}회</span>
        </div>
      </div>

      <div className="spacer" />
      <div className="card">
        <h2>문제별 기록</h2>
        <div className="history">
          {a.items.map((i, idx) => (
            <div className="h" key={idx}>
              <span className="chip">{idx + 1}</span>
              <span>{i.pair.join(' & ')}</span>
              <span style={{ color: 'var(--muted)' }}>{qLabel(i.q)}</span>
              <span className={`res ${i.matched ? 'y' : 'n'}`}>{i.matched ? '일치' : '불일치'}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="spacer" />
      <div className="row center">
        <button className="btn ghost" onClick={() => dispatch({ type: 'go', screen: 'g2-play' })}>← 세션 계속하기</button>
        <button
          className="btn ghost"
          onClick={async () => {
            const ok = await ask({
              message: '이 세션 결과를 저장하지 않고 나갈까요?',
              confirmLabel: '기록하지 않고 나가기',
              danger: true,
            })
            if (ok) dispatch({ type: 'g2Discard' })
          }}
        >
          기록하지 않고 나가기
        </button>
        <button className="btn primary lg" onClick={() => dispatch({ type: 'g2Commit' })}>결과 기록하기 →</button>
      </div>
    </div>
  )
}
