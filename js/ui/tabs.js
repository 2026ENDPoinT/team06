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
    // TODO: 페이지 넘김 연출은 여기서 (이전 화면 → name 화면)
    for (const key of Object.keys(this.VIEWS)) {
      document.getElementById(`view-${key}`).hidden = key !== name;
    }
    document.querySelectorAll("[data-tab]").forEach((el) => {
      el.classList.toggle("active", el.dataset.tab === name);
    });
    document.body.classList.toggle("locked", name === "login");
    this.VIEWS[name].render();
    window.scrollTo(0, 0);
  },

  init() {
    window.addEventListener("hashchange", () => this.show());
    this.show();
  },
};
