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
 *    로그인 표지(-1) → 메인 → 과목·성적 → 성적 분석 → 메모 → 설정(맨 뒷페이지)
 *
 * 2. 책갈피 높이 (stackTabs / drop)
 *    - 지금 페이지 책갈피: 페이지 앞에 놓이고, 다른 책갈피보다 6px 높이 솟으며
 *      길이가 늘어나 밑 끝이 종이 위로 12px 드러난다.                     (CSS .tab.active)
 *    - 나머지: 페이지 뒤에 박혀 밑부분이 가려진다. 깊이 1장당 TAB_STEP 씩 내려감.
 *      지금 페이지(ORDER 의 cur 번째)를 기준으로 책갈피(i 번째)를 앞/뒤로 나눠 깊이를 센다.
 *        · 뒤 묶음 (i > cur): 뒤로 갈수록 깊어진다.            깊이 = i − cur        (1, 2, …)
 *        · 앞 묶음 (i < cur): 뒤 묶음 전체보다 깊은 곳에서 시작하고, 그 안에서는 앞페이지일수록 얕다.
 *                                                              깊이 = 뒤 페이지 수 + i + 1
 *      → 얕은 순서: 지금 페이지 > 뒤 묶음(가까운 페이지부터) > 앞 묶음(맨 앞 페이지부터)
 *    - 아무리 내려가도 제목은 보이도록 TAB_MAX 로 제한.
 *      가장 깊어도 깊이 4(34px)라 TAB_MAX 안이고, 어느 페이지에서든 책갈피마다 높이가 전부 다르다.
 *      예) 과목·성적에 있을 때: 과목·성적(앞) > 성적 분석(10px) > 메모(18px) > 메인(34px)
 *          메모에 있을 때:      메모(앞) > 메인(18px) > 과목·성적(26px) > 성적 분석(34px)
 *      페이지를 더 늘려 2 + (페이지 수 − 1) × TAB_STEP 이 TAB_MAX 를 넘으면 다시 겹친다.
 *      → 책갈피 길이(css .tab height, .tabs top, .tab.active height)와 TAB_MAX 를 같이 늘릴 것
 *
 * 3. 넘김 (turn) — 2D 페이지 컬. 3D 회전 없이 종이가 접히는 선만 계산한다.
 *    오른쪽 아래 귀퉁이를 잡아 책등(왼쪽) 너머로 끌고 가는 모양:
 *      · 넘어가는 페이지는 접힌 선 바깥쪽이 clip-path 로 잘려 나가고
 *      · 잘린 부분을 접힌 선에 대칭시킨 "뒷면"을 캔버스(.page-flap)에 그린다.
 *        뒷면의 명암(접힌 곳 그늘 → 밝은 띠)과 밑 페이지에 지는 그림자가 종이가 휜 느낌을 낸다.
 *    - 뒷페이지로: 이전 페이지 복사본(.turning)이 새 페이지 위에서 말려 넘어간다.
 *      다 넘어가면 넘어간 페이지들의 책갈피가 페이지 뒤에서 제자리로 올라온다.
 *    - 앞페이지로: ① 꺼내올 앞페이지들의 책갈피가 천천히 밑으로 내려가 페이지 뒤로 사라지고 (SINK)
 *                 ② 그 페이지가 책등 쪽에서 되말려 나와 지금 페이지(.under)를 덮는다.
 *    - 로그인 ↔ 메인은 가죽 표지가 같은 방식으로 넘어간다 (뒷면 = 표지 안쪽 색).
 *    - 새겨지는 내용 (ink): 도착 페이지는 백지(줄만 있는 종이)로 드러나고, 내용(머리말·본문)은
 *      접힌 선을 조금 뒤따라가며 서서히 나타난다. css mask 의 그라데이션 경계를 접힌 선에 맞춰 옮기는 방식.
 *        · 뒷페이지로: 접힌 선이 오른쪽 → 왼쪽으로 가므로 내용도 오른쪽부터 새겨진다.
 *        · 앞페이지로: 되말려 나온 페이지가 왼쪽부터 덮으므로 내용도 왼쪽부터 새겨진다.
 *      넘김이 끝나는 순간 전체가 다 보이도록 뒤따르는 거리는 끝으로 갈수록 0 이 된다.
 *      도착 페이지가 로그인 표지일 때는 하지 않는다 (가죽 표지는 통째로 보여야 함).
 *
 * 4. 함께 넘어가는 책갈피
 *    두 페이지 사이의 페이지들(앞쪽 페이지 ~ 뒤쪽 페이지 직전)의 책갈피.
 *      메인 → 성적 분석: 메인·과목성적 / 성적 분석 → 메인: 메인·과목성적
 *      성적 분석 → 과목·성적: 과목성적 / 로그인 ↔ 메인: 없음
 *    묶음의 맨 앞 페이지 책갈피는 "지금 페이지" 모양, 나머지는 그 페이지 기준 깊이만큼
 *    내려가 위로 드러난 부분만 보인다. 넘어가는 동안 진짜 책갈피는 숨긴다.
 *
 * 5. 설정 책갈피: 책 오른쪽 옆에 꽂힌 빨간 책갈피. 페이지 밖(.book)에 있어 페이지와 함께 넘어가지 않는다.
 *    평소엔 종이 더미 뒤에 박혀 있고, 설정 페이지에서는 페이지 앞으로 나온다.  (CSS .bookmark)
 *
 * 6. 로그인 표지: 노트 종이·책갈피를 숨기고 표지가 페이지 크기만큼 늘어난다.
 *    모든 페이지(표지 포함) 세로 길이는 메인 화면 높이로 같다. 더 긴 내용은 페이지 안에서 스크롤.  (CSS body.locked, Tabs.mainHeight)
 *
 * 7. "애니메이션 줄이기" 설정 사용자는 넘김 없이 바로 바뀐다.
 *
 * ── 조절 손잡이 ─────────────────────────────────────────────────────
 *  - 순서·하강치: 아래 ORDER / TAB_STEP / TAB_MAX
 *  - 넘김 속도·귀퉁이가 들리는 높이: 아래 DUR / SINK / LIFT
 *  - 내용이 새겨지는 느낌: 아래 INK_LAG / INK_SOFT
 *  - 지금 페이지 책갈피 모양: css/base.css "인덱스 탭", "설정 책갈피" 구역
 */
