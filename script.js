function emptyService(title) {
  return {
    title,
    badge: "Servicio activo",
    summary: [
      ["Qué es", ""],
      ["Objetivo", ""],
      ["Modalidad", ""],
      ["Duración", ""]
    ],
    prices: [
      ["Servicio Agencia", ""],
      ["Tasa Consular", ""],
      ["Total Cliente", ""]
    ],
    promos: [""],
    requirements: [""],
    includes: [""],
    process: [
      ["Captación y asesoría", ""],
      ["Recepción documentos", ""],
      ["Llenado formulario", ""],
      ["Pago consular", ""],
      ["Agendamiento cita", ""],
      ["Preparación entrevista", ""],
      ["Espera de cita", ""],
      ["Resultado final", ""]
    ],
    deliverables: [""],
    observations: [""]
  };
}

const services = {
  "visa-americana": {
    title: "Visa Americana B1/B2 (Negocios y Turismo)",
    badge: "Servicio activo",
    summary: [
      ["Qué es", "Asesoría y gestión para la obtención o renovación de Visa Americana B1/B2 (Negocios y Turismo)."],
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
  "visa-americana-f1": emptyService("Visa Americana F1 (Estudios)"),
  "visa-schengen": emptyService("Visa Schengen (Corta Estancia)"),
  "visa-nacional-trabajo": emptyService("Visa Nacional de Trabajo"),
  "visa-nacional-estudios": emptyService("Visa Nacional de Estudios"),
  "visa-nacional-reagrupacion-comunitaria": emptyService("Visa Nacional de Reagrupación Comunitaria"),
  "visa-nacional-recuperacion-residencia": emptyService("Visa Nacional Recuperación de Tarjeta de Residencia"),
  vuelos: emptyService("Vuelos"),
  tours: emptyService("Tours"),
  seguros: emptyService("Seguros")
};

services["visa-americana-f1"] = {
  ...JSON.parse(JSON.stringify(services["visa-americana"])),
  title: "Visa Americana F1 (Estudios)"
};

const sheet = document.querySelector("#serviceSheet");
const pageTitle = document.querySelector("#pageTitle");
const serviceButtons = document.querySelectorAll(".service-button");
const editButton = document.querySelector("#editButton");
const saveButton = document.querySelector("#saveButton");
const themeToggle = document.querySelector("#themeToggle");
const printButton = document.querySelector("#printButton");
const wordButton = document.querySelector("#wordButton");
const screenLogoSrc = "logo-blanco-transparente.png";
const printLogoSrc = "logo-impresion-color.png";
let activeService = "visa-americana";
let editMode = false;
let draggedSection = null;
let resizingSection = null;
let draggedLine = null;
let selectedLine = null;
let selectedCard = null;
let copiedCardMarkup = "";
const dragReadyCards = new WeakSet();
const undoHistory = {};
const maxUndoSteps = 40;
const wordMimeType = "application/msword;charset=utf-8";

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

function serviceWordStorageKey(key) {
  return `svus-word-${key}`;
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

  makeCardContentEditable(sheet);

  sheet.querySelectorAll(".editable").forEach((element) => {
    element.contentEditable = editMode ? "true" : "false";
    element.spellcheck = true;
  });

  if (!editMode) {
    clearSelectedLine();
    clearSelectedCard();
  }

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

  clearSelectedCard();
  sheet.innerHTML = history.pop();
  ensureServiceStatusButton();
  arrangeExistingSections();
  setEditMode(editMode);
  setupDraggableSections();
  persistCurrentSheet();
  return true;
}

function clearSelectedLine() {
  selectedLine?.classList.remove("line-selected");
  selectedLine = null;
}

function clearSelectedCard() {
  selectedCard?.classList.remove("card-selected");
  selectedCard = null;
}

function selectCard(card) {
  if (!card || selectedCard === card) {
    return;
  }

  clearSelectedCard();
  selectedCard = card;
  selectedCard.classList.add("card-selected");
}

function selectLine(line) {
  clearSelectedLine();
  selectedLine = line;
  selectedLine.classList.add("line-selected");
}

function isLineHandleClick(line, event) {
  const handleHost = line.matches("tr") ? line.cells[0] : line;
  if (!handleHost) {
    return false;
  }

  const rect = handleHost.getBoundingClientRect();
  return event.clientX >= rect.left && event.clientX <= rect.left + 26;
}

function deleteSelectedLine() {
  if (!selectedLine?.isConnected || !editMode) {
    clearSelectedLine();
    return false;
  }

  pushUndoState();
  const lineToDelete = selectedLine;
  clearSelectedLine();
  lineToDelete.remove();
  saveButton.disabled = false;
  persistCurrentSheet();
  refreshLineEditingTools();
  return true;
}

function hasSelectedTextInsideCard() {
  const selection = window.getSelection();

  if (!selection || selection.isCollapsed || !selectedCard) {
    return false;
  }

  return selectedCard.contains(selection.anchorNode) || selectedCard.contains(selection.focusNode);
}

function hasAnySelectedText() {
  const selection = window.getSelection();
  return Boolean(selection && !selection.isCollapsed && selection.toString().trim());
}

function makeCardContentEditable(root = sheet) {
  root.querySelectorAll(".section-card :is(h1, h2, h3, h4, h5, h6, p, span, th, td, li, strong, em, b, i)").forEach((element) => {
    if (element.closest("button, .resize-handle, .line-add-button")) {
      return;
    }

    element.classList.add("editable");
  });
}

function cleanCardForCopy(card) {
  const clone = card.cloneNode(true);
  stripLineEditingControls(clone);
  clone.querySelectorAll(".card-move-handle, .resize-handle").forEach((handle) => handle.remove());
  clone.classList.remove("card-selected", "dragging", "resizing");
  clone.removeAttribute("data-print-style");
  clone.querySelectorAll("[contenteditable], [spellcheck], [data-undo-snapshot]").forEach((element) => {
    element.removeAttribute("contenteditable");
    element.removeAttribute("spellcheck");
    element.removeAttribute("data-undo-snapshot");
  });
  clone.dataset.svusCard = "true";
  return clone;
}

function copySelectedCard(event) {
  if (!editMode || !selectedCard?.isConnected) {
    return;
  }

  if (hasAnySelectedText() || hasSelectedTextInsideCard()) {
    copiedCardMarkup = "";
    return;
  }

  const clone = cleanCardForCopy(selectedCard);
  copiedCardMarkup = clone.outerHTML;

  event.preventDefault();
  event.clipboardData?.setData("text/html", copiedCardMarkup);
  event.clipboardData?.setData("text/plain", clone.innerText.trim());
}

function cardFromMarkup(markup) {
  const template = document.createElement("template");
  template.innerHTML = markup.trim();
  return template.content.querySelector(".section-card");
}

function pasteCopiedCard(event) {
  if (!editMode) {
    return false;
  }

  const clipboardHtml = event.clipboardData?.getData("text/html") || "";
  const markup = clipboardHtml.includes("data-svus-card") ? clipboardHtml : (!event.clipboardData ? copiedCardMarkup : "");
  const card = cardFromMarkup(markup || copiedCardMarkup);

  if (!markup || !card) {
    return false;
  }

  event.preventDefault();
  pushUndoState();

  delete card.dataset.svusCard;
  const targetCanvas = selectedCard?.closest(".free-canvas") || sheet.querySelector(".free-canvas");

  if (!targetCanvas) {
    return false;
  }

  const sourceCard = selectedCard?.isConnected ? selectedCard : null;
  const sourceLeft = sourceCard ? stylePercent(sourceCard, "left") : stylePercent(card, "left");
  const sourceTop = sourceCard ? stylePercent(sourceCard, "top") : stylePercent(card, "top");
  const width = stylePercent(card, "width", sourceCard ? stylePercent(sourceCard, "width", 24) : 24);
  const height = stylePercent(card, "height", sourceCard ? stylePercent(sourceCard, "height", 24) : 24);

  card.style.left = `${clamp(sourceLeft + 3, 0, Math.max(0, 100 - width))}%`;
  card.style.top = `${clamp(sourceTop + 3, 0, Math.max(0, 100 - height))}%`;
  card.style.width = `${width}%`;
  card.style.height = `${height}%`;

  makeCardContentEditable(card);
  targetCanvas.appendChild(card);
  bringCardToFront(card);
  setupDraggableSections();
  refreshLineEditingTools();
  setEditMode(editMode);
  selectCard(card);
  saveButton.disabled = false;
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

function sheetPageMarkup(index, content = "") {
  return `
    <section class="sheet-page" data-page="${index}">
      <div class="sheet-page-label">Hoja ${index}</div>
      <div class="sheet-grid free-canvas">${content}</div>
    </section>
  `;
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

function stylePercent(element, property, fallback = 0) {
  const value = Number.parseFloat(element.style[property]);
  return Number.isFinite(value) ? value : fallback;
}

function restorePrintLayout() {
  document.body.classList.remove("printing-fit");
  sheet.querySelectorAll(".section-card[data-print-style]").forEach((card) => {
    card.style.cssText = card.dataset.printStyle;
    delete card.dataset.printStyle;
  });
}

function fitCanvasesForPrint() {
  sheet.querySelectorAll(".free-canvas").forEach((canvas) => {
    const canvasRect = canvas.getBoundingClientRect();
    const cards = Array.from(canvas.querySelectorAll(".section-card"));

    if (!canvasRect.height || !cards.length) {
      return;
    }

    const layouts = cards.map((card) => {
      if (!card.dataset.printStyle) {
        card.dataset.printStyle = card.style.cssText;
      }

      const top = stylePercent(card, "top");
      const renderedHeight = Math.max(card.getBoundingClientRect().height, card.scrollHeight) / canvasRect.height * 100;
      const height = Math.max(renderedHeight, 10);

      return {
        card,
        top,
        height
      };
    });

    const maxBottom = Math.max(...layouts.map(({ top, height }) => top + height));

    if (maxBottom <= 94) {
      return;
    }

    const scale = clamp(94 / maxBottom, 0.42, 1);
    layouts.forEach(({ card, top }) => {
      card.style.top = `${Math.max(0, top * scale)}%`;
    });
  });
}

function preparePrintView() {
  restorePrintLayout();
  setSheetLogoForPrint();
  fitCanvasesForPrint();
  document.body.classList.add("printing-fit");
}

function restoreAfterPrint() {
  restorePrintLayout();
  restoreSheetLogoAfterPrint();
}

function ensureSheetPages() {
  let pages = sheet.querySelector(".sheet-pages");

  if (!pages) {
    const canvases = Array.from(sheet.querySelectorAll(".sheet-grid"));
    pages = document.createElement("div");
    pages.className = "sheet-pages";

    canvases.forEach((canvas, index) => {
      const page = document.createElement("section");
      page.className = "sheet-page";
      page.dataset.page = String(index + 1);

      const label = document.createElement("div");
      label.className = "sheet-page-label";
      label.textContent = `Hoja ${index + 1}`;

      canvas.classList.add("free-canvas");
      page.append(label, canvas);
      pages.appendChild(page);
    });

    if (!pages.children.length) {
      pages.innerHTML = sheetPageMarkup(1);
    }

    sheet.appendChild(pages);
  }

  pages.querySelectorAll(".sheet-page").forEach((page, index) => {
    page.dataset.page = String(index + 1);

    let label = page.querySelector(":scope > .sheet-page-label");
    if (!label) {
      label = document.createElement("div");
      label.className = "sheet-page-label";
      page.prepend(label);
    }
    label.textContent = `Hoja ${index + 1}`;

    const canvas = page.querySelector(":scope > .sheet-grid");
    if (canvas) {
      canvas.classList.add("free-canvas");
    }
  });

  let addButton = sheet.querySelector(":scope > .add-page-button");
  if (!addButton) {
    addButton = document.createElement("button");
    addButton.className = "add-page-button";
    addButton.type = "button";
    addButton.setAttribute("aria-label", "Crear nueva hoja");
    addButton.title = "Crear nueva hoja";
    addButton.textContent = "+";
    sheet.appendChild(addButton);
  }
}

function migrateServiceMarkup(key, service) {
  const title = sheet.querySelector(".sheet-title");
  if (title) {
    title.textContent = service.title;
  }

  sheet.querySelectorAll(".editable").forEach((element) => {
    const originalText = element.textContent;
    let nextText = originalText;

    if (key === "visa-americana") {
      nextText = nextText.replace(/Visa Americana B1\/B2(?:\s*\(Negocios y Turismo\))*/g, service.title);
    }

    if (key === "visa-schengen") {
      nextText = nextText.replace(/Visa Schengen(?:\s*\(Corta Estancia\))*/g, service.title);
    }

    if (nextText !== originalText) {
      element.textContent = nextText;
    }
  });
}

function stripLineEditingControls(root = sheet) {
  root.querySelectorAll(".line-add-button").forEach((button) => button.remove());
  if (root !== sheet) {
    root.querySelectorAll(".card-move-handle").forEach((button) => button.remove());
  }
  root.querySelectorAll(".card-selected").forEach((card) => card.classList.remove("card-selected"));
  root.querySelectorAll("[data-svus-card]").forEach((card) => card.removeAttribute("data-svus-card"));
  root.querySelectorAll(".line-editable").forEach((element) => {
    element.classList.remove("line-editable", "line-dragging", "line-drop-before", "line-drop-after", "line-selected");
    element.removeAttribute("draggable");
    element.removeAttribute("title");
  });
}

function cleanSheetMarkup() {
  const clone = sheet.cloneNode(true);
  stripLineEditingControls(clone);
  clone.querySelectorAll(".add-page-button").forEach((button) => button.remove());
  clone.querySelectorAll(".editable").forEach((element) => {
    element.removeAttribute("contenteditable");
    element.removeAttribute("spellcheck");
    element.removeAttribute("data-undo-snapshot");
  });
  return clone.innerHTML;
}

function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function sanitizeFileName(text) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase() || "ficha-servicio";
}

function buildWordDocumentHtml() {
  const clone = sheet.cloneNode(true);
  stripLineEditingControls(clone);
  clone.querySelectorAll(".add-page-button, .resize-handle").forEach((element) => element.remove());
  clone.querySelectorAll("[contenteditable], [spellcheck], [data-undo-snapshot]").forEach((element) => {
    element.removeAttribute("contenteditable");
    element.removeAttribute("spellcheck");
    element.removeAttribute("data-undo-snapshot");
  });

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${escapeHtml(pageTitle.textContent)}</title>
      <style>
        body { font-family: Arial, sans-serif; color: #17324b; }
        .service-sheet { border-top: 4px solid #f0c753; padding: 18px; }
        .sheet-header { border-bottom: 1px solid #d7e1eb; margin-bottom: 14px; }
        .sheet-header img { width: 90px; height: auto; }
        .sheet-kicker { color: #2c85ac; font-size: 11px; font-weight: bold; text-transform: uppercase; }
        .sheet-title { color: #b8860f; font-size: 22px; margin: 4px 0 8px; }
        .sheet-badge, .sheet-page-label { display: inline-block; border: 1px solid #d7e1eb; padding: 5px 8px; font-weight: bold; }
        .sheet-page { margin: 18px 0; page-break-after: always; }
        .sheet-page:last-child { page-break-after: auto; }
        .sheet-grid { position: relative; min-height: 560px; border: 1px solid #d7e1eb; padding: 10px; }
        .section-card { border: 1px solid #d7e1eb; border-radius: 6px; margin: 8px 0; padding: 8px; position: static !important; width: auto !important; height: auto !important; }
        .section-card h2, .notes h2 { color: #09233a; background: #f0c753; padding: 4px 7px; display: inline-block; font-size: 12px; }
        table { width: 100%; border-collapse: collapse; margin: 6px 0; }
        th, td { border-bottom: 1px solid #d7e1eb; padding: 5px; text-align: left; vertical-align: top; }
        th { color: #31568a; background: #fff7df; }
        ul { margin: 6px 0 6px 18px; padding: 0; }
        li { margin: 3px 0; }
      </style>
    </head>
    <body>${clone.outerHTML}</body>
    </html>
  `;
}

function downloadWordDocument() {
  persistCurrentSheet();
  const fileName = `${sanitizeFileName(pageTitle.textContent)}.doc`;
  const blob = new Blob([buildWordDocumentHtml()], { type: wordMimeType });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  URL.revokeObjectURL(link.href);
  link.remove();
}

function persistCurrentSheet() {
  const markup = cleanSheetMarkup();
  localStorage.setItem(serviceStorageKey(activeService), markup);
  localStorage.setItem(serviceWordStorageKey(activeService), buildWordDocumentHtml());
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
      item.title = "Arrastra para cambiar la posicion. Selecciona el marcador inicial y presiona Suprimir para eliminar.";
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
      row.title = "Arrastra para cambiar la posicion. Selecciona el marcador inicial y presiona Suprimir para eliminar.";
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
  ensureSheetPages();

  sheet.querySelectorAll(".sheet-grid").forEach((canvas) => {
    if (canvas.classList.contains("free-canvas")) {
      normalizeCanvasLayout(canvas);
      return;
    }

    const sections = Array.from(canvas.querySelectorAll(".section-card"));
    if (!sections.length) {
      canvas.className = "sheet-grid free-canvas";
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
  });
}

function bringCardToFront(card) {
  const cards = Array.from(sheet.querySelectorAll(".section-card"));
  const maxZ = cards.reduce((max, item) => Math.max(max, Number(item.style.zIndex) || 1), 1);
  card.style.zIndex = String(maxZ + 1);
}

function startCardMove(event, card, pointerTarget = card) {
  let canvas = card.closest(".free-canvas");
  if (!canvas) {
    return;
  }

  event.preventDefault();
  pushUndoState();
  draggedSection = card;
  selectCard(card);
  bringCardToFront(card);
  card.classList.add("dragging");
  document.body.classList.add("moving-card");

  const cardRect = card.getBoundingClientRect();
  const pointerOffsetX = event.clientX - cardRect.left;
  const pointerOffsetY = event.clientY - cardRect.top;
  pointerTarget.setPointerCapture(event.pointerId);

  const onPointerMove = (moveEvent) => {
    const targetCanvas = document.elementsFromPoint(moveEvent.clientX, moveEvent.clientY)
      .find((element) => element.classList?.contains("free-canvas"));

    if (targetCanvas && targetCanvas !== canvas) {
      canvas = targetCanvas;
      canvas.appendChild(card);
    }

    const canvasRect = canvas.getBoundingClientRect();
    const widthPercent = card.getBoundingClientRect().width / canvasRect.width * 100;
    const heightPercent = card.getBoundingClientRect().height / canvasRect.height * 100;
    const nextLeft = (moveEvent.clientX - canvasRect.left - pointerOffsetX) / canvasRect.width * 100;
    const nextTop = (moveEvent.clientY - canvasRect.top - pointerOffsetY) / canvasRect.height * 100;
    card.style.left = `${clamp(nextLeft, 0, Math.max(0, 100 - widthPercent))}%`;
    card.style.top = `${clamp(nextTop, 0, Math.max(0, 100 - heightPercent))}%`;
  };

  const onPointerUp = () => {
    pointerTarget.removeEventListener("pointermove", onPointerMove);
    pointerTarget.removeEventListener("pointerup", onPointerUp);
    pointerTarget.removeEventListener("pointercancel", onPointerUp);
    card.classList.remove("dragging");
    document.body.classList.remove("moving-card");
    draggedSection = null;
    if (pointerTarget.hasPointerCapture(event.pointerId)) {
      pointerTarget.releasePointerCapture(event.pointerId);
    }
    if (editMode) {
      saveButton.disabled = false;
      persistCurrentSheet();
    } else {
      saveSheetLayout();
    }
  };

  pointerTarget.addEventListener("pointermove", onPointerMove);
  pointerTarget.addEventListener("pointerup", onPointerUp);
  pointerTarget.addEventListener("pointercancel", onPointerUp);
}

function setupDraggableSections() {
  sheet.querySelectorAll(".section-card").forEach((card) => {
    card.draggable = false;

    let moveHandle = card.querySelector(":scope > .card-move-handle");
    if (!moveHandle) {
      moveHandle = document.createElement("button");
      moveHandle.className = "card-move-handle";
      moveHandle.type = "button";
      moveHandle.setAttribute("aria-label", "Mover recuadro");
      moveHandle.title = "Arrastra para mover el recuadro";
      card.appendChild(moveHandle);
    }

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
      if (editMode || resizingSection || event.button !== 0 || event.target.closest(".resize-handle, .card-move-handle")) {
        return;
      }

      startCardMove(event, card);
    });

    moveHandle.addEventListener("pointerdown", (event) => {
      if (!editMode || resizingSection || event.button !== 0) {
        return;
      }

      event.stopPropagation();
      startCardMove(event, card, moveHandle);
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
  clearSelectedLine();
  clearSelectedCard();
  activeService = key;
  const service = services[key];
  const savedSheet = localStorage.getItem(serviceStorageKey(key));
  const shouldRefreshCopiedF1 = key === "visa-americana-f1"
    && savedSheet
    && !savedSheet.includes("Asesoría y gestión para la obtención");
  const useSavedSheet = savedSheet && !shouldRefreshCopiedF1 && (service.empty || savedSheet.includes("section-card"));
  pageTitle.textContent = service.title;

  if (useSavedSheet) {
    sheet.className = service.empty ? "service-sheet empty-sheet" : "service-sheet";
    sheet.innerHTML = savedSheet;
    stripLineEditingControls();
    ensureServiceStatusButton();
    migrateServiceMarkup(key, service);
    arrangeExistingSections();
    setEditMode(editMode);
    setupDraggableSections();
    persistCurrentSheet();
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
    ensureSheetPages();
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

    <div class="sheet-pages">
      <section class="sheet-page" data-page="1">
        <div class="sheet-page-label">Hoja 1</div>
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
      </section>
    </div>
    <button class="add-page-button" type="button" aria-label="Crear nueva hoja" title="Crear nueva hoja">+</button>
  `;
  ensureServiceStatusButton();
  ensureSheetPages();
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

  const card = event.target.closest(".section-card");
  if (editMode && card) {
    selectCard(card);
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

sheet.addEventListener("pointerdown", (event) => {
  if (!editMode) {
    return;
  }

  const card = event.target.closest(".section-card");
  if (card) {
    selectCard(card);
  } else {
    clearSelectedCard();
  }

  const line = event.target.closest(".line-editable");
  if (!line) {
    if (!event.target.closest(".line-add-button")) {
      clearSelectedLine();
    }
    return;
  }

  if (!isLineHandleClick(line, event)) {
    clearSelectedLine();
    return;
  }

  event.preventDefault();
  event.stopPropagation();
  selectLine(line);

  if (document.activeElement instanceof HTMLElement) {
    document.activeElement.blur();
  }
});

sheet.addEventListener("click", (event) => {
  const addPageButton = event.target.closest(".add-page-button");
  if (!addPageButton) {
    return;
  }

  event.preventDefault();
  pushUndoState();
  ensureSheetPages();

  const pages = sheet.querySelector(".sheet-pages");
  const nextIndex = pages.querySelectorAll(".sheet-page").length + 1;
  pages.insertAdjacentHTML("beforeend", sheetPageMarkup(nextIndex));
  ensureSheetPages();
  setupDraggableSections();
  persistCurrentSheet();
  pages.lastElementChild.scrollIntoView({ behavior: "smooth", block: "nearest" });
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
    item.textContent = "";
    item.contentEditable = "true";
    item.spellcheck = true;
    item.draggable = true;
    item.title = "Arrastra para cambiar la posicion. Selecciona el marcador inicial y presiona Suprimir para eliminar.";
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
    row.title = "Arrastra para cambiar la posicion. Selecciona el marcador inicial y presiona Suprimir para eliminar.";

    Array.from({ length: columnCount }).forEach((_, index) => {
      const cell = document.createElement("td");
      cell.className = "editable";
      cell.textContent = "";
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

document.addEventListener("copy", copySelectedCard);

document.addEventListener("paste", (event) => {
  pasteCopiedCard(event);
});

document.addEventListener("keydown", (event) => {
  if (editMode && (event.key === "Delete" || event.code === "Delete") && selectedLine) {
    if (deleteSelectedLine()) {
      event.preventDefault();
    }
    return;
  }

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
  preparePrintView();
  window.print();
});

wordButton?.addEventListener("click", downloadWordDocument);

window.addEventListener("beforeprint", preparePrintView);
window.addEventListener("afterprint", restoreAfterPrint);

if (localStorage.getItem("svus-theme") === "dark") {
  document.body.classList.add("dark");
  themeToggle.setAttribute("aria-label", "Activar modo claro");
}

renderSheet("visa-americana");
