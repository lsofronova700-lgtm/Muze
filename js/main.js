(function () {
  "use strict";

  const ICONS = {
    school: '<path d="M8 52h48M12 52V28m10 24V28m20 24V28m10 24V28M6 26 32 10l26 16z"/><rect x="27" y="36" width="10" height="16"/>',
    tent: '<path d="M32 8 8 54h48z"/><path d="M32 8v46M26 54l6-16 6 16"/><path d="M28 4l4 4 4-4"/>',
    star: '<path d="m32 6 7.6 16.4L57 24.6 44.5 37l3 18L32 46.6 16.5 55l3-18L7 24.6l17.4-2.2z"/>',
    tree: '<path d="M32 6 18 26h8L14 42h12L10 54h44L38 42h12L38 26h8z"/><path d="M32 54v6"/>',
    people: '<circle cx="22" cy="20" r="8"/><circle cx="44" cy="22" r="6"/><path d="M8 54c0-10 6-18 14-18s14 8 14 18M34 54c0-8 4-14 10-14s12 6 12 14"/>',
  };

  const hallById = Object.fromEntries(HALLS.map((h) => [h.id, h]));
  const $ = (s) => document.querySelector(s);

  function esc(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  function icon(name, size) {
    return `<svg class="icon" viewBox="0 0 64 64" width="${size}" height="${size}" aria-hidden="true">${ICONS[name] || ICONS.star}</svg>`;
  }

  function visual(ex, cls) {
    const hall = hallById[ex.hall];
    if (ex.image) {
      return `<div class="${cls}"><img src="${esc(ex.image)}" alt="${esc(ex.title)}" loading="lazy"></div>`;
    }
    return `<div class="${cls} no-photo" style="--hall:${hall.color}">${icon(hall.icon, 56)}</div>`;
  }

  // Статистика
  $("#stats").innerHTML = [
    [HALLS.length, "залов"],
    [EXHIBITS.length, "экспонатов"],
    [PHOTOS.length, "фотографий"],
  ].map(([n, l]) => `<div><dt>${n}</dt><dd>${l}</dd></div>`).join("");

  // Залы
  $("#halls-grid").innerHTML = HALLS.map((h) => {
    const count = EXHIBITS.filter((e) => e.hall === h.id).length;
    return `<button class="hall-card" style="--hall:${h.color}" data-hall="${h.id}">
      <span class="hall-icon">${icon(h.icon, 44)}</span>
      <h3>${esc(h.title)}</h3>
      <p>${esc(h.text)}</p>
      <span class="hall-count">${count} экспонатов →</span>
    </button>`;
  }).join("");

  $("#halls-grid").addEventListener("click", (e) => {
    const card = e.target.closest("[data-hall]");
    if (!card) return;
    setFilter(card.dataset.hall);
    $("#collection").scrollIntoView({ behavior: "smooth" });
  });

  // Коллекция
  let filter = "all";
  const chips = $("#chips");
  chips.innerHTML = [`<button class="chip" data-filter="all">Все залы</button>`]
    .concat(HALLS.map((h) => `<button class="chip" data-filter="${h.id}" style="--hall:${h.color}">${esc(h.title)}</button>`))
    .join("");

  chips.addEventListener("click", (e) => {
    const chip = e.target.closest("[data-filter]");
    if (chip) setFilter(chip.dataset.filter);
  });
  $("#search").addEventListener("input", renderExhibits);

  function setFilter(f) {
    filter = f;
    chips.querySelectorAll(".chip").forEach((c) => c.setAttribute("aria-pressed", c.dataset.filter === f));
    renderExhibits();
  }

  function renderExhibits() {
    const q = $("#search").value.trim().toLowerCase();
    const items = EXHIBITS.map((ex, i) => ({ ex, i })).filter(({ ex }) =>
      (filter === "all" || ex.hall === filter) &&
      (!q || (ex.title + " " + ex.text + " " + ex.period).toLowerCase().includes(q))
    );
    $("#exhibits-grid").innerHTML = items.map(({ ex, i }) => exhibitCard(ex, i)).join("");
    $("#empty").hidden = items.length > 0;
  }

  function exhibitCard(ex, i) {
    const hall = hallById[ex.hall];
    return `<button class="exhibit" data-index="${i}" style="--hall:${hall.color}">
      ${visual(ex, "exhibit-visual")}
      <span class="exhibit-info">
        <span class="exhibit-hall">${esc(hall.title)}</span>
        <span class="exhibit-title">${esc(ex.title)}</span>
        <span class="exhibit-period">${esc(ex.period)}</span>
      </span>
    </button>`;
  }

  document.addEventListener("click", (e) => {
    const card = e.target.closest(".exhibit[data-index]");
    if (card) openExhibit(+card.dataset.index);
  });

  // Модальное окно экспоната
  const modal = $("#modal");
  function openExhibit(i) {
    const ex = EXHIBITS[i];
    const hall = hallById[ex.hall];
    $("#modal-content").innerHTML = `
      ${visual(ex, "modal-visual")}
      <div class="modal-text" style="--hall:${hall.color}">
        <span class="exhibit-hall">${esc(hall.title)}</span>
        <h3 id="modal-title">${esc(ex.title)}</h3>
        <p class="exhibit-period">${esc(ex.period)}</p>
        <p>${esc(ex.text)}</p>
        ${ex.donor ? `<p class="donor">Передал(а) в музей: ${esc(ex.donor)}</p>` : ""}
      </div>`;
    modal.showModal();
  }
  $("#modal-close").addEventListener("click", () => modal.close());
  modal.addEventListener("click", (e) => { if (e.target === modal) modal.close(); });

  // Экскурсия
  let step = 0;
  $("#tour-progress").innerHTML = HALLS.map((h, i) =>
    `<button role="tab" data-step="${i}" style="--hall:${h.color}"><span>${i + 1}</span>${esc(h.title)}</button>`
  ).join("");
  $("#tour-progress").addEventListener("click", (e) => {
    const b = e.target.closest("[data-step]");
    if (b) showStep(+b.dataset.step);
  });
  $("#tour-prev").addEventListener("click", () => showStep(step - 1));
  $("#tour-next").addEventListener("click", () => showStep(step + 1));

  function showStep(n) {
    step = Math.max(0, Math.min(HALLS.length - 1, n));
    const h = HALLS[step];
    const items = EXHIBITS.map((ex, i) => ({ ex, i })).filter(({ ex }) => ex.hall === h.id);
    $("#tour-body").innerHTML = `
      <div class="tour-head" style="--hall:${h.color}">
        <span class="hall-icon">${icon(h.icon, 52)}</span>
        <div>
          <p class="eyebrow">Зал ${step + 1} из ${HALLS.length}</p>
          <h3>${esc(h.title)}</h3>
          <p>${esc(h.text)}</p>
        </div>
      </div>
      <div class="tour-items">${items.map(({ ex, i }) => exhibitCard(ex, i)).join("")}</div>`;
    $("#tour-progress").querySelectorAll("[data-step]").forEach((b) =>
      b.setAttribute("aria-selected", +b.dataset.step === step)
    );
    $("#tour-prev").disabled = step === 0;
    $("#tour-next").disabled = step === HALLS.length - 1;
  }

  // Фотогалерея
  $("#gallery-grid").innerHTML = PHOTOS.map((ph, i) =>
    `<button class="photo" data-photo="${i}">
      <img src="${esc(ph.src)}" alt="${esc(ph.title)}" loading="lazy">
      <span class="photo-caption">${esc(ph.title)}</span>
    </button>`
  ).join("");
  $("#gallery-grid").addEventListener("click", (e) => {
    const b = e.target.closest("[data-photo]");
    if (!b) return;
    const ph = PHOTOS[+b.dataset.photo];
    $("#modal-content").innerHTML = `
      <figure class="lightbox">
        <img src="${esc(ph.src)}" alt="${esc(ph.title)}">
        <figcaption><h3 id="modal-title">${esc(ph.title)}</h3><p>${esc(ph.text)}</p></figcaption>
      </figure>`;
    modal.classList.add("modal-photo");
    modal.showModal();
  });
  modal.addEventListener("close", () => modal.classList.remove("modal-photo"));

  // Летопись
  $("#timeline-list").innerHTML = TIMELINE.map((t) =>
    `<li><span class="when">${esc(t.when)}</span><p>${esc(t.text)}</p></li>`
  ).join("");

  // Меню на телефоне
  const toggle = $(".nav-toggle");
  toggle.addEventListener("click", () => {
    const open = $("#nav").classList.toggle("open");
    toggle.setAttribute("aria-expanded", open);
  });
  $("#nav").addEventListener("click", (e) => {
    if (e.target.tagName === "A") {
      $("#nav").classList.remove("open");
      toggle.setAttribute("aria-expanded", "false");
    }
  });

  $("#year").textContent = new Date().getFullYear();
  setFilter("all");
  showStep(0);
})();
