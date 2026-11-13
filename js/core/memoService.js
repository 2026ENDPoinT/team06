/**
 * 과목별 자유 메모 저장/불러오기
 *
 * - 게스트: LocalStorage 의 "team06.memos" 에 { 과목id: 메모 } 로 저장
 * - 로그인: Firestore users/{uid}/memos/{과목id} 문서에 { text, updatedAt } 로 저장
 * 과목 데이터(CourseService)와 따로 저장하므로 과목 저장 방식에는 영향을 주지 않는다.
 * 과목이 삭제되어 남은 메모는 화면에서 보이지 않을 뿐 그대로 둔다. (같은 id 로 JSON 을 다시 불러오면 메모도 돌아옴)
 */
const MemoService = {
  KEY: "team06.memos",
  MAX_LENGTH: 5000,

  memos: {},
  uid: undefined,   // 지금 불러온 메모의 주인 (null = 게스트, undefined = 아직 안 불러옴)
  generation: 0,
  loading: false,
  loadError: null,

  /**
   * 현재 계정의 메모를 불러온다. 이미 같은 계정 메모를 갖고 있으면 바로 끝난다.
   * 불러오는 중이거나 실패했으면 그 Promise 를 그대로 돌려준다 (실패하면 retry() 전까지 재시도 안 함)
   */
  ensureLoaded(uid) {
    if (this.uid === uid) return Promise.resolve();
    if (this.loadingUid === uid && this.promise) return this.promise;
    const generation = ++this.generation;
    this.loadingUid = uid;
    this.loading = true;
    this.loadError = null;
    this.promise = (async () => {
      try {
        const memos = uid ? await this.loadCloud(uid) : this.loadLocal();
        if (generation !== this.generation) return;
        this.memos = memos;
        this.uid = uid;
      } catch (error) {
        if (generation !== this.generation) return;
        this.memos = {};
        this.uid = undefined;
        this.loadError = DataStore.errorMessage(error);
        throw new Error(this.loadError);
      } finally {
        if (generation === this.generation) this.loading = false;
      }
    })();
    return this.promise;
  },

  retry() {
    this.loadError = null;
    this.promise = null;
  },

  /** 백업 불러오기: 이 계정의 메모 전체를 교체한다 */
  async replaceAll(uid, memos) {
    if (uid) {
      DataStore.assertUser(uid);
      const { sdk, db } = await FirebaseAuth.firestore();
      const collection = sdk.collection(db, "users", uid, "memos");
      const old = await sdk.getDocsFromServer(collection);
      DataStore.assertUser(uid);
      const deleted = old.docs.filter((document) => !Object.prototype.hasOwnProperty.call(memos, document.id));
      if (deleted.length + Object.keys(memos).length > 500) throw new Error("한 번에 바꿀 수 있는 메모는 500개까지입니다.");
      const batch = sdk.writeBatch(db);
      for (const document of deleted) batch.delete(document.ref);
      for (const [id, text] of Object.entries(memos)) batch.set(sdk.doc(collection, id), { text, updatedAt: Date.now() });
      await batch.commit();
    } else {
      try {
        localStorage.setItem(this.KEY, JSON.stringify(memos));
      } catch {
        throw new Error("메모를 저장하지 못했습니다.");
      }
    }
    // 불러오던 중인 예전 메모가 덮어쓰지 않도록 세대를 넘긴다
    this.generation++;
    this.memos = { ...memos };
    this.uid = uid;
    this.loadingUid = uid;
    this.promise = null;
    this.loading = false;
    this.loadError = null;
  },

  get(courseId) {
    return this.memos[courseId] ?? "";
  },

  /** 메모 저장. 빈 메모는 지운다. */
  async set(courseId, text) {
    const uid = this.uid;
    if (uid === undefined) throw new Error("메모를 아직 불러오지 못했습니다.");
    text = String(text).slice(0, this.MAX_LENGTH);
    if (uid) {
      DataStore.assertUser(uid);
      const { sdk, db } = await FirebaseAuth.firestore();
      DataStore.assertUser(uid);
      const ref = sdk.doc(db, "users", uid, "memos", courseId);
      if (text.trim()) await sdk.setDoc(ref, { text, updatedAt: Date.now() });
      else await sdk.deleteDoc(ref);
    } else {
      const next = { ...this.loadLocal(), [courseId]: text };
      if (!text.trim()) delete next[courseId];
      localStorage.setItem(this.KEY, JSON.stringify(next));
    }
    if (this.uid !== uid) return; // 저장하는 사이 계정이 바뀌면 화면 메모는 건드리지 않음
    if (text.trim()) this.memos[courseId] = text;
    else delete this.memos[courseId];
  },

  loadLocal() {
    try {
      const data = JSON.parse(localStorage.getItem(this.KEY) ?? "{}");
      if (!data || typeof data !== "object" || Array.isArray(data)) return {};
      return Object.fromEntries(Object.entries(data).filter(([, text]) => typeof text === "string"));
    } catch {
      return {};
    }
  },

  async loadCloud(uid) {
    DataStore.assertUser(uid);
    const { sdk, db } = await FirebaseAuth.firestore();
    DataStore.assertUser(uid);
    const snapshot = await sdk.getDocsFromServer(sdk.collection(db, "users", uid, "memos"));
    const memos = {};
    for (const document of snapshot.docs) {
      const text = document.data().text;
      if (typeof text === "string") memos[document.id] = text;
    }
    return memos;
  },
};
