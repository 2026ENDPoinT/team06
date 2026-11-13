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

  /** 소수점 둘째 자리 반올림 (부동소수점 오차 보정) */
  round2(n) {
    return Math.round((n + Number.EPSILON) * 100) / 100;
  },

  /**
   * 과목 목록의 평점평균을 계산한다.
   * 공식: Σ(학점 × 평점) ÷ 총 평점 산정 학점, 소수점 둘째 자리까지
   * PASS/FAIL 과목과 성적 미입력("-") 과목은 계산에서 제외한다.
   * @param {Course[]} courses
   * @returns {number|null} 평점 산정 과목이 없으면 null
   */
  calcGPA(courses) {
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
   * 총 이수 학점 합계 (PASS/FAIL·성적 미입력 과목 포함)
   * @param {Course[]} courses
   * @returns {number}
   */
  sumCredits(courses) {
    return (courses ?? [])
      .filter((c) => this.hasCredits(c))
      .reduce((sum, c) => sum + Number(c.credits), 0);
  },

  /**
   * 학기별 요약
   * @param {Course[]} courses
   * @returns {{ semesterKey: string, courses: Course[], gpa: number|null, credits: number }[]}
   *          semesterKey 오름차순 (예: "2025-2", "2026-1")
   */
  summarizeBySemester(courses) {
    const groups = new Map();
    for (const c of courses ?? []) {
      const key = `${c.year}-${c.semester}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(c);
    }

    const order = (c) => this.SEMESTER_ORDER[c.semester] ?? 99;
    return [...groups.entries()]
      .map(([semesterKey, list]) => ({
        semesterKey,
        courses: list,
        gpa: this.calcGPA(list),
        credits: this.sumCredits(list),
      }))
      .sort((a, b) => {
        const x = a.courses[0], y = b.courses[0];
        return Number(x.year) - Number(y.year) || order(x) - order(y);
      });
  },

  /**
   * 등급별 과목 수 (성적 분석 탭의 분포 그래프용)
   * @param {Course[]} courses
   * @returns {Object<string, number>} 예) { "A+": 3, "A0": 1, ..., "F": 0, "PASS": 1, "FAIL": 0 }  — 모든 등급 키 포함
   */
  gradeDistribution(courses) {
    const dist = {};
    for (const grade of this.ALL_GRADES) dist[grade] = 0;
    for (const c of courses ?? []) {
      if (Object.hasOwn(dist, c.grade)) dist[c.grade]++;
    }
    return dist;
  },
};
