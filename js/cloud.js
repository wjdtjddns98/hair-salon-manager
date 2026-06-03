/* ============================================================
   CLOUD — Supabase 클라우드 동기화 (여러 기기 실시간 공유)
   ------------------------------------------------------------
   - 저장 구조: 각 테이블 행 = { id, data(jsonb), updated_at }
     data 안에 앱의 레코드 객체를 그대로 보관 (매핑 최소화)
   - 동작: 로컬(localStorage)이 캐시 + 작업 큐, Supabase가 원본
     · 온라인: 변경 즉시 Supabase에 반영 + Realtime으로 타 기기 수신
     · 오프라인: 변경을 큐에 저장 → 재연결 시 자동 전송
   - CONFIG.cloud.enabled 가 false 면 전부 비활성(로컬 전용)
   ============================================================ */
const Cloud = (function () {
  let client = null;
  let ready = false;
  const QUEUE_KEY = "salon_sync_queue_v1";
  const TABLES = ["members", "visits", "reservations"];

  /* ---------- 상태 표시 ---------- */
  function setStatus(state, text) {
    const el = document.getElementById("cloudStatus");
    if (!el) return;
    const map = {
      off: ["#9b94a0", "로컬 전용"],
      connecting: ["#d8a13a", "연결 중…"],
      online: ["#4a9d7f", "동기화됨"],
      offline: ["#c8536b", "오프라인"],
      syncing: ["#d8a13a", "동기화 중…"],
      error: ["#c8536b", "연결 오류"],
    };
    const [color, label] = map[state] || map.off;
    el.innerHTML = `<span class="cloud-dot" style="background:${color}"></span>${text || label}`;
  }

  /* ---------- 작업 큐 (오프라인 대비) ---------- */
  function loadQueue() {
    try { return JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]"); } catch (e) { return []; }
  }
  function saveQueue(q) { localStorage.setItem(QUEUE_KEY, JSON.stringify(q)); }
  function enqueue(op) {
    const q = loadQueue();
    q.push(op);
    saveQueue(q);
  }

  async function flushQueue() {
    if (!ready || !navigator.onLine) return;
    let q = loadQueue();
    if (!q.length) return;
    setStatus("syncing");
    const remaining = [];
    for (const op of q) {
      const ok = await runOp(op);
      if (!ok) remaining.push(op);
    }
    saveQueue(remaining);
    setStatus(navigator.onLine ? "online" : "offline");
  }

  async function runOp(op) {
    try {
      if (op.type === "upsert") {
        const { error } = await client.from(op.table)
          .upsert({ id: op.id, data: op.data, updated_at: new Date().toISOString() });
        return !error;
      }
      if (op.type === "delete") {
        const { error } = await client.from(op.table).delete().eq("id", op.id);
        return !error;
      }
      if (op.type === "settings") {
        const { error } = await client.from("app_settings")
          .upsert({ id: "main", data: op.data, updated_at: new Date().toISOString() });
        return !error;
      }
    } catch (e) { return false; }
    return false;
  }

  /* ---------- DB → 클라우드 (db.js 가 호출) ----------
     같은 레코드(key)에 대한 전송을 직렬화 + 최신값으로 합치기(coalesce)
     → 동일 행을 빠르게 여러 번 갱신해도 마지막 상태가 정확히 반영됨 (경합 방지) */
  const pending = new Map();  // key -> op (최신값만 유지)
  const inflight = new Map(); // key -> 진행 중 Promise (key별 순차 실행)

  function schedule(key, op) {
    pending.set(key, op); // 같은 key 의 이전 대기 op 를 최신 op 로 덮어씀
    if (inflight.has(key)) return; // 이미 처리 중이면 끝나고 pending 을 가져감
    const loop = async () => {
      while (pending.has(key)) {
        const cur = pending.get(key);
        pending.delete(key);
        const ok = await runOp(cur);
        if (!ok) { enqueue(cur); break; } // 실패(오프라인 등) → 영구 큐로
      }
      inflight.delete(key);
    };
    inflight.set(key, loop());
  }

  function push(table, row) {
    if (!CONFIG.cloud.enabled) return;
    const op = { type: "upsert", table, id: row.id, data: row };
    if (!ready || !navigator.onLine) { enqueue(op); return; }
    schedule(table + ":" + row.id, op);
  }
  function remove(table, id) {
    if (!CONFIG.cloud.enabled) return;
    const op = { type: "delete", table, id };
    if (!ready || !navigator.onLine) { enqueue(op); return; }
    schedule(table + ":" + id, op);
  }
  function pushSettings(settings) {
    if (!CONFIG.cloud.enabled) return;
    const op = { type: "settings", data: settings };
    if (!ready || !navigator.onLine) { enqueue(op); return; }
    schedule("settings:main", op);
  }
  // 전체 업로드 (백업 복원 / 최초 시드)
  async function pushAll(state) {
    if (!CONFIG.cloud.enabled || !ready) return;
    setStatus("syncing");
    for (const t of TABLES) {
      const rows = (state[t] || []).map((r) => ({ id: r.id, data: r, updated_at: new Date().toISOString() }));
      if (rows.length) await client.from(t).upsert(rows);
    }
    await client.from("app_settings").upsert({ id: "main", data: state.settings, updated_at: new Date().toISOString() });
    setStatus("online");
  }

  /* ---------- 클라우드 → DB (최초 로드) ---------- */
  async function pullAll() {
    const result = { members: [], visits: [], reservations: [], settings: null };
    for (const t of TABLES) {
      const { data, error } = await client.from(t).select("data");
      if (error) throw error;
      result[t] = (data || []).map((r) => r.data);
    }
    const { data: sdata } = await client.from("app_settings").select("data").eq("id", "main").maybeSingle();
    result.settings = sdata ? sdata.data : null;
    return result;
  }

  function isEmpty(remote) {
    return !remote.members.length && !remote.visits.length &&
           !remote.reservations.length && !remote.settings;
  }

  /* ---------- Realtime 구독 (타 기기 변경 수신) ---------- */
  function subscribe() {
    const ch = client.channel("salon-sync");
    TABLES.forEach((t) => {
      ch.on("postgres_changes", { event: "*", schema: "public", table: t }, (payload) => {
        if (payload.eventType === "DELETE") {
          DB.applyRemoteDelete(t, payload.old.id);
        } else if (payload.new && payload.new.data) {
          DB.applyRemote(t, payload.new.data);
        }
        if (window.App) App.refresh();
      });
    });
    ch.on("postgres_changes", { event: "*", schema: "public", table: "app_settings" }, (payload) => {
      if (payload.new && payload.new.data) {
        DB.applyRemoteSettings(payload.new.data);
        if (window.App) { App.updateBrand(); App.refresh(); }
        if (window.Lock) Lock.check();
      }
    });
    ch.subscribe();
  }

  /* ---------- 초기화 (app.js 가 호출) ---------- */
  async function init() {
    if (!CONFIG.cloud.enabled) { setStatus("off"); return; }
    if (typeof supabase === "undefined" || !supabase.createClient) {
      console.warn("Supabase 라이브러리를 불러오지 못했습니다. 로컬 전용으로 동작합니다.");
      setStatus("error", "라이브러리 오류");
      return;
    }
    if (!CONFIG.cloud.supabaseUrl || !CONFIG.cloud.supabaseAnonKey) {
      setStatus("error", "키 미설정");
      return;
    }

    setStatus("connecting");
    try {
      client = supabase.createClient(CONFIG.cloud.supabaseUrl, CONFIG.cloud.supabaseAnonKey, {
        auth: { persistSession: false },
      });

      const remote = await pullAll();
      if (isEmpty(remote)) {
        // 클라우드가 비어 있으면 이 기기의 로컬 데이터로 시드
        ready = true;
        await pushAll(DB.getAllForSync());
      } else {
        // 클라우드 데이터를 기준으로 로컬 교체
        DB.replaceState(remote);
        ready = true;
      }

      if (window.App) { App.updateBrand(); App.refresh(); }
      if (window.Lock) Lock.check();
      subscribe();
      await flushQueue();
      setStatus(navigator.onLine ? "online" : "offline");

      // 온라인/오프라인 전환 감지
      window.addEventListener("online", () => { setStatus("syncing"); flushQueue(); });
      window.addEventListener("offline", () => setStatus("offline"));
    } catch (e) {
      console.error("클라우드 연결 실패:", e);
      ready = false;
      setStatus("error");
    }
  }

  return { init, push, remove, pushSettings, pushAll, setStatus, get ready() { return ready; } };
})();
// 다른 스크립트의 window.Cloud 가드에서 참조 가능하도록 노출
window.Cloud = Cloud;
