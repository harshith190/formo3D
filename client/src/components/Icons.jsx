const paths = {
  bag: <><path d="M5 8h14l-1 12H6L5 8Z" /><path d="M9 8V6a3 3 0 0 1 6 0v2" /></>,
  heart: <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z" />,
  search: <><circle cx="11" cy="11" r="6" /><path d="m20 20-4.2-4.2" /></>,
  user: <><circle cx="12" cy="8" r="3.5" /><path d="M5 20a7 7 0 0 1 14 0" /></>,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
  arrowLeft: <path d="M19 12H5M11 6l-6 6 6 6" />,
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  filter: <path d="M4 6h16M7 12h10M10 18h4" />,
  eye: <><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" /><circle cx="12" cy="12" r="2.8" /></>,
  star: <path d="m12 3.8 2.5 5.2 5.6.7-4.1 3.9 1 5.6L12 16.5l-5 2.7 1-5.6-4.1-3.9 5.6-.7L12 3.8Z" />,
  upload: <><path d="M12 15V4M7 9l5-5 5 5" /><path d="M4 15v4h16v-4" /></>,
  truck: <><path d="M3 6h11v10H3zM14 10h4l3 3v3h-7" /><circle cx="7" cy="17.5" r="1.8" /><circle cx="17" cy="17.5" r="1.8" /></>,
  menu: <path d="M4 8h16M4 16h16" />,
  box: <><path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z" /><path d="m4 7.5 8 4.5 8-4.5M12 12v9" /></>,
  grid: <path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z" />,
  chart: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />,
  tag: <><path d="M3 12V4h8l10 10-8 8L3 12Z" /><circle cx="7.5" cy="8" r="1.4" /></>,
  bulb: <><path d="M9 18h6M10 21h4" /><path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3Z" /></>,
  users: <><circle cx="9" cy="8" r="3.2" /><path d="M3 20a6 6 0 0 1 12 0M16 4.5a3 3 0 0 1 0 6M21 20a5.5 5.5 0 0 0-3.5-5.2" /></>,
  message: <path d="M4 5h16v11H9l-5 4V5Z" />,
  mail: <><path d="M3 6h18v12H3z" /><path d="m3 7 9 6 9-6" /></>,
  logout: <><path d="M10 4H5v16h5" /><path d="M14 8l4 4-4 4M18 12H9" /></>,
  trash: <><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" /></>,
  edit: <path d="M4 20h4L19 9l-4-4L4 16v4ZM13 7l4 4" />,
  image: <><path d="M3 5h18v14H3z" /><circle cx="8.5" cy="10" r="1.8" /><path d="m3 17 5-4 4 3 4-5 5 5" /></>,
  external: <path d="M14 4h6v6M20 4l-9 9M18 14v6H4V6h6" />,
};

export default function Icon({ name, size = 20, className = '', fill = false, label }) {
  return (
    <svg
      className={`icon ${className}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={fill ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={label ? undefined : true}
      role={label ? 'img' : undefined}
      aria-label={label}
    >
      {paths[name]}
    </svg>
  );
}
