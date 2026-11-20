/* estado de prendas es el mismo inventario que ve */
document.addEventListener("DOMContentLoaded", () =>
  TG.listo(async () => {
    const searchInput = document.getElementById("inventorySearch");
    const stateFilter = document.getElementById("inventoryStateFilter");
    const kpiFilters = document.querySelectorAll(".kpi-filter");
    const tbody = document.querySelector(".inventory-table tbody");
    let prendas = [],
      alquiladoA = {},
      confeccionA = {},
      entregadas = [],
      verVendidos = false,
      currentFilter = "todos";
    const btnVendidos = document.getElementById("btnVendidos");

    /* diseno guardado en la ficha de una orden de confeccion */
    const disenoOrden = (o) => {
      try {
        return JSON.parse(o.detalle || "{}").diseno || "Terno a medida";
      } catch {
        return "Terno a medida";
      }
    };

    const filterTable = () => {
      const q = (searchInput?.value || "").toLowerCase().trim();
      tbody.querySelectorAll("tr[data-id]").forEach((row) => {
        const est = row.getAttribute("data-estado");
        const esOrden = row.getAttribute("data-tipo") === "orden";
        /* confecciones solo con su filtro */
        const okEstado = verVendidos
          ? true
          : currentFilter === "confecciones"
            ? esOrden
            : !esOrden &&
              (currentFilter === "todos" ||
                est === currentFilter ||
                (currentFilter === "restauracion" && est === "confeccion"));
        row.style.display =
          row.textContent.toLowerCase().includes(q) && okEstado ? "" : "none";
      });
    };

    const pintar = async () => {
      const [todas, boletas, ordenes] = await Promise.all([
        TG.prendas(),
        TG.boletas(),
        TG.get("/api/confecciones").catch(() => []),
      ]);
      entregadas = (ordenes || []).filter((o) => o && o.estado === "Entregada");
      /* el inventario no incluye lo vendido */
      const visibles = TG.prendasVisibles(todas);
      const vendidas = visibles.filter((p) => p.estado === "Vendido");
      prendas = visibles.filter((p) => p.estado !== "Vendido");
      alquiladoA = {};
      confeccionA = {};
      (ordenes || [])
        .filter((o) => o && o.estado === "En confección")
        .forEach((o) => {
          const detalle =
            typeof o.detalle === "string"
              ? o.detalle
              : JSON.stringify(o.detalle || {});
          prendas.forEach((p) => {
            if (
              detalle
                .toLowerCase()
                .includes(String(p.codigo || "").toLowerCase()) ||
              detalle
                .toLowerCase()
                .includes(String(p.diseno || "").toLowerCase())
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
      const n = (e) => prendas.filter((p) => p.estado === e).length;
      const nums = document.querySelectorAll(".kpi-filter .kpi-copy strong");
      if (nums.length >= 4) {
        nums[0].textContent = prendas.length;
        nums[1].textContent = n("Disponible");
        nums[2].textContent = n("Alquilado");
        nums[3].textContent = (ordenes || []).filter(Boolean).length;
      }
      const sub = document.querySelector(".inventory-subtitle");
      if (sub)
        sub.textContent =
          prendas.length +
          " prendas registradas · " +
          n("Disponible") +
          " disponibles";
      if (verVendidos) {
        /* vendidos compras */
        const filasCompra = vendidas.map((p) => {
          const b = boletas.find(
            (x) => x.tipo === "Venta" && x.prenda && x.prenda.id === p.id && x.estado !== "Anulada",
          );
          return [p.codigo, p.diseno, p.talla, b ? TG.nombre(b.cliente) : "—", "Vendido"];
        });
        const filasConf = entregadas.map((o) => {
          let d = {};
          try { d = JSON.parse(o.detalle || "{}"); } catch { d = {}; }
          return [o.ticket || "—", d.diseno || "Confección a medida", "A medida", TG.nombre(o.cliente) || "—", "Vendido a medida"];
        });
        const todasFilas = filasCompra.concat(filasConf);
        tbody.innerHTML = todasFilas.length
          ? todasFilas
              .map(
                (f) =>
                  '<tr data-id="v" data-estado="vendido"><td class="code-col">' +
                  TG.esc(f[0]) +
                  '</td><td class="name-col">' +
                  TG.esc(f[1]) +
                  '</td><td class="size-col">' +
                  TG.esc(f[2]) +
                  '</td><td class="status-col">' +
                  TG.insigniaEstado(f[4]) +
                  '</td><td class="responsable-col">' +
                  TG.esc(f[3]) +
                  "</td></tr>",
              )
              .join("")
          : '<tr><td colspan="5" class="aviso-vacio">Aún no hay ventas ni confecciones entregadas.</td></tr>';
        const sub0 = document.querySelector(".inventory-subtitle");
        if (sub0) sub0.textContent = todasFilas.length + " vendidos (compras y confecciones)";
        filterTable();
        return;
      }
      tbody.innerHTML = prendas.length
        ? prendas
            .slice()
            .sort((a, b) => a.codigo.localeCompare(b.codigo))
            .map(
              (p) =>
                '<tr data-id="' +
                p.id +
                '" data-estado="' +
                TG.claveEstado(p.estado) +
                '"><td class="code-col">' +
                TG.esc(p.codigo) +
                '</td><td class="name-col">' +
                TG.esc(p.diseno) +
                '</td><td class="size-col">' +
                TG.esc(p.talla) +
                '</td><td class="status-col">' +
                TG.insigniaEstado(p.estado) +
                '</td><td class="responsable-col">' +
                (p.estado === "Alquilado" && alquiladoA[p.id]
                  ? TG.esc(alquiladoA[p.id])
                  : p.estado === "En confección" && confeccionA[p.id]
                    ? TG.esc(confeccionA[p.id])
                    : p.estado === "Alquilado" || p.estado === "En confección"
                      ? "No identificado"
                      : "—") +
                "</td></tr>",
            )
            .join("")
        : '<tr><td colspan="5" class="aviso-vacio">No hay prendas registradas.</td></tr>';
      /* confecciones realizadas se ven al elegir el boton de confeccion */
      tbody.insertAdjacentHTML(
        "beforeend",
        (ordenes || [])
          .filter(Boolean)
          .map(
            (o) =>
              '<tr data-id="o' +
              o.id +
              '" data-tipo="orden" data-estado="orden"><td class="code-col">' +
              TG.esc(o.ticket || "—") +
              '</td><td class="name-col">' +
              TG.esc(disenoOrden(o)) +
              '</td><td class="size-col">A medida</td><td class="status-col">' +
              TG.insigniaEstado(o.estado) +
              '</td><td class="responsable-col">' +
              TG.esc(TG.nombre(o.cliente) || "—") +
              "</td></tr>",
          )
          .join(""),
      );
      filterTable();
    };

    kpiFilters.forEach((card) =>
      card.addEventListener("click", () => {
        kpiFilters.forEach((c) => c.classList.remove("active"));
        card.classList.add("active");
        currentFilter = card.getAttribute("data-filter");
        if (stateFilter) stateFilter.value = currentFilter;
        filterTable();
      }),
    );
    btnVendidos?.addEventListener("click", async () => {
      verVendidos = !verVendidos;
      btnVendidos.classList.toggle("active", verVendidos);
      btnVendidos.setAttribute("aria-pressed", String(verVendidos));
      btnVendidos.textContent = verVendidos ? "Inventario" : "Vendidos";
      stateFilter.disabled = verVendidos;
      try {
        await pintar();
      } catch (err) {
        TG.toast(err.message);
      }
    });
    searchInput?.addEventListener("input", filterTable);
    stateFilter?.addEventListener("change", (e) => {
      currentFilter = e.target.value;
      kpiFilters.forEach((c) =>
        c.classList.toggle(
          "active",
          c.getAttribute("data-filter") === currentFilter,
        ),
      );
      filterTable();
    });

    try {
      await pintar();
    } catch (err) {
      TG.toast(err.message);
    }
  }),
);
