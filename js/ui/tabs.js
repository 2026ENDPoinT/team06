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
 *  4) js/ui/pageTurn.js 의 ORDER 에 페이지 순서대로 추가
 */
const Tabs = {
  DEFAULT: "dashboard",

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
    if (!LoginView.isLoggedIn() && !LoginView.isGuest()) return "login";
    if (name === "login") return this.DEFAULT;
    return this.VIEWS[name] ? name : this.DEFAULT;
  },

  /** 현재 탭만 보이게 하고 다시 그린다 */
  show() {
    const name = this.current();
    const prev = this.prev;
    this.prev = name;
    const page = document.getElementById("page");
    const oldPage = PageTurn.capture(page, prev, name); // 페이지 넘김: js/ui/pageTurn.js

    page.style.minHeight = `${this.mainHeight()}px`;
    for (const key of Object.keys(this.VIEWS)) {
      document.getElementById(`view-${key}`).hidden = key !== name;
    }
    document.querySelectorAll("[data-tab]").forEach((el) => {
      el.classList.toggle("active", el.dataset.tab === name);
    });
    PageTurn.stackTabs(name);
    document.body.classList.toggle("locked", name === "login");
    if (name !== "login" && (CourseService.loading || CourseService.loadError)) {
      const view = document.getElementById(`view-${name}`);
      view.innerHTML = CourseService.loading
        ? '<div class="card" role="status">과목 데이터를 불러오는 중입니다…</div>'
        : `<div class="card"><p class="error" role="alert">${UI.escape(CourseService.loadError)}</p><button class="btn" data-retry>다시 불러오기</button></div>`;
      view.querySelector("[data-retry]")?.addEventListener("click", () => CourseService.init(FirebaseAuth.user?.uid || null));
    } else {
      this.VIEWS[name].render();
    }
    window.scrollTo(0, 0);
    PageTurn.turn(page, oldPage, prev, name);
  },

  /** 모든 페이지가 최소한 메인 화면만큼은 길도록, 메인을 잠깐 그려서 높이를 잰다 */
  // ponytail: 창 크기를 바꿀 때는 다시 재지 않음. 필요하면 resize 이벤트에서 show() 호출
  mainHeight() {
    const page = document.getElementById("page");
    page.style.minHeight = "";
    document.body.classList.remove("locked"); // 표지 모양(머리말·여백 없음)인 채로 재면 메인보다 짧게 나온다. show() 가 바로 다시 정함
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
