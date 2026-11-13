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
      && /^[A-Za-z0-9_-]+$/.test(course.id)
      && typeof course.name === "string" && course.name.trim().length > 0
      && Number.isInteger(course.year)
      && GPA.SEMESTERS.includes(course.semester)
      && Number.isFinite(course.credits) && course.credits > 0
      && GPA.isValidGrade(course.grade);
  },

  /** 저장할 필드만 남긴 복사본 (화면 계산용으로 붙은 값 등은 버린다) */
  pick({ id, name, year, semester, credits, grade }) {
    return { id, name, year, semester, credits, grade };
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

  assertUser(uid) {
    if (!uid || FirebaseAuth.user?.uid !== uid) throw new Error("계정이 변경되었습니다. 다시 시도해 주세요.");
  },

  async loadCloud(uid) {
    this.assertUser(uid);
    const { sdk, db } = await FirebaseAuth.firestore();
    this.assertUser(uid);
    const snapshot = await sdk.getDocsFromServer(sdk.collection(db, "users", uid, "courses"));
    const courses = snapshot.docs.map((document) => ({ ...document.data(), id: document.id }));
    if (!courses.every((course) => this.isCourse(course))) {
      throw new Error("계정에 올바르지 않은 과목 정보가 있습니다. 데이터베이스를 확인해 주세요.");
    }
    return courses;
  },

  /** 일반 수정은 변경된 문서만 저장하고, 초기화·불러오기는 서버 목록 전체를 교체한다. */
  async saveCloud(uid, courses, previous, replace = false) {
    this.assertUser(uid);
    if (!courses.every((course) => this.isCourse(course))) throw new Error("과목 데이터가 올바르지 않습니다.");
    const { sdk, db } = await FirebaseAuth.firestore();
    const collection = sdk.collection(db, "users", uid, "courses");
    const old = replace
      ? (await sdk.getDocsFromServer(collection)).docs.map((document) => ({ ...document.data(), id: document.id }))
      : previous;
    this.assertUser(uid);
    const nextIds = new Set(courses.map((course) => course.id));
    const oldMap = new Map(old.map((course) => [course.id, course]));
    const deleted = old.filter((course) => !nextIds.has(course.id));
    const changed = courses.filter((course) => replace || JSON.stringify(oldMap.get(course.id)) !== JSON.stringify(course));
    if (deleted.length + changed.length > 500) throw new Error("한 번에 변경할 수 있는 과목은 500개까지입니다. 과목을 나누어 처리해 주세요.");
    if (!deleted.length && !changed.length) return;
    const batch = sdk.writeBatch(db);
    for (const course of deleted) batch.delete(sdk.doc(collection, course.id));
    for (const course of changed) batch.set(sdk.doc(collection, course.id), this.pick(course));
    await batch.commit();
  },

  errorMessage(error) {
    if (error.code === "permission-denied") return "계정 데이터에 접근할 수 없습니다. Firestore 보안 규칙을 확인해 주세요.";
    if (error.code === "unavailable") return "서버에 연결하지 못했습니다. 인터넷 연결을 확인하고 다시 시도해 주세요.";
    return error.message || "과목 데이터를 처리하지 못했습니다.";
  },
};
