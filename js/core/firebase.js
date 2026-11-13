/** Firebase Authentication. 과목 저장소와 독립적으로 로그인만 담당한다. */
const FirebaseAuth = {
  // Firebase App Check에 등록한 공개 reCAPTCHA 사이트 키를 사용한다.
  AI_CONFIG: { siteKey: "6Ldo3B4uAAAAAAm85F-hgPhA1kZ2rqVujorgQkYs", provider: "enterprise", model: "gemini-3.8-flash" },
  user: null,
  ready: false,
  error: null,
  async init(onChange) {
    try {
      if (!["http:", "https:"].includes(location.protocol)) {
        throw new Error("로그인은 Live Server 등 웹 서버의 http://localhost 주소에서 실행해 주세요.");
      }
      const [appSDK, authSDK] = await Promise.all([
        import("https://www.gstatic.com/firebasejs/13.3.0/firebase-app.js"),
        import("https://www.gstatic.com/firebasejs/13.3.0/firebase-auth.js"),
      ]);
      this.sdk = authSDK;
      const app = appSDK.initializeApp({
        apiKey: "AIzaSyDdwaSuXjfu977YRMLjdcrHkCnTxscCJhA",
        authDomain: "hakerton-team06.firebaseapp.com",
        projectId: "hakerton-team06",
        storageBucket: "hakerton-team06.firebasestorage.app",
        messagingSenderId: "432350979180",
        appId: "1:432350979180:web:a95a0ac29133b7bd606449",
        measurementId: "G-4GC444Q5T9",
      });
      this.app = app;
      // AI/App Check 초기화 실패로 기존 Google 로그인까지 중단하지 않는다.
      if (this.AI_CONFIG.siteKey) {
        try { await this.initAppCheck(); } catch (error) { this.appCheckError = error; }
      }
      this.auth = authSDK.getAuth(app);
      this.auth.languageCode = "ko";
      await authSDK.setPersistence(this.auth, authSDK.browserSessionPersistence);
      this.unsubscribe = authSDK.onAuthStateChanged(this.auth, (user) => {
        this.user = user;
        this.ready = true;
        this.error = null;
        onChange();
      }, (error) => {
        this.user = null;
        this.ready = true;
        this.error = this.message(error);
        onChange();
      });
    } catch (error) {
      this.ready = true;
      this.error = this.message(error);
      onChange();
    }
  },
  google() {
    const provider = new this.sdk.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    return this.sdk.signInWithPopup(this.auth, provider);
  },
  logout() {
    return this.sdk.signOut(this.auth);
  },
  async firestore() {
    if (!this.app) throw new Error("Firebase 연결을 확인해 주세요.");
    if (!this.firestorePromise) {
      this.firestorePromise = import("https://www.gstatic.com/firebasejs/13.3.0/firebase-firestore.js")
        .then((sdk) => ({ sdk, db: sdk.getFirestore(this.app) }))
        .catch((error) => { this.firestorePromise = null; throw error; });
    }
    return this.firestorePromise;
  },
  async initAppCheck() {
    if (!this.app) throw new Error("Firebase 연결을 확인해 주세요.");
    const { siteKey, provider } = this.AI_CONFIG;
    if (!siteKey) throw new Error("App Check의 reCAPTCHA 사이트 키 설정이 필요합니다.");
    if (!["enterprise", "v3"].includes(provider)) throw new Error("App Check 제공업체 설정을 확인해 주세요.");
    if (!this.appCheckPromise) {
      this.appCheckPromise = import("https://www.gstatic.com/firebasejs/13.3.0/firebase-app-check.js")
        .then((sdk) => sdk.initializeAppCheck(this.app, {
          provider: provider === "v3" ? new sdk.ReCaptchaV3Provider(siteKey) : new sdk.ReCaptchaEnterpriseProvider(siteKey),
          isTokenAutoRefreshEnabled: true,
        }))
        .catch((error) => { this.appCheckPromise = null; throw error; });
    }
    return this.appCheckPromise;
  },
  async adviceModel() {
    await this.initAppCheck();
    if (!this.adviceModelPromise) {
      this.adviceModelPromise = import("https://www.gstatic.com/firebasejs/13.3.0/firebase-ai.js")
        .then((sdk) => {
          const ai = sdk.getAI(this.app, { backend: new sdk.GoogleAIBackend(), useLimitedUseAppCheckTokens: true });
          return sdk.getGenerativeModel(ai, {
            model: this.AI_CONFIG.model,
            systemInstruction: "당신은 대학생의 학습 계획을 돕는 조언자다. 제공된 성적 요약만 근거로 한국어로 답하라. 수치는 이미 계산된 값을 그대로 사용하고, 정보가 없으면 추측하지 마라. PASS/FAIL·미입력은 평점에서 제외되며 재수강 이전 성적은 평가에서 제외되어 있다. 격려 1문장과 구체적인 학습 실천 3가지를 450자 이내의 일반 텍스트로 작성하라. 마크다운과 HTML은 사용하지 마라. 취업·졸업·장학금 가능성을 단정하지 마라.",
            generationConfig: { maxOutputTokens: 1024, temperature: 0.5 },
          }, { timeout: 30000 });
        })
        .catch((error) => { this.adviceModelPromise = null; throw error; });
    }
    return this.adviceModelPromise;
  },
  adviceSummary(courses) {
    if (!courses.length) throw new Error("과목을 먼저 등록해 주세요.");
    // 계정 이름, 이메일, ID, 메모, 과목명은 전송하지 않는다.
    return {
      scale: 4.5,
      gpa: GPA.calcGPA(courses),
      credits: GPA.sumCredits(courses),
      distribution: GPA.gradeDistribution(courses),
      semesters: GPA.summarizeBySemester(courses).slice(-12).map((s) => ({
        semester: s.semesterKey, gpa: s.gpa, credits: s.credits,
      })),
    };
  },
  async generateAdvice(courses) {
    const summary = this.adviceSummary(courses);
    const model = await this.adviceModel();
    const result = await model.generateContent(`다음 성적 요약을 바탕으로 다음 학기를 위한 조언을 해 주세요.\n${JSON.stringify(summary)}`);
    const text = result.response.text().trim();
    if (!text) throw new Error("조언을 생성하지 못했습니다. 다시 시도해 주세요.");
    return text;
  },
  adviceError(error) {
    const code = String(error.code || "");
    if (code.includes("appCheck") || code.includes("app-check") || code.includes("fetch-status-error")) return "앱 인증에 실패했습니다. App Check 사이트 키와 허용 도메인을 확인해 주세요.";
    if (/429|quota|resource-exhausted/i.test(`${code} ${error.message}`)) return "AI 요청 한도에 도달했습니다. 잠시 후 다시 시도해 주세요.";
    if (/403|permission|unauthorized/i.test(`${code} ${error.message}`)) return "AI 접근이 허용되지 않았습니다. Firebase AI Logic과 App Check 설정을 확인해 주세요.";
    return code.startsWith("ai/") ? "AI 조언을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요." : error.message || "AI 연결에 실패했습니다.";
  },
  message(error) {
    const messages = {
      "auth/invalid-credential": "이메일 또는 비밀번호를 확인해 주세요.",
      "auth/wrong-password": "이메일 또는 비밀번호를 확인해 주세요.",
      "auth/user-not-found": "이메일 또는 비밀번호를 확인해 주세요.",
      "auth/invalid-email": "이메일 주소를 확인해 주세요.",
      "auth/email-already-in-use": "이미 가입된 이메일입니다. 로그인해 주세요.",
      "auth/weak-password": "비밀번호가 너무 짧거나 프로젝트의 비밀번호 정책에 맞지 않습니다.",
      "auth/popup-closed-by-user": "로그인 창이 닫혔습니다. 다시 시도해 주세요.",
      "auth/popup-blocked": "팝업이 차단됐습니다. 브라우저에서 팝업을 허용해 주세요.",
      "auth/unauthorized-domain": "Firebase Authentication의 승인된 도메인에 현재 주소를 추가해 주세요.",
      "auth/operation-not-allowed": "Firebase 콘솔에서 해당 로그인 제공업체를 활성화해 주세요.",
      "auth/configuration-not-found": "Firebase 콘솔에서 Authentication을 시작하고 로그인 제공업체를 활성화해 주세요.",
      "auth/network-request-failed": "네트워크 연결을 확인한 뒤 다시 시도해 주세요.",
      "auth/too-many-requests": "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.",
      "auth/user-disabled": "사용이 중지된 계정입니다.",
    };
    return messages[error.code] || (error.code ? "로그인 처리에 실패했습니다. 잠시 후 다시 시도해 주세요." : error.message || "Firebase 연결에 실패했습니다. 새로고침해 주세요.");
  },
};
