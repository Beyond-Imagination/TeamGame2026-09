import { createContext, useContext, useEffect, useReducer } from 'react'
import { SPEED_WORDS, TELEPATHY_QUESTIONS, PROVERBS, PEOPLE, DATA_STATS } from './data.js'
import { shuffle, drawFrom } from './utils.js'

export const STORAGE_KEY = 'bi-camp-2609-v1'
export const SPEED_DURATION_MS = 100 * 1000
export const G1_ROUNDS = 3
export const G3_ROUNDS = 3
export const G4_ROUNDS = 3
export const G4_PER_ROUND = 15
export const G4_PERSON_SEC = 3
export const G5_PER_MEMBER = 3 // 캐치마인드: 한 사람이 몇 번 뽑히는지
export const G5_PENALTY_MS = 30 * 1000 // 오답 시 발언권 정지 시간
export const TEAM_IDS = ['A', 'B']

export { PEOPLE, DATA_STATS }

/** 순발력 퀴즈 문제 풀: 속담('pv:i') + 인물('pp:i') */
const PV_IDS = PROVERBS.map((_, i) => `pv:${i}`)
const PP_IDS = PEOPLE.map((_, i) => `pp:${i}`)
export const QUICK_POOL = [...PV_IDS, ...PP_IDS]

/** 속담과 인물이 한쪽으로 쏠리지 않게, 앞부분을 1:1 비율로 맞춘 덱을 만든다. */
function quickDeck() {
  const pv = shuffle(PV_IDS)
  const pp = shuffle(PP_IDS)
  const n = Math.min(pv.length, pp.length)
  return [...shuffle([...pv.slice(0, n), ...pp.slice(0, n)]), ...shuffle([...pv.slice(n), ...pp.slice(n)])]
}

export function quickQuestion(id) {
  const [kind, iRaw] = id.split(':')
  const i = Number(iRaw)
  if (kind === 'pv') {
    const { head, tail } = PROVERBS[i]
    return { id, kind: 'proverb', head, answer: tail }
  }
  const p = PEOPLE[i]
  return { id, kind: 'person', answer: p.name, file: p.file, crop: p.crop, zoom: p.zoom, credit: p }
}

const telepathyDeck = () => shuffle(TELEPATHY_QUESTIONS.map((_, i) => i))
const telepathyIds = () => TELEPATHY_QUESTIONS.map((_, i) => i)

function initialState() {
  return {
    v: 1,
    screen: 'setup',
    teams: null,
    g1: { deck: shuffle(SPEED_WORDS), turns: [], active: null },
    g2: { deck: telepathyDeck(), turns: [], active: null },
    g3: { matches: [] },
    g4: { deck: quickDeck(), turns: [], active: null },
    g5: { pairs: [], current: 0, strokes: [], penalty: { A: null, B: null } },
  }
}

// ---------- 조회 헬퍼 ----------
export const teamTurns = (turns, team) => turns.filter((t) => t.team === team)
export const g1Score = (s, team) => teamTurns(s.g1.turns, team).reduce((n, t) => n + t.correct.length, 0)
export const g2Score = (s, team) =>
  teamTurns(s.g2.turns, team).reduce((n, t) => n + t.items.filter((i) => i.matched).length, 0)
export const g3Score = (s, team) => s.g3.matches.filter((m) => m.winner === team).length
export const g4Score = (s, team) =>
  teamTurns(s.g4.turns, team).reduce((n, t) => n + t.results.filter((r) => r.ok).length, 0)
export const g5Score = (s, team) => s.g5.pairs.filter((p) => p.winner === team).length
export const penaltyOf = (s) => s.g5.penalty ?? { A: null, B: null }
/** 남은 발언권 정지 시간(ms). 0이면 발언 가능 */
export const penaltyLeft = (s, team, now = Date.now()) => Math.max(0, (penaltyOf(s)[team] ?? 0) - now)

/** 스피드 퀴즈 다음 라운드 (1~3), 다 하면 null */
export function nextRound(s, team) {
  const done = teamTurns(s.g1.turns, team).length
  return done >= G1_ROUNDS ? null : done + 1
}
export function nextQuickRound(s, team) {
  const done = teamTurns(s.g4.turns, team).length
  return done >= G4_ROUNDS ? null : done + 1
}
export const nextTelepathyRound = (s, team) => teamTurns(s.g2.turns, team).length + 1

