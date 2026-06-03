/* ============================================================
   STATS — 포인트 / 매출 통계
   ============================================================ */
const Stats = (function () {
  let period = "month"; // week | month | all

  function render(el) {
    const visits = DB.getVisits();
    const members = DB.getMembers();
    const today = U.todayISO();

    // 기간 필터
    const from = periodStart(period);
    const inRange = visits.filter((v) => v.date >= from);

    const revenue = inRange.reduce((s, v) => s + (v.payable || 0), 0);
    const visitCount = inRange.length;
    const avg = visitCount ? Math.round(revenue / visitCount) : 0;
    const pointsOutstanding = members.reduce((s, m) => s + (m.points || 0), 0);
    const pointsEarned = inRange.reduce((s, v) => s + (v.pointsEarned || 0), 0);
    const pointsUsed = inRange.reduce((s, v) => s + (v.pointsUsed || 0), 0);
    const todayRev = visits.filter((v) => v.date === today).reduce((s, v) => s + (v.payable || 0), 0);

    el.innerHTML = `
      <div class="page-head">
        <div>
          <h1>매출 / 포인트 통계</h1>
          <div class="sub">오늘 매출 ${U.won(todayRev)}</div>
        </div>
        <div class="segment">
          <button data-p="week" class="${period === "week" ? "is-active" : ""}">최근 7일</button>
          <button data-p="month" class="${period === "month" ? "is-active" : ""}">이번 달</button>
          <button data-p="all" class="${period === "all" ? "is-active" : ""}">전체</button>
        </div>
      </div>

      <div class="stat-grid">
        <div class="stat-tile stat-tile--rose">
          <div class="stat-tile__icon">${IC("won", 22)}</div>
          <div class="stat-tile__label">매출</div>
          <div class="stat-tile__value">${U.won(revenue)}</div>
        </div>
        <div class="stat-tile">
          <div class="stat-tile__icon">${IC("scissors", 22)}</div>
          <div class="stat-tile__label">방문 건수</div>
          <div class="stat-tile__value">${U.num(visitCount)}<small>건</small></div>
        </div>
        <div class="stat-tile">
          <div class="stat-tile__icon">${IC("wallet", 22)}</div>
          <div class="stat-tile__label">평균 객단가</div>
          <div class="stat-tile__value">${U.won(avg)}</div>
        </div>
        <div class="stat-tile">
          <div class="stat-tile__icon">${IC("gem", 22)}</div>
          <div class="stat-tile__label">미사용 포인트 (전체)</div>
          <div class="stat-tile__value" style="color:var(--gold)">${U.num(pointsOutstanding)}<small>P</small></div>
        </div>
      </div>

      <div class="card" style="margin-bottom:18px">
        <div class="section-title" style="margin:0 0 4px">${IC("trending", 19)} ${period === "week" ? "일별" : "기간별"} 매출 추이</div>
        ${revenueChart(inRange)}
      </div>

      <div class="cards" style="grid-template-columns:repeat(auto-fit,minmax(300px,1fr));align-items:start">
        <div class="card">
          <div class="section-title" style="margin:0 0 14px">${IC("scissors", 19)} 인기 시술 TOP</div>
          ${serviceChart(inRange)}
        </div>
        <div class="card">
          <div class="section-title" style="margin:0 0 14px">${IC("crown", 19)} 우수 회원 TOP</div>
          ${topMembers(members)}
        </div>
      </div>

      <div class="card" style="margin-top:18px">
        <div class="section-title" style="margin:0 0 12px">${IC("gem", 19)} 포인트 현황 (${periodLabel()})</div>
        <div class="kv"><span>적립된 포인트</span><span style="color:var(--gold)">+${U.num(pointsEarned)}P</span></div>
        <div class="kv"><span>사용된 포인트</span><span style="color:var(--red)">-${U.num(pointsUsed)}P</span></div>
        <div class="divider"></div>
        <div class="kv"><span style="font-weight:800">전체 미사용 포인트 (회원 보유)</span><span style="font-weight:800">${U.num(pointsOutstanding)}P</span></div>
      </div>`;

    el.querySelectorAll("[data-p]").forEach((b) => (b.onclick = () => { period = b.dataset.p; render(el); }));
  }

  function periodStart(p) {
    const d = new Date(U.todayISO());
    if (p === "week") { d.setDate(d.getDate() - 6); return iso(d); }
    if (p === "month") return U.todayISO().slice(0, 7) + "-01";
    return "0000-00-00";
  }
  function iso(d) {
    const off = d.getTimezoneOffset();
    return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
  }
  function periodLabel() {
    return period === "week" ? "최근 7일" : period === "month" ? "이번 달" : "전체";
  }

  /* 매출 추이 막대 차트 */
  function revenueChart(visits) {
    let buckets = [];
    if (period === "week") {
      // 최근 7일 일별
      const base = new Date(U.todayISO());
      for (let i = 6; i >= 0; i--) {
        const d = new Date(base); d.setDate(d.getDate() - i);
        const key = iso(d);
        const wk = ["일", "월", "화", "수", "목", "금", "토"][d.getDay()];
        buckets.push({ label: wk, key, val: 0 });
      }
      visits.forEach((v) => { const b = buckets.find((x) => x.key === v.date); if (b) b.val += v.payable; });
    } else if (period === "month") {
      // 이번 달 주차별
      const month = U.todayISO().slice(0, 7);
      for (let w = 1; w <= 5; w++) buckets.push({ label: w + "주", week: w, val: 0 });
      visits.forEach((v) => {
        if (!v.date.startsWith(month)) return;
        const day = Number(v.date.slice(8, 10));
        const w = Math.min(5, Math.ceil(day / 7));
        const b = buckets.find((x) => x.week === w); if (b) b.val += v.payable;
      });
    } else {
      // 전체: 최근 6개월
      const base = new Date(U.todayISO().slice(0, 7) + "-01");
      for (let i = 5; i >= 0; i--) {
        const d = new Date(base); d.setMonth(d.getMonth() - i);
        const key = iso(d).slice(0, 7);
        buckets.push({ label: Number(key.slice(5, 7)) + "월", key, val: 0 });
      }
      visits.forEach((v) => { const b = buckets.find((x) => x.key === v.date.slice(0, 7)); if (b) b.val += v.payable; });
    }

    const max = Math.max(1, ...buckets.map((b) => b.val));
    if (buckets.every((b) => b.val === 0))
      return `<div class="empty" style="padding:30px"><div class="empty__sub">해당 기간 매출 데이터가 없습니다</div></div>`;

    return `<div class="bar-chart">
      ${buckets.map((b) => `
        <div class="bar">
          <div class="bar__val">${b.val ? "₩" + U.num(Math.round(b.val / 1000)) + "k" : ""}</div>
          <div class="bar__fill" style="height:${(b.val / max) * 100}%"></div>
          <div class="bar__label">${b.label}</div>
        </div>`).join("")}
    </div>`;
  }

  /* 인기 시술 */
  function serviceChart(visits) {
    const map = {};
    visits.forEach((v) => v.services.forEach((s) => {
      map[s.name] = map[s.name] || { count: 0, sum: 0 };
      map[s.name].count++; map[s.name].sum += s.price;
    }));
    const arr = Object.entries(map).map(([name, v]) => ({ name, ...v })).sort((a, b) => b.count - a.count).slice(0, 6);
    if (!arr.length) return `<div class="empty" style="padding:24px"><div class="empty__sub">데이터 없음</div></div>`;
    const max = Math.max(...arr.map((a) => a.count));
    return arr.map((a) => `
      <div class="svc-bar">
        <div class="svc-bar__name">${U.esc(a.name)}</div>
        <div class="svc-bar__track"><div class="svc-bar__fill" style="width:${(a.count / max) * 100}%"></div></div>
        <div class="svc-bar__val">${a.count}건 · ${U.won(a.sum)}</div>
      </div>`).join("");
  }

  /* 우수 회원 */
  function topMembers(members) {
    const arr = members.slice().sort((a, b) => (b.totalSpent || 0) - (a.totalSpent || 0)).slice(0, 6).filter((m) => m.totalSpent > 0);
    if (!arr.length) return `<div class="empty" style="padding:24px"><div class="empty__sub">데이터 없음</div></div>`;
    const rank = (i) => `<span class="rank-badge${i < 3 ? " rank-badge--top" : ""}">${i + 1}</span>`;
    return `<div class="mini-list">${arr.map((m, i) => `
      <div class="mini-item">
        <div class="mini-item__main" style="display:flex;align-items:center;gap:9px">${rank(i)} ${U.esc(m.name)}
          <span class="mini-item__sub" style="display:inline">· ${m.visitCount || 0}회</span>
        </div>
        <div style="text-align:right">
          <div class="amount" style="font-size:15px">${U.won(m.totalSpent)}</div>
          <div class="mini-item__sub" style="color:var(--gold)">${U.num(m.points)}P</div>
        </div>
      </div>`).join("")}</div>`;
  }

  return { render };
})();
