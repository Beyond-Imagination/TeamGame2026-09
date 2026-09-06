import { useEffect, useState } from 'react'
import {
  useGame, teamTurns, g4Score, nextQuickRound, quickQuestion,
  G4_ROUNDS, G4_PER_ROUND, G4_PERSON_SEC, TEAM_IDS, DATA_STATS,
} from '../lib/store.jsx'
import TeamPanel from '../ui/TeamPanel.jsx'
import RoundDuel from '../ui/RoundDuel.jsx'
import Intro from '../ui/Intro.jsx'
import { useConfirm } from '../ui/Confirm.jsx'

export function QuickIntro() {
  const { dispatch } = useGame()
  return (
    <Intro
      no="04" title="랜덤 순발력 퀴즈" tagline="속담 이어 말하기와 인물 맞추기가 섞여서 나옵니다. 머뭇거리면 끝입니다."
      rules={[
        '진행자가 팀에서 한 명을 지목하고, 지목된 사람이 그 문제를 맞힙니다. 팀원끼리 돌아가며 지목됩니다.',
        '속담 이어 말하기: 진행자가 앞부분을 읽어 주면 뒷부분을 바로 이어서 말합니다. (예: "콩 심은 데 콩 나고" → "팥 심은 데 팥 난다")',
        `인물 맞추기: 화면에 사진이 뜨면 ${G4_PERSON_SEC}초 안에 그 인물의 이름을 말해야 합니다.`,
        `한 라운드에 ${G4_PER_ROUND}문제씩, 같은 라운드를 두 팀이 번갈아 진행합니다.`,
        '진행자가 맞췄다 / 틀렸다를 누르며 넘기고, 마지막에 결과 보기를 눌러 그 라운드 점수를 공개합니다.',
        `그 라운드에서 더 많이 맞힌 팀이 1점(같으면 두 팀 모두 0점), ${G4_ROUNDS}라운드 중 2점을 먼저 얻은 팀이 승자입니다.`,
      ]}
      onBack={() => dispatch({ type: 'go', screen: 'home' })}
      onStart={() => dispatch({ type: 'go', screen: 'g4-board' })}
    />
  )
}

