# team06
ENDPoinT 해커톤 2026 Team 06 — 성적 관리 웹 애플리케이션

## 기술 결정
- 순수 HTML / CSS / JavaScript (빌드 도구 없음)
- 데이터 저장: **LocalStorage** (키: `team06.courses`, 값: Course 배열을 JSON 문자열로 저장)

## 실행 방법
빌드 도구 없이 순수 HTML/CSS/JS로 만들었습니다. **`index.html`을 브라우저에서 더블클릭해서 열면 됩니다.**
(VS Code의 Live Server 확장을 쓰면 저장할 때마다 자동으로 새로고침됩니다.)

## 폴더 구조와 담당
```
index.html               뼈대만 (상단바 + 탭 3개 + 빈 화면 영역)
css/base.css             공통 스타일 (상단바/탭, 카드, 버튼)
css/views/*.css          탭별 스타일
js/core/                 로직 (기능 A, B) — DOM 코드 금지
js/ui/common.js          화면 공통 도우미 (formatGPA, escape 등)
js/ui/tabs.js            탭 전환 (#dashboard / #courses / #stats)
js/ui/views/*.js         탭별 화면 — 각자 render() 로 자기 영역을 그림
js/app.js                시작점 (2줄)
```

| 탭 | 화면 파일 | 스타일 |
|---|---|---|
| 1. 대시보드 (전체 GPA, 주요 지표) | `js/ui/views/dashboardView.js` | `css/views/dashboard.css` |
| 2. 학기별 과목 (등록/수정/삭제, 목록) | `js/ui/views/coursesView.js` | `css/views/courses.css` |
| 3. 성적 분석 (시각화) | `js/ui/views/statsView.js` | `css/views/stats.css` |

| 파일 | 담당 | 내용 |
|---|---|---|
| `index.html`, `css/`, `js/ui/`, `js/app.js` | 프론트엔드 | 화면 전체 |
| `js/core/gpa.js` | 기능 A | 평점평균 계산, 등급 분포 (필수 3) |
| `js/core/validator.js` | 기능 A | 입력 검증, 예외 처리 (필수 5) |
| `js/core/courseService.js` | 기능 B | 과목 등록·조회·수정·삭제 (필수 1, 2) |
| `js/core/storage.js` | 기능 B | LocalStorage 저장/불러오기 (필수 4) |

> **원칙:** 자기 담당 파일만 수정합니다. 다른 사람 파일에 들어간 함수의 이름이나 반환 형태를 바꿔야 하면 먼저 팀에 공유해 주세요.
> `core/` 파일에는 DOM 코드(`document...`)를 넣지 않고, `ui/` 파일에는 계산·저장 로직을 넣지 않습니다.

## 데이터 모델 (Course)
```js
{
  id: "c_1731490000000",  // string, CourseService.add 에서 생성
  name: "자료구조",        // string, 과목명
  year: 2026,             // number, 연도
  semester: "1",          // "1" | "summer" | "2" | "winter"
  credits: 3,             // number, 0보다 커야 함
  grade: "A+"             // "A+" | "A0" | "B+" | "B0" | "C+" | "C0" | "D+" | "D0" | "F"
}
```
학기 키(semesterKey)는 `"${year}-${semester}"` 형식입니다. 예) `"2026-1"`

## 모듈 인터페이스
| 함수 | 반환 |
|---|---|
| `GPA.calcGPA(courses)` | `number \| null` (과목이 없으면 null) |
| `GPA.sumCredits(courses)` | `number` |
| `GPA.summarizeBySemester(courses)` | `[{ semesterKey, courses, gpa, credits }]` (학기 오름차순) |
| `GPA.gradeDistribution(courses)` | `{ "A+": 3, "A0": 1, ..., "F": 0 }` |
| `Validator.validateCourse(input)` | `{ ok, errors: string[] }` |
| `CourseService.init()` / `getAll()` / `getById(id)` / `add(data)` / `update(id, data)` / `remove(id)` | |
| `DataStore.load()` / `DataStore.save(courses)` | |

현재는 모두 빈 함수(stub)라서 화면만 나옵니다.
- `CourseService.init()`의 임시 과목 데이터 → 기능 B가 구현할 때 삭제
- `StatsView.SAMPLE` 예시 그래프 데이터 → 기능 A 함수가 완성되면 프론트엔드가 실제 데이터로 교체

## 브랜치 전략
```
main          ← 항상 실행되는 상태만 유지 (직접 push 금지, PR로만 병합)
 ├─ frontend  ← 프론트엔드
 ├─ feature/gpa   ← 기능 A (gpa.js, validator.js)
 └─ feature/data  ← 기능 B (courseService.js, storage.js)
```
1. 작업을 시작하기 전에 `git pull origin main`으로 최신 상태를 받습니다.
2. 자기 브랜치에서 작업하고 커밋한 뒤 push합니다.
3. GitHub에서 `main`으로 PR을 열고, 팀원 한 명이 확인한 뒤 병합합니다.
4. 다른 사람의 작업이 main에 병합되면 자기 브랜치에 `git merge main`으로 반영합니다.

## 필수 기능 체크리스트
- [ ] 과목·성적 등록
- [ ] 과목 조회·관리 (학기별, 수정·삭제)
- [ ] GPA 자동 계산 (학기별·누적, 4.5 만점, 소수점 둘째 자리까지)
- [ ] 데이터 저장·불러오기
- [ ] 기본 예외 처리
