/* estado de prendas el inventario sale de costos y productos */
document.addEventListener("DOMContentLoaded", () =>
  TG.listo(async () => {
    const searchInput = document.querySelector("[data-table-search]");
    const stateSelect = document.querySelector("[data-state-filter]");
    const tbody = document.querySelector(".data-table tbody");
    /* estados destino permitidos segun el estado actual */
    const DESTINOS = {
      "En restauración": {
        Lavandería: "En lavandería",
        Disponible: "Disponible",
      },
      "En lavandería": { Disponible: "Disponible" },
    };
    let prendas = [],
      alquiladoA = {},
      confeccionA = {},
      vendidoA = {},
      ordenes = [],
      modoVendidos = false;
    const btnVendidos = document.querySelector("[data-vendidos]");
    const titulo = document.querySelector("[data-pr-titulo]");

    const filterTable = () => {
      const query = (searchInput?.value || "").toLowerCase().trim();
      const sel = stateSelect ? stateSelect.value : "Todos";
      tbody.querySelectorAll("tr[data-id]").forEach((row) => {
        const esOrden = row.dataset.tipo === "orden";
        /* confecciones entregadas solo salen con su filtro */
        const okEstado =
          sel === "Confecciones"
            ? esOrden
            : row.dataset.estado !== "Entregada" &&
              (sel === "Todos" || (row.dataset.estado || "") === sel);
        row.hidden = !(
          row.textContent.toLowerCase().includes(query) && okEstado
        );
      });
    };

    /* nombre del diseno guardado en la ficha de una orden */
    const disenoOrden = (o) => {
      try {
        const d = JSON.parse(o.detalle || "{}");
        return d.diseno || "Terno a medida";
      } catch {
        return "Terno a medida";
      }
    };

    const fila = (id, estado, codigo, nombre, talla, responsable, accion) =>
      '<tr data-id="' +
      TG.esc(id) +
      '"' +
      (String(id).startsWith("o") ? ' data-tipo="orden"' : "") +
      ' data-estado="' +
      TG.esc(estado) +
      '"><td class="col-codigo font-mono">' +
      TG.esc(codigo) +
      '</td><td class="col-nombre font-medium">' +
      TG.esc(nombre) +
      '</td><td class="col-talla">' +
      TG.esc(talla) +
      '</td><td class="col-estado">' +
      TG.insigniaEstado(estado) +
      '</td><td class="col-responsable">' +
      TG.esc(responsable) +
      '</td><td class="col-accion">' +
      accion +
      "</td></tr>";

    const pintar = async () => {
      const [todas, boletas, ord] = await Promise.all([
        TG.prendas(),
        TG.boletas(),
        TG.get("/api/confecciones").catch(() => []),
      ]);
      ordenes = (ord || []).filter((o) => o);
      const visibles = TG.prendasVisibles(todas);
      prendas = visibles.filter((p) => p.estado !== "Vendido");
      alquiladoA = {};
      confeccionA = {};
      vendidoA = {};
      ordenes
        .filter((o) => o.estado === "En confección")
        .forEach((o) => {
          const detalle =
            typeof o.detalle === "string"
              ? o.detalle
              : JSON.stringify(o.detalle || {});
          prendas.forEach((p) => {
            if (
              p.estado === "En confección" &&
              (detalle
                .toLowerCase()
                .includes(String(p.codigo || "").toLowerCase()) ||
                detalle
                  .toLowerCase()
                  .includes(String(p.diseno || "").toLowerCase()))
            ) {
              confeccionA[p.id] =
                TG.nombre(o.cliente) || "Cliente de confección";
            }
          });
        });
      boletas
        .filter(
          (b) => b.tipo === "Alquiler" && b.estado === "Vigente" && b.prenda,
        )
        .forEach((b) => {
          alquiladoA[b.prenda.id] = TG.nombre(b.cliente);
        });
      boletas
        .filter((b) => b.tipo === "Venta" && b.estado !== "Anulada" && b.prenda)
        .forEach((b) => {
          vendidoA[b.prenda.id] = TG.nombre(b.cliente);
        });

      const sub = document.querySelector(".subtitle-stats");
      let filas = "";
      let total = 0;
      if (modoVendidos) {
        /* vendidos compras */
        const compras = visibles.filter((p) => p.estado === "Vendido");
        const entregadas = ordenes.filter((o) => o.estado === "Entregada");
        total = compras.length + entregadas.length;
        filas =
          compras
            .slice()
            .sort((a, b) => a.codigo.localeCompare(b.codigo))
            .map((p) =>
              fila(
                "p" + p.id,
                "Vendido",
                p.codigo,
                p.diseno,
                p.talla,
                vendidoA[p.id] || "—",
                "—",
              ),
            )
            .join("") +
          entregadas
            .map((o) =>
              fila(
                "o" + o.id,
                "Vendido a medida",
                o.ticket || "—",
                disenoOrden(o),
                "A medida",
                TG.nombre(o.cliente) || "—",
                "—",
              ),
            )
            .join("");
        if (sub)
          sub.textContent =
            total + (total === 1 ? " prenda vendida" : " prendas vendidas");
      } else {
        const enConfeccion = ordenes.filter((o) => o.estado === "En confección");
        total = prendas.length + enConfeccion.length;
        const disp = prendas.filter((p) => p.estado === "Disponible").length;
        filas =
          prendas
            .slice()
            .sort((a, b) => a.codigo.localeCompare(b.codigo))
            .map((p) => {
              const editable = !!DESTINOS[p.estado];
              const responsable =
                p.estado === "Alquilado" && alquiladoA[p.id]
                  ? alquiladoA[p.id]
                  : p.estado === "En confección" && confeccionA[p.id]
                    ? confeccionA[p.id]
                    : p.estado === "Alquilado" || p.estado === "En confección"
                      ? "No identificado"
                      : "—";
              return fila(
                "p" + p.id,
                p.estado,
                p.codigo,
                p.diseno,
                p.talla,
                responsable,
                '<button class="btn-mini" type="button" data-cambiar="' +
                  p.id +
                  '"' +
                  (editable
                    ? ""
                    : ' disabled title="Este estado cambia solo con las boletas de alquiler y devolución"') +
                  ">Cambiar estado</button>",
              );
            })
            .join("") +
          enConfeccion
            .map((o) =>
              fila(
                "o" + o.id,
                "En confección",
                o.ticket || "—",
                disenoOrden(o),
                "A medida",
                TG.nombre(o.cliente) || "—",
                '<button class="btn-mini" type="button" disabled title="Este estado cambia solo al entregar la confección">Cambiar estado</button>',
              ),
            )
            .join("") +
          ordenes
            .filter((o) => o.estado === "Entregada")
            .map((o) =>
              fila(
                "o" + o.id,
                "Entregada",
                o.ticket || "—",
                disenoOrden(o),
                "A medida",
                TG.nombre(o.cliente) || "—",
                "—",
              ),
            )
            .join("");
        if (sub)
          sub.textContent =
            total + " prendas registradas · " + disp + " disponibles";
      }
      tbody.innerHTML = total
        ? filas
        : '<tr><td colspan="6" class="aviso-vacio">' +
          (modoVendidos
            ? "Aún no hay prendas vendidas."
            : "No hay prendas registradas.") +
          "</td></tr>";
      filterTable();
    };

    /* boton vendidos alterna entre el inventario y solo lo vendido */
    btnVendidos?.addEventListener("click", async () => {
      modoVendidos = !modoVendidos;
      btnVendidos.textContent = modoVendidos ? "Inventario" : "Vendidos";
      btnVendidos.classList.toggle("activo", modoVendidos);
      btnVendidos.setAttribute("aria-pressed", String(modoVendidos));
      if (titulo)
        titulo.textContent = modoVendidos
          ? "Prendas vendidas"
          : "Inventario de prendas";
      if (stateSelect) {
        stateSelect.value = "Todos";
        stateSelect.disabled = modoVendidos;
        stateSelect.dispatchEvent(new Event("change"));
      }
      try {
        await pintar();
      } catch (err) {
        TG.toast(err.message);
      }
    });
    searchInput?.addEventListener("input", filterTable);
    stateSelect?.addEventListener("change", filterTable);

    tbody.addEventListener("click", (e) => {
      const b = e.target.closest("[data-cambiar]");
      if (!b || b.disabled) return;
      const p = prendas.find((x) => x.id === Number(b.dataset.cambiar));
      if (!p || !DESTINOS[p.estado]) return;
      const opciones = DESTINOS[p.estado];
      TG.modal({
        titulo: "Cambiar estado",
        subtitulo:
          p.codigo +
          " · " +
          p.diseno +
          " · Actual: " +
          TG.etiquetaEstado(p.estado),
        textoOk: "Guardar",
        campos: [
          {
            name: "estado",
            label: "Nuevo estado",
            options: Object.keys(opciones),
            value: Object.keys(opciones)[0],
          },
        ],
        onOk: async (v) => {
          await TG.put(
            "/api/prendas/estado/" +
              p.id +
              "?estado=" +
              encodeURIComponent(opciones[v.estado]),
          );
          TG.toast("Estado actualizado");
          await pintar();
        },
      });
    });

    try {
      await pintar();
    } catch (err) {
      TG.toast(err.message);
    }
  }),
);
