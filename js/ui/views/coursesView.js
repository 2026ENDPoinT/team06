/**
 * [담당: 프론트엔드] 탭 2 — 학기별 과목
 * 과목 등록/수정 폼 + 학기별 과목 목록
 *
 * 흐름: 입력 → Validator 검증 → CourseService 변경 → render() 로 다시 그리기
 */
const CoursesView = {
  el: () => document.getElementById("view-courses"),
  editingId: null, // 수정 중인 과목 id (없으면 null)

  render() {
    this.el().innerHTML = `
      ${UI.pageHeader("학기별 과목", "과목을 등록하고 학기별로 확인합니다.")}
      ${this.formHtml()}
      <div id="semester-list">${this.listHtml()}</div>
    `;
    this.bindEvents();
  },

  formHtml() {
    const c = this.editingId ? CourseService.getById(this.editingId) : null;
    const grades = ["A+", "A0", "B+", "B0", "C+", "C0", "D+", "D0", "F"];
    const semesters = Object.entries(UI.SEMESTER_LABEL);
    return `
      <div class="card">
        <h2>${c ? "과목 수정" : "과목 등록"}</h2>
        <form id="course-form" class="course-form" novalidate>
          <label>과목명
            <input type="text" name="name" placeholder="예) 자료구조" value="${c ? UI.escape(c.name) : ""}" />
          </label>
          <label>연도
            <input type="number" name="year" value="${c?.year ?? 2026}" />
          </label>
          <label>학기
            <select name="semester">
              ${semesters.map(([v, t]) => `<option value="${v}" ${c?.semester === v ? "selected" : ""}>${t}</option>`).join("")}
            </select>
          </label>
          <label>학점
            <input type="number" name="credits" placeholder="3" value="${c?.credits ?? ""}" />
          </label>
          <label>성적
            <select name="grade">
              ${grades.map((g) => `<option ${c?.grade === g ? "selected" : ""}>${g}</option>`).join("")}
            </select>
          </label>
          <div class="form-actions">
            <button type="submit" class="btn primary">${c ? "저장" : "등록"}</button>
            ${c ? `<button type="button" class="btn" data-action="cancel">취소</button>` : ""}
          </div>
        </form>
        <p class="error" id="form-error" hidden></p>
      </div>`;
  },

  listHtml() {
    const courses = CourseService.getAll();
    if (courses.length === 0) {
      return `<div class="card empty">등록된 과목이 없습니다. 과목을 추가해 보세요.</div>`;
    }

    // 학기별 그룹핑 (GPA 요약이 구현 전이어도 목록은 보이도록 직접 묶음)
    const groups = {};
    for (const c of courses) (groups[`${c.year}-${c.semester}`] ??= []).push(c);
    const summaryMap = Object.fromEntries(
      GPA.summarizeBySemester(courses).map((s) => [s.semesterKey, s])
    );

    return Object.keys(groups)
      .sort()
      .reverse()
      .map((key) => {
        const list = groups[key];
        const s = summaryMap[key];
        return `
          <div class="card" style="margin-top:16px">
            <div class="semester-head">
              <h3>${UI.semesterTitle(list[0].year, list[0].semester)}</h3>
              <span class="meta">평점 ${UI.formatGPA(s?.gpa)} · ${s?.credits ?? "-"}학점</span>
            </div>
            <table>
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
            </table>
          </div>`;
      })
      .join("");
  },

  bindEvents() {
    const root = this.el();

    root.querySelector("#course-form").addEventListener("submit", (e) => {
      e.preventDefault();
      const f = new FormData(e.target);
      const input = Object.fromEntries(f.entries());
      input.name = input.name.trim();

      const { ok, errors } = Validator.validateCourse(input);
      if (!ok) return this.showErrors(errors);

      const data = { ...input, year: Number(input.year), credits: Number(input.credits) };
      if (this.editingId) CourseService.update(this.editingId, data);
      else CourseService.add(data);

      this.editingId = null;
      this.render();
    });

    // 목록 버튼 클릭은 섹션 자체에 한 번만 연결 (render 마다 중복 연결 방지)
    if (this.clickBound) return;
    this.clickBound = true;
    root.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-action]");
      if (!btn) return;
      const id = btn.closest("tr")?.dataset.id;

      if (btn.dataset.action === "edit") {
        this.editingId = id;
        this.render();
      } else if (btn.dataset.action === "delete" && confirm("이 과목을 삭제할까요?")) {
        CourseService.remove(id);
        this.render();
      } else if (btn.dataset.action === "cancel") {
        this.editingId = null;
        this.render();
      }
    });
  },

  showErrors(errors) {
    const el = document.getElementById("form-error");
    el.hidden = errors.length === 0;
    el.textContent = errors.join(" / ");
  },
};
