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
    if (!GPA.SEMESTERS.includes(String(semester))) {
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
    if (!GPA.isValidGrade(grade)) {
      errors.push("지원하지 않는 성적 등급입니다. (-, A+ ~ F, PASS, FAIL 중 선택)");
    }

    return { ok: errors.length === 0, errors };
  },

  /**
   * 재수강 규칙 검증. 같은 이름의 과목을 학기 순서로 이은 "수강 이력" 전체를,
   * 이번 추가/수정을 반영한 상태로 검사한다. (앞 학기·뒤 학기 어느 쪽을 고쳐도 걸러진다)
   *  - 재수강 전 성적은 C+ 이하여야 함 (재수강된 기록을 B0 이상으로 고칠 수도 없음)
   *  - 재수강 성적은 A0 까지 (A+ 불가)
   *  - 같은 학기에 같은 이름의 과목은 하나만
   *  - 이어진 과목끼리 학점 수, 성적 유형(등급제 / PASS·FAIL)이 같아야 함 ("-" 는 어느 유형과도 맞음)
   * @param {{ name: string, year: number|string, semester: string, grade: string }} input
   * @param {Course[]} courses 이미 등록된 전체 과목
   * @param {string|null} excludeId 수정 중인 과목 id
   * @returns {{ ok: boolean, errors: string[], previous: Course|null }} previous: 바로 앞 수강 기록 (재수강이 아니면 null)
   */
  validateRetake(input, courses, excludeId = null) {
    const errors = [];
    const add = (msg) => { if (!errors.includes(msg)) errors.push(msg); };
    const key = GPA.nameKey(input.name);
    const same = (courses ?? []).filter((c) => c.id !== excludeId && GPA.nameKey(c.name) === key);

    if (same.some((c) => GPA.semesterRank(c) === GPA.semesterRank(input))) {
      add("같은 학기에 같은 이름의 과목이 이미 있습니다.");
    }

    const draftId = excludeId ?? "__draft__";
    const chain = GPA.resolveRetakes([...same, { ...input, id: draftId }])
      .sort((a, b) => GPA.semesterRank(a) - GPA.semesterRank(b));

    // 재수강으로 이어진 과목끼리는 학점 수와 성적 유형(등급제 / PASS·FAIL)이 같아야 한다
    if (chain.length > 1) {
      if (new Set(chain.map((c) => Number(c.credits))).size > 1) {
        add("재수강으로 이어진 과목은 학점 수가 같아야 합니다.");
      }
      const types = new Set(chain.map((c) => GPA.gradeType(c.grade)).filter(Boolean));
      if (types.size > 1) {
        add("재수강으로 이어진 과목은 성적 유형(등급제 / PASS·FAIL)이 같아야 합니다.");
      }
    }

    for (let i = 1; i < chain.length; i++) {
      if (!GPA.RETAKE_ELIGIBLE_GRADES.includes(chain[i - 1].effectiveGrade)) {
        add("성적이 C+ 이하인 과목만 재수강 할 수 있습니다.");
      }
      if (GPA.RETAKE_FORBIDDEN_GRADES.includes(chain[i].grade)) {
        add("재수강한 과목의 성적은 A 이하여야 합니다");
      }
    }

    const index = chain.findIndex((c) => c.id === draftId);
    return { ok: errors.length === 0, errors, previous: chain[index - 1] ?? null };
  },
};
