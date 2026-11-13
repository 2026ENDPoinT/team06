/**
 * [담당: 프론트엔드] 탭 3 — 성적 분석(시각화)
 *
 * 데이터: CourseService.getAll() → GPA.summarizeBySemester / GPA.gradeDistribution
 * 차트 라이브러리(Chart.js 등)를 쓸 경우 각 chart 함수 내부만 바꾸면 된다.
 */
const StatsView = {
  el: () => document.getElementById("view-stats"),

  /** 그래프 아래 짧은 학기 라벨용 */
  SHORT_SEMESTER: { "1": "1", "summer": "여름", "2": "2", "winter": "겨울" },

  /** (2026, "summer") → "26-여름" */
  shortLabel(year, semester) {
    return `${String(year).slice(-2)}-${this.SHORT_SEMESTER[semester] ?? semester}`;
  },

  render() {
    const courses = CourseService.getAll();
    const header = UI.pageHeader("성적 분석", "학기별 추이와 성적 분포를 그래프로 확인합니다.");

    if (courses.length === 0) {
      this.el().innerHTML = `
        ${header}
        <div class="card"><p class="empty">등록된 과목이 없습니다. 학기별 과목 탭에서 과목을 추가해 주세요.</p></div>`;
      return;
    }

    const semesters = GPA.summarizeBySemester(courses).map((s) => ({
      label: UI.escape(this.shortLabel(s.courses[0].year, s.courses[0].semester)),
      gpa: s.gpa,
      credits: s.credits,
    }));
    const grades = GPA.gradeDistribution(courses);
    const creditMax = Math.max(24, ...semesters.map((s) => s.credits));

    this.el().innerHTML = `
      ${header}

      <div class="card">
        <h2>학기별 평점 추이</h2>
        ${this.barChart(semesters.map((s) => ({ label: s.label, value: s.gpa ?? 0, text: UI.formatGPA(s.gpa) })), 4.5)}
      </div>

      <div class="grid-2">
        <div class="card">
          <h2>성적 등급 분포</h2>
          ${this.distribution(grades)}
        </div>
        <div class="card">
          <h2>학기별 이수 학점</h2>
          ${this.barChart(semesters.map((s) => ({ label: s.label, value: s.credits, text: `${s.credits}` })), creditMax, "soft")}
        </div>
      </div>
    `;
    // 넘치는 그래프는 최근 학기가 보이도록 오른쪽 끝으로
    this.el().querySelectorAll(".bar-scroll").forEach((el) => { el.scrollLeft = el.scrollWidth; });
  },

  /** 세로 막대 그래프 (CSS 로만 그림)
   *  학기가 많아지면 막대가 좁아지는 대신 칸마다 최소 너비를 두고 가로 스크롤 → 최근 학기(오른쪽 끝)부터 보여준다 */
  barChart(items, max, variant = "") {
    return `
      <div class="bar-scroll"><div class="bar-inner" style="min-width:${items.length * 56}px">
      <div class="chart-box">
        ${items.map((it) => `
          <div class="bar-col">
            <span class="bar-value">${it.text}</span>
            <div class="bar ${variant}" style="height:${(it.value / max) * 85}%"></div>
          </div>`).join("")}
      </div>
      <div class="bar-labels">${items.map((it) => `<span>${it.label}</span>`).join("")}</div>
      </div></div>`;
  },

  /** 등급별 가로 막대 */
  distribution(grades) {
    const max = Math.max(1, ...Object.values(grades));
    return Object.entries(grades)
      .map(([g, n]) => `
        <div class="legend-row">
          <span class="name">${g}</span>
          <div class="track"><div class="fill" style="width:${(n / max) * 100}%"></div></div>
          <span class="count">${n}과목</span>
        </div>`)
      .join("");
  },
};
