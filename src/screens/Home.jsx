import { useGame, GAME_META, overallSummary } from '../lib/store.jsx'
import TeamPanel from '../ui/TeamPanel.jsx'

const DESC = {
  g1: { desc: '설명자 1명이 팀원 2명에게 제시어를 설명. 100초 안에 몇 개를 맞히는지 겨룹니다.', foot: '3라운드 · 라운드 승자 1점 · 2점 선취' },
  g2: { desc: '팀에서 랜덤 2명을 뽑아 양자택일 문제를 던지고, 답이 같으면 통과입니다.', foot: '세션 자유 · 일치 횟수 합산' },
  g3: { desc: '1:1로 붙어 내 제시어를 먼저 맞히는 사람이 승리. 제시어는 진행자가 정합니다.', foot: '3라운드 · 1라운드는 팀장전' },
  g4: { desc: '속담 이어 말하기와 인물 맞추기가 랜덤으로 섞여 나옵니다. 지목된 사람이 답합니다.', foot: '3라운드 · 라운드당 15문제 · 2점 선취' },
  g5: { desc: '진행자가 화면에 그림을 그리면, 뽑힌 두 사람이 먼저 맞히는 쪽이 득점합니다.', foot: '9라운드 · 전원 3번씩 · 시간 제한 없음' },
}

export default function Home() {
  const { state, dispatch } = useGame()
  const { A, B } = state.teams
  const sum = overallSummary(state)

  return (
    <div className="wrap wide">
      <div className="page-head center-col">
        <div className="eyebrow">Beyond_Imagination · 2026년 9월 여름캠핑</div>
        <h1>단체전 진행판</h1>
        <p className="lead">
          진행할 게임을 고르세요. 어느 팀이 먼저 할지는 각 게임 화면에서 직접 선택합니다.
          {sum.champion && <> · 현재 <b>{state.teams[sum.champion].name}</b>가 {sum.wins[sum.champion]}종목 우세</>}
        </p>
      </div>

      <div className="grid2">
        {['A', 'B'].map((id) => (
          <TeamPanel
            key={id}
            team={state.teams[id]}
            badge={
              <span className="score-mini">
                {sum.games.map((g, i) => (
                  <span key={g.key} className={id === 'A' ? 'a' : 'b'} title={g.label}>
                    {'①②③④⑤'[i]} {id === 'A' ? g.a : g.b}{g.unit}
                  </span>
                ))}
              </span>
            }
          />
        ))}
      </div>

      <div className="spacer" />
      <div className="menu">
        {sum.games.map((g) => (
          <button key={g.key} className="menu-card" onClick={() => dispatch({ type: 'go', screen: g.screen })}>
            <span className="menu-no">GAME {g.no}</span>
            <span className="menu-title">{g.label}</span>
            <span className="menu-desc">{DESC[g.key].desc}</span>
            <span className="menu-foot">
              <span className="score-mini">
                <span className="a">{A.name} {g.a}{g.unit}</span>
                <span className="b">{B.name} {g.b}{g.unit}</span>
              </span>
            </span>
            <span className="menu-desc" style={{ fontSize: 12.5 }}>{DESC[g.key].foot}</span>
          </button>
        ))}
        <button className="menu-card" onClick={() => dispatch({ type: 'go', screen: 'final' })}>
          <span className="menu-no">RESULT</span>
          <span className="menu-title">최종 결과</span>
          <span className="menu-desc">다섯 종목의 결과를 합쳐 우승 팀을 발표합니다.</span>
          <span className="menu-foot">
            <span className="score-mini">
              <span className="a">{A.name} {sum.wins.A}종목</span>
              <span className="b">{B.name} {sum.wins.B}종목</span>
            </span>
          </span>
          <span className="menu-desc" style={{ fontSize: 12.5 }}>5종목 · 동점 시 무승부</span>
        </button>
      </div>

      <p className="footnote">
        진행 상황은 브라우저에 자동 저장됩니다. 실수로 창을 닫거나 새로고침해도 이어서 진행할 수 있습니다.
      </p>
    </div>
  )
}
