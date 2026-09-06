export function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

/** 덱에서 한 장 뽑는다. 덱이 비면 exclude(현재 턴에서 이미 쓴 것)를 뺀 전체에서 다시 채운다. */
export function drawFrom(deck, all, exclude = []) {
  let rest = deck
  if (rest.length === 0) {
    const ex = new Set(exclude)
    rest = shuffle(all.filter((x) => !ex.has(x)))
    if (rest.length === 0) rest = shuffle(all)
  }
  return { item: rest[0], deck: rest.slice(1) }
}

export const fmtTime = (ms) => {
  const s = Math.max(0, Math.ceil(ms / 1000))
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

/**
 * 두 보기에서 공통된 앞/뒤 단어를 떼어 낸다.
 * '계란은 완숙' vs '계란은 반숙' → { prefix: '계란은', a: '완숙', b: '반숙' }
 * '고기는 내가 굽는다' vs '고기는 남이 굽는다' → prefix '고기는', suffix '굽는다'
 */
export function splitCommon(a, b) {
  const A = a.split(' ').filter(Boolean)
  const B = b.split(' ').filter(Boolean)
  let i = 0
  while (i < A.length - 1 && i < B.length - 1 && A[i] === B[i]) i++
  let j = 0
  while (
    j < A.length - i - 1 && j < B.length - i - 1 &&
    A[A.length - 1 - j] === B[B.length - 1 - j]
  ) j++
  return {
    prefix: A.slice(0, i).join(' '),
    suffix: j ? A.slice(A.length - j).join(' ') : '',
    a: A.slice(i, A.length - j).join(' '),
    b: B.slice(i, B.length - j).join(' '),
  }
}
