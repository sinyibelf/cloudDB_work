// ===== AppSync GraphQL 호출 모듈 =====
// fetch + x-api-key 헤더만 사용한다 (Amplify 사용 안 함).
// 화면 코드(app.js)는 아래 api.xxx() 함수만 호출하면 된다.
// 스키마 원문: docs/schema.graphql

// --- 오류 객체 ---
// errorType 값: "AlreadyLiked" / "NotFound" / "ValidationError" (서버, errors[0].errorType)
//               "NetworkError" / "ConfigError" (이 파일에서 만드는 오류)
class ApiError extends Error {
  constructor(errorType, message) {
    super(message || errorType);
    this.name = "ApiError";
    this.errorType = errorType;
  }
}

// --- visitorId: 처음 한 번만 만들어 localStorage에 저장 ---
const VISITOR_ID_KEY = "visitorId";
let memoryVisitorId = null; // localStorage를 쓸 수 없을 때를 위한 임시 저장

function createUuid() {
  if (crypto.randomUUID) return crypto.randomUUID();
  // randomUUID가 없는 환경(http 접속 등)용 대체: getRandomValues로 UUID v4 생성
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

function getVisitorId() {
  try {
    let id = localStorage.getItem(VISITOR_ID_KEY);
    if (!id) {
      id = createUuid();
      localStorage.setItem(VISITOR_ID_KEY, id);
    }
    return id;
  } catch (e) {
    memoryVisitorId = memoryVisitorId || createUuid();
    return memoryVisitorId;
  }
}

// --- 공통 호출 함수 ---
// query: GraphQL 문자열, variables: 변수 객체 -> 응답의 data 객체를 돌려준다
async function gql(query, variables = {}) {
  const { ENDPOINT, API_KEY } = APPSYNC_CONFIG;
  if (!API_KEY || API_KEY.startsWith("여기에")) {
    throw new ApiError("ConfigError", "js/config.js에 API_KEY를 입력해주세요");
  }

  let json;
  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": API_KEY },
      body: JSON.stringify({ query, variables }),
    });
    json = await res.json(); // 오류 응답(401 등)도 JSON 본문에 errors가 들어 있음
  } catch (e) {
    throw new ApiError("NetworkError", "서버에 연결하지 못했습니다");
  }

  // 오류는 errors[0].errorType 으로 구분
  if (json.errors && json.errors.length > 0) {
    throw new ApiError(json.errors[0].errorType || "UnknownError", json.errors[0].message);
  }
  return json.data;
}

// --- 조회할 필드 목록 (스키마 기준) ---
const PERSONA_FIELDS = "personaId name description tags experienceCount createdAt";
const EXPERIENCE_FIELDS =
  "experienceId personaId title content startDate endDate tags likeCount viewCount createdAt";
const QUESTION_FIELDS =
  "questionId nickname personaId content status answer createdAt answeredAt";

// --- 응답 정리: null 항목 제거, 비어 있을 수 있는 값에 기본값 채우기 ---
function normalizePersona(p) {
  return p && { ...p, tags: p.tags || [], experienceCount: p.experienceCount ?? 0 };
}
function normalizeExperience(e) {
  return e && { ...e, tags: e.tags || [] };
}
const compact = (list) => (list || []).filter(Boolean);

