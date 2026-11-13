/**
 * 앱 시작점 — 가능한 한 짧게 유지 (여러 명이 고치는 파일이 되지 않도록)
 */
CourseService.init();
DashboardView.NICKNAME = "게스트";
Tabs.init();
CourseService.onChange = () => Tabs.show();
FirebaseAuth.init(() => {
  DashboardView.NICKNAME = FirebaseAuth.user
    ? (FirebaseAuth.user.displayName?.trim() || "사용자")
    : "게스트";
  SettingsView.resetCourseView();
  CourseService.init(FirebaseAuth.user?.uid || null);
});
