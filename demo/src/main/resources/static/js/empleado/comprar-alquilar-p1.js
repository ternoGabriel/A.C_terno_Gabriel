/* paso 1 */
(() => {
  class Paso1 {
    constructor(sesion, cabecera, state) {
      this.sesion = sesion;
      this.state = state;
    }

    async iniciar() {
      const { sesion, state } = this;
      const read = () => sesion.leer();
      const save = (d) => sesion.guardar(d);
      const operacion = () => sesion.operacion();

      const moneyCorto = (n) =>
        "S/ " +
        Number(n).toLocaleString("es-PE", {
          maximumFractionDigits: 2,
        });

      const inputDni = document.querySelector('input[name="dni"]');

      const btnBuscar = document.querySelector(
        ".search-input-group button",
      );

      const fichaCliente = document.querySelector(
        ".client-result-card",
      );

      const grid = document.querySelector(".catalog-grid-cards");

      let condicion = "all";
      let prendas = [];

      /* catalogo de 10 en 10 */
      const POR_PAGINA = 10;
      let pagina = 0;

      /* prendas que otros empleados ya eligieron */
      let reservas = new Map();

      const paginador = document.getElementById("catalogoPaginador");

      const esDeOtro = (id) => {
        const r = reservas.get(id);

        return Boolean(r && !r.mia);
      };

      const cargarReservas = async () => {
        try {
          const lista = await TG.get("/api/prendas/reservas");

          reservas = new Map(lista.map((r) => [r.prendaId, r]));
        } catch {
          /* sin respuesta se conserva lo anterior */
        }
      };

      const MENSAJE_OCUPADA =
        "Podrás elegirla cuando termine o anule su proceso.";

      const TEXTOS = {
        color: "Todos los colores",
        categoria: "Todas las edades",
        estilo: "Todos los estilos",
        talla: "Todas las tallas",
      };

      const selects = [
        ...document.querySelectorAll(
          ".advanced-filters-bar [data-filter]",
        ),
      ];

      const checks = [
        ...document.querySelectorAll('input[name="prendas_ind"]'),
      ];

      const NOMBRE_COMP = {
        saco: "Saco",
        pantalon: "Pantalón",
        chaleco: "Chaleco",
        corbata: "Corbata / Michi",
        camisa: "Camisa",
      };

      selects.forEach((s) =>
        TG.llenarSelect(
          s,
          TG.OPCIONES[s.dataset.filter],
          TEXTOS[s.dataset.filter],
        ),
      );

      checks.forEach((c) => {
        c.checked = false;
      });

      /* dibuja la ficha del cliente */
      const pintarCliente = (c) => {
        if (!fichaCliente) return;

        if (!c) {
          fichaCliente.innerHTML =
            '<div class="client-detail-col">' +
            "<span>Cliente</span>" +
            "<strong>Escribe el DNI y pulsa Buscar Cliente.</strong>" +
            "</div>";

          return;
        }

        const puntuacion = Math.max(
          0,
          Math.min(5, Math.round(Number(c.calificacion) || 0)),
        );

        const estrellas =
          '<span class="stars-filled">' +
          "★".repeat(puntuacion) +
          '</span><span class="stars-empty">' +
          "☆".repeat(5 - puntuacion) +
          "</span>";

        fichaCliente.innerHTML =
          '<div class="client-avatar-info">' +
          '<div class="avatar-circle">' +
          TG.esc(TG.iniciales(TG.nombre(c))) +
          "</div>" +
          "<div><strong>" +
          TG.esc(TG.nombre(c)) +
          "</strong></div>" +
          "</div>" +
          '<div class="client-detail-col">' +
          "<span>DNI</span><strong>" +
          TG.esc(c.dni) +
          "</strong></div>" +
          '<div class="client-detail-col">' +
          "<span>Calificación</span>" +
          '<strong class="client-stars">' +
          (puntuacion
            ? estrellas
            : '<span class="stars-empty">☆☆☆☆☆</span>') +
          "</strong></div>" +
          '<div class="client-detail-col">' +
          "<span>Dirección</span><strong>" +
          TG.esc(
            [c.direccion, c.distrito].filter(Boolean).join(", "),
          ) +
          "</strong></div>" +
          '<div class="client-detail-col">' +
          "<span>Teléfono</span><strong>" +
          TG.esc(TG.telefono(c)) +
          "</strong></div>";
      };

      /* aviso de cliente no encontrado */
      const noEncontrado = (dni) => {
        if (!fichaCliente) return;

        fichaCliente.innerHTML =
          '<div class="client-detail-col">' +
          "<span>Cliente</span><strong>" +
          "No hay un cliente con DNI " +
          TG.esc(dni) +
          ". Podrás registrarlo en el siguiente paso." +
          "</strong></div>";
      };

      if (inputDni) {
        inputDni.type = "text";
        inputDni.inputMode = "numeric";
        inputDni.maxLength = 8;
        inputDni.autocomplete = "off";

        /* restaura el dni al volver */
        if (state.dni) inputDni.value = state.dni;

        inputDni.addEventListener("input", () => {
          const dniLimpio = inputDni.value
            .replace(/\D/g, "")
            .slice(0, 8);

          if (inputDni.value !== dniLimpio) {
            inputDni.value = dniLimpio;
          }

          const s = read();

          [
            "clienteId",
            "nombres",
            "apellidos",
            "telefono",
            "direccion",
            "correo",
          ].forEach((k) => delete s[k]);

          sesion.reemplazar(s);
          pintarCliente(null);
        });
      }

      /* busca el cliente por dni */
      const buscarCliente = async () => {
        const dni = (inputDni?.value || "").replace(/\D/g, "");

        if (dni.length !== 8) {
          TG.toast("El DNI debe tener 8 dígitos");
          return;
        }

        try {
          const c = (await TG.clientes()).find((x) => x.dni === dni);

          if (!c) {
            save({
              clienteId: null,
              dni,
              nombres: "",
              apellidos: "",
              telefono: "",
              direccion: "",
              correo: "",
            });

            noEncontrado(dni);
            return;
          }

          save({
            clienteId: c.id,
            dni: c.dni,
            nombres: c.nombres,
            apellidos: c.apellidos,
            telefono: c.celular,
            direccion: c.direccion,
            correo: c.correo || "",
          });

          pintarCliente(c);

          if (c.alquilerBloqueado && operacion() === "Alquilar") {
            TG.toast("Este cliente tiene el alquiler bloqueado");
          }
        } catch (err) {
          TG.toast(err.message);
        }
      };

      btnBuscar?.addEventListener("click", buscarCliente);

      inputDni?.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          buscarCliente();
        }
      });

      pintarCliente(null);

      /* restaura la ficha al volver */
      if (state.clienteId) {
        try {
          const cliente = (await TG.clientes()).find(
            (x) => x.id === state.clienteId,
          );

          pintarCliente(cliente || null);
        } catch {
          /* sin acceso al cliente */
        }
      } else if (state.dni && state.dni.length === 8) {
        noEncontrado(state.dni);
      }

      /* dibuja el catalogo con filtros */
      const pintarCatalogo = () => {
        if (!grid) return;

        const sel = read().prendaId;

        const f = {
          componentes: checks
            .filter((c) => c.checked)
            .map((c) => NOMBRE_COMP[c.value]),
        };

        selects.forEach((s) => {
          f[s.dataset.filter] = s.value;
        });

        const filtradas = prendas.filter(
          (p) =>
            (condicion === "all" ||
              p.tipo.toLowerCase() === condicion) &&
            TG.pasaFiltros(p, f),
        );

        const totalPaginas = Math.max(
          1,
          Math.ceil(filtradas.length / POR_PAGINA),
        );

        if (pagina >= totalPaginas) pagina = totalPaginas - 1;

        const lista = filtradas.slice(
          pagina * POR_PAGINA,
          pagina * POR_PAGINA + POR_PAGINA,
        );

        grid.innerHTML = lista.length
          ? lista
              .map(
                (p) =>
                  '<article class="catalog-item-card' +
                  (p.id === sel ? " selected" : "") +
                  (esDeOtro(p.id) ? " reservada" : "") +
                  '" data-id="' +
                  p.id +
                  '">' +
                  '<div class="catalog-thumb">' +
                  '<img src="' +
                  TG.esc(
                    p.imagen ||
                      (/smoking/i.test(
                        (p.diseno || "") + " " + (p.estilo || ""),
                      )
                        ? "https://images.unsplash.com/photo-1617127365659-c47fa864d8bc?auto=format&fit=crop&w=700&q=85"
                        : "https://images.unsplash.com/photo-1618886614638-80e3c103d31a?auto=format&fit=crop&w=700&q=85"),
                  ) +
                  '" alt="' +
                  TG.esc(p.diseno) +
                  '" loading="lazy"></div>' +
                  '<div class="catalog-info">' +
                  "<strong>" +
                  TG.esc(p.diseno) +
                  "</strong>" +
                  "<span>" +
                  TG.esc(p.codigo) +
                  " · " +
                  TG.esc(p.tipo) +
                  " · Talla " +
                  TG.esc(p.talla) +
                  "</span>" +
                  '<span class="catalog-price">' +
                  moneyCorto(p.precioVenta) +
                  " <small>· Alq. " +
                  moneyCorto(p.precioAlquiler) +
                  "</small></span></div>" +
                  (p.id === sel
                    ? '<div class="check-badge">✓</div>'
                    : "") +
                  (esDeOtro(p.id)
                    ? '<div class="lock-badge">Ya seleccionada</div>'
                    : "") +
                  "</article>",
              )
              .join("")
          : '<p style="padding:16px;color:#667085;">' +
            "No hay prendas disponibles con ese filtro." +
            "</p>";

        pintarPaginador(filtradas.length, totalPaginas);
      };

      /* botones volver y siguiente bajo el catalogo */
      const pintarPaginador = (cantidad, totalPaginas) => {
        if (!paginador) return;

        paginador.hidden = cantidad <= POR_PAGINA;

        const info = paginador.querySelector("[data-pag-info]");
        const volver = paginador.querySelector('[data-pag="volver"]');
        const siguiente = paginador.querySelector('[data-pag="siguiente"]');

        if (info) {
          info.textContent = "Página " + (pagina + 1) + " de " + totalPaginas;
        }

        if (volver) volver.disabled = pagina <= 0;
        if (siguiente) siguiente.disabled = pagina >= totalPaginas - 1;
      };

      paginador?.addEventListener("click", (e) => {
        const b = e.target.closest("[data-pag]");

        if (!b || b.disabled) return;

        pagina += b.dataset.pag === "siguiente" ? 1 : -1;
        pagina = Math.max(0, pagina);
        pintarCatalogo();

        /* sube al inicio del catalogo para ver las 10 nuevas */
        grid?.scrollIntoView({ behavior: "smooth", block: "start" });
      });

      /* vuelve a leer prendas y selecciones */
      const refrescar = async () => {
        try {
          prendas = (await TG.prendas()).filter(
            (p) => p.estado === "Disponible" && !p.suspendida,
          );
        } catch {
          /* se conserva la lista anterior */
        }

        await cargarReservas();
        pintarCatalogo();
      };

      try {
        prendas = (await TG.prendas()).filter(
          (p) => p.estado === "Disponible" && !p.suspendida,
        );

        if (
          state.prendaId &&
          !prendas.some((p) => p.id === state.prendaId)
        ) {
          save({ prendaId: null, prenda: "" });
        }

        await cargarReservas();

        /* aviso si otro empleado se quedo con la prenda mientras no estabas */
        try {
          const aviso = sessionStorage.getItem("tgAvisoPrenda");

          if (aviso) {
            sessionStorage.removeItem("tgAvisoPrenda");
            TG.toast(aviso, "info");
          }
        } catch {
          /* sin almacenamiento no hay aviso */
        }

        /* renueva la prenda elegida y si ya no es tuya se limpia */
        const elegida = read().prendaId;

        if (elegida) {
          try {
            await TG.post("/api/prendas/reservar/" + elegida);
            await cargarReservas();
          } catch (err) {
            if (err.status === 409) {
              save({
                prendaId: null,
                prenda: "",
                prendaDiseno: "",
                codigoPrenda: "",
                precioVenta: null,
                precioAlquiler: null,
              });
              TG.toast(err.message, "info");
              await cargarReservas();
            }
          }
        }

        pintarCatalogo();
      } catch (err) {
        if (grid) {
          grid.innerHTML =
            '<p style="padding:16px;color:#b42318;">' +
            TG.esc(err.message) +
            "</p>";
        }
      }

      /* seleccion de prenda solo la primera persona que elige se queda con ella */
      grid?.addEventListener("click", async (e) => {
        /* al tocar la foto se abre solo la imagen */
        const foto = e.target.closest(".catalog-thumb");
        if (foto) {
          const img = foto.querySelector("img");
          if (img) window.tgVerImagen(img.src, img.alt);
          return;
        }

        const card = e.target.closest(".catalog-item-card");

        if (!card) return;

        const p = prendas.find(
          (x) => x.id === Number(card.dataset.id),
        );

        if (!p) return;

        /* otro empleado la eligio primero */
        if (esDeOtro(p.id)) {
          TG.toast(
            "Esta prenda ya está seleccionada por " +
              reservas.get(p.id).empleado +
              ". " +
              MENSAJE_OCUPADA,
            "info",
          );
          return;
        }

        const previa = read().prendaId;

        /* tocar otra vez la prenda elegida anula la seleccion */
        if (previa === p.id) {
          TG.liberarPrenda(p.id);
          save({
            prendaId: null,
            prenda: "",
            prendaDiseno: "",
            codigoPrenda: "",
            precioVenta: null,
            precioAlquiler: null,
          });
          reservas.delete(p.id);
          pintarCatalogo();
          return;
        }

        /* el servidor decide quien llego primero */
        try {
          await TG.post("/api/prendas/reservar/" + p.id);
        } catch (err) {
          TG.toast(err.message, err.status === 409 ? "info" : "error");

          if (err.status === 409) await refrescar();

          return;
        }

        save({
          prendaId: p.id,
          prenda: TG.descripcionPrenda(p),
          prendaDiseno: p.diseno,
          codigoPrenda: p.codigo,
          precioVenta: p.precioVenta,
          precioAlquiler: p.precioAlquiler,
        });

        /* la prenda anterior queda libre para los demas */
        if (previa && previa !== p.id) TG.liberarPrenda(previa);

        await cargarReservas();
        pintarCatalogo();
      });

      /* cada pocos segundos se ve si otro empleado eligio o solto una prenda */
      setInterval(async () => {
        if (document.hidden) return;

        const antes = JSON.stringify([...reservas.entries()]);

        await cargarReservas();

        if (JSON.stringify([...reservas.entries()]) !== antes) {
          pintarCatalogo();
        }
      }, 5000);

      /* con otro filtro el catalogo vuelve a la primera pagina */
      const filtrar = () => {
        pagina = 0;
        pintarCatalogo();
      };

      document.querySelectorAll(".condition-btn").forEach((b) =>
        b.addEventListener("click", () => {
          condicion = b.dataset.condition;
          filtrar();
        }),
      );

      selects.forEach((s) => s.addEventListener("change", filtrar));

      checks.forEach((c) => c.addEventListener("change", filtrar));

      /* exige prenda para pasar al paso 2 */
      document
        .querySelector('a[href$="paso-2"]')
        ?.addEventListener("click", (e) => {
          if (!read().prendaId) {
            e.preventDefault();
            alert("Selecciona una prenda del catálogo para continuar.");
          }
        });
    }
  }

  CA.arrancar(1, Paso1);
})();