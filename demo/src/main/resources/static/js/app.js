(() => {
  const init = () => {
    document
      .querySelectorAll('[data-action="collapse"]')
      .forEach((el) =>
        el.addEventListener("click", () =>
          document
            .querySelector(".app-shell")
            ?.classList.toggle("is-collapsed"),
        ),
      );
    document
      .querySelectorAll('[data-action="mobile-menu"]')
      .forEach((el) =>
        el.addEventListener("click", () =>
          document.body.classList.toggle("mobile-menu-open"),
        ),
      );
    document
      .querySelectorAll(".sidebar nav a, .logout-link")
      .forEach((link) =>
        link.addEventListener("click", () =>
          document.body.classList.remove("mobile-menu-open"),
        ),
      );
    /* responsivo el menu tipo cajon se cierra al tocar fuera */
    const cerrarMenuMovil = () =>
      document.body.classList.remove("mobile-menu-open");
    document.addEventListener("click", (e) => {
      if (!document.body.classList.contains("mobile-menu-open")) return;
      if (
        !e.target.closest(".sidebar") &&
        !e.target.closest('[data-action="mobile-menu"]')
      )
        cerrarMenuMovil();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") cerrarMenuMovil();
    });
    const mqMovil = window.matchMedia("(max-width: 766px)");
    const alCambiarPantalla = () => {
      cerrarMenuMovil();
      if (mqMovil.matches)
        document.querySelector(".app-shell")?.classList.remove("is-collapsed");
    };
    mqMovil.addEventListener
      ? mqMovil.addEventListener("change", alCambiarPantalla)
      : mqMovil.addListener(alCambiarPantalla);
    alCambiarPantalla();
    const syncActiveNav = () => {
      const path = location.pathname.replace(/\/$/, "") || "/";
      document.querySelectorAll(".sidebar nav a").forEach((link) => {
        const href =
          new URL(link.href, location.origin).pathname.replace(/\/$/, "") ||
          "/";
        link.classList.toggle(
          "active",
          href === path || (path.startsWith(href + "/") && href !== "/"),
        );
      });
    };
    syncActiveNav();
    window.addEventListener("pageshow", syncActiveNav);
    window.addEventListener("popstate", syncActiveNav);
    document
      .querySelectorAll('[data-action="notify"]')
      .forEach((el) => el.addEventListener("click", openNotifications));
    document.querySelectorAll("[data-current-date]").forEach((el) => {
      el.textContent = TGDateLabel();
    });
    document.querySelectorAll("[data-toggle-active]").forEach((el) =>
      el.addEventListener("click", () => {
        const parent = el.parentElement;
        parent
          ?.querySelectorAll("[data-toggle-active]")
          .forEach((b) => b.classList.remove("active"));
        el.classList.add("active");
      }),
    );
    document.querySelectorAll("[data-table-search]").forEach((input) =>
      input.addEventListener("input", () => {
        const q = input.value.toLowerCase();
        const table =
          input.closest(".card")?.querySelector("tbody") ||
          document.querySelector("tbody");
        table
          ?.querySelectorAll("tr")
          .forEach(
            (row) => (row.hidden = !row.textContent.toLowerCase().includes(q)),
          );
      }),
    );
    document.querySelectorAll("[data-product-search]").forEach((input) =>
      input.addEventListener("input", () => {
        const q = input.value.toLowerCase();
        document
          .querySelectorAll(".product-card")
          .forEach(
            (p) => (p.hidden = !p.textContent.toLowerCase().includes(q)),
          );
      }),
    );
    document.querySelectorAll("[data-report]").forEach((b) =>
      b.addEventListener("click", () => {
        document
          .querySelectorAll("[data-report]")
          .forEach((x) => x.classList.remove("active"));
        b.classList.add("active");
      }),
    );
    document.querySelectorAll("[data-category]").forEach((b) =>
      b.addEventListener("click", () => {
        document
          .querySelectorAll("[data-category]")
          .forEach((x) => x.classList.remove("active"));
        b.classList.add("active");
        const c = b.dataset.category;
        document
          .querySelectorAll("[data-product-category]")
          .forEach(
            (p) =>
              (p.hidden =
                c !== "Todos" &&
                p.dataset.productCategory.toLowerCase() !== c.toLowerCase()),
          );
      }),
    );
  };
  function TGDateLabel() {
    const d = new Date(),
      m = [
        "Ene",
        "Feb",
        "Mar",
        "Abr",
        "May",
        "Jun",
        "Jul",
        "Ago",
        "Sep",
        "Oct",
        "Nov",
        "Dic",
      ];
    return (
      String(d.getDate()).padStart(2, "0") +
      " " +
      m[d.getMonth()] +
      " " +
      d.getFullYear()
    );
  }
  function safeName(c) {
    return window.TG?.nombre
      ? TG.esc(TG.nombre(c) || "Cliente sin nombre")
      : ((c?.nombres || "") + " " + (c?.apellidos || "")).trim() ||
          "Cliente sin nombre";
  }
  function dayDiff(iso) {
    if (!iso) return null;
    const a = new Date(TG.hoyISO() + "T00:00:00"),
      b = new Date(String(iso).slice(0, 10) + "T00:00:00");
    return Math.round((b - a) / 86400000);
  }
  function dueLabel(iso) {
    const n = dayDiff(iso);
    if (n === null) return "Sin fecha registrada";
    if (n < 0)
      return (
        '<span class="tg-overdue">Vencido hace ' +
        Math.abs(n) +
        " día" +
        (Math.abs(n) === 1 ? "" : "s") +
        "</span>"
      );
    if (n === 0) return '<span class="tg-alert">Termina hoy</span>';
    return (
      '<span class="tg-alert">Faltan ' +
      n +
      " día" +
      (n === 1 ? "" : "s") +
      "</span>"
    );
  }
  let cerrarNotificaciones = null;
  async function openNotifications() {
    if (cerrarNotificaciones) cerrarNotificaciones();
    document.querySelector(".tg-notify-backdrop")?.remove();
    document.querySelector(".tg-notify-panel")?.remove();
    const isAdmin = location.pathname.startsWith("/admin");
    const backdrop = document.createElement("div");
    backdrop.className = "tg-notify-backdrop";
    const panel = document.createElement("section");
    panel.className = "tg-notify-panel";
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-modal", "true");
    panel.innerHTML =
      '<div class="tg-notify-head"><div><h2>Notificaciones</h2><p class="tg-notify-sub">Plazos que requieren atención · ' +
      TGDateLabel() +
      '</p></div><button type="button" class="tg-notify-close" aria-label="Cerrar notificaciones">×</button></div><div class="tg-notify-body">Cargando información…</div>';
    document.body.append(backdrop, panel);
    /* en pantallas pequenas el panel ocupa casi todo el ancho */
    const bloquear = window.matchMedia("(max-width: 766px)").matches,
      overflowPrevio = document.body.style.overflow;
    if (bloquear) document.body.style.overflow = "hidden";
    const alTecla = (e) => {
      if (e.key === "Escape") close();
    };
    const close = () => {
      backdrop.remove();
      panel.remove();
      document.removeEventListener("keydown", alTecla);
      document.body.style.overflow = overflowPrevio;
      if (cerrarNotificaciones === close) cerrarNotificaciones = null;
    };
    cerrarNotificaciones = close;
    document.addEventListener("keydown", alTecla);
    backdrop.addEventListener("click", close);
    const botonX = panel.querySelector(".tg-notify-close");
    botonX.addEventListener("click", close);
    botonX.focus({ preventScroll: true });
    try {
      const [boletas, confs] = await Promise.all([
        TG.boletas(),
        TG.get("/api/confecciones"),
      ]);
      const body = panel.querySelector(".tg-notify-body");
      if (isAdmin) {
        const active = boletas.filter((b) => b.estado !== "Anulada");
        const groups = [
          { name: "Compra", types: ["Venta", "Compra"] },
          { name: "Confección", types: ["Confección"] },
          { name: "Alquiler", types: ["Alquiler"] },
        ]
          .map((g) => ({
            name: g.name,
            count: active.filter((b) => g.types.includes(b.tipo)).length,
            total: active
              .filter((b) => g.types.includes(b.tipo))
              .reduce((s, b) => s + (Number(b.monto) || 0), 0),
          }))
          .sort((a, b) => b.count - a.count || b.total - a.total)
          .slice(0, 3);
        body.innerHTML =
          "<h3>Top 3 de operaciones</h3>" +
          groups
            .map(
              (g, i) =>
                '<div class="tg-rank-row"><span><strong>#' +
                (i + 1) +
                "</strong> &nbsp;" +
                TG.esc(g.name) +
                "</span><span>" +
                g.count +
                " operación" +
                (g.count === 1 ? "" : "es") +
                '<br><span class="tg-meta">' +
                TG.money(g.total) +
                "</span></span></div>",
            )
            .join("") +
          '<p class="tg-notify-sub">Ordenado por cantidad de boletas vigentes; el importe se muestra como referencia.</p>';
        return;
      }
      const hoy = TG.hoyISO();
      const rent = boletas
        .filter(
          (b) =>
            b.tipo === "Alquiler" &&
            b.estado === "Vigente" &&
            b.fechaDevolucion,
        )
        .map((b) => ({ ...b, _date: b.fechaDevolucion }))
        .sort((a, b) => dayDiff(a._date) - dayDiff(b._date))
        .slice(0, 4);
      const fitting = confs
        .filter((c) => c.estado !== "Entregada" && c.primeraPrueba)
        .map((c) => ({ ...c, _date: c.primeraPrueba }))
        .sort((a, b) => dayDiff(a._date) - dayDiff(b._date))
        .slice(0, 4);
      const delivery = confs
        .filter((c) => c.estado !== "Entregada" && c.entregaFinal)
        .map((c) => ({ ...c, _date: c.entregaFinal }))
        .sort((a, b) => dayDiff(a._date) - dayDiff(b._date))
        .slice(0, 4);
      const block = (title, items, kind) =>
        "<h3>" +
        title +
        "</h3>" +
        (items.length
          ? items
              .map((x) => {
                const client = safeName(x.cliente),
                  code =
                    kind === "rent"
                      ? x.numero || "Boleta #" + x.id
                      : x.ticket || "Ticket #" + x.id;
                const garment =
                  kind === "rent" && x.prenda
                    ? '<div class="tg-meta">Prenda: ' +
                      TG.esc(x.prenda.diseno || x.prenda.codigo || "—") +
                      "</div>"
                    : "";
                return (
                  '<div class="tg-notify-item"><strong>' +
                  client +
                  '</strong><div class="tg-meta">' +
                  (kind === "rent" ? "Boleta: " : "Ticket: ") +
                  TG.esc(code) +
                  "</div>" +
                  garment +
                  "<div>" +
                  dueLabel(x._date) +
                  '</div><div class="tg-meta">Fecha límite: ' +
                  TG.fecha(x._date) +
                  "</div></div>"
                );
              })
              .join("")
          : '<div class="tg-notify-empty">No hay plazos próximos ni vencidos.</div>');
      body.innerHTML =
        block("Alquileres · devolución", rent, "rent") +
        block("Confección · primera prueba", fitting, "fit") +
        block("Confección · entrega final", delivery, "delivery");
    } catch (e) {
      panel.querySelector(".tg-notify-body").innerHTML =
        '<div class="tg-notify-empty">No se pudieron cargar las notificaciones. ' +
        TG.esc(e.message || "") +
        "</div>";
    }
  }
  function showToast(message) {
    const box = document.getElementById("toast"),
      label = document.getElementById("toastMessage");
    if (box) {
      if (label) label.textContent = message;
      box.hidden = false;
      window.setTimeout(() => {
        box.hidden = true;
      }, 2800);
    } else alert(message);
  }
  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", init);
  else init();
})();

