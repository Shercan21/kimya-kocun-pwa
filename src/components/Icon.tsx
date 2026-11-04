// Küçük, bağımlılıksız çizgi ikon seti (24×24, 2px çizgi).
const paths: Record<string, string> = {
  flask: 'M9 3h6 M10 3v6l-5 9a2 2 0 0 0 1.7 3h10.6a2 2 0 0 0 1.7-3l-5-9V3 M7.5 15h9',
  home: 'M5 12l-2 0l9-9l9 9l-2 0 M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7 M9 21v-6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v6',
  book: 'M3 19a9 9 0 0 1 9 0a9 9 0 0 1 9 0 M3 6a9 9 0 0 1 9 0a9 9 0 0 1 9 0 M3 6v13 M12 6v13 M21 6v13',
  file: 'M14 3v4a1 1 0 0 0 1 1h4 M17 21h-10a2 2 0 0 1-2-2v-14a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2z M9 13h6 M9 17h6',
  repeat: 'M4 12v-3a3 3 0 0 1 3-3h13m-3-3l3 3l-3 3 M20 12v3a3 3 0 0 1-3 3h-13m3 3l-3-3l3-3',
  chart: 'M4 19l16 0 M4 15l4-6l4 2l4-5l4 4',
  target: 'M12 12m-1 0a1 1 0 1 0 2 0a1 1 0 1 0-2 0 M12 12m-5 0a5 5 0 1 0 10 0a5 5 0 1 0-10 0 M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0-18 0',
  play: 'M7 4v16l13-8z',
  check: 'M5 12l5 5l10-10',
  circle: 'M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0-18 0',
  circleCheck: 'M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0-18 0 M9 12l2 2l4-4',
  star: 'M12 17.75l-6.17 3.24l1.18-6.87l-5-4.86l6.9-1l3.09-6.25l3.09 6.25l6.9 1l-5 4.86l1.18 6.87z',
  lock: 'M5 13a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-10a2 2 0 0 1-2-2v-6z M11 16a1 1 0 1 0 2 0a1 1 0 0 0-2 0 M8 11v-4a4 4 0 1 1 8 0v4',
  pencil: 'M4 20h4l10.5-10.5a2.83 2.83 0 1 0-4-4l-10.5 10.5v4 M13.5 6.5l4 4',
  route: 'M3 19a2 2 0 1 0 4 0a2 2 0 0 0-4 0 M17 5a2 2 0 1 0 4 0a2 2 0 0 0-4 0 M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7h8.5',
  list: 'M3.5 5.5l1.5 1.5l2.5-2.5 M3.5 11.5l1.5 1.5l2.5-2.5 M3.5 17.5l1.5 1.5l2.5-2.5 M11 6l9 0 M11 12l9 0 M11 18l9 0',
  notebook: 'M6 4h11a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-11a1 1 0 0 1-1-1v-14a1 1 0 0 1 1-1m3 0v18 M13 8h2 M13 12h2',
  chevron: 'M6 9l6 6l6-6',
  cloud: 'M6.66 18c-2.3 0-4.16-1.8-4.16-4.03c0-2.22 1.86-4.02 4.16-4.02c.35-1.58 1.6-2.87 3.27-3.38c1.67-.5 3.5-.13 4.79 1c1.29 1.12 1.85 2.8 1.47 4.4h.88c1.66 0 3 1.33 3 3s-1.34 3.03-3 3.03h-10.4',
  users: 'M9 7m-4 0a4 4 0 1 0 8 0a4 4 0 1 0-8 0 M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2 M16 3.13a4 4 0 0 1 0 7.75 M21 21v-2a4 4 0 0 0-3-3.85',
  plus: 'M12 5l0 14 M5 12l14 0',
  calendar: 'M4 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-12a2 2 0 0 1-2-2v-12z M16 3v4 M8 3v4 M4 11h16',
  tools: 'M3 21h4l13-13a1.5 1.5 0 0 0-4-4l-13 13v4 M14.5 5.5l4 4',
}

export type IconName = keyof typeof paths

export default function Icon({
  name,
  size = 20,
}: {
  name: IconName
  size?: number
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      <path d={paths[name]} />
    </svg>
  )
}
