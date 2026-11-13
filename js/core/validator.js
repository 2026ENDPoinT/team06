/**
 * [담당: 기능 A] 입력값 검증  — 필수 기능 5
 *
 * 검증해야 할 것 (과제 명세):
 *  - 과목명 미입력
 *  - 학점 수가 0 이하이거나 숫자가 아님
 *  - 지원하지 않는 성적 등급
 *  (등록된 과목 없이 GPA 조회 → GPA.calcGPA 가 null 반환, 화면에서 처리)
 */
const Validator = {
  SEMESTERS: ["1", "summer", "2", "winter"],
  NAME_MAX_LENGTH: 50,
  CREDITS_MAX: 30,
  YEAR_MIN: 1900,
  YEAR_MAX: 2100,

  /** 빈 문자열/공백만 있는 값도 "미입력"으로 본다 */
  isBlank(v) {
    return v == null || String(v).trim() === "";
  },

  /**
   * 폼에서 받은 입력을 검증한다.
   * @param {{ name: string, year: string|number, semester: string, credits: string|number, grade: string }} input
   * @returns {{ ok: boolean, errors: string[] }}
   */
  validateCourse(input) {
    const errors = [];
    const { name, year, semester, credits, grade } = input ?? {};

    // 과목명
    if (this.isBlank(name)) {
      errors.push("과목명을 입력해 주세요.");
    } else if (String(name).trim().length > this.NAME_MAX_LENGTH) {
      errors.push(`과목명은 ${this.NAME_MAX_LENGTH}자 이하로 입력해 주세요.`);
    }

    // 연도
    const y = Number(year);
    if (this.isBlank(year)) {
      errors.push("연도를 입력해 주세요.");
    } else if (!Number.isInteger(y) || y < this.YEAR_MIN || y > this.YEAR_MAX) {
      errors.push(`연도는 ${this.YEAR_MIN}~${this.YEAR_MAX} 사이의 정수로 입력해 주세요.`);
    }

    // 학기
    if (!this.SEMESTERS.includes(String(semester))) {
      errors.push("학기를 올바르게 선택해 주세요.");
    }

    // 학점 (Number("") === 0, Number(" ") === 0 이므로 빈 값을 먼저 걸러낸다)
    const cr = Number(credits);
    if (this.isBlank(credits) || !Number.isFinite(cr)) {
      errors.push("학점은 숫자로 입력해 주세요.");
    } else if (cr <= 0) {
      errors.push("학점은 0보다 커야 합니다.");
    } else if (cr > this.CREDITS_MAX) {
      errors.push(`학점은 ${this.CREDITS_MAX} 이하로 입력해 주세요.`);
    }

    // 성적 등급
    if (!Object.hasOwn(GPA.GRADE_POINTS, grade)) {
      errors.push("지원하지 않는 성적 등급입니다. (A+ ~ F 중 선택)");
    }

    return { ok: errors.length === 0, errors };
  },
};
