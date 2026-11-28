// ===== 프로필 + 초기 입력용 샘플 데이터 (직접 수정하세요) =====
// profile: S01/S02 화면에서 그대로 사용한다 (스키마에 없는 정보라 API를 쓰지 않음).
// seedPersonas / seedExperiences / seedQuestions: 화면에서는 사용하지 않는다.
//   DynamoDB에 처음 넣을 때 참고하는 샘플이며, 필드명은 docs/schema.graphql 기준이다.
// 날짜: createdAt/answeredAt은 ISO 문자열(2026-11-18T00:00:00Z), startDate/endDate는 "YYYY-MM-DD".

// --- S01/S02 사이트 주인 정보 ---
const profile = {
  name: "서지민",
  affiliation: "강원대학교 AI융합&클라우드융합학과",
  intro: "한줄소개",
  image: "images/profile.png",   // images/ 폴더에 넣은 파일명
  likes: ["게임", "음악듣기", "그림", "부엉이"],
  dislikes: ["벌레/곤충", "버섯"],
};

// --- Persona (페르소나) 샘플 : 3개 ---
const seedPersonas = [
  {
    personaId: "p1",
    name: "학부생",
    description: "대학 학부생인 나",
    tags: ["학교", "공부"],
    createdAt: "2026-11-18T00:00:00Z",
  },
  {
    personaId: "p2",
    name: "자격증 준비생",
    description: "자격증을 준비하는 나",
    tags: ["자격증", "공부"],
    createdAt: "2026-11-18T00:00:00Z",
  },
  {
    personaId: "p3",
    name: "디지털 드로잉 창작자",
    description: "디지털 드로잉을 하는 나",
    tags: ["그림", "취미"],
    createdAt: "2026-11-18T00:00:00Z",
  },
];

// --- Experience (경험 기록) 샘플 : 6개 ---
// personaId는 위 seedPersonas의 personaId와 맞춰야 한다.
// content 작성 규칙: "상황: ..." / "과정: ..." / "결과: ..." 를 줄바꿈으로 나눠 적으면
//                    S05 화면에서 타임라인으로 표시된다. (라벨이 없으면 일반 본문으로 표시)
const seedExperiences = [
  {
    experienceId: "e1",
    personaId: "p1",
    title: "대학교에서의 학점관리-1",
    tags: ["공부", "시험", "학점"],
    createdAt: "2026-11-18T00:00:00Z",
    startDate: "2026-03-01",
    endDate: "2026-06-30",
    content:
      "상황: 누군가 떠먹여주는 공부만 하던 고등학교 입시생활에서 벗어나, 스스로 공부 계획을 세우고 시험을 준비해야 하는 상황이었다.\n" +
      "과정: 시험공부를 위해 계획표를 작성하고, 매일 일정 시간 동안 공부를 진행했다.\n" +
      "결과: 1학년 초반에는 다들 놀아서 그 흐름에 휩쓸려 공부도 소홀히하고 학점도 낮았다.",
    likeCount: 0,
    viewCount: 0,
  },
  {
    experienceId: "e2",
    personaId: "p1",
    title: "경험 기록 제목 2",
    tags: ["태그B"],
    createdAt: "2026-11-18T00:00:00Z",
    startDate: "2026-02-01",
    endDate: "2026-02-28",
    content: "상황: 상황을 적으세요\n과정: 과정을 적으세요\n결과: 결과를 적으세요",
    likeCount: 0,
    viewCount: 0,
  },
  {
    experienceId: "e3",
    personaId: "p2",
    title: "경험 기록 제목 3",
    tags: ["태그A"],
    createdAt: "2026-11-18T00:00:00Z",
    startDate: "2026-02-01",
    endDate: "2026-03-31",
    content: "상황: 상황을 적으세요\n과정: 과정을 적으세요\n결과: 결과를 적으세요",
    likeCount: 0,
    viewCount: 0,
  },
  {
    experienceId: "e4",
    personaId: "p2",
    title: "경험 기록 제목 4",
    tags: ["태그C"],
    createdAt: "2026-11-18T00:00:00Z",
    startDate: "2026-03-01",
    endDate: "2026-03-31",
    content: "상황: 상황을 적으세요\n과정: 과정을 적으세요\n결과: 결과를 적으세요",
    likeCount: 0,
    viewCount: 0,
  },
  {
    experienceId: "e5",
    personaId: "p3",
    title: "경험 기록 제목 5",
    tags: ["태그D"],
    createdAt: "2026-11-18T00:00:00Z",
    startDate: "2026-03-01",
    endDate: "2026-04-30",
    content: "상황: 상황을 적으세요\n과정: 과정을 적으세요\n결과: 결과를 적으세요",
    likeCount: 0,
    viewCount: 0,
  },
  {
    experienceId: "e6",
    personaId: "p3",
    title: "경험 기록 제목 6",
    tags: ["태그D", "태그E"],
    createdAt: "2026-11-18T00:00:00Z",
    startDate: "2026-04-01",
    endDate: "2026-04-30",
    content: "상황: 상황을 적으세요\n과정: 과정을 적으세요\n결과: 결과를 적으세요",
    likeCount: 0,
    viewCount: 0,
  },
];

// --- Question (질문) 샘플 : S06 질문함용 ---
// status: "PENDING"(답변대기) / "ANSWERED"(답변완료) / "HIDDEN"(숨김)
const seedQuestions = [
  {
    questionId: "q1",
    nickname: "방문자1",
    personaId: "p1",
    content: "질문 내용을 적으세요 (10자 이상)",
    answer: "답변 내용을 적으세요",
    status: "ANSWERED",
    createdAt: "2026-11-18T00:00:00Z",
    answeredAt: "2026-11-18T00:00:00Z",
  },
  {
    questionId: "q2",
    nickname: "방문자2",
    personaId: "p3",
    content: "아직 답변 안 한 질문 예시입니다",
    answer: null,
    status: "PENDING",
    createdAt: "2026-11-18T00:00:00Z",
    answeredAt: null,
  },
];
