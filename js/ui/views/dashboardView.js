/**
 * [담당: 프론트엔드] 탭 1 — 대시보드
 * 전체 GPA 와 주요 지표를 한눈에 보여준다.
 */
const DashboardView = {
  el: () => document.getElementById("view-dashboard"),

  render() {
    const courses = CourseService.getAll();
    const totalGpa = GPA.calcGPA(courses);
    const totalCredits = GPA.sumCredits(courses);
    const semesters = GPA.summarizeBySemester(courses);
    const latest = semesters[semesters.length - 1];

    this.el().innerHTML = `
      ${UI.pageHeader("대시보드", "전체 성적을 한눈에 확인합니다.")}

      <div class="kpi-grid">
        <div class="card kpi highlight">
          <div class="label">누적 평점평균</div>
          <div class="value">${UI.formatGPA(totalGpa)}<small>/ 4.5</small></div>
        </div>
        <div class="card kpi">
          <div class="label">총 이수 학점</div>
          <div class="value">${totalCredits}<small>학점</small></div>
        </div>
        <div class="card kpi">
          <div class="label">수강 과목 수</div>
          <div class="value">${courses.length}<small>과목</small></div>
        </div>
        <div class="card kpi">
          <div class="label">최근 학기 평점</div>
          <div class="value">${UI.formatGPA(latest?.gpa)}<small>/ 4.5</small></div>
        </div>
      </div>

      <div class="grid-2">
        <div class="card">
          <h2>학기별 요약</h2>
          ${this.semesterList(semesters)}
        </div>
        <div class="card">
          <h2>최근 등록한 과목</h2>
          ${this.recentCourses(courses)}
        </div>
      </div>
    `;
  },

  semesterList(semesters) {
    if (semesters.length === 0) {
      return `<p class="empty">GPA 계산 기능 연결 후 표시됩니다.</p>`;
    }
    return `<ul class="recent-list">
      ${semesters
        .map((s) => {
          const { year, semester } = s.courses[0];
          return `<li><span>${UI.semesterTitle(year, semester)}</span>
                  <span>${UI.formatGPA(s.gpa)} · ${s.credits}학점</span></li>`;
        })
        .join("")}
    </ul>`;
  },

  recentCourses(courses) {
    if (courses.length === 0) return `<p class="empty">등록된 과목이 없습니다.</p>`;
    return `<ul class="recent-list">
      ${courses
        .slice(-5)
        .reverse()
        .map((c) => `<li><span>${UI.escape(c.name)}</span><span class="muted">${c.grade} · ${c.credits}학점</span></li>`)
        .join("")}
    </ul>`;
  },
};
