/* base compartida de comprar y alquilar */
window.CA = (() => {
  const KEY = "ternoCompraAlquiler";

  /* sesion */
  class Sesion {
    constructor(key) {
      this.key = key;
      this.CLAVES = {
        2: [
          "nombres",
          "apellidos",
          "telefono",
          "direccion",
          "correo",
          "fechaRecojo",
          "fechaDevolucion",
          "cobrarDosDias",
        ],
        3: ["aceptaTerminos"],
        4: ["metodo", "entregado", "vuelto", "total"],
        5: ["boletaId"],
      };
    }

    /* lee los datos guardados */
    leer() {
      try {
        return JSON.parse(sessionStorage.getItem(this.key) || "{}");
      } catch {
        return {};
      }
    }

    /* guarda sin perder lo anterior */
    guardar(data) {
      sessionStorage.setItem(
        this.key,
        JSON.stringify({ ...this.leer(), ...data }),
      );
    }

    /* reemplaza todo el contenido */
    reemplazar(data) {
      sessionStorage.setItem(this.key, JSON.stringify(data));
    }

    /* borra todo y suelta la prenda que estaba elegida */
    borrar() {
      const { prendaId } = this.leer();

      if (prendaId && window.TG && TG.liberarPrenda) {
        TG.liberarPrenda(prendaId);
      }

      sessionStorage.removeItem(this.key);
    }

    /* borra los datos de los pasos posteriores */
    limpiarDesde(n) {
      const s = this.leer();

      for (let p = n; p <= 5; p++) {
        this.CLAVES[p].forEach((k) => delete s[k]);
      }

      this.reemplazar(s);
    }

    /* operacion elegida */
    operacion() {
      return this.leer().operacion || "Alquilar";
    }

    /* dias del alquiler de la fecha de recojo */
    diasAlquiler() {
      const s = this.leer();

      if (!s.fechaRecojo || !s.fechaDevolucion) return 1;

      return Math.max(1, TG.diasEntre(s.fechaRecojo, s.fechaDevolucion));
    }

    /* dias que se cobran */
    diasCobrados() {
      const dias = this.diasAlquiler();

      return this.leer().cobrarDosDias ? Math.max(1, dias - 1) : dias;
    }

    /* precio segun la operacion */
    precioFinal() {
      const s = this.leer();

      if (this.operacion() === "Comprar") return Number(s.precioVenta);

      return (
        Math.round(Number(s.precioAlquiler) * this.diasCobrados() * 100) / 100
      );
    }
  }

  /* cabecera */
  class Cabecera {
    constructor(sesion, paso) {
      this.sesion = sesion;
      this.paso = paso;
      this.alCambiar = () => {};
      this.botones = [
        ...document.querySelectorAll("[data-operation]"),
      ];
    }

    /* marca la pestana activa */
    pintarPestanas(op) {
      this.botones.forEach((btn) => {
        const activo = btn.dataset.operation === op;

        btn.classList.toggle("active", activo);
        btn.style.fontWeight = activo ? "600" : "500";
        btn.style.color = activo ? "#b3820a" : "#344054";
        btn.style.borderBottom = activo
          ? "3px solid #b3820a"
          : "3px solid transparent";
      });
    }

    /* activa las pestanas y bloquea desde el paso 3 */
    iniciar(state) {
      const { sesion, paso } = this;

      this.botones.forEach((b) =>
        b.addEventListener("click", () => {
          if (paso >= 3 || b.dataset.operation === sesion.operacion()) {
            return;
          }

          sesion.guardar({ operacion: b.dataset.operation });
          this.pintarPestanas(b.dataset.operation);
          sesion.limpiarDesde(3);
          this.ajustarPasos();
          this.alCambiar();
        }),
      );

      this.pintarPestanas(sesion.operacion());

      if (!state.operacion) {
        sesion.guardar({ operacion: "Alquilar" });
      }

      if (paso >= 3) {
        this.botones.forEach((b) => {
          b.disabled = true;
          b.style.pointerEvents = "none";
          b.style.cursor = "not-allowed";

          if (b.dataset.operation !== sesion.operacion()) {
            b.style.opacity = ".4";
          }
        });
      }
    }

    /* ajusta el indicador de pasos */
    ajustarPasos() {
      const { sesion, paso } = this;
      const compra = sesion.operacion() === "Comprar";

      const items = [
        ...document.querySelectorAll(".flow-stepper .step-item"),
      ];

      const lineas = [
        ...document.querySelectorAll(".flow-stepper .step-line"),
      ];

      if (items.length < 5) return;

      items[2].style.display = compra ? "none" : "";

      if (lineas[2]) {
        lineas[2].style.display = compra ? "none" : "";
      }

      const visibles = items.filter(
        (i) => i.style.display !== "none",
      );

      visibles.forEach((it, i) => {
        const c = it.querySelector(".step-circle");

        if (c && !c.classList.contains("step-completed")) {
          c.textContent = String(i + 1);
        }
      });

      const total = visibles.length;
      const actual = compra && paso >= 4 ? paso - 1 : paso;

      [
        ...document.querySelectorAll("main span, main p, main div"),
      ]
        .filter(
          (x) =>
            !x.children.length &&
            /^\s*PASO \d DE \d\s*$/.test(x.textContent),
        )
        .forEach((x) => {
          x.textContent = "PASO " + actual + " DE " + total;
        });

      const st = document.querySelector(".flow-stepper");

      if (st) {
        /* con comprar son 4 pasos */
        st.classList.toggle("is-compra", compra);
        st.setAttribute(
          "aria-label",
          "Paso " + actual + " de " + total,
        );
      }
    }
  }

  /* flujo */
  class Flujo {
    constructor(paso) {
      this.paso = paso;
      this.sesion = new Sesion(KEY);
      this.cabecera = new Cabecera(this.sesion, paso);
    }

    /* limpia solo si se entra desde otra pantalla */
    reiniciarSiVieneDeFuera() {
      const tipoNav = performance.getEntriesByType("navigation")[0]
        ?.type;
      let vieneDeFuera = true;

      try {
        const refPath = document.referrer
          ? new URL(document.referrer).pathname
          : "";

        vieneDeFuera = !refPath.startsWith(
          "/empleado/comprar-alquilar",
        );
      } catch {
        vieneDeFuera = true;
      }

      if (tipoNav === "navigate" && vieneDeFuera) {
        this.sesion.borrar();
      }

      if (this.paso === 1 && this.sesion.leer().boletaId) {
        this.sesion.borrar();
      }
    }

    /* guarda y restaura los campos marcados */
    enlazarCampos(state) {
      const { sesion } = this;

      document
        .querySelectorAll("[data-flow-field]")
        .forEach((el) => {
          if (el.type === "checkbox") {
            el.checked = Boolean(state[el.name]);
          } else if (state[el.name] !== undefined) {
            el.value = state[el.name];
          }

          const persist = () =>
            sesion.guardar({
              [el.name]:
                el.type === "checkbox" ? el.checked : el.value,
            });

          el.addEventListener("change", persist);
          el.addEventListener("input", persist);
        });
    }

    /* mantiene la prenda elegida mientras el proceso sigue abierto */
    mantenerPrenda() {
      const { sesion, paso } = this;

      if (paso < 2 || paso > 4) return;

      const sinPrenda = (mensaje) => {
        try {
          sessionStorage.setItem("tgAvisoPrenda", mensaje);
        } catch {
          /* sin almacenamiento no se muestra el aviso */
        }

        const s = sesion.leer();

        ["prendaId", "prenda", "prendaDiseno", "codigoPrenda"].forEach(
          (k) => delete s[k],
        );

        sesion.reemplazar(s);
        location.replace("/empleado/comprar-alquilar");
      };

      /* renueva la eleccion y si otro empleado ya la tomo vuelve al catalogo */
      const renovar = async () => {
        const id = sesion.leer().prendaId;

        if (!id) return;

        try {
          await TG.post("/api/prendas/reservar/" + id);
        } catch (err) {
          if (err.status === 409) sinPrenda(err.message);
        }
      };

      renovar();
      setInterval(renovar, 60000);

      /* al irse a otra pantalla la prenda queda libre para los demas */
      document.addEventListener(
        "click",
        (e) => {
          const a = e.target.closest && e.target.closest("a[href]");

          if (!a || a.target === "_blank") return;

          const href = a.getAttribute("href") || "";

          if (!href || href.startsWith("#") || /^javascript:/i.test(href)) {
            return;
          }

          let ruta = "";

          try {
            ruta = new URL(a.href, location.href).pathname;
          } catch {
            return;
          }

          if (ruta.startsWith("/empleado/comprar-alquilar")) return;

          const id = sesion.leer().prendaId;

          if (id) TG.liberarPrenda(id);
        },
        true,
      );
    }

    async iniciar(ClasePaso) {
      const { sesion, paso, cabecera } = this;

      this.reiniciarSiVieneDeFuera();

      /* sin prenda no se avanza del paso 1 */
      if (paso > 1 && !sesion.leer().prendaId) {
        location.replace("/empleado/comprar-alquilar");
        return;
      }

      if (paso > 1 && paso < 5) sesion.limpiarDesde(paso + 1);

      const state = sesion.leer();

      this.mantenerPrenda();
      this.enlazarCampos(state);
      cabecera.iniciar(state);

      /* en compra se salta el paso 3 */
      if (paso === 3 && sesion.operacion() === "Comprar") {
        location.replace("/empleado/comprar-alquilar/paso-4");
        return;
      }

      cabecera.ajustarPasos();

      /* en compra atras del paso 4 va al paso 2 */
      if (paso === 4 && sesion.operacion() === "Comprar") {
        const atras = document.querySelector('a[href$="paso-3"]');

        if (atras) {
          atras.href = "/empleado/comprar-alquilar/paso-2";
        }
      }

      await new ClasePaso(sesion, cabecera, state).iniciar();
    }
  }

  /* arranque de cada paso */
  const arrancar = (paso, ClasePaso) =>
    TG.listo(() => new Flujo(paso).iniciar(ClasePaso));

  return { KEY, Sesion, Cabecera, Flujo, arrancar };
})();