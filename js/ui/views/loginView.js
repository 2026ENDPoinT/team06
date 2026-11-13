/**
 * [담당: 프론트엔드] 로그인 화면
 *
 * 아직 실제 로그인은 없음. 어떤 버튼이든 누르면 "로그인됨"으로 표시하고 메인으로 넘어간다.
 * 로그인 상태는 브라우저 탭을 닫으면 사라지는 sessionStorage 에 둔다.
 */
const LoginView = {
  KEY: "team06.loggedIn",
  el: () => document.getElementById("view-login"),

  isLoggedIn() {
    return sessionStorage.getItem(this.KEY) === "1";
  },

  logout() {
    sessionStorage.removeItem(this.KEY);
    location.hash = "#login";
  },

  render() {
    this.el().innerHTML = `
      <div class="login-card">
        <svg class="login-stamp" viewBox="0 0 120 80" aria-hidden="true">
          <path d="M12 40c0-22 30-32 52-30s46 10 46 30-20 30-50 30S12 62 12 40z"
                fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
          <text x="60" y="52" text-anchor="middle">팀6</text>
        </svg>
        <p class="login-desc">성적 노트를 펼치려면 로그인하세요.</p>
        <button class="btn login-btn" data-provider="google">Google로 로그인</button>
        <button class="btn login-btn" data-provider="email">이메일로 로그인</button>
      </div>`;

    this.el().querySelectorAll(".login-btn").forEach((btn) =>
      btn.addEventListener("click", () => {
        // TODO: 실제 로그인 연결 (btn.dataset.provider)
        sessionStorage.setItem(this.KEY, "1");
        location.hash = "#dashboard";
      })
    );
  },
};
