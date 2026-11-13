/**
 * [담당: 프론트엔드] 탭 1 — 메인
 * 인사말, 주요 지표 3칸, 학기별 평점 그래프, 총 평점 + 한마디, AI 조언 자리
 */
const DashboardView = {
  el: () => document.getElementById("view-dashboard"),

  // TODO: 설정 화면에서 닉네임을 저장하게 되면 그 값으로 교체
  NICKNAME: "닉네임",

  /** 총 평점에 따라 달라지는 한마디 */
  message(gpa) {
    if (gpa == null) return "과목을 등록하면 평점을 계산해 드려요.";
    if (gpa >= 4.0) return "이대로만 가면 돼요. 지금의 나를 믿어요.";
    if (gpa >= 3.5) return "충분히 잘하고 있어요. 한 과목만 더 챙겨볼까요?";
    if (gpa >= 3.0) return "기초는 탄탄해요. 다음 학기엔 한 단계 위를 노려봐요.";
    if (gpa >= 2.0) return "조금 지쳤나요? 작은 목표부터 다시 세워봐요.";
    return "지금부터가 진짜예요. 한 학기씩 다시 쌓아가요.";
  },

  /** "2026-1" → "26-1", "2026-summer" → "26-여름" */
  shortLabel(semesterKey) {
    const [year, sem] = semesterKey.split("-");
    const s = { "1": "1", "2": "2", summer: "여름", winter: "겨울" }[sem] ?? sem;
    return `${year.slice(2)}-${s}`;
  },

  render() {
    const courses = CourseService.getAll();
    const totalGpa = GPA.calcGPA(courses);
    const semesters = GPA.summarizeBySemester(courses);
    const latest = semesters[semesters.length - 1];
    const previous = semesters[semesters.length - 2];

    // GPA 기능이 연결되기 전에는 그래프만 예시 데이터로 보여준다
    const usingSample = semesters.length === 0;
    const points = usingSample
      ? StatsView.SAMPLE.semesters.map((s) => ({ label: s.label, gpa: s.gpa }))
      : semesters.map((s) => ({ label: this.shortLabel(s.semesterKey), gpa: s.gpa }));

    this.el().innerHTML = `
      <h1 class="greeting"><span class="nickname">${UI.escape(this.NICKNAME)}</span>님의 성적은 이래왔어요</h1>

      <div class="kpi-grid">
        <div class="card kpi">
          <div class="label">이번 학기 이수학점 / 총 이수학점</div>
          <div class="value">${latest?.credits ?? "-"}<span class="slash">/</span>${GPA.sumCredits(courses)}<small>학점</small></div>
        </div>
        <div class="card kpi">
          <div class="label">수강 과목 수</div>
          <div class="value">${courses.length}<small>과목</small></div>
        </div>
        <div class="card kpi">
          <div class="label">지난 학기 평점</div>
          <div class="value">${UI.formatGPA(previous?.gpa)}<small>/ 4.5</small></div>
          <div class="sub">${previous ? UI.semesterTitle(previous.courses[0].year, previous.courses[0].semester) : "지난 학기 기록 없음"}</div>
        </div>
      </div>

      <div class="dash-main">
        <div class="chart-area">
          <h2 class="chart-title">학기별 평점</h2>
          ${usingSample ? `<span class="placeholder-note">예시 그래프 · 기능 연결 후 실제 데이터로 바뀌어요</span>` : ""}
          ${this.lineChart(points)}
        </div>

        <div class="dash-side">
          <div class="total-box">
            <div class="label">총 평점 평균</div>
            <div class="total">${UI.formatGPA(totalGpa)}<small>/ 4.5</small></div>
            <p class="total-msg">“${this.message(totalGpa)}”</p>
          </div>

          <div class="advisor">
            ${this.robot()}
            <div class="advice-bubble">
              <div class="label">AI 조언</div>
              <p class="muted">준비 중이에요. 등록한 성적을 바탕으로 다음 학기 조언을 들려줄 거예요.</p>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  /** 학기별 평점 꺾은선 그래프 (SVG, 0 ~ 4.5) */
  lineChart(points) {
    const W = 520, H = 340, L = 48, R = 16, T = 16, B = 40;
    const pad = 32; // 첫 점이 세로축에 붙지 않도록
    const x = (i) => L + pad + (points.length === 1 ? (W - L - R - 2 * pad) / 2 : (i * (W - L - R - 2 * pad)) / (points.length - 1));
    const y = (v) => T + (1 - v / 4.5) * (H - T - B);
    const ticks = [0.5, 1.5, 2.5, 3.5, 4.5];
    const valid = points.filter((p) => p.gpa != null);

    return `
      <svg class="line-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="학기별 평점 그래프">
        ${ticks.map((t) => `
          <line class="grid" x1="${L}" x2="${W - R}" y1="${y(t)}" y2="${y(t)}" />
          <text class="tick" x="${L - 10}" y="${y(t) + 5}" text-anchor="end">${t}</text>`).join("")}
        <line class="axis" x1="${L}" x2="${L}" y1="${T - 8}" y2="${H - B}" />
        <line class="axis" x1="${L}" x2="${W - R}" y1="${H - B}" y2="${H - B}" />
        <polyline class="trend" points="${points.map((p, i) => p.gpa == null ? "" : `${x(i)},${y(p.gpa)}`).join(" ")}" />
        ${points.map((p, i) => `
          ${p.gpa == null ? "" : `<circle class="dot" cx="${x(i)}" cy="${y(p.gpa)}" r="4.5"><title>${p.label}: ${p.gpa.toFixed(2)}</title></circle>`}
          <text class="xlabel" x="${x(i)}" y="${H - 12}" text-anchor="middle">${UI.escape(p.label)}</text>`).join("")}
        ${valid.length ? "" : `<text class="tick" x="${W / 2}" y="${H / 2}" text-anchor="middle">기록된 평점이 없어요</text>`}
      </svg>`;
  },

  /** AI 조언 캐릭터 (임시 그림) */
  robot() {
    return `
      <svg class="robot" viewBox="0 0 100 150" aria-hidden="true">
        <g fill="var(--paper)" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round">
          <path d="M20 46c0-22 14-36 32-36s30 14 30 36-12 32-31 32-31-10-31-32z"/>
          <rect x="30" y="34" width="44" height="26" rx="6"/>
          <path d="M28 88h46l4 34H24z"/>
          <path d="M74 96l18-14"/><path d="M90 78l6 2-2 6"/>
          <path d="M28 96l-8 24"/>
          <path d="M36 122v20M62 122v20"/>
        </g>
        <circle cx="44" cy="47" r="4" fill="currentColor"/>
        <circle cx="60" cy="47" r="4" fill="currentColor"/>
        <circle cx="52" cy="14" r="2" fill="currentColor"/>
      </svg>`;
  },
};
