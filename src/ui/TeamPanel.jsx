/** 팀 카드 (팀장 표시 + 멤버별 부가정보 슬롯) */
export default function TeamPanel({ team, badge, children, extra }) {
  return (
    <div className={`card team-card t-${team.id}`}>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <div className="team-tag">TEAM {team.id}</div>
        {badge}
      </div>
      <div className="team-name">{team.name}</div>
      <div className="member-list">
        {team.members.map((m) => (
          <div className="member" key={m}>
            <span>{m}</span>
            <span className="row" style={{ gap: 6 }}>
              {m === team.leader && <span className="crown">팀장</span>}
              {extra?.(m)}
            </span>
          </div>
        ))}
      </div>
      {children}
    </div>
  )
}
