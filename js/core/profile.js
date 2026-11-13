/**
 * 닉네임, "지난 나로부터의 메세지" 저장 (이 브라우저의 LocalStorage)
 */
const Profile = {
  NICKNAME_KEY: "team06.nickname",
  PAST_MESSAGE_KEY: "team06.pastMessage",
  NICKNAME_MAX: 20,
  MESSAGE_MAX: 300,
  DEFAULT_NICKNAME: "닉네임",

  read(key) {
    try {
      return localStorage.getItem(key) ?? "";
    } catch {
      return "";
    }
  },

  write(key, value) {
    try {
      if (value) localStorage.setItem(key, value);
      else localStorage.removeItem(key);
    } catch {
      throw new Error("브라우저 저장소에 저장하지 못했습니다.");
    }
  },

  /** 저장된 닉네임 (없으면 "") */
  getNickname() {
    return this.read(this.NICKNAME_KEY);
  },

  /** 화면에 보여줄 닉네임 (없으면 기본값) */
  displayNickname() {
    return this.getNickname() || this.DEFAULT_NICKNAME;
  },

  setNickname(nickname) {
    this.write(this.NICKNAME_KEY, String(nickname).trim().slice(0, this.NICKNAME_MAX));
  },

  getPastMessage() {
    return this.read(this.PAST_MESSAGE_KEY);
  },

  setPastMessage(message) {
    this.write(this.PAST_MESSAGE_KEY, String(message).trim().slice(0, this.MESSAGE_MAX));
  },
};
