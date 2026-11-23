// ===== 렌더링 로직 (data.js의 데이터를 화면에 그린다) =====

// --- 공통 도우미 ---

// 주소의 쿼리스트링 값 읽기 (예: persona.html?id=p1 -> getParam("id") === "p1")
function getParam(key) {
  return new URLSearchParams(location.search).get(key);
}

// id로 페르소나 찾기
function findPersona(id) {
  return personas.find((p) => p.id === id);
}

// 태그 배열 -> <span class="tag"> 묶음 HTML
function tagsHtml(tags) {
  return tags.map((t) => `<span class="tag">${t}</span>`).join("");
}

// 페르소나의 경험 기록 수
function countExperiences(personaId) {
  return experiences.filter((e) => e.personaId === personaId).length;
}

// 최신순 정렬 (원본은 건드리지 않음)
function sortByLatest(list) {
  return [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
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
      <a class="site-logo" href="index.html">${profile.name}의 자기소개</a>
      <nav class="site-nav">
        ${links.map(([href, label]) => `<a href="${href}">${label}</a>`).join("")}
      </nav>
    </div>`;
}

// --- 카드 HTML 만들기 (여러 페이지에서 재사용) ---

// 페르소나 카드: 이름, 한 줄 설명, 기록 수, 태그
function personaCardHtml(p) {
  return `
    <a class="block" href="persona.html?id=${p.id}">
      <h3>${p.name}</h3>
      <p>${p.description}</p>
      <p class="meta">경험 기록 ${countExperiences(p.id)}개</p>
      ${tagsHtml(p.tags)}
    </a>`;
}

// 경험 기록 카드: 제목, 페르소나, 태그, 공감/조회수
function experienceCardHtml(e) {
  const persona = findPersona(e.personaId);
  return `
    <a class="block" href="experience.html?id=${e.id}">
      <h3>${e.title}</h3>
      <p class="meta">${persona ? persona.name : ""} / ${e.createdAt}</p>
      ${tagsHtml(e.tags)}
      <p class="meta">공감 ${e.likes} / 조회 ${e.views}</p>
    </a>`;
}

// --- 화면별 렌더링 ---

// S01 Home
function renderHome() {
  document.getElementById("home-intro").textContent = profile.intro;
  document.getElementById("home-image").src = profile.image;
  document.getElementById("home-personas").innerHTML = personas.map(personaCardHtml).join("");
  document.getElementById("home-recent").innerHTML =
    sortByLatest(experiences).slice(0, 3).map(experienceCardHtml).join("");
}

// S02 소개
function renderAbout() {
  document.getElementById("about-image").src = profile.image;
  document.getElementById("about-name").textContent = profile.name;
  document.getElementById("about-affiliation").textContent = profile.affiliation;
  document.getElementById("about-intro").textContent = profile.intro;
  document.getElementById("about-likes").innerHTML = tagsHtml(profile.likes);
  document.getElementById("about-dislikes").innerHTML = tagsHtml(profile.dislikes);
}

// S03 페르소나 목록 (태그 필터)
function renderPersonaList(selectedTag = "전체") {
  // 모든 페르소나의 태그를 중복 없이 모음
  const allTags = ["전체", ...new Set(personas.flatMap((p) => p.tags))];

  document.getElementById("tag-filter").innerHTML = allTags
    .map((t) => `<button class="btn" ${t === selectedTag ? 'aria-pressed="true"' : ""} data-tag="${t}">${t}</button>`)
    .join(" ");

  const shown = selectedTag === "전체" ? personas : personas.filter((p) => p.tags.includes(selectedTag));
  document.getElementById("persona-list").innerHTML =
    shown.map(personaCardHtml).join("") || '<p class="empty">해당 태그의 페르소나가 없습니다</p>';

  // 버튼 클릭 시 해당 태그로 다시 그리기
  document.querySelectorAll("#tag-filter button").forEach((btn) => {
    btn.onclick = () => renderPersonaList(btn.dataset.tag);
  });
}

// S04 페르소나 상세 (정렬: 최신순/공감순, 처음 5개 -> 더보기 시 10개)
function renderPersonaDetail(sortBy = "latest", limit = 5) {
  const persona = findPersona(getParam("id"));
  if (!persona) {
    document.getElementById("persona-detail").innerHTML = '<p class="empty">존재하지 않는 페르소나입니다</p>';
    return;
  }

  document.getElementById("persona-detail").innerHTML = `
    <h1>${persona.name}</h1>
    <p>${persona.description}</p>
    <div>${tagsHtml(persona.tags)}</div>
    <p class="meta">생성일 ${persona.createdAt}</p>`;

  // 이 페르소나의 경험 기록만 정렬 (공감순 동률이면 최신순)
  const list = sortByLatest(experiences.filter((e) => e.personaId === persona.id));
  if (sortBy === "likes") list.sort((a, b) => b.likes - a.likes); // sort는 안정 정렬이라 동률은 최신순 유지

  const shown = list.slice(0, limit);
  document.getElementById("experience-list").innerHTML =
    shown.map(experienceCardHtml).join("") || '<p class="empty">아직 등록된 경험 기록이 없습니다</p>';

  // 정렬 버튼 (현재 선택 강조)
  document.getElementById("sort-buttons").innerHTML = `
    <button class="btn" data-sort="latest" ${sortBy === "latest" ? 'aria-pressed="true"' : ""}>최신순</button>
    <button class="btn" data-sort="likes" ${sortBy === "likes" ? 'aria-pressed="true"' : ""}>공감순</button>`;
  document.querySelectorAll("#sort-buttons button").forEach((btn) => {
    btn.onclick = () => renderPersonaDetail(btn.dataset.sort, 5); // 정렬 바꾸면 처음 5개부터
  });

  // 더보기 버튼 (5개만 보이는 상태에서 더 있을 때만 표시)
  const moreBtn = document.getElementById("more-btn");
  moreBtn.hidden = !(limit === 5 && list.length > 5);
  moreBtn.onclick = () => renderPersonaDetail(sortBy, 10);
}

// S05 경험기록 상세 (공감은 브라우저당 기록 1개에 1회, 다시 누르면 취소: localStorage에 저장)
// S05 상황/과정/결과를 세로 타임라인으로 그린다
// 내용이 비어 있는 단계는 건너뛰고, 마지막 단계는 CSS(:last-child)에서 포인트 색으로 강조
function timelineHtml(e) {
  const steps = [
    { label: "상황", text: e.situation },
    { label: "과정", text: e.attempt },
    { label: "결과", text: e.result },
  ];
  const items = steps
    .filter((s) => s.text && s.text.trim() !== "")
    .map(
      (s) => `
        <li class="timeline-item">
          <span class="timeline-label">${s.label}</span>
          <p class="timeline-text">${s.text}</p>
        </li>`
    )
    .join("");
  // 모든 단계가 비어 있으면 타임라인 자체를 그리지 않음
  return items ? `<ol class="timeline block">${items}</ol>` : "";
}

function renderExperienceDetail() {
  const e = experiences.find((x) => x.id === getParam("id"));
  if (!e) {
    document.getElementById("experience-detail").innerHTML = '<p class="empty">존재하지 않는 경험 기록입니다</p>';
    return;
  }
  const persona = findPersona(e.personaId);
  const likeKey = "liked_" + e.id;

  // 이 단계는 서버가 없으므로 공감 수 = 더미 데이터 값 + (내가 눌렀으면 1)
  function draw() {
    const liked = localStorage.getItem(likeKey) === "1";
    document.getElementById("experience-detail").innerHTML = `
      <h1>${e.title}</h1>
      <p class="meta">
        <a href="persona.html?id=${e.personaId}">${persona ? persona.name : ""}</a>
        / 생성일 ${e.createdAt} / 경험 기간 ${e.period}
      </p>
      <div>${tagsHtml(e.tags)}</div>

      ${timelineHtml(e)}

      <p class="meta" style="margin-top:16px">공감 ${e.likes + (liked ? 1 : 0)} / 조회 ${e.views}</p>
      <button id="like-btn" class="btn" ${liked ? 'aria-pressed="true"' : ""}>
        ${liked ? "공감 취소" : "공감하기"}
      </button>`;
    // 누를 때마다 공감 <-> 취소 전환
    document.getElementById("like-btn").onclick = () => {
      if (liked) localStorage.removeItem(likeKey);
      else localStorage.setItem(likeKey, "1");
      draw();
    };
  }
  draw();
}

// S06 질문함
function renderQuestions() {
  // 페르소나 선택지
  document.getElementById("q-persona").innerHTML =
    '<option value="">선택하세요</option>' +
    personas.map((p) => `<option value="${p.id}">${p.name}</option>`).join("");

  // 답변완료 질문만 최신순으로 공개
  const answered = sortByLatest(questions.filter((q) => q.status === "답변완료"));
  document.getElementById("q-list").innerHTML =
    answered
      .map((q) => {
        const persona = findPersona(q.personaId);
        return `
          <section class="block" style="margin-bottom:16px">
            <p class="meta">${q.nickname} / ${persona ? persona.name : ""} / ${q.createdAt}</p>
            <p><b>Q.</b> ${q.content}</p>
            <p><b>A.</b> ${q.answer}</p>
          </section>`;
      })
      .join("") || '<p class="empty">아직 답변완료된 질문이 없습니다</p>';

  // 작성 폼 제출: 검증만 하고, 저장은 다음 주차(AppSync/DynamoDB)에 구현
  document.getElementById("q-form").onsubmit = (ev) => {
    ev.preventDefault();
    const nickname = document.getElementById("q-nickname").value.trim();
    const personaId = document.getElementById("q-persona").value;
    const content = document.getElementById("q-content").value.trim(); // 공백만 입력 방지
    const msg = document.getElementById("q-message");

    if (nickname.length < 2 || nickname.length > 20) return (msg.textContent = "닉네임은 2~20자로 입력해주세요");
    if (!personaId) return (msg.textContent = "페르소나를 선택해주세요");
    if (content.length < 10 || content.length > 500) return (msg.textContent = "내용은 10~500자로 입력해주세요");

    msg.textContent = "질문이 등록되었습니다 (이번 주는 저장되지 않는 화면 틀입니다)";
    ev.target.reset();
  };
}

renderLayout();
