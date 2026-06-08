/* ============================================================
   RESERVATIONS — 예약 관리
   ============================================================ */
const Reservations = (function () {
  let filter = "upcoming"; // upcoming | today | all

  const STATUS = {
    "예약": "tag--amber",
    "완료": "tag--green",
    "취소": "tag--gray",
    "노쇼": "tag--red",
  };

  function render(el) {
    const today = U.todayISO();
    let list = DB.getReservations();
    if (filter === "today") list = list.filter((r) => r.date === today);
    else if (filter === "upcoming") list = list.filter((r) => r.date >= today && r.status === "예약");

    const todayCount = DB.getReservations().filter((r) => r.date === today).length;

    el.innerHTML = `
      <div class="page-head">
        <div>
          <h1>예약 관리</h1>
          <div class="sub">오늘 예약 ${todayCount}건</div>
        </div>
        <div class="head-actions">
          <button class="btn btn--primary" id="addRes">${IC("plus", 18)} 예약 등록</button>
        </div>
      </div>

      <div class="segment" style="margin-bottom:18px">
        <button data-f="upcoming" class="${filter === "upcoming" ? "is-active" : ""}">다가오는 예약</button>
        <button data-f="today" class="${filter === "today" ? "is-active" : ""}">오늘</button>
        <button data-f="all" class="${filter === "all" ? "is-active" : ""}">전체</button>
      </div>

      <div class="list">${list.length ? groupByDate(list) : empty()}</div>`;

    el.querySelector("#addRes").onclick = () => openForm();
    el.querySelectorAll("[data-f]").forEach((b) => (b.onclick = () => { filter = b.dataset.f; render(el); }));
    bind(el);
  }

  function groupByDate(list) {
    const groups = {};
    list.forEach((r) => { (groups[r.date] = groups[r.date] || []).push(r); });
    const dates = Object.keys(groups).sort();
    return dates.map((d) => `
      <div class="section-title" style="margin:18px 0 10px">${IC("calendar", 18)} ${U.fmtDateFull(d)}${d === U.todayISO() ? ' <span class="tag tag--dark">오늘</span>' : ""}</div>
      ${groups[d].sort((a, b) => (a.time || "").localeCompare(b.time || "")).map(card).join("")}
    `).join("");
  }

  function empty() {
    return `<div class="empty">
      <div class="empty__icon">${IC("calendar", 34)}</div>
      <div class="empty__text">예약이 없습니다</div>
      <div class="empty__sub">'예약 등록' 버튼으로 새 예약을 추가하세요</div>
    </div>`;
  }

  function card(r) {
    const m = r.memberId ? DB.getMember(r.memberId) : null;
    const name = m ? m.name : (r.name || "비회원");
    const phone = m ? m.phone : r.phone;
    return `<div class="row-card" data-edit="${r.id}">
      <div style="text-align:center;flex-shrink:0;width:58px">
        <div style="font-size:20px;font-weight:800;color:var(--rose-dark)">${U.esc(r.time || "--:--")}</div>
      </div>
      <div class="row-main">
        <div class="row-name">${U.esc(name)}
          <span class="tag ${STATUS[r.status] || "tag--gray"}">${U.esc(r.status)}</span>
        </div>
        <div class="row-sub">
          ${r.service ? `<span>${IC("scissors", 14)} ${U.esc(r.service)}</span>` : ""}
          ${r.designer ? `<span>${IC("user", 14)} ${U.esc(r.designer)}</span>` : ""}
          ${phone ? `<span>${IC("phone", 14)} ${U.esc(U.fmtPhone(phone))}</span>` : ""}
        </div>
      </div>
      <div class="row-actions" data-stop>
        ${r.status === "예약" ? `
          <button class="btn btn--primary btn--sm" data-done="${r.id}">${IC("check", 16)} 완료</button>
          <button class="btn btn--sm btn--ghost" data-cancel="${r.id}">취소</button>` : ""}
      </div>
    </div>`;
  }

  function bind(el) {
    el.querySelectorAll("[data-edit]").forEach((c) => {
      c.onclick = (e) => {
        if (e.target.closest("[data-stop]")) return;
        openForm(DB.getReservations().find((r) => r.id === c.dataset.edit));
      };
    });
    el.querySelectorAll("[data-done]").forEach((b) => (b.onclick = (e) => {
      e.stopPropagation();
      const r = DB.setReservationStatus(b.dataset.done, "완료");
      U.toast("완료 처리되었습니다", "ok");
      // 완료 시 시술 기록 작성 제안
      U.confirmModal("시술 기록 작성", "방문을 시술 이력으로 기록할까요?", () => {
        Visits.openForm({ memberId: r.memberId || undefined });
      }, { yesText: "기록하기" });
      App.refresh();
    }));
    el.querySelectorAll("[data-cancel]").forEach((b) => (b.onclick = (e) => {
      e.stopPropagation();
      DB.setReservationStatus(b.dataset.cancel, "취소");
      U.toast("예약이 취소되었습니다");
      App.refresh();
    }));
  }

  /* ---------- 예약 폼 ---------- */
  function openForm(res) {
    const isEdit = !!res;
    const r = res || {};
    const settings = DB.getSettings();
    const designerOpts = ['<option value="">선택</option>']
      .concat(settings.designers.map((d) => `<option ${r.designer === d ? "selected" : ""}>${U.esc(d)}</option>`)).join("");
    const svcDatalist = settings.services.map((s) => `<option value="${U.esc(s)}">`).join("");
    const statusOpts = Object.keys(STATUS).map((s) => `<option ${r.status === s ? "selected" : ""}>${s}</option>`).join("");

    U.openModal(`
      <div class="modal__head">
        <h2>${isEdit ? "예약 수정" : "예약 등록"}</h2>
        <button class="modal__close" data-close>×</button>
      </div>
      <form id="resForm">
        <div class="modal__body">
          <div class="field">
            <label>회원</label>
            <div id="rMemberPick"></div>
          </div>
          <div class="field-row" id="rNonMember" style="display:${r.memberId ? "none" : "grid"}">
            <div class="field"><label>이름</label><input name="name" value="${U.esc(r.name || "")}" placeholder="비회원 이름" /></div>
            <div class="field"><label>전화번호</label><input name="phone" inputmode="numeric" value="${U.esc(r.phone || "")}" placeholder="010-..." /></div>
          </div>
          <div class="field-row">
            <div class="field"><label>날짜 *</label><input name="date" type="date" required value="${U.esc(r.date || U.todayISO())}" /></div>
            <div class="field"><label>시간 *</label><input name="time" type="time" required value="${U.esc(r.time || "")}" /></div>
          </div>
          <div class="field-row">
            <div class="field">
              <label>시술</label>
              <datalist id="rSvcList">${svcDatalist}</datalist>
              <input name="service" list="rSvcList" value="${U.esc(r.service || "")}" placeholder="예: 펌, 염색" />
            </div>
            <div class="field"><label>디자이너</label><select name="designer">${designerOpts}</select></div>
          </div>
          ${isEdit ? `<div class="field"><label>상태</label><select name="status">${statusOpts}</select></div>` : ""}
          <div class="field"><label>메모</label><textarea name="memo" placeholder="요청 사항 등">${U.esc(r.memo || "")}</textarea></div>
        </div>
        <div class="modal__foot">
          ${isEdit ? `<button type="button" class="btn btn--danger" id="rDelete">삭제</button>` : `<button type="button" class="btn btn--ghost" data-close>취소</button>`}
          <button type="submit" class="btn btn--primary">${isEdit ? "저장" : "등록"}</button>
        </div>
      </form>`);

    const nm = document.getElementById("rNonMember");
    MemberPicker.create(document.getElementById("rMemberPick"), {
      id: "rMember", name: "memberId", selectedId: r.memberId,
      onChange: (mid) => { nm.style.display = mid ? "none" : "grid"; },
    });

    if (isEdit) {
      const del = document.getElementById("rDelete");
      if (del) del.onclick = () => U.confirmModal("예약 삭제", "이 예약을 삭제할까요?", () => {
        DB.deleteReservation(r.id);
        U.closeModal();
        U.toast("삭제되었습니다", "ok");
        App.refresh();
      }, { danger: true, yesText: "삭제" });
    }

    document.getElementById("resForm").onsubmit = (e) => {
      e.preventDefault();
      const data = U.formData(e.target);
      data.memberId = data.memberId || null;
      if (!data.date || !data.time) return U.toast("날짜와 시간을 입력하세요", "err");
      if (isEdit) { DB.updateReservation(r.id, data); U.toast("수정되었습니다", "ok"); }
      else { DB.addReservation(data); U.toast("예약이 등록되었습니다", "ok"); }
      U.closeModal();
      App.refresh();
    };
  }

  return { render, openForm };
})();
