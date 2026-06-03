/* ============================================================
   SETTINGS — 설정 (매장정보, 적립률, 디자이너/시술, 보안)
   ============================================================ */
const Settings = (function () {
  function render(el) {
    const s = DB.getSettings();
    const pinOn = !!s.pinHash;
    const cloudOn = typeof CONFIG !== "undefined" && CONFIG.cloud && CONFIG.cloud.enabled;

    el.innerHTML = `
      <div class="page-head"><div><h1>설정</h1><div class="sub">매장 정보와 보안을 관리합니다</div></div></div>

      <div class="card" style="margin-bottom:18px">
        <div class="section-title" style="margin:0 0 14px">${IC("store", 19)} 매장 정보</div>
        <div class="field-row">
          <div class="field"><label>매장 이름</label><input id="setName" value="${U.esc(s.salonName)}" maxlength="30" /></div>
          <div class="field"><label>포인트 적립률 (%)</label><input id="setRate" type="number" inputmode="numeric" min="0" max="100" value="${s.pointRate}" /></div>
        </div>
        <div class="field-hint" style="margin:-6px 0 14px">커트는 적립 대상에서 자동 제외됩니다 (10회 무료 스탬프로 적립).</div>
        <button class="btn btn--primary btn--sm" id="saveInfo">매장 정보 저장</button>
      </div>

      <div class="cards" style="grid-template-columns:repeat(auto-fit,minmax(300px,1fr));align-items:start;margin-bottom:18px">
        <div class="card">
          <div class="section-title" style="margin:0 0 14px">${IC("user", 19)} 디자이너 관리</div>
          <div id="designerList">${chips(s.designers, "designer")}</div>
          <div class="svc-row" style="grid-template-columns:1fr 76px;margin-top:14px">
            <input id="newDesigner" placeholder="새 디자이너 이름" maxlength="20" />
            <button class="btn btn--primary btn--sm" id="addDesigner">추가</button>
          </div>
        </div>
        <div class="card">
          <div class="section-title" style="margin:0 0 14px">${IC("scissors", 19)} 시술 메뉴 관리</div>
          <div id="serviceList">${chips(s.services, "service")}</div>
          <div class="svc-row" style="grid-template-columns:1fr 76px;margin-top:14px">
            <input id="newService" placeholder="새 시술명" maxlength="20" />
            <button class="btn btn--primary btn--sm" id="addService">추가</button>
          </div>
        </div>
      </div>

      <div class="card" style="margin-bottom:18px">
        <div class="section-title" style="margin:0 0 8px">${IC("lock", 19)} 앱 잠금 (PIN)</div>
        <p class="field-hint" style="line-height:1.65;margin-bottom:14px">
          4자리 PIN을 설정하면 앱을 열 때 잠금이 걸립니다. 매장 기기를 외부인이 함부로 보지 못하게 막아줍니다.
          ${cloudOn ? "PIN은 모든 기기에 공통 적용됩니다." : ""}
        </p>
        <div class="head-actions">
          ${pinOn
            ? `<span class="tag tag--dark" style="padding:9px 14px;font-size:13.5px">${IC("lock", 14)} 잠금 사용 중</span>
               <button class="btn btn--sm" id="changePin">PIN 변경</button>
               <button class="btn btn--danger btn--sm" id="removePin">잠금 해제</button>`
            : `<button class="btn btn--primary btn--sm" id="setPin">${IC("plus", 16)} 앱 잠금 설정</button>`}
        </div>
      </div>

      <div class="card">
        <div class="section-title" style="margin:0 0 8px">${IC("cloud", 19)} 데이터 보관</div>
        <p class="field-hint" style="line-height:1.65">
          ${cloudOn
            ? "데이터는 클라우드에 자동 저장되고 모든 기기에서 실시간 공유됩니다. 별도 백업이 필요 없습니다."
            : "데이터는 이 기기에 저장됩니다. 여러 기기에서 공유하려면 클라우드 연결을 설정하세요. (클라우드설정.md 참고)"}
        </p>
      </div>`;

    // 매장 정보 저장
    el.querySelector("#saveInfo").onclick = () => {
      const name = el.querySelector("#setName").value.trim();
      let rate = Number(el.querySelector("#setRate").value);
      if (!Number.isFinite(rate)) rate = 0;
      rate = Math.max(0, Math.min(100, Math.round(rate)));
      DB.updateSettings({ salonName: name || "우리 미용실", pointRate: rate });
      U.toast("저장되었습니다", "ok");
      App.updateBrand();
      render(el);
    };

    // 디자이너 / 시술 추가
    const addItem = (key, inputId) => {
      const input = el.querySelector("#" + inputId);
      const val = input.value.trim();
      if (!val) return;
      const field = key === "designer" ? "designers" : "services";
      const cur = DB.getSettings()[field];
      if (cur.includes(val)) return U.toast("이미 있습니다", "err");
      cur.push(val);
      DB.updateSettings({ [field]: cur });
      render(el);
    };
    el.querySelector("#addDesigner").onclick = () => addItem("designer", "newDesigner");
    el.querySelector("#addService").onclick = () => addItem("service", "newService");
    el.querySelector("#newDesigner").onkeydown = (e) => { if (e.key === "Enter") addItem("designer", "newDesigner"); };
    el.querySelector("#newService").onkeydown = (e) => { if (e.key === "Enter") addItem("service", "newService"); };

    // 칩 삭제
    el.querySelectorAll("[data-remove]").forEach((b) => (b.onclick = () => {
      const { kind, val } = b.dataset;
      const field = kind === "designer" ? "designers" : "services";
      const cur = DB.getSettings()[field].filter((x) => x !== val);
      DB.updateSettings({ [field]: cur });
      render(el);
    }));

    // 보안 (PIN)
    const setBtn = el.querySelector("#setPin");
    if (setBtn) setBtn.onclick = () => pinModal(false, el);
    const chgBtn = el.querySelector("#changePin");
    if (chgBtn) chgBtn.onclick = () => pinModal(true, el);
    const rmBtn = el.querySelector("#removePin");
    if (rmBtn) rmBtn.onclick = () =>
      U.confirmModal("잠금 해제", "앱 잠금을 해제할까요? 더 이상 PIN을 묻지 않습니다.", () => {
        Lock.clearPin();
        U.toast("잠금이 해제되었습니다", "ok");
        render(el);
      }, { danger: true, yesText: "해제" });
  }

  /* PIN 설정/변경 모달 */
  function pinModal(isChange, el) {
    U.openModal(`
      <div class="modal__head"><h2>${isChange ? "PIN 변경" : "앱 잠금 설정"}</h2><button class="modal__close" data-close>×</button></div>
      <form id="pinForm">
        <div class="modal__body">
          <div class="field">
            <label>새 PIN (숫자 4자리)</label>
            <input name="pin1" type="password" inputmode="numeric" maxlength="4" placeholder="••••" autocomplete="off"
              style="letter-spacing:10px;font-size:22px;text-align:center" />
          </div>
          <div class="field">
            <label>PIN 확인</label>
            <input name="pin2" type="password" inputmode="numeric" maxlength="4" placeholder="••••" autocomplete="off"
              style="letter-spacing:10px;font-size:22px;text-align:center" />
            <div class="field-error" id="pinErr">PIN이 일치하지 않습니다</div>
          </div>
        </div>
        <div class="modal__foot">
          <button type="button" class="btn btn--ghost" data-close>취소</button>
          <button type="submit" class="btn btn--primary">저장</button>
        </div>
      </form>`);
    const form = document.getElementById("pinForm");
    [...form.querySelectorAll("input")].forEach((i) =>
      (i.oninput = () => { i.value = i.value.replace(/\D/g, ""); }));
    form.onsubmit = async (e) => {
      e.preventDefault();
      const p1 = form.pin1.value, p2 = form.pin2.value;
      const err = document.getElementById("pinErr");
      if (p1.length !== 4) { err.textContent = "PIN은 숫자 4자리여야 합니다"; err.classList.add("show"); return; }
      if (p1 !== p2) { err.textContent = "PIN이 일치하지 않습니다"; err.classList.add("show"); return; }
      await Lock.setPin(p1);
      U.closeModal();
      U.toast(isChange ? "PIN이 변경되었습니다" : "앱 잠금이 설정되었습니다", "ok");
      render(el);
    };
  }

  function chips(arr, kind) {
    if (!arr.length) return `<div class="field-hint" style="padding:8px 0">등록된 항목이 없습니다</div>`;
    return `<div style="display:flex;flex-wrap:wrap;gap:8px">${arr.map((x) => `
      <span class="tag tag--gray" style="font-size:14px;padding:9px 13px">
        ${U.esc(x)}
        <button data-remove data-kind="${kind}" data-val="${U.esc(x)}" style="margin-left:5px;font-weight:800;color:var(--red);font-size:15px">×</button>
      </span>`).join("")}</div>`;
  }

  return { render };
})();
