/**
 * [담당: 프론트엔드] 탭 3 — 성적 분석(시각화)
 *
 * 지금은 화면 확인용 예시 데이터(SAMPLE)로 그린다.
 * GPA.summarizeBySemester / GPA.gradeDistribution 이 구현되면 SAMPLE 대신 실제 데이터로 교체.
 * 차트 라이브러리(Chart.js 등)를 쓸 경우 각 chart 함수 내부만 바꾸면 된다.
 */
const StatsView = {
  el: () => document.getElementById("view-stats"),

  // TODO: 실제 데이터 연결 후 삭제
  SAMPLE: {
    semesters: [
      { label: "25-1", gpa: 3.42, credits: 18 },
      { label: "25-2", gpa: 3.78, credits: 19 },
      { label: "26-1", gpa: 4.05, credits: 18 },
      { label: "26-2", gpa: 3.91, credits: 17 },
    ],
    grades: { "A+": 6, "A0": 5, "B+": 4, "B0": 3, "C+": 1, "C0": 1, "D+": 0, "D0": 0, "F": 0 },
  },

  render() {
    const { semesters, grades } = this.SAMPLE;

    this.el().innerHTML = `
      ${UI.pageHeader("성적 분석", "학기별 추이와 성적 분포를 그래프로 확인합니다.")}
      <span class="placeholder-note">예시 데이터로 표시 중 — 기능 연결 후 실제 데이터로 바뀝니다</span>

      <div class="card">
        <h2>학기별 평점 추이</h2>
        ${this.barChart(semesters.map((s) => ({ label: s.label, value: s.gpa, text: s.gpa.toFixed(2) })), 4.5)}
      </div>

      <div class="grid-2">
        <div class="card">
          <h2>성적 등급 분포</h2>
          ${this.distribution(grades)}
        </div>
        <div class="card">
          <h2>학기별 이수 학점</h2>
          ${this.barChart(semesters.map((s) => ({ label: s.label, value: s.credits, text: `${s.credits}` })), 24, "soft")}
        </div>
      </div>
    `;
  },

  /** 세로 막대 그래프 (CSS 로만 그림) */
  barChart(items, max, variant = "") {
    return `
      <div class="chart-box">
        ${items.map((it) => `
          <div class="bar-col">
            <span class="bar-value">${it.text}</span>
            <div class="bar ${variant}" style="height:${(it.value / max) * 85}%"></div>
          </div>`).join("")}
      </div>
      <div class="bar-labels">${items.map((it) => `<span>${it.label}</span>`).join("")}</div>`;
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
