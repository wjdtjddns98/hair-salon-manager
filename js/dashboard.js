/* ============================================================
   DASHBOARD — 홈 화면 (오늘 요약)
   ============================================================ */
const Dashboard = (function () {
  function render(el) {
    const today = U.todayISO();
    const settings = DB.getSettings();
    const members = DB.getMembers();
    const visits = DB.getVisits();
    const reservations = DB.getReservations();

    const todayRes = reservations.filter((r) => r.date === today && r.status === "예약")
      .sort((a, b) => (a.time || "").localeCompare(b.time || ""));
    const todayVisits = visits.filter((v) => v.date === today);
    const todayRev = todayVisits.reduce((s, v) => s + (v.payable || 0), 0);
    const monthRev = visits.filter((v) => v.date.startsWith(today.slice(0, 7))).reduce((s, v) => s + (v.payable || 0), 0);

    // 이번 달 생일 회원
    const bdayMembers = members.filter((m) => m.birthday && m.birthday.slice(5, 7) === today.slice(5, 7));

    const hour = new Date().getHours();
    const greet = hour < 11 ? "좋은 아침이에요" : hour < 17 ? "오늘도 화이팅이에요" : "마무리 잘 하세요";

    el.innerHTML = `
      <div class="hero">
        <div class="hero__bg"></div>
        <div class="hero__content">
          <div>
            <div class="hero__greet">${greet}</div>
            <h1 class="hero__title">${U.esc(settings.salonName)}</h1>
            <div class="hero__date">${U.fmtDateFull(today)}</div>
          </div>
          <div class="hero__actions">
            <button class="btn" data-quick="visit">${IC("scissors", 18)} 시술 기록</button>
            <button class="btn" data-quick="res">${IC("calendar", 18)} 예약 등록</button>
          </div>
        </div>
      </div>

      <div class="stat-grid">
        <div class="stat-tile stat-tile--rose">
          <div class="stat-tile__icon">${IC("won", 22)}</div>
          <div class="stat-tile__label">오늘 매출</div>
          <div class="stat-tile__value">${U.won(todayRev)}</div>
        </div>
        <div class="stat-tile">
          <div class="stat-tile__icon">${IC("calendar", 22)}</div>
          <div class="stat-tile__label">오늘 예약</div>
          <div class="stat-tile__value">${todayRes.length}<small>건</small></div>
        </div>
        <div class="stat-tile">
          <div class="stat-tile__icon">${IC("scissors", 22)}</div>
          <div class="stat-tile__label">오늘 방문</div>
          <div class="stat-tile__value">${todayVisits.length}<small>명</small></div>
        </div>
        <div class="stat-tile">
          <div class="stat-tile__icon">${IC("trending", 22)}</div>
          <div class="stat-tile__label">이번 달 매출</div>
          <div class="stat-tile__value">${U.won(monthRev)}</div>
        </div>
      </div>

      <div class="cards" style="grid-template-columns:repeat(auto-fit,minmax(300px,1fr));align-items:start">
        <div class="card">
          <div class="section-title" style="margin:0 0 14px">${IC("calendar", 19)} 오늘의 예약</div>
          ${todayRes.length ? `<div class="list">${todayRes.map(resRow).join("")}</div>`
            : `<div class="empty" style="padding:30px"><div class="empty__icon">${IC("coffee", 34)}</div><div class="empty__sub" style="margin-top:8px">오늘 예약이 없습니다</div></div>`}
        </div>

        <div class="card">
          <div class="section-title" style="margin:0 0 14px">${IC("cake", 19)} 이번 달 생일 회원</div>
          ${bdayMembers.length ? `<div class="mini-list">${bdayMembers.map((m) => `
            <div class="mini-item">
              <div class="mini-item__main">${U.esc(m.name)}
                <span class="mini-item__sub" style="display:inline">· ${U.esc(m.birthday.slice(5).replace("-", "/"))}</span>
              </div>
              <span class="tag">${U.num(m.points)}P</span>
            </div>`).join("")}</div>`
            : `<div class="empty" style="padding:30px"><div class="empty__sub">이번 달 생일 회원이 없습니다</div></div>`}
          <div style="margin-top:14px;display:flex;gap:12px;text-align:center">
            <div class="card" style="flex:1;background:var(--rose-bg);box-shadow:none;padding:14px">
              <div class="stat-tile__label" style="margin:0">전체 회원</div>
              <div class="amount" style="font-size:22px;margin-top:2px">${members.length}명</div>
            </div>
            <div class="card" style="flex:1;background:var(--rose-bg);box-shadow:none;padding:14px">
              <div class="stat-tile__label" style="margin:0">누적 시술</div>
              <div class="amount" style="font-size:22px;margin-top:2px">${visits.length}건</div>
            </div>
          </div>
        </div>
      </div>`;

    el.querySelectorAll("[data-quick]").forEach((b) => (b.onclick = () => {
      if (b.dataset.quick === "visit") Visits.openForm();
      else Reservations.openForm();
    }));
    el.querySelectorAll("[data-done]").forEach((b) => (b.onclick = () => {
      DB.setReservationStatus(b.dataset.done, "완료");
      U.toast("완료 처리되었습니다", "ok");
      App.refresh();
    }));
  }

  function resRow(r) {
    const m = r.memberId ? DB.getMember(r.memberId) : null;
    const name = m ? m.name : (r.name || "비회원");
    return `<div class="row-card" style="padding:12px 14px">
      <div style="text-align:center;width:52px;flex-shrink:0">
        <div style="font-size:17px;font-weight:800;color:var(--ink)">${U.esc(r.time || "--:--")}</div>
      </div>
      <div class="row-main">
        <div class="row-name" style="font-size:15px">${U.esc(name)}</div>
        <div class="row-sub">${r.service ? U.esc(r.service) : ""}${r.designer ? " · " + U.esc(r.designer) : ""}</div>
      </div>
      <button class="btn btn--primary btn--sm" data-done="${r.id}">${IC("check", 16)} 완료</button>
    </div>`;
  }

  return { render };
})();
