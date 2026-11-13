/**
 * [담당: 기능 B] 과목 등록·조회·수정·삭제  — 필수 기능 1, 2
 *
 * 화면(app.js)은 이 객체만 통해 데이터를 다룬다.
 * 변경이 생길 때마다 DataStore.save() 로 저장할 것.
 */
const CourseService = {
  /** @type {Course[]} */
  courses: [],

  /** 앱 시작 시 1회 호출 */
  init() {
    // TODO: DataStore.load() 로 불러오기
    // 화면 확인용 임시 데이터 — 구현 후 삭제
    this.courses = [
      { id: "demo-1", name: "자료구조", year: 2026, semester: "1", credits: 3, grade: "A+" },
      { id: "demo-2", name: "이산수학", year: 2026, semester: "1", credits: 3, grade: "B0" },
      { id: "demo-3", name: "프로그래밍기초", year: 2025, semester: "2", credits: 3, grade: "A0" },
    ];
  },

  /** @returns {Course[]} */
  getAll() {
    return this.courses;
  },

  /**
   * @param {string} id
   * @returns {Course|undefined}
   */
  getById(id) {
    // TODO: 구현
    return undefined;
  },

  /**
   * 새 과목 추가. id 는 여기서 생성한다.
   * @param {{ name: string, year: number, semester: string, credits: number, grade: string }} data
   * @returns {Course}
   */
  add(data) {
    // TODO: 구현
    console.log("[TODO] CourseService.add", data);
  },

  /**
   * @param {string} id
   * @param {Partial<Course>} data
   */
  update(id, data) {
    // TODO: 구현
    console.log("[TODO] CourseService.update", id, data);
  },

  /** @param {string} id */
  remove(id) {
    // TODO: 구현
    console.log("[TODO] CourseService.remove", id);
  },
};
