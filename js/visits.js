/* ============================================================
   VISITS — 방문 / 시술 이력
   ============================================================ */
const Visits = (function () {
  let search = "";

  function render(el) {
    let list = DB.getVisits();
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (v) =>
          (v.memberName || "").toLowerCase().includes(q) ||
          v.services.some((s) => s.name.toLowerCase().includes(q)) ||
          (v.designer || "").toLowerCase().includes(q)
      );
    }

    const totalRevenue = DB.getVisits().reduce((s, v) => s + (v.payable || 0), 0);

    el.innerHTML = `
      <div class="page-head">
        <div>
          <h1>방문 / 시술 이력</h1>
          <div class="sub">총 ${DB.getVisits().length}건 · 누적 매출 ${U.won(totalRevenue)}</div>
        </div>
        <div class="head-actions">
          <button class="btn btn--primary" id="addVisit">${IC("plus", 18)} 시술 기록</button>
        </div>
      </div>

      <div class="search" style="margin-bottom:16px;max-width:420px">
        <span class="search__icon">${IC("search", 18)}</span>
        <input id="visitSearch" placeholder="회원명, 시술, 디자이너 검색" value="${U.esc(search)}" />
      </div>

      <div class="list" id="visitList">
        ${list.length ? list.map(card).join("") : empty(q)}
      </div>`;

    el.querySelector("#addVisit").onclick = () => openForm();
    const si = el.querySelector("#visitSearch");
    si.oninput = () => {
      search = si.value;
      let l = DB.getVisits();
      const qq = search.trim().toLowerCase();
      if (qq) l = l.filter((v) => (v.memberName || "").toLowerCase().includes(qq) || v.services.some((s) => s.name.toLowerCase().includes(qq)) || (v.designer || "").toLowerCase().includes(qq));
      const cont = el.querySelector("#visitList");
      cont.innerHTML = l.length ? l.map(card).join("") : empty(qq);
      bind(el);
    };
    bind(el);
  }

  function empty(q) {
    return `<div class="empty">
      <div class="empty__icon">${IC("scissors", 34)}</div>
      <div class="empty__text">${q ? "검색 결과가 없습니다" : "시술 이력이 없습니다"}</div>
      <div class="empty__sub">${q ? "" : "'시술 기록' 버튼으로 방문을 기록하세요"}</div>
    </div>`;
  }

  function card(v) {
    return `<div class="row-card">
      <div class="avatar">${U.esc(U.initial(v.memberName))}</div>
      <div class="row-main">
        <div class="row-name">${U.esc(v.memberName || "비회원")}
          ${v.designer ? `<span class="tag tag--blue">${U.esc(v.designer)}</span>` : ""}
        </div>
        <div class="row-sub">
          <span>${v.services.map((s) => U.esc(s.name) + (s.free ? " " + IC("gift", 13) : "")).join(", ") || "시술"}</span>
          <span>${IC("calendar", 14)} ${U.fmtDateFull(v.date)}</span>
          ${v.freeCutCount ? `<span class="tag tag--green">무료커트 사용</span>` : ""}
        </div>
      </div>
      <div class="row-side">
        <div class="amount">${U.won(v.payable)}</div>
        <div class="row-sub" style="justify-content:flex-end">
          ${v.pointsUsed ? `<span class="tag tag--red">-${v.pointsUsed}P</span>` : ""}
          ${v.pointsEarned ? `<span class="tag" style="background:var(--rose-bg);color:var(--gold)">+${v.pointsEarned}P</span>` : ""}
        </div>
      </div>
      <button class="btn btn--danger btn--sm" data-del="${v.id}">삭제</button>
    </div>`;
  }

  function bind(el) {
    el.querySelectorAll("[data-del]").forEach((b) => {
      b.onclick = () => {
        const id = b.dataset.del;
        U.confirmModal("시술 기록 삭제", "이 기록을 삭제할까요? 회원 누적 매출·포인트가 함께 조정됩니다.", () => {
          DB.deleteVisit(id);
          U.toast("삭제되었습니다", "ok");
          App.refresh();
        }, { danger: true, yesText: "삭제" });
      };
    });
  }

  /* ---------- 시술 기록 폼 ---------- */
  function openForm(preset = {}) {
    const settings = DB.getSettings();
    const members = DB.getMembers();
    const memberOpts = ['<option value="">비회원 / 직접입력</option>']
      .concat(members.map((m) => `<option value="${m.id}" ${preset.memberId === m.id ? "selected" : ""}>${U.esc(m.name)} (${U.fmtPhone(m.phone) || "번호없음"})</option>`))
      .join("");
    const designerOpts = ['<option value="">선택</option>']
      .concat(settings.designers.map((d) => `<option>${U.esc(d)}</option>`)).join("");
    const svcDatalist = settings.services.map((s) => `<option value="${U.esc(s)}">`).join("");

    U.openModal(`
      <div class="modal__head">
        <h2>시술 기록</h2>
        <button class="modal__close" data-close>×</button>
      </div>
      <form id="visitForm">
        <div class="modal__body">
          <div class="field-row">
            <div class="field">
              <label>회원</label>
              <select name="memberId" id="vMember">${memberOpts}</select>
            </div>
            <div class="field">
              <label>방문일</label>
              <input name="date" type="date" value="${U.todayISO()}" required />
            </div>
          </div>
          <div class="field" id="nonMemberName" style="display:${preset.memberId ? "none" : "block"}">
            <label>비회원 이름 (선택)</label>
            <input name="memberName" placeholder="비회원" />
          </div>
          <div class="field">
            <label>담당 디자이너</label>
            <select name="designer">${designerOpts}</select>
          </div>

          <div class="field">
            <label>시술 내역</label>
            <datalist id="svcList">${svcDatalist}</datalist>
            <div id="svcRows"></div>
            <button type="button" class="btn btn--ghost btn--sm" id="addSvc" style="width:100%;margin-top:4px">＋ 시술 추가</button>
          </div>

          <div id="cutInfo"></div>

          <div class="field-row">
            <div class="field">
              <label>포인트 사용</label>
              <input name="pointsUsed" id="vPoints" type="number" inputmode="numeric" value="0" min="0" />
              <div class="field-error" id="vPointsErr"></div>
            </div>
            <div class="field">
              <label>적립률</label>
              <input value="${settings.pointRate}% 자동 적립" disabled />
            </div>
          </div>

          <div class="card" style="background:var(--rose-tint);box-shadow:none;border:none;padding:16px">
            <div class="kv"><span>시술 합계</span><span id="sumTotal">₩0</span></div>
            <div class="kv"><span>포인트 사용</span><span id="sumUsed" style="color:var(--red)">-₩0</span></div>
            <div class="divider" style="margin:8px 0"></div>
            <div class="kv"><span style="font-weight:800">결제 금액</span><span id="sumPay" style="color:var(--rose-deep);font-size:18px">₩0</span></div>
            <div class="kv"><span>적립 예정</span><span id="sumEarn" style="color:var(--gold)">+0P</span></div>
            <div id="earnNote" class="field-hint" style="display:none;margin-top:2px">커트는 적립 제외 (10회 무료 스탬프로 적립돼요)</div>
          </div>

          <div class="field" style="margin-top:14px">
            <label>메모</label>
            <textarea name="memo" placeholder="시술 상세, 사용 제품 등"></textarea>
          </div>
        </div>
        <div class="modal__foot">
          <button type="button" class="btn btn--ghost" data-close>취소</button>
          <button type="submit" class="btn btn--primary">저장</button>
        </div>
      </form>`);

    const form = document.getElementById("visitForm");
    const rows = document.getElementById("svcRows");
    const isCut = (n) => !!n && n.indexOf("커트") !== -1;

    // 무료 커트 사용 여부 (체크박스가 존재하고 체크됐을 때)
    function freeCutOn() {
      const cb = document.getElementById("useFreeCut");
      return !!(cb && cb.checked);
    }

    function addRow(name = "", price = "") {
      const div = document.createElement("div");
      div.className = "svc-row";
      div.innerHTML = `
        <input list="svcList" class="svc-name" placeholder="시술명" value="${U.esc(name)}" />
        <input class="svc-price" type="number" inputmode="numeric" placeholder="금액" value="${price}" />
        <button type="button" class="btn btn--danger btn--sm svc-del">×</button>`;
      rows.appendChild(div);
      div.querySelector(".svc-del").onclick = () => { div.remove(); updateCutInfo(); recalc(); };
      div.querySelector(".svc-name").oninput = () => { updateCutInfo(); recalc(); };
      div.querySelector(".svc-price").oninput = recalc;
    }

    function recalc() {
      const free = freeCutOn();
      let total = 0, nonCutTotal = 0, freeApplied = false, hasCut = false;
      rows.querySelectorAll(".svc-row").forEach((r) => {
        const name = r.querySelector(".svc-name").value.trim();
        let price = Number(r.querySelector(".svc-price").value) || 0;
        // 무료 커트 사용 시 첫 커트 1건을 0원으로 계산
        if (free && !freeApplied && isCut(name)) { price = 0; freeApplied = true; }
        total += price;
        if (isCut(name)) hasCut = true; else nonCutTotal += price;
      });
      // 포인트 사용 검증: 보유 포인트를 초과할 수 없음
      const pInput = document.getElementById("vPoints");
      const pErr = document.getElementById("vPointsErr");
      const rawPoints = Math.max(0, Number(pInput.value) || 0);
      const curM = DB.getMember(document.getElementById("vMember").value);
      if (pErr) {
        if (curM && rawPoints > curM.points) {
          pErr.textContent = `보유 포인트(${U.num(curM.points)}P)를 초과했습니다`;
          pErr.classList.add("show");
          pInput.classList.add("invalid");
        } else {
          pErr.classList.remove("show");
          pInput.classList.remove("invalid");
        }
      }
      // 합계 계산엔 보유 포인트와 시술 합계로 안전하게 캡
      const heldCap = curM ? Math.min(rawPoints, curM.points) : rawPoints;
      const used = Math.min(heldCap, total);
      const pay = Math.max(0, total - used);
      // 포인트 적립은 커트 제외 금액 기준
      const earn = Math.round((Math.max(0, nonCutTotal - used) * settings.pointRate) / 100);
      document.getElementById("sumTotal").textContent = U.won(total);
      document.getElementById("sumUsed").textContent = "-" + U.won(used);
      document.getElementById("sumPay").textContent = U.won(pay);
      document.getElementById("sumEarn").textContent = "+" + earn + "P";
      const note = document.getElementById("earnNote");
      if (note) note.style.display = hasCut ? "block" : "none";
    }

    // 선택된 회원의 커트 적립 현황 + 무료 커트 사용 UI 표시
    function updateCutInfo() {
      const box = document.getElementById("cutInfo");
      const m = DB.getMember(document.getElementById("vMember").value);
      const hasCut = [...rows.querySelectorAll(".svc-name")].some((i) => isCut(i.value));
      if (!m) { box.innerHTML = ""; return; }
      const ci = DB.cutInfo(m);
      const dots = Array.from({ length: 10 }, (_, i) => (i < ci.stamps ? "●" : "○")).join(" ");
      const wasChecked = freeCutOn();
      box.innerHTML = `
        <div class="field">
          <label>커트 적립 (10회 시 1회 무료)</label>
          <div class="card" style="background:var(--rose-bg);box-shadow:none;padding:13px;border:1.5px solid var(--line-2)">
            <div style="letter-spacing:2px;font-size:17px;color:var(--rose)">${dots}</div>
            <div class="row-sub" style="margin-top:6px">
              <span>현재 <b>${ci.stamps}/10</b></span>
              ${ci.available > 0 ? `<span class="tag tag--dark">${IC("gift", 13)} 무료 커트 ${ci.available}장 보유</span>` : ""}
            </div>
            ${ci.available > 0 ? `
              <label style="display:flex;align-items:center;gap:9px;margin-top:11px;font-weight:700;cursor:pointer">
                <input type="checkbox" id="useFreeCut" style="width:20px;height:20px" ${wasChecked ? "checked" : ""} ${hasCut ? "" : "disabled"} />
                이번 커트를 무료로 사용 ${hasCut ? "" : '<span class="row-sub" style="font-weight:500">(커트 시술 추가 시 활성화)</span>'}
              </label>` : ""}
          </div>
        </div>`;
      const cb = document.getElementById("useFreeCut");
      if (cb) cb.onchange = recalc;
    }

    addRow();
    document.getElementById("addSvc").onclick = () => addRow();
    document.getElementById("vPoints").oninput = recalc;

    // 회원 선택 시 비회원 이름 필드 토글 + 보유 포인트 안내 + 커트 현황
    const mSel = document.getElementById("vMember");
    const nmField = document.getElementById("nonMemberName");
    mSel.onchange = () => {
      const mid = mSel.value;
      nmField.style.display = mid ? "none" : "block";
      const m = DB.getMember(mid);
      const pInput = document.getElementById("vPoints");
      pInput.parentElement.querySelector("label").textContent =
        m ? `포인트 사용 (보유 ${U.num(m.points)}P)` : "포인트 사용";
      updateCutInfo();
      recalc();
    };
    if (preset.memberId) mSel.dispatchEvent(new Event("change"));

    form.onsubmit = (e) => {
      e.preventDefault();
      const data = U.formData(form);
      const mid = data.memberId || null;
      const m = DB.getMember(mid);

      // 무료 커트 사용: 첫 커트 1건을 0원 + free 처리
      const free = freeCutOn();
      const services = [];
      let freeApplied = false;
      rows.querySelectorAll(".svc-row").forEach((r) => {
        const name = r.querySelector(".svc-name").value.trim();
        let price = Number(r.querySelector(".svc-price").value) || 0;
        if (!name) return;
        if (free && !freeApplied && isCut(name)) {
          services.push({ name, price: 0, free: true });
          freeApplied = true;
        } else {
          services.push({ name, price });
        }
      });
      if (!services.length) return U.toast("시술 내역을 1개 이상 입력하세요", "err");
      if (free && !freeApplied) return U.toast("무료로 처리할 커트 시술이 없습니다", "err");
      if (free && freeApplied && DB.cutInfo(m).available < 1)
        return U.toast("사용 가능한 무료 커트가 없습니다", "err");

      const total = services.reduce((s, x) => s + x.price, 0);
      let used = Number(data.pointsUsed) || 0;
      if (m && used > m.points) return U.toast(`보유 포인트(${m.points}P)를 초과했습니다`, "err");
      if (used > total) used = total;

      const availBefore = m ? DB.cutInfo(m).available : 0;
      DB.addVisit({
        memberId: mid,
        memberName: m ? m.name : (data.memberName || "비회원"),
        date: data.date,
        designer: data.designer,
        services,
        pointsUsed: used,
        memo: data.memo,
      });
      U.closeModal();
      // 이번 시술로 무료 커트가 새로 발급됐는지 확인
      const availAfter = m ? DB.cutInfo(DB.getMember(mid)).available : 0;
      if (availAfter > availBefore) {
        U.toast(`🎉 커트 10회 달성! 무료 커트 1장이 발급되었습니다`, "ok");
      } else {
        U.toast("시술이 기록되었습니다", "ok");
      }
      App.refresh();
    };
  }

  return { render, openForm };
})();
