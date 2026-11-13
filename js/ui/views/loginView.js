/**
 * [담당: 프론트엔드] 로그인 화면
 *
 * Firebase Google / 이메일·비밀번호 인증을 사용한다.
 */
const LoginView = {
  busy: false,
  GUEST_KEY: "team06.guest",
  guest: false,
  el: () => document.getElementById("view-login"),

  isLoggedIn() {
    return FirebaseAuth.ready && FirebaseAuth.user !== null;
  },

  isGuest() {
    if (this.isLoggedIn()) return false;
    try {
      return this.guest || sessionStorage.getItem(this.GUEST_KEY) === "1";
    } catch {
      return this.guest;
    }
  },

  startGuest() {
    if (this.busy) return;
    this.guest = true;
    try { sessionStorage.setItem(this.GUEST_KEY, "1"); } catch { /* 저장소가 차단되어도 현재 화면에서는 이용 가능 */ }
    if (location.hash === "#dashboard") Tabs.show();
    else location.hash = "#dashboard";
  },

  clearGuest() {
    this.guest = false;
    try { sessionStorage.removeItem(this.GUEST_KEY); } catch { /* 메모리 상태는 정리한다 */ }
  },

  async logout() {
    if (this.isLoggedIn()) await FirebaseAuth.logout();
    this.clearGuest();
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
        <p class="login-desc">로그인하거나 게스트로 성적 노트를 펼쳐 보세요.</p>
        <button class="btn login-btn" data-provider="google">Google로 로그인</button>
        <form class="login-email-form">
          <label>이메일<input name="email" type="email" autocomplete="username" required /></label>
          <label>비밀번호<input name="password" type="password" autocomplete="current-password" minlength="6" required /></label>
          <button class="btn login-btn" type="submit">이메일로 로그인</button>
          <button class="btn login-btn" type="submit" name="register" value="1">이메일로 회원가입</button>
        </form>
        <button class="btn login-btn" type="button" data-action="guest">게스트로 시작</button>
        <p class="login-message" role="status" aria-live="polite"></p>
        <p class="login-local-note">과목 기록은 이 브라우저에 저장되며, 계정 간에 분리되거나 다른 기기로 동기화되지 않습니다.</p>
      </div>`;

    this.el().querySelector('[data-provider="google"]').addEventListener("click", () => this.run(() => FirebaseAuth.google()));
    this.el().querySelector('[data-action="guest"]').addEventListener("click", () => this.startGuest());
    this.el().querySelector("form").addEventListener("submit", (event) => {
      event.preventDefault();
      const form = event.target;
      const register = event.submitter?.name === "register";
      this.run(() => FirebaseAuth.email(form.elements.email.value.trim(), form.elements.password.value, register));
    });
    this.setBusy(this.busy || !FirebaseAuth.ready || Boolean(FirebaseAuth.error));
    this.showMessage(FirebaseAuth.error || (!FirebaseAuth.ready ? "로그인 상태를 확인하고 있습니다…" : ""));
  },
  showMessage(message) {
    this.el().querySelector(".login-message").textContent = message;
  },
  setBusy(busy) {
    for (const input of this.el().querySelectorAll("button, input")) input.disabled = busy;
    // Firebase 로딩 실패나 인터넷 연결 없이도 게스트는 진입할 수 있다.
    this.el().querySelector('[data-action="guest"]').disabled = this.busy;
  },
  async run(action) {
    if (this.busy || !FirebaseAuth.ready || FirebaseAuth.error) return;
    this.busy = true;
    this.setBusy(true);
    this.showMessage("로그인 중입니다…");
    try {
      await action();
      this.clearGuest();
      this.el().querySelector('input[name="password"]').value = "";
      location.hash = "#dashboard";
    } catch (error) {
      this.showMessage(FirebaseAuth.message(error));
    } finally {
      this.busy = false;
      this.setBusy(!FirebaseAuth.ready || Boolean(FirebaseAuth.error));
    }
  },
};
