/**
 * [담당: 프론트엔드] 설정 (오른쪽 리본 책갈피)
 * 과목 초기화, JSON 백업·복원, Excel XML 내보내기를 제공한다.
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
          <button class="btn danger" data-action="clear">모두 지우기</button>
        </div>
      </div>

      <div class="card settings-row">
        <div>
          <h2>데이터 내보내기</h2>
          <p class="muted">JSON은 백업·복원용, Excel XML은 엑셀에서 열어 보는 표예요.</p>
        </div>
        <div class="settings-control">
          <button class="btn" data-action="export-json">JSON 저장</button>
          <button class="btn" data-action="export-excel">Excel XML 저장</button>
        </div>
      </div>

      <div class="card settings-row">
        <div>
          <h2>데이터 불러오기</h2>
          <p class="muted">JSON 백업 파일로 현재 과목 전체를 교체해요. 필요한 기록은 먼저 내보내세요.</p>
        </div>
        <div class="settings-control">
          <button class="btn" data-action="import">JSON 불러오기</button>
          <input type="file" accept=".json,application/json" data-import hidden />
        </div>
      </div>
      <p data-status role="status" aria-live="polite"></p>

      <div class="card settings-row">
        <div>
          <h2>로그아웃</h2>
          <p class="muted">로그인 화면으로 돌아가요.</p>
        </div>
        <div class="settings-control">
          <button class="btn" data-action="logout">로그아웃</button>
        </div>
      </div>

      <span class="placeholder-note">닉네임 저장은 준비 중이에요.</span>
    `;

    this.el().querySelector('[data-action="logout"]').addEventListener("click", () => LoginView.logout());
    this.bindDataEvents();
  },

  showStatus(message, error = false) {
    const status = this.el().querySelector("[data-status]");
    status.textContent = message;
    status.classList.toggle("error", error);
  },

  resetCourseView() {
    CoursesView.emptySemesters.clear();
    CoursesView.selectedKey = null;
    CoursesView.editingId = null;
    CoursesView.adding = false;
    CoursesView.notice = "";
  },

  download(content, extension, type) {
    const url = URL.createObjectURL(new Blob([content], { type }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `team06-courses-${new Date().toISOString().slice(0, 10)}.${extension}`;
    document.body.appendChild(link);
    try {
      link.click();
    } finally {
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
  },

  bindDataEvents() {
    const root = this.el();
    const fileInput = root.querySelector("[data-import]");
    for (const button of root.querySelectorAll("button[data-action]")) {
      if (button.dataset.action === "logout") continue;
      button.addEventListener("click", () => {
        if (this.importing) return;
        try {
          switch (button.dataset.action) {
            case "clear":
              if (!confirm("등록한 과목과 성적을 모두 삭제할까요? 이 작업은 되돌릴 수 없습니다.")) return;
              CourseService.clear();
              this.resetCourseView();
              this.showStatus("과목과 성적을 모두 초기화했습니다.");
              break;
            case "export-json":
              this.download(CourseService.exportJSON(), "json", "application/json;charset=utf-8");
              this.showStatus("JSON 백업 파일 다운로드를 시작했습니다.");
              break;
            case "export-excel":
              this.download(CourseService.exportExcel(), "xml", "application/xml;charset=utf-8");
              this.showStatus("Excel XML 다운로드를 시작했습니다. 엑셀에서 파일을 열어 주세요.");
              break;
            case "import":
              fileInput.click();
              break;
          }
        } catch (error) {
          this.showStatus(error.message || "데이터 처리에 실패했습니다.", true);
        }
      });
    }

    fileInput.addEventListener("change", async () => {
      const file = fileInput.files[0];
      if (!file || this.importing) return;
      this.importing = true;
      try {
        const text = await file.text();
        if (!confirm("JSON 파일의 과목으로 현재 과목 전체를 교체할까요? 기존 기록은 먼저 백업하는 것을 권장합니다.")) return;
        const count = CourseService.importJSON(text);
        this.resetCourseView();
        this.showStatus(`${count}개 과목을 불러와 저장했습니다.`);
      } catch (error) {
        this.showStatus(error.message || "파일을 불러오지 못했습니다.", true);
      } finally {
        this.importing = false;
        fileInput.value = "";
      }
    });
  },
};
