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

  /** 전체 초기화도 다른 변경과 마찬가지로 저장 성공 후 반영한다. */
  clear() {
    this.persist([]);
  },

  /** JSON 백업은 등록된 원본 성적을 그대로 보관한다. */
  exportJSON() {
    return JSON.stringify(this.getAll(), null, 2);
  },

  /** 파일 전체를 검증한 뒤 기존 목록을 교체한다. 일부만 가져오지 않는다. */
  importJSON(text) {
    let courses;
    try {
      courses = JSON.parse(text.replace(/^\uFEFF/, ""));
    } catch {
      throw new Error("올바른 JSON 파일이 아닙니다.");
    }
    if (!Array.isArray(courses)) throw new Error("과목 배열 형식의 JSON 파일을 선택해 주세요.");
    const ids = new Set();
    const imported = courses.map((course, index) => {
      if (!DataStore.isCourse(course) || ids.has(course.id)) {
        throw new Error(`${index + 1}번째 과목 정보가 올바르지 않거나 ID가 중복됩니다.`);
      }
      ids.add(course.id);
      const { id, name, year, semester, credits, grade } = course;
      return { id, name, year, semester, credits, grade };
    });
    this.persist(imported);
    return imported.length;
  },

  /** 같은 JSON 원본을 Excel에서 열 수 있는 SpreadsheetML(.xml) 표로 변환한다. */
  exportExcel() {
    const courses = JSON.parse(this.exportJSON());
    const escape = (value) => String(value)
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&apos;");
    const cell = (value, type = "String") => `<Cell><Data ss:Type="${type}">${escape(value)}</Data></Cell>`;
    const semesters = { "1": "1학기", summer: "여름학기", "2": "2학기", winter: "겨울학기" };
    courses.sort((a, b) => a.year - b.year || GPA.SEMESTER_ORDER[a.semester] - GPA.SEMESTER_ORDER[b.semester]);
    const rows = courses.map((c) => `<Row>${cell(c.year, "Number")}${cell(semesters[c.semester])}${cell(c.name)}${cell(c.credits, "Number")}${cell(c.grade)}</Row>`).join("");
    return `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
<Styles><Style ss:ID="Header"><Font ss:Bold="1"/><Interior ss:Color="#E8EEF6" ss:Pattern="Solid"/></Style></Styles>
<Worksheet ss:Name="과목 성적"><Table>
<Column ss:Width="60"/><Column ss:Width="80"/><Column ss:Width="220"/><Column ss:Width="60"/><Column ss:Width="70"/>
<Row ss:StyleID="Header">${["연도", "학기", "과목명", "학점", "성적"].map((title) => cell(title)).join("")}</Row>
${rows}</Table></Worksheet></Workbook>`;
  },

  /** 저장에 성공한 경우에만 메모리의 목록을 변경한다. 실패하면 호출자에게 알린다. */
  persist(courses) {
    if (!DataStore.save(courses)) {
      throw new Error("과목 데이터를 저장하지 못했습니다.");
    }
    this.courses = courses;
  },
};
