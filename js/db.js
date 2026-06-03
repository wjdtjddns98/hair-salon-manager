/* ============================================================
   DB — localStorage 기반 데이터 저장소
   회원(members), 방문/시술(visits), 예약(reservations), 설정(settings)
   ============================================================ */
const DB = (function () {
  const KEY = "salon_data_v1";

  const DEFAULT = {
    members: [],
    visits: [],
    reservations: [],
    settings: {
      salonName: "우리 미용실",
      pointRate: 5, // 적립률 %
      designers: ["원장", "디자이너A", "디자이너B"],
      services: ["커트", "펌", "염색", "클리닉", "드라이", "매직", "두피케어"],
    },
  };

  // 전역 고유 ID (여러 기기에서 충돌 방지). 보안 컨텍스트(https/localhost)에서 동작
  function uid() {
    if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
    return "id-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
  }
  const sid = (v) => (v == null ? null : String(v)); // ID를 문자열로 통일

  // 커트 판별: 시술명에 "커트"가 포함되면 커트로 인정
  function isCut(name) { return !!name && name.indexOf("커트") !== -1; }

  // 회원 데이터에 커트 적립 필드 보정 + ID 문자열화
  function normalizeMember(m) {
    return { cutsPaid: 0, freeCutsUsed: 0, points: 0, totalSpent: 0, visitCount: 0, ...m, id: sid(m.id) };
  }
  function normalizeVisit(v) {
    return { ...v, id: sid(v.id), memberId: sid(v.memberId) };
  }
  function normalizeReservation(r) {
    return { ...r, id: sid(r.id), memberId: sid(r.memberId) };
  }

  // 회원 커트 적립 현황 (스탬프/보유 무료커트)
  function cutInfo(m) {
    const paid = (m && m.cutsPaid) || 0;
    const used = (m && m.freeCutsUsed) || 0;
    return {
      stamps: paid % 10,                                  // 다음 무료까지 진행도 (0~9)
      available: Math.max(0, Math.floor(paid / 10) - used), // 사용 가능한 무료 커트
      totalCuts: paid,
    };
  }

  let state = load();

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return structuredClone(DEFAULT);
      const data = JSON.parse(raw);
      // 누락 필드 보정
      return {
        ...structuredClone(DEFAULT),
        ...data,
        members: (data.members || []).map(normalizeMember),
        visits: (data.visits || []).map(normalizeVisit),
        reservations: (data.reservations || []).map(normalizeReservation),
        settings: { ...DEFAULT.settings, ...(data.settings || {}) },
      };
    } catch (e) {
      console.error("데이터 불러오기 실패", e);
      return structuredClone(DEFAULT);
    }
  }

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch (e) {
      alert("저장 공간이 부족합니다. 설정에서 데이터를 백업 후 정리해 주세요.");
    }
  }

  /* ---------- 클라우드 동기화 알림 (Cloud 레이어가 있으면 위임) ---------- */
  function syncPush(table, row) {
    if (window.Cloud && Cloud.push) try { Cloud.push(table, structuredClone(row)); } catch (e) {}
  }
  function syncDelete(table, id) {
    if (window.Cloud && Cloud.remove) try { Cloud.remove(table, sid(id)); } catch (e) {}
  }
  function syncSettings() {
    if (window.Cloud && Cloud.pushSettings) try { Cloud.pushSettings(structuredClone(state.settings)); } catch (e) {}
  }

  // 클라우드에서 받은 전체 데이터로 로컬 상태 교체 (Cloud 레이어가 호출)
  function replaceState(remote) {
    state = {
      ...structuredClone(DEFAULT),
      members: (remote.members || []).map(normalizeMember),
      visits: (remote.visits || []).map(normalizeVisit),
      reservations: (remote.reservations || []).map(normalizeReservation),
      settings: { ...DEFAULT.settings, ...(remote.settings || {}) },
    };
    save();
  }
  // 단일 레코드 원격 변경 적용 (Realtime 수신 시 Cloud 레이어가 호출)
  function applyRemote(table, row) {
    const arr = table === "members" ? state.members : table === "visits" ? state.visits : state.reservations;
    const norm = table === "members" ? normalizeMember(row) : table === "visits" ? normalizeVisit(row) : normalizeReservation(row);
    const i = arr.findIndex((x) => x.id === norm.id);
    if (i >= 0) arr[i] = norm; else arr.push(norm);
    save();
  }
  function applyRemoteDelete(table, id) {
    id = sid(id);
    if (table === "members") state.members = state.members.filter((x) => x.id !== id);
    else if (table === "visits") state.visits = state.visits.filter((x) => x.id !== id);
    else if (table === "reservations") state.reservations = state.reservations.filter((x) => x.id !== id);
    save();
  }
  function applyRemoteSettings(s) {
    state.settings = { ...DEFAULT.settings, ...s };
    save();
  }
  function getAllForSync() {
    return structuredClone(state);
  }

  function nextId() {
    return uid();
  }

  /* ---------- 회원 ---------- */
  function getMembers() { return state.members.slice(); }
  function getMember(id) { id = sid(id); return state.members.find((m) => m.id === id) || null; }

  function addMember(data) {
    const m = {
      id: nextId("member"),
      name: data.name.trim(),
      phone: (data.phone || "").trim(),
      gender: data.gender || "",
      birthday: data.birthday || "",
      memo: (data.memo || "").trim(),
      points: 0,
      totalSpent: 0,
      visitCount: 0,
      cutsPaid: 0,      // 누적 유료 커트 횟수 (스탬프 적립용)
      freeCutsUsed: 0,  // 사용한 무료 커트 횟수
      createdAt: new Date().toISOString(),
      lastVisitAt: null,
    };
    state.members.push(m);
    save();
    syncPush("members", m);
    return m;
  }

  function updateMember(id, data) {
    const m = getMember(id);
    if (!m) return null;
    Object.assign(m, {
      name: data.name.trim(),
      phone: (data.phone || "").trim(),
      gender: data.gender || "",
      birthday: data.birthday || "",
      memo: (data.memo || "").trim(),
    });
    save();
    syncPush("members", m);
    return m;
  }

  function adjustPoints(id, delta, reason) {
    const m = getMember(id);
    if (!m) return null;
    m.points = Math.max(0, (m.points || 0) + delta);
    save();
    syncPush("members", m);
    return m;
  }

  function deleteMember(id) {
    id = sid(id);
    state.members = state.members.filter((m) => m.id !== id);
    // 연결된 시술/예약의 회원 연결만 해제 (기록은 유지)
    state.visits.forEach((v) => { if (v.memberId === id) { v.memberId = null; syncPush("visits", v); } });
    state.reservations.forEach((r) => { if (r.memberId === id) { r.memberId = null; syncPush("reservations", r); } });
    syncDelete("members", id);
    save();
  }

  /* ---------- 방문/시술 ---------- */
  function getVisits() {
    return state.visits.slice().sort((a, b) =>
      a.date < b.date ? 1 : a.date > b.date ? -1 : (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0));
  }
  function getVisitsByMember(memberId) {
    memberId = sid(memberId);
    return getVisits().filter((v) => v.memberId === memberId);
  }

  function addVisit(data) {
    const services = (data.services || []).filter((s) => s.name);
    const total = services.reduce((sum, s) => sum + (Number(s.price) || 0), 0);
    const pointsUsed = Math.max(0, Number(data.pointsUsed) || 0);
    const rate = state.settings.pointRate || 0;
    const payable = Math.max(0, total - pointsUsed);
    // 포인트 적립은 "커트 제외" 금액에 대해서만 (커트는 10회 스탬프 제도로 대체)
    const nonCutTotal = services.reduce((sum, s) => sum + (isCut(s.name) ? 0 : (Number(s.price) || 0)), 0);
    const earnBase = Math.max(0, nonCutTotal - pointsUsed);
    const pointsEarned = Math.round((earnBase * rate) / 100);

    // 커트 적립: 무료(free) 처리된 커트는 스탬프 제외, 유료 커트만 적립
    const cutPaidCount = services.filter((s) => isCut(s.name) && !s.free).length;
    const freeCutCount = services.filter((s) => isCut(s.name) && s.free).length;

    const v = {
      id: nextId("visit"),
      memberId: sid(data.memberId) || null,
      memberName: data.memberName || (getMember(data.memberId)?.name) || "비회원",
      date: data.date,
      designer: data.designer || "",
      services,
      total,
      pointsUsed,
      pointsEarned,
      payable,
      cutPaidCount,   // 이 방문으로 적립된 커트 스탬프 수
      freeCutCount,   // 이 방문에서 사용한 무료 커트 수
      memo: (data.memo || "").trim(),
      createdAt: new Date().toISOString(),
    };
    state.visits.push(v);

    // 회원 누적 갱신
    const m = getMember(v.memberId);
    if (m) {
      m.visitCount = (m.visitCount || 0) + 1;
      m.totalSpent = (m.totalSpent || 0) + payable;
      m.points = Math.max(0, (m.points || 0) - pointsUsed + pointsEarned);
      m.cutsPaid = (m.cutsPaid || 0) + cutPaidCount;
      m.freeCutsUsed = (m.freeCutsUsed || 0) + freeCutCount;
      if (!m.lastVisitAt || v.date > m.lastVisitAt) m.lastVisitAt = v.date;
    }
    save();
    syncPush("visits", v);
    if (m) syncPush("members", m);
    return v;
  }

  function deleteVisit(id) {
    id = sid(id);
    const v = state.visits.find((x) => x.id === id);
    if (!v) return;
    // 회원 누적 되돌리기
    const m = getMember(v.memberId);
    if (m) {
      m.visitCount = Math.max(0, (m.visitCount || 0) - 1);
      m.totalSpent = Math.max(0, (m.totalSpent || 0) - (v.payable || 0));
      m.points = Math.max(0, (m.points || 0) + (v.pointsUsed || 0) - (v.pointsEarned || 0));
      m.cutsPaid = Math.max(0, (m.cutsPaid || 0) - (v.cutPaidCount || 0));
      m.freeCutsUsed = Math.max(0, (m.freeCutsUsed || 0) - (v.freeCutCount || 0));
    }
    state.visits = state.visits.filter((x) => x.id !== id);
    save();
    syncDelete("visits", id);
    if (m) syncPush("members", m);
  }

  /* ---------- 예약 ---------- */
  function getReservations() {
    return state.reservations.slice().sort((a, b) => {
      const ka = a.date + (a.time || ""), kb = b.date + (b.time || "");
      return ka < kb ? -1 : ka > kb ? 1 : 0;
    });
  }

  function addReservation(data) {
    const r = {
      id: nextId("reservation"),
      memberId: sid(data.memberId) || null,
      name: (data.name || "").trim(),
      phone: (data.phone || "").trim(),
      date: data.date,
      time: data.time || "",
      service: (data.service || "").trim(),
      designer: data.designer || "",
      status: data.status || "예약",
      memo: (data.memo || "").trim(),
      createdAt: new Date().toISOString(),
    };
    state.reservations.push(r);
    save();
    syncPush("reservations", r);
    return r;
  }

  function updateReservation(id, data) {
    id = sid(id);
    const r = state.reservations.find((x) => x.id === id);
    if (!r) return null;
    Object.assign(r, {
      memberId: data.memberId !== undefined ? sid(data.memberId) || null : r.memberId,
      name: (data.name || "").trim(),
      phone: (data.phone || "").trim(),
      date: data.date,
      time: data.time || "",
      service: (data.service || "").trim(),
      designer: data.designer || "",
      status: data.status || r.status,
      memo: (data.memo || "").trim(),
    });
    save();
    syncPush("reservations", r);
    return r;
  }

  function setReservationStatus(id, status) {
    id = sid(id);
    const r = state.reservations.find((x) => x.id === id);
    if (r) { r.status = status; save(); syncPush("reservations", r); }
    return r;
  }

  function deleteReservation(id) {
    id = sid(id);
    state.reservations = state.reservations.filter((r) => r.id !== id);
    save();
    syncDelete("reservations", id);
  }

  /* ---------- 설정 ---------- */
  function getSettings() { return structuredClone(state.settings); }
  function updateSettings(s) {
    Object.assign(state.settings, s);
    save();
    syncSettings();
  }

  /* ---------- 백업 / 복원 / 초기화 ---------- */
  function exportData() { return JSON.stringify(state, null, 2); }
  function importData(json) {
    const data = JSON.parse(json);
    if (!data.members || !data.settings) throw new Error("올바른 백업 파일이 아닙니다.");
    state = {
      ...structuredClone(DEFAULT),
      members: (data.members || []).map(normalizeMember),
      visits: (data.visits || []).map(normalizeVisit),
      reservations: (data.reservations || []).map(normalizeReservation),
      settings: { ...DEFAULT.settings, ...data.settings },
    };
    save();
    if (window.Cloud && Cloud.pushAll) Cloud.pushAll(getAllForSync());
  }
  function resetAll() {
    state = structuredClone(DEFAULT);
    save();
  }

  return {
    getMembers, getMember, addMember, updateMember, deleteMember, adjustPoints,
    getVisits, getVisitsByMember, addVisit, deleteVisit,
    getReservations, addReservation, updateReservation, setReservationStatus, deleteReservation,
    getSettings, updateSettings,
    exportData, importData, resetAll,
    cutInfo, isCut, uid,
    // 클라우드 동기화용 (Cloud 레이어 전용)
    replaceState, applyRemote, applyRemoteDelete, applyRemoteSettings, getAllForSync,
  };
})();
window.DB = DB;
