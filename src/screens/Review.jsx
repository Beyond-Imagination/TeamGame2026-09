import { useState } from 'react'
import { useGame, DATA_STATS } from '../lib/store.jsx'
import { SPEED_WORDS, TELEPATHY_QUESTIONS, PROVERBS, PEOPLE } from '../lib/data.js'

const TABS = [
  ['people', '인물 사진'],
  ['proverbs', '속담'],
  ['words', '스피드 제시어'],
  ['telepathy', '이심전심'],
]

export default function Review() {
  const { state, dispatch } = useGame()
  const [tab, setTab] = useState('people')
  const kr = PEOPLE.filter((p) => p.origin === '국내').length

  return (
    <div className="wrap wide">
      <div className="page-head center-col">
        <div className="eyebrow">문제 검수</div>
        <h1>출제 데이터 확인</h1>
        <p className="lead">
          모든 문제는 프로젝트의 <b>/data</b> 폴더 JSON에 있습니다. 파일을 고치고 새로고침하면 바로 반영됩니다.
        </p>
      </div>

      <div className="row center" style={{ marginBottom: 18 }}>
        {TABS.map(([k, label]) => (
          <button key={k} className={`btn ${tab === k ? 'primary' : 'ghost'}`} onClick={() => setTab(k)}>{label}</button>
        ))}
      </div>

      {tab === 'people' && (
        <div className="card">
          <h2>인물 맞추기 · {DATA_STATS.people}명</h2>
          <p className="hint" style={{ marginBottom: 16 }}>
            국내 {kr}명 / 해외 {PEOPLE.length - kr}명 (국내 {Math.round((kr / PEOPLE.length) * 100)}%) ·
            사진 출처: 위키미디어 커먼즈 (자유 이용 라이선스) · 파일 위치: public/people/
          </p>
          <div className="review-grid">
            {PEOPLE.map((p) => (
              <div className="review-card" key={p.id}>
                {/* 확대(zoom)한 사진이 카드를 넘어가 이름을 덮지 않도록 틀 안에서 자른다 */}
                <div className="review-thumb">
                  <img
                    src={`./people/${p.file}`}
                    alt={p.name}
                    loading="lazy"
                    style={
                      p.crop
                        ? {
                            objectPosition: p.crop,
                            ...(p.zoom ? { transform: `scale(${p.zoom})`, transformOrigin: p.crop } : {}),
                          }
                        : undefined
                    }
                  />
                </div>
                <div className="meta">
                  <div className="nm">{p.name}</div>
                  <div className="sub">{p.origin} · {p.category} · {p.file}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'proverbs' && (
        <div className="card">
          <h2>속담 이어 말하기 · {DATA_STATS.proverbs}개</h2>
          <div className="review-list">
            {PROVERBS.map((p, i) => (
              <div key={i}>{i + 1}. {p.head} → <b>{p.tail}</b></div>
            ))}
          </div>
        </div>
      )}

      {tab === 'words' && (
        <div className="card">
          <h2>스피드 퀴즈 제시어 · {DATA_STATS.speedWords}개</h2>
          <div className="word-cloud">{SPEED_WORDS.map((w) => <span key={w}>{w}</span>)}</div>
        </div>
      )}

      {tab === 'telepathy' && (
        <div className="card">
          <h2>이심전심 문제 · {DATA_STATS.telepathy}개</h2>
          <div className="review-list">
            {TELEPATHY_QUESTIONS.map((q, i) => (
              <div key={i}>{i + 1}. {q.a} <span style={{ color: 'var(--muted)' }}>vs</span> <b>{q.b}</b></div>
            ))}
          </div>
        </div>
      )}

      <div className="spacer" />
      <div className="row center">
        <button
          className="btn ghost"
          onClick={() => dispatch({ type: 'go', screen: state.teams ? 'home' : 'setup' })}
        >
          {state.teams ? '← 메인으로' : '← 팀 편성으로'}
        </button>
      </div>
    </div>
  )
}
