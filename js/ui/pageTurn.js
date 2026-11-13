/**
 * [담당: 프론트엔드] 페이지 넘김 알고리즘 — 책갈피 높이 + 넘김 연출을 한곳에 모음
 *
 * Tabs.show() 가 화면을 바꿀 때 다음 순서로 부른다.
 *   1) PageTurn.capture()  다시 그리기 전, 지금 페이지를 복사해 둔다
 *   2) (Tabs 가 새 화면을 그림)
 *   3) PageTurn.stackTabs() 책갈피 높이 정리
 *   4) PageTurn.turn()      복사본/새 페이지를 넘기는 연출
 *
 * ── 규칙 ────────────────────────────────────────────────────────────
 * 1. 페이지 순서 (앞 → 뒤)
 *    로그인 표지(-1) → 메인 → 과목·성적 → 성적 분석 → 설정(맨 뒷페이지)
 *
 * 2. 책갈피 높이 (stackTabs / drop)
 *    - 지금 페이지 책갈피: 페이지 앞에 놓이고, 다른 책갈피보다 6px 높이 솟으며
 *      길이가 늘어나 밑 끝이 종이 위로 12px 드러난다.                     (CSS .tab.active)
 *    - 나머지: 페이지 뒤에 박혀 밑부분이 가려진다. 깊이 1장당 TAB_STEP 씩 내려감.
 *        · 뒤 페이지 깊이 = 1, 2 …
 *        · 이미 넘긴 앞페이지 = 뒷페이지들보다 더 뒤, 그중에서도 앞페이지일수록 더 아래
 *    - 아무리 내려가도 제목은 보이도록 TAB_MAX 로 제한.
 *      예) 성적 분석에 있을 때: 성적 분석(앞) > 과목·성적(18px) > 메인(26px)
 *
 * 3. 넘김 방향 (turn) — 축은 왼쪽 책등
 *    - 뒷페이지로: 이전 페이지 복사본(.turning)이 새 페이지 위에서 넘어간다. 0.7초
 *      로그인 → 메인이면 가죽 표지가 열린다(.cover). 1초
 *    - 앞페이지로: 이전 페이지 복사본(.under)이 밑에 깔리고, 새 페이지(.returning)가
 *      뒤에서 되돌아와 덮는다. 로그아웃이면 표지가 덮인다. 1초
 *    - 90° 를 넘기면 페이지 뒷면(종이 뒷면 / 표지 안쪽)이 보이고 180° 까지 이어진다.
 *
 * 4. 함께 넘어가는 책갈피
 *    두 페이지 사이의 페이지들(앞쪽 페이지 ~ 뒤쪽 페이지 직전)의 책갈피.
 *      메인 → 성적 분석: 메인·과목성적 / 성적 분석 → 메인: 메인·과목성적
 *      성적 분석 → 과목·성적: 과목성적 / 로그인 ↔ 메인: 없음
 *    묶음의 맨 앞 페이지 책갈피는 "지금 페이지" 모양, 나머지는 그 페이지 기준 깊이만큼
 *    내려가 위로 드러난 부분만 보인다. 넘어가는 동안 진짜 책갈피는 숨긴다.
 *
 * 5. 설정 리본: 설정 페이지에서는 위로 젖혀져 페이지 위쪽에 펼쳐진다.  (CSS .ribbon.active)
 *
 * 6. 로그인 표지: 노트 종이·책갈피·리본을 숨기고 표지가 페이지 크기만큼 늘어난다.
 *    모든 페이지(표지 포함) 세로 길이는 최소 메인 화면 높이.  (CSS body.locked, Tabs.mainHeight)
 *
 * 7. "애니메이션 줄이기" 설정 사용자는 넘김 없이 바로 바뀐다.
 *
 * ── 조절 손잡이 ─────────────────────────────────────────────────────
 *  - 순서·하강치: 아래 ORDER / TAB_STEP / TAB_MAX
 *  - 지금 페이지 책갈피 모양, 넘김 속도·뒷면 색, 리본: css/base.css
 *    "인덱스 탭", "페이지 넘김", "설정 리본" 구역
 */
