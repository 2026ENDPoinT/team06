/**
 * [담당: 프론트엔드] 메모 (네 번째 인덱스 탭)
 *
 * 과목마다 평가 기준, 강의실, 강의 내용 등을 자유롭게 적어 두는 곳.
 * 메모는 계정(또는 게스트)별로 이 브라우저의 LocalStorage 에 저장된다.
 *   키: "team06.memos.<uid|guest>"  값: { [과목 id]: "메모 내용" }
 * 입력할 때마다 바로 저장하므로 따로 저장 버튼이 없다.
 */
const MemoView = {
  MAX: 5000,
  selectedId: null,

  el: () => document.getElementById("view-memo"),

  key() {
    return `team06.memos.${CourseService.uid || "guest"}`;
  },

  loadMemos() {
    try {
      const memos = JSON.parse(localStorage.getItem(this.key()) || "{}");
      return memos && typeof memos === "object" && !Array.isArray(memos) ? memos : {};
    } catch {
      return {};
    }
  },

  saveMemo(courseId, text) {
    const memos = this.loadMemos();
    if (text.trim()) memos[courseId] = text;
    else delete memos[courseId];
    try {
      localStorage.setItem(this.key(), JSON.stringify(memos));
      return true;
    } catch {
      return false;
    }
  },

  /** 메모 전체를 교체한다 (JSON 불러오기용). 저장 실패 시 예외 */
  replaceMemos(memos) {
    localStorage.setItem(this.key(), JSON.stringify(memos ?? {}));
  },

  /** 최근 학기가 위로 오도록 정렬 */
  sortedCourses() {
    return CourseService.getAll().sort((a, b) =>
      b.year - a.year
      || GPA.SEMESTER_ORDER[b.semester] - GPA.SEMESTER_ORDER[a.semester]
      || a.name.localeCompare(b.name, "ko"));
  },

  preview(text) {
    const line = (text || "").trim().split("\n")[0];
    return line ? UI.escape(line) : "메모 없음";
  },

  render() {
    const courses = this.sortedCourses();
    const header = UI.pageHeader("메모", "과목마다 평가 기준, 강의실, 강의 내용 등을 자유롭게 적어 두세요.");

    if (!courses.length) {
      this.el().innerHTML = `${header}
        <div class="card empty">아직 등록한 과목이 없어요. <a href="#courses">과목·성적</a> 탭에서 먼저 과목을 추가해 주세요.</div>`;
      return;
    }

    if (!courses.some((c) => c.id === this.selectedId)) this.selectedId = courses[0].id;
    const memos = this.loadMemos();
    const selected = courses.find((c) => c.id === this.selectedId);

    let lastSemester = null;
    const items = courses.map((c) => {
      const semester = UI.semesterTitle(c.year, c.semester);
      const group = semester !== lastSemester ? `<li class="memo-group">${semester}</li>` : "";
      lastSemester = semester;
      const hasMemo = Boolean(memos[c.id]?.trim());
      return `${group}
        <li>
          <button type="button" class="memo-item${c.id === this.selectedId ? " active" : ""}" data-id="${UI.escape(c.id)}">
            <span class="memo-item-name">${UI.escape(c.name)}</span>
            <span class="memo-item-preview${hasMemo ? "" : " none"}">${this.preview(memos[c.id])}</span>
          </button>
        </li>`;
    }).join("");

    const text = memos[selected.id] || "";
    this.el().innerHTML = `${header}
      <div class="memo-layout">
        <ul class="card memo-list" aria-label="과목 목록">${items}</ul>
        <div class="card memo-editor">
          <h2>${UI.escape(selected.name)}
            <span class="muted">${UI.semesterTitle(selected.year, selected.semester)} · ${selected.credits}학점</span>
          </h2>
          <textarea class="memo-text" maxlength="${this.MAX}" aria-label="${UI.escape(selected.name)} 메모"
            placeholder="예) 평가: 중간 30% · 기말 40% · 과제 20% · 출석 10%&#10;강의실: 미래관 109호">${UI.escape(text)}</textarea>
          <p class="memo-count"><span data-status role="status" aria-live="polite"></span><span data-count>${text.length} / ${this.MAX}</span></p>
        </div>
      </div>`;

    this.bindEvents();
  },

  bindEvents() {
    const root = this.el();
    const textarea = root.querySelector(".memo-text");

    root.querySelector(".memo-list").addEventListener("click", (event) => {
      const item = event.target.closest(".memo-item");
      if (!item || item.dataset.id === this.selectedId) return;
      const scroll = root.querySelector(".memo-list").scrollTop;
      this.selectedId = item.dataset.id;
      this.render();
      root.querySelector(".memo-list").scrollTop = scroll;
      root.querySelector(".memo-text").focus();
    });

    textarea.addEventListener("input", () => {
      const text = textarea.value;
      const ok = this.saveMemo(this.selectedId, text);
      root.querySelector("[data-count]").textContent = `${text.length} / ${this.MAX}`;
      const status = root.querySelector("[data-status]");
      status.textContent = ok ? "" : "메모를 저장하지 못했어요.";
      status.classList.toggle("error", !ok);
      const preview = root.querySelector(".memo-item.active .memo-item-preview");
      preview.innerHTML = this.preview(text);
      preview.classList.toggle("none", !text.trim());
    });
  },
};
