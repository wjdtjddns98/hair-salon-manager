/* ============================================================
   LOCK — 앱 잠금 (PIN) 화면
   - 설정에서 4자리 PIN 을 등록하면, 앱을 열 때 PIN 을 요구
   - PIN 은 해시(SHA-256)로만 저장 (평문 저장 안 함)
   - 한 번 풀면 같은 세션(탭) 동안 유지, 앱을 새로 켜면 다시 요구
   - PIN 은 설정(settings)에 저장되어 모든 기기가 공유
   ============================================================ */
const Lock = (function () {
  let buffer = "";
  const SESSION_KEY = "salon_unlocked";

  async function hash(pin) {
    const data = new TextEncoder().encode("salon-pin:" + pin);
    const buf = await crypto.subtle.digest("SHA-256", data);
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  function hasPin() { return !!DB.getSettings().pinHash; }
  function isUnlocked() { return sessionStorage.getItem(SESSION_KEY) === "1"; }
  function markUnlocked() { sessionStorage.setItem(SESSION_KEY, "1"); }

  // 앱 시작/설정 변경 시 호출 — 필요하면 잠금 표시
  function check() {
    if (hasPin() && !isUnlocked()) show();
    else hide();
  }

  function show() {
    const el = document.getElementById("lockScreen");
    if (!el) return;
    buffer = "";
    el.hidden = false;
    el.innerHTML = `
      <div class="lock__logo">${typeof IC === "function" ? IC("scissors", 38) : "✂"}</div>
      <div class="lock__title">${U.esc(DB.getSettings().salonName || "미용실 회원관리")}</div>
      <div class="lock__sub">PIN 번호를 입력하세요</div>
      <div class="lock__dots">${[0,1,2,3].map(() => `<div class="lock__dot"></div>`).join("")}</div>
      <div class="lock__msg" id="lockMsg"></div>
      <div class="keypad">${keypad()}</div>`;
    el.querySelectorAll("[data-k]").forEach((b) => (b.onclick = () => press(b.dataset.k)));
  }
  function hide() { const el = document.getElementById("lockScreen"); if (el) el.hidden = true; }

  function keypad() {
    return [1,2,3,4,5,6,7,8,9,"",0,"del"].map((k) => {
      if (k === "") return `<button class="keypad__blank"></button>`;
      if (k === "del") return `<button data-k="del">⌫</button>`;
      return `<button data-k="${k}">${k}</button>`;
    }).join("");
  }

  function dots() {
    document.querySelectorAll("#lockScreen .lock__dot").forEach((d, i) =>
      d.classList.toggle("filled", i < buffer.length));
  }

  async function press(k) {
    if (k === "del") { buffer = buffer.slice(0, -1); dots(); return; }
    if (buffer.length >= 4) return;
    buffer += k; dots();
    if (buffer.length === 4) {
      const h = await hash(buffer);
      if (h === DB.getSettings().pinHash) { markUnlocked(); hide(); }
      else fail("PIN이 올바르지 않습니다");
    }
  }

  function fail(msg) {
    const el = document.getElementById("lockScreen");
    el.classList.add("shake");
    const m = document.getElementById("lockMsg");
    if (m) m.textContent = msg;
    setTimeout(() => { el.classList.remove("shake"); buffer = ""; dots(); }, 460);
  }

  /* ---------- 설정에서 사용 ---------- */
  async function setPin(pin) {
    const h = await hash(pin);
    DB.updateSettings({ pinHash: h });
    markUnlocked();
  }
  function clearPin() {
    DB.updateSettings({ pinHash: "" });
    hide();
  }

  return { check, hasPin, setPin, clearPin, show };
})();
window.Lock = Lock;
