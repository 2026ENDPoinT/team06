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

  /**
   * 과목 목록의 평점평균을 계산한다.
   * 공식: Σ(학점 × 평점) ÷ 총 평점 산정 학점, 소수점 둘째 자리까지
   * @param {Course[]} courses
   * @returns {number|null} 과목이 없으면 null
   */
  calcGPA(courses) {
    // TODO: 구현
    return null;
  },

  /**
   * 총 학점 합계
   * @param {Course[]} courses
   * @returns {number}
   */
  sumCredits(courses) {
    // TODO: 구현
    return 0;
  },

  /**
   * 학기별 요약
   * @param {Course[]} courses
   * @returns {{ semesterKey: string, courses: Course[], gpa: number|null, credits: number }[]}
   *          semesterKey 오름차순 (예: "2025-2", "2026-1")
   */
  summarizeBySemester(courses) {
    // TODO: 구현 (학기별 그룹핑 + calcGPA/sumCredits 활용)
    return [];
  },

  /**
   * 등급별 과목 수 (성적 분석 탭의 분포 그래프용)
   * @param {Course[]} courses
   * @returns {Object<string, number>} 예) { "A+": 3, "A0": 1, ..., "F": 0 }  — 모든 등급 키 포함
   */
  gradeDistribution(courses) {
    // TODO: 구현
    return {};
  },
};
