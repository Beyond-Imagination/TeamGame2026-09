import { useEffect, useRef, useState } from 'react'
import {
  useGame, teamTurns, g1Score, nextRound, explainerCandidates,
  remainingOf, elapsedOf, SPEED_DURATION_MS, G1_ROUNDS, TEAM_IDS,
} from '../lib/store.jsx'
import TeamPanel from '../ui/TeamPanel.jsx'
import RoundDuel from '../ui/RoundDuel.jsx'
import Intro from '../ui/Intro.jsx'
import { useConfirm } from '../ui/Confirm.jsx'

export const g1Rules = [
  '팀에서 설명자 1명, 맞히는 사람 2명으로 나눕니다. 1라운드 설명자는 팀장이고, 2·3라운드는 아직 설명을 안 해 본 사람 중에서 뽑습니다.',
  '화면에 제시어가 하나씩 나옵니다. 설명자는 제시어에 들어간 단어·영어·초성·손동작 없이 말로만 설명합니다.',
  '맞히는 두 사람은 정답을 외치고, 진행자가 맞았다 / 패스 버튼을 눌러 넘깁니다. 패스한 제시어는 다시 나오지 않습니다.',
  '제한 시간은 100초. 시간이 끝나면 진행자가 결과 보기를 눌러 그 라운드 점수를 공개합니다.',
  '한 라운드는 두 팀이 번갈아 진행하고, 그 라운드에서 더 많이 맞힌 팀이 1점을 얻습니다. (같으면 두 팀 모두 0점)',
  '3라운드 중 2점을 먼저 얻은 팀이 이 게임의 승자입니다.',
]

export function SpeedIntro() {
  const { dispatch } = useGame()
  return (
    <Intro
      no="01" title="스피드 퀴즈" tagline="100초, 설명은 말로만. 팀의 호흡이 곧 점수입니다."
      rules={g1Rules}
      onBack={() => dispatch({ type: 'go', screen: 'home' })}
      onStart={() => dispatch({ type: 'go', screen: 'g1-board' })}
    />
  )
}

