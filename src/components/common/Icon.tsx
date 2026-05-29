import React from 'react';

interface IconProps {
  name: string;
  size?: number;
  color?: string;
  className?: string;
}

const ICONS: Record<string, string> = {
  plus: 'M12 4v16m-8-8h16',
  back: 'M15 19l-7-7 7-7',
  search: 'M21 21l-5.2-5.2M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16z',
  close: 'M18 6L6 18M6 6l12 12',
  menu: 'M3 12h18M3 6h18M3 18h18',
  settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z',
  pin: 'M9 4v6l-2 4v2h10v-2l-2-4V4M12 16v5M8 4h8',
  stats: 'M3 3v18h18M7 12v5M12 8v9M17 5v12',
  archive: 'M21 8v13H3V8M1 3h22v5H1zM10 12h4',
  trash: 'M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14H6L5 6M10 11v6M14 11v6',
  tag: 'M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82zM7 7h.01',
  note: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8',
  more: 'M12 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2zM19 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2zM5 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2z',
  chevronRight: 'M9 18l6-6-6-6',
  chevronDown: 'M6 9l6 6 6-6',
  export: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3',
  bold: 'M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6zM6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z',
  italic: 'M19 4h-9M14 20H5M15 4L9 20',
  underline: 'M6 3v7a6 6 0 0 0 6 6 6 6 0 0 0 6-6V3M4 21h16',
  strikethrough: 'M16 4H9a3 3 0 0 0 0 6h6a3 3 0 0 1 0 6H8M4 12h16',
  highlight: 'M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z',
  heading: 'M4 12h8M4 18V6M12 18V6',
  heading1: 'M3 12h7M3 18V6M10 18V6M15 18V8l-2 2M15 8h4',
  heading2: 'M3 12h7M3 18V6M10 18V6M15 10a2 2 0 1 1 4 0c0 1.5-4 3-4 5h4',
  heading3: 'M3 12h7M3 18V6M10 18V6M15 10a2 2 0 0 1 2-2h0a2 2 0 0 1 2 2c0 1-1 1.5-2 2 1 .5 2 1 2 2a2 2 0 0 1-2 2h0a2 2 0 0 1-2-2',
  list: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
  orderedList: 'M10 6h11M10 12h11M10 18h11M4 6h1v4M4 10h2M6 18H4c0-1 2-2 2-3s-1-1.5-2-1',
  taskList: 'M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11',
  quote: 'M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V21zM15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 .75 0 1 1 1z',
  code: 'M16 18l6-6-6-6M8 6l-6 6 6 6',
  link: 'M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71',
  divider: 'M5 12h14',
  image: 'M19 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2zM8.5 10a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM21 15l-5-5L5 21',
  camera: 'M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  table: 'M3 3h18v18H3zM3 9h18M3 15h18M9 3v18M15 3v18',
  pencil: 'M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z',
  focus: 'M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7',
  focusOff: 'M21 9V3h-6M3 15v6h6M15 9l6-6M9 15l-6 6',
};

export function Icon({ name, size = 20, color = 'currentColor', className }: IconProps) {
  const path = ICONS[name];
  if (!path) return null;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={{ flexShrink: 0 }}
    >
      <path d={path} />
    </svg>
  );
}
