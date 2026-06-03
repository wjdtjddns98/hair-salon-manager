/* ============================================================
   APP — 라우터 / 초기화
   ============================================================ */
const App = (function () {
  let current = "dashboard";

  const views = {
    dashboard: Dashboard,
    members: Members,
    reservations: Reservations,
    visits: Visits,
    stats: Stats,
    settings: Settings,
  };

  function navigate(view) {
    if (!views[view]) view = "dashboard";
    current = view;
    // 네비 활성화 표시
    document.querySelectorAll(".nav__item").forEach((b) =>
      b.classList.toggle("is-active", b.dataset.view === view));
    renderNow(); // 화면 전환은 즉시 렌더
    document.getElementById("main").scrollTop = 0;
  }

  function renderNow() {
    const el = document.getElementById("view");
    el.innerHTML = "";
    try {
      views[current].render(el);
    } catch (e) {
      console.error(e);
      el.innerHTML = `<div class="empty"><div class="empty__icon">⚠️</div><div class="empty__text">화면을 불러오지 못했습니다</div><div class="empty__sub">${U.esc(e.message)}</div></div>`;
    }
  }

  // 성능: 짧은 시간에 여러 번(특히 실시간 동기화 수신) 들어오는 refresh 를 모아 한 번만 렌더
  let refreshTimer = null;
  function refresh() {
    if (refreshTimer) return;
    refreshTimer = requestAnimationFrame(() => { refreshTimer = null; renderNow(); });
  }

  function updateBrand() {
    const s = DB.getSettings();
    document.getElementById("brandName").textContent = s.salonName;
    document.title = s.salonName + " · 회원관리";
  }

  // FAB(모바일 빠른 추가): 현재 화면에 맞는 추가 동작
  function quickAdd() {
    if (current === "reservations") Reservations.openForm();
    else if (current === "visits") Visits.openForm();
    else if (current === "members") Members.openForm();
    else Visits.openForm(); // 홈/통계/설정에서는 시술 기록
  }

  function paintIcons() {
    if (typeof IC !== "function") return;
    document.querySelectorAll(".nav__icon[data-icon]").forEach((s) => (s.innerHTML = IC(s.dataset.icon, 23)));
    const fab = document.getElementById("fab");
    if (fab && fab.dataset.icon) fab.innerHTML = IC(fab.dataset.icon, 26);
    const logo = document.getElementById("navLogo");
    if (logo) logo.innerHTML = IC("scissors", 26);
  }

  function init() {
    updateBrand();
    paintIcons();
    document.querySelectorAll(".nav__item").forEach((b) =>
      (b.onclick = () => navigate(b.dataset.view)));
    const fab = document.getElementById("fab");
    if (fab) fab.onclick = quickAdd;
    navigate("dashboard");
    if (window.Lock) Lock.check();                 // 잠금(PIN) 확인
    if (window.Cloud && Cloud.init) Cloud.init();   // 클라우드 동기화 시작
  }

  return { navigate, refresh, renderNow, updateBrand, init };
})();
// cloud.js 등에서 window.App 가드로 참조 가능하도록 노출
window.App = App;

document.addEventListener("DOMContentLoaded", App.init);
