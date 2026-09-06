import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useGame, g5Score, penaltyLeft, G5_PER_MEMBER, G5_PENALTY_MS, TEAM_IDS } from '../lib/store.jsx'
import Intro from '../ui/Intro.jsx'
import { useConfirm } from '../ui/Confirm.jsx'

const COLORS = [
  '#111827', '#6b7280', '#b91c1c', '#e5484d', '#f97316', '#f5a524',
  '#facc15', '#12a150', '#0d9488', '#38bdf8', '#1d6ff2', '#4338ca',
  '#8b5cf6', '#ec4899', '#92400e',
]
const WIDTHS = [3, 8, 16, 30]
const BOARD_BG = '#ffffff'
const N = 1000 // 좌표 정규화 기준

export function CatchIntro() {
  const { dispatch } = useGame()
  return (
    <Intro
      no="05" title="캐치마인드" tagline="진행자가 그립니다. 손을 먼저 든 팀에게 기회가 갑니다."
      rules={[
        '두 팀에서 한 명씩 랜덤으로 뽑아 1:1로 붙습니다. 모든 사람이 정확히 ' + G5_PER_MEMBER + '번씩 뽑힙니다.',
        '진행자가 머릿속에 떠올린 것을 화면에 그립니다.',
        '지목된 두 사람만 참여합니다. 답을 말하기 전에 먼저 "정답!"을 외쳐 발언권을 얻어야 합니다.',
        `발언권을 얻고 틀리면 그 팀은 ${G5_PENALTY_MS / 1000}초 동안 발언권을 얻을 수 없습니다. 화면의 팀별 타이머로 남은 시간을 확인하세요.`,
        '무득점은 없습니다. 한 팀이 맞힐 때까지 진행하고, 막히면 진행자가 문제를 바꿔 새로 그려서라도 그 라운드를 끝냅니다.',
        '시간 제한은 없습니다. 득점한 팀 버튼을 눌러 기록하고 다음 라운드로 넘어갑니다.',
        '9라운드를 모두 마친 뒤 결과 보기를 눌러 최종 점수를 공개합니다.',
      ]}
      onBack={() => dispatch({ type: 'go', screen: 'home' })}
      onStart={() => dispatch({ type: 'go', screen: 'g5-board' })}
    />
  )
}

