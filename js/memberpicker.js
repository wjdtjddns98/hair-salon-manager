/* ============================================================
   MEMBER PICKER — 입력하며 바로 검색되는 회원 선택 컴포넌트
   기존 <select> 대신 사용. 이름·전화번호로 즉시 필터링.
   ------------------------------------------------------------
   사용:
     const pick = MemberPicker.create(hostEl, {
       id: "vMember",            // hidden input id (기존 코드 호환용)
       name: "memberId",         // form 전송 name
       selectedId: preset.memberId,
       onChange: (id) => { ... } // 선택/해제 시 호출
     });
   hostEl 안에 <input name="memberId" id="vMember" type="hidden"> 가 생성되어
   U.formData / document.getElementById(id).value 로 그대로 읽힘.
   ============================================================ */
const MemberPicker = (function () {
  function create(host, opts) {
    opts = opts || {};
    const name = opts.name || "memberId";
    let selectedId = opts.selectedId ? String(opts.selectedId) : "";

    host.classList.add("mpick");
    host.innerHTML = `
      <input type="hidden" name="${name}" ${opts.id ? `id="${opts.id}"` : ""} class="mpick__hidden" />
      <div class="mpick__control">
        <span class="mpick__icon">${typeof IC === "function" ? IC("search", 17) : "🔍"}</span>
        <input class="mpick__input" placeholder="${U.esc(opts.placeholder || "이름·전화번호로 회원 검색")}" autocomplete="off" inputmode="search" />
        <button type="button" class="mpick__clear" title="선택 해제" hidden>×</button>
      </div>
      <div class="mpick__menu" hidden></div>`;

    const hidden = host.querySelector(".mpick__hidden");
    const input = host.querySelector(".mpick__input");
    const clearBtn = host.querySelector(".mpick__clear");
    const menu = host.querySelector(".mpick__menu");

    function fire() { if (opts.onChange) opts.onChange(selectedId || null); }

    function applySelection(m, silent) {
      selectedId = m ? String(m.id) : "";
      hidden.value = selectedId;
      if (m) {
        input.value = `${m.name}${m.phone ? " · " + U.fmtPhone(m.phone) : ""}`;
        input.classList.add("mpick__input--selected");
        clearBtn.hidden = false;
      } else {
        input.value = "";
        input.classList.remove("mpick__input--selected");
        clearBtn.hidden = true;
      }
      hideMenu();
      if (!silent) fire();
    }

    function rowHtml(m) {
      const ci = DB.cutInfo ? DB.cutInfo(m) : { available: 0 };
      return `<button type="button" class="mpick__opt" data-id="${m.id}">
        <span class="mpick__avatar">${U.esc(U.initial(m.name))}</span>
        <span class="mpick__opt-main">
          <b>${U.esc(m.name)}</b>
          <span>${U.esc(U.fmtPhone(m.phone) || "번호없음")} · ${m.visitCount || 0}회 방문${ci.available > 0 ? " · 🎁무료커트" : ""}</span>
        </span>
        ${m.points ? `<span class="mpick__pts">${U.num(m.points)}P</span>` : ""}
      </button>`;
    }

    function renderMenu(q) {
      const qq = (q || "").trim().toLowerCase();
      const qDigits = qq.replace(/\D/g, "");
      let list = DB.getMembers();
      if (qq) {
        list = list.filter((m) =>
          m.name.toLowerCase().includes(qq) ||
          (qDigits && (m.phone || "").replace(/\D/g, "").includes(qDigits)));
      } else {
        // 검색어 없으면 최근 방문 순
        list = list.slice().sort((a, b) =>
          (b.lastVisitAt || b.createdAt || "").localeCompare(a.lastVisitAt || a.createdAt || ""));
      }
      const shown = list.slice(0, 12);
      let html = `<button type="button" class="mpick__opt mpick__opt--none" data-id="">
        <span class="mpick__avatar mpick__avatar--none">＋</span>
        <span class="mpick__opt-main"><b>비회원 / 직접입력</b><span>회원이 아닌 손님</span></span>
      </button>`;
      html += shown.map(rowHtml).join("");
      if (qq && !shown.length) html += `<div class="mpick__empty">'${U.esc(q)}' 검색 결과가 없습니다</div>`;
      else if (list.length > shown.length) html += `<div class="mpick__more">상위 ${shown.length}명 표시 · 더 입력해 좁혀보세요</div>`;
      menu.innerHTML = html;
      menu.querySelectorAll(".mpick__opt").forEach((b) => (b.onclick = () => {
        const id = b.dataset.id;
        applySelection(id ? DB.getMember(id) : null);
      }));
      showMenu();
    }

    function showMenu() { menu.hidden = false; }
    function hideMenu() { menu.hidden = true; }

    input.onfocus = () => renderMenu(selectedId ? "" : input.value);
    input.onclick = () => renderMenu(selectedId ? "" : input.value);
    input.oninput = () => {
      // 사용자가 다시 타이핑 → 기존 선택 해제하고 검색
      if (selectedId) { selectedId = ""; hidden.value = ""; input.classList.remove("mpick__input--selected"); clearBtn.hidden = true; fire(); }
      renderMenu(input.value);
    };
    input.onkeydown = (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        const first = menu.querySelector('.mpick__opt[data-id]:not(.mpick__opt--none)');
        if (first && !menu.hidden) first.click();
      } else if (e.key === "Escape") hideMenu();
    };
    clearBtn.onclick = () => { applySelection(null); input.focus(); renderMenu(""); };

    // 바깥 클릭 시 닫기
    const outside = (e) => { if (!host.contains(e.target)) hideMenu(); };
    document.addEventListener("click", outside);
    // 모달이 닫히면 리스너 정리 (host 가 DOM 에서 사라지면 자동 무력화되지만 안전하게)
    host._mpickCleanup = () => document.removeEventListener("click", outside);

    // 초기 선택값
    const initM = selectedId ? DB.getMember(selectedId) : null;
    applySelection(initM, true);
    fire(); // 초기 상태도 폼에 반영

    return {
      getId() { return selectedId || null; },
      getMember() { return DB.getMember(selectedId); },
      set(id) { applySelection(id ? DB.getMember(id) : null); },
    };
  }

  return { create };
})();
window.MemberPicker = MemberPicker;
