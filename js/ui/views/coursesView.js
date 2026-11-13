/**
 * [담당: 프론트엔드] 탭 2 — 과목·성적
 * 학기마다 탭이 하나씩 있고, 오른쪽 위 + 버튼으로 새 학기 탭을 추가한다.
 * 선택한 학기 탭 안에서 과목을 등록/수정/삭제한다.
 *
 * 흐름: 입력 → Validator 검증 → CourseService 변경 → render() 로 다시 그리기
 */
const CoursesView = {
  el: () => document.getElementById("view-courses"),
  // 맨 앞의 "-"(성적 미입력)가 새 과목의 기본 선택값
  GRADES: [GPA.NO_GRADE, ...GPA.ALL_GRADES],

  selectedKey: null,  // 선택된 학기 탭 ("2026-1")
  editingId: null,    // 수정 중인 과목 id (없으면 null)
  adding: false,      // + 눌러서 학기 추가 칸이 열려 있는지
  // ponytail: 과목이 없는 새 학기는 화면에만 기억 → 새로고침하면 사라짐. 빈 학기도 저장해야 하면 DataStore 에 키 추가
  emptySemesters: new Set(),

  /** 탭 순서: 연도 → 1학기, 여름, 2학기, 겨울 */
  compareKeys(a, b) {
    const [ya, sa] = a.split("-");
    const [yb, sb] = b.split("-");
    return ya - yb || GPA.SEMESTER_ORDER[sa] - GPA.SEMESTER_ORDER[sb];
  },

  titleOf(key) {
    const [year, sem] = key.split("-");
    return UI.semesterTitle(year, sem);
  },

  render() {
    // 다시 그려도 탭 줄 스크롤 위치는 유지
    const prevScroll = this.el().querySelector(".sem-tab-list")?.scrollLeft ?? 0;
    const courses = CourseService.getAll();
    const groups = {};
    for (const c of courses) (groups[`${c.year}-${c.semester}`] ??= []).push(c);
    for (const key of this.emptySemesters) groups[key] ??= [];

    const keys = Object.keys(groups).sort((a, b) => this.compareKeys(a, b));
    if (!keys.includes(this.selectedKey)) this.selectedKey = keys[keys.length - 1] ?? null;

    this.el().innerHTML = `
      ${UI.pageHeader("과목·성적", "학기를 고르고 그 학기에 들은 과목을 등록해요.")}

      <div class="sem-book">
        <div class="sem-tabs">
          <div class="sem-tab-list" role="tablist">
            ${keys.map((k) => `
              <button class="sem-tab ${k === this.selectedKey ? "active" : ""}" role="tab"
                      aria-selected="${k === this.selectedKey}" data-action="select" data-key="${k}">${this.titleOf(k)}</button>`).join("")}
          </div>
          <button class="sem-add" data-action="${this.adding ? "close-add" : "open-add"}" aria-expanded="${this.adding}"
                  aria-label="학기 추가" title="학기 추가">+</button>
        </div>

        ${this.adding ? this.addSemesterHtml() : ""}

        ${this.selectedKey ? this.semesterHtml(this.selectedKey, groups[this.selectedKey]) : `
          <div class="sem-page"><p class="empty">아직 학기가 없어요. 오른쪽 위 + 버튼으로 학기를 추가하세요.</p></div>`}
      </div>
    `;
    this.bindEvents();
    this.setupTabScroll(prevScroll);
    this.setSaving(CourseService.saving);
  },

  /** 학기가 많아 탭이 넘치면 탭 줄을 잡고 좌우로 드래그해서 넘긴다. 선택한 탭은 항상 보이게 */
  setupTabScroll(prevScroll) {
    const list = this.el().querySelector(".sem-tab-list");
    if (!list) return;

    list.scrollLeft = prevScroll;
    const active = list.querySelector(".sem-tab.active");
    if (active) {
      const left = active.offsetLeft - list.offsetLeft;
      if (left < list.scrollLeft) list.scrollLeft = left - 8;
      else if (left + active.offsetWidth > list.scrollLeft + list.clientWidth)
        list.scrollLeft = left + active.offsetWidth - list.clientWidth + 8;
    }

    // 드래그로 넘기기: 5px 넘게 움직였을 때만 드래그로 보고, 그때는 손을 뗄 때의 탭 클릭(선택)을 막는다
    let startX = 0, startScroll = 0, dragging = false, pointerId = null;
    list.addEventListener("pointerdown", (e) => {
      dragging = false;
      if (e.button !== 0 || list.scrollWidth <= list.clientWidth) return;
      pointerId = e.pointerId;
      startX = e.clientX;
      startScroll = list.scrollLeft;
    });
    list.addEventListener("pointermove", (e) => {
      if (e.pointerId !== pointerId) return;
      const dx = e.clientX - startX;
      if (!dragging && Math.abs(dx) < 5) return;
      if (!dragging) {
        dragging = true;
        list.setPointerCapture(pointerId); // 탭 줄 밖으로 나가도 계속 끌리게
        list.classList.add("dragging");
      }
      list.scrollLeft = startScroll - dx;
    });
    const end = (e) => {
      if (e.pointerId !== pointerId) return;
      pointerId = null;
      list.classList.remove("dragging");
    };
    list.addEventListener("pointerup", end);
    list.addEventListener("pointercancel", end);
    list.addEventListener("click", (e) => {
      if (!dragging) return;
      dragging = false;
      e.stopPropagation(); // 끌기만 했으면 학기 선택으로 처리하지 않음
      e.preventDefault();
    }, true);
    list.addEventListener("dragstart", (e) => e.preventDefault());

    // 마우스 휠(세로)로도 탭 줄을 가로로 넘길 수 있게
    list.addEventListener("wheel", (e) => {
      if (list.scrollWidth <= list.clientWidth || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      e.preventDefault();
      list.scrollLeft += e.deltaY;
    }, { passive: false });
  },

  /** + 버튼을 누르면 열리는 연도/학기 선택 칸 */
  addSemesterHtml() {
    return `
      <form class="card sem-add-form" data-form="semester">
        <label>연도 <input type="number" name="year" value="${new Date().getFullYear()}" min="1900" max="2100" required /></label>
        <label>학기
          <select name="semester">
            ${Object.entries(UI.SEMESTER_LABEL).map(([v, t]) => `<option value="${v}">${t}</option>`).join("")}
          </select>
        </label>
        <button type="submit" class="btn primary">학기 추가</button>
        <button type="button" class="btn" data-action="close-add">취소</button>
      </form>`;
  },

  /** 선택된 학기: 요약 + 과목 등록 폼 + 과목 목록 */
  semesterHtml(key, list) {
    // 재수강 판단은 전체 과목 기준 → 이 학기 과목에도 retaken / effectiveGrade 가 붙어 있다
    const s = GPA.summarizeBySemester(CourseService.getAll()).find((x) => x.semesterKey === key);
    const rows = s?.courses ?? list;
    const c = this.editingId ? CourseService.getById(this.editingId) : null;

    return `
      <div class="sem-page">
        <div class="semester-head">
          <h2>${this.titleOf(key)}</h2>
          <span class="meta">평점 ${UI.formatGPA(s?.gpa)} / 4.5, ${s?.credits ?? 0}학점</span>
        </div>

        <form class="course-form" data-form="course" novalidate>
          <label>과목명
            <input type="text" name="name" placeholder="예) 자료구조" value="${c ? UI.escape(c.name) : ""}" />
          </label>
          <label>학점
            <input type="number" name="credits" placeholder="3" value="${c?.credits ?? ""}" />
          </label>
          <label>성적
            <select name="grade">
              ${this.GRADES.map((g) => `<option ${c?.grade === g ? "selected" : ""}>${g}</option>`).join("")}
            </select>
          </label>
          <div class="form-actions">
            <button type="submit" class="btn primary">${c ? "저장" : "과목 추가"}</button>
            ${c ? `<button type="button" class="btn" data-action="cancel">취소</button>` : ""}
          </div>
        </form>
        <p class="error" id="form-error" hidden></p>
        <p id="course-save-status" role="status" aria-live="polite"></p>
        ${this.notice ? `<p class="retake-notice">${UI.escape(this.notice)}</p>` : ""}

        ${rows.length === 0
          ? `<p class="empty">이 학기에 등록한 과목이 없어요. 위에서 과목을 추가하세요.</p>`
          : `<table>
              <thead><tr><th>과목명</th><th>학점</th><th>성적</th><th></th></tr></thead>
              <tbody>
                ${rows.map((c) => `
                  <tr data-id="${c.id}" class="${c.retaken ? "retaken" : ""}">
                    <td>${UI.escape(c.name)}</td>
                    <td>${c.credits}</td>
                    <td>${this.gradeCell(c)}</td>
                    <td class="actions">
                      <button class="btn small" data-action="edit">수정</button>
                      <button class="btn small danger" data-action="delete">삭제</button>
                    </td>
                  </tr>`).join("")}
              </tbody>
            </table>`}
      </div>`;
  },

  /** 성적 칸: 재수강으로 빠진 이전 기록은 R, "-" 로 재수강해 이전 성적을 쓰면 그 성적을 함께 표시 */
  gradeCell(c) {
    if (c.retaken) return `<span class="retake-mark" title="재수강(RETAKE)으로 평가에서 제외">R</span> <small class="muted">(${c.grade})</small>`;
    if (c.pending) return `${c.grade} <small class="muted">(재수강 중 · 이전 학기 성적 ${c.effectiveGrade} 반영)</small>`;
    return c.grade;
  },

  /** 이벤트는 섹션 자체에 한 번만 연결 (render 마다 중복 연결 방지) */
  bindEvents() {
    if (this.bound) return;
    this.bound = true;
    const root = this.el();

    root.addEventListener("submit", (e) => {
      e.preventDefault();
      if (CourseService.saving || CourseService.loading || CourseService.loadError) return;
      const f = Object.fromEntries(new FormData(e.target).entries());
      this.notice = null;

      if (e.target.dataset.form === "semester") {
        const key = `${Number(f.year)}-${f.semester}`;
        this.emptySemesters.add(key);
        this.selectedKey = key;
        this.adding = false;
        this.editingId = null;
        return this.render();
      }

      // 과목 등록/수정: 연도·학기는 선택된 탭에서 가져온다
      const [year, semester] = this.selectedKey.split("-");
      const input = { ...f, name: f.name.trim(), year, semester };
      const { errors } = Validator.validateCourse(input);
      const retake = Validator.validateRetake(input, CourseService.getAll(), this.editingId);
      const allErrors = [...errors, ...retake.errors];
      if (allErrors.length) return this.showErrors(allErrors);

      const data = { ...input, year: Number(year), credits: Number(input.credits) };
      const editingId = this.editingId;
      this.saveChange(
        () => editingId ? CourseService.update(editingId, data) : CourseService.add(data),
        () => {
          if (retake.previous && !editingId) this.notice = `'${input.name}' 과목을 재수강 하였습니다.`;
          // 저장에 성공한 뒤에만 입력 폼과 임시 학기 상태를 정리한다.
          this.emptySemesters.delete(this.selectedKey);
          this.editingId = null;
          this.render();
        }
      );
    });

    root.addEventListener("click", (e) => {
      if (CourseService.saving || CourseService.loading || CourseService.loadError) return;
      const btn = e.target.closest("button[data-action]");
      if (!btn) return;
      this.notice = null; // 다른 동작을 하면 재수강 안내는 지운다
      const id = btn.closest("tr")?.dataset.id;

      switch (btn.dataset.action) {
        case "select":
          this.selectedKey = btn.dataset.key;
          this.editingId = null;
          break;
        case "open-add":
          this.adding = true;
          break;
        case "close-add":
          this.adding = false;
          break;
        case "edit":
          this.editingId = id;
          break;
        case "cancel":
          this.editingId = null;
          break;
        case "delete":
          if (!confirm("이 과목을 삭제할까요?")) return;
          this.saveChange(() => CourseService.remove(id), () => {
            if (this.editingId === id) this.editingId = null;
            this.render();
          });
          return;
        default:
          return;
      }
      this.render();
    });
  },

  setSaving(saving) {
    const root = this.el();
    root.setAttribute("aria-busy", String(saving));
    for (const control of root.querySelectorAll("button, input, select")) control.disabled = saving;
    const status = root.querySelector("#course-save-status");
    if (status) status.textContent = saving ? "과목 데이터를 저장하는 중입니다…" : "";
  },

  async saveChange(action, onSuccess) {
    const generation = CourseService.generation;
    this.showErrors([]);
    this.setSaving(true);
    try {
      await action();
      if (generation !== CourseService.generation) return;
      onSuccess();
      if (Tabs.current() !== "courses") Tabs.show();
    } catch (error) {
      if (generation === CourseService.generation) this.showErrors([error.message || "저장에 실패했습니다. 다시 시도해 주세요."]);
    } finally {
      if (generation === CourseService.generation) this.setSaving(false);
    }
  },

  showErrors(errors) {
    const el = document.getElementById("form-error");
    if (!el) return;
    el.hidden = errors.length === 0;
    el.textContent = errors.join(" / ");
  },
};
