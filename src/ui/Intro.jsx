export default function Intro({ no, title, tagline, rules, onStart, onBack, startLabel = '진행 화면으로' }) {
  return (
    <div className="intro">
      <div className="eyebrow">GAME {no} · 게임 설명</div>
      <h1>{title}</h1>
      <p className="lead">{tagline}</p>
      <ul className="rules">
        {rules.map((r, i) => (
          <li key={i}>
            <span className="num">{i + 1}</span>
            <span>{r}</span>
          </li>
        ))}
      </ul>
      <div className="row center">
        <button className="btn ghost" onClick={onBack}>← 메인으로</button>
        <button className="btn primary lg" onClick={onStart}>{startLabel}</button>
      </div>
    </div>
  )
}
