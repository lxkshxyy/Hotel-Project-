import { useId } from 'react'

type Kind = 'facade' | 'room' | 'bath' | 'dining' | 'city'

interface Props {
  hue: number
  kind?: Kind
  className?: string
  label?: string
  photo?: string
}

/**
 * Placeholder artwork used until the client's real photos are added.
 * Pass `photo` to show a real image instead.
 */
export default function HotelArt({ hue, kind = 'facade', className = '', label, photo }: Props) {
  const id = useId().replace(/:/g, '')
  if (photo) {
    return <img src={photo} alt={label ?? ''} loading="lazy" className={`h-full w-full object-cover ${className}`} />
  }
  const sky = `hsl(${hue} 55% 88%)`
  const sky2 = `hsl(${(hue + 30) % 360} 60% 94%)`
  const mid = `hsl(${hue} 35% 62%)`
  const deep = `hsl(${hue} 40% 34%)`
  const warm = `hsl(${(hue + 160) % 360} 70% 72%)`

  return (
    <div className={`relative h-full w-full overflow-hidden ${className}`} role={label ? 'img' : undefined} aria-label={label}>
      <svg viewBox="0 0 400 260" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full" aria-hidden="true">
        <defs>
          <linearGradient id={`g${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={sky2} />
            <stop offset="1" stopColor={sky} />
          </linearGradient>
        </defs>
        <rect width="400" height="260" fill={`url(#g${id})`} />
        {kind === 'facade' && (
          <g>
            <circle cx="330" cy="58" r="26" fill={warm} opacity="0.75" />
            <rect x="70" y="70" width="190" height="190" rx="6" fill="#fff" opacity="0.92" />
            <rect x="70" y="62" width="190" height="16" rx="4" fill={deep} />
            {[0, 1, 2, 3].map((r) =>
              [0, 1, 2, 3].map((c) => (
                <rect key={`${r}${c}`} x={88 + c * 42} y={92 + r * 38} width="28" height="22" rx="3" fill={mid} opacity={(r + c) % 3 === 0 ? 0.55 : 0.9} />
              )),
            )}
            <rect x="145" y="226" width="40" height="34" rx="3" fill={deep} />
            <rect x="268" y="150" width="70" height="110" rx="6" fill="#fff" opacity="0.7" />
            <path d="M0 238 C80 222 140 248 220 236 S340 226 400 240 V260 H0Z" fill={mid} opacity="0.45" />
            <g fill={deep} opacity="0.8">
              <rect x="32" y="190" width="5" height="60" />
              <circle cx="34" cy="186" r="18" opacity="0.7" />
              <rect x="356" y="176" width="5" height="74" />
              <circle cx="358" cy="172" r="20" opacity="0.7" />
            </g>
          </g>
        )}
        {kind === 'room' && (
          <g>
            <rect x="0" y="180" width="400" height="80" fill={mid} opacity="0.35" />
            <rect x="250" y="40" width="110" height="90" rx="6" fill="#fff" opacity="0.85" />
            <path d="M262 120 L300 70 L330 100 L348 84 L348 120Z" fill={mid} opacity="0.6" />
            <rect x="50" y="110" width="200" height="34" rx="8" fill={deep} />
            <rect x="40" y="140" width="230" height="56" rx="10" fill="#fff" />
            <rect x="40" y="176" width="230" height="22" rx="6" fill={mid} opacity="0.55" />
            <rect x="62" y="122" width="70" height="26" rx="10" fill="#fff" opacity="0.95" />
            <rect x="148" y="122" width="70" height="26" rx="10" fill="#fff" opacity="0.95" />
            <rect x="290" y="160" width="60" height="40" rx="6" fill={deep} opacity="0.8" />
            <circle cx="320" cy="150" r="12" fill={warm} />
          </g>
        )}
        {kind === 'bath' && (
          <g>
            <rect x="0" y="0" width="400" height="260" fill="#fff" opacity="0.35" />
            {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
              <line key={i} x1={i * 50} y1="0" x2={i * 50} y2="160" stroke={mid} strokeOpacity="0.25" />
            ))}
            <rect x="60" y="150" width="200" height="70" rx="30" fill="#fff" stroke={mid} strokeOpacity="0.4" />
            <rect x="290" y="60" width="64" height="84" rx="10" fill="#fff" stroke={mid} strokeOpacity="0.4" />
            <circle cx="322" cy="168" r="18" fill="#fff" stroke={mid} strokeOpacity="0.4" />
            <path d="M200 150 V110 a14 14 0 0 1 28 0" stroke={deep} strokeWidth="6" fill="none" />
          </g>
        )}
        {kind === 'dining' && (
          <g>
            <circle cx="200" cy="170" r="70" fill="#fff" />
            <circle cx="200" cy="170" r="48" fill={warm} opacity="0.6" />
            <circle cx="180" cy="160" r="12" fill={deep} opacity="0.5" />
            <circle cx="216" cy="182" r="14" fill={mid} />
            <rect x="96" y="110" width="8" height="120" rx="4" fill={deep} />
            <rect x="296" y="110" width="8" height="120" rx="4" fill={deep} />
            <rect x="60" y="40" width="80" height="50" rx="25" fill="#fff" opacity="0.7" />
          </g>
        )}
        {kind === 'city' && (
          <g>
            <circle cx="300" cy="70" r="30" fill={warm} opacity="0.8" />
            {[
              [20, 120, 50],
              [80, 90, 44],
              [132, 140, 60],
              [200, 70, 40],
              [248, 110, 56],
              [312, 130, 70],
            ].map(([x, y, w], i) => (
              <rect key={i} x={x} y={y} width={w} height={260 - y} rx="4" fill={i % 2 ? deep : mid} opacity={i % 2 ? 0.75 : 0.9} />
            ))}
          </g>
        )}
      </svg>
    </div>
  )
}