/** 스피드 퀴즈 설명자 후보: 1라운드는 팀장, 이후는 아직 안 해본 사람 */
export function explainerCandidates(s, team) {
  const used = new Set(teamTurns(s.g1.turns, team).map((t) => t.explainer))
  const t = s.teams[team]
  const round = nextRound(s, team)
  if (round === 1) return [t.leader]
  return t.members.filter((m) => !used.has(m))
}

export function winnerOf(a, b) {
  if (a > b) return 'A'
  if (b > a) return 'B'
  return null
}

/**
 * 라운드 승점제(스피드 퀴즈 · 순발력 퀴즈).
 * 같은 라운드를 두 팀이 번갈아 진행하고, 그 라운드에서 더 많이 맞힌 팀이 1점.
 * 3라운드 중 2점을 먼저 얻은 팀이 그 게임의 승자.
 */
const ROUND_GAME = {
  g1: { rounds: G1_ROUNDS, value: (t) => t.correct.length },
  g4: { rounds: G4_ROUNDS, value: (t) => t.results.filter((r) => r.ok).length },
}
export const ROUND_WIN_TARGET = 2

export function roundDuels(s, key) {
  const { rounds, value } = ROUND_GAME[key]
  return Array.from({ length: rounds }, (_, i) => {
    const round = i + 1
    const ta = s[key].turns.find((t) => t.team === 'A' && t.round === round)
    const tb = s[key].turns.find((t) => t.team === 'B' && t.round === round)
    const a = ta ? value(ta) : null
    const b = tb ? value(tb) : null
    const done = a !== null && b !== null
    return { round, a, b, done, winner: done ? winnerOf(a, b) : null }
  })
}
export const roundWins = (s, key, team) => roundDuels(s, key).filter((d) => d.winner === team).length
/** 2점 선취로 승부가 갈렸으면 그 팀, 아니면 null */
export function roundGameChampion(s, key) {
  const a = roundWins(s, key, 'A')
  const b = roundWins(s, key, 'B')
  if (a >= ROUND_WIN_TARGET) return 'A'
  if (b >= ROUND_WIN_TARGET) return 'B'
  return null
}

export const GAME_META = [
  {
    key: 'g1', no: '01', label: '스피드 퀴즈', unit: '점', screen: 'g1-intro',
    score: (s, t) => roundWins(s, 'g1', t), detail: g1Score, detailUnit: '개',
    played: (s) => s.g1.turns.length > 0,
  },
  {
    key: 'g2', no: '02', label: '이심전심 퀴즈', unit: '회', screen: 'g2-intro',
    score: g2Score, played: (s) => s.g2.turns.length > 0,
  },
  {
    key: 'g3', no: '03', label: '양세찬 게임', unit: '승', screen: 'g3-intro',
    score: g3Score, played: (s) => s.g3.matches.some((m) => m.winner),
  },
  {
    key: 'g4', no: '04', label: '랜덤 순발력 퀴즈', unit: '점', screen: 'g4-intro',
    score: (s, t) => roundWins(s, 'g4', t), detail: g4Score, detailUnit: '개',
    played: (s) => s.g4.turns.length > 0,
  },
  {
    key: 'g5', no: '05', label: '캐치마인드', unit: '승', screen: 'g5-intro',
    score: g5Score, played: (s) => s.g5.pairs.some((p) => p.winner),
  },
]

export function overallSummary(s) {
  const games = GAME_META.map((g) => {
    const a = g.score(s, 'A')
    const b = g.score(s, 'B')
    return {
      ...g,
      a, b,
      detailA: g.detail ? g.detail(s, 'A') : null,
      detailB: g.detail ? g.detail(s, 'B') : null,
      winner: winnerOf(a, b),
      played: g.played(s),
    }
  })
  const wins = { A: games.filter((g) => g.winner === 'A').length, B: games.filter((g) => g.winner === 'B').length }
  return { games, wins, champion: winnerOf(wins.A, wins.B) }
}

/**
 * 지금까지 한 번이라도 화면에 나온 문제들.
 * 덱이 소진돼 리필될 때 이 목록을 제외해서, 껐다 켜도 같은 문제가 다시 나오지 않게 한다.
 */
