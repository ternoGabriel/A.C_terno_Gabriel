/* catalogo filtros visibles filtros adicionales y visor de imagen */
(() => {
  const TG = window.TG;

  const igual = (a, b) =>
    String(a || "").trim().toLowerCase() === String(b || "").trim().toLowerCase();

  /* colores iguales a agregar producto */
  const COLORES = TG.COLORES_BASE;

  /* tallas por grupo */
  const CLAVES_TALLA = ["nino", "estandar", "saco", "unica"];
  const GRUPOS_TALLA = Object.fromEntries(
    TG.TALLAS_GRUPOS.map(([nombre, tallas], i) => [
      CLAVES_TALLA[i],
      [nombre, tallas.map((v) => [v === "Talla Única" ? "UNICA" : v, v])],
    ]),
  );
  const esUnica = (talla) =>
    /^\s*(talla\s*)?([úu]nic[ao]|u)\s*$/i.test(String(talla || ""));
  const tallaCoincide = (talla, grupo, valor) => {
    if (grupo === "unica") return esUnica(talla);
    if (valor) return igual(talla, valor);
    return GRUPOS_TALLA[grupo][1].some(([v]) => igual(talla, v));
  };

  TG.catalogoFiltros = () => {
    const $ = (id) => document.getElementById(id);
    const selPrenda = $("fPrenda"),
      selCategoria = $("fCategoria"),
      selTallaGrupo = $("fTallaGrupo"),
      selTalla = $("fTalla"),
      selEstilo = $("fEstilo"),
      selTipo = $("fTipo");
    const btnPrecio = $("precioToggle"),
      panelPrecio = $("precioPanel"),
      inMin = $("precioMin"),
      inMax = $("precioMax"),
      errPrecio = $("precioError"),
      resumenPrecio = $("precioResumen");
    const btnExtra = $("btnFiltrosAdicionales"),
      panelExtra = $("extraPanel"),
      contador = $("extraCount");
    const lista = $("colorGrid"),
      resumenColor = $("colorResumen"),
      resumenComp = $("compResumen");
    const checks = [...document.querySelectorAll('input[name="componente"]')];
    const sobre = [...document.querySelectorAll('input[name="precioSobre"]')];
    const escuchas = [];
    const cambio = () => {
      resumenes();
      escuchas.forEach((f) => f());
    };

    /* listas de opciones */
    TG.llenarSelect(selEstilo, TG.OPCIONES.estilo, "Todos");
    /* talla segun el grupo elegido */
    const mostrarTallas = () => {
      const g = selTallaGrupo.value;
      selTalla.hidden = !g || g === "unica";
      selTalla.innerHTML = g && g !== "unica"
        ? '<option value="">Todas las de ' + TG.esc(GRUPOS_TALLA[g][0]) + "</option>" +
          GRUPOS_TALLA[g][1]
            .map(([v, n]) => '<option value="' + TG.esc(v) + '">' + TG.esc(n) + "</option>")
            .join("")
        : "";
    };
    selTallaGrupo.addEventListener("change", () => {
      mostrarTallas();
      cambio();
    });
    lista.innerHTML = COLORES.map(
      ([nombre, hex], i) =>
        '<button type="button" class="opcion-lista" data-i="' +
        i +
        '" aria-pressed="false"><i class="punto" style="background:' +
        hex +
        '"></i><span>' +
        TG.esc(nombre) +
        '</span><b class="marca" aria-hidden="true">✓</b></button>',
    ).join("");
    const bolitas = [...lista.querySelectorAll(".opcion-lista")];
    const coloresMarcados = () =>
      bolitas.filter((b) => b.getAttribute("aria-pressed") === "true");

    /* precio solo numeros maximo 4 digitos */
    const rangoPrecio = () => {
      const min = inMin.value === "" ? null : Number(inMin.value);
      const max = inMax.value === "" ? null : Number(inMax.value);
      const invalido = min !== null && max !== null && min > max;
      return { min, max, invalido };
    };
    [inMin, inMax].forEach((el) =>
      el.addEventListener("input", () => {
        const limpio = el.value.replace(/\D/g, "").slice(0, 4);
        if (limpio !== el.value) el.value = limpio;
        cambio();
      }),
    );
    sobre.forEach((r) => r.addEventListener("change", cambio));

    /* resumenes de los botones desplegables */
    function resumenes() {
      const { min, max, invalido } = rangoPrecio();
      errPrecio.hidden = !invalido;
      errPrecio.textContent = invalido
        ? "El mínimo no puede ser mayor que el máximo"
        : "";
      inMin.classList.toggle("tg-invalid", invalido);
      inMax.classList.toggle("tg-invalid", invalido);
      resumenPrecio.textContent =
        min === null && max === null
          ? "Todos"
          : min !== null && max !== null
            ? "S/ " + min + " – S/ " + max
            : min !== null
              ? "Desde S/ " + min
              : "Hasta S/ " + max;

      const cols = coloresMarcados();
      resumenColor.textContent = !cols.length
        ? "Todos"
        : cols.length <= 2
          ? cols.map((b) => COLORES[b.dataset.i][0]).join(", ")
          : cols.length + " colores";
      const comps = checks.filter((c) => c.checked).map((c) => c.value);
      resumenComp.textContent = !comps.length
        ? "Todos"
        : comps.length <= 2
          ? comps.join(", ")
          : comps.length + " componentes";

      const activos =
        (selTipo.value ? 1 : 0) +
        (selEstilo.value ? 1 : 0) +
        (cols.length ? 1 : 0) +
        (comps.length ? 1 : 0);
      contador.hidden = !activos;
      contador.textContent = activos;
    }

    /* paneles que se abren y se cierran */
    const alternar = (boton, panel, abrir) => {
      const v = abrir === undefined ? panel.hidden : abrir;
      panel.hidden = !v;
      boton.setAttribute("aria-expanded", v ? "true" : "false");
    };
    const flotantes = [
      [btnPrecio, panelPrecio],
      [$("colorToggle"), $("colorPanel")],
      [$("compToggle"), $("compPanel")],
    ];
    const cerrarFlotantes = (menos) =>
      flotantes.forEach(([b, p]) => p !== menos && alternar(b, p, false));
    flotantes.forEach(([b, p]) =>
      b.addEventListener("click", () => {
        const abrir = p.hidden;
        cerrarFlotantes(p);
        alternar(b, p, abrir);
      }),
    );
    btnExtra.addEventListener("click", () => {
      cerrarFlotantes();
      alternar(btnExtra, panelExtra);
    });
    document.addEventListener("click", (e) => {
      if (!e.target.closest(".filter-group.tiene-panel")) cerrarFlotantes();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") cerrarFlotantes();
    });

    /* eventos de los filtros */
    [selPrenda, selCategoria, selTalla, selEstilo, selTipo].forEach((s) =>
      s.addEventListener("change", cambio),
    );
    checks.forEach((c) => c.addEventListener("change", cambio));
    lista.addEventListener("click", (e) => {
      const b = e.target.closest(".opcion-lista");
      if (!b) return;
      b.setAttribute(
        "aria-pressed",
        b.getAttribute("aria-pressed") === "true" ? "false" : "true",
      );
      cambio();
    });

    /* resultado */
    const pasa = (p) => {
      if (
        selPrenda.value &&
        TG.categoriaPrenda(p).toLowerCase() !== selPrenda.value.toLowerCase()
      )
        return false;
      if (selCategoria.value && !igual(p.categoria, selCategoria.value))
        return false;
      if (
        selTallaGrupo.value &&
        !tallaCoincide(p.talla, selTallaGrupo.value, selTalla.value)
      )
        return false;

      const { min, max, invalido } = rangoPrecio();
      if (!invalido && (min !== null || max !== null)) {
        const campo = (sobre.find((r) => r.checked) || {}).value || "precioAlquiler";
        const precio = Number(p[campo]) || 0;
        if (min !== null && precio < min) return false;
        if (max !== null && precio > max) return false;
      }

      if (selEstilo.value && !igual(p.estilo, selEstilo.value)) return false;
      if (selTipo.value && p.tipo !== selTipo.value) return false;
      const cols = coloresMarcados();
      if (cols.length && !cols.some((b) => COLORES[b.dataset.i][2].test(p.color || "")))
        return false;
      const comps = checks.filter((c) => c.checked).map((c) => c.value);
      return TG.pasaFiltros(p, { componentes: comps });
    };

    const reset = () => {
      [selPrenda, selCategoria, selTallaGrupo, selEstilo, selTipo].forEach((s) => {
        s.value = "";
      });
      mostrarTallas();
      checks.forEach((c) => {
        c.checked = false;
      });
      bolitas.forEach((b) => b.setAttribute("aria-pressed", "false"));
      inMin.value = "";
      inMax.value = "";
      if (sobre[0]) sobre[0].checked = true;
      cambio();
    };

    mostrarTallas();
    resumenes();
    return { pasa, reset, onChange: (f) => escuchas.push(f) };
  };

  /* visor de imagen completa */
  TG.verImagen = (src, titulo) => {
    if (!src) return;
    const fondo = document.createElement("div");
    fondo.className = "tg-visor";
    fondo.setAttribute("role", "dialog");
    fondo.setAttribute("aria-modal", "true");
    fondo.setAttribute("aria-label", titulo || "Imagen de la prenda");
    fondo.innerHTML =
      '<button type="button" class="tg-visor-cerrar" aria-label="Cerrar imagen">×</button>' +
      "<figure><img alt=\"\">" +
      (titulo ? "<figcaption></figcaption>" : "") +
      "</figure>";
    const img = fondo.querySelector("img");
    img.src = src;
    img.alt = titulo || "";
    const cap = fondo.querySelector("figcaption");
    if (cap) cap.textContent = titulo;
    document.body.appendChild(fondo);
    document.body.classList.add("tg-visor-abierto");
    const cerrar = () => {
      fondo.remove();
      document.body.classList.remove("tg-visor-abierto");
      document.removeEventListener("keydown", esc);
    };
    const esc = (e) => e.key === "Escape" && cerrar();
    document.addEventListener("keydown", esc);
    fondo.addEventListener("click", (e) => {
      if (e.target !== img) cerrar();
    });
    fondo.querySelector(".tg-visor-cerrar").focus();
  };
})();