/* ---------------- 진행판 ---------------- */
export function SpeedBoard() {
  const { state, dispatch } = useGame()
  const ask = useConfirm()
  const act = state.g1.active

  return (
    <div className="wrap wide">
      <div className="page-head center-col">
        <div className="eyebrow">GAME 01</div>
        <h1>스피드 퀴즈 진행판</h1>
        <p className="lead">
          진행할 팀의 라운드 <b>시작</b> 버튼을 누르세요. 같은 라운드를 두 팀이 번갈아 진행하고,
          더 많이 맞힌 팀이 1점 · <b>2점 선취</b>로 승부가 갈립니다.
        </p>
      </div>

      <RoundDuel game="g1" unit="개" />

      {act && (
        <div className="resume-bar">
          <span>
            진행 중: {state.teams[act.team].name} {act.round}라운드
            {act.explainer ? ` · 설명자 ${act.explainer}` : ' · 설명자 미정'}
            {act.word ? ` · 맞힌 개수 ${act.correct.length}` : ''}
          </span>
          <button
            className="btn primary"
            onClick={() => dispatch({ type: 'go', screen: act.word ? 'g1-play' : 'g1-pick' })}
          >
            이어서 진행하기
          </button>
          <button
            className="btn ghost tiny"
            onClick={async () => {
              const ok = await ask({ message: '진행 중인 라운드를 기록 없이 취소할까요?', confirmLabel: '취소하기', danger: true })
              if (ok) dispatch({ type: 'g1Discard' })
            }}
          >
            취소
          </button>
        </div>
      )}

      <div className="grid2">
        {TEAM_IDS.map((id) => {
          const team = state.teams[id]
          const turns = teamTurns(state.g1.turns, id)
          const nr = nextRound(state, id)
          const usedExplainers = new Set(turns.map((t) => t.explainer))
          return (
            <TeamPanel
              key={id}
              team={team}
              badge={<span className="chip">{turns.length}/{G1_ROUNDS} 라운드 완료</span>}
              extra={(m) => (usedExplainers.has(m) ? <span className="chip done">설명 완료</span> : null)}
            >
              <div className="spacer" />
              {Array.from({ length: G1_ROUNDS }, (_, i) => i + 1).map((round) => {
                const done = turns.find((t) => t.round === round)
                const isNext = nr === round
                return (
                  <div className={`round-row ${done ? 'done' : ''}`} key={round}>
                    <div className="round-no">R{round}</div>
                    <div className="round-main">
                      {done ? (
                        <>
                          <div className="round-name">{done.explainer}</div>
                          <div className="round-sub">패스 {done.pass.length}개</div>
                        </>
                      ) : (
                        <>
                          <div className="round-name" style={{ color: isNext ? undefined : 'var(--muted)' }}>
                            {isNext ? '진행 대기' : '이전 라운드 먼저'}
                          </div>
                          <div className="round-sub">
                            {round === 1 ? `설명자: ${team.leader} (팀장)` : '설명자 랜덤 추첨'}
                          </div>
                        </>
                      )}
                    </div>
                    {done ? (
                      <div className="row" style={{ gap: 8 }}>
                        <span className="round-score">{done.correct.length}</span>
                        <button
                          className="btn ghost tiny"
                          onClick={async () => {
                            const later = turns.filter((t) => t.round > round).length
                            const ok = await ask({
                              title: `${team.name} ${round}라운드 기록 삭제`,
                              message: later
                                ? `R${round} 기록을 지우고 다시 진행합니다.\n이후 라운드(${later}개) 기록도 함께 지워집니다.`
                                : `R${round} 기록을 지우고 다시 진행합니다.`,
                              confirmLabel: '기록 삭제',
                              danger: true,
                            })
                            if (ok) dispatch({ type: 'g1ResetTurn', team: id, round })
                          }}
                        >
                          기록 삭제
                        </button>
                      </div>
                    ) : (
                      <button
                        className={isNext ? 'btn primary' : 'btn'}
                        disabled={!isNext}
                        onClick={async () => {
                          if (act) {
                            const ok = await ask({
                              message: '다른 라운드가 진행 중입니다.\n새로 시작하면 그 진행 내용은 사라집니다.',
                              confirmLabel: '새로 시작',
                              danger: true,
                            })
                            if (!ok) return
                          }
                          dispatch({ type: 'g1Prepare', team: id })
                        }}
                      >
                        시작
                      </button>
                    )}
                  </div>
                )
              })}
              <div className="total-bar">
                <span className="round-sub">맞힌 개수 합계 <span style={{ opacity: 0.7 }}>(참고)</span></span>
                <b>{g1Score(state, id)}</b>
              </div>
            </TeamPanel>
          )
        })}
      </div>

      <div className="spacer" />
      <div className="row center">
        <button className="btn ghost" onClick={() => dispatch({ type: 'go', screen: 'home' })}>← 메인으로</button>
        <button className="btn ghost" onClick={() => dispatch({ type: 'go', screen: 'g1-intro' })}>게임 설명 보기</button>
        <button
          className="btn ghost"
          onClick={async () => {
            const ok = await ask({
              title: '스피드 퀴즈 기록 초기화',
              message: '이 게임의 모든 라운드 기록을 지웁니다.',
              confirmLabel: '기록 초기화',
              danger: true,
            })
            if (ok) dispatch({ type: 'g1ResetAll' })
          }}
        >
          이 게임 기록 초기화
        </button>
      </div>
    </div>
  )
}