export function usedSpeedWords(s) {
  const a = s.g1.active
  return [
    ...s.g1.turns.flatMap((t) => [...t.correct, ...t.pass]),
    ...(a ? [...a.correct, ...a.pass, a.word] : []),
  ].filter(Boolean)
}
export function usedTelepathy(s) {
  const a = s.g2.active
  return [
    ...s.g2.turns.flatMap((t) => t.items.map((i) => i.q)),
    ...(a ? [...a.items.map((i) => i.q), a.q] : []),
  ].filter((x) => x !== null && x !== undefined)
}
export function usedQuick(s) {
  const a = s.g4.active
  return [...s.g4.turns.flatMap((t) => t.results.map((r) => r.q)), ...(a ? a.queue : [])].filter(Boolean)
}

/** 스피드 퀴즈 경과 시간(ms). runningSince가 절대시각이라 새로고침에도 안전 */
export function elapsedOf(active, now = Date.now()) {
  if (!active) return 0
  return active.elapsed + (active.runningSince ? now - active.runningSince : 0)
}
export const remainingOf = (active, now) => Math.max(0, SPEED_DURATION_MS - elapsedOf(active, now))

// ---------- 리듀서 ----------
function reducer(state, action) {
  switch (action.type) {
    case 'go':
      return { ...state, screen: action.screen }

    case 'setupTeams': {
      const { aLeader, bLeader, pool } = action
      const [m1, m2, m3, m4] = shuffle(pool)
      // 팀 이름은 팀장 이름을 그대로 쓴다.
      return {
        ...state,
        teams: {
          A: { id: 'A', name: `${aLeader}팀`, leader: aLeader, members: [aLeader, m1, m2] },
          B: { id: 'B', name: `${bLeader}팀`, leader: bLeader, members: [bLeader, m3, m4] },
        },
      }
    }

    case 'reshuffleTeams': {
      if (!state.teams) return state
      const { A, B } = state.teams
      const pool = shuffle([...A.members.slice(1), ...B.members.slice(1)])
      return {
        ...state,
        teams: {
          A: { ...A, members: [A.leader, pool[0], pool[1]] },
          B: { ...B, members: [B.leader, pool[2], pool[3]] },
        },
      }
    }

    // ================= 게임1: 스피드 퀴즈 =================
    case 'g1Prepare': {
      const round = nextRound(state, action.team)
      if (!round) return state
      const cands = explainerCandidates(state, action.team)
      return {
        ...state,
        screen: 'g1-pick',
        g1: {
          ...state.g1,
          active: {
            team: action.team, round, explainer: cands.length === 1 ? cands[0] : null,
            correct: [], pass: [], log: [], word: null, elapsed: 0, runningSince: null, finished: false,
          },
        },
      }
    }

    case 'g1SetExplainer':
      if (!state.g1.active) return state
      return { ...state, g1: { ...state.g1, active: { ...state.g1.active, explainer: action.name } } }

    case 'g1ToPlay': {
      const a = state.g1.active
      if (!a || !a.explainer) return state
      const { item, deck } = drawFrom(state.g1.deck, SPEED_WORDS, usedSpeedWords(state))
      return { ...state, screen: 'g1-play', g1: { ...state.g1, deck, active: { ...a, word: item } } }
    }

    case 'g1Run': {
      const a = state.g1.active
      if (!a || a.runningSince || a.finished) return state
      return { ...state, g1: { ...state.g1, active: { ...a, runningSince: Date.now() } } }
    }

    case 'g1Pause': {
      const a = state.g1.active
      if (!a || !a.runningSince) return state
      return { ...state, g1: { ...state.g1, active: { ...a, elapsed: elapsedOf(a), runningSince: null } } }
    }

    case 'g1Judge': {
      const a = state.g1.active
      if (!a || !a.runningSince || !a.word) return state
      const { item, deck } = drawFrom(state.g1.deck, SPEED_WORDS, usedSpeedWords(state))
      const log = [...(a.log ?? []), { w: a.word, ok: action.ok }]
      const next = action.ok
        ? { ...a, correct: [...a.correct, a.word], log, word: item }
        : { ...a, pass: [...a.pass, a.word], log, word: item }
      return { ...state, g1: { ...state.g1, deck, active: next } }
    }

    // 진행자가 맞았다/패스를 잘못 눌렀을 때 직전 판정만 되돌린다.
    case 'g1UndoJudge': {
      const a = state.g1.active
      const log = a?.log ?? []
      if (!a || !log.length) return state
      const last = log[log.length - 1]
      const deck = a.word ? [a.word, ...state.g1.deck] : state.g1.deck
      return {
        ...state,
        g1: {
          ...state.g1,
          deck,
          active: {
            ...a,
            log: log.slice(0, -1),
            correct: last.ok ? a.correct.slice(0, -1) : a.correct,
            pass: last.ok ? a.pass : a.pass.slice(0, -1),
            word: last.w,
          },
        },
      }
    }

    // 진행 사고(늦은 시작 등) 보정용 시간 가감
    case 'g1AdjustTime': {
      const a = state.g1.active
      if (!a) return state
      const elapsed = Math.min(SPEED_DURATION_MS, Math.max(0, elapsedOf(a) - action.ms))
      return {
        ...state,
        g1: {
          ...state.g1,
          active: {
            ...a,
            elapsed,
            runningSince: a.runningSince ? Date.now() : null,
            finished: elapsed >= SPEED_DURATION_MS ? a.finished : false,
          },
        },
      }
    }

    // 시간 종료(또는 수동 종료) - 결과는 아직 보여주지 않는다
    case 'g1End': {
      const a = state.g1.active
      if (!a || a.finished) return state
      return {
        ...state,
        g1: { ...state.g1, active: { ...a, elapsed: elapsedOf(a), runningSince: null, finished: true } },
      }
    }

    case 'g1ShowResult':
      if (!state.g1.active) return state
      return { ...state, screen: 'g1-result' }

    case 'g1Commit': {
      const a = state.g1.active
      if (!a) return state
      const turn = { team: a.team, round: a.round, explainer: a.explainer, correct: a.correct, pass: a.pass }
      const turns = [...state.g1.turns.filter((t) => !(t.team === a.team && t.round === a.round)), turn]
      return { ...state, screen: 'g1-board', g1: { ...state.g1, turns, active: null } }
    }

    case 'g1Discard':
      return { ...state, screen: 'g1-board', g1: { ...state.g1, active: null } }

    case 'g1ResetTurn': {
      const cleaned = state.g1.turns.filter(
        (t) => !(t.team === action.team && t.round >= action.round),
      )
      return { ...state, g1: { ...state.g1, turns: cleaned, active: null } }
    }

    case 'g1ResetAll':
      return { ...state, g1: { deck: shuffle(SPEED_WORDS), turns: [], active: null } }

    // ================= 게임2: 이심전심 =================
    case 'g2Start': {
      const round = nextTelepathyRound(state, action.team)
      return {
        ...state,
        screen: 'g2-play',
        g2: { ...state.g2, active: { team: action.team, round, items: [], pair: null, q: null } },
      }
    }

    case 'g2Draw': {
      const a = state.g2.active
      if (!a) return state
      const pair = shuffle(state.teams[a.team].members).slice(0, 2)
      const { item, deck } = drawFrom(state.g2.deck, telepathyIds(), usedTelepathy(state))
      return { ...state, g2: { ...state.g2, deck, active: { ...a, pair, q: item } } }
    }

    case 'g2Repick': {
      const a = state.g2.active
      if (!a || !a.pair) return state
      const members = state.teams[a.team].members
      let pair = shuffle(members).slice(0, 2)
      // 같은 조합이 연속으로 나오면 한 번 더 섞는다
      const same = (x, y) => x.slice().sort().join() === y.slice().sort().join()
      if (same(pair, a.pair)) pair = shuffle(members).slice(0, 2)
      return { ...state, g2: { ...state.g2, active: { ...a, pair } } }
    }

    case 'g2Requestion': {
      const a = state.g2.active
      if (!a) return state
      const { item, deck } = drawFrom(state.g2.deck, telepathyIds(), usedTelepathy(state))
      return { ...state, g2: { ...state.g2, deck, active: { ...a, q: item } } }
    }

    case 'g2Judge': {
      const a = state.g2.active
      if (!a || a.pair === null || a.q === null) return state
      const items = [...a.items, { pair: a.pair, q: a.q, matched: action.matched }]
      return { ...state, g2: { ...state.g2, active: { ...a, items, pair: null, q: null } } }
    }

    case 'g2Undo': {
      const a = state.g2.active
      if (!a || !a.items.length) return state
      return { ...state, g2: { ...state.g2, active: { ...a, items: a.items.slice(0, -1), pair: null, q: null } } }
    }

    case 'g2ShowResult':
      if (!state.g2.active) return state
      return { ...state, screen: 'g2-result' }

    case 'g2Commit': {
      const a = state.g2.active
      if (!a) return state
      const turn = { team: a.team, round: a.round, items: a.items }
      const turns = [...state.g2.turns.filter((t) => !(t.team === a.team && t.round === a.round)), turn]
      return { ...state, screen: 'g2-board', g2: { ...state.g2, turns, active: null } }
    }

    case 'g2Discard':
      return { ...state, screen: 'g2-board', g2: { ...state.g2, active: null } }

    case 'g2ResetTurn': {
      const cleaned = state.g2.turns.filter(
        (t) => !(t.team === action.team && t.round >= action.round),
      )
      return { ...state, g2: { ...state.g2, turns: cleaned, active: null } }
    }

    case 'g2ResetAll':
      return { ...state, g2: { deck: telepathyDeck(), turns: [], active: null } }

    // ================= 게임3: 양세찬 게임 =================
    case 'g3Generate': {
      const { A, B } = state.teams
      const ar = shuffle(A.members.filter((m) => m !== A.leader))
      const br = shuffle(B.members.filter((m) => m !== B.leader))
      const keep = new Map(state.g3.matches.map((m) => [m.round, m]))
      const build = (round, a, b) => {
        const prev = keep.get(round)
        if (action.keepDecided && prev && prev.winner) return prev
        return { round, a, b, winner: null }
      }
      return { ...state, g3: { matches: [build(1, A.leader, B.leader), build(2, ar[0], br[0]), build(3, ar[1], br[1])] } }
    }

    case 'g3SetWinner': {
      const matches = state.g3.matches.map((m) =>
        m.round === action.round ? { ...m, winner: m.winner === action.team ? null : action.team } : m,
      )
      return { ...state, g3: { matches } }
    }

    case 'g3ResetAll':
      return { ...state, g3: { matches: state.g3.matches.map((m) => ({ ...m, winner: null })) } }

    // ================= 게임4: 랜덤 순발력 퀴즈 =================
    case 'g4Prepare': {
      const round = nextQuickRound(state, action.team)
      if (!round) return state
      let deck = state.g4.deck
      const queue = []
      const used = usedQuick(state)
      for (let i = 0; i < G4_PER_ROUND; i++) {
        const r = drawFrom(deck, QUICK_POOL, [...used, ...queue])
        queue.push(r.item)
        deck = r.deck
      }
      return {
        ...state,
        screen: 'g4-play',
        g4: { ...state.g4, deck, active: { team: action.team, round, queue, idx: 0, results: [] } },
      }
    }

    case 'g4Judge': {
      const a = state.g4.active
      if (!a || a.idx >= a.queue.length) return state
      return {
        ...state,
        g4: {
          ...state.g4,
          active: { ...a, idx: a.idx + 1, results: [...a.results, { q: a.queue[a.idx], ok: action.ok }] },
        },
      }
    }

    // 진행자 실수 대비: 현재 문제를 다른 문제로 교체 (판정 없음)
    case 'g4Swap': {
      const a = state.g4.active
      if (!a || a.idx >= a.queue.length) return state
      const { item, deck } = drawFrom(state.g4.deck, QUICK_POOL, usedQuick(state))
      const queue = a.queue.map((q, i) => (i === a.idx ? item : q))
      return { ...state, g4: { ...state.g4, deck, active: { ...a, queue } } }
    }

    case 'g4Undo': {
      const a = state.g4.active
      if (!a || !a.results.length) return state
      return { ...state, g4: { ...state.g4, active: { ...a, idx: a.idx - 1, results: a.results.slice(0, -1) } } }
    }

    case 'g4ShowResult':
      if (!state.g4.active) return state
      return { ...state, screen: 'g4-result' }

    case 'g4BackToPlay':
      if (!state.g4.active) return state
      return { ...state, screen: 'g4-play' }

    case 'g4Commit': {
      const a = state.g4.active
      if (!a) return state
      const turn = { team: a.team, round: a.round, results: a.results }
      const turns = [...state.g4.turns.filter((t) => !(t.team === a.team && t.round === a.round)), turn]
      return { ...state, screen: 'g4-board', g4: { ...state.g4, turns, active: null } }
    }

    case 'g4Discard':
      return { ...state, screen: 'g4-board', g4: { ...state.g4, active: null } }

    case 'g4ResetTurn': {
      const cleaned = state.g4.turns.filter((t) => !(t.team === action.team && t.round >= action.round))
      return { ...state, g4: { ...state.g4, turns: cleaned, active: null } }
    }

    case 'g4ResetAll':
      return { ...state, g4: { deck: quickDeck(), turns: [], active: null } }

    // ================= 게임5: 캐치마인드 =================
    case 'g5Generate': {
      // 각 팀에서 모든 멤버가 정확히 G5_PER_MEMBER 번 뽑히도록 순서를 만든다.
      const seq = (team) =>
        shuffle(state.teams[team].members.flatMap((m) => Array(G5_PER_MEMBER).fill(m)))
      const a = seq('A')
      const b = seq('B')
      const keep = new Map(state.g5.pairs.map((p) => [p.round, p]))
      const pairs = a.map((na, i) => {
        const round = i + 1
        const prev = keep.get(round)
        if (action.keepDecided && prev && prev.winner) return prev
        return { round, a: na, b: b[i], winner: null }
      })
      return { ...state, g5: { ...state.g5, pairs, current: 0, strokes: [], penalty: { A: null, B: null } } }
    }

    case 'g5Open':
      return {
        ...state,
        screen: 'g5-play',
        g5: { ...state.g5, current: action.index, strokes: [], penalty: { A: null, B: null } },
      }

    // 오답 → 해당 팀만 30초 동안 발언권 정지 (절대시각으로 저장해 새로고침에도 유지)
    case 'g5Penalty':
      return {
        ...state,
        g5: { ...state.g5, penalty: { ...penaltyOf(state), [action.team]: Date.now() + G5_PENALTY_MS } },
      }

    case 'g5ClearPenalty':
      return {
        ...state,
        g5: {
          ...state.g5,
          penalty: action.team
            ? { ...penaltyOf(state), [action.team]: null }
            : { A: null, B: null },
        },
      }

    case 'g5Stroke':
      return { ...state, g5: { ...state.g5, strokes: [...state.g5.strokes, action.stroke] } }

    case 'g5UndoStroke':
      return { ...state, g5: { ...state.g5, strokes: state.g5.strokes.slice(0, -1) } }

    case 'g5ClearCanvas':
      return { ...state, g5: { ...state.g5, strokes: [] } }

    case 'g5Award': {
      const pairs = state.g5.pairs.map((p, i) =>
        i === state.g5.current ? { ...p, winner: p.winner === action.team ? null : action.team } : p,
      )
      return { ...state, g5: { ...state.g5, pairs } }
    }

    case 'g5AwardAt': {
      const pairs = state.g5.pairs.map((p, i) =>
        i === action.index ? { ...p, winner: p.winner === action.team ? null : action.team } : p,
      )
      return { ...state, g5: { ...state.g5, pairs } }
    }

    case 'g5Next': {
      const next = Math.min(state.g5.current + 1, state.g5.pairs.length - 1)
      return { ...state, g5: { ...state.g5, current: next, strokes: [], penalty: { A: null, B: null } } }
    }

    case 'g5ResetAll':
      return {
        ...state,
        g5: {
          pairs: state.g5.pairs.map((p) => ({ ...p, winner: null })),
          current: 0, strokes: [], penalty: { A: null, B: null },
        },
      }

    case 'resetAll':
      return initialState()

    default:
      return state
  }
}

