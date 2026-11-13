/**
 * [담당: 프론트엔드] 탭(책갈피) 전환
 *
 * 주소 끝의 #hash 로 현재 탭을 구분한다. (#login, #dashboard, #courses, #stats, #settings)
 * → 새로고침해도 보던 탭이 유지되고, 브라우저 뒤로가기도 동작한다.
 *
 * 새 탭 추가 방법:
 *  1) index.html 의 <nav> 에 <a class="tab" href="#이름" data-tab="이름"> 추가
 *  2) index.html 의 <main> 에 <section class="view" id="view-이름" hidden> 추가
 *  3) js/ui/views/ 에 뷰 파일을 만들고 아래 VIEWS 에 등록
 */
const Tabs = {
  DEFAULT: "dashboard",

  /** 노트 페이지 순서 (앞 → 뒤). 책갈피 높이와 넘김 방향의 기준. 설정은 맨 뒷페이지 */
  ORDER: ["dashboard", "courses", "stats", "settings"],

  /** 책갈피가 한 장 뒤일수록 내려가는 정도, 최대치 (제목이 가려지지 않는 한계: 책갈피 60px − 제목 아래 끝 ~32px) */
  TAB_STEP: 8,
  TAB_MAX: 26,

  /** 탭 이름 → 해당 화면을 그리는 객체 (render() 를 가져야 함) */
  VIEWS: {
    login: LoginView,
    dashboard: DashboardView,
    courses: CoursesView,
    stats: StatsView,
    settings: SettingsView,
  },

  current() {
    const name = location.hash.replace("#", "");
    if (!LoginView.isLoggedIn()) return "login";
    if (name === "login") return this.DEFAULT;
    return this.VIEWS[name] ? name : this.DEFAULT;
  },

  /** 현재 탭만 보이게 하고 다시 그린다 */
  show() {
    const name = this.current();
    const prev = this.prev;
    this.prev = name;
    const page = document.getElementById("page");
    // 다시 그리기 전에 지금 페이지를 복사해 둔다 (넘김 연출용)
    const oldPage = prev && prev !== name ? page.cloneNode(true) : null;

    page.style.minHeight = `${this.mainHeight()}px`;
    for (const key of Object.keys(this.VIEWS)) {
      document.getElementById(`view-${key}`).hidden = key !== name;
    }
    document.querySelectorAll("[data-tab]").forEach((el) => {
      el.classList.toggle("active", el.dataset.tab === name);
    });
    this.stackTabs(name);
    document.body.classList.toggle("locked", name === "login");
    this.VIEWS[name].render();
    window.scrollTo(0, 0);
    if (oldPage) this.turnPage(page, oldPage, prev, name);
  },

  /**
   * 책갈피 높이: 지금 페이지 책갈피는 페이지 앞(CSS .active), 나머지는 깊이만큼 내려가 페이지 뒤에 박힌다.
   *  - 뒤 페이지 깊이 1, 2 …
   *  - 이미 넘긴 앞페이지는 뒷페이지들보다 더 뒤, 그중에서도 앞페이지일수록 더 아래
   * 로그인은 순서상 맨 앞(-1)으로 본다.
   */
  stackTabs(name) {
    const cur = this.ORDER.indexOf(name);
    const last = this.ORDER.length - 1;
    document.querySelectorAll(".tabs .tab").forEach((tab) => {
      const i = this.ORDER.indexOf(tab.dataset.tab);
      const depth = i >= cur ? i - cur : last - i;
      tab.style.setProperty("--drop", `${Math.min(2 + depth * this.TAB_STEP, this.TAB_MAX)}px`);
    });
  },

  /**
   * 책갈피 복사본을 페이지(또는 페이지 복사본) 안에 같은 자리로 붙인다.
   * front: 지금 페이지 책갈피처럼 앞에 / 아니면 페이지 위로 드러난 부분만 (밑은 페이지 뒤에 박힌 모양)
   */
  tabCopy(tab, page, front) {
    const tabs = tab.parentElement;
    const copy = tab.cloneNode(true);
    copy.classList.toggle("active", front);
    const drop = parseFloat(tab.style.getPropertyValue("--drop")) || 0;
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

  /**
   * 페이지 넘김 연출 (왼쪽 책등이 축)
   *  - 뒷페이지로: 이전 페이지가 이전 탭 책갈피와 함께 넘어간다. 로그인 → 메인이면 표지가 열림
   *  - 앞페이지로: 넘어가 있던 새 페이지가 뒤에서 되돌아와 덮는다.
   *    새 탭 책갈피와 그보다 앞페이지들의 책갈피도 함께 돌아온다. 로그아웃이면 표지가 덮임
   */
  turnPage(page, oldPage, prev, name) {
    const forward = this.ORDER.indexOf(name) > this.ORDER.indexOf(prev);
    oldPage.removeAttribute("id");
    oldPage.classList.remove("returning");
    oldPage.classList.toggle("cover", prev === "login");
    oldPage.classList.add(forward ? "turning" : "under");
    if (!forward) page.classList.add("returning");

    const moving = forward ? oldPage : page;
    const names = forward ? [prev] : this.ORDER.slice(0, this.ORDER.indexOf(name) + 1);
    const tabs = names
      .map((n) => document.querySelector(`.tabs .tab[data-tab="${n}"]`))
      .filter(Boolean);
    const copies = tabs.map((tab) => this.tabCopy(tab, page, tab.dataset.tab === (forward ? prev : name)));
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

  /** 모든 페이지가 최소한 메인 화면만큼은 길도록, 메인을 잠깐 그려서 높이를 잰다 */
  // ponytail: 창 크기를 바꿀 때는 다시 재지 않음. 필요하면 resize 이벤트에서 show() 호출
  mainHeight() {
    const page = document.getElementById("page");
    page.style.minHeight = "";
    for (const key of Object.keys(this.VIEWS)) {
      document.getElementById(`view-${key}`).hidden = key !== "dashboard";
    }
    DashboardView.render();
    return page.offsetHeight;
  },

  init() {
    window.addEventListener("hashchange", () => this.show());
    this.show();
  },
};
