/**
 * [담당: 프론트엔드] 탭 4 — 메모
 * 왼쪽에서 과목을 고르면 오른쪽 노트에 그 과목 메모를 자유롭게 적는다.
 * (평가 기준, 강의실, 강의 내용 등) 입력을 멈추면 자동 저장된다.
 *
 * 데이터: CourseService.getAll() 로 과목 목록, MemoService 로 메모 읽기/쓰기
 */
const MemoView = {
  el: () => document.getElementById("view-memo"),
  SAVE_DELAY: 800,

  selectedId: null,
  timer: null,
  pending: null, // 아직 저장 안 한 { courseId, text }

  render() {
    const header = UI.pageHeader("메모", "과목마다 평가 기준, 강의실, 강의 내용 등을 자유롭게 적어 두세요.");
    this.flush();

    const loaded = MemoService.ensureLoaded(CourseService.uid).catch(() => {}); // 실패는 MemoService.loadError 로 표시
    if (MemoService.loading) {
      loaded.then(() => {
        if (Tabs.current() === "memo") this.render();
      });
      this.el().innerHTML = `${header}<div class="card" role="status">메모를 불러오는 중입니다…</div>`;
      return;
    }
    if (MemoService.loadError) {
      this.el().innerHTML = `${header}
        <div class="card"><p class="error" role="alert">${UI.escape(MemoService.loadError)}</p>
        <button class="btn" data-retry>다시 불러오기</button></div>`;
      this.el().querySelector("[data-retry]").addEventListener("click", () => {
        MemoService.retry();
        this.render();
      });
      return;
    }

    // 최근 학기부터, 학기 안에서는 이름순
    const courses = CourseService.getAll().sort((a, b) =>
      b.year - a.year || GPA.SEMESTER_ORDER[b.semester] - GPA.SEMESTER_ORDER[a.semester] || a.name.localeCompare(b.name, "ko"));
    if (courses.length === 0) {
      this.el().innerHTML = `${header}
        <div class="card"><p class="empty">등록된 과목이 없습니다. 과목·성적 탭에서 과목을 추가하면 여기서 메모를 쓸 수 있어요.</p></div>`;
      return;
    }
    if (!courses.some((c) => c.id === this.selectedId)) this.selectedId = courses[0].id;

    const groups = [];
    for (const c of courses) {
      const title = UI.semesterTitle(c.year, c.semester);
      if (groups.at(-1)?.title !== title) groups.push({ title, courses: [] });
      groups.at(-1).courses.push(c);
    }
    const selected = courses.find((c) => c.id === this.selectedId);

    this.el().innerHTML = `
      ${header}
      <div class="memo-layout">
        <nav class="memo-list card" aria-label="과목 목록">
          ${groups.map((g) => `
            <h2 class="memo-sem">${UI.escape(g.title)}</h2>
            <ul>
              ${g.courses.map((c) => {
                const preview = MemoService.get(c.id).trim().split("\n")[0];
                return `
                <li><button class="memo-item ${c.id === this.selectedId ? "active" : ""}" data-id="${c.id}"
                        aria-current="${c.id === this.selectedId}">
                  <span class="memo-name">${UI.escape(c.name)}</span>
                  <span class="memo-preview">${preview ? UI.escape(preview) : "메모 없음"}</span>
                </button></li>`;
              }).join("")}
            </ul>`).join("")}
        </nav>

        <div class="memo-sheet card">
          <div class="memo-sheet-head">
            <h2>${UI.escape(selected.name)}</h2>
            <span class="muted">${UI.escape(UI.semesterTitle(selected.year, selected.semester))} · ${selected.credits}학점</span>
          </div>
          <textarea class="memo-text" maxlength="${MemoService.MAX_LENGTH}" aria-label="${UI.escape(selected.name)} 메모"
                    placeholder="예) 평가: 중간 30% · 기말 40% · 과제 20% · 출석 10%&#10;강의실: 공학관 302호&#10;오늘 배운 내용…">${UI.escape(MemoService.get(selected.id))}</textarea>
          <div class="memo-foot">
            <span class="memo-status" role="status"></span>
            <span class="memo-count muted"></span>
          </div>
        </div>
      </div>
    `;
    this.bindEvents();
  },

  bindEvents() {
    this.el().querySelectorAll(".memo-item").forEach((btn) =>
      btn.addEventListener("click", () => {
        // 다시 그려도 페이지·과목 목록 스크롤 위치는 그대로
        const pageY = window.scrollY;
        const listY = this.el().querySelector(".memo-list")?.scrollTop ?? 0;
        this.selectedId = btn.dataset.id;
        this.render();
        const list = this.el().querySelector(".memo-list");
        if (list) list.scrollTop = listY;
        window.scrollTo(0, pageY);
        this.el().querySelector(".memo-text")?.focus({ preventScroll: true });
      }));

    const area = this.el().querySelector(".memo-text");
    const updateCount = () => {
      this.el().querySelector(".memo-count").textContent = `${area.value.length} / ${MemoService.MAX_LENGTH}`;
    };
    updateCount();
    area.addEventListener("input", () => {
      updateCount();
      this.setStatus("입력 중…");
      this.pending = { courseId: this.selectedId, text: area.value };
      clearTimeout(this.timer);
      this.timer = setTimeout(() => this.flush(), this.SAVE_DELAY);
    });
    area.addEventListener("blur", () => this.flush());
  },

  /** 기다리던 저장을 바로 실행한다 (과목을 바꾸거나 다른 탭으로 갈 때도 불림) */
  async flush() {
    clearTimeout(this.timer);
    const pending = this.pending;
    if (!pending) return;
    this.pending = null;
    this.setStatus("저장 중…");
    try {
      await MemoService.set(pending.courseId, pending.text);
      if (!this.pending) this.setStatus("저장됨");
      this.updatePreview(pending.courseId);
    } catch (error) {
      this.setStatus(DataStore.errorMessage(error), true);
    }
  },

  setStatus(text, isError = false) {
    const el = this.el().querySelector(".memo-status");
    if (!el) return;
    el.textContent = text;
    el.classList.toggle("error", isError);
  },

  updatePreview(courseId) {
    const el = this.el().querySelector(`.memo-item[data-id="${courseId}"] .memo-preview`);
    if (el) el.textContent = MemoService.get(courseId).trim().split("\n")[0] || "메모 없음";
  },
};
