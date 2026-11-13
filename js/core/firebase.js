/** Firebase Authentication. 과목 저장소와 독립적으로 로그인만 담당한다. */
const FirebaseAuth = {
  // Firebase App Check에 등록한 공개 reCAPTCHA 사이트 키 (Firestore 등 Firebase 요청을 이 앱에서 온 것으로 인증)
  APP_CHECK: { siteKey: "6Ldo3B4uAAAAAAm85F-hgPhA1kZ2rqVujorgQkYs", provider: "enterprise" },
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
      try { await this.initAppCheck(); } catch { /* App Check 초기화에 실패해도 Google 로그인은 계속 진행한다 */ }
      this.auth = authSDK.getAuth(app);
      this.auth.languageCode = "ko";
      await authSDK.setPersistence(this.auth, authSDK.browserSessionPersistence);
      authSDK.onAuthStateChanged(this.auth, (user) => {
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
    const { siteKey, provider } = this.APP_CHECK;
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
  message(error) {
    const messages = {
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
