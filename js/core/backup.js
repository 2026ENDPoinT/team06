/**
 * [담당: 기능 B] JSON 백업 파일 형식 — 만들기(build)와 검증(parse)만 담당한다.
 * 실제로 값을 모으고 저장하는 일은 설정 화면(js/ui/views/settingsView.js)이 한다.
 *
 * 파일 형식 (version 2):
 * {
 *   "app": "team06", "version": 2, "exportedAt": "2026-11-14T...",
 *   "nickname": "직접 정한 닉네임" | null,      // null = 기본값(Google 이름/게스트)
 *   "pastMessage": "지난 나로부터의 메세지" | null,
 *   "courses": [ Course, ... ],
 *   "memos": { "과목 id": "메모 내용", ... },
 *   "graduationCredits": 130 | null,          // 설정한 졸업 학점, null = 기본값
 *   "targetGpa": 3.8 | null                   // 목표 GPA 시뮬레이터에 적은 목표 평점, null = 비어 있음
 * }
 * 예전 백업(과목 배열만 있는 파일)도 그대로 불러올 수 있다. 이때는 과목만 바뀐다.
 * graduationCredits·targetGpa 칸이 없는 백업을 불러오면 그 두 값은 그대로 둔다.
 */
const Backup = {
  VERSION: 2,
  NICKNAME_MAX: 20,
  MESSAGE_MAX: 300,
  MEMO_MAX: 5000,

  /** @returns {string} 내려받을 JSON 문자열 */
  build({ nickname, pastMessage, courses, memos, graduationCredits, targetGpa }) {
    return JSON.stringify({
      app: "team06",
      version: this.VERSION,
      exportedAt: new Date().toISOString(),
      nickname: nickname || null,
      pastMessage: pastMessage || null,
      courses,
      memos: memos ?? {},
      graduationCredits: graduationCredits ?? null,
      targetGpa: targetGpa ?? null,
    }, null, 2);
  },

  /**
   * 파일 내용을 전부 검증한다. 하나라도 틀리면 예외를 던지고 아무것도 바꾸지 않는다.
   * @returns {{ legacy: boolean, courses: Course[], nickname?: string|null, pastMessage?: string|null, memos?: Object<string,string> }}
   *          legacy = 예전 형식(과목 배열만) → 닉네임·메세지·메모는 건드리지 않는다
   */
  parse(text) {
    let data;
    try {
      data = JSON.parse(String(text).replace(/^﻿/, ""));
    } catch {
      throw new Error("올바른 JSON 파일이 아닙니다.");
    }

    if (Array.isArray(data)) return { legacy: true, courses: CourseService.checkCourses(data) };
    if (!data || typeof data !== "object" || !Array.isArray(data.courses)) {
      throw new Error("Team 06 백업 파일 형식이 아닙니다.");
    }

    const courses = CourseService.checkCourses(data.courses);
    const ids = new Set(courses.map((c) => c.id));

    const memos = {};
    if (data.memos != null) {
      if (typeof data.memos !== "object" || Array.isArray(data.memos)) throw new Error("메모 정보가 올바르지 않습니다.");
      for (const [id, memo] of Object.entries(data.memos)) {
        if (typeof memo !== "string") throw new Error("메모 정보가 올바르지 않습니다.");
        if (memo.length > this.MEMO_MAX) throw new Error(`메모는 ${this.MEMO_MAX}자까지 저장할 수 있습니다.`);
        if (ids.has(id) && memo.trim()) memos[id] = memo; // 없는 과목의 메모는 버린다
      }
    }

    return {
      legacy: false,
      courses,
      memos,
      nickname: this.optionalText(data.nickname, this.NICKNAME_MAX, "닉네임"),
      pastMessage: this.optionalText(data.pastMessage, this.MESSAGE_MAX, "지난 나로부터의 메세지"),
      // undefined = 파일에 칸이 없음 → 지금 값 유지
      graduationCredits: this.optionalNumber(data.graduationCredits, GPA.GRADUATION_MIN, GPA.GRADUATION_MAX, true, "졸업 학점"),
      targetGpa: this.optionalNumber(data.targetGpa, 0, GPA.GRADE_POINTS["A+"], false, "목표 평점"),
    };
  },

  /** 칸이 없으면 undefined, null 이면 null, 범위를 벗어난 숫자면 예외 */
  optionalNumber(value, min, max, integer, label) {
    if (value === undefined || value === null) return value;
    if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max || (integer && !Number.isInteger(value))) {
      throw new Error(`${label} 정보가 올바르지 않습니다.`);
    }
    return value;
  },

  /** 없거나 빈 값이면 null, 문자열이 아니거나 너무 길면 예외 */
  optionalText(value, max, label) {
    if (value == null) return null;
    if (typeof value !== "string") throw new Error(`${label} 정보가 올바르지 않습니다.`);
    const text = value.trim();
    if (text.length > max) throw new Error(`${label}은(는) ${max}자까지 저장할 수 있습니다.`);
    return text || null;
  },
};
