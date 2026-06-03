# 💇 미용실 회원관리 시스템

태블릿·스마트폰 브라우저에서 바로 쓰는 **미용실 회원 / 예약 / 시술 / 매출 관리** 웹앱입니다.
별도 빌드 도구 없이 동작하는 **순수 HTML/CSS/JavaScript** 앱이며, **PWA(설치형 웹앱)** 와
**Supabase 클라우드 동기화**를 지원합니다.

> 모노크롬(블랙 & 화이트) UI · 모바일 퍼스트 · 오프라인 지원

---

## ✨ 주요 기능

| 메뉴 | 설명 |
|------|------|
| 🏠 **홈** | 오늘 매출·예약·방문 요약, 오늘의 예약, 이번 달 생일 회원 |
| 👥 **회원 관리** | 등록/수정/검색, 보유 포인트·누적 매출·방문 이력, 포인트 적립·차감 |
| 📅 **예약 관리** | 날짜·시간별 예약, 완료/취소 처리, 예약 → 시술 기록 연동 |
| ✂️ **시술 이력** | 방문별 시술·금액 기록, 담당 디자이너, 포인트 자동 적립/사용 |
| 📊 **통계** | 기간별 매출 추이, 인기 시술·우수 회원 TOP, 포인트 현황 |
| ⚙️ **설정** | 매장명·적립률, 디자이너/시술 메뉴, 앱 잠금(PIN) |

**특화 기능**
- ✂️ **커트 10회 → 1회 무료** 스탬프 적립 (커트는 포인트 적립에서 자동 제외)
- 🔒 **앱 잠금(PIN)** — 4자리 PIN, 해시 저장, 모든 기기 공통
- ☁️ **클라우드 실시간 동기화** — 여러 기기에서 같은 데이터 공유, 오프라인 입력 후 자동 전송
- 📱 **PWA** — 홈 화면에 설치, 전체화면 실행, 오프라인 캐싱

---

## 🗂️ 프로젝트 구조

```
.
├── index.html          # 진입점
├── manifest.json       # PWA 매니페스트
├── sw.js               # 서비스 워커 (오프라인 캐싱)
├── icons/              # 앱 아이콘 / 파비콘
├── css/
│   └── styles.css      # 디자인 시스템 (모노크롬)
└── js/
    ├── config.js       # 클라우드 설정 (※ git 제외 — config.example.js 참고)
    ├── icons.js        # SVG 라인 아이콘 세트
    ├── db.js           # 데이터 계층 (localStorage + 클라우드 동기화 훅)
    ├── cloud.js        # Supabase 동기화 (실시간 + 오프라인 큐)
    ├── lock.js         # 앱 잠금(PIN)
    ├── utils.js        # 포맷·모달·토스트 등 공통
    ├── members.js      # 회원
    ├── reservations.js # 예약
    ├── visits.js       # 시술 이력
    ├── stats.js        # 통계
    ├── dashboard.js    # 홈
    ├── settings.js     # 설정
    └── app.js          # 라우터 / 초기화
```

---

## 🚀 실행 방법

### 빠르게 실행
`index.html` 을 브라우저에서 열면 바로 동작합니다. (로컬 저장 모드)

로컬 서버로 띄우려면 (PWA·서비스워커 테스트용):
```bash
python -m http.server 5500
# http://localhost:5500
```

### 클라우드 동기화 설정 (선택)
여러 기기에서 데이터를 공유하려면 Supabase를 연결합니다.

1. [Supabase](https://supabase.com) 무료 프로젝트 생성
2. **SQL Editor** 에서 아래 실행 (테이블 + 권한 + 실시간)
   ```sql
   create table if not exists public.members      (id text primary key, data jsonb not null, updated_at timestamptz default now());
   create table if not exists public.visits       (id text primary key, data jsonb not null, updated_at timestamptz default now());
   create table if not exists public.reservations (id text primary key, data jsonb not null, updated_at timestamptz default now());
   create table if not exists public.app_settings (id text primary key, data jsonb not null, updated_at timestamptz default now());

   alter table public.members      enable row level security;
   alter table public.visits       enable row level security;
   alter table public.reservations enable row level security;
   alter table public.app_settings enable row level security;
   create policy "salon_all" on public.members      for all using (true) with check (true);
   create policy "salon_all" on public.visits       for all using (true) with check (true);
   create policy "salon_all" on public.reservations for all using (true) with check (true);
   create policy "salon_all" on public.app_settings for all using (true) with check (true);

   alter publication supabase_realtime add table public.members;
   alter publication supabase_realtime add table public.visits;
   alter publication supabase_realtime add table public.reservations;
   alter publication supabase_realtime add table public.app_settings;
   ```
3. `js/config.example.js` 를 복사해 **`js/config.js`** 로 만들고, 값을 채웁니다.
   ```js
   const CONFIG = {
     cloud: {
       enabled: true,
       provider: "supabase",
       supabaseUrl: "https://<프로젝트>.supabase.co",
       supabaseAnonKey: "sb_publishable_...",   // Publishable 키 (Secret 키 사용 금지)
     },
   };
   ```

---

## 📦 배포 (Netlify)

1. [app.netlify.com/drop](https://app.netlify.com/drop) 에 프로젝트 **폴더 전체**를 드래그&드롭
2. 생성된 `https://*.netlify.app` 주소를 모바일 크롬에서 열어 **"앱 설치"**

> ⚠️ `js/config.js` 에는 Supabase URL·키가 들어가므로 **공개 저장소에 커밋하지 마세요.**
> 이 저장소는 `config.js` 를 `.gitignore` 로 제외합니다.

---

## 🛠️ 기술 스택

- **Vanilla JavaScript** (프레임워크·빌드 없음)
- **PWA** (manifest + service worker, network-first 캐싱)
- **Supabase** (PostgreSQL + Realtime) — 선택적 클라우드 동기화
- **localStorage** — 로컬 캐시 / 오프라인 저장

## 📄 라이선스

개인/매장용 프로젝트.