const PageTurn = {
  /** 페이지 순서 (앞 → 뒤). 여기 없는 화면(로그인)은 맨 앞(-1) */
  ORDER: ["dashboard", "courses", "stats", "settings"],

  /** 책갈피가 한 장 뒤일수록 내려가는 px, 최대치 (책갈피 60px − 제목 아래 끝 ~32px) */
  TAB_STEP: 8,
  TAB_MAX: 26,

  /** 1) 화면이 바뀌면 다시 그리기 전에 지금 페이지를 복사해 둔다 */
  capture(page, prev, name) {
    return prev && prev !== name ? page.cloneNode(true) : null;
  },

  /** 3) 책갈피 높이 정리 (규칙 2) */
  stackTabs(name) {
    const cur = this.ORDER.indexOf(name);
    document.querySelectorAll(".tabs .tab").forEach((tab) => {
      tab.style.setProperty("--drop", `${this.drop(this.ORDER.indexOf(tab.dataset.tab), cur)}px`);
    });
  },

  /** 지금 페이지가 cur 번째일 때 i 번째 페이지 책갈피가 내려가는 px */
  drop(i, cur) {
    const depth = i >= cur ? i - cur : this.ORDER.length - 1 - i;
    return Math.min(2 + depth * this.TAB_STEP, this.TAB_MAX);
  },

  /** 4) 넘김 연출 (규칙 3, 4) */
  turn(page, oldPage, prev, name) {
    if (!oldPage) return;
    const forward = this.ORDER.indexOf(name) > this.ORDER.indexOf(prev);
    oldPage.removeAttribute("id");
    oldPage.classList.remove("returning");
    oldPage.classList.toggle("cover", prev === "login");
    oldPage.classList.add(forward ? "turning" : "under");
    if (!forward) page.classList.add("returning");

    const moving = forward ? oldPage : page;
    const [a, b] = [this.ORDER.indexOf(prev), this.ORDER.indexOf(name)].sort((x, y) => x - y);
    const names = a < 0 ? [] : this.ORDER.slice(a, b); // 로그인 표지가 넘어갈 땐 책갈피 없음
    const tabs = names
      .map((n) => document.querySelector(`.tabs .tab[data-tab="${n}"]`))
      .filter(Boolean);
    const copies = tabs.map((tab) => this.tabCopy(tab, page, a));
    moving.append(...copies);
    tabs.forEach((tab) => (tab.style.visibility = "hidden")); // 넘어가는 동안엔 복사본만 보이게

    moving.addEventListener("animationend", function done(e) {
      if (e.target !== moving) return;
      moving.removeEventListener("animationend", done);
      oldPage.remove();
      page.classList.remove("returning");
      copies.forEach((c) => c.remove());
      tabs.forEach((tab) => (tab.style.visibility = ""));
    });
    page.after(oldPage);
  },

  /**
   * 책갈피 복사본을 페이지(또는 페이지 복사본) 안에 같은 자리로 붙인다.
   * cur = 넘어가는 묶음의 맨 앞 페이지. 그 책갈피는 지금 페이지 모양,
   * 나머지는 그 페이지 기준 깊이만큼 내려가 위로 드러난 부분만 (밑은 페이지 뒤에 박힌 모양)
   */
  tabCopy(tab, page, cur) {
    const tabs = tab.parentElement;
    const copy = tab.cloneNode(true);
    const i = this.ORDER.indexOf(tab.dataset.tab);
    const front = i === cur;
    const drop = this.drop(i, cur);
    copy.classList.toggle("active", front);
    copy.style.setProperty("--drop", `${drop}px`);
    Object.assign(copy.style, {
      position: "absolute",
      left: `${tabs.offsetLeft + tab.offsetLeft - page.offsetLeft}px`,
      top: `${tabs.offsetTop + tab.offsetTop - page.offsetTop}px`,
      width: `${tab.offsetWidth}px`,
      height: front ? "" : `${tab.offsetHeight - drop}px`,
      background: getComputedStyle(tab).backgroundColor,
      visibility: "",
      zIndex: "1",
    });
    return copy;
  },
};
