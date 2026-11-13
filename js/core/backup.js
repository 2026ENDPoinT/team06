/**
 * JSON 백업·복원 — 닉네임, 지난 나로부터의 메세지, 과목/성적, 과목별 메모를 한 파일로
 *
 * 파일 형식:
 * { "app": "team06", "version": 1, "exportedAt": "...",
 *   "nickname": "...", "pastMessage": "...",
 *   "courses": [ { id, name, year, semester, credits, grade }, ... ],
 *   "memos": { "과목id": "메모", ... } }
 *
 * 예전 형식(과목 배열만 있는 파일)도 불러올 수 있다. 이때는 과목만 교체한다.
 */
const Backup = {
  VERSION: 1,

  /** 지금 데이터를 백업 JSON 문자열로 */
  async export() {
    CourseService.assertReady();
    const uid = CourseService.uid;
    await MemoService.ensureLoaded(uid);
    if (MemoService.uid !== uid || CourseService.uid !== uid) throw new Error("계정이 변경되었습니다. 다시 시도해 주세요.");

    const courses = CourseService.getAll().map(({ id, name, year, semester, credits, grade }) => ({ id, name, year, semester, credits, grade }));
    const ids = new Set(courses.map((course) => course.id));
    const memos = Object.fromEntries(Object.entries(MemoService.memos).filter(([id, text]) => ids.has(id) && text.trim()));

    return JSON.stringify({
      app: "team06",
      version: this.VERSION,
      exportedAt: new Date().toISOString(),
      nickname: Profile.getNickname(),
      pastMessage: Profile.getPastMessage(),
      courses,
      memos,
    }, null, 2);
  },

  /** 파일 전체를 검증한다. 하나라도 잘못되면 아무것도 바꾸지 않도록 저장 전에 모두 확인 */
  parse(text) {
    let data;
    try {
      data = JSON.parse(String(text).replace(/^﻿/, ""));
    } catch {
      throw new Error("올바른 JSON 파일이 아닙니다.");
    }
    if (Array.isArray(data)) return { courses: CourseService.validateImport(data) };
    if (!data || typeof data !== "object" || !Array.isArray(data.courses)) {
      throw new Error("백업 파일 형식이 아닙니다. 이 앱에서 내보낸 JSON 파일을 선택해 주세요.");
    }

    const result = { courses: CourseService.validateImport(data.courses) };
    const optionalText = (key, max, label) => {
      if (data[key] === undefined || data[key] === null) return;
      if (typeof data[key] !== "string" || data[key].trim().length > max) throw new Error(`${label}은(는) ${max}자 이하의 글자여야 합니다.`);
      result[key] = data[key].trim();
    };
    optionalText("nickname", Profile.NICKNAME_MAX, "닉네임");
    optionalText("pastMessage", Profile.MESSAGE_MAX, "지난 나로부터의 메세지");

    if (data.memos !== undefined && data.memos !== null) {
      if (typeof data.memos !== "object" || Array.isArray(data.memos)) throw new Error("메모 정보가 올바르지 않습니다.");
      const ids = new Set(result.courses.map((course) => course.id));
      result.memos = {};
      for (const [id, memo] of Object.entries(data.memos)) {
        if (typeof memo !== "string" || memo.length > MemoService.MAX_LENGTH) {
          throw new Error(`메모는 ${MemoService.MAX_LENGTH}자 이하의 글자여야 합니다.`);
        }
        if (ids.has(id) && memo.trim()) result.memos[id] = memo; // 없는 과목의 메모는 버린다
      }
    }
    return result;
  },

  /**
   * 백업 파일로 현재 데이터를 교체한다.
   * @returns {{ courses: number, memos?: number, nickname: boolean, pastMessage: boolean }}
   */
  async import(text) {
    const data = this.parse(text);
    const uid = CourseService.uid;
    await CourseService.replaceAll(data.courses);
    if (data.memos) await MemoService.replaceAll(uid, data.memos);
    if (data.nickname !== undefined) Profile.setNickname(data.nickname);
    if (data.pastMessage !== undefined) Profile.setPastMessage(data.pastMessage);
    return {
      courses: data.courses.length,
      memos: data.memos ? Object.keys(data.memos).length : undefined,
      nickname: data.nickname !== undefined,
      pastMessage: data.pastMessage !== undefined,
    };
  },
};
