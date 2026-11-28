// ===== 렌더링 로직 (api.js로 받아온 데이터를 화면에 그린다) =====
// 데이터 필드명은 docs/schema.graphql 기준이다 (personaId, experienceId, likeCount 등).

// --- 공통 도우미 ---

// 주소의 쿼리스트링 값 읽기 (예: persona.html?id=p1 -> getParam("id") === "p1")
function getParam(key) {
  return new URLSearchParams(location.search).get(key);
}

// 서버에서 받은 글자를 innerHTML에 넣기 전에 반드시 거치는 함수 (방문자가 쓴 글 대비)
function esc(value) {
  return String(value ?? "").replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]
  );
}

// 날짜 문자열(ISO)을 "YYYY-MM-DD"로 바꾸기 (브라우저 시간대 기준)
function formatDate(iso) {
  const d = new Date(iso);
  if (isNaN(d)) return "";
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

// 태그 배열 -> <span class="tag"> 묶음 HTML
function tagsHtml(tags) {
  return tags.map((t) => `<span class="tag">${esc(t)}</span>`).join("");
}

// 최신순 비교 함수 (createdAt이 큰 것이 먼저)
function byLatest(a, b) {
  return Date.parse(b.createdAt) - Date.parse(a.createdAt);
}

// 목록에서 태그를 중복 없이 모으기 (가나다순)
function collectTags(list) {
  return [...new Set(list.flatMap((item) => item.tags))].sort((a, b) => a.localeCompare(b, "ko"));
}

// 선택한 태그 중 하나라도 가진 항목만 남기기 (선택이 없으면 전체)
function filterByTags(list, selectedTags) {
  if (selectedTags.length === 0) return list;
  return list.filter((item) => item.tags.some((t) => selectedTags.includes(t)));
}

// 페르소나 배열 -> { personaId: 이름 } 표 (카드에 페르소나 이름을 보여줄 때 사용)
function personaNameMap(personaList) {
  return Object.fromEntries(personaList.map((p) => [p.personaId, p.name]));
}

// --- 로딩/오류 표시 ---

// 오류 유형별 안내 문구 (errorType은 api.js의 ApiError에 들어 있음)
const ERROR_MESSAGES = {
  AlreadyLiked: "이미 공감한 기록입니다",
  NotFound: "존재하지 않는 경험 기록입니다",
  ValidationError: "입력 내용을 확인해주세요 (닉네임 2~20자, 내용 10~500자, 공백만 입력 불가)",
  NetworkError: "서버에 연결하지 못했습니다. 잠시 후 다시 시도해주세요",
  ConfigError: "js/config.js에 API_KEY를 입력해주세요",
};
const DEFAULT_ERROR_MESSAGE = "요청을 처리하지 못했습니다. 잠시 후 다시 시도해주세요";

function errorMessage(err) {
  return ERROR_MESSAGES[err && err.errorType] || DEFAULT_ERROR_MESSAGE;
}

const LOADING_HTML = '<p class="empty">불러오는 중...</p>';

function showError(el, err) {
  console.error(err);
  el.innerHTML = `<p class="empty">${esc(errorMessage(err))}</p>`;
}

// --- 태그 필터 (드롭다운 다중선택, S03/S04에서 재사용) ---
// containerId: 필터를 넣을 요소 id
// allTags: 선택지로 보여줄 태그 배열
// onChange: 선택이 바뀔 때마다 호출, 선택된 태그 배열을 넘겨줌
function setupTagFilter(containerId, allTags, onChange) {
  const box = document.getElementById(containerId);
  const selected = new Set(); // 현재 선택된 태그

  box.classList.add("tag-filter");
  box.innerHTML = `
    <button type="button" class="btn tag-filter-toggle" aria-expanded="false"></button>
    <span class="tag-filter-chips"></span>
    <ul class="tag-filter-list block" hidden>
      ${
        allTags.length
          ? allTags.map((t) => `<li><label><input type="checkbox" value="${esc(t)}"> ${esc(t)}</label></li>`).join("")
          : '<li class="meta">등록된 태그가 없습니다</li>'
      }
    </ul>`;

  const toggleBtn = box.querySelector(".tag-filter-toggle");
  const chips = box.querySelector(".tag-filter-chips");
  const list = box.querySelector(".tag-filter-list");

  // 태그 리스트 펼치기/접기
  function setOpen(open) {
    list.hidden = !open;
    toggleBtn.setAttribute("aria-expanded", open);
  }

  // 선택 상태를 화면(버튼 글자, 체크박스, 선택된 태그 칩)에 반영하고 onChange 호출
  function update() {
    toggleBtn.textContent = selected.size ? `태그 (${selected.size}) ▾` : "태그 ▾";
    list.querySelectorAll("input").forEach((cb) => (cb.checked = selected.has(cb.value)));
    // 선택된 태그는 칩으로 표시, 칩의 x를 누르면 그 태그만 선택 취소
    chips.innerHTML = [...selected]
      .map((t) => `<button type="button" class="tag tag-chip" data-tag="${esc(t)}">${esc(t)} ✕</button>`)
      .join("");
    onChange([...selected]);
  }

  toggleBtn.onclick = () => setOpen(list.hidden);

  // 체크박스로 선택/선택 취소 (여러 개 선택 가능)
  list.onchange = (ev) => {
    const cb = ev.target;
    if (cb.checked) selected.add(cb.value);
    else selected.delete(cb.value);
    update();
  };

  // 칩 x 클릭: 해당 태그 선택 취소
  chips.onclick = (ev) => {
    ev.stopPropagation(); // 칩이 다시 그려져도 리스트가 닫히지 않도록
    const chip = ev.target.closest(".tag-chip");
    if (!chip) return;
    selected.delete(chip.dataset.tag);
    update();
  };

  // 필터 바깥을 클릭하면 리스트 닫기
  document.addEventListener("click", (ev) => {
    if (!box.contains(ev.target)) setOpen(false);
  });

  update(); // 처음 한 번 그리기
}

// --- 공통 헤더/푸터 (모든 페이지에서 자동 삽입) ---
function renderLayout() {
  const links = [
    ["index.html", "Home"],
    ["about.html", "소개"],
    ["personas.html", "페르소나"],
    ["questions.html", "질문함"],
  ];
  document.getElementById("site-header").innerHTML = `
    <div class="container">
      <a class="site-logo" href="index.html">${esc(profile.name)}의 자기소개</a>
      <nav class="site-nav">
        ${links.map(([href, label]) => `<a href="${href}">${label}</a>`).join("")}
      </nav>
    </div>`;
}

// --- 카드 HTML 만들기 (여러 페이지에서 재사용) ---

// 페르소나 카드: 이름, 한 줄 설명, 기록 수, 태그
function personaCardHtml(p) {
  return `
    <a class="block" href="persona.html?id=${encodeURIComponent(p.personaId)}">
      <h3>${esc(p.name)}</h3>
      <p>${esc(p.description)}</p>
      <p class="meta">경험 기록 ${p.experienceCount}개</p>
      ${tagsHtml(p.tags)}
    </a>`;
}

// 경험 기록 카드: 제목, 페르소나, 태그, 공감/조회수
// personaName: 카드에 보여줄 페르소나 이름 (모르면 빈 문자열)
function experienceCardHtml(e, personaName = "") {
  return `
    <a class="block" href="experience.html?id=${encodeURIComponent(e.experienceId)}">
      <h3>${esc(e.title)}</h3>
      <p class="meta">${esc(personaName)} / ${formatDate(e.createdAt)}</p>
      ${tagsHtml(e.tags)}
      <p class="meta">공감 ${e.likeCount} / 조회 ${e.viewCount}</p>
    </a>`;
}

// --- 화면별 렌더링 ---

// S01 Home: listPersonas + listRecentExperiences(3)
async function renderHome() {
  document.getElementById("home-intro").textContent = profile.intro;
  document.getElementById("home-image").src = profile.image;

  const personaBox = document.getElementById("home-personas");
  const recentBox = document.getElementById("home-recent");
  personaBox.innerHTML = LOADING_HTML;
  recentBox.innerHTML = LOADING_HTML;

  try {
    const [personas, recent] = await Promise.all([api.listPersonas(), api.listRecentExperiences(3)]);
    const nameOf = personaNameMap(personas);
    personaBox.innerHTML =
      personas.map(personaCardHtml).join("") || '<p class="empty">아직 등록된 페르소나가 없습니다</p>';
    recentBox.innerHTML =
      recent.map((e) => experienceCardHtml(e, nameOf[e.personaId])).join("") ||
      '<p class="empty">아직 등록된 경험 기록이 없습니다</p>';
  } catch (err) {
    showError(personaBox, err);
    recentBox.innerHTML = "";
  }
}

// S02 소개 (API 없이 data.js의 profile 사용)
function renderAbout() {
  document.getElementById("about-image").src = profile.image;
  document.getElementById("about-name").textContent = profile.name;
  document.getElementById("about-affiliation").textContent = profile.affiliation;
  document.getElementById("about-intro").textContent = profile.intro;
  document.getElementById("about-likes").innerHTML = tagsHtml(profile.likes);
  document.getElementById("about-dislikes").innerHTML = tagsHtml(profile.dislikes);
}

// S03 페르소나 목록: listPersonas (태그 필터: 다중선택, 선택한 태그 중 하나라도 있으면 표시)
async function renderPersonaList() {
  const listBox = document.getElementById("persona-list");
  listBox.innerHTML = LOADING_HTML;

  let personas;
  try {
    personas = await api.listPersonas();
  } catch (err) {
    showError(listBox, err);
    return;
  }

  setupTagFilter("tag-filter", collectTags(personas), (selectedTags) => {
    const shown = filterByTags(personas, selectedTags);
    listBox.innerHTML =
      shown.map(personaCardHtml).join("") || '<p class="empty">선택한 태그의 페르소나가 없습니다</p>';
  });
}

// S04 페르소나 상세: getPersona + listExperiencesByPersona(nextToken으로 전부 받기)
// 정렬/페이지 나누기는 모두 프론트에서 처리한다.
//   정렬: 최신순 / 공감순(동률이면 최신순)
//   처음에는 5개만 보여주고, "더보기"를 누르면 10개씩 페이지로 나눠서 보여준다
const FIRST_COUNT = 5; // 처음 보여줄 개수
const PAGE_SIZE = 10;  // 더보기 이후 한 페이지 개수

// 정렬 (원본은 건드리지 않음)
function sortExperiences(list, sortBy) {
  const sorted = [...list].sort(byLatest);
  if (sortBy === "likes") {
    // 공감 많은 순, 동률이면 최신순
    sorted.sort((a, b) => b.likeCount - a.likeCount || byLatest(a, b));
  }
  return sorted;
}

async function renderPersonaDetail() {
  const detailBox = document.getElementById("persona-detail");
  const listBox = document.getElementById("experience-list");
  detailBox.innerHTML = LOADING_HTML;

  // 페르소나 정보
  let persona;
  try {
    persona = await api.getPersona(getParam("id"));
  } catch (err) {
    showError(detailBox, err);
    return;
  }
  if (!persona) {
    detailBox.innerHTML = '<p class="empty">존재하지 않는 페르소나입니다</p>';
    return;
  }

  detailBox.innerHTML = `
    <h1>${esc(persona.name)}</h1>
    <div class="persona-desc">
      <p>${esc(persona.description)}</p>
    </div>
    <p class="meta">생성일 ${formatDate(persona.createdAt)}</p>
    <div class="persona-tags">
      ${persona.tags.map((t) => `<span class="btn">#${esc(t)}</span>`).join("")}
    </div>`;

  // 이 페르소나의 경험 기록 전체
  listBox.innerHTML = LOADING_HTML;
  let myExperiences;
  try {
    myExperiences = await api.listAllExperiencesByPersona(persona.personaId);
  } catch (err) {
    showError(listBox, err);
    return;
  }

  // 목록 상태 (바뀔 때마다 drawList()로 다시 그림)
  let sortBy = "latest";  // "latest" 최신순 / "likes" 공감순
  let expanded = false;   // false: 처음 5개만 / true: 10개씩 페이지로 보기
  let page = 1;           // expanded일 때 현재 페이지
  let selectedTags = [];  // 태그 필터에서 선택한 태그

  const moreBtn = document.getElementById("more-btn");
  const pager = document.getElementById("pager");

  // 처음 5개 상태로 되돌리기 (정렬/필터가 바뀔 때 사용)
  function resetPaging() {
    expanded = false;
    page = 1;
  }

  function drawList() {
    // 태그 필터 -> 정렬
    const list = sortExperiences(filterByTags(myExperiences, selectedTags), sortBy);

    // 보여줄 구간 정하기
    let shown;
    let pageCount = 1;
    if (!expanded) {
      shown = list.slice(0, FIRST_COUNT);
    } else {
      pageCount = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
      page = Math.min(page, pageCount);
      shown = list.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
    }

    let emptyMsg = "아직 등록된 경험 기록이 없습니다";
    if (myExperiences.length > 0) emptyMsg = "선택한 태그의 경험 기록이 없습니다";
    listBox.innerHTML =
      shown.map((e) => experienceCardHtml(e, persona.name)).join("") || `<p class="empty">${emptyMsg}</p>`;

    // 정렬 버튼 (현재 선택 강조)
    document.getElementById("sort-buttons").innerHTML = `
      <button class="btn" data-sort="latest" ${sortBy === "latest" ? 'aria-pressed="true"' : ""}>최신순</button>
      <button class="btn" data-sort="likes" ${sortBy === "likes" ? 'aria-pressed="true"' : ""}>공감순</button>`;
    document.querySelectorAll("#sort-buttons button").forEach((btn) => {
      btn.onclick = () => {
        sortBy = btn.dataset.sort;
        resetPaging(); // 정렬 바꾸면 처음 5개부터
        drawList();
      };
    });

    // 더보기 버튼 (처음 5개 상태이고 더 있을 때만 표시)
    moreBtn.hidden = expanded || list.length <= FIRST_COUNT;
    moreBtn.onclick = () => {
      expanded = true;
      page = 1;
      drawList();
    };

    // 페이지 버튼 (더보기 이후, 페이지가 2개 이상일 때만 표시)
    if (expanded && pageCount > 1) {
      let html = `<button class="btn" data-page="${page - 1}" ${page === 1 ? "disabled" : ""}>이전</button>`;
      for (let i = 1; i <= pageCount; i++) {
        html += `<button class="btn" data-page="${i}" ${i === page ? 'aria-pressed="true"' : ""}>${i}</button>`;
      }
      html += `<button class="btn" data-page="${page + 1}" ${page === pageCount ? "disabled" : ""}>다음</button>`;
      pager.innerHTML = html;
      pager.hidden = false;
    } else {
      pager.innerHTML = "";
      pager.hidden = true;
    }
    pager.onclick = (ev) => {
      const btn = ev.target.closest("button[data-page]");
      if (!btn || btn.disabled) return;
      page = Number(btn.dataset.page);
      drawList();
    };
  }

  // 태그 필터: 선택이 바뀌면 처음 5개부터 다시 그림 (처음 호출 때 drawList()도 같이 실행됨)
  setupTagFilter("experience-tag-filter", collectTags(myExperiences), (tags) => {
    selectedTags = tags;
    resetPaging();
    drawList();
  });
}

// S05 경험 기록의 content를 세로 타임라인으로 그린다
// content에 "상황: ..." / "과정: ..." / "결과: ..." 줄이 있으면 단계별로 나누고,
// 마지막 단계는 CSS(:last-child)에서 포인트 색으로 강조한다.
// 이 라벨이 하나도 없으면 content 전체를 일반 본문으로 보여준다.
function timelineHtml(content) {
  const steps = [];  // { label, text }
  const plain = [];  // 첫 라벨 앞에 있거나 라벨이 없는 줄
  (content || "").split(/\r?\n/).forEach((line) => {
    const m = line.match(/^\s*(상황|과정|결과)\s*[:：]\s*(.*)$/);
    if (m) steps.push({ label: m[1], text: m[2] });
    else if (line.trim() !== "") {
      if (steps.length > 0) steps[steps.length - 1].text += "\n" + line; // 앞 단계의 이어지는 줄
      else plain.push(line);
    }
  });

  const intro = plain.length ? `<section class="block"><p class="pre-line">${esc(plain.join("\n"))}</p></section>` : "";
  const items = steps
    .filter((s) => s.text.trim() !== "")
    .map(
      (s) => `
        <li class="timeline-item">
          <span class="timeline-label">${esc(s.label)}</span>
          <p class="timeline-text pre-line">${esc(s.text)}</p>
        </li>`
    )
    .join("");
  return intro + (items ? `<ol class="timeline block">${items}</ol>` : "");
}

// S05 경험기록 상세: increaseViewCount 결과로 표시 + hasLiked/likeExperience
async function renderExperienceDetail() {
  const box = document.getElementById("experience-detail");
  // 없는 기록이면 안내 문구를 보여주고 2초 뒤 페르소나 목록으로 이동
  function showNotFound() {
    box.innerHTML = '<p class="empty">존재하지 않거나 삭제된 기록입니다</p>';
    setTimeout(() => (location.href = "personas.html"), 2000);
  }

  const experienceId = getParam("id");
  if (!experienceId) {
    showNotFound();
    return;
  }
  box.innerHTML = LOADING_HTML;

  // 조회수 +1 하고 Experience 전체를 받아서 상세로 표시 (없는 ID면 NotFound 오류)
  let e;
  try {
    e = await api.increaseViewCount(experienceId);
  } catch (err) {
    if (err.errorType === "NotFound") showNotFound();
    else showError(box, err);
    return;
  }
  if (!e) {
    showNotFound();
    return;
  }

  // 페르소나 이름과 공감 여부 (둘 다 실패해도 상세는 보여줌)
  const [persona, likedBefore] = await Promise.all([
    api.getPersona(e.personaId).catch(() => null),
    api.hasLiked(e.experienceId).catch(() => false),
  ]);
  let liked = likedBefore; // 이 브라우저(visitorId)가 이미 공감했는지
  let justLiked = false;   // 이번에 방금 공감 성공했는지 (버튼 문구 구분용)
  let message = "";        // 공감 버튼 아래 안내 문구

  function draw() {
    const period = `${e.startDate} ~ ${e.endDate || "진행 중"}`;
    box.innerHTML = `
      <!-- 섹션: 제목 ~ 경험 기간 -->
      <section class="page-section">
        <h1>${esc(e.title)}</h1>
        <p class="meta">
          <a href="persona.html?id=${encodeURIComponent(e.personaId)}">${esc(persona ? persona.name : "")}</a>
          / 생성일 ${formatDate(e.createdAt)} / 경험 기간 ${esc(period)}
        </p>
      </section>
      <div style="margin-top:16px">${tagsHtml(e.tags)}</div>

      ${timelineHtml(e.content)}

      <p class="meta" style="margin-top:16px">공감 ${e.likeCount} / 조회 ${e.viewCount}</p>
      <!-- 공감 성공: "공감함" / 이미 공감(AlreadyLiked, hasLiked true): "이미 공감한 기록입니다" (둘 다 비활성화) -->
      <button id="like-btn" class="btn" ${liked ? "disabled" : ""}>
        ${liked ? (justLiked ? "공감함" : ERROR_MESSAGES.AlreadyLiked) : "공감하기"}
      </button>
      <p class="meta" style="margin-top:8px">${esc(message)}</p>`;

    if (!liked) document.getElementById("like-btn").onclick = onLike;
  }

  async function onLike() {
    document.getElementById("like-btn").disabled = true; // 중복 클릭 방지
    message = "";
    try {
      const updated = await api.likeExperience(e.experienceId); // 갱신된 Experience 반환
      if (updated) e = updated;
      liked = true;
      justLiked = true; // 방금 공감 성공 -> "공감함"
    } catch (err) {
      if (err.errorType === "AlreadyLiked") liked = true; // "이미 공감한 기록입니다"
      else if (err.errorType === "NotFound") return showNotFound(); // 그 사이 삭제된 기록
      else message = errorMessage(err);
    }
    draw();
  }

  draw();
}

// S06 질문함: listAnsweredQuestions(페르소나 필터, nextToken 더보기) + createQuestion
async function renderQuestions() {
  const personaSelect = document.getElementById("q-persona");
  const filterSelect = document.getElementById("q-filter");
  const listBox = document.getElementById("q-list");
  const moreBtn = document.getElementById("q-more-btn");
  const msg = document.getElementById("q-message");
  listBox.innerHTML = LOADING_HTML;

  // 페르소나 선택지 (작성 폼 + 목록 필터에서 같이 사용)
  let personas;
  try {
    personas = await api.listPersonas();
  } catch (err) {
    showError(listBox, err);
    msg.textContent = errorMessage(err);
    return;
  }
  const nameOf = personaNameMap(personas);
  const options = personas.map((p) => `<option value="${esc(p.personaId)}">${esc(p.name)}</option>`).join("");
  personaSelect.innerHTML = '<option value="">선택하세요</option>' + options;
  filterSelect.innerHTML = '<option value="">전체</option>' + options;

  // 답변완료 질문 목록 (서버가 최신순으로 반환)
  let nextToken = null; // 다음 페이지 토큰 (null이면 마지막)
  let requestNo = 0;    // 필터를 빠르게 바꿨을 때 늦게 온 이전 응답을 버리기 위한 번호

  function questionHtml(q) {
    return `
      <section class="block" style="margin-bottom:16px">
        <p class="meta">${esc(q.nickname)} / ${esc(nameOf[q.personaId] || "")} / ${formatDate(q.createdAt)}</p>
        <p class="pre-line"><b>Q.</b> ${esc(q.content)}</p>
        <p class="pre-line"><b>A.</b> ${esc(q.answer)}</p>
      </section>`;
  }

  // append=false: 처음부터 다시 불러오기 / append=true: 다음 페이지를 아래에 덧붙이기
  async function loadQuestions(append) {
    const myNo = ++requestNo;
    moreBtn.disabled = true;
    if (!append) {
      listBox.innerHTML = LOADING_HTML;
      nextToken = null;
      moreBtn.hidden = true;
    }
    try {
      const page = await api.listAnsweredQuestions(filterSelect.value, undefined, append ? nextToken : null);
      if (myNo !== requestNo) return;
      nextToken = page.nextToken;
      const html = page.items.map(questionHtml).join("");
      if (append) listBox.insertAdjacentHTML("beforeend", html);
      else listBox.innerHTML = html || (nextToken ? "" : '<p class="empty">아직 답변완료된 질문이 없습니다</p>');
      moreBtn.hidden = !nextToken;
    } catch (err) {
      if (myNo !== requestNo) return;
      if (append) msg.textContent = errorMessage(err);
      else showError(listBox, err);
    } finally {
      if (myNo === requestNo) moreBtn.disabled = false;
    }
  }

  filterSelect.onchange = () => loadQuestions(false);
  moreBtn.onclick = () => loadQuestions(true);
  loadQuestions(false);

  // 작성 폼 제출: 화면에서 먼저 검사하고, 통과하면 createQuestion 호출
  document.getElementById("q-form").onsubmit = async (ev) => {
    ev.preventDefault();
    const form = ev.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    const nickname = document.getElementById("q-nickname").value.trim();
    const personaId = personaSelect.value;
    const content = document.getElementById("q-content").value.trim(); // 공백만 입력 방지

    if (nickname.length < 2 || nickname.length > 20) return (msg.textContent = "닉네임은 2~20자로 입력해주세요");
    if (!personaId) return (msg.textContent = "페르소나를 선택해주세요");
    if (content.length < 10 || content.length > 500) return (msg.textContent = "내용은 10~500자로 입력해주세요");

    submitBtn.disabled = true; // 중복 등록 방지
    msg.textContent = "등록 중...";
    try {
      await api.createQuestion({ nickname, personaId, content });
      msg.textContent = "질문이 등록되었습니다. 답변이 완료되면 아래 목록에 공개됩니다";
      form.reset();
    } catch (err) {
      console.error(err);
      msg.textContent = errorMessage(err); // ValidationError 등
    } finally {
      submitBtn.disabled = false;
    }
  };
}

renderLayout();
