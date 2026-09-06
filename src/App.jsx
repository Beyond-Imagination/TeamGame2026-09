import { GameProvider, useGame } from './lib/store.jsx'
import { ConfirmProvider, useConfirm } from './ui/Confirm.jsx'
import Logo from './ui/Logo.jsx'
import Setup from './screens/Setup.jsx'
import Home from './screens/Home.jsx'
import Final from './screens/Final.jsx'
import Review from './screens/Review.jsx'
import { SpeedIntro, SpeedBoard, SpeedPick, SpeedPlay, SpeedResult } from './screens/SpeedQuiz.jsx'
import { TelepathyIntro, TelepathyBoard, TelepathyPlay, TelepathyResult } from './screens/Telepathy.jsx'
import { YangIntro, YangBoard } from './screens/YangSechan.jsx'
import { QuickIntro, QuickBoard, QuickPlay, QuickResult } from './screens/QuickFire.jsx'
import { CatchIntro, CatchBoard, CatchPlay, CatchResult } from './screens/Catchmind.jsx'

const SCREENS = {
  setup: Setup,
  home: Home,
  final: Final,
  review: Review,
  'g1-intro': SpeedIntro, 'g1-board': SpeedBoard, 'g1-pick': SpeedPick, 'g1-play': SpeedPlay, 'g1-result': SpeedResult,
  'g2-intro': TelepathyIntro, 'g2-board': TelepathyBoard, 'g2-play': TelepathyPlay, 'g2-result': TelepathyResult,
  'g3-intro': YangIntro, 'g3-board': YangBoard,
  'g4-intro': QuickIntro, 'g4-board': QuickBoard, 'g4-play': QuickPlay, 'g4-result': QuickResult,
  'g5-intro': CatchIntro, 'g5-board': CatchBoard, 'g5-play': CatchPlay, 'g5-result': CatchResult,
}

// 팀 배정 없이도 열 수 있는 화면 (팀 정보를 쓰지 않는다)
const TEAMLESS = new Set(['setup', 'review'])

const NAV = [
  ['home', '메인'],
  ['g1-board', '① 스피드'],
  ['g2-board', '② 이심전심'],
  ['g3-board', '③ 양세찬'],
  ['g4-board', '④ 순발력'],
  ['g5-board', '⑤ 캐치마인드'],
  ['final', '최종 결과'],
]

function Shell() {
  const { state, dispatch, undoLabel } = useGame()
  const ask = useConfirm()
  const ready = !!state.teams
  const screen = ready || TEAMLESS.has(state.screen) ? state.screen : 'setup'
  const View = SCREENS[screen] ?? Setup

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <Logo size={44} />
          <div className="brand-txt">
            <span className="brand-name">Beyond_Imagination</span>
            <span className="brand-sub">2026년 9월 여름캠핑 단체전</span>
          </div>
        </div>
        <nav className="nav">
          <button className={screen === 'setup' ? 'on' : ''} onClick={() => dispatch({ type: 'go', screen: 'setup' })}>
            팀 편성
          </button>
          {NAV.map(([s, label]) => (
            <button
              key={s}
              disabled={!ready}
              className={screen.startsWith(s.slice(0, 2)) && s !== 'home' ? 'on' : screen === s ? 'on' : ''}
              onClick={() => dispatch({ type: 'go', screen: s })}
            >
              {label}
            </button>
          ))}
          <button onClick={() => dispatch({ type: 'go', screen: 'review' })} className={screen === 'review' ? 'on' : ''}>
            문제 검수
          </button>
          <button
            className="undo"
            disabled={!undoLabel}
            title={undoLabel ? `되돌릴 동작: ${undoLabel}` : '되돌릴 동작이 없습니다'}
            onClick={() => dispatch({ type: 'undo' })}
          >
            ↩ 되돌리기{undoLabel && <span className="undo-what">{undoLabel}</span>}
          </button>
          <button
            onClick={async () => {
              const ok = await ask({
                title: '전체 초기화',
                message:
                  '팀 편성과 모든 게임 기록을 지우고 처음부터 시작합니다.\n(이 동작도 되돌리기로 복구할 수 있습니다)',
                confirmLabel: '전체 초기화',
                danger: true,
              })
              if (ok) dispatch({ type: 'resetAll' })
            }}
          >
            전체 초기화
          </button>
        </nav>
      </header>
      <View />
    </div>
  )
}

export default function App() {
  return (
    <GameProvider>
      <ConfirmProvider>
        <Shell />
      </ConfirmProvider>
    </GameProvider>
  )
}