/* escala continua de la interfaz */
(() => {
  const aplicar = () => {
    const w = window.innerWidth;
    const z = w > 1440 ? Math.min(2.2, 1 + (w - 1440) * 0.0005) : 1;
    document.documentElement.style.setProperty("--ui-zoom", z.toFixed(3));
  };
  aplicar();
  let t = 0;
  window.addEventListener("resize", () => {
    cancelAnimationFrame(t);
    t = requestAnimationFrame(aplicar);
  });
})();

/* filtros letra gris mientras estan en su valor por defecto */
(() => {
  const SEL =
    ".boleta-filtros select, .boleta-filtros input, .page-admin-reportes .form-grid select, .page-admin-reportes .form-grid input, .inventory-filters select, .inventory-filters input, .pr-filtros select, .pr-filtros input";
  const marcar = (el) => {
    const vacio =
      el.tagName === "SELECT" ? el.selectedIndex <= 0 : !el.value;
    el.classList.toggle("tg-vacio", vacio);
  };
  const iniciar = () => {
    document.querySelectorAll(SEL).forEach((el) => {
      marcar(el);
      ["input", "change"].forEach((ev) =>
        el.addEventListener(ev, () => marcar(el)),
      );
    });
  };
  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", iniciar);
  else iniciar();
})();

