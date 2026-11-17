# 每日十五词 — 초급 중국어 15주 자기주도 학습

하루 열 단어, 15주 완성. 한국인 초급 학습자(HSK 1~3급)를 위한 중국어 학습 웹앱입니다.

- 서버: Node.js · 배포: Railway · 데이터베이스: Railway PostgreSQL
- 로그인: 구글 계정 · 작문 첨삭: Claude API

## 과제 요구 사항과 구현

| 요구 사항 | 구현 |
|---|---|
| 15주차 내용 완결 | `server/curriculum.js` — 15주 × 단어 10개(총 150개), 핵심 문형, 예문 3개, 작문 미션 |
| 구글 로그인 | `/auth/google` (OAuth 2.0, 이름·이메일·사진만 받음) |
| GitHub → Railway 배포 | `railway.json`, `npm start`, 상태 확인 `/healthz` |
| 관리자 로그인 모드 | `ADMIN_EMAILS`에 적은 구글 계정은 로그인하면 자동으로 관리자 |
| 관리 대시보드 | 회원 수, 승인 대기, 최근 7일 활동, 주차별 완료 인원, 14일 학습 추이, 최근 활동 |
| 회원 승인·관리 | 승인·거절·정지·해제·관리자 지정·삭제, 메모, 회원별 학습 기록, CSV 내려받기, 가입 방식(관리자 승인 / 자동 승인=개방형) |
| 사용자 대시보드 | 완료 주차, 외운 단어, 연속 학습일, 퀴즈 평균, 오늘의 단어, 4주 학습 기록, 15주 진도, 최근 작문 |

한 주의 흐름: ① 단어 10개(🔊 발음) → ② 문형·예문 → ③ 퀴즈 10문제(8개 이상 통과) → ④ 작문 미션 + AI 첨삭. 셋(단어·퀴즈·작문)을 마치면 그 주차 완료(完).

## 수업 운영 기능 (숏폼 중국어)

| 학생 | 교수자(관리자) |
|---|---|
| 주차 수업 안내 · 도우인 링크 · 자막(중국어/병음/한국어 켜고 끄기) | 주차 콘텐츠 편집(코드 수정 없이), 과제 마감일, 공개/비공개 |
| 과제 제출 + AI 첨삭(수준별) · 교수님 평가와 의견 확인 | 과제 평가: 항목별 점수, 평가 완료/수정 요청, 기한 후 제출 표시 |
| 팀 프로젝트: 개인 대본(AI 첨삭) → 승인, 역할, 팀 주제, 팀 영상 링크 | 팀 편성·이동, 대본 승인, 주제 승인, 개인 15 + 팀 15점 |
| AI 회화 파트너(주차별 상황, 🎤 음성 입력, 끝나면 피드백) | 성적부: 수준(초급·중급), 출석·참여 점수, 100점 합계, CSV |
| 내 성적: 교수님이 확정한 점수만 표시 | AI 결과는 참고용으로 따로 저장, 점수는 교수자가 확정 |

성적 구성: 출석·참여 10 · 주차 과제 20(1~7·9~14주) · 중간 25(8주) · 숏폼 프로젝트 30 · 최종 15(15주).
AI 발음·성조 점수는 검증된 발음 평가 엔진을 연결하기 전까지 넣지 않습니다.

## Railway에 올리기

1. Railway → **New Project → Deploy from GitHub repo → meiri-shici**
2. 같은 프로젝트 화면에서 **+ Create → Database → PostgreSQL** 추가
3. 앱 서비스 → **Variables** 에 넣기

| 이름 | 값 |
|---|---|
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` (Add Reference로 고르면 자동) |
| `SESSION_SECRET` | 아무 긴 글자 |
| `ADMIN_EMAILS` | 관리자 구글 이메일(여러 개는 쉼표) |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Google Cloud OAuth 클라이언트 |
| `ANTHROPIC_API_KEY` | Claude API 키 (작문 첨삭) |
| `AI_DAILY_LIMIT` | (선택) 1인 하루 첨삭 횟수, 기본 30 |
| `SIGNUP_NOTIFY_TO` | (선택) 가입 신청 알림을 받을 이메일(여러 개는 쉼표) |
| `SMTP_HOST`, `SMTP_PORT` | (선택) 알림 메일 서버. 네이버는 `smtp.naver.com`, `465` |
| `SMTP_USER`, `SMTP_PASS` | (선택) 보내는 메일 계정 전체 주소와 비밀번호(2단계 인증이면 애플리케이션 비밀번호) |
| `SMTP_FROM` | (선택) 보내는 주소. 비우면 `SMTP_USER` |

4. **Settings → Networking → Generate Domain**
5. Google Cloud OAuth 클라이언트에 추가
   - 승인된 자바스크립트 원본: `https://내주소`
   - 승인된 리디렉션 URI: `https://내주소/auth/google/callback`

> 비밀 값은 코드나 GitHub에 넣지 않고 Railway Variables에만 둡니다.
> 가입 신청 알림: 네이버 메일 → 환경설정 → POP3/IMAP 설정에서 IMAP/SMTP 사용을 켜야 보낼 수 있습니다. 네 값(`SMTP_HOST`·`SMTP_USER`·`SMTP_PASS`·`SIGNUP_NOTIFY_TO`)이 모두 있어야 켜지며, 메일이 실패해도 가입은 그대로 진행됩니다.
> Google OAuth 동의 화면이 '테스트' 상태면 테스트 사용자로 등록한 사람만 가입할 수 있습니다. 누구나 가입하게 하려면 동의 화면을 '프로덕션'으로 게시하세요(이 앱은 이름·이메일만 받아 구글 심사가 필요 없는 범위입니다).

## 내 PC에서 시험

```bash
cp .env.example .env   # DATABASE_URL 등 채우기, 시험용 로그인은 DEV_LOGIN=1
npm install
npm run local          # http://localhost:3000
npm test
```

## 폴더
```
server/index.js        서버와 API
server/curriculum.js   15주 학습 내용
server/lib/db.js       PostgreSQL 표 만들기·연결
server/lib/ai.js       Claude 작문 첨삭
public/                화면 (학습자·관리자)
```
