/**
 * [담당: 기능 A] 평점평균(GPA) 계산  — 필수 기능 3
 *
 * Course 객체 형태는 README.md "데이터 모델" 참고.
 * 다른 파일은 아래 함수 이름/반환 형태만 믿고 사용하므로, 시그니처는 바꾸지 말 것.
 */
const GPA = {
  /** 등급 → 평점 (4.5 만점) */
  GRADE_POINTS: {
    "A+": 4.5, "A0": 4.0,
    "B+": 3.5, "B0": 3.0,
    "C+": 2.5, "C0": 2.0,
    "D+": 1.5, "D0": 1.0,
    "F": 0.0,
  },

  /** 한 해 안에서의 학기 순서 (문자열 정렬하면 "2" < "summer" 가 되어 틀리므로 직접 지정) */
  SEMESTER_ORDER: { "1": 1, "summer": 2, "2": 3, "winter": 4 },

  /** 패스/페일 과목: 이수 학점에는 들어가지만 평점(GPA) 계산에서는 빠진다 */
  PASS_FAIL_GRADES: ["PASS", "FAIL"],

  /** 입력 가능한 모든 성적 (화면 선택지 순서) */
  ALL_GRADES: ["A+", "A0", "B+", "B0", "C+", "C0", "D+", "D0", "F", "PASS", "FAIL"],

  /** 성적 미입력: 이수 학점에는 들어가지만 평점 계산·성적 분포에서는 빠진다 */
  NO_GRADE: "-",

  /** 지원하는 성적 등급인지 (미입력 "-" 포함) */
  isValidGrade(grade) {
    return grade === this.NO_GRADE || this.ALL_GRADES.includes(grade);
  },

  /** 이수 학점에 들어가는 과목인지 (학점이 양수이고 지원하는 등급, PASS/FAIL·미입력 포함) */
  hasCredits(course) {
    const credits = Number(course?.credits);
    return Number.isFinite(credits) && credits > 0 && this.isValidGrade(course.grade);
  },

  /** 평점(GPA) 계산에 쓸 수 있는 과목인지 (PASS/FAIL·미입력 제외) */
  isCountable(course) {
    return this.hasCredits(course) && Object.hasOwn(this.GRADE_POINTS, course.grade);
  },

  /** 재수강이 허용되는 이전 성적 (C+ 이하, B0 미만) */
  RETAKE_ELIGIBLE_GRADES: ["C+", "C0", "D+", "D0", "F", "FAIL"],

  /** 재수강 과목에는 줄 수 없는 성적 (A0 가 최고) */
  RETAKE_FORBIDDEN_GRADES: ["A+"],

  /** 성적 유형: "letter"(A+~F) | "passfail"(PASS/FAIL) | null(미입력 "-", 어느 쪽과도 맞음) */
  gradeType(grade) {
    if (Object.hasOwn(this.GRADE_POINTS, grade)) return "letter";
    if (this.PASS_FAIL_GRADES.includes(grade)) return "passfail";
    return null;
  },

  /** 과목명 비교용: 앞뒤 공백·연속 공백·대소문자 무시 */
  nameKey(name) {
    return String(name ?? "").trim().replace(/\s+/g, " ").toLowerCase();
  },

  /** 학기 순서를 숫자로 (2026-1 → 20261, 2026-winter → 20264) */
  semesterRank(c) {
    return Number(c.year) * 10 + (this.SEMESTER_ORDER[c.semester] ?? 9);
  },

  /**
   * 재수강 관계를 풀어서, 각 과목에 아래 두 값을 붙인 복사본을 돌려준다. (원래 순서 유지)
   *  - retaken: 나중에 재수강해서 평가에서 빠지는 이전 기록이면 true (화면에 R 표시)
   *  - pending: 재수강 중이라 아직 성적이 "-" 인 기록이면 true.
   *             이 기록은 평가(평점·학점)에서 빠지고, 이전 학기 기록이 그 학기에 그대로 반영된다.
   *  - effectiveGrade: 이 기록까지 이어 봤을 때의 성적. "-" 이면 이전 성적을 그대로 쓴다. (재수강 자격 검사용)
   * 같은 과목명은 학기 순서대로 이어서 본다.
   * @param {Course[]} courses
   * @returns {(Course & { retaken: boolean, pending: boolean, effectiveGrade: string })[]}
   */
  resolveRetakes(courses) {
    const list = (courses ?? []).map((c) => ({ ...c, retaken: false, pending: false, effectiveGrade: c.grade }));
    const groups = new Map();
    for (const c of list) {
      const key = this.nameKey(c.name);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(c);
    }
    for (const group of groups.values()) {
      group.sort((a, b) => this.semesterRank(a) - this.semesterRank(b)); // 같은 학기면 입력 순서 유지
      // 평가에 반영되는 기록 = 성적이 나온 마지막 기록 (하나도 없으면 맨 마지막 기록)
      let last = group.findLastIndex((c) => c.grade !== this.NO_GRADE);
      if (last === -1) last = group.length - 1;
      group.forEach((c, i) => {
        const prev = group[i - 1];
        if (prev && c.grade === this.NO_GRADE) c.effectiveGrade = prev.effectiveGrade;
        c.retaken = i < last;
        c.pending = i > last; // 그 뒤의 "-" 기록 = 재수강 중
      });
    }
    return list;
  },

  /** resolveRetakes 를 거친 목록에서 평가에 반영되는 과목만, 계산용 성적으로 바꿔서 */
  effectiveCourses(resolved) {
    return resolved.filter((c) => !c.retaken && !c.pending).map((c) => ({ ...c, grade: c.effectiveGrade }));
  },

  /** 소수점 둘째 자리 반올림 (부동소수점 오차 보정) */
  round2(n) {
    return Math.round((n + Number.EPSILON) * 100) / 100;
  },

  /**
   * 과목 목록의 평점평균을 계산한다.
   * 공식: Σ(학점 × 평점) ÷ 총 평점 산정 학점, 소수점 둘째 자리까지
   * PASS/FAIL 과목과 성적 미입력("-") 과목은 계산에서 제외한다.
   * 재수강한 과목은 이전 기록을 빼고 마지막 수강 성적으로 계산한다.
   * @param {Course[]} courses
   * @returns {number|null} 평점 산정 과목이 없으면 null
   */
  calcGPA(courses) {
    return this.calcEffectiveGPA(this.effectiveCourses(this.resolveRetakes(courses)));
  },

  /** 재수강 처리가 끝난 목록으로 평점 계산 */
  calcEffectiveGPA(courses) {
    const valid = (courses ?? []).filter((c) => this.isCountable(c));
    if (valid.length === 0) return null;

    let totalPoints = 0;
    let totalCredits = 0;
    for (const c of valid) {
      const credits = Number(c.credits);
      totalPoints += credits * this.GRADE_POINTS[c.grade];
      totalCredits += credits;
    }
    return this.round2(totalPoints / totalCredits);
  },

  /**
   * 총 이수 학점 합계 (PASS/FAIL·성적 미입력 과목 포함, 재수강 이전 기록 제외)
   * @param {Course[]} courses
   * @returns {number}
   */
  sumCredits(courses) {
    return this.sumEffectiveCredits(this.effectiveCourses(this.resolveRetakes(courses)));
  },

  /** 재수강 처리가 끝난 목록으로 학점 합계 */
  sumEffectiveCredits(courses) {
    return (courses ?? [])
      .filter((c) => this.hasCredits(c))
      .reduce((sum, c) => sum + Number(c.credits), 0);
  },

  /**
   * 학기별 요약 (재수강 처리는 전체 과목 기준으로 한 뒤 학기별로 나눈다)
   * @param {Course[]} courses 전체 과목
   * @returns {{ semesterKey: string, courses: Course[], gpa: number|null, credits: number }[]}
   *          semesterKey 오름차순 (예: "2025-2", "2026-1")
   *          courses 의 각 과목에는 retaken / effectiveGrade 가 붙어 있다.
   */
  summarizeBySemester(courses) {
    const groups = new Map();
    for (const c of this.resolveRetakes(courses)) {
      const key = `${c.year}-${c.semester}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(c);
    }

    const order = (c) => this.SEMESTER_ORDER[c.semester] ?? 99;
    return [...groups.entries()]
      .map(([semesterKey, list]) => ({
        semesterKey,
        courses: list,
        gpa: this.calcEffectiveGPA(this.effectiveCourses(list)),
        credits: this.sumEffectiveCredits(this.effectiveCourses(list)),
      }))
      .sort((a, b) => {
        const x = a.courses[0], y = b.courses[0];
        return Number(x.year) - Number(y.year) || order(x) - order(y);
      });
  },

  /** 졸업 이수 학점 (목표 GPA 시뮬레이터 기준) */
  GRADUATION_CREDITS: 130,

  /**
   * 목표 GPA 시뮬레이션: 졸업까지 남은 학점에서 평균 몇 점을 받아야 목표 평점에 닿는지 계산한다.
   * - 이미 받은 평점 과목(A+~F)과 PASS 과목은 이수한 것으로 본다.
   * - 성적 미입력("-") 과목은 아직 성적이 없으므로 남은 학점에 포함된다.
   * - 남은 학점은 모두 평점 과목(A+~F)으로 듣는다고 가정한다.
   * @param {Course[]} courses
   * @param {number} target 목표 평점 (0 ~ 4.5)
   * @returns {{ status: "achieved"|"possible"|"impossible", currentGpa: number|null, earned: number,
   *             remaining: number, required: number|null, maxGpa: number|null }}
   *   required: 남은 학점에서 필요한 평균 평점 (소수 둘째 자리 올림, 남은 학점이 없으면 null)
   *   maxGpa: 남은 학점을 모두 A+ 로 받았을 때의 최종 평점
   */
  simulateTarget(courses, target, graduation = this.GRADUATION_CREDITS) {
    const eff = this.effectiveCourses(this.resolveRetakes(courses));
    let graded = 0, points = 0, passed = 0;
    for (const c of eff) {
      if (this.isCountable(c)) {
        graded += Number(c.credits);
        points += Number(c.credits) * this.GRADE_POINTS[c.grade];
      } else if (this.hasCredits(c) && c.grade === "PASS") {
        passed += Number(c.credits);
      }
    }
    const currentGpa = graded ? this.round2(points / graded) : null;
    const earned = graded + passed;
    const remaining = Math.max(0, graduation - earned);
    const max = this.GRADE_POINTS["A+"];

    let required = null, maxGpa = currentGpa;
    if (remaining > 0) {
      const raw = (target * (graded + remaining) - points) / remaining;
      required = Math.ceil(raw * 100 - 1e-9) / 100; // 올림: 이 값 이상이면 목표 달성
      maxGpa = this.round2((points + max * remaining) / (graded + remaining));
    }

    let status;
    if (currentGpa != null && currentGpa >= target) status = "achieved";
    else if (required == null || required > max) status = "impossible";
    else status = "possible";

    return { status, currentGpa, earned, remaining, required, maxGpa };
  },

  /**
   * 등급별 과목 수 (성적 분석 탭의 분포 그래프용, 재수강 이전 기록 제외)
   * @param {Course[]} courses
   * @returns {Object<string, number>} 예) { "A+": 3, "A0": 1, ..., "F": 0, "PASS": 1, "FAIL": 0 }  — 모든 등급 키 포함
   */
  gradeDistribution(courses) {
    const dist = {};
    for (const grade of this.ALL_GRADES) dist[grade] = 0;
    for (const c of this.effectiveCourses(this.resolveRetakes(courses))) {
      if (Object.hasOwn(dist, c.grade)) dist[c.grade]++;
    }
    return dist;
  },
};