export function QuickBoard() {
  const { state, dispatch } = useGame()
  const ask = useConfirm()
  const act = state.g4.active

  return (
    <div className="wrap wide">
      <div className="page-head center-col">
        <div className="eyebrow">GAME 04</div>
        <h1>랜덤 순발력 퀴즈 진행판</h1>
        <p className="lead">
          진행할 팀의 라운드 <b>시작</b>을 누르세요. 라운드당 {G4_PER_ROUND}문제이며,
          더 많이 맞힌 팀이 1점 · <b>2점 선취</b>로 승부가 갈립니다. (문제 풀 {DATA_STATS.quickTotal}개)
        </p>
      </div>

      <RoundDuel game="g4" unit="개" />

      {act && (
        <div className="resume-bar">
          <span>
            진행 중: {state.teams[act.team].name} {act.round}라운드 · {act.results.length}/{act.queue.length}문제 판정
          </span>
          <button className="btn primary" onClick={() => dispatch({ type: 'go', screen: 'g4-play' })}>
            이어서 진행하기
          </button>
          <button
            className="btn ghost tiny"
            onClick={async () => {
              const ok = await ask({ message: '진행 중인 라운드를 기록 없이 취소할까요?', confirmLabel: '취소하기', danger: true })
              if (ok) dispatch({ type: 'g4Discard' })
            }}
          >
            취소
          </button>
        </div>
      )}

      <div className="grid2">
        {TEAM_IDS.map((id) => {
          const team = state.teams[id]
          const turns = teamTurns(state.g4.turns, id)
          const nr = nextQuickRound(state, id)
          return (
            <TeamPanel key={id} team={team} badge={<span className="chip">{turns.length}/{G4_ROUNDS} 라운드 완료</span>}>
              <div className="spacer" />
              {Array.from({ length: G4_ROUNDS }, (_, i) => i + 1).map((round) => {
                const done = turns.find((t) => t.round === round)
                const isNext = nr === round
                return (
                  <div className={`round-row ${done ? 'done' : ''}`} key={round}>
                    <div className="round-no">R{round}</div>
                    <div className="round-main">
                      {done ? (
                        <>
                          <div className="round-name">{done.results.filter((r) => r.ok).length} / {done.results.length} 정답</div>
                          <div className="round-sub">
                            속담 {done.results.filter((r) => r.q.startsWith('pv')).length}개 · 인물{' '}
                            {done.results.filter((r) => r.q.startsWith('pp')).length}개
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="round-name" style={{ color: isNext ? undefined : 'var(--muted)' }}>
                            {isNext ? '진행 대기' : '이전 라운드 먼저'}
                          </div>
                          <div className="round-sub">{G4_PER_ROUND}문제 랜덤 출제</div>
                        </>
                      )}
                    </div>
                    {done ? (
                      <div className="row" style={{ gap: 8 }}>
                        <span className="round-score">{done.results.filter((r) => r.ok).length}</span>
                        <button
                          className="btn ghost tiny"
                          onClick={async () => {
                            const later = turns.filter((t) => t.round > round).length
                            const ok = await ask({
                              title: `${team.name} ${round}라운드 기록 삭제`,
                              message: later
                                ? `R${round} 기록을 지우고 다시 진행합니다.\n이후 라운드(${later}개)도 함께 지워집니다.`
                                : `R${round} 기록을 지우고 다시 진행합니다.`,
                              confirmLabel: '기록 삭제',
                              danger: true,
                            })
                            if (ok) dispatch({ type: 'g4ResetTurn', team: id, round })
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
                          dispatch({ type: 'g4Prepare', team: id })
                        }}
                      >
                        시작
                      </button>
                    )}
                  </div>
                )
              })}
              <div className="total-bar">
                <span className="round-sub">정답 합계 <span style={{ opacity: 0.7 }}>(참고)</span></span>
                <b>{g4Score(state, id)}</b>
              </div>
            </TeamPanel>
          )
        })}
      </div>

      <div className="spacer" />
      <div className="row center">
        <button className="btn ghost" onClick={() => dispatch({ type: 'go', screen: 'home' })}>← 메인으로</button>
        <button className="btn ghost" onClick={() => dispatch({ type: 'go', screen: 'g4-intro' })}>게임 설명 보기</button>
        <button
          className="btn ghost"
          onClick={async () => {
            const ok = await ask({
              title: '순발력 퀴즈 기록 초기화',
              message: '이 게임의 모든 라운드 기록을 지웁니다.',
              confirmLabel: '기록 초기화',
              danger: true,
            })
            if (ok) dispatch({ type: 'g4ResetAll' })
          }}
        >
          이 게임 기록 초기화
        </button>
      </div>
    </div>
  )
}

