/**
 * [담당: 기능 B] 데이터 저장/불러오기  — 필수 기능 4
 *
 * 새로고침하거나 브라우저를 다시 열어도 데이터가 유지되어야 한다.
 * LocalStorage에 JSON으로 저장한다. (브라우저 내장 `Storage`와 이름이 겹치지 않도록 DataStore 사용)
 */
const DataStore = {
  KEY: "team06.courses",

  /** 화면과 계산 코드에서 안전하게 사용할 수 있는 과목 구조인지 확인한다. */
  isCourse(course) {
    return course !== null && typeof course === "object"
      && typeof course.id === "string" && course.id.trim().length > 0
      && typeof course.name === "string" && course.name.trim().length > 0
      && Number.isInteger(course.year)
      && ["1", "summer", "2", "winter"].includes(course.semester)
      && Number.isFinite(course.credits) && course.credits > 0
      && ["A+", "A0", "B+", "B0", "C+", "C0", "D+", "D0", "F"].includes(course.grade);
  },

  /**
   * 저장된 과목 목록을 불러온다.
   * 데이터가 없거나 손상된 경우에도 에러 없이 [] 를 반환해야 한다.
   * @returns {Course[]}
   */
  load() {
    try {
      const stored = localStorage.getItem(this.KEY);
      if (stored === null) return [];

      const courses = JSON.parse(stored);
      if (!Array.isArray(courses)) return [];

      // 손상된 항목과 중복 ID는 제외하되 정상적인 과목은 복원한다.
      // 여기서는 저장소를 덮어쓰지 않는다.
      const ids = new Set();
      return courses.filter((course) => {
        if (!this.isCourse(course) || ids.has(course.id)) return false;
        ids.add(course.id);
        return true;
      });
    } catch {
      return [];
    }
  },

  /**
   * 과목 목록 전체를 저장한다.
   * @param {Course[]} courses
   * @returns {boolean} 저장 성공 여부
   */
  save(courses) {
    try {
      if (!Array.isArray(courses) || !courses.every((course) => this.isCourse(course))) return false;
      if (new Set(courses.map((course) => course.id)).size !== courses.length) return false;
      localStorage.setItem(this.KEY, JSON.stringify(courses));
      return true;
    } catch {
      return false;
    }
  },
};
