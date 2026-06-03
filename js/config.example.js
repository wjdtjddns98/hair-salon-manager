/* ============================================================
   CONFIG 예시 파일
   ------------------------------------------------------------
   이 파일을 복사해서 같은 폴더에 `config.js` 로 만든 뒤 값을 채우세요.
   (config.js 는 보안상 .gitignore 로 제외됩니다)

   - 로컬 전용으로만 쓰려면: enabled 를 false 로 두면 됩니다.
   - 여러 기기 공유(클라우드)를 쓰려면: enabled 를 true 로 하고
     Supabase 프로젝트의 URL 과 Publishable 키를 입력하세요.
     (⚠️ Secret 키 sb_secret_... 는 절대 사용 금지)
   ============================================================ */
const CONFIG = {
  cloud: {
    enabled: false,
    provider: "supabase",
    supabaseUrl: "",           // 예: https://xxxx.supabase.co
    supabaseAnonKey: "",       // Publishable key (sb_publishable_...)
  },
};
