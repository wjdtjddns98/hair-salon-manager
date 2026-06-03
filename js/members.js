/* ============================================================
   MEMBERS — 회원 정보 관리
   ============================================================ */
const Members = (function () {
  let search = "";
  let sort = "recent"; // recent | name | points | spent

  function render(el) {
    let list = DB.getMembers();
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (m) => m.name.toLowerCase().includes(q) || (m.phone || "").includes(q)
      );
    }
    list.sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name, "ko");
      if (sort === "points") return (b.points || 0) - (a.points || 0);
      if (sort === "spent") return (b.totalSpent || 0) - (a.totalSpent || 0);
      // recent
      return (b.lastVisitAt || b.createdAt || "").localeCompare(a.lastVisitAt || a.createdAt || "");
    });

    el.innerHTML = `
      <div class="page-head">
        <div>
          <h1>회원 관리</h1>
          <div class="sub">총 ${DB.getMembers().length}명의 회원</div>
        </div>
        <div class="head-actions">
          <button class="btn btn--primary" id="addMember">${IC("plus", 18)} 회원 등록</button>
        </div>
      </div>

      <div class="head-actions" style="margin-bottom:16px;align-items:center">
        <div class="search">
          <span class="search__icon">${IC("search", 18)}</span>
          <input id="memberSearch" placeholder="이름 또는 전화번호 검색" value="${U.esc(search)}" />
        </div>
        <div class="segment">
          <button data-sort="recent" class="${sort === "recent" ? "is-active" : ""}">최근방문</button>
          <button data-sort="name" class="${sort === "name" ? "is-active" : ""}">이름순</button>
          <button data-sort="points" class="${sort === "points" ? "is-active" : ""}">포인트</button>
          <button data-sort="spent" class="${sort === "spent" ? "is-active" : ""}">매출</button>
        </div>
      </div>

      <div class="list" id="memberList">
        ${list.length ? list.map(card).join("") : emptyState(q)}
      </div>`;

    el.querySelector("#addMember").onclick = () => openForm();
    const si = el.querySelector("#memberSearch");
    si.oninput = () => { search = si.value; const l = el.querySelector("#memberList"); renderList(l); };
    el.querySelectorAll("[data-sort]").forEach((b) => (b.onclick = () => { sort = b.dataset.sort; render(el); }));
    bindCards(el);
  }

  function renderList(listEl) {
    let list = DB.getMembers();
    const q = search.trim().toLowerCase();
    if (q) list = list.filter((m) => m.name.toLowerCase().includes(q) || (m.phone || "").includes(q));
    list.sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name, "ko");
      if (sort === "points") return (b.points || 0) - (a.points || 0);
      if (sort === "spent") return (b.totalSpent || 0) - (a.totalSpent || 0);
      return (b.lastVisitAt || b.createdAt || "").localeCompare(a.lastVisitAt || a.createdAt || "");
    });
    listEl.innerHTML = list.length ? list.map(card).join("") : emptyState(q);
    bindCards(listEl.closest(".view") || document);
  }

  function emptyState(q) {
    return `<div class="empty">
      <div class="empty__icon">${IC("users", 34)}</div>
      <div class="empty__text">${q ? "검색 결과가 없습니다" : "등록된 회원이 없습니다"}</div>
      <div class="empty__sub">${q ? "다른 검색어를 입력해 보세요" : "오른쪽 위 '회원 등록' 버튼으로 추가하세요"}</div>
    </div>`;
  }

  function card(m) {
    const a = U.age(m.birthday);
    const ci = DB.cutInfo(m);
    return `<div class="row-card" data-id="${m.id}" data-act="detail">
      <div class="avatar">${U.esc(U.initial(m.name))}</div>
      <div class="row-main">
        <div class="row-name">${U.esc(m.name)}
          ${m.gender ? `<span class="tag tag--gray">${U.esc(m.gender)}${a != null ? " · " + a + "세" : ""}</span>` : ""}
          ${ci.available > 0 ? `<span class="tag tag--dark">${IC("gift", 13)} 무료커트 ${ci.available}</span>` : ""}
        </div>
        <div class="row-sub">
          <span>${IC("phone", 14)} ${U.esc(U.fmtPhone(m.phone) || "-")}</span>
          <span>${IC("scissors", 14)} ${m.visitCount || 0}회</span>
          <span>커트 ${ci.stamps}/10</span>
          <span>${IC("clock", 14)} ${U.relDate(m.lastVisitAt)}</span>
        </div>
      </div>
      <div class="row-side">
        <div class="point">${U.num(m.points)}P</div>
        <div class="row-sub" style="justify-content:flex-end">${U.won(m.totalSpent)}</div>
      </div>
    </div>`;
  }

  function bindCards(scope) {
    scope.querySelectorAll('[data-act="detail"]').forEach((c) => {
      c.onclick = () => detail(c.dataset.id);
    });
  }

  // 커트 적립 스탬프 카드 (10회 시 1회 무료)
  function cutStampCard(m) {
    const ci = DB.cutInfo(m);
    const dots = Array.from({ length: 10 }, (_, i) =>
      `<span style="font-size:22px;color:${i < ci.stamps ? "var(--rose)" : "var(--line)"}">●</span>`).join("");
    return `<div class="card" style="margin-top:14px;padding:16px;border:1.5px solid var(--line-2);box-shadow:none">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
        <div style="font-weight:800;display:flex;align-items:center;gap:6px">${IC("scissors", 18)} 커트 적립 <span class="row-sub" style="font-weight:500">(10회 시 1회 무료)</span></div>
        ${ci.available > 0 ? `<span class="tag tag--dark" style="font-size:13px">${IC("gift", 14)} 무료 커트 ${ci.available}장</span>` : ""}
      </div>
      <div style="display:flex;gap:5px;flex-wrap:wrap;line-height:1">${dots}</div>
      <div class="row-sub" style="margin-top:8px">현재 ${ci.stamps}/10 · 누적 커트 ${ci.totalCuts}회</div>
    </div>`;
  }

  /* ---------- 등록 / 수정 폼 ---------- */
  function openForm(member) {
    const isEdit = !!member;
    const m = member || {};
    U.openModal(`
      <div class="modal__head">
        <h2>${isEdit ? "회원 정보 수정" : "회원 등록"}</h2>
        <button class="modal__close" data-close>×</button>
      </div>
      <form id="memberForm">
        <div class="modal__body">
          <div class="field">
            <label>이름 *</label>
            <input name="name" required value="${U.esc(m.name || "")}" placeholder="홍길동" />
          </div>
          <div class="field">
            <label>전화번호</label>
            <input name="phone" id="mPhone" inputmode="numeric" value="${U.esc(U.fmtPhone(m.phone) || "")}" placeholder="010-1234-5678" maxlength="13" />
            <div class="field-error" id="mPhoneErr"></div>
          </div>
          <div class="field-row">
            <div class="field">
              <label>성별</label>
              <select name="gender">
                <option value="">선택안함</option>
                <option ${m.gender === "여성" ? "selected" : ""}>여성</option>
                <option ${m.gender === "남성" ? "selected" : ""}>남성</option>
              </select>
            </div>
            <div class="field">
              <label>생년월일</label>
              <input name="birthday" type="date" value="${U.esc(m.birthday || "")}" />
            </div>
          </div>
          <div class="field">
            <label>메모 (선호 스타일, 주의사항 등)</label>
            <textarea name="memo" placeholder="예: 두피 민감, 밝은 갈색 선호">${U.esc(m.memo || "")}</textarea>
          </div>
        </div>
        <div class="modal__foot">
          <button type="button" class="btn btn--ghost" data-close>취소</button>
          <button type="submit" class="btn btn--primary">${isEdit ? "저장" : "등록"}</button>
        </div>
      </form>`);

    // 전화번호 실시간 자동 포맷 (010-1234-5678)
    const phoneEl = document.getElementById("mPhone");
    phoneEl.oninput = () => {
      const d = phoneEl.value.replace(/\D/g, "").slice(0, 11);
      phoneEl.value = U.fmtPhone(d) || d;
      phoneEl.classList.remove("invalid");
      document.getElementById("mPhoneErr").classList.remove("show");
    };

    const save = (data) => {
      if (isEdit) {
        DB.updateMember(m.id, data);
        U.closeModal(); U.toast("수정되었습니다", "ok"); detail(m.id);
      } else {
        DB.addMember(data);
        U.closeModal(); U.toast("회원이 등록되었습니다", "ok"); App.refresh();
      }
    };

    document.getElementById("memberForm").onsubmit = (e) => {
      e.preventDefault();
      const data = U.formData(e.target);
      data.name = data.name.trim();
      if (!data.name) {
        e.target.name.classList.add("invalid");
        return U.toast("이름을 입력하세요", "err");
      }
      // 전화번호 유효성 (입력했다면 숫자 9~11자리)
      const digits = (data.phone || "").replace(/\D/g, "");
      const errEl = document.getElementById("mPhoneErr");
      if (digits && (digits.length < 9 || digits.length > 11)) {
        phoneEl.classList.add("invalid");
        errEl.textContent = "전화번호 자리수를 확인해 주세요";
        errEl.classList.add("show");
        return;
      }
      data.phone = digits;
      // 생년월일이 미래면 차단
      if (data.birthday && data.birthday > U.todayISO()) {
        return U.toast("생년월일이 올바르지 않습니다", "err");
      }
      // 같은 전화번호 중복 확인 (본인 제외)
      const dup = digits && DB.getMembers().find((x) => x.id !== (m.id || null) && (x.phone || "").replace(/\D/g, "") === digits);
      if (dup) {
        U.confirmModal("중복 확인", `같은 번호의 회원 '${dup.name}' 님이 이미 있습니다. 그래도 ${isEdit ? "저장" : "등록"}할까요?`, () => save(data), { yesText: isEdit ? "저장" : "등록" });
        return;
      }
      save(data);
    };
  }

  /* ---------- 회원 상세 ---------- */
  function detail(id) {
    const m = DB.getMember(id);
    if (!m) return;
    const visits = DB.getVisitsByMember(id).slice(0, 8);
    const a = U.age(m.birthday);

    U.openModal(`
      <div class="modal__head">
        <h2>회원 상세</h2>
        <button class="modal__close" data-close>×</button>
      </div>
      <div class="modal__body">
        <div style="display:flex;align-items:center;gap:16px;margin-bottom:8px">
          <div class="avatar" style="width:60px;height:60px;font-size:24px">${U.esc(U.initial(m.name))}</div>
          <div>
            <div style="font-size:22px;font-weight:800">${U.esc(m.name)}
              ${m.gender ? `<span class="tag tag--gray">${U.esc(m.gender)}${a != null ? " · " + a + "세" : ""}</span>` : ""}
            </div>
            <div class="row-sub" style="margin-top:4px">${IC("phone", 14)} ${U.esc(U.fmtPhone(m.phone) || "미등록")}</div>
          </div>
        </div>

        <div class="stat-grid" style="margin:18px 0 4px;grid-template-columns:repeat(3,1fr)">
          <div class="stat-tile" style="padding:14px">
            <div class="stat-tile__label" style="margin:0">보유 포인트</div>
            <div class="point" style="font-size:22px;margin-top:4px">${U.num(m.points)}P</div>
          </div>
          <div class="stat-tile" style="padding:14px">
            <div class="stat-tile__label" style="margin:0">누적 매출</div>
            <div class="amount" style="margin-top:4px">${U.won(m.totalSpent)}</div>
          </div>
          <div class="stat-tile" style="padding:14px">
            <div class="stat-tile__label" style="margin:0">방문 횟수</div>
            <div class="amount" style="margin-top:4px">${m.visitCount || 0}회</div>
          </div>
        </div>

        ${cutStampCard(m)}

        ${m.memo ? `<div class="card" style="background:var(--rose-bg);box-shadow:none;margin-top:14px;padding:14px">
          <div style="font-size:12.5px;font-weight:700;color:var(--ink-2);margin-bottom:4px">메모</div>
          <div style="font-size:14.5px;line-height:1.5">${U.esc(m.memo)}</div>
        </div>` : ""}

        <div class="head-actions" style="margin-top:16px">
          <button class="btn btn--primary btn--sm" id="dNewVisit">${IC("scissors", 16)} 시술 기록</button>
          <button class="btn btn--sm" id="dPoint">${IC("gem", 16)} 포인트 조정</button>
          <button class="btn btn--sm" id="dEdit">${IC("edit", 16)} 정보 수정</button>
        </div>

        <div class="section-title" style="margin:22px 0 12px;font-size:15px">최근 시술 이력</div>
        <div class="mini-list">
          ${visits.length ? visits.map((v) => `
            <div class="mini-item">
              <div>
                <div class="mini-item__main">${v.services.map((s) => U.esc(s.name)).join(", ") || "시술"}</div>
                <div class="mini-item__sub">${U.fmtDateFull(v.date)}${v.designer ? " · " + U.esc(v.designer) : ""}</div>
              </div>
              <div style="text-align:right">
                <div class="amount" style="font-size:15px">${U.won(v.payable)}</div>
                ${v.pointsEarned ? `<div class="mini-item__sub" style="color:var(--gold)">+${v.pointsEarned}P</div>` : ""}
              </div>
            </div>`).join("") : `<div class="empty" style="padding:24px"><div class="empty__sub">아직 시술 이력이 없습니다</div></div>`}
        </div>
      </div>
      <div class="modal__foot">
        <button class="btn btn--danger btn--sm" id="dDelete">회원 삭제</button>
        <button class="btn btn--ghost" data-close>닫기</button>
      </div>`);

    document.getElementById("dEdit").onclick = () => openForm(m);
    document.getElementById("dNewVisit").onclick = () => { U.closeModal(); Visits.openForm({ memberId: m.id }); };
    document.getElementById("dPoint").onclick = () => pointModal(m);
    document.getElementById("dDelete").onclick = () =>
      U.confirmModal("회원 삭제", `${m.name} 님을 삭제할까요? 시술 이력은 보존됩니다.`, () => {
        DB.deleteMember(id);
        U.closeModal();
        U.toast("삭제되었습니다", "ok");
        App.refresh();
      }, { danger: true, yesText: "삭제" });
  }

  function pointModal(m) {
    let mode = "add"; // add(적립) | sub(차감)
    U.openModal(`
      <div class="modal__head"><h2>포인트 조정</h2><button class="modal__close" data-close>×</button></div>
      <div class="modal__body">
        <div style="text-align:center;margin-bottom:16px">
          <div class="stat-tile__label">현재 보유 포인트</div>
          <div class="point" style="font-size:30px">${U.num(m.points)}P</div>
        </div>
        <div class="segment" style="display:flex;width:100%;margin-bottom:14px">
          <button type="button" id="pAdd" class="is-active" style="flex:1">＋ 적립</button>
          <button type="button" id="pSub" style="flex:1">－ 차감</button>
        </div>
        <div class="field" style="margin-bottom:10px">
          <label id="pLabel">적립할 포인트</label>
          <input id="pAmt" type="number" inputmode="numeric" min="0" placeholder="예: 1000"
            style="text-align:center;font-size:19px;font-weight:700" />
          <div class="field-error" id="pErr"></div>
        </div>
        <div class="card" style="background:var(--rose-bg);box-shadow:none;border:none;padding:13px">
          <div class="kv" style="padding:4px 0"><span>변경 후 보유 포인트</span><span id="pPreview" style="font-weight:800;font-size:16px">${U.num(m.points)}P</span></div>
        </div>
      </div>
      <div class="modal__foot">
        <button class="btn btn--ghost" data-close>취소</button>
        <button class="btn btn--primary" id="pSave">적용</button>
      </div>`);

    const addBtn = document.getElementById("pAdd");
    const subBtn = document.getElementById("pSub");
    const amt = document.getElementById("pAmt");
    const label = document.getElementById("pLabel");
    const err = document.getElementById("pErr");
    const preview = document.getElementById("pPreview");

    function amount() { return Math.max(0, Math.floor(Number(amt.value) || 0)); }
    function exceeds() { return mode === "sub" && amount() > m.points; }

    function update() {
      const a = amount();
      err.classList.remove("show");
      amt.classList.remove("invalid");
      if (exceeds()) {
        err.textContent = `보유 포인트(${U.num(m.points)}P)보다 많이 차감할 수 없습니다`;
        err.classList.add("show");
        amt.classList.add("invalid");
        preview.textContent = "—";
        return;
      }
      const after = mode === "add" ? m.points + a : m.points - a;
      preview.textContent = U.num(Math.max(0, after)) + "P";
    }
    function setMode(next) {
      mode = next;
      addBtn.classList.toggle("is-active", mode === "add");
      subBtn.classList.toggle("is-active", mode === "sub");
      label.textContent = mode === "add" ? "적립할 포인트" : "차감할 포인트";
      update();
    }
    addBtn.onclick = () => setMode("add");
    subBtn.onclick = () => setMode("sub");
    amt.oninput = update;

    document.getElementById("pSave").onclick = () => {
      const a = amount();
      if (!a) return U.toast("포인트를 입력하세요", "err");
      if (exceeds()) { update(); return U.toast("보유 포인트를 초과해 차감할 수 없습니다", "err"); }
      DB.adjustPoints(m.id, mode === "add" ? a : -a);
      U.closeModal();
      U.toast(mode === "add" ? `${U.num(a)}P 적립 완료` : `${U.num(a)}P 차감 완료`, "ok");
      detail(m.id);
    };
  }

  return { render, openForm, detail };
})();
