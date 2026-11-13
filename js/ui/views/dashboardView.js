/**
 * [담당: 프론트엔드] 탭 1 — 메인
 * 인사말, 주요 지표 3칸, 학기별 평점 그래프, 총 평점 + 한마디, AI 조언 자리,
 * 성적 등급 분포(원형), 지난 나로부터의 메세지(읽기 전용)
 */
const DashboardView = {
  el: () => document.getElementById("view-dashboard"),

  // 기본 닉네임 (app.js 가 Google 계정 이름 또는 "게스트"로 정함)
  NICKNAME: "닉네임",
  NICKNAME_MAX: 20,

  adviceKey(courses) {
    return JSON.stringify([CourseService.uid, CourseService.generation, courses]);
  },

  adviceState(courses) {
    const key = this.adviceKey(courses);
    if (this.aiAdvice?.key !== key) this.aiAdvice = { key, text: "", error: "", busy: false };
    return this.aiAdvice;
  },

  adviceHtml(courses) {
    const state = this.adviceState(courses);
    const disabled = state.busy || !courses.length || CourseService.loading || CourseService.loadError || CourseService.saving || !FirebaseAuth.ready || !FirebaseAuth.app;
    return `
      <div class="label">AI 조언</div>
      <p data-advice-result role="status" aria-live="polite" style="white-space: pre-wrap; overflow-wrap: anywhere" class="${state.error ? "error" : ""}">${UI.escape(state.busy ? "성적을 분석하고 있어요…" : state.error || state.text || (courses.length ? "성적 흐름을 살펴보고 다음 학기 학습 계획을 제안해요." : "과목을 등록하면 AI 조언을 받을 수 있어요."))}</p>
      <p class="muted"><small>버튼을 누르면 GPA·학점·등급·학기별 요약을 Gemini에 전송해요. AI 답변은 참고용이에요.</small></p>
      <button type="button" class="btn" data-ai-advice ${disabled ? "disabled" : ""}>${state.busy ? "생성 중…" : state.text || state.error ? "다시 요청" : "AI 조언 받기"}</button>`;
  },

  refreshAdvice() {
    const bubble = this.el().querySelector(".advice-bubble");
    if (!bubble) return;
    bubble.innerHTML = this.adviceHtml(CourseService.getAll());
    bubble.querySelector("[data-ai-advice]").addEventListener("click", () => this.requestAdvice());
  },

  async requestAdvice() {
    const courses = CourseService.getAll();
    const state = this.adviceState(courses);
    if (state.busy || !courses.length || !FirebaseAuth.ready || !FirebaseAuth.app) return;
    try {
      CourseService.assertReady();
      state.busy = true;
      state.error = "";
      this.refreshAdvice();
      const text = await FirebaseAuth.generateAdvice(courses);
      if (this.aiAdvice !== state || this.adviceKey(CourseService.getAll()) !== state.key) return;
      state.text = text;
    } catch (error) {
      if (this.aiAdvice === state && this.adviceKey(CourseService.getAll()) === state.key) state.error = FirebaseAuth.adviceError(error);
    } finally {
      state.busy = false;
      this.refreshAdvice();
    }
  },

  /** 설정에서 바꾼 닉네임은 계정(또는 게스트)별로 이 브라우저에 저장 */
  nicknameKey() {
    return `team06.nickname.${CourseService.uid || "guest"}`;
  },

  /** 화면에 쓸 닉네임: 직접 정한 이름이 있으면 그것, 없으면 기본 닉네임 */
  nickname() {
    try {
      return localStorage.getItem(this.nicknameKey())?.trim() || this.NICKNAME;
    } catch {
      return this.NICKNAME;
    }
  },

  /** 직접 정한 닉네임만 (기본값을 쓰는 중이면 null) — JSON 백업용 */
  customNickname() {
    const name = this.nickname();
    return name === this.NICKNAME ? null : name;
  },

  /** 지난 나로부터의 메세지 (없으면 null) */
  pastMessage() {
    try {
      return localStorage.getItem(this.PAST_MESSAGE_KEY) || null;
    } catch {
      return null;
    }
  },

  /** 빈 값이면 메세지를 지운다. 저장 실패 시 예외 */
  savePastMessage(text) {
    const value = String(text ?? "").trim();
    if (value) localStorage.setItem(this.PAST_MESSAGE_KEY, value);
    else localStorage.removeItem(this.PAST_MESSAGE_KEY);
  },

  /** 빈 값이면 기본 닉네임으로 되돌린다. @returns {boolean} 저장 성공 여부 */
  saveNickname(name) {
    const value = String(name ?? "").trim().slice(0, this.NICKNAME_MAX);
    try {
      if (value && value !== this.NICKNAME) localStorage.setItem(this.nicknameKey(), value);
      else localStorage.removeItem(this.nicknameKey());
      return true;
    } catch {
      return false;
    }
  },

  // "미래의 나에게 메세지 보내기" 팝업에서 저장 → "지난 나로부터의 메세지" 칸에 뜬다 (칸 자체는 읽기 전용)
  PAST_MESSAGE_KEY: "team06.pastMessage",

  GRADE_COLORS: {
    "A+": "#1d2b4a", "A0": "#3f5a8a", "B+": "#9cc3b4", "B0": "#5f9c86",
    "C+": "#e7c873", "C0": "#c9a443", "D+": "#e8a598", "D0": "#d3746a", "F": "#c8322e", "PASS": "#b8bfcc", "FAIL": "#6b7385",
  },

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

    const points = semesters
      .filter((s) => !/-(summer|winter)$/.test(s.semesterKey)) // 계절학기는 그래프에서 제외
      .map((s) => ({ label: this.shortLabel(s.semesterKey), gpa: s.gpa }));

    const grades = GPA.gradeDistribution(courses);
    const pastMessage = this.pastMessage();

    this.el().innerHTML = `
      <h1 class="greeting"><span class="nickname">${UI.escape(this.nickname())}</span>님의 성적은 이래왔어요</h1>

      <div class="dash-row">
        <div class="kpi-grid">
          <div class="card kpi">
            <div class="label">이번 학기 이수학점 / 총 이수학점</div>
            <div class="value">${latest?.credits ?? "-"}<span class="slash">/</span>${GPA.sumCredits(courses)}<small>학점</small></div>
          </div>
          <div class="card kpi">
            <div class="label">수강 과목 수</div>
            <div class="value">${courses.length}<small>과목</small></div>
          </div>
        </div>

        <div class="total-box">
          <div class="label">총 평점 평균</div>
          <div class="total">${UI.formatGPA(totalGpa)}<small>/ 4.5</small></div>
          <p class="total-msg">“${this.message(totalGpa)}”</p>
        </div>
      </div>

      <div class="dash-row charts">
        <div class="chart-area">
          <h2 class="chart-title">학기별 평점</h2>
          ${this.lineChart(points)}
        </div>

        <div class="chart-area">
          <h2 class="chart-title">성적 등급 분포</h2>
          ${this.pieChart(grades)}
        </div>
      </div>

      <div class="dash-row">
        <div class="advisor">
          ${this.robot()}
          <div class="advice-bubble">
            ${this.adviceHtml(courses)}
          </div>
        </div>

        <div class="past-wrap">
          <div class="past-message">
            <div class="label">지난 나로부터의 메세지</div>
            <p class="${pastMessage ? "" : "muted"}">${pastMessage ? UI.escape(pastMessage) : "아직 남겨둔 메세지가 없어요."}</p>
          </div>
          <button type="button" class="send-future">미래의 나에게 메세지 보내기</button>
        </div>
      </div>

      <dialog class="future-dialog" aria-labelledby="future-title">
        <form method="dialog">
          <h2 id="future-title">미래의 나에게</h2>
          <textarea name="message" rows="6" maxlength="300" required
                    placeholder="다음 학기의 나에게 하고 싶은 말을 적어 주세요.">${UI.escape(pastMessage ?? "")}</textarea>
          <div class="future-actions">
            <button class="btn" value="cancel" formnovalidate>취소</button>
            <button class="btn primary" value="ok">확인</button>
          </div>
        </form>
      </dialog>
    `;

    this.refreshAdvice();
    const dialog = this.el().querySelector(".future-dialog");
    this.el().querySelector(".send-future").addEventListener("click", () => dialog.showModal());
    dialog.querySelector("form").addEventListener("submit", (e) => {
      if (e.submitter?.value !== "ok") return; // 취소: 저장 없이 닫힘
      try {
        this.savePastMessage(dialog.querySelector("textarea").value);
      } catch {
        alert("메세지를 저장하지 못했어요.");
      }
      this.render();
    });
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
          ${p.gpa == null ? "" : `<circle class="dot" cx="${x(i)}" cy="${y(p.gpa)}" r="4.5"><title>${p.label}: ${p.gpa.toFixed(2)}</title></circle>
          <text class="dot-value" x="${x(i)}" y="${y(p.gpa) > H - B - 24 ? y(p.gpa) - 10 : y(p.gpa) + 19}" text-anchor="middle">${p.gpa.toFixed(2)}</text>`}
          <text class="xlabel" x="${x(i)}" y="${H - 12}" text-anchor="middle">${UI.escape(p.label)}</text>`).join("")}
        ${valid.length ? "" : `<text class="tick" x="${W / 2}" y="${H / 2}" text-anchor="middle">기록된 평점이 없어요</text>`}
      </svg>`;
  },

  /** 등급 분포 원형 그래프 (CSS conic-gradient) */
  pieChart(grades) {
    const entries = Object.entries(grades).filter(([, n]) => n > 0);
    const total = entries.reduce((sum, [, n]) => sum + n, 0);
    if (!total) return `<p class="muted">기록된 성적이 없어요</p>`;
    let acc = 0;
    const stops = entries.map(([g, n]) => {
      const from = (acc / total) * 100;
      acc += n;
      return `${this.GRADE_COLORS[g] ?? "#999"} ${from}% ${(acc / total) * 100}%`;
    });
    return `
      <div class="pie-wrap">
        <div class="pie" style="background: conic-gradient(${stops.join(", ")})" role="img"
             aria-label="성적 등급 분포: ${entries.map(([g, n]) => `${g} ${n}과목`).join(", ")}"></div>
        <ul class="pie-legend">
          ${entries.map(([g, n]) => `
            <li><i style="background:${this.GRADE_COLORS[g] ?? "#999"}"></i>${g}<span>${n}과목 · ${Math.round((n / total) * 100)}%</span></li>`).join("")}
        </ul>
      </div>`;
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
