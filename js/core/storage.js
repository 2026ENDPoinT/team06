/**
 * [담당: 기능 B] 데이터 저장/불러오기  — 필수 기능 4
 *
 * 새로고침하거나 브라우저를 다시 열어도 데이터가 유지되어야 한다.
 * LocalStorage 사용 예정. (브라우저 내장 `Storage`와 이름이 겹치지 않도록 DataStore 사용)
 */
const DataStore = {
  KEY: "team06.courses",

  /**
   * 저장된 과목 목록을 불러온다.
   * 데이터가 없거나 손상된 경우에도 에러 없이 [] 를 반환해야 한다.
   * @returns {Course[]}
   */
  load() {
    // TODO: 구현
    return [];
  },

  /**
   * 과목 목록 전체를 저장한다.
   * @param {Course[]} courses
   */
  save(courses) {
    // TODO: 구현
  },
};
