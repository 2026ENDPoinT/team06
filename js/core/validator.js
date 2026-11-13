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
  /**
   * 폼에서 받은 입력을 검증한다.
   * @param {{ name: string, year: string|number, semester: string, credits: string|number, grade: string }} input
   * @returns {{ ok: boolean, errors: string[] }}
   */
  validateCourse(input) {
    // TODO: 구현
    return { ok: true, errors: [] };
  },
};
