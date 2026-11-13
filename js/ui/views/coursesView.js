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
  SEMESTER_ORDER: { "1": 1, summer: 2, "2": 3, winter: 4 },

  selectedKey: null,  // 선택된 학기 탭 ("2026-1")
  editingId: null,    // 수정 중인 과목 id (없으면 null)
  adding: false,      // + 눌러서 학기 추가 칸이 열려 있는지
  // ponytail: 과목이 없는 새 학기는 화면에만 기억 → 새로고침하면 사라짐. 빈 학기도 저장해야 하면 DataStore 에 키 추가
  emptySemesters: new Set(),

  /** 탭 순서: 연도 → 1학기, 여름, 2학기, 겨울 */
  compareKeys(a, b) {
    const [ya, sa] = a.split("-");
    const [yb, sb] = b.split("-");
    return ya - yb || this.SEMESTER_ORDER[sa] - this.SEMESTER_ORDER[sb];
  },

  titleOf(key) {
    const [year, sem] = key.split("-");
    return UI.semesterTitle(year, sem);
  },

  render() {
    const courses = CourseService.getAll();
    const groups = {};
    for (const c of courses) (groups[`${c.year}-${c.semester}`] ??= []).push(c);
    for (const key of this.emptySemesters) groups[key] ??= [];

    const keys = Object.keys(groups).sort((a, b) => this.compareKeys(a, b));
    if (!keys.includes(this.selectedKey)) this.selectedKey = keys[keys.length - 1] ?? null;

    this.el().innerHTML = `
      ${UI.pageHeader("과목·성적", "학기를 고르고 그 학기에 들은 과목을 등록해요.")}

      <div class="sem-book">
        <div class="sem-tabs" role="tablist">
          ${keys.map((k) => `
            <button class="sem-tab ${k === this.selectedKey ? "active" : ""}" role="tab"
                    aria-selected="${k === this.selectedKey}" data-action="select" data-key="${k}">${this.titleOf(k)}</button>`).join("")}
          <button class="sem-add" data-action="${this.adding ? "close-add" : "open-add"}" aria-expanded="${this.adding}"
                  aria-label="학기 추가" title="학기 추가">+</button>
        </div>

        ${this.adding ? this.addSemesterHtml() : ""}

        ${this.selectedKey ? this.semesterHtml(this.selectedKey, groups[this.selectedKey]) : `
          <div class="sem-page"><p class="empty">아직 학기가 없어요. 오른쪽 위 + 버튼으로 학기를 추가하세요.</p></div>`}
      </div>
    `;
    this.bindEvents();
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
    const s = GPA.summarizeBySemester(list).find((x) => x.semesterKey === key);
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

        ${list.length === 0
          ? `<p class="empty">이 학기에 등록한 과목이 없어요. 위에서 과목을 추가하세요.</p>`
          : `<table>
              <thead><tr><th>과목명</th><th>학점</th><th>성적</th><th></th></tr></thead>
              <tbody>
                ${list.map((c) => `
                  <tr data-id="${c.id}">
                    <td>${UI.escape(c.name)}</td>
                    <td>${c.credits}</td>
                    <td>${c.grade}</td>
                    <td class="actions">
                      <button class="btn small" data-action="edit">수정</button>
                      <button class="btn small danger" data-action="delete">삭제</button>
                    </td>
                  </tr>`).join("")}
              </tbody>
            </table>`}
      </div>`;
  },

  /** 이벤트는 섹션 자체에 한 번만 연결 (render 마다 중복 연결 방지) */
  bindEvents() {
    if (this.bound) return;
    this.bound = true;
    const root = this.el();

    root.addEventListener("submit", (e) => {
      e.preventDefault();
      const f = Object.fromEntries(new FormData(e.target).entries());

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
      const { ok, errors } = Validator.validateCourse(input);
      if (!ok) return this.showErrors(errors);

      const data = { ...input, year: Number(year), credits: Number(input.credits) };
      if (this.editingId) CourseService.update(this.editingId, data);
      else CourseService.add(data);

      // 과목이 생긴 학기는 더 이상 '빈 학기'가 아님 → 과목을 다 지우면 탭도 바로 사라진다
      this.emptySemesters.delete(this.selectedKey);
      this.editingId = null;
      this.render();
    });

    root.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-action]");
      if (!btn) return;
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
          CourseService.remove(id);
          break;
        default:
          return;
      }
      this.render();
    });
  },

  showErrors(errors) {
    const el = document.getElementById("form-error");
    el.hidden = errors.length === 0;
    el.textContent = errors.join(" / ");
  },
};