export function QuickPlay() {
  const { state, dispatch } = useGame()
  const ask = useConfirm()
  const a = state.g4.active
  const qid = a && a.idx < a.queue.length ? a.queue[a.idx] : null
  const [reveal, setReveal] = useState(false)
  const [left, setLeft] = useState(G4_PERSON_SEC)
  const [tick, setTick] = useState(0) // 카운트다운 재시작용

  const q = qid ? quickQuestion(qid) : null
  const isPerson = q?.kind === 'person'

  // 문제가 바뀌면 정답 숨기고 카운트다운 초기화
  useEffect(() => {
    setReveal(false)
    setLeft(G4_PERSON_SEC)
  }, [qid, tick])

  useEffect(() => {
    if (!isPerson) return
    if (left <= 0) return
    const id = setTimeout(() => setLeft((v) => v - 1), 1000)
    return () => clearTimeout(id)
  }, [isPerson, left, qid, tick])

  // 다음 문제 사진을 미리 받아 둔다 (로컬 파일이지만 디코딩 지연까지 줄인다)
  useEffect(() => {
    if (!a) return
    const nextId = a.queue[a.idx + 1]
    if (!nextId || !nextId.startsWith('pp')) return
    const img = new Image()
    img.src = `./people/${quickQuestion(nextId).file}`
  }, [a])

  useEffect(() => {
    const onKey = (e) => {
      if (!qid || e.repeat) return
      if (e.key === 'ArrowRight') { e.preventDefault(); dispatch({ type: 'g4Judge', ok: true }) }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); dispatch({ type: 'g4Judge', ok: false }) }
      else if (e.key === ' ') { e.preventDefault(); setReveal((v) => !v) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [qid, dispatch])

  if (!a) return null
  const team = state.teams[a.team]
  const finished = a.idx >= a.queue.length

  return (
    <div className={`wrap wide t-${a.team}`}>
      <div className="qhead">
        <div className="who">
          <b>{team.name} · {a.round}라운드</b>
          <span>{team.members.join(' · ')} 중에서 진행자가 지목</span>
        </div>
        <div className="row" style={{ gap: 10, marginLeft: 'auto' }}>
          <span className="chip">{Math.min(a.idx + 1, G4_PER_ROUND)} / {a.queue.length}</span>
          <span className="chip">
            {a.results.map((r, i) => (
              <span key={i} style={{ color: r.ok ? 'var(--ok)' : 'var(--no)', marginRight: 2 }}>
                {r.ok ? '○' : '✕'}
              </span>
            ))}
            {!a.results.length && '판정 기록 없음'}
          </span>
        </div>
      </div>
      <div className="progress"><i style={{ width: `${(a.idx / a.queue.length) * 100}%` }} /></div>

      {finished ? (
        <div className="card center-col" style={{ padding: '70px 24px', marginTop: 24 }}>
          <div className="eyebrow">{a.queue.length}문제 모두 진행 완료</div>
          <h1 style={{ margin: '10px 0 20px' }}>수고하셨습니다!</h1>
          <button className="btn primary xl" onClick={() => dispatch({ type: 'g4ShowResult' })}>결과 보기</button>
          <div className="spacer" />
          <button className="btn ghost tiny" onClick={() => dispatch({ type: 'g4Undo' })}>직전 판정 취소</button>
        </div>
      ) : (
        <>
          <div className="qstage">
            {q.kind === 'proverb' ? (
              <div className="proverb">
                <span className="ptype">속담 이어 말하기</span>
                <div className="phead">{q.head}</div>
                <div className={`ptail ${reveal ? 'on' : ''}`}>{reveal ? q.answer : '○ ○ ○ ○ ○'}</div>
              </div>
            ) : (
              <div className="person">
                <span className="ptype">인물 맞추기 · {G4_PERSON_SEC}초</span>
                <div className="photo-wrap">
                  {q.crop ? (
                    <div className="photo photo-frame">
                      <img
                        src={`./people/${q.file}`}
                        alt="인물 사진"
                        style={{
                          objectPosition: q.crop,
                          ...(q.zoom ? { transform: `scale(${q.zoom})`, transformOrigin: q.crop } : {}),
                        }}
                      />
                    </div>
                  ) : (
                    <img className="photo" src={`./people/${q.file}`} alt="인물 사진" />
                  )}
                  <div className={`count3 ${left <= 0 ? 'over' : ''}`}>{left > 0 ? left : '⏱'}</div>
                </div>
                <div className={`ptail ${reveal ? 'on' : ''}`}>{reveal ? q.answer : '누구일까요?'}</div>
              </div>
            )}
          </div>

          <div className="row center" style={{ marginTop: 8 }}>
            <button className="btn no lg" onClick={() => dispatch({ type: 'g4Judge', ok: false })}>틀렸다 ✕ <span className="kbd">←</span></button>
            <button className="btn lg" onClick={() => setReveal((v) => !v)}>{reveal ? '정답 숨기기' : '정답 보기'} <span className="kbd">Space</span></button>
            <button className="btn ok lg" onClick={() => dispatch({ type: 'g4Judge', ok: true })}>맞췄다 ○ <span className="kbd">→</span></button>
          </div>

          <div className="spacer" />
          <div className="row center">
            {isPerson && (
              <button className="btn ghost tiny" onClick={() => setTick((v) => v + 1)}>{G4_PERSON_SEC}초 다시 재기</button>
            )}
            <button className="btn ghost tiny" onClick={() => dispatch({ type: 'g4Swap' })}>이 문제 교체</button>
            {a.results.length > 0 && (
              <button className="btn ghost tiny" onClick={() => dispatch({ type: 'g4Undo' })}>직전 판정 취소</button>
            )}
            <button className="btn ghost tiny" onClick={() => dispatch({ type: 'g4ShowResult' })}>여기까지 결과 보기</button>
          </div>
        </>
      )}

      <div className="spacer" />
      <div className="row center">
        <button
          className="btn ghost"
          onClick={async () => {
            if (a.results.length > 0) {
              const ok = await ask({
                message: '이 라운드를 기록하지 않고 나갈까요?',
                confirmLabel: '기록하지 않고 나가기',
                danger: true,
              })
              if (!ok) return
            }
            dispatch({ type: 'g4Discard' })
          }}
        >
          ← 진행판으로 (기록 없음)
        </button>
      </div>
    </div>
  )
}

export function QuickResult() {
  const { state, dispatch } = useGame()
  const ask = useConfirm()
  const a = state.g4.active
  if (!a) return null
  const team = state.teams[a.team]
  const ok = a.results.filter((r) => r.ok).length

  return (
    <div className={`wrap t-${a.team}`}>
      <div className="page-head center-col">
        <div className="eyebrow">GAME 04 · {team.name} · {a.round}라운드 결과</div>
        <h1>순발력 퀴즈 결과</h1>
      </div>

      <div className="card center-col">
        <span className="round-sub">맞힌 문제</span>
        <div className="big-score">{ok}</div>
        <div className="row center">
          <span className="chip">진행 {a.results.length}문제</span>
          <span className="chip">오답 {a.results.length - ok}개</span>
          {a.results.length < a.queue.length && (
            <span className="chip">남은 문제 {a.queue.length - a.results.length}개</span>
          )}
        </div>
      </div>

      <div className="spacer" />
      <div className="card">
        <h2>문제별 기록</h2>
        <div className="history">
          {a.results.map((r, i) => {
            const q = quickQuestion(r.q)
            return (
              <div className="h" key={i}>
                <span className="chip">{i + 1}</span>
                <span className="chip">{q.kind === 'proverb' ? '속담' : '인물'}</span>
                <span>{q.kind === 'proverb' ? `${q.head} → ${q.answer}` : q.answer}</span>
                <span className={`res ${r.ok ? 'y' : 'n'}`}>{r.ok ? '정답' : '오답'}</span>
              </div>
            )
          })}
        </div>
      </div>

      <div className="spacer" />
      <div className="row center">
        {a.results.length < a.queue.length && (
          <button className="btn ghost" onClick={() => dispatch({ type: 'g4BackToPlay' })}>← 라운드 계속하기</button>
        )}
        <button
          className="btn ghost"
          onClick={async () => {
            const ok = await ask({
              message: '이 라운드 결과를 저장하지 않고 나갈까요?',
              confirmLabel: '기록하지 않고 나가기',
              danger: true,
            })
            if (ok) dispatch({ type: 'g4Discard' })
          }}
        >
          기록하지 않고 나가기
        </button>
        <button className="btn primary lg" onClick={() => dispatch({ type: 'g4Commit' })}>결과 기록하기 →</button>
      </div>
    </div>
  )
}
