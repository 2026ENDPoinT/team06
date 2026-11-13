/**
 * [담당: 프론트엔드] 여러 탭에서 같이 쓰는 화면 도우미 함수
 */
const UI = {
  SEMESTER_LABEL: { "1": "1학기", "summer": "여름학기", "2": "2학기", "winter": "겨울학기" },

  /** (2026, "1") → "2026년 1학기" */
  semesterTitle(year, semester) {
    return `${year}년 ${this.SEMESTER_LABEL[semester] ?? semester}`;
  },

  /** 3.456 → "3.46", null → "-" */
  formatGPA(gpa) {
    return gpa == null ? "-" : gpa.toFixed(2);
  },

  /** 사용자가 입력한 문자열을 HTML 에 넣기 전에 반드시 거칠 것 */
  escape(str) {
    return String(str).replace(/[&<>"']/g, (ch) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]
    );
  },

  /** 페이지 상단 제목 영역 */
  pageHeader(title, desc) {
    return `
      <div>
        <h1 class="page-title">${title}</h1>
        ${desc ? `<p class="page-desc">${desc}</p>` : ""}
      </div>`;
  },
};
