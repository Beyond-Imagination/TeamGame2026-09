import { createContext, useCallback, useContext, useEffect, useState } from 'react'

/**
 * 앱 자체 확인창.
 * 브라우저 window.confirm 은 "추가 대화상자 차단"이 걸리면 항상 false 를 돌려주기 때문에
 * 초기화·삭제 버튼이 조용히 먹통이 된다. 그래서 직접 만들어 쓴다.
 */
const Ctx = createContext(null)

export function ConfirmProvider({ children }) {
  const [req, setReq] = useState(null)

  const ask = useCallback(
    (opts) =>
      new Promise((resolve) => {
        setReq({ ...(typeof opts === 'string' ? { message: opts } : opts), resolve })
      }),
    [],
  )

  const close = useCallback(
    (value) => {
      setReq((cur) => {
        cur?.resolve(value)
        return null
      })
    },
    [],
  )

  useEffect(() => {
    if (!req) return
    const onKey = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); close(false) }
      else if (e.key === 'Enter') { e.preventDefault(); close(true) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [req, close])

  return (
    <Ctx.Provider value={ask}>
      {children}
      {req && (
        <div className="overlay" onClick={() => close(false)}>
          <div className="card confirm" onClick={(e) => e.stopPropagation()}>
            <h2>{req.title ?? '확인해 주세요'}</h2>
            <p className="confirm-msg">{req.message}</p>
            <div className="row center" style={{ marginTop: 22 }}>
              <button className="btn ghost" onClick={() => close(false)}>
                취소 <span className="kbd">Esc</span>
              </button>
              <button
                className={`btn lg ${req.danger ? 'no' : 'primary'}`}
                autoFocus
                onClick={() => close(true)}
              >
                {req.confirmLabel ?? '확인'} <span className="kbd">Enter</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </Ctx.Provider>
  )
}

export function useConfirm() {
  const ask = useContext(Ctx)
  if (!ask) throw new Error('ConfirmProvider 안에서만 사용할 수 있습니다.')
  return ask
}