/* ---------------- 설명자 뽑기 ---------------- */
export function SpeedPick() {
  const { state, dispatch } = useGame()
  const a = state.g1.active
  const [spinning, setSpinning] = useState(false)
  const [shown, setShown] = useState(null)
  const timers = useRef([])

  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  if (!a) return null
  const team = state.teams[a.team]
  const cands = explainerCandidates(state, a.team)
  const autoFixed = cands.length === 1

  const spin = () => {
    if (spinning) return
    setSpinning(true)
    const pick = cands[Math.floor(Math.random() * cands.length)]
    let i = 0
    const iv = setInterval(() => {
      setShown(cands[i++ % cands.length])
    }, 110)
    const to = setTimeout(() => {
      clearInterval(iv)
      setShown(pick)
      setSpinning(false)
      dispatch({ type: 'g1SetExplainer', name: pick })
    }, 1500)
    timers.current.push(to)
  }

  const decided = a.explainer

  return (
    <div className={`wrap t-${a.team}`}>
      <div className="page-head center-col">
        <div className="eyebrow">GAME 01 · {team.name} · {a.round}라운드</div>
        <h1>설명자 뽑기</h1>
        <p className="lead">
          {a.round === 1
            ? '1라운드 설명자는 팀장입니다.'
            : autoFixed
              ? '아직 설명자를 하지 않은 마지막 한 명입니다.'
              : `아직 설명을 안 해 본 ${cands.length}명 중에서 뽑습니다.`}
        </p>
      </div>

      <div className="card" style={{ maxWidth: 720, margin: '0 auto' }}>
        <div className={`roulette ${spinning ? 'spin' : ''}`}>
          {spinning ? <b>{shown}</b> : decided ? <b>{decided}</b> : <span className="placeholder">아래 버튼을 눌러 뽑아 주세요</span>}
        </div>
        <p className="hint" style={{ textAlign: 'center', margin: '10px 0 18px' }}>
          맞히는 사람: {team.members.filter((m) => m !== decided).join(' · ') || '—'}
        </p>

        <div className="row center">
          {!autoFixed && a.round !== 1 && (
            <button className="btn lg" onClick={spin} disabled={spinning}>
              {decided ? '다시 뽑기' : '랜덤으로 뽑기'}
            </button>
          )}
          <button
            className="btn primary lg"
            disabled={!decided || spinning}
            onClick={() => dispatch({ type: 'g1ToPlay' })}
          >
            준비 완료 →
          </button>
        </div>

        {!autoFixed && a.round !== 1 && (
          <>
            <div className="spacer" />
            <p className="hint" style={{ textAlign: 'center' }}>직접 지정하기</p>
            <div className="row center" style={{ marginTop: 8 }}>
              {cands.map((c) => (
                <button
                  key={c}
                  className={`btn tiny ${decided === c ? 'primary' : 'ghost'}`}
                  onClick={() => { setShown(c); dispatch({ type: 'g1SetExplainer', name: c }) }}
                >
                  {c}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="spacer" />
      <div className="row center">
        <button className="btn ghost" onClick={() => dispatch({ type: 'g1Discard' })}>← 진행판으로</button>
      </div>
    </div>
  )
}

/* ---------------- 플레이 ---------------- */
export function SpeedPlay() {
  const { state, dispatch } = useGame()
  const a = state.g1.active
  const [now, setNow] = useState(() => Date.now())

  const running = !!a?.runningSince
  const remain = a ? remainingOf(a, now) : 0

  useEffect(() => {
    if (!running) return
    const id = setInterval(() => setNow(Date.now()), 100)
    return () => clearInterval(id)
  }, [running])

  useEffect(() => {
    if (running && remain <= 0) dispatch({ type: 'g1End' })
  }, [running, remain, dispatch])

  useEffect(() => {
    const onKey = (e) => {
      if (!a) return
      if (e.repeat) return
      if (!a.runningSince) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); dispatch({ type: 'g1Run' }) }
        return
      }
      if (e.key === 'ArrowRight' || e.key === 'Enter') { e.preventDefault(); dispatch({ type: 'g1Judge', ok: true }) }
      else if (e.key === 'ArrowLeft' || e.key === ' ') { e.preventDefault(); dispatch({ type: 'g1Judge', ok: false }) }
      else if (e.key === 'p' || e.key === 'P') { dispatch({ type: 'g1Pause' }) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [a, dispatch])

  if (!a) return null
  const team = state.teams[a.team]
  const started = !!a.runningSince || a.elapsed > 0
  const sec = Math.ceil(remain / 1000)
  const pct = Math.max(0, (remain / SPEED_DURATION_MS) * 100)

  return (
    <div className={`play t-${a.team}`}>
      <div className="play-head">
        <div className="who">
          <b>{team.name} · {a.round}라운드</b>
          <span>설명 {a.explainer} → 정답 {team.members.filter((m) => m !== a.explainer).join(' · ')}</span>
        </div>
        <div className="timer">
          <div className="counters">
            <div className="counter ok"><i>맞았다</i><b>{a.correct.length}</b></div>
            <div className="counter pass"><i>패스</i><b>{a.pass.length}</b></div>
          </div>
          <div className={`t ${sec <= 10 ? 'danger' : sec <= 30 ? 'warn' : ''}`}>{sec}</div>
        </div>
      </div>
      <div className="progress"><i style={{ width: `${pct}%` }} /></div>

      <div className="stage">
        {running ? (
          <div key={a.word} className="word">{a.word}</div>
        ) : a.finished ? (
          <div className="center-col">
            <div className="word hidden">시간 종료</div>
            <p className="stage-note">진행자가 준비되면 결과를 공개하세요.</p>
            <div className="spacer" />
            <button className="btn primary xl" onClick={() => dispatch({ type: 'g1ShowResult' })}>
              결과 보기
            </button>
          </div>
        ) : (
          <div className="center-col">
            <div className="word hidden">● ● ●</div>
            <p className="stage-note">
              {started ? '일시정지 중입니다.' : '설명자와 맞히는 사람이 준비되면 시작을 눌러 주세요.'}
            </p>
            <div className="spacer" />
            <button className="btn primary xl" onClick={() => dispatch({ type: 'g1Run' })}>
              {started ? '이어서 진행' : '시작 (100초)'}
            </button>
            <div className="spacer" />
            <div className="row center">
              {started && (
                <>
                  <button
                    className="btn ghost tiny"
                    disabled={!(a.log ?? []).length}
                    onClick={() => dispatch({ type: 'g1UndoJudge' })}
                  >
                    직전 판정 취소
                  </button>
                  <button className="btn ghost tiny" onClick={() => dispatch({ type: 'g1AdjustTime', ms: 10000 })}>
                    시간 +10초
                  </button>
                </>
              )}
              {started ? (
                <button className="btn ghost" onClick={() => dispatch({ type: 'g1End' })}>
                  여기서 종료하기
                </button>
              ) : (
                <button className="btn ghost" onClick={() => dispatch({ type: 'g1Discard' })}>
                  ← 진행판으로 (기록 없음)
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {running && (
        <>
          <div className="play-foot">
            <button className="btn no xl" onClick={() => dispatch({ type: 'g1Judge', ok: false })}>
              패스 <span className="kbd">←</span>
            </button>
            <button className="btn ghost" onClick={() => dispatch({ type: 'g1Pause' })}>
              일시정지 <span className="kbd">P</span>
            </button>
            <button className="btn ok xl" onClick={() => dispatch({ type: 'g1Judge', ok: true })}>
              맞았다 <span className="kbd">→</span>
            </button>
          </div>
          <div className="row center" style={{ paddingBottom: 22 }}>
            <button
              className="btn ghost tiny"
              disabled={!(a.log ?? []).length}
              onClick={() => dispatch({ type: 'g1UndoJudge' })}
            >
              직전 판정 취소
            </button>
            <button className="btn ghost tiny" onClick={() => dispatch({ type: 'g1AdjustTime', ms: 10000 })}>
              시간 +10초
            </button>
            <button className="btn ghost tiny" onClick={() => dispatch({ type: 'g1AdjustTime', ms: -10000 })}>
              시간 −10초
            </button>
          </div>
        </>
      )}
    </div>
  )
}

/* ---------------- 결과 ---------------- */
export function SpeedResult() {
  const { state, dispatch } = useGame()
  const ask = useConfirm()
  const a = state.g1.active
  if (!a) return null
  const team = state.teams[a.team]
  const usedSec = Math.min(100, Math.round(elapsedOf(a) / 1000))

  return (
    <div className={`wrap t-${a.team}`}>
      <div className="page-head center-col">
        <div className="eyebrow">GAME 01 · {team.name} · {a.round}라운드 결과</div>
        <h1>{a.explainer} 설명자</h1>
      </div>

      <div className="card center-col">
        <span className="round-sub">맞힌 개수</span>
        <div className="big-score">{a.correct.length}</div>
        <div className="row center">
          <span className="chip">패스 {a.pass.length}개</span>
          <span className="chip">진행 시간 {usedSec}초</span>
          <span className="chip">시도 {a.correct.length + a.pass.length}개</span>
        </div>
      </div>

      <div className="spacer" />
      <div className="grid2">
        <div className="card">
          <h2>맞힌 제시어</h2>
          {a.correct.length ? (
            <div className="word-cloud ok">{a.correct.map((w, i) => <span key={w + i}>{w}</span>)}</div>
          ) : <p className="hint">없습니다.</p>}
        </div>
        <div className="card">
          <h2>패스한 제시어</h2>
          {a.pass.length ? (
            <div className="word-cloud">{a.pass.map((w, i) => <span key={w + i}>{w}</span>)}</div>
          ) : <p className="hint">없습니다.</p>}
        </div>
      </div>

      <div className="spacer" />
      <div className="row center">
        <button
          className="btn ghost"
          onClick={async () => {
            const ok = await ask({
              message: '이 라운드 결과를 저장하지 않고 진행판으로 돌아갈까요?',
              confirmLabel: '기록하지 않고 나가기',
              danger: true,
            })
            if (ok) dispatch({ type: 'g1Discard' })
          }}
        >
          기록하지 않고 나가기
        </button>
        <button className="btn primary lg" onClick={() => dispatch({ type: 'g1Commit' })}>결과 기록하기 →</button>
      </div>
    </div>
  )
}
