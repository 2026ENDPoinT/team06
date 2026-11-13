/**
 * [담당: 프론트엔드] 탭(책갈피) 전환
 *
 * 주소 끝의 #hash 로 현재 탭을 구분한다. (#login, #dashboard, #courses, #stats, #memo, #settings)
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
    memo: MemoView,
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

    this.fit();                        // 노트가 제 너비로 펼쳐진 상태에서 메인 높이를 재고
    this.mainH = this.mainHeight();
    page.style.height = `${this.mainH}px`; // 모든 탭 같은 높이. 더 긴 내용은 .container 안에서 스크롤 (css/base.css)
    this.fit(this.mainH);              // 그 높이까지 한 화면에 들어오도록 배율을 정한다
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
    page.querySelector(".container").scrollTop = 0;
    PageTurn.turn(page, oldPage, prev, name);
  },

  /** 모든 페이지를 메인 화면과 같은 높이로 맞추기 위해, 메인을 잠깐 그려서 높이를 잰다 */
  // ponytail: 창 크기를 바꿀 때는 다시 재지 않고 배율만 다시 정함(fit). 모바일 폭(760px)을 넘나들면 높이가 어긋날 수 있음
  //           → 거슬리면 resize 에서 show() 를 부르되, 입력 중이던 내용이 다시 그려지며 사라지는 것에 주의
  mainHeight() {
    const page = document.getElementById("page");
    page.style.height = "";
    document.body.classList.remove("locked"); // 표지 모양(머리말·여백 없음)인 채로 재면 메인보다 짧게 나온다. show() 가 바로 다시 정함
    for (const key of Object.keys(this.VIEWS)) {
      document.getElementById(`view-${key}`).hidden = key !== "dashboard";
    }
    DashboardView.render();
    return page.offsetHeight;
  },

  /**
   * 화면 맞춤: 해상도(창 크기)가 달라도 노트 전체가 기본으로 한 화면에 보이게 배율(--fit)을 정한다.
   *
   *   가로 배율 = 창 너비 ÷ FIT_W            (노트 너비 + 좌우 여백)
   *   세로 배율 = 창 높이 ÷ (height + FIT_PAD) (메인 페이지 높이 + 위아래 여백)
   *   배율 = 둘 중 작은 쪽 → 가로·세로 어느 쪽도 넘치지 않는다. FIT_MIN ~ FIT_MAX 로 제한.
   *
   * - 기준은 메인 페이지 높이. 내용이 더 긴 페이지(과목이 많을 때 등)는 그만큼 세로 스크롤이 생긴다.
   * - 배율은 css 의 .book { zoom } 과 body 여백에 쓰인다. (css/base.css)
   * - 모바일 폭(760px 이하)은 전용 레이아웃이 있으므로 배율 1.
   * - height 없이 부르면 가로 배율만 적용 (메인 높이를 재기 전 단계).
   */
  FIT_W: 1308,  // 노트 1180 + 좌우 여백 64 × 2
  FIT_PAD: 142, // 위 여백 88 + 아래로 나온 표지 두께 14 + 아래 여백 40
  FIT_MIN: 0.5, // 이보다 작아지면 글자를 읽기 어려움 → 더 줄이지 않고 스크롤
  FIT_MAX: 2,

  fit(height) {
    const byWidth = innerWidth / this.FIT_W;
    const byHeight = height ? innerHeight / (height + this.FIT_PAD) : Infinity;
    const scale = innerWidth <= 760 ? 1 : Math.min(Math.max(Math.min(byWidth, byHeight), this.FIT_MIN), this.FIT_MAX);
    document.documentElement.style.setProperty("--fit", scale);
    return scale;
  },

  /**
   * 메인 높이를 다시 재서 배율만 맞춘다. 지금 보는 화면은 다시 그리지 않음 (입력 중인 내용·애니메이션 유지)
   * 웹폰트가 늦게 로드되면 처음 잰 높이(대체 글꼴 기준)가 달라져, 첫 탭 전환 때 화면 크기가 툭 바뀌는 것을 막는다.
   */
  refit() {
    if (PageTurn.finish) return; // 넘기는 중이면 다음 show() 가 어차피 다시 잰다
    const name = this.current();
    const page = document.getElementById("page");
    const container = page.querySelector(".container");
    const top = container.scrollTop;
    this.fit();
    if (name === "dashboard" && !CourseService.loading && !CourseService.loadError) {
      page.style.height = ""; // 메인을 보고 있으면 그대로 잰다
      this.mainH = page.offsetHeight;
    } else {
      this.mainH = this.mainHeight(); // 숨은 메인을 그려서 잰 뒤 원래 화면으로 되돌림
      for (const key of Object.keys(this.VIEWS)) {
        document.getElementById(`view-${key}`).hidden = key !== name;
      }
      document.body.classList.toggle("locked", name === "login");
    }
    page.style.height = `${this.mainH}px`;
    this.fit(this.mainH);
    container.scrollTop = top;
  },

  init() {
    window.addEventListener("hashchange", () => this.show());
    window.addEventListener("resize", () => this.fit(this.mainH));
    let queued = false;
    document.fonts?.addEventListener("loadingdone", () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => { queued = false; this.refit(); });
    });
    this.show();
  },
};
