/**
 * [담당: 프론트엔드] 설정 (오른쪽 리본 책갈피)
 * 지금은 화면 구성만. 저장 기능은 이후 연결.
 */
const SettingsView = {
  el: () => document.getElementById("view-settings"),

  render() {
    this.el().innerHTML = `
      ${UI.pageHeader("설정", "내 노트를 원하는 대로 바꿔요.")}

      <div class="card settings-row">
        <div>
          <h2>닉네임</h2>
          <p class="muted">메인 화면 인사말에 쓰여요.</p>
        </div>
        <div class="settings-control">
          <input type="text" value="${UI.escape(DashboardView.NICKNAME)}" disabled />
          <button class="btn" disabled>저장</button>
        </div>
      </div>

      <div class="card settings-row">
        <div>
          <h2>데이터 초기화</h2>
          <p class="muted">등록한 과목과 성적을 모두 지워요. 되돌릴 수 없어요.</p>
        </div>
        <div class="settings-control">
          <button class="btn danger" disabled>모두 지우기</button>
        </div>
      </div>

      <div class="card settings-row">
        <div>
          <h2>로그아웃</h2>
          <p class="muted">로그인 화면으로 돌아가요.</p>
        </div>
        <div class="settings-control">
          <button class="btn" data-action="logout">로그아웃</button>
        </div>
      </div>

      <span class="placeholder-note">닉네임 저장, 데이터 초기화는 기능 연결 후 쓸 수 있어요</span>
    `;

    this.el().querySelector('[data-action="logout"]').addEventListener("click", () => LoginView.logout());
  },
};
