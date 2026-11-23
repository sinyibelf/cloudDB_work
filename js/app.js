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

// 목록에서 태그를 중복 없이 모으기 (가나다순)
function collectTags(list) {
  return [...new Set(list.flatMap((item) => item.tags))].sort((a, b) => a.localeCompare(b, "ko"));
}

// 선택한 태그 중 하나라도 가진 항목만 남기기 (선택이 없으면 전체)
function filterByTags(list, selectedTags) {
  if (selectedTags.length === 0) return list;
  return list.filter((item) => item.tags.some((t) => selectedTags.includes(t)));
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
          ? allTags.map((t) => `<li><label><input type="checkbox" value="${t}"> ${t}</label></li>`).join("")
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
      .map((t) => `<button type="button" class="tag tag-chip" data-tag="${t}">${t} ✕</button>`)
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

// S03 페르소나 목록 (태그 필터: 다중선택, 선택한 태그 중 하나라도 있으면 표시)
function renderPersonaList() {
  setupTagFilter("tag-filter", collectTags(personas), (selectedTags) => {
    const shown = filterByTags(personas, selectedTags);
    document.getElementById("persona-list").innerHTML =
      shown.map(personaCardHtml).join("") || '<p class="empty">선택한 태그의 페르소나가 없습니다</p>';
  });
}

// S04 페르소나 상세 (정렬: 최신순/공감순, 처음 5개 -> 더보기 시 10개, 태그 필터)
function renderPersonaDetail() {
  const persona = findPersona(getParam("id"));
  if (!persona) {
    document.getElementById("persona-detail").innerHTML = '<p class="empty">존재하지 않는 페르소나입니다</p>';
    return;
  }

  document.getElementById("persona-detail").innerHTML = `
    <h1>${persona.name}</h1>
    <div class="persona-desc">
      <p>${persona.description}</p>
    </div>
    <p class="meta">생성일 ${persona.createdAt}</p>
    <div class="persona-tags">
      ${persona.tags.map((t) => `<span class="btn">#${t}</span>`).join("")}
    </div>`;

  // 이 페르소나의 경험 기록 전체
  const myExperiences = experiences.filter((e) => e.personaId === persona.id);

  // 목록 상태 (바뀔 때마다 drawList()로 다시 그림)
  let sortBy = "latest"; // "latest" 최신순 / "likes" 공감순
  let limit = 5;         // 처음 5개, 더보기 시 10개
  let selectedTags = []; // 태그 필터에서 선택한 태그

  function drawList() {
    // 태그 필터 -> 정렬 (공감순 동률이면 최신순)
    const list = sortByLatest(filterByTags(myExperiences, selectedTags));
    if (sortBy === "likes") list.sort((a, b) => b.likes - a.likes); // sort는 안정 정렬이라 동률은 최신순 유지

    let emptyMsg = "아직 등록된 경험 기록이 없습니다";
    if (myExperiences.length > 0) emptyMsg = "선택한 태그의 경험 기록이 없습니다";
    document.getElementById("experience-list").innerHTML =
      list.slice(0, limit).map(experienceCardHtml).join("") || `<p class="empty">${emptyMsg}</p>`;

    // 정렬 버튼 (현재 선택 강조)
    document.getElementById("sort-buttons").innerHTML = `
      <button class="btn" data-sort="latest" ${sortBy === "latest" ? 'aria-pressed="true"' : ""}>최신순</button>
      <button class="btn" data-sort="likes" ${sortBy === "likes" ? 'aria-pressed="true"' : ""}>공감순</button>`;
    document.querySelectorAll("#sort-buttons button").forEach((btn) => {
      btn.onclick = () => {
        sortBy = btn.dataset.sort;
        limit = 5; // 정렬 바꾸면 처음 5개부터
        drawList();
      };
    });

    // 더보기 버튼 (5개만 보이는 상태에서 더 있을 때만 표시)
    const moreBtn = document.getElementById("more-btn");
    moreBtn.hidden = !(limit === 5 && list.length > 5);
    moreBtn.onclick = () => {
      limit = 10;
      drawList();
    };
  }

  // 태그 필터: 선택이 바뀌면 처음 5개부터 다시 그림 (처음 호출 때 drawList()도 같이 실행됨)
  setupTagFilter("experience-tag-filter", collectTags(myExperiences), (tags) => {
    selectedTags = tags;
    limit = 5;
    drawList();
  });
}

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
      <!-- 섹션: 제목 ~ 경험 기간 -->
      <section class="page-section">
        <h1>${e.title}</h1>
        <p class="meta">
          <a href="persona.html?id=${e.personaId}">${persona ? persona.name : ""}</a>
          / 생성일 ${e.createdAt} / 경험 기간 ${e.period}
        </p>
      </section>
      <div style="margin-top:16px">${tagsHtml(e.tags)}</div>

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
