// Redesoft — interacción del sitio (sin dependencias)
(function () {
  "use strict";
  // Eventos de Google Analytics 4 (la etiqueta gtag.js la inserta el servidor en el <head>)
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
  const track = (name, params) => window.gtag("event", name, Object.assign({ page_path: location.pathname }, params || {}));

  // "Solicitar una demo" → "solicitar_una_demo" (formato válido para nombres de evento de GA4)
  const eventName = (text) => {
    let n = text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
      .replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
    if (!/^[a-z]/.test(n)) n = "cta_" + n;
    return n.slice(0, 40).replace(/_+$/, "") || "cta_click";
  };

  // ── Menú móvil ────────────────────────────────────────
  const toggle = document.querySelector(".nav-toggle");
  const nav = document.getElementById("menu-principal");
  if (toggle && nav) {
    toggle.addEventListener("click", () => {
      const open = toggle.getAttribute("aria-expanded") === "true";
      toggle.setAttribute("aria-expanded", String(!open));
      nav.classList.toggle("is-open", !open);
    });
  }

  // ── Desplegables (mouse, teclado y táctil) ────────────
  const parents = document.querySelectorAll(".nav-parent");
  const closeAll = (except) => parents.forEach((b) => {
    if (b === except) return;
    b.setAttribute("aria-expanded", "false");
    document.getElementById(b.getAttribute("aria-controls"))?.classList.remove("is-open");
  });
  parents.forEach((btn) => {
    const menu = document.getElementById(btn.getAttribute("aria-controls"));
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const open = btn.getAttribute("aria-expanded") === "true";
      closeAll(btn);
      btn.setAttribute("aria-expanded", String(!open));
      menu.classList.toggle("is-open", !open);
      if (!open && e.detail === 0) menu.querySelector("a")?.focus(); // abierto con teclado
    });
    menu.addEventListener("keydown", (e) => {
      const links = [...menu.querySelectorAll("a")];
      const i = links.indexOf(document.activeElement);
      if (e.key === "ArrowDown") { e.preventDefault(); links[(i + 1) % links.length].focus(); }
      if (e.key === "ArrowUp") { e.preventDefault(); links[(i - 1 + links.length) % links.length].focus(); }
    });
  });
  document.addEventListener("click", () => closeAll());
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    const openBtn = [...parents].find((b) => b.getAttribute("aria-expanded") === "true");
    closeAll();
    openBtn?.focus();
  });

  // ── Eventos de clic ───────────────────────────────────
  //  contacto_whatsapp     → cualquier enlace a WhatsApp
  //  contacto_email        → enlaces mailto:
  //  contacto_telefono     → enlaces tel:
  //  contacto_como_llegar  → enlaces a Google Maps
  //  <texto_del_boton>     → cada botón (.btn), con su ubicación y página como parámetros
  document.addEventListener("click", (e) => {
    const link = e.target.closest("a[href]");
    const href = link ? link.getAttribute("href") : "";
    const ubicacion = (e.target.closest("[data-cta]") || {}).dataset?.cta || "";
    if (href.includes("wa.me")) return track("contacto_whatsapp", { ubicacion: ubicacion || "enlace" });
    if (href.startsWith("mailto:")) return track("contacto_email");
    if (href.startsWith("tel:")) return track("contacto_telefono");
    if (/google\.[a-z.]+\/maps|maps\.google|share\.google/.test(href)) return track("contacto_como_llegar");
    const btn = e.target.closest(".btn");
    if (btn) track(eventName(btn.textContent.trim()), { ubicacion, link_url: href || undefined });
  });

  // ── Botón flotante de WhatsApp (en todas las páginas) ─
  const WA_NUMBER = "5492615270214";
  const WA_TEXT = "Hola Redesoft, quiero hacer una consulta.";
  if (!document.querySelector(".wa-float")) {
    const wa = document.createElement("a");
    wa.className = "wa-float";
    wa.href = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(WA_TEXT)}`;
    wa.target = "_blank";
    wa.rel = "noopener";
    wa.setAttribute("aria-label", "Escribinos por WhatsApp");
    wa.dataset.cta = "flotante";
    wa.innerHTML = '<svg viewBox="0 0 32 32" aria-hidden="true" fill="currentColor"><path d="M16.04 3C8.86 3 3.04 8.82 3.04 16c0 2.3.6 4.54 1.74 6.5L3 29l6.68-1.75A12.94 12.94 0 0 0 16.04 29C23.2 29 29 23.18 29 16S23.2 3 16.04 3Zm0 23.6c-2 0-3.95-.54-5.65-1.55l-.4-.24-3.97 1.04 1.06-3.87-.26-.4A10.56 10.56 0 0 1 5.44 16c0-5.84 4.76-10.6 10.6-10.6 5.83 0 10.56 4.76 10.56 10.6 0 5.84-4.73 10.6-10.56 10.6Zm5.8-7.94c-.32-.16-1.88-.93-2.17-1.03-.29-.11-.5-.16-.71.16-.21.32-.82 1.03-1 1.24-.19.21-.37.24-.69.08-.32-.16-1.34-.5-2.55-1.58-.94-.84-1.58-1.88-1.76-2.2-.19-.32-.02-.49.14-.65.14-.14.32-.37.48-.56.16-.19.21-.32.32-.53.1-.21.05-.4-.03-.56-.08-.16-.71-1.71-.98-2.34-.26-.62-.52-.53-.71-.54h-.61c-.21 0-.56.08-.85.4-.29.32-1.11 1.09-1.11 2.65s1.14 3.08 1.3 3.29c.16.21 2.24 3.42 5.43 4.8.76.33 1.35.52 1.81.67.76.24 1.45.21 2 .13.61-.09 1.88-.77 2.14-1.51.27-.74.27-1.38.19-1.51-.08-.13-.29-.21-.61-.37Z"/></svg>';
    document.body.appendChild(wa);
  }
  if (document.querySelector("form[data-contact-form]")) document.body.classList.add("has-form");
  // Si la página ya muestra el mapa grande, no se repite en el footer
  if (document.querySelector(".map-frame")) document.body.classList.add("has-map");

  // ── Página de gracias: conversión ─────────────────────
  // Solo cuenta si se llegó desde un envío real del formulario (no al recargar ni al entrar directo).
  if (document.body.dataset.page === "gracias") {
    let lead = null;
    try { lead = JSON.parse(sessionStorage.getItem("rs_lead") || "null"); sessionStorage.removeItem("rs_lead"); } catch { /* sin storage */ }
    if (lead && Date.now() - lead.t < 30 * 60 * 1000) track("muchas_gracias_contacto", { interes: lead.interes || "" });
  }

  // ── Formulario de contacto ────────────────────────────
  const form = document.querySelector("form[data-contact-form]");
  if (!form) return;
  const status = form.querySelector(".form-status");
  const params = new URLSearchParams(location.search);
  const interes = params.get("interes");
  if (interes && form.interes) form.interes.value = interes;

  const messages = {
    nombre: "Escribí tu nombre.",
    email: "Escribí un email válido, por ejemplo nombre@empresa.com.",
    interes: "Elegí sobre qué querés consultar.",
    mensaje: "Contanos brevemente qué necesitás.",
    consentimiento: "Necesitamos tu consentimiento para responderte.",
  };

  function validate() {
    let firstInvalid = null;
    for (const name of Object.keys(messages)) {
      const input = form.elements[name];
      if (!input) continue;
      const ok = input.type === "checkbox" ? input.checked : input.checkValidity() && input.value.trim() !== "";
      input.setAttribute("aria-invalid", String(!ok));
      const err = document.getElementById(`${name}-error`);
      if (err) err.textContent = ok ? "" : messages[name];
      if (!ok && !firstInvalid) firstInvalid = input;
    }
    return firstInvalid;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    status.className = "form-status";
    const invalid = validate();
    if (invalid) { invalid.focus(); return; }

    const button = form.querySelector('button[type="submit"]');
    const label = button.textContent;
    button.disabled = true;
    button.textContent = "Enviando…";
    let sent = false;
    try {
      const data = Object.fromEntries(new FormData(form).entries());
      data.pagina = location.pathname;
      const res = await fetch(form.action, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "No pudimos enviar tu consulta.");
      try { sessionStorage.setItem("rs_lead", JSON.stringify({ interes: data.interes, t: Date.now() })); } catch { /* sin storage */ }
      form.reset();
      sent = true;
      location.assign("/contacto/gracias/");
    } catch (err) {
      status.textContent = `${err.message} Probá de nuevo o escribinos a info@redesoft.com.ar.`;
      status.className = "form-status is-error";
    } finally {
      if (!sent) {
        button.disabled = false;
        button.textContent = label;
        status.focus();
      }
    }
  });
})();