/* filtro de color circulo con el color elegido */
(() => {
  const iniciar = () => {
    document.querySelectorAll('select[data-filter="color"]').forEach((sel) => {
      const grupo = sel.parentElement;
      if (!grupo || grupo.querySelector(".color-dot-filtro")) return;
      grupo.style.position = "relative";
      const punto = document.createElement("i");
      punto.className = "color-dot color-dot-filtro";
      punto.hidden = true;
      grupo.appendChild(punto);
      const act = () => {
        const txt = sel.value && sel.selectedIndex > 0 ? sel.value : "";
        punto.hidden = !txt;
        sel.classList.toggle("con-punto", !!txt);
        if (txt && window.TG && TG.colorCss)
          punto.style.background = TG.colorCss(txt);
      };
      sel.addEventListener("change", act);
      new MutationObserver(act).observe(sel, { childList: true });
      act();
    });
  };
  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", iniciar);
  else iniciar();
})();

/* calendario propio */
(() => {
  const MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
  const DIAS = ["L", "M", "M", "J", "V", "S", "D"];
  let pop = null;
  let input = null;
  let vista = new Date();

  const pad = (n) => String(n).padStart(2, "0");
  const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const leer = (v) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v || "");
    return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null;
  };

  const cerrar = () => {
    if (pop) pop.remove();
    pop = null;
    input = null;
  };

  const posicionar = () => {
    if (!pop || !input) return;
    const r = input.getBoundingClientRect();
    const ancho = pop.offsetWidth;
    const alto = pop.offsetHeight;
    const margen = 8;
    let top = r.bottom + 6;
    if (top + alto > window.innerHeight - margen) {
      const arriba = r.top - alto - 6;
      top = arriba >= margen ? arriba : Math.max(margen, window.innerHeight - alto - margen);
    }
    let left = Math.min(Math.max(margen, r.left), window.innerWidth - ancho - margen);
    pop.style.top = `${top}px`;
    pop.style.left = `${left}px`;
  };

  const dibujar = (direccion) => {
    const sel = leer(input.value);
    const hoy = new Date();
    const min = leer(input.min);
    const max = leer(input.max);
    const y = vista.getFullYear();
    const m = vista.getMonth();
    const primero = new Date(y, m, 1);
    const desfase = (primero.getDay() + 6) % 7;
    const dias = new Date(y, m + 1, 0).getDate();
    let html = `<div class="tg-cal-head">
      <button type="button" class="tg-cal-nav" data-nav="-1" aria-label="Mes anterior">‹</button>
      <strong>${MESES[m]} ${y}</strong>
      <button type="button" class="tg-cal-nav" data-nav="1" aria-label="Mes siguiente">›</button>
    </div><div class="tg-cal-body${direccion ? " slide-" + (direccion > 0 ? "next" : "prev") : ""}">
    <div class="tg-cal-week">${DIAS.map((d) => `<span>${d}</span>`).join("")}</div><div class="tg-cal-grid">`;
    for (let i = 0; i < desfase; i++) html += "<i></i>";
    for (let d = 1; d <= dias; d++) {
      const f = new Date(y, m, d);
      const off = (min && f < min) || (max && f > max);
      const cls = ["tg-cal-day"];
      if (sel && iso(f) === iso(sel)) cls.push("sel");
      if (iso(f) === iso(hoy)) cls.push("hoy");
      html += `<button type="button" class="${cls.join(" ")}" data-d="${iso(f)}"${off ? " disabled" : ""}>${d}</button>`;
    }
    html += `</div></div>`;
    pop.innerHTML = html;
    posicionar();
  };

  const poner = (valor) => {
    input.value = valor;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
    cerrar();
  };

  const abrir = (el) => {
    if (input === el && pop) return cerrar();
    cerrar();
    input = el;
    vista = leer(el.value) || new Date();
    vista = new Date(vista.getFullYear(), vista.getMonth(), 1);
    pop = document.createElement("div");
    pop.className = "tg-cal";
    pop.setAttribute("role", "dialog");
    document.body.appendChild(pop);
    pop.addEventListener("click", (e) => {
      const b = e.target.closest("button");
      if (!b) return;
      if (b.dataset.nav) {
        vista = new Date(vista.getFullYear(), vista.getMonth() + Number(b.dataset.nav), 1);
        dibujar(Number(b.dataset.nav));
      } else if (b.dataset.d) poner(b.dataset.d);
    });
    dibujar(0);
  };

  document.addEventListener("click", (e) => {
    const icono = e.target.closest(".calendar-icon, .date-icon");
    if (icono) {
      const campo = icono.parentElement.querySelector('input[type="date"]');
      if (campo) { e.preventDefault(); abrir(campo); return; }
    }
    const campo = e.target.closest('input[type="date"]');
    if (campo) { e.preventDefault(); abrir(campo); return; }
    if (pop && !pop.contains(e.target)) cerrar();
  }, true);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") cerrar(); });
  window.addEventListener("resize", posicionar);
  window.addEventListener("scroll", posicionar, true);
})();

