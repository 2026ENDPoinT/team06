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
    this.courses = DataStore.load();
  },

  /** @returns {Course[]} */
  getAll() {
    return this.courses.map((course) => ({ ...course }));
  },

  /**
   * @param {string} id
   * @returns {Course|undefined}
   */
  getById(id) {
    const course = this.courses.find((course) => course.id === id);
    return course ? { ...course } : undefined;
  },

  /**
   * 새 과목 추가. id 는 여기서 생성한다.
   * @param {{ name: string, year: number, semester: string, credits: number, grade: string }} data
   * @returns {Course}
   */
  add(data) {
    const baseId = `c_${Date.now()}`;
    let id = baseId;
    let suffix = 1;
    while (this.courses.some((course) => course.id === id)) {
      id = `${baseId}_${suffix++}`;
    }

    const course = {
      id,
      name: data.name,
      year: data.year,
      semester: data.semester,
      credits: data.credits,
      grade: data.grade,
    };
    this.persist([...this.courses, course]);
    return { ...course };
  },

  /**
   * @param {string} id
   * @param {Partial<Course>} data
   * @returns {Course|undefined} 대상이 없으면 undefined
   */
  update(id, data) {
    const index = this.courses.findIndex((course) => course.id === id);
    if (index === -1) return undefined;

    const course = { ...this.courses[index] };
    for (const key of ["name", "year", "semester", "credits", "grade"]) {
      if (Object.prototype.hasOwnProperty.call(data, key)) course[key] = data[key];
    }
    const courses = [...this.courses];
    courses[index] = course;
    this.persist(courses);
    return { ...course };
  },

  /**
   * @param {string} id
   * @returns {boolean} 삭제 여부
   */
  remove(id) {
    const courses = this.courses.filter((course) => course.id !== id);
    if (courses.length === this.courses.length) return false;
    this.persist(courses);
    return true;
  },

  /** 저장에 성공한 경우에만 메모리의 목록을 변경한다. 실패하면 호출자에게 알린다. */
  persist(courses) {
    if (!DataStore.save(courses)) {
      throw new Error("과목 데이터를 저장하지 못했습니다.");
    }
    this.courses = courses;
  },
};