// ---------- 되돌리기(진행자 실수 대비) ----------
const HISTORY_KEY = `${STORAGE_KEY}:history`
const HISTORY_MAX = 30

// 화면 이동이나 그림 획처럼 되돌릴 필요가 없는 동작은 히스토리에 쌓지 않는다.
const NO_HISTORY = new Set(['go', 'g5Stroke', 'g5Open', 'g4BackToPlay', 'g1ShowResult', 'g2ShowResult', 'g4ShowResult'])

const ACTION_LABEL = {
  setupTeams: '팀 배정', reshuffleTeams: '팀 다시 섞기',
  g1Prepare: '스피드 라운드 시작', g1SetExplainer: '설명자 지정', g1ToPlay: '스피드 준비 완료',
  g1Run: '스피드 시작', g1Pause: '일시정지', g1Judge: '스피드 판정', g1UndoJudge: '스피드 판정 취소',
  g1AdjustTime: '시간 조정', g1End: '스피드 종료', g1Commit: '스피드 결과 기록',
  g1Discard: '스피드 라운드 취소', g1ResetTurn: '스피드 기록 삭제', g1ResetAll: '스피드 전체 초기화',
  g2Start: '이심전심 세션 시작', g2Draw: '사람·문제 뽑기', g2Repick: '사람 다시 뽑기',
  g2Requestion: '문제 바꾸기', g2Judge: '이심전심 판정', g2Undo: '이심전심 판정 취소',
  g2Commit: '이심전심 결과 기록', g2Discard: '이심전심 세션 취소',
  g2ResetTurn: '이심전심 기록 삭제', g2ResetAll: '이심전심 전체 초기화',
  g3Generate: '양세찬 대결 구도 뽑기', g3SetWinner: '양세찬 승패 기록', g3ResetAll: '양세찬 승패 초기화',
  g4Prepare: '순발력 라운드 시작', g4Judge: '순발력 판정', g4Swap: '문제 교체',
  g4Undo: '순발력 판정 취소', g4Commit: '순발력 결과 기록', g4Discard: '순발력 라운드 취소',
  g4ResetTurn: '순발력 기록 삭제', g4ResetAll: '순발력 전체 초기화',
  g5Generate: '캐치마인드 대결 구도 뽑기', g5Award: '캐치마인드 득점', g5AwardAt: '캐치마인드 득점 수정',
  g5Penalty: '30초 정지', g5ClearPenalty: '정지 해제', g5UndoStroke: '그림 되돌리기',
  g5ClearCanvas: '그림 전체 지우기', g5Next: '다음 라운드', g5ResetAll: '캐치마인드 득점 초기화',
  resetAll: '전체 초기화',
}

