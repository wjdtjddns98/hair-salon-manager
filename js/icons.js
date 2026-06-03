/* ============================================================
   ICONS — 세련된 SVG 라인 아이콘 (Lucide 스타일, 모노크롬)
   사용: IC("home") 또는 IC("home", 20)
   ============================================================ */
const ICONS = {
  home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20a1 1 0 0 0 1 1h3v-6h6v6h3a1 1 0 0 0 1-1V9.5"/>',
  users: '<circle cx="9" cy="8" r="3.2"/><path d="M3.5 20a5.5 5.5 0 0 1 11 0"/><path d="M16 5.2a3.2 3.2 0 0 1 0 5.9"/><path d="M17.5 14.3A5.5 5.5 0 0 1 20.5 19.5"/>',
  calendar: '<rect x="3.5" y="5" width="17" height="16" rx="2.5"/><path d="M3.5 9.5h17"/><path d="M8 3v3M16 3v3"/>',
  scissors: '<circle cx="6" cy="6" r="2.6"/><circle cx="6" cy="18" r="2.6"/><path d="M8.1 7.9 20 18"/><path d="M8.1 16.1 20 6"/><path d="M8.1 7.9 13 12l-4.9 4.1"/>',
  chart: '<path d="M4 20V4"/><path d="M4 20h16"/><rect x="7" y="12" width="3" height="5" rx="0.6"/><rect x="12.5" y="8" width="3" height="9" rx="0.6"/><rect x="18" y="5" width="3" height="12" rx="0.6" transform="translate(-0.5 0)"/>',
  settings: '<line x1="4" y1="7" x2="20" y2="7"/><line x1="4" y1="17" x2="20" y2="17"/><circle cx="9" cy="7" r="2.6"/><circle cx="15" cy="17" r="2.6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  won: '<circle cx="12" cy="12" r="9"/><path d="M7.5 9 9.5 15l2.5-5 2.5 5 2-6"/><path d="M6.8 11.2h10.4"/>',
  wallet: '<rect x="3" y="6" width="18" height="14" rx="2.5"/><path d="M3 10h18"/><circle cx="16.5" cy="14.5" r="1.2"/>',
  trending: '<path d="M3 17 9.5 10.5l4 4L21 7"/><path d="M16 7h5v5"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  check: '<path d="M5 12.5 10 17.5 19.5 7"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  trash: '<path d="M4 7h16"/><path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/><path d="M6 7v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7"/><path d="M10 11v6M14 11v6"/>',
  edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
  star: '<path d="m12 3 2.6 5.6 6 .7-4.4 4.1 1.2 6L12 16.8 6.6 19.5l1.2-6L3.4 9.3l6-.7Z"/>',
  crown: '<path d="M4 18h16"/><path d="M4 18 3 7l5 4 4-6 4 6 5-4-1 11Z"/>',
  gift: '<path d="M20 12v8a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-8"/><path d="M2.5 8h19v4h-19z"/><path d="M12 8v13"/><path d="M12 8S10.5 4 8.2 4a2.2 2.2 0 0 0 0 4.4Z"/><path d="M12 8s1.5-4 3.8-4a2.2 2.2 0 0 1 0 4.4Z"/>',
  gem: '<path d="M5 8h14l-7 12Z"/><path d="M5 8 8 4h8l3 4"/><path d="m9 4-1 4 4 12 4-12-1-4"/>',
  cake: '<path d="M4 20h16"/><path d="M5 20v-7a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v7"/><path d="M4 15c1.5 1.2 3 1.2 4 0s2.5-1.2 4 0 2.5 1.2 4 0 2.5-1.2 4 0"/><path d="M12 7V4M9 7V5M15 7V5"/>',
  coffee: '<path d="M5 9h11v5a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4Z"/><path d="M16 10h2.5a2.5 2.5 0 0 1 0 5H16"/><path d="M8 3v2M11.5 3v2"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  phone: '<path d="M6.5 4h3l1.5 4-2 1.5a11 11 0 0 0 5 5l1.5-2 4 1.5v3a2 2 0 0 1-2.2 2A16 16 0 0 1 4.5 6.2 2 2 0 0 1 6.5 4Z"/>',
  user: '<circle cx="12" cy="8" r="3.5"/><path d="M5.5 20a6.5 6.5 0 0 1 13 0"/>',
  lock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  cloud: '<path d="M7 18a4 4 0 0 1-.5-7.97 5.5 5.5 0 0 1 10.6-1.04A4 4 0 0 1 17 18Z"/>',
  store: '<path d="M4 9V5h16v4"/><path d="M4 9a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0"/><path d="M5 11v9h14v-9"/><path d="M10 20v-5h4v5"/>',
  sparkle: '<path d="M12 3 13.4 9 19 10.4 13.4 11.8 12 18 10.6 11.8 5 10.4 10.6 9Z"/>',
};

function IC(name, size) {
  const p = ICONS[name];
  if (!p) return "";
  const s = size || 22;
  return `<svg class="ic" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
}
window.IC = IC;
