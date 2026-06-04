const services = {
  "visa-americana": {
    title: "Visa Americana B1/B2",
    badge: "Servicio activo",
    summary: [
      ["Qué es", "Asesoría y gestión para la obtención o renovación de Visa Americana B1/B2."],
      ["Objetivo", "Facilitar el proceso y reducir errores en la solicitud."],
      ["Modalidad", "Presencial / Virtual"],
      ["Duración", "15 a 45 días promedio"]
    ],
    prices: [
      ["Servicio Agencia", "$65"],
      ["Tasa Consular", "$185"],
      ["Total Cliente", "$250"]
    ],
    promos: [
      "6% descuento grupos familiares.",
      "Asesoría gratuita."
    ],
    requirements: [
      "Cédula o Pasaporte vigente",
      "Correo electrónico",
      "Pago tasa consular",
      "Información para formulario DS-160"
    ],
    includes: [
      "Llenado formulario DS-160.",
      "Creación de cuenta consular.",
      "Agendamiento de cita.",
      "Fotografía para visa.",
      "Organización de expediente.",
      "Capacitación para entrevista.",
      "Seguimiento del proceso.",
      "Soporte por WhatsApp."
    ],
    process: [
      ["Captación y asesoría", "10 min"],
      ["Recepción documentos", "1 día"],
      ["Llenado DS-160", "20 min"],
      ["Pago consular", "15 min"],
      ["Agendamiento cita", "15 min"],
      ["Preparación entrevista", "15 min"],
      ["Espera de cita", "Variable"],
      ["Resultado final", "Según Consulado"]
    ],
    deliverables: [
      "DS-160 completado.",
      "Confirmación de cita.",
      "Guía de entrevista.",
      "Fotografía.",
      "Seguimiento del trámite."
    ],
    observations: [
      "La aprobación depende del oficial consular.",
      "Los pagos consulares no son reembolsables.",
      "La agencia no garantiza aprobación."
    ]
  },
  "visa-schengen": {
    title: "Visa Schengen",
    empty: true
  },
  vuelos: {
    title: "Vuelos",
    empty: true
  },
  tours: {
    title: "Tours",
    empty: true
  },
  seguros: {
    title: "Seguros",
    empty: true
  }
};

const sheet = document.querySelector("#serviceSheet");
const pageTitle = document.querySelector("#pageTitle");
const serviceButtons = document.querySelectorAll(".service-button");
const editButton = document.querySelector("#editButton");
const saveButton = document.querySelector("#saveButton");
const themeToggle = document.querySelector("#themeToggle");
const printButton = document.querySelector("#printButton");
const screenLogoSrc = "logo-blanco-transparente.png";
const printLogoSrc = "logo-impresion-color.png";
let activeService = "visa-americana";
let editMode = false;
let draggedSection = null;
let resizingSection = null;
let draggedLine = null;
const dragReadyCards = new WeakSet();
const undoHistory = {};
const maxUndoSteps = 40;

const defaultLayouts = [
  { className: "summary-section", left: 0, top: 0, width: 34, height: 25 },
  { className: "prices-section", left: 36, top: 0, width: 28, height: 22 },
  { className: "requirements-section", left: 66, top: 0, width: 25, height: 22 },
  { className: "includes-section", left: 0, top: 29, width: 28, height: 33 },
  { className: "process-section", left: 30, top: 25, width: 33, height: 43 },
  { className: "notes-section", left: 65, top: 25, width: 28, height: 36 }
];

function serviceStorageKey(key) {
  return `svus-sheet-${key}`;
}

function editableText(text, tag = "span") {
  return `<${tag} class="editable">${text}</${tag}>`;
}

function tableRows(rows, headingA = "Concepto", headingB = "Detalle", extraClass = "") {
  return `
    <table class="${extraClass}">
      <thead>
        <tr><th class="editable">${headingA}</th><th class="editable">${headingB}</th></tr>
      </thead>
      <tbody>
        ${rows.map(([label, value]) => `<tr><td class="editable">${label}</td><td class="editable">${value}</td></tr>`).join("")}
      </tbody>
    </table>
  `;
}