// --- 화면에서 쓰는 API ---
const api = {
  // S01, S03, S06: 페르소나 전체
  async listPersonas() {
    const data = await gql(`query { listPersonas { ${PERSONA_FIELDS} } }`);
    return compact(data.listPersonas).map(normalizePersona);
  },

  // S04: 페르소나 1개 (없으면 null)
  async getPersona(personaId) {
    const data = await gql(
      `query ($personaId: ID!) { getPersona(personaId: $personaId) { ${PERSONA_FIELDS} } }`,
      { personaId }
    );
    return normalizePersona(data.getPersona);
  },

  // S04: 경험 기록 1페이지 (limit 기본 5, 최대 10) -> { items, nextToken }
  async listExperiencesByPersona(personaId, limit, nextToken) {
    const data = await gql(
      `query ($personaId: ID!, $limit: Int, $nextToken: String) {
         listExperiencesByPersona(personaId: $personaId, limit: $limit, nextToken: $nextToken) {
           items { ${EXPERIENCE_FIELDS} }
           nextToken
         }
       }`,
      { personaId, limit, nextToken }
    );
    const page = data.listExperiencesByPersona || {};
    return { items: compact(page.items).map(normalizeExperience), nextToken: page.nextToken || null };
  },

  // S04: nextToken이 null이 될 때까지 반복해서 전부 받기 (한 번에 최대 10개씩)
  async listAllExperiencesByPersona(personaId) {
    const all = [];
    let nextToken = null;
    let guard = 0; // 무한 반복 방지
    do {
      const page = await api.listExperiencesByPersona(personaId, 10, nextToken);
      all.push(...page.items);
      nextToken = page.nextToken;
    } while (nextToken && ++guard < 100);
    return all;
  },

  // S01: 최근 경험 기록 (서버가 최신순으로 정렬해서 반환)
  async listRecentExperiences(limit = 3) {
    const data = await gql(
      `query ($limit: Int) { listRecentExperiences(limit: $limit) { ${EXPERIENCE_FIELDS} } }`,
      { limit }
    );
    return compact(data.listRecentExperiences).map(normalizeExperience);
  },

  // S05: 조회수 +1 하고 Experience 전체를 돌려받음 (없으면 NotFound 오류)
  async increaseViewCount(experienceId) {
    const data = await gql(
      `mutation ($experienceId: ID!) { increaseViewCount(experienceId: $experienceId) { ${EXPERIENCE_FIELDS} } }`,
      { experienceId }
    );
    return normalizeExperience(data.increaseViewCount);
  },

  // S05: 이 브라우저(visitorId)가 이미 공감했는지 -> true/false
  async hasLiked(experienceId) {
    const data = await gql(
      `query ($experienceId: ID!, $visitorId: ID!) { hasLiked(experienceId: $experienceId, visitorId: $visitorId) }`,
      { experienceId, visitorId: getVisitorId() }
    );
    return data.hasLiked === true;
  },

  // S05: 공감하기 (이미 공감했으면 AlreadyLiked, 없는 기록이면 NotFound 오류)
  async likeExperience(experienceId) {
    const data = await gql(
      `mutation ($experienceId: ID!, $visitorId: ID!) { likeExperience(experienceId: $experienceId, visitorId: $visitorId) { ${EXPERIENCE_FIELDS} } }`,
      { experienceId, visitorId: getVisitorId() }
    );
    return normalizeExperience(data.likeExperience);
  },

  // S06: 답변완료 질문 1페이지 (limit 기본 10, 최대 50, personaId 없으면 전체) -> { items, nextToken }
  async listAnsweredQuestions(personaId, limit, nextToken) {
    const data = await gql(
      `query ($personaId: ID, $limit: Int, $nextToken: String) {
         listAnsweredQuestions(personaId: $personaId, limit: $limit, nextToken: $nextToken) {
           items { ${QUESTION_FIELDS} }
           nextToken
         }
       }`,
      { personaId: personaId || null, limit, nextToken }
    );
    const page = data.listAnsweredQuestions || {};
    return { items: compact(page.items), nextToken: page.nextToken || null };
  },

  // S06: 질문 등록 (규칙 위반이면 ValidationError 오류)
  async createQuestion({ nickname, personaId, content }) {
    const data = await gql(
      `mutation ($input: CreateQuestionInput!) { createQuestion(input: $input) { ${QUESTION_FIELDS} } }`,
      { input: { nickname, personaId, content } }
    );
    return data.createQuestion;
  },
};
