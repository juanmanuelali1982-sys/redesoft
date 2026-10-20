// Redesoft — interacción del sitio (sin dependencias)
(function () {
  "use strict";
  window.dataLayer = window.dataLayer || [];
  const track = (event, params) => window.dataLayer.push(Object.assign({ event }, params || {}));

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

  // ── Eventos de CTA para GA4 / GTM ─────────────────────
  document.addEventListener("click", (e) => {
    const el = e.target.closest("[data-cta]");
    if (el) track("cta_click", { cta_name: el.dataset.cta, cta_text: el.textContent.trim(), page_path: location.pathname });
    const out = e.target.closest('a[href^="mailto:"], a[href^="tel:"], a[href*="wa.me"], a[href*="maps"]');
    if (out) track("contact_click", { channel: out.href.split(":")[0].replace("https", "link"), page_path: location.pathname });
  });

  // ── Formulario de contacto ────────────────────────────
  const form = document.querySelector("form[data-contact-form]");
  if (!form) return;
  const status = form.querySelector(".form-status");
  const params = new URLSearchParams(location.search);
  const interes = params.get("interes");
  if (interes && form.interes) form.interes.value = interes;

  let started = false;
  form.addEventListener("input", () => {
    if (!started) { started = true; track("form_start", { form_name: "contacto" }); }
  });

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
    try {
      const data = Object.fromEntries(new FormData(form).entries());
      data.pagina = location.pathname;
      const res = await fetch(form.action, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "No pudimos enviar tu consulta.");
      form.reset();
      status.textContent = "Recibimos tu consulta. El equipo de Redesoft te va a responder por email para coordinar el próximo paso.";
      status.className = "form-status is-ok";
      track("generate_lead", { form_name: "contacto", interes: data.interes });
    } catch (err) {
      status.textContent = `${err.message} Probá de nuevo o escribinos a info@redesoft.com.ar.`;
      status.className = "form-status is-error";
    } finally {
      button.disabled = false;
      button.textContent = label;
      status.focus();
    }
  });
})();
