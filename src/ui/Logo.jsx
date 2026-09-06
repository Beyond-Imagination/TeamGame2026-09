import { useState } from 'react'

/**
 * Beyond_Imagination 로고.
 * public/logo.svg 를 쓰고, 파일이 없을 때만 아래 대체 도형을 그린다.
 */
export default function Logo({ size = 56 }) {
  const [ok, setOk] = useState(true)

  if (ok) {
    return (
      <img
        className="logo"
        src="./logo.svg"
        alt="Beyond_Imagination"
        width={size}
        height={size}
        onError={() => setOk(false)}
      />
    )
  }

  return (
    <svg className="logo" width={size} height={size} viewBox="0 0 200 200" role="img" aria-label="Beyond_Imagination">
      <circle cx="100" cy="100" r="96" fill="var(--navy)" />
      <g fill="#fff">
        <polygon points="158,44 100,84 128,95" />
        <polygon points="158,44 128,95 124,124" />
      </g>
    </svg>
  )
}
