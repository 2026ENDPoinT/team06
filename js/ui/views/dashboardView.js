/**
 * [담당: 프론트엔드] 탭 1 — 메인
 * 인사말, 주요 지표 3칸, 학기별 평점 그래프, 총 평점 + 한마디,
 * 목표 GPA 시뮬레이터(사다리를 오르는 캐릭터 + 말풍선),
 * 성적 등급 분포(원형), 지난 나로부터의 메세지(읽기 전용)
 */
const DashboardView = {
  el: () => document.getElementById("view-dashboard"),

  // 기본 닉네임 (app.js 가 Google 계정 이름 또는 "게스트"로 정함)
  NICKNAME: "닉네임",
  NICKNAME_MAX: 20,

  /** 목표 평점은 계정(또는 게스트)별로 이 브라우저에 저장 */
  targetKey() {
    return `team06.targetGpa.${CourseService.uid || "guest"}`;
  },

  savedTarget() {
    try {
      return localStorage.getItem(this.targetKey()) ?? "";
    } catch {
      return "";
    }
  },

  saveTarget(value) {
    try {
      if (value) localStorage.setItem(this.targetKey(), value);
      else localStorage.removeItem(this.targetKey());
    } catch { /* 저장 실패해도 계산은 그대로 */ }
  },

  /** 평균 평점에 해당하는 등급 (그 평점 이상인 가장 낮은 등급) */
  gradeFor(points) {
    const entries = Object.entries(GPA.GRADE_POINTS).sort((a, b) => a[1] - b[1]);
    return entries.find(([, p]) => p >= points)?.[0] ?? "A+";
  },

  /** 목표 GPA 시뮬레이터 결과 문구 (HTML) */
  targetResultHtml(raw) {
    const text = String(raw ?? "").trim();
    if (!text) return `<p class="muted">목표 평점을 입력하면 졸업(${GPA.GRADUATION_CREDITS}학점)까지 받아야 할 평균 평점을 알려드려요.</p>`;
    const target = Number(text);
    if (!Number.isFinite(target) || target < 0 || target > 4.5) {
      return `<p class="error">목표 평점은 0.00 ~ 4.50 사이로 입력해 주세요.</p>`;
    }

    const r = GPA.simulateTarget(CourseService.getAll(), target);
    const fmt = (n) => n.toFixed(2);

    let body;
    if (r.status === "achieved") {
      const keep = r.required == null ? ""
        : r.required <= 0 ? " 남은 학점을 어떻게 받아도 목표 이상을 지킬 수 있어요."
        : ` 남은 ${r.remaining}학점에서 평균 ${fmt(r.required)} 이상이면 그대로 유지돼요.`;
      body = `<p class="goal-msg">🎉 이미 목표를 달성했어요! 지금 페이스 그대로 가면 돼요.</p>
        <p>현재 평점이 목표 ${fmt(target)} 이상이에요.${keep}</p>`;
    } else if (r.status === "impossible") {
      const reason = r.remaining > 0
        ? `남은 ${r.remaining}학점을 모두 A+로 받아도 최종 평점은 ${fmt(r.maxGpa)}까지만 오를 수 있어요.`
        : "졸업 학점을 이미 모두 채워서 평점을 더 올리기 어려워요.";
      const hint = r.remaining > 0 ? `${fmt(r.maxGpa)} 이하의 ` : "";
      body = `<p class="goal-msg">지금까지 정말 열심히 달려왔어요. 숫자가 전부는 아니니 너무 낙심하지 마세요.</p>
        <p>${reason}</p>
        <p><strong>${hint}조금 더 낮은 목표를 입력해 보세요.</strong></p>`;
    } else {
      body = `<p>남은 <strong>${r.remaining}학점</strong>에서 평균 <strong class="goal-need">${fmt(Math.max(0, r.required))}</strong> 이상
        (대략 <strong>${this.gradeFor(r.required)}</strong> 수준)을 받으면 목표 ${fmt(target)}에 도달해요.</p>`;
    }
    return body;
  },

  targetHtml() {
    const saved = this.savedTarget();
    return `
      <div class="label">목표 GPA 시뮬레이터</div>
      <label class="goal-input">목표 평점
        <input type="number" inputmode="decimal" min="0" max="4.5" step="0.01" placeholder="예) 3.80" value="${UI.escape(saved)}" data-target-gpa />
        <span class="muted">/ 4.5</span>
      </label>
      <div data-target-result role="status" aria-live="polite">${this.targetResultHtml(saved)}</div>`;
  },

  bindTarget() {
    const bubble = this.el().querySelector(".goal-bubble");
    const input = bubble?.querySelector("[data-target-gpa]");
    if (!input) return;
    input.addEventListener("input", () => {
      this.saveTarget(input.value.trim());
      bubble.querySelector("[data-target-result]").innerHTML = this.targetResultHtml(input.value);
    });
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
        <div class="goal">
          ${this.climber()}
          <div class="goal-bubble">
            ${this.targetHtml()}
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

    this.bindTarget();
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

    // 선이 왼쪽부터 그려지는 애니메이션용: 각 점까지 누적 길이 → 점이 나타나는 시점
    const DRAW = 0.8, START = 0.1; // 초 (css/views/dashboard.css 의 draw-line 과 맞춤)
    const coords = points.map((p, i) => (p.gpa == null ? null : [x(i), y(p.gpa)]));
    const reach = [];
    let len = 0, last = null;
    coords.forEach((c, i) => {
      if (!c) return;
      if (last) len += Math.hypot(c[0] - last[0], c[1] - last[1]);
      reach[i] = len;
      last = c;
    });
    const delay = (i) => `${(START + (len ? (reach[i] / len) * DRAW : 0)).toFixed(2)}s`;

    return `
      <svg class="line-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="학기별 평점 그래프">
        ${ticks.map((t) => `
          <line class="grid" x1="${L}" x2="${W - R}" y1="${y(t)}" y2="${y(t)}" />
          <text class="tick" x="${L - 10}" y="${y(t) + 5}" text-anchor="end">${t}</text>`).join("")}
        <line class="axis" x1="${L}" x2="${L}" y1="${T - 8}" y2="${H - B}" />
        <line class="axis" x1="${L}" x2="${W - R}" y1="${H - B}" y2="${H - B}" />
        <polyline class="trend" style="--len:${Math.ceil(len) + 1}" points="${coords.filter(Boolean).map((c) => c.join(",")).join(" ")}" />
        ${points.map((p, i) => `
          ${p.gpa == null ? "" : `<circle class="dot" style="--d:${delay(i)}" cx="${x(i)}" cy="${y(p.gpa)}" r="4.5"><title>${p.label}: ${p.gpa.toFixed(2)}</title></circle>
          <text class="dot-value" style="--d:${delay(i)}" x="${x(i)}" y="${y(p.gpa) > H - B - 24 ? y(p.gpa) - 10 : y(p.gpa) + 19}" text-anchor="middle">${p.gpa.toFixed(2)}</text>`}
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

  /**
   * 목표를 향해 사다리를 오르는 낙서 캐릭터.
   * 보는 사람 쪽을 향한 채 오른손(화면 왼쪽)은 사다리를 잡고, 왼손(화면 오른쪽)은 말풍선 쪽으로 흔든다.
   * 그리는 순서 = 겹치는 순서: 사다리 → 다리 → 몸·머리 → 팔·손
   */
  climber() {
    return `
      <svg class="climber" viewBox="0 0 130 200" aria-hidden="true">
        <g fill="none" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round">
          <!-- 사다리 -->
          <path d="M40 198L46 4M92 198L88 4"/>
          <path d="M45.3 26h43.2M44.4 56h44.7M43.5 86h46.2M42.5 116h47.8M41.6 146h49.3M40.7 176h50.8"/>
          <!-- 다리: 화면 왼쪽은 굽혀 윗칸을, 오른쪽은 뻗어 아랫칸을 딛는다 -->
          <path d="M63 128l-11 8 7 10M52 146h14"/>
          <path d="M82 128l2 48M78 176h13"/>
          <!-- 몸·머리 (기존 로봇 그림을 0.78배로) -->
          <g transform="translate(34 34) scale(.78)" fill="var(--paper)" stroke-width="3.2">
            <path d="M28 88h46l4 34H24z"/>
            <path d="M20 46c0-22 14-36 32-36s30 14 30 36-12 32-31 32-31-10-31-32z"/>
            <rect x="30" y="34" width="44" height="26" rx="6"/>
            <circle cx="44" cy="47" r="4" fill="currentColor" stroke="none"/>
            <circle cx="60" cy="47" r="4" fill="currentColor" stroke="none"/>
            <circle cx="52" cy="14" r="2" fill="currentColor" stroke="none"/>
            <path d="M46 54q6 4 12 0" fill="none"/>
          </g>
          <!-- 오른손: 사다리 기둥을 잡음 -->
          <path d="M57 110q-18 5-13.5-19"/>
          <circle cx="43.5" cy="89" r="5" fill="var(--paper)"/>
          <!-- 왼손: 들어 올려 흔듦 + 흔드는 선 -->
          <path d="M92 109q16-3 20-27"/>
          <circle cx="113" cy="77" r="5.5" fill="var(--paper)"/>
          <path d="M121 66q5 7 2 15M104 65q5-6 13-4" stroke-width="2"/>
        </g>
      </svg>`;
  },
};