function historyReducer({ present, past }, action) {
  if (action.type === 'undo') {
    if (!past.length) return { present, past }
    return { present: past[past.length - 1].state, past: past.slice(0, -1) }
  }
  const next = reducer(present, action)
  if (next === present) return { present, past }
  if (NO_HISTORY.has(action.type)) return { present: next, past }
  const label = ACTION_LABEL[action.type] ?? action.type
  return { present: next, past: [...past, { state: present, label }].slice(-HISTORY_MAX) }
}

// ---------- 저장/복구 ----------
function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const p = JSON.parse(raw)
    if (!p || p.v !== 1 || !p.g1 || !p.g2 || !p.g3 || !p.g4 || !p.g5) return null
    return p
  } catch {
    return null
  }
}

function loadHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    const h = raw ? JSON.parse(raw) : null
    return Array.isArray(h) ? h : []
  } catch {
    return []
  }
}

const Ctx = createContext(null)

export function GameProvider({ children }) {
  const [{ present: state, past }, dispatch] = useReducer(historyReducer, undefined, () => ({
    present: load() || initialState(),
    past: loadHistory(),
  }))

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      /* 저장에 실패해도 진행은 계속된다 */
    }
  }, [state])

  useEffect(() => {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(past))
    } catch {
      // 히스토리가 커서 저장이 안 되면 최근 5개만 남긴다
      try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(past.slice(-5)))
      } catch { /* 무시 */ }
    }
  }, [past])

  return <Ctx.Provider value={{ state, dispatch, undoLabel: past.length ? past[past.length - 1].label : null }}>{children}</Ctx.Provider>
}

export function useGame() {
  const v = useContext(Ctx)
  if (!v) throw new Error('GameProvider 안에서만 사용할 수 있습니다.')
  return v
}