function listItems(items) {
  return `<ul class="list">${items.map((item) => `<li class="editable">${item}</li>`).join("")}</ul>`;
}

function setEditMode(enabled) {
  editMode = enabled;
  document.body.classList.toggle("editing", editMode);
  editButton.setAttribute("aria-pressed", String(editMode));
  editButton.title = editMode ? "Salir de edición" : "Editar textos";
  saveButton.disabled = !editMode;

  sheet.querySelectorAll(".editable").forEach((element) => {
    element.contentEditable = editMode ? "true" : "false";
    element.spellcheck = true;
  });
  refreshLineEditingTools();
  setupDraggableSections();
}

function saveCurrentSheet() {
  setEditMode(false);
  persistCurrentSheet();
}

function saveSheetLayout() {
  if (!editMode) {
    persistCurrentSheet();
  }
}

function currentSnapshot() {
  return cleanSheetMarkup();
}

function pushUndoState() {
  const snapshot = currentSnapshot();
  undoHistory[activeService] ||= [];
  const history = undoHistory[activeService];

  if (history[history.length - 1] !== snapshot) {
    history.push(snapshot);
  }

  if (history.length > maxUndoSteps) {
    history.shift();
  }
}

function undoLastAction() {
  const history = undoHistory[activeService] || [];

  if (!history.length) {
    return false;
  }

  sheet.innerHTML = history.pop();
  ensureServiceStatusButton();
  arrangeExistingSections();
  setEditMode(editMode);
  setupDraggableSections();
  persistCurrentSheet();
  return true;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function pxToPercent(value, base) {
  const number = Number.parseFloat(value);
  return Number.isFinite(number) ? number / base * 100 : null;
}

function applyCardLayout(card, layout) {
  card.style.left = `${layout.left}%`;
  card.style.top = `${layout.top}%`;
  card.style.width = `${layout.width}%`;
  card.style.height = `${layout.height}%`;
}

function normalizeCanvasLayout(canvas) {
  const baseWidth = 1060;
  const baseHeight = 640;
  const cards = Array.from(canvas.querySelectorAll(".section-card"));

  cards.forEach((card, index) => {
    const defaultLayout = defaultLayouts.find((item) => card.classList.contains(item.className)) || defaultLayouts[index % defaultLayouts.length];
    const hasResponsiveUnits = [card.style.left, card.style.top, card.style.width, card.style.height].every((value) => value.includes("%"));
    card.style.minHeight = "";

    if (!hasResponsiveUnits) {
      const convertedLayout = {
        left: pxToPercent(card.style.left, baseWidth) ?? defaultLayout.left,
        top: pxToPercent(card.style.top, baseHeight) ?? defaultLayout.top,
        width: pxToPercent(card.style.width, baseWidth) ?? defaultLayout.width,
        height: pxToPercent(card.style.height, baseHeight) ?? defaultLayout.height
      };
      applyCardLayout(card, convertedLayout);
    }

    const left = Number.parseFloat(card.style.left) || defaultLayout.left;
    const top = Number.parseFloat(card.style.top) || defaultLayout.top;
    const width = Number.parseFloat(card.style.width) || defaultLayout.width;
    const height = Number.parseFloat(card.style.height) || defaultLayout.height;

    applyCardLayout(card, {
      left: clamp(left, 0, 88),
      top: clamp(top, 0, 88),
      width: clamp(width, 12, Math.max(12, 100 - clamp(left, 0, 88))),
      height: clamp(height, 12, Math.max(12, 100 - clamp(top, 0, 88)))
    });
  });
}

function setSheetLogoForPrint() {
  sheet.querySelectorAll(".sheet-header img").forEach((image) => {
    image.dataset.screenSrc = image.getAttribute("src") || screenLogoSrc;
    image.setAttribute("src", printLogoSrc);
  });
}

function restoreSheetLogoAfterPrint() {
  sheet.querySelectorAll(".sheet-header img").forEach((image) => {
    image.setAttribute("src", image.dataset.screenSrc || screenLogoSrc);
  });
}

function stripLineEditingControls(root = sheet) {
  root.querySelectorAll(".line-add-button").forEach((button) => button.remove());
  root.querySelectorAll(".line-editable").forEach((element) => {
    element.classList.remove("line-editable", "line-dragging", "line-drop-before", "line-drop-after");
    element.removeAttribute("draggable");
    element.removeAttribute("title");
  });
}

function cleanSheetMarkup() {
  const clone = sheet.cloneNode(true);
  stripLineEditingControls(clone);
  clone.querySelectorAll(".editable").forEach((element) => {
    element.removeAttribute("contenteditable");
    element.removeAttribute("spellcheck");
    element.removeAttribute("data-undo-snapshot");
  });
  return clone.innerHTML;
}

function persistCurrentSheet() {
  localStorage.setItem(serviceStorageKey(activeService), cleanSheetMarkup());
}

function refreshLineEditingTools() {
  stripLineEditingControls();

  if (!editMode) {
    return;
  }

  sheet.querySelectorAll(".list").forEach((list) => {
    list.querySelectorAll(":scope > li.editable").forEach((item) => {
      item.classList.add("line-editable");
      item.draggable = true;
      item.title = "Arrastra para cambiar la posicion";
    });

    const addButton = document.createElement("button");
    addButton.className = "line-add-button";
    addButton.type = "button";
    addButton.dataset.lineType = "list";
    addButton.textContent = "+ Linea";
    addButton.title = "Agregar nueva linea";
    list.insertAdjacentElement("afterend", addButton);
  });

  sheet.querySelectorAll(".info-table, .process-table").forEach((table) => {
    table.querySelectorAll("tbody > tr").forEach((row) => {
      row.classList.add("line-editable");
      row.draggable = true;
      row.title = "Arrastra para cambiar la posicion";
    });

    const addButton = document.createElement("button");
    addButton.className = "line-add-button";
    addButton.type = "button";
    addButton.dataset.lineType = "table";
    addButton.textContent = "+ Fila";
    addButton.title = "Agregar nueva fila";
    table.insertAdjacentElement("afterend", addButton);
  });
}

function focusEditable(element) {
  element.focus();
  const selection = window.getSelection();
  const range = document.createRange();
  range.selectNodeContents(element);
  range.collapse(false);
  selection.removeAllRanges();
  selection.addRange(range);
}

function lineContainer(element) {
  return element.closest("ul.list, tbody");
}

function clearLineDropMarkers() {
  sheet.querySelectorAll(".line-drop-before, .line-drop-after").forEach((element) => {
    element.classList.remove("line-drop-before", "line-drop-after");
  });
}

function ensureServiceStatusButton() {
  const badge = sheet.querySelector(".sheet-badge");
  if (!badge) {
    return;
  }

  const isInactive = badge.classList.contains("is-inactive") || badge.textContent.trim().toLowerCase().includes("inactivo");
  const button = badge.matches("button") ? badge : document.createElement("button");

  if (!badge.matches("button")) {
    button.innerHTML = badge.innerHTML;
    badge.replaceWith(button);
  }

  button.type = "button";
  button.className = `sheet-badge service-status-toggle ${isInactive ? "is-inactive" : "is-active"}`;
  button.textContent = isInactive ? "Servicio inactivo" : "Servicio activo";
  button.setAttribute("aria-pressed", String(!isInactive));
  button.setAttribute("aria-label", isInactive ? "Marcar servicio como activo" : "Marcar servicio como inactivo");
  button.title = isInactive ? "Cambiar a servicio activo" : "Cambiar a servicio inactivo";
}

function arrangeExistingSections() {
  const canvas = sheet.querySelector(".sheet-grid");
  if (!canvas) {
    return;
  }

  if (canvas.classList.contains("free-canvas")) {
    normalizeCanvasLayout(canvas);
    return;
  }

  const sections = Array.from(canvas.querySelectorAll(".section-card"));
  if (!sections.length) {
    return;
  }

  const classByTitle = [
    ["resumen", "summary-section"],
    ["precios", "prices-section"],
    ["requisitos", "requirements-section"],
    ["incluye", "includes-section"],
    ["proceso", "process-section"],
    ["entregables", "notes-section"]
  ];

  sections.forEach((section) => {
    const title = section.querySelector("h2")?.textContent.toLowerCase() || "";
    const match = classByTitle.find(([keyword]) => title.includes(keyword));
    if (match) {
      section.classList.add(match[1]);
    }
  });

  canvas.className = "sheet-grid free-canvas";
  canvas.replaceChildren(...sections);

  sections.forEach((section, index) => {
    const layout = defaultLayouts.find((item) => section.classList.contains(item.className)) || defaultLayouts[index % defaultLayouts.length];
    applyCardLayout(section, layout);
    section.style.zIndex = String(index + 1);
  });
}

function bringCardToFront(card) {
  const cards = Array.from(sheet.querySelectorAll(".section-card"));
  const maxZ = cards.reduce((max, item) => Math.max(max, Number(item.style.zIndex) || 1), 1);
  card.style.zIndex = String(maxZ + 1);
}

function setupDraggableSections() {
  sheet.querySelectorAll(".section-card").forEach((card) => {
    card.draggable = false;

    let resizeHandle = card.querySelector(":scope > .resize-handle");
    if (!resizeHandle) {
      resizeHandle = document.createElement("button");
      resizeHandle.className = "resize-handle";
      resizeHandle.type = "button";
      resizeHandle.setAttribute("aria-label", "Redimensionar recuadro");
      resizeHandle.title = "Arrastra para cambiar ancho y alto";
      card.appendChild(resizeHandle);
    }

    if (dragReadyCards.has(card)) {
      return;
    }

    dragReadyCards.add(card);
    card.addEventListener("pointerdown", (event) => {
      if (editMode || resizingSection || event.button !== 0 || event.target.closest(".resize-handle")) {
        return;
      }

      event.preventDefault();
      pushUndoState();
      draggedSection = card;
      bringCardToFront(card);
      card.classList.add("dragging");
      document.body.classList.add("moving-card");

      const canvas = card.closest(".free-canvas");
      const cardRect = card.getBoundingClientRect();
      const pointerOffsetX = event.clientX - cardRect.left;
      const pointerOffsetY = event.clientY - cardRect.top;
      card.setPointerCapture(event.pointerId);

      const onPointerMove = (moveEvent) => {
        const canvasRect = canvas.getBoundingClientRect();
        const widthPercent = card.getBoundingClientRect().width / canvasRect.width * 100;
        const heightPercent = card.getBoundingClientRect().height / canvasRect.height * 100;
        const nextLeft = (moveEvent.clientX - canvasRect.left - pointerOffsetX) / canvasRect.width * 100;
        const nextTop = (moveEvent.clientY - canvasRect.top - pointerOffsetY) / canvasRect.height * 100;
        card.style.left = `${clamp(nextLeft, 0, Math.max(0, 100 - widthPercent))}%`;
        card.style.top = `${clamp(nextTop, 0, Math.max(0, 100 - heightPercent))}%`;
      };

      const onPointerUp = () => {
        card.removeEventListener("pointermove", onPointerMove);
        card.removeEventListener("pointerup", onPointerUp);
        card.removeEventListener("pointercancel", onPointerUp);
        card.classList.remove("dragging");
        document.body.classList.remove("moving-card");
        draggedSection = null;
        if (card.hasPointerCapture(event.pointerId)) {
          card.releasePointerCapture(event.pointerId);
        }
        saveSheetLayout();
      };

      card.addEventListener("pointermove", onPointerMove);
      card.addEventListener("pointerup", onPointerUp);
      card.addEventListener("pointercancel", onPointerUp);
    });

    resizeHandle.addEventListener("pointerdown", (event) => {
      if (editMode) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      pushUndoState();

      resizingSection = card;
      bringCardToFront(card);
      card.classList.add("resizing");
      document.body.classList.add("resizing-card");

      const canvas = card.closest(".free-canvas");
      const canvasRect = canvas.getBoundingClientRect();
      const startX = event.clientX;
      const startY = event.clientY;
      const startWidth = card.getBoundingClientRect().width / canvasRect.width * 100;
      const startHeight = card.getBoundingClientRect().height / canvasRect.height * 100;
      resizeHandle.setPointerCapture(event.pointerId);

      const onPointerMove = (moveEvent) => {
        const currentCanvasRect = canvas.getBoundingClientRect();
        const left = Number.parseFloat(card.style.left) || 0;
        const top = Number.parseFloat(card.style.top) || 0;
        const nextWidth = startWidth + (moveEvent.clientX - startX) / currentCanvasRect.width * 100;
        const nextHeight = startHeight + (moveEvent.clientY - startY) / currentCanvasRect.height * 100;
        card.style.width = `${clamp(nextWidth, 12, Math.max(12, 100 - left))}%`;
        card.style.height = `${clamp(nextHeight, 12, Math.max(12, 100 - top))}%`;
      };

      const onPointerUp = () => {
        resizeHandle.removeEventListener("pointermove", onPointerMove);
        resizeHandle.removeEventListener("pointerup", onPointerUp);
        resizeHandle.removeEventListener("pointercancel", onPointerUp);
        card.classList.remove("resizing");
        document.body.classList.remove("resizing-card");
        resizingSection = null;
        if (resizeHandle.hasPointerCapture(event.pointerId)) {
          resizeHandle.releasePointerCapture(event.pointerId);
        }
        saveSheetLayout();
      };

      resizeHandle.addEventListener("pointermove", onPointerMove);
      resizeHandle.addEventListener("pointerup", onPointerUp);
      resizeHandle.addEventListener("pointercancel", onPointerUp);
    });

    resizeHandle.addEventListener("dblclick", (event) => {
      event.preventDefault();
      event.stopPropagation();
      pushUndoState();
      const defaultLayout = defaultLayouts.find((layout) => card.classList.contains(layout.className));
      if (defaultLayout) {
        card.style.width = `${defaultLayout.width}%`;
        card.style.height = `${defaultLayout.height}%`;
      } else {
        card.style.height = "";
      }
      saveSheetLayout();
    });
  });
}

function renderSheet(key) {
  activeService = key;
  const service = services[key];
  const savedSheet = localStorage.getItem(serviceStorageKey(key));
  pageTitle.textContent = service.title;

  if (savedSheet) {
    sheet.className = service.empty ? "service-sheet empty-sheet" : "service-sheet";
    sheet.innerHTML = savedSheet;
    stripLineEditingControls();
    ensureServiceStatusButton();
    arrangeExistingSections();
    setEditMode(editMode);
    setupDraggableSections();
    return;
  }

  if (service.empty) {
    sheet.className = "service-sheet empty-sheet";
    sheet.innerHTML = `
      <header class="sheet-header">
        <img src="logo-blanco-transparente.png" alt="Services Visas US">
        <div>
          <p class="sheet-kicker editable">Ficha de servicio</p>
          <h2 class="sheet-title editable">${service.title}</h2>
        </div>
      </header>
      <div></div>
    `;
    setEditMode(editMode);
    return;
  }

  sheet.className = "service-sheet";
  sheet.innerHTML = `
    <header class="sheet-header">
      <img src="logo-blanco-transparente.png" alt="Services Visas US">
      <div>
        <p class="sheet-kicker editable">Ficha de servicio</p>
        <h2 class="sheet-title editable">${service.title}</h2>
      </div>
      <button class="sheet-badge service-status-toggle is-active" type="button" aria-pressed="true" aria-label="Marcar servicio como inactivo" title="Cambiar a servicio inactivo">${service.badge}</button>
    </header>

    <div class="sheet-grid free-canvas">
      <section class="section-card summary-section" style="left: 0%; top: 0%; width: 34%; height: 25%; z-index: 1;">
        ${editableText("1. Resumen del servicio", "h2")}
        ${tableRows(service.summary, "Campo", "Información", "info-table")}
      </section>

      <section class="section-card prices-section" style="left: 36%; top: 0%; width: 28%; height: 22%; z-index: 2;">
        ${editableText("2. Precios y promociones", "h2")}
        ${tableRows(service.prices, "Concepto", "Valor", "info-table price-table")}
        ${listItems(service.promos)}
      </section>

      <section class="section-card requirements-section" style="left: 66%; top: 0%; width: 25%; height: 22%; z-index: 3;">
        ${editableText("3. Requisitos", "h2")}
        ${listItems(service.requirements)}
      </section>

      <section class="section-card includes-section" style="left: 0%; top: 29%; width: 28%; height: 33%; z-index: 4;">
        ${editableText("4. ¿Qué incluye?", "h2")}
        ${listItems(service.includes)}
      </section>

      <section class="section-card process-section" style="left: 30%; top: 25%; width: 33%; height: 43%; z-index: 5;">
        ${editableText("5. Proceso del servicio", "h2")}
        ${tableRows(service.process, "Etapa", "Tiempo", "process-table")}
      </section>

      <section class="section-card notes-section" style="left: 65%; top: 25%; width: 28%; height: 36%; z-index: 6;">
        ${editableText("6. Entregables y observaciones", "h2")}
        <div class="notes">
          <div>
            ${editableText("Entregables", "h2")}
            ${listItems(service.deliverables)}
          </div>
          <div>
            ${editableText("Observaciones", "h2")}
            ${listItems(service.observations)}
          </div>
        </div>
      </section>
    </div>
  `;
  ensureServiceStatusButton();
  setEditMode(editMode);
  setupDraggableSections();
  normalizeCanvasLayout(sheet.querySelector(".free-canvas"));
}

serviceButtons.forEach((button) => {
  button.addEventListener("click", () => {
    if (editMode) {
      saveCurrentSheet();
    }

    serviceButtons.forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    renderSheet(button.dataset.service);
  });
});

sheet.addEventListener("focusin", (event) => {
  if (!event.target.classList.contains("editable")) {
    return;
  }

  event.target.dataset.undoSnapshot = currentSnapshot();
});

sheet.addEventListener("input", (event) => {
  if (!event.target.classList.contains("editable")) {
    return;
  }

  saveButton.disabled = false;
});

sheet.addEventListener("focusout", (event) => {
  if (!event.target.classList.contains("editable")) {
    return;
  }

  const snapshot = event.target.dataset.undoSnapshot;
  delete event.target.dataset.undoSnapshot;

  if (snapshot && snapshot !== currentSnapshot()) {
    undoHistory[activeService] ||= [];
    const history = undoHistory[activeService];
    if (history[history.length - 1] !== snapshot) {
      history.push(snapshot);
    }
    if (history.length > maxUndoSteps) {
      history.shift();
    }
    persistCurrentSheet();
  }
});

sheet.addEventListener("click", (event) => {
  const addButton = event.target.closest(".line-add-button");
  if (!addButton || !editMode) {
    return;
  }

  event.preventDefault();
  pushUndoState();

  if (addButton.dataset.lineType === "list") {
    const list = addButton.previousElementSibling;
    if (!list?.matches(".list")) {
      return;
    }
    const item = document.createElement("li");
    item.className = "editable line-editable";
    item.textContent = "Nueva linea";
    item.contentEditable = "true";
    item.spellcheck = true;
    item.draggable = true;
    item.title = "Arrastra para cambiar la posicion";
    list.appendChild(item);
    focusEditable(item);
  }

  if (addButton.dataset.lineType === "table") {
    const table = addButton.previousElementSibling;
    if (!table?.matches(".info-table, .process-table")) {
      return;
    }
    const body = table.querySelector("tbody");
    if (!body) {
      return;
    }
    const columnCount = table.querySelector("thead tr")?.children.length || body.querySelector("tr")?.children.length || 2;
    const row = document.createElement("tr");
    row.className = "line-editable";
    row.draggable = true;
    row.title = "Arrastra para cambiar la posicion";

    Array.from({ length: columnCount }).forEach((_, index) => {
      const cell = document.createElement("td");
      cell.className = "editable";
      cell.textContent = index === 0 ? "Nuevo campo" : "Nueva informacion";
      cell.contentEditable = "true";
      cell.spellcheck = true;
      row.appendChild(cell);
    });

    body.appendChild(row);
    focusEditable(row.querySelector(".editable"));
  }

  saveButton.disabled = false;
  persistCurrentSheet();
});

sheet.addEventListener("dragstart", (event) => {
  if (!editMode) {
    return;
  }

  const line = event.target.closest(".line-editable");
  if (!line || !lineContainer(line)) {
    return;
  }

  draggedLine = line;
  pushUndoState();
  line.classList.add("line-dragging");
  event.dataTransfer.effectAllowed = "move";
  event.dataTransfer.setData("text/plain", "move-line");
});

sheet.addEventListener("dragover", (event) => {
  if (!draggedLine) {
    return;
  }

  const targetLine = event.target.closest(".line-editable");
  if (!targetLine || targetLine === draggedLine || lineContainer(targetLine) !== lineContainer(draggedLine)) {
    return;
  }

  event.preventDefault();
  const targetRect = targetLine.getBoundingClientRect();
  const placeAfter = event.clientY > targetRect.top + targetRect.height / 2;
  clearLineDropMarkers();
  targetLine.classList.toggle("line-drop-before", !placeAfter);
  targetLine.classList.toggle("line-drop-after", placeAfter);
});

sheet.addEventListener("drop", (event) => {
  if (!draggedLine) {
    return;
  }

  const targetLine = event.target.closest(".line-editable");
  if (!targetLine || targetLine === draggedLine || lineContainer(targetLine) !== lineContainer(draggedLine)) {
    return;
  }

  event.preventDefault();
  const targetRect = targetLine.getBoundingClientRect();
  const placeAfter = event.clientY > targetRect.top + targetRect.height / 2;
  targetLine.parentNode.insertBefore(draggedLine, placeAfter ? targetLine.nextSibling : targetLine);
  clearLineDropMarkers();
  draggedLine.classList.remove("line-dragging");
  draggedLine = null;
  saveButton.disabled = false;
  persistCurrentSheet();
});

sheet.addEventListener("dragend", () => {
  if (draggedLine) {
    draggedLine.classList.remove("line-dragging");
  }
  draggedLine = null;
  clearLineDropMarkers();
});

sheet.addEventListener("click", (event) => {
  const statusButton = event.target.closest(".service-status-toggle");
  if (!statusButton) {
    return;
  }

  pushUndoState();
  const nextInactive = statusButton.classList.contains("is-active");
  statusButton.classList.toggle("is-active", !nextInactive);
  statusButton.classList.toggle("is-inactive", nextInactive);
  statusButton.textContent = nextInactive ? "Servicio inactivo" : "Servicio activo";
  statusButton.setAttribute("aria-pressed", String(!nextInactive));
  statusButton.setAttribute("aria-label", nextInactive ? "Marcar servicio como activo" : "Marcar servicio como inactivo");
  statusButton.title = nextInactive ? "Cambiar a servicio activo" : "Cambiar a servicio inactivo";
  persistCurrentSheet();
});

document.addEventListener("keydown", (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z" && !event.shiftKey) {
    if (undoLastAction()) {
      event.preventDefault();
    }
  }
});

editButton.addEventListener("click", () => {
  setEditMode(!editMode);
});

saveButton.addEventListener("click", () => {
  saveCurrentSheet();
});

themeToggle.addEventListener("click", () => {
  const isDark = document.body.classList.toggle("dark");
  themeToggle.setAttribute("aria-label", isDark ? "Activar modo claro" : "Activar modo oscuro");
  localStorage.setItem("svus-theme", isDark ? "dark" : "light");
});

printButton.addEventListener("click", () => {
  setSheetLogoForPrint();
  window.print();
});

window.addEventListener("beforeprint", setSheetLogoForPrint);
window.addEventListener("afterprint", restoreSheetLogoAfterPrint);

if (localStorage.getItem("svus-theme") === "dark") {
  document.body.classList.add("dark");
  themeToggle.setAttribute("aria-label", "Activar modo claro");
}

renderSheet("visa-americana");