/* ventana con solo la imagen */
window.tgVerImagen = (src, alt) => {
  const fondo = document.createElement("div");
  fondo.className = "tg-img-fondo";
  fondo.innerHTML =
    '<figure class="tg-img-caja"><button type="button" class="tg-img-x" aria-label="Cerrar">×</button><img alt=""></figure>';
  const img = fondo.querySelector("img");
  img.src = src;
  img.alt = alt || "";
  const cerrar = () => {
    fondo.remove();
    document.removeEventListener("keydown", esc);
  };
  const esc = (e) => e.key === "Escape" && cerrar();
  fondo.addEventListener("click", (e) => {
    if (e.target === fondo || e.target.closest(".tg-img-x")) cerrar();
  });
  document.addEventListener("keydown", esc);
  document.body.appendChild(fondo);
};

/* filtro de color lista con un circulo */
(() => {
  const construir = (sel) => {
    if (sel.dataset.tgColor) return;
    sel.dataset.tgColor = "1";
    const caja = document.createElement("div");
    caja.className = "tg-color";
    sel.parentNode.insertBefore(caja, sel);
    caja.appendChild(sel);
    sel.classList.add("tg-color-oculto");
    const boton = document.createElement("button");
    boton.type = "button";
    boton.className = "tg-color-btn filter-select";
    boton.setAttribute("aria-haspopup", "listbox");
    const lista = document.createElement("ul");
    lista.className = "tg-color-lista";
    lista.setAttribute("role", "listbox");
    lista.hidden = true;
    caja.append(boton, lista);

    const css = (txt, indice) =>
      indice <= 0 || /^otros?\b/i.test(txt) || /^todos/i.test(txt)
        ? "conic-gradient(#b3262d,#d9a52b,#2f6b4a,#1f4e9c,#6d1a2d,#b3262d)"
        : window.TG && TG.colorCss
          ? TG.colorCss(txt)
          : "#e5e7eb";
    const punto = (txt, indice) =>
      '<i class="tg-color-punto" style="background:' + css(txt, indice) + '"></i>';
    const pintar = () => {
      const op = [...sel.options];
      lista.innerHTML = op
        .map(
          (o, i) =>
            '<li role="option" data-i="' + i + '"' +
            (i === sel.selectedIndex ? ' aria-selected="true"' : "") + ">" +
            punto(o.textContent, i) + "<span>" + o.textContent.trim() + "</span></li>",
        )
        .join("");
      const act = op[sel.selectedIndex] || op[0];
      boton.innerHTML = act
        ? punto(act.textContent, sel.selectedIndex) +
          "<span>" + act.textContent.trim() + '</span><b aria-hidden="true">▾</b>'
        : "";
    };
    const cerrar = () => {
      lista.hidden = true;
      caja.classList.remove("abierto", "arriba");
    };
    const abrir = () => {
      lista.hidden = false;
      caja.classList.add("abierto");
      /* si abajo no cabe la lista se abre hacia arriba */
      const r = boton.getBoundingClientRect();
      const alto = Math.min(lista.scrollHeight, 260);
      caja.classList.toggle("arriba", r.bottom + alto + 12 > window.innerHeight && r.top > alto + 12);
    };
    boton.addEventListener("click", () => (lista.hidden ? abrir() : cerrar()));
    lista.addEventListener("click", (e) => {
      const li = e.target.closest("li");
      if (!li) return;
      sel.selectedIndex = Number(li.dataset.i);
      sel.dispatchEvent(new Event("input", { bubbles: true }));
      sel.dispatchEvent(new Event("change", { bubbles: true }));
      pintar();
      cerrar();
    });
    document.addEventListener("click", (e) => {
      if (!caja.contains(e.target)) cerrar();
    });
    document.addEventListener("keydown", (e) => e.key === "Escape" && cerrar());
    new MutationObserver(pintar).observe(sel, { childList: true });
    sel.addEventListener("change", pintar);
    pintar();
  };
  const iniciar = () =>
    document.querySelectorAll('select[data-filter="color"]').forEach(construir);
  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", iniciar);
  else iniciar();
})();