export function CatchBoard() {
  const { state, dispatch } = useGame()
  const ask = useConfirm()
  const { pairs } = state.g5
  const decided = pairs.filter((p) => p.winner).length

  return (
    <div className="wrap wide">
      <div className="page-head center-col">
        <div className="eyebrow">GAME 05</div>
        <h1>캐치마인드 대결표</h1>
        <p className="lead">
          모든 사람이 {G5_PER_MEMBER}번씩 뽑혀 총 {state.teams.A.members.length * G5_PER_MEMBER}라운드가 만들어집니다.
        </p>
      </div>

      {pairs.length === 0 ? (
        <div className="card center-col" style={{ padding: '70px 24px' }}>
          <p className="lead">아직 대결 구도가 없습니다. 뽑기를 누르면 순서가 정해집니다.</p>
          <div className="spacer" />
          <button className="btn primary xl" onClick={() => dispatch({ type: 'g5Generate' })}>대결 구도 뽑기</button>
        </div>
      ) : (
        <>
          <div className="grid2">
            {TEAM_IDS.map((id) => (
              <div className={`card team-card t-${id}`} key={id}>
                <div className="team-tag">TEAM {id}</div>
                <div className="total-bar" style={{ marginTop: 8, paddingTop: 12 }}>
                  <span className="round-sub">{state.teams[id].name} 득점</span>
                  <b>{g5Score(state, id)}</b>
                </div>
              </div>
            ))}
          </div>

          <div className="spacer" />
          <div className="catch-list">
            {pairs.map((p, i) => (
              <div className={`catch-row ${p.winner ? 'done' : ''} ${i === state.g5.current ? 'cur' : ''}`} key={p.round}>
                <div className="round-no">R{p.round}</div>
                <div className="cvs">
                  <span className={`t-A ${p.winner === 'A' ? 'w' : ''}`}>{p.a}</span>
                  <i>vs</i>
                  <span className={`t-B ${p.winner === 'B' ? 'w' : ''}`}>{p.b}</span>
                </div>
                <div className="round-sub">
                  {p.winner ? `${state.teams[p.winner].name} 득점` : '미진행'}
                </div>
                <div className="row" style={{ gap: 6 }}>
                  {p.winner && (
                    <button
                      className="btn ghost tiny"
                      onClick={() => dispatch({ type: 'g5AwardAt', index: i, team: p.winner })}
                    >
                      기록 삭제
                    </button>
                  )}
                  <button className="btn tiny" onClick={() => dispatch({ type: 'g5Open', index: i })}>
                    {p.winner ? '다시 진행' : '진행'}
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="spacer" />
          <div className="row center">
            <button className="btn primary lg" onClick={() => dispatch({ type: 'g5Open', index: Math.max(0, pairs.findIndex((p) => !p.winner)) })}>
              {decided === 0 ? '1라운드 시작' : '진행할 라운드로 이동'}
            </button>
            <button className="btn ghost" onClick={() => dispatch({ type: 'go', screen: 'g5-result' })}>결과 보기</button>
          </div>
          <div className="spacer" />
          <div className="row center">
            <button className="btn ghost tiny" onClick={() => dispatch({ type: 'g5Generate', keepDecided: true })}>
              미결정 라운드 다시 뽑기
            </button>
            <button
              className="btn ghost tiny"
              onClick={async () => {
                const ok = await ask({
                  title: '득점 초기화',
                  message: '기록된 득점을 모두 지웁니다. 대결 구도는 그대로 남습니다.',
                  confirmLabel: '득점 초기화',
                  danger: true,
                })
                if (ok) dispatch({ type: 'g5ResetAll' })
              }}
            >
              득점 초기화
            </button>
            <button
              className="btn ghost tiny"
              onClick={async () => {
                if (decided > 0) {
                  const ok = await ask({
                    message: '기록된 득점까지 지우고 대결 구도를 새로 뽑을까요?',
                    confirmLabel: '전체 다시 뽑기',
                    danger: true,
                  })
                  if (!ok) return
                }
                dispatch({ type: 'g5Generate' })
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
        <button className="btn ghost" onClick={() => dispatch({ type: 'go', screen: 'g5-intro' })}>게임 설명 보기</button>
      </div>
    </div>
  )
}

/* ---------------- 그림판 ---------------- */
function Board() {
  const { state, dispatch } = useGame()
  const strokes = state.g5.strokes
  const wrapRef = useRef(null)
  const canvasRef = useRef(null)
  const [size, setSize] = useState({ w: 0, h: 0 })
  const [color, setColor] = useState(COLORS[0])
  const [width, setWidth] = useState(WIDTHS[1])
  const [custom, setCustom] = useState('#00b3ff')
  const [eraser, setEraser] = useState(false)
  const drawing = useRef(null)

  useLayoutEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const ro = new ResizeObserver(() => {
      setSize({ w: el.clientWidth, h: el.clientHeight })
    })
    ro.observe(el)
    setSize({ w: el.clientWidth, h: el.clientHeight })
    return () => ro.disconnect()
  }, [])

  const paint = useCallback((ctx, s, w, h) => {
    if (s.p.length === 0) return
    ctx.strokeStyle = s.e ? BOARD_BG : s.c
    ctx.lineWidth = (s.w * w) / N
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.beginPath()
    s.p.forEach(([x, y], i) => {
      const px = (x / N) * w
      const py = (y / N) * h
      if (i === 0) ctx.moveTo(px, py)
      else ctx.lineTo(px, py)
    })
    if (s.p.length === 1) {
      // 점 하나만 찍은 경우
      ctx.lineTo((s.p[0][0] / N) * w + 0.01, (s.p[0][1] / N) * h)
    }
    ctx.stroke()
  }, [])

  const redraw = useCallback(() => {
    const cv = canvasRef.current
    if (!cv || !size.w || !size.h) return
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    cv.width = size.w * dpr
    cv.height = size.h * dpr
    const ctx = cv.getContext('2d')
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.fillStyle = BOARD_BG
    ctx.fillRect(0, 0, size.w, size.h)
    strokes.forEach((s) => paint(ctx, s, size.w, size.h))
    if (drawing.current) paint(ctx, drawing.current, size.w, size.h)
  }, [size, strokes, paint])

  useEffect(redraw, [redraw])

  const toNorm = (e) => {
    const r = canvasRef.current.getBoundingClientRect()
    return [
      Math.round(((e.clientX - r.left) / r.width) * N),
      Math.round(((e.clientY - r.top) / r.height) * N),
    ]
  }

  const onDown = (e) => {
    e.currentTarget.setPointerCapture?.(e.pointerId)
    drawing.current = { c: color, w: width, e: eraser, p: [toNorm(e)] }
    redraw()
  }

  const onMove = (e) => {
    if (!drawing.current) return
    const pt = toNorm(e)
    const pts = drawing.current.p
    const last = pts[pts.length - 1]
    if (last && Math.abs(last[0] - pt[0]) < 2 && Math.abs(last[1] - pt[1]) < 2) return
    pts.push(pt)
    // 드래그 중에는 마지막 선분만 그려서 부드럽게 유지
    const cv = canvasRef.current
    const ctx = cv.getContext('2d')
    const s = drawing.current
    ctx.strokeStyle = s.e ? BOARD_BG : s.c
    ctx.lineWidth = (s.w * size.w) / N
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.beginPath()
    ctx.moveTo((last[0] / N) * size.w, (last[1] / N) * size.h)
    ctx.lineTo((pt[0] / N) * size.w, (pt[1] / N) * size.h)
    ctx.stroke()
  }

  const onUp = () => {
    const s = drawing.current
    drawing.current = null
    if (s && s.p.length) dispatch({ type: 'g5Stroke', stroke: s })
  }

  return (
    <div className="board">
      <div className="board-tools">
        <div className="swatches">
          {COLORS.map((c) => (
            <button
              key={c}
              className={`swatch ${!eraser && color === c ? 'on' : ''}`}
              style={{ background: c }}
              onClick={() => { setColor(c); setEraser(false) }}
              aria-label={`색상 ${c}`}
            />
          ))}
          <label className={`swatch picker ${!eraser && color === custom ? 'on' : ''}`} style={{ background: custom }} title="색 직접 고르기">
            <input
              type="color"
              value={custom}
              onChange={(e) => { setCustom(e.target.value); setColor(e.target.value); setEraser(false) }}
            />
          </label>
        </div>
        <span className="tool-sep" />
        {WIDTHS.map((w) => (
          <button
            key={w}
            className={`wbtn ${!eraser && width === w ? 'on' : ''}`}
            onClick={() => setWidth(w)}
            aria-label={`굵기 ${w}`}
            title={`굵기 ${w}`}
          >
            <i style={{ width: w, height: w }} />
          </button>
        ))}
        <span className="tool-sep" />
        <button className={`btn tiny ${eraser ? 'primary' : 'ghost'}`} onClick={() => setEraser((v) => !v)}>지우개</button>
        <button className="btn tiny ghost" onClick={() => dispatch({ type: 'g5UndoStroke' })} disabled={!strokes.length}>되돌리기</button>
        <button className="btn tiny ghost" onClick={() => dispatch({ type: 'g5ClearCanvas' })} disabled={!strokes.length}>전체 지우기</button>
      </div>
      <div className="board-canvas" ref={wrapRef}>
        <canvas
          ref={canvasRef}
          style={{ width: '100%', height: '100%', touchAction: 'none', cursor: 'crosshair' }}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerLeave={onUp}
          onPointerCancel={onUp}
        />
      </div>
    </div>
  )
}

export function CatchPlay() {
  const { state, dispatch } = useGame()
  const { pairs, current } = state.g5
  const [now, setNow] = useState(() => Date.now())
  const p = pairs[current]

  const leftA = p ? penaltyLeft(state, 'A', now) : 0
  const leftB = p ? penaltyLeft(state, 'B', now) : 0
  const ticking = leftA > 0 || leftB > 0

  useEffect(() => {
    if (!ticking) return
    const id = setInterval(() => setNow(Date.now()), 200)
    return () => clearInterval(id)
  }, [ticking])

  if (!p) return null
  const last = current >= pairs.length - 1

  const sides = [
    { id: 'A', player: p.a, left: leftA },
    { id: 'B', player: p.b, left: leftB },
  ]

  return (
    <div className="wrap wide">
      <div className="qhead">
        <div className="who">
          <b>ROUND {p.round} / {pairs.length}</b>
          <span>
            답하기 전에 "정답!"을 외쳐 발언권을 얻어야 합니다. 틀리면 {G5_PENALTY_MS / 1000}초 정지 ·
            시간 제한 없이 한 팀이 맞힐 때까지 진행
          </span>
        </div>
        <div className="row" style={{ gap: 8, marginLeft: 'auto' }}>
          <span className="chip" style={{ color: 'var(--a)' }}>{state.teams.A.name} {g5Score(state, 'A')}</span>
          <span className="chip" style={{ color: 'var(--b)' }}>{state.teams.B.name} {g5Score(state, 'B')}</span>
        </div>
      </div>

      <div className="penalty-row">
        {sides.map((s) => (
          <div key={s.id} className={`pen-card t-${s.id} ${s.left > 0 ? 'off' : 'ready'} ${p.winner === s.id ? 'scored' : ''}`}>
            <div className="pen-head">
              <span className="tm">{state.teams[s.id].name}</span>
              <span className="nm">{s.player}</span>
            </div>
            <div className="pen-state">
              {s.left > 0 ? (
                <>
                  <b>{Math.ceil(s.left / 1000)}</b>
                  <span>초 후 발언 가능</span>
                </>
              ) : (
                <>
                  <b className="ok-txt">발언 가능</b>
                  <span>"정답!" 외치고 답하기</span>
                </>
              )}
            </div>
            <div className="pen-btns">
              <button className="btn ok tiny" onClick={() => dispatch({ type: 'g5Award', team: s.id })}>
                정답 · 득점 {p.winner === s.id ? '✓' : ''}
              </button>
              <button className="btn no tiny" onClick={() => dispatch({ type: 'g5Penalty', team: s.id })}>
                오답 · {G5_PENALTY_MS / 1000}초 정지
              </button>
              {s.left > 0 && (
                <button className="btn ghost tiny" onClick={() => dispatch({ type: 'g5ClearPenalty', team: s.id })}>
                  정지 해제
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <Board />

      <div className="row center" style={{ marginTop: 16 }}>
        <button className="btn ghost" onClick={() => dispatch({ type: 'go', screen: 'g5-board' })}>← 대결표로</button>
        <button
          className="btn lg"
          onClick={() => {
            dispatch({ type: 'g5ClearCanvas' })
            dispatch({ type: 'g5ClearPenalty' })
          }}
        >
          새 문제로 다시 그리기
        </button>
        {last ? (
          <button className="btn primary lg" onClick={() => dispatch({ type: 'go', screen: 'g5-result' })}>결과 보기</button>
        ) : (
          <button className="btn primary lg" disabled={!p.winner} onClick={() => dispatch({ type: 'g5Next' })}>
            다음 라운드 →
          </button>
        )}
      </div>
    </div>
  )
}

export function CatchResult() {
  const { state, dispatch } = useGame()
  const { pairs } = state.g5
  const a = g5Score(state, 'A')
  const b = g5Score(state, 'B')
  const none = pairs.filter((p) => !p.winner).length

  return (
    <div className="wrap">
      <div className="page-head center-col">
        <div className="eyebrow">GAME 05 · 결과</div>
        <h1>캐치마인드 결과</h1>
      </div>

      <div className="grid2">
        {TEAM_IDS.map((id) => (
          <div className={`card team-card t-${id} center-col`} key={id}>
            <div className="team-tag">TEAM {id}</div>
            <div className="team-name">{state.teams[id].name}</div>
            <div className="big-score">{id === 'A' ? a : b}</div>
            <span className="round-sub">득점</span>
          </div>
        ))}
      </div>

      <div className="spacer" />
      <div className="card">
        <h2>라운드별 기록</h2>
        <div className="history">
          {pairs.map((p) => (
            <div className="h" key={p.round}>
              <span className="chip">R{p.round}</span>
              <span>{p.a} vs {p.b}</span>
              <span className={`res ${p.winner ? 'y' : 'n'}`}>
                {p.winner ? `${state.teams[p.winner].name} 득점` : '미진행'}
              </span>
            </div>
          ))}
        </div>
        {none > 0 && (
          <p className="hint" style={{ marginTop: 12 }}>
            아직 진행하지 않은 라운드 {none}개가 있습니다. 캐치마인드는 무득점 없이 모든 라운드에서 한 팀이 득점합니다.
          </p>
        )}
      </div>

      <div className="spacer" />
      <div className="row center">
        <button className="btn ghost" onClick={() => dispatch({ type: 'go', screen: 'g5-board' })}>← 대결표로</button>
        <button className="btn primary lg" onClick={() => dispatch({ type: 'go', screen: 'home' })}>메인으로 →</button>
      </div>
    </div>
  )
}
