/**
 * אייקונים כ-SVG מוטבע. אין ספריית אייקונים — כל אייקון הוא כמה עשרות בתים,
 * והכל נשאר זמין אופליין בלי בקשת רשת.
 */

type Props = { className?: string };

const base = 'h-6 w-6';
const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

const Svg = ({ className = base, children }: Props & { children: React.ReactNode }) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...stroke}>
    {children}
  </svg>
);

export const IconHome = (p: Props) => (
  <Svg {...p}>
    <path d="M3 10.5 12 3l9 7.5" />
    <path d="M5 9.5V21h14V9.5" />
  </Svg>
);

export const IconHistory = (p: Props) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3.5 2" />
  </Svg>
);

export const IconSettings = (p: Props) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="3.2" />
    <path d="M12 2.5v2.2M12 19.3v2.2M4.2 4.2l1.6 1.6M18.2 18.2l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.2 19.8l1.6-1.6M18.2 5.8l1.6-1.6" />
  </Svg>
);

export const IconPlus = (p: Props) => (
  <Svg {...p}>
    <path d="M12 5v14M5 12h14" />
  </Svg>
);

export const IconMinus = (p: Props) => (
  <Svg {...p}>
    <path d="M5 12h14" />
  </Svg>
);

export const IconCheck = (p: Props) => (
  <Svg {...p}>
    <path d="M4.5 12.5 9.5 17.5 19.5 7" />
  </Svg>
);

/** חץ "חזרה" — ב-RTL הוא מצביע ימינה. */
export const IconBack = (p: Props) => (
  <Svg {...p}>
    <path d="M9 5l7 7-7 7" />
  </Svg>
);

export const IconChevronLeft = (p: Props) => (
  <Svg {...p}>
    <path d="M15 5l-7 7 7 7" />
  </Svg>
);

export const IconChevronDown = (p: Props) => (
  <Svg {...p}>
    <path d="M5 9l7 7 7-7" />
  </Svg>
);

export const IconTrash = (p: Props) => (
  <Svg {...p}>
    <path d="M4 7h16M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13" />
  </Svg>
);

export const IconPencil = (p: Props) => (
  <Svg {...p}>
    <path d="M4 20h4L19.5 8.5a2.1 2.1 0 0 0-3-3L5 17v3z" />
  </Svg>
);

export const IconGrip = (p: Props) => (
  <svg viewBox="0 0 24 24" className={p.className ?? base} aria-hidden="true" fill="currentColor">
    <circle cx="9" cy="6" r="1.6" />
    <circle cx="15" cy="6" r="1.6" />
    <circle cx="9" cy="12" r="1.6" />
    <circle cx="15" cy="12" r="1.6" />
    <circle cx="9" cy="18" r="1.6" />
    <circle cx="15" cy="18" r="1.6" />
  </svg>
);

export const IconSearch = (p: Props) => (
  <Svg {...p}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="M16 16l4.5 4.5" />
  </Svg>
);

export const IconX = (p: Props) => (
  <Svg {...p}>
    <path d="M6 6l12 12M18 6L6 18" />
  </Svg>
);

export const IconPlay = (p: Props) => (
  <svg viewBox="0 0 24 24" className={p.className ?? base} aria-hidden="true" fill="currentColor">
    <path d="M8 5.5v13l11-6.5z" />
  </svg>
);

export const IconNote = (p: Props) => (
  <Svg {...p}>
    <path d="M5 4h14v16H5z" />
    <path d="M8.5 9h7M8.5 13h7M8.5 17h4" />
  </Svg>
);

export const IconFlame = (p: Props) => (
  <Svg {...p}>
    <path d="M12 3s5 4.2 5 8.6a5 5 0 0 1-10 0C7 9.5 9 8 9 8s.5 2 1.5 2S12 6 12 3z" />
  </Svg>
);

export const IconTrophy = (p: Props) => (
  <Svg {...p}>
    <path d="M7 4h10v5a5 5 0 0 1-10 0z" />
    <path d="M7 5.5H4.5V7A3 3 0 0 0 7 10M17 5.5h2.5V7A3 3 0 0 1 17 10" />
    <path d="M12 14v3M9 20h6M10 17h4" />
  </Svg>
);

export const IconTimer = (p: Props) => (
  <Svg {...p}>
    <circle cx="12" cy="13.5" r="7.5" />
    <path d="M12 9.5v4M9.5 2.5h5" />
  </Svg>
);

export const IconDownload = (p: Props) => (
  <Svg {...p}>
    <path d="M12 3.5v11M7.5 10.5L12 15l4.5-4.5" />
    <path d="M4.5 18.5v2h15v-2" />
  </Svg>
);

export const IconUpload = (p: Props) => (
  <Svg {...p}>
    <path d="M12 15.5v-11M7.5 8.5L12 4l4.5 4.5" />
    <path d="M4.5 18.5v2h15v-2" />
  </Svg>
);

export const IconChart = (p: Props) => (
  <Svg {...p}>
    <path d="M4 20V4M4 20h16" />
    <path d="M7.5 16l3.5-4.5 3 2.5 4-6.5" />
  </Svg>
);
