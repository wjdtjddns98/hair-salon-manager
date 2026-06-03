/* ============================================================
   UTILS — 포맷, 모달, 토스트, 공통 헬퍼
   ============================================================ */
const U = (function () {

  /* ---------- 포맷 ---------- */
  function won(n) {
    return "₩" + Number(n || 0).toLocaleString("ko-KR");
  }
  function num(n) {
    return Number(n || 0).toLocaleString("ko-KR");
  }
  function todayISO() {
    const d = new Date();
    const off = d.getTimezoneOffset();
    return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
  }
  function nowTime() {
    const d = new Date();
    return String(d.getHours()).padStart(2, "0") + ":" + String(Math.round(d.getMinutes() / 10) * 10 % 60).padStart(2, "0");
  }
  function fmtDate(iso) {
    if (!iso) return "-";
    const [y, m, d] = iso.split("-");
    return `${m}월 ${d}일`;
  }
  function fmtDateFull(iso) {
    if (!iso) return "-";
    const [y, m, d] = iso.split("-");
    const wk = ["일", "월", "화", "수", "목", "금", "토"];
    const day = new Date(iso + "T00:00:00").getDay();
    return `${y}.${m}.${d} (${wk[day]})`;
  }
  function relDate(iso) {
    if (!iso) return "방문 기록 없음";
    const diff = Math.floor((new Date(todayISO()) - new Date(iso)) / 86400000);
    if (diff <= 0) return "오늘";
    if (diff === 1) return "어제";
    if (diff < 30) return `${diff}일 전`;
    if (diff < 365) return `${Math.floor(diff / 30)}개월 전`;
    return `${Math.floor(diff / 365)}년 전`;
  }
  function initial(name) {
    return (name || "?").trim().charAt(0).toUpperCase();
  }
  function fmtPhone(p) {
    const d = (p || "").replace(/\D/g, "");
    if (d.length === 11) return d.replace(/(\d{3})(\d{4})(\d{4})/, "$1-$2-$3");
    if (d.length === 10) return d.replace(/(\d{3})(\d{3})(\d{4})/, "$1-$2-$3");
    return p || "";
  }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }
  function age(birthday) {
    if (!birthday) return null;
    const b = new Date(birthday);
    const t = new Date();
    let a = t.getFullYear() - b.getFullYear();
    const mm = t.getMonth() - b.getMonth();
    if (mm < 0 || (mm === 0 && t.getDate() < b.getDate())) a--;
    return a >= 0 && a < 150 ? a : null;
  }

  /* ---------- 토스트 ---------- */
  function toast(msg, type = "") {
    const wrap = document.getElementById("toastWrap");
    const el = document.createElement("div");
    el.className = "toast" + (type ? " toast--" + type : "");
    const icon = type === "ok" ? "✓" : type === "err" ? "✕" : "ℹ";
    el.innerHTML = `<span>${icon}</span><span>${esc(msg)}</span>`;
    wrap.appendChild(el);
    setTimeout(() => {
      el.style.opacity = "0";
      el.style.transform = "translateY(10px)";
      el.style.transition = "0.25s";
      setTimeout(() => el.remove(), 260);
    }, 2200);
  }

  /* ---------- 모달 ---------- */
  function openModal(html) {
    const bd = document.getElementById("modalBackdrop");
    const modal = document.getElementById("modal");
    modal.innerHTML = html;
    bd.hidden = false;
    document.body.style.overflow = "hidden";
    // 닫기 버튼 / 배경 클릭
    bd.onclick = (e) => { if (e.target === bd) closeModal(); };
    modal.querySelectorAll("[data-close]").forEach((b) => (b.onclick = closeModal));
    const firstInput = modal.querySelector("input,select,textarea");
    if (firstInput) setTimeout(() => firstInput.focus(), 60);
  }
  function closeModal() {
    const bd = document.getElementById("modalBackdrop");
    bd.hidden = true;
    document.getElementById("modal").innerHTML = "";
    document.body.style.overflow = "";
  }

  function confirmModal(title, msg, onYes, opts = {}) {
    openModal(`
      <div class="modal__head"><h2>${esc(title)}</h2></div>
      <div class="modal__body"><p style="font-size:15px;line-height:1.6;color:var(--ink-soft)">${esc(msg)}</p></div>
      <div class="modal__foot">
        <button class="btn btn--ghost" data-close>취소</button>
        <button class="btn ${opts.danger ? "btn--danger" : "btn--primary"}" id="cfYes">${esc(opts.yesText || "확인")}</button>
      </div>`);
    document.getElementById("cfYes").onclick = () => { closeModal(); onYes(); };
  }

  /* ---------- 폼 헬퍼 ---------- */
  function formData(form) {
    const data = {};
    form.querySelectorAll("[name]").forEach((el) => {
      data[el.name] = el.value;
    });
    return data;
  }

  return {
    won, num, todayISO, nowTime, fmtDate, fmtDateFull, relDate, initial, fmtPhone, esc, age,
    toast, openModal, closeModal, confirmModal, formData,
  };
})();
