// 문제 데이터는 전부 /data 폴더의 JSON에서 읽어 온다.
// 게임 로직을 건드리지 않고 JSON만 고쳐도 문제를 바꿀 수 있다.
import speedWords from '../../data/speed-words.json'
import telepathy from '../../data/telepathy.json'
import proverbs from '../../data/proverbs.json'
import people from '../../data/people.json'

export const SPEED_WORDS = speedWords.words
export const TELEPATHY_QUESTIONS = telepathy.questions
export const PROVERBS = proverbs.proverbs
export const PEOPLE = people.people

export const DATA_STATS = {
  speedWords: SPEED_WORDS.length,
  telepathy: TELEPATHY_QUESTIONS.length,
  proverbs: PROVERBS.length,
  people: PEOPLE.length,
  quickTotal: PROVERBS.length + PEOPLE.length,
}