const PageTurn = {
  /** 페이지 순서 (앞 → 뒤). 여기 없는 화면(로그인)은 맨 앞(-1) */
  ORDER: ["dashboard", "courses", "stats", "memo", "settings"],

  /** 책갈피가 한 장 뒤일수록 내려가는 px, 최대치 (책갈피 72px − 제목 아래 끝 ~32px) */
  TAB_STEP: 8,
  TAB_MAX: 40,

  /** 넘김 시간(ms), 앞페이지 책갈피가 가라앉는 시간(ms), 귀퉁이가 들리는 높이(페이지 너비 대비) */
  DUR: 500,
  SINK: 200,
  LIFT: 0.16,

  /** 새겨지는 내용: 접힌 선 뒤로 백지인 채 남는 폭, 흐릿하게 나타나는 경계의 폭 (둘 다 페이지 너비 대비) */
  INK_LAG: 0.08,
  INK_SOFT: 0.35,

  /** 1) 화면이 바뀌면 다시 그리기 전에 지금 페이지를 복사해 둔다 */
  capture(page, prev, name) {
    if (!prev || prev === name) return null;
    this.finish?.(); // 넘기는 도중에 또 넘기면 앞의 연출은 바로 끝낸다
    return page.cloneNode(true);
  },

  /** 3) 책갈피 높이 정리 (규칙 2) */
  stackTabs(name) {
    const cur = this.ORDER.indexOf(name);
    document.querySelectorAll(".tabs .tab").forEach((tab) => {
      tab.style.setProperty("--drop", `${this.drop(this.ORDER.indexOf(tab.dataset.tab), cur)}px`);
    });
  },

  /** 지금 페이지가 cur 번째일 때 i 번째 페이지 책갈피가 내려가는 px (규칙 2) */
  drop(i, cur) {
    const backs = this.ORDER.length - 1 - cur; // 지금 페이지 뒤에 남은 페이지 수 (설정 포함)
    const depth = i >= cur
      ? i - cur          // 뒤 묶음: 뒤로 갈수록 깊게
      : backs + i + 1;   // 앞 묶음: 뒤 묶음보다 깊은 곳에서, 앞페이지일수록 얕게
    return Math.min(2 + depth * this.TAB_STEP, this.TAB_MAX);
  },

  /** 4) 넘김 연출 (규칙 3, 4) */
  turn(page, oldPage, prev, name) {
    if (!oldPage || matchMedia("(prefers-reduced-motion: reduce)").matches) return; // 규칙 7
    const from = this.ORDER.indexOf(prev);
    const to = this.ORDER.indexOf(name);
    const forward = to > from;
    const moving = forward ? oldPage : page;
    const tabOf = (n) => document.querySelector(`[data-tab="${n}"]:not(.page *)`); // 인덱스 탭 + 설정 책갈피 (복사본 제외)

    oldPage.removeAttribute("id");
    oldPage.classList.toggle("cover", prev === "login");
    oldPage.classList.add(forward ? "turning" : "under");
    if (!forward) page.classList.add("returning");
    page.after(oldPage);

    // 함께 넘어가는 책갈피 (규칙 4)
    const a = Math.min(from, to);
    const names = a < 0 ? [] : this.ORDER.slice(a, Math.max(from, to)); // 로그인 표지가 넘어갈 땐 책갈피 없음
    const tabs = names.map(tabOf).filter(Boolean);
    const copies = tabs.map((tab) => this.tabCopy(tab, page, a));
    moving.append(...copies);

    const W = moving.offsetWidth;
    const H = moving.offsetHeight;
    const lift = Math.min(W * this.LIFT, 160);
    const top = lift + 90; // 캔버스 위쪽 여유: 들린 귀퉁이 + 책갈피
    const canvas = document.createElement("canvas");
    canvas.className = "page-flap";
    // ponytail: 캔버스는 1배율(고해상도 화면에선 뒷면 가장자리가 살짝 부드러움). 거슬리면 devicePixelRatio 곱하기
    canvas.width = W * 2;
    canvas.height = H + top + 60;
    canvas.style.left = `${page.offsetLeft - W}px`;
    canvas.style.top = `${page.offsetTop - top}px`;
    page.parentElement.append(canvas);
    const ctx = canvas.getContext("2d");

    const css = getComputedStyle(page);
    const back = (forward ? prev : name) === "login" ? "#4a2a14" : css.getPropertyValue("--paper-edge"); // 표지 안쪽 / 종이 뒷면
    const tabBacks = copies.map((c) => ({
      x: c.offsetLeft,
      y: c.offsetTop + (c.classList.contains("active") ? -6 : parseFloat(c.style.getPropertyValue("--drop"))),
      w: c.offsetWidth,
      color: c.style.backgroundColor,
    }));

    /** e = 0(펼쳐진 상태) ~ 1(다 넘어감). 좌표는 페이지 왼쪽 위가 (0,0) */
    // 새겨지는 내용 (규칙 3): 도착 페이지(#page)의 내용물. 책갈피 복사본과 로그인 표지는 제외
    const inked = name === "login" ? [] : [...page.children]
      .filter((el) => !el.classList.contains("tab"))
      .map((el) => ({ el, left: el.offsetLeft }));
    const lag = W * this.INK_LAG;
    const soft = W * this.INK_SOFT;
    const ink = (e) => {
      const fold = W * (1 - e); // 접힌 선의 가로 위치 (가운데 높이 기준)
      // 경계 x: 처음엔 내용이 전부 숨고, 끝(뒷페이지로 e=1 / 앞페이지로 e=0)엔 전부 드러나는 위치
      const x = forward ? fold + lag * (1 - e) - soft * e : fold - lag * e + soft * (1 - e);
      for (const { el, left } of inked) {
        const at = x - left;
        el.style.maskImage = el.style.webkitMaskImage = forward
          ? `linear-gradient(90deg, transparent ${at}px, #000 ${at + soft}px)`  // 경계 오른쪽만 보임
          : `linear-gradient(90deg, #000 ${at - soft}px, transparent ${at}px)`; // 경계 왼쪽만 보임
      }
    };

    const draw = (e) => {
      ink(e);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      // 귀퉁이 C=(W,H) 가 P 로 끌려간다. n = C − P, 접힌 선 = C·P 의 수직이등분선
      const nx = 2 * W * e;
      const ny = lift * Math.sin(Math.PI * e);
      const len = Math.hypot(nx, ny);
      if (len < 1) return void (moving.style.clipPath = "");
      const [ux, uy] = [nx / len, ny / len];
      const [mx, my] = [W - nx / 2, H - ny / 2];
      const d = len / 2; // 접힌 선 ~ 귀퉁이 거리

      // 넘어가는 페이지: 접힌 선의 책등 쪽만 남긴다
      const xAt = (y) => mx - ((y - my) * uy) / ux;
      moving.style.clipPath =
        `polygon(-50px -100px, ${xAt(-100)}px -100px, ${xAt(H + 100)}px ${H + 100}px, -50px ${H + 100}px)`;

      canvas.style.opacity = Math.min(1, (1 - e) / 0.2); // 책등 너머로 넘어가면 사라짐
      ctx.translate(W, top);
      const clipFar = () => { // 접힌 선의 바깥쪽(귀퉁이 쪽) 반평면
        const B = 1e4;
        ctx.beginPath();
        ctx.moveTo(mx - uy * B, my + ux * B);
        ctx.lineTo(mx + uy * B, my - ux * B);
        ctx.lineTo(mx + uy * B + ux * B, my - ux * B + uy * B);
        ctx.lineTo(mx - uy * B + ux * B, my + ux * B + uy * B);
        ctx.clip();
      };
      const shade = (dist, stops) => {
        const g = ctx.createLinearGradient(mx, my, mx + ux * dist, my + uy * dist);
        stops.forEach(([at, color]) => g.addColorStop(at, color));
        return g;
      };

      // 드러난 밑 페이지에 지는 그림자
      ctx.save();
      clipFar();
      ctx.fillStyle = shade(Math.min(d * 0.6, 200), [[0, "rgba(0,0,0,.3)"], [1, "rgba(0,0,0,0)"]]);
      ctx.fillRect(0, 0, W, H);
      ctx.restore();

      // 뒷면: 잘린 부분을 접힌 선에 대칭
      ctx.save();
      const k = mx * ux + my * uy;
      ctx.transform(1 - 2 * ux * ux, -2 * ux * uy, -2 * ux * uy, 1 - 2 * uy * uy, 2 * k * ux, 2 * k * uy);
      clipFar();
      ctx.shadowColor = "rgba(0,0,0,.4)";
      ctx.shadowBlur = 30;
      ctx.fillStyle = back;
      ctx.fillRect(0, 0, W, H);
      ctx.shadowColor = "transparent";
      ctx.beginPath();
      ctx.rect(0, 0, W, H);
      for (const t of tabBacks) {
        ctx.fillStyle = t.color;
        ctx.fillRect(t.x, t.y, t.w, -t.y);
        ctx.rect(t.x, t.y, t.w, -t.y);
      }
      // 휜 종이 명암: 접힌 곳 그늘 → 밝은 띠 → 평평 → 끝자락 살짝 그늘
      ctx.fillStyle = shade(d, [
        [0, "rgba(0,0,0,.28)"], [0.1, "rgba(255,255,255,.4)"], [0.4, "rgba(255,255,255,0)"], [1, "rgba(0,0,0,.14)"],
      ]);
      ctx.fill();
      ctx.restore();
    };

    let raf;
    const run = (dur, fn, next) => {
      const t0 = performance.now();
      const step = (now) => {
        const t = dur ? Math.min(Math.max(now - t0, 0) / dur, 1) : 1;
        fn(t);
        if (t < 1) raf = requestAnimationFrame(step);
        else next();
      };
      raf = requestAnimationFrame(step);
    };
    const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - (2 - 2 * t) ** 2 / 2);
    let sinking = [];

    this.finish = () => {
      this.finish = null;
      cancelAnimationFrame(raf);
      sinking.forEach((s) => s.cancel());
      canvas.remove();
      oldPage.remove();
      copies.forEach((c) => c.remove());
      page.classList.remove("returning");
      page.style.clipPath = "";
      inked.forEach(({ el }) => (el.style.maskImage = el.style.webkitMaskImage = ""));
      tabs.forEach((tab) => (tab.style.visibility = ""));
      document.querySelectorAll("[data-tab]").forEach((el) => el.classList.toggle("active", el.dataset.tab === name));
    };

    if (forward) {
      tabs.forEach((tab) => (tab.style.visibility = "hidden")); // 넘어가는 동안엔 복사본만 보이게
      run(this.DUR, (t) => draw(ease(t)), () => {
        this.finish();
        // 넘어간 페이지들의 책갈피가 페이지 뒤에서 제자리로 올라온다
        tabs.forEach((tab) => tab.animate([{ transform: "translateY(80px)" }, {}], { duration: 350, easing: "ease-out" }));
      });
      return;
    }

    // 앞페이지로 ①: 새 페이지는 아직 안 보이고(e=1), 꺼내올 페이지들의 책갈피가 이전 모양에서 밑으로 가라앉는다
    draw(1);
    tabOf(name)?.classList.remove("active");
    tabOf(prev)?.classList.add("active"); // 덮일 때까지는 이전 페이지 책갈피가 앞에 있음
    sinking = tabs.map((tab) =>
      tab.animate(
        [{ transform: `translateY(${this.drop(this.ORDER.indexOf(tab.dataset.tab), from)}px)` }, { transform: "translateY(80px)" }],
        { duration: this.SINK, easing: "ease-in", fill: "forwards" }
      )
    );
    run(tabs.length ? this.SINK : 0, () => {}, () => {
      // ②: 책갈피를 단 채로 책등 쪽에서 되말려 나온다
      tabOf(name)?.classList.add("active");
      tabs.forEach((tab) => (tab.style.visibility = "hidden"));
      run(this.DUR, (t) => draw(1 - ease(t)), () => this.finish());
    });

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
      whiteSpace: "nowrap", // 너비를 정수 px 로 고정하면서 글자가 두 줄로 밀리지 않게
      zIndex: "1",
    });
    return copy;
  },
};
