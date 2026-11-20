/* costos y productos el administrador agrega ternos define precios */
document.addEventListener("DOMContentLoaded", () =>
  TG.listo(async () => {
    const tbody = document.querySelector(".data-table tbody");
    const kpis = [...document.querySelectorAll(".kpi-copy strong")];
    const buscador = document.getElementById("buscadorCodigo");
    const pestanas = [...document.querySelectorAll("[data-pestana]")];
    const subtitulo = document.getElementById("costosSubtitulo");
    let prendas = [],
      confecciones = [],
      pestana = "productos";

    /* el buscador es por codigo */
    buscador.addEventListener("input", (e) => {
      buscador.value = TG.reglas.codigoPrenda.filtro(
        buscador.value.toUpperCase().replace(/[^A-Z0-9-]/g, ""),
        e,
      );
      pintarTabla();
    });

    const pintar = async () => {
      prendas = await TG.prendas();
      /* las confecciones solo aparecen en la tabla */
      confecciones = (await TG.get("/api/confecciones").catch(() => [])).filter(
        (o) => o && o.estado === "Entregada",
      );
      const activas = prendas.filter((p) => !p.suspendida);
      if (kpis.length >= 4) {
        /* total grande y desglose pequeno */
        kpis[0].textContent = activas.length + confecciones.length;
        const pieProductos = document.getElementById("kpiProductos"),
          pieConfecciones = document.getElementById("kpiConfecciones");
        if (pieProductos)
          pieProductos.textContent = "Producto registrado: " + activas.length;
        if (pieConfecciones)
          pieConfecciones.textContent = "Confección: " + confecciones.length;
        kpis[1].textContent = activas.length
          ? TG.money(
              activas.reduce((s, p) => s + p.precioVenta, 0) / activas.length,
            )
          : "S/ 0.00";
        kpis[2].textContent = activas.filter(
          (p) => p.estado !== "Disponible",
        ).length;
        kpis[3].textContent = TG.money(
          activas
            .filter((p) => p.estado !== "Vendido")
            .reduce((s, p) => s + p.precioVenta, 0),
        );
      }
      pintarTabla();
    };

    const filaProducto = (p) => {
      const sus = pestana === "suspendidos";
      /* una prenda vendida queda visible */
      const vendido = p.estado === "Vendido";
      const acciones = vendido
        ? '<span class="badge badge-status status-inactivo">Venta cerrada · Solo consulta</span>'
        : sus
          ? '<button class="btn-mini ok" type="button" data-reactivar="' +
            p.id +
            '">↺ Reactivar</button>'
          : '<div class="acciones-fila"><button class="btn-mini" type="button" data-editar="' +
            p.id +
            '">✎ Editar</button>' +
            '<button class="btn-mini danger" type="button" data-suspender="' +
            p.id +
            '">⏸ Suspender</button></div>';
      return (
        '<tr data-id="' +
        p.id +
        '"><td>' +
        TG.esc(p.codigo) +
        "</td><td><strong>" +
        TG.esc(p.diseno) +
        "</strong></td><td>" +
        TG.esc(p.tipo) +
        "</td><td>" +
        TG.esc(p.talla) +
        "</td><td>" +
        TG.insigniaEstado(sus ? "Suspendido" : p.estado) +
        "</td><td>" +
        TG.money(p.precioVenta) +
        "</td><td>" +
        TG.money(p.precioAlquiler) +
        "</td><td>" +
        TG.fecha(p.fechaCreacion) +
        "</td><td>" +
        TG.fecha(p.fechaEdicion) +
        "</td><td>" +
        acciones +
        "</td></tr>"
      );
    };

    /* confecciones entregadas mismas columnas */
    const detalleDe = (o) => {
      try {
        return JSON.parse(o.detalle || "{}");
      } catch {
        return {};
      }
    };
    const filaConfeccion = (o) => {
      const d = detalleDe(o);
      return (
        '<tr data-confeccion="' +
        o.id +
        '"><td></td><td><strong>' +
        TG.esc(d.diseno || "Confección a medida") +
        "</strong></td><td></td><td>A medida</td><td>" +
        TG.insigniaEstado("En confección").replace("En confección", "Confección") +
        "</td><td>" +
        TG.money(o.costoTotal) +
        "</td><td></td><td>" +
        TG.fecha(o.entregaFinal) +
        '</td><td></td><td><button class="btn-mini" type="button" data-ver-confeccion="' +
        o.id +
        '">Ver detalle</button></td></tr>'
      );
    };
    const fila = (label, valor) =>
      '<div class="tg-ver-fila"><span>' +
      TG.esc(label) +
      "</span><strong>" +
      (valor === undefined || valor === null || valor === ""
        ? "—"
        : TG.esc(valor)) +
      "</strong></div>";
    const verConfeccion = (o) => {
      const d = detalleDe(o);
      const c = o.cliente || {};
      const m = d.medidas || {};
      const fondo = document.createElement("div");
      fondo.className = "tg-ver-fondo";
      fondo.innerHTML =
        '<div class="tg-ver" role="dialog" aria-modal="true"><div class="tg-ver-cab"><div><h3>Detalle de confección</h3><p>' +
        TG.esc(o.ticket || "") +
        (o.boleta ? " · " + TG.esc(o.boleta) : "") +
        '</p></div><button type="button" class="tg-ver-x" aria-label="Cerrar">×</button></div><div class="tg-ver-cuerpo">' +
        '<section><h4>Cliente</h4>' +
        fila("Nombre", TG.nombre(c)) +
        fila("DNI", c.dni) +
        fila("Celular", c.celular) +
        fila("Dirección", c.direccion) +
        "</section><section><h4>Diseño</h4>" +
        fila("Diseño", d.diseno) +
        fila("Tela", d.tela) +
        fila("Color del saco", d.saco) +
        fila("Color del pantalón", d.pantalon) +
        fila("Color del chaleco", d.chaleco) +
        fila("Solapa", d.solapa) +
        fila("Color de la camisa", d.camisa) +
        fila("Color de la corbata", d.corbata) +
        "</section><section><h4>Medidas (cm)</h4>" +
        Object.keys(m)
          .map((k) => fila(k.charAt(0).toUpperCase() + k.slice(1), m[k]))
          .join("") +
        "</section><section><h4>Pago y fechas</h4>" +
        fila("Costo total", TG.money(o.costoTotal)) +
        fila("Adelanto", TG.money(o.adelanto)) +
        fila("Método de pago", o.metodoPago) +
        fila("Fecha de entrega al cliente", TG.fecha(o.entregaFinal)) +
        fila("Atendió", o.empleado) +
        "</section></div></div>";
      const cerrar = () => fondo.remove();
      fondo.addEventListener("click", (e) => {
        if (e.target === fondo || e.target.closest(".tg-ver-x")) cerrar();
      });
      document.addEventListener("keydown", function esc(e) {
        if (e.key === "Escape") {
          cerrar();
          document.removeEventListener("keydown", esc);
        }
      });
      document.body.appendChild(fondo);
    };
    tbody.addEventListener("click", (e) => {
      const b = e.target.closest("[data-ver-confeccion]");
      if (!b) return;
      const o = confecciones.find((x) => String(x.id) === b.dataset.verConfeccion);
      if (o) verConfeccion(o);
    });

    function pintarTabla() {
      const sus = pestana === "suspendidos";
      const q = buscador.value.trim();
      let lista = prendas
        .filter((p) => !!p.suspendida === sus)
        .sort((a, b) => a.codigo.localeCompare(b.codigo));
      let mensaje = "";
      if (q) {
        /* con un codigo completo se muestra solo esa prenda */
        if (/^[A-Z]{3}-\d{3}$/.test(q)) {
          const exacta = lista.filter((p) => p.codigo === q);
          if (!exacta.length)
            mensaje = prendas.some((p) => p.codigo === q)
              ? sus
                ? "El producto no está suspendido"
                : "El producto se encuentra suspendido"
              : "El código no existe";
          lista = exacta;
        } else {
          lista = lista.filter((p) => p.codigo.startsWith(q));
          if (!lista.length) mensaje = "El código no existe";
        }
      }
      if (subtitulo)
        subtitulo.textContent = sus
          ? lista.length + " suspendidos"
          : "Gestiona precios y fichas de prendas";
      /* con buscador por codigo solo se buscan prendas */
      const extra = !sus && !q ? confecciones : [];
      tbody.innerHTML = lista.length || extra.length
        ? lista.map(filaProducto).join("") + extra.map(filaConfeccion).join("")
        : '<tr><td colspan="10" class="aviso-vacio">' +
          (mensaje ||
            (sus
              ? "No hay productos suspendidos."
              : "No hay prendas registradas.")) +
          "</td></tr>";
    }

    pestanas.forEach((b) =>
      b.addEventListener("click", () => {
        pestanas.forEach((x) => x.classList.toggle("active", x === b));
        pestana = b.dataset.pestana;
        buscador.value = "";
        pintarTabla();
      }),
    );

    const PREFIJOS = {
      "Terno completo": "TRN",
      Saco: "SAC",
      Pantalón: "PAN",
      Chaleco: "CHA",
      "Corbata / Michi": "COR",
      Camisa: "CAM",
    };
    const aPrenda = (v, p) => ({
      codigo: v.codigo,
      diseno: v.diseno,
      tipo: v.tipo,
      talla: v.talla,
      color: v.color,
      categoria: v.categoria,
      estilo: v.estilo,
      componente: v.componente,
      estado: p ? p.estado : "Disponible",
      precioVenta: Number(v.precioVenta),
      precioAlquiler: Number(v.precioAlquiler),
      imagen: v.imagen || null,
    });

    /* agregar terno */
    document
      .getElementById("btnAgregarTerno")
      .addEventListener("click", async () => {
        let sugerido = "";
        try {
          sugerido = (await TG.get("/api/prendas/siguiente-codigo?prefijo=TRN"))
            .codigo;
        } catch (e) {
          /* se escribe a mano */
        }
        TG.modal({
          titulo: "Agregar terno",
          subtitulo:
            "El código se genera solo; aparecerá en los catálogos con estado Disponible.",
          textoOk: "Guardar terno",
          compacto: true,
          campos: [
            {
              name: "codigo",
              label: "Código (automático)",
              value: sugerido,
              placeholder: "Ej. TRN-005",
              maxlength: 7,
              autocomplete: false,
              readonly: true,
            },
            {
              name: "diseno",
              label: "Diseño (elige o escribe)",
              placeholder: "Ej. Terno Oxford Negro",
              regla: "texto",
              sugerencias: [
                "Terno Oxford Negro",
                "Terno Azul Marino Clásico",
                "Terno Gris Perla Slim",
                "Terno Ejecutivo Plomo",
                "Terno Burgundy Premium",
                "Terno Beige Verano",
                "Smoking Negro Clásico",
                "Saco Azul Marino",
                "Pantalón de Vestir Negro",
                "Chaleco Gris Perla",
                "Corbata Michi Negra",
                "Camisa Blanca Formal",
              ],
            },
            {
              name: "categoria",
              label: "Categoría (obligatoria)",
              options: ["Elige una categoría", ...TG.OPCIONES.categoria],
              value: "Elige una categoría",
            },
            {
              name: "tipo",
              label: "Tipo",
              options: ["Nuevo", "Seminuevo"],
              value: "Nuevo",
            },
            {
              name: "talla",
              label: "Talla",
              grupos: TG.TALLAS_GRUPOS,
              value: "M",
            },
            {
              name: "componente",
              label: "Componente",
              options: TG.OPCIONES.componente,
              value: TG.OPCIONES.componente[0],
            },
            {
              name: "color",
              label: "Color",
              options: TG.OPCIONES.color,
              value: TG.OPCIONES.color[0],
            },
            {
              name: "estilo",
              label: "Estilo",
              options: TG.OPCIONES.estilo,
              value: TG.OPCIONES.estilo[0],
            },
            {
              name: "precioVenta",
              label: "Precio de venta (S/)",
              placeholder: "Ej. 320.00",
              regla: "precio",
              maxlength: 9,
              autocomplete: false,
            },
            {
              name: "precioAlquiler",
              label: "Precio de alquiler (S/)",
              placeholder: "Ej. 80.00",
              regla: "precio",
              maxlength: 9,
              autocomplete: false,
            },
            { name: "imagen", label: "Imagen del terno", type: "imagen" },
          ],
          onOk: async (v) => {
            if (!TG.OPCIONES.categoria.includes(v.categoria))
              throw new Error(
                "Debes elegir una categoría: Niños, Jóvenes o Adultos.",
              );
            await TG.post("/api/prendas/nuevo", aPrenda(v, null));
            TG.toast("Terno agregado");
            await pintar();
          },
        });
      });

    /* editar solo precios y tipo */
    tbody.addEventListener("click", async (e) => {
      const bEd = e.target.closest("[data-editar]"),
        bSu = e.target.closest("[data-suspender]"),
        bRe = e.target.closest("[data-reactivar]");
      if (bEd) {
        const p = prendas.find((x) => x.id === Number(bEd.dataset.editar));
        if (!p) return;
        if (p.estado === "Vendido") {
          TG.toast(
            "Una prenda vendida es de solo consulta y no se puede editar",
          );
          return;
        }
        TG.modal({
          titulo: "Editar " + p.codigo,
          subtitulo:
            "Los nuevos precios se aplican a las próximas boletas. Las boletas ya emitidas no cambian.",
          textoOk: "Guardar cambios",
          compacto: true,
          campos: [
            {
              name: "categoria",
              label: "Categoría (no editable)",
              value: p.categoria || "—",
              readonly: true,
            },
            {
              name: "estadoFijo",
              label: "Estado (no editable)",
              value: TG.etiquetaEstado(p.estado),
              readonly: true,
            },
            {
              name: "tipo",
              label: "Tipo",
              options: ["Nuevo", "Seminuevo"],
              value: p.tipo,
            },
            {
              name: "precioVenta",
              label: "Precio de venta (S/)",
              value: Number(p.precioVenta).toFixed(2),
              regla: "precio",
              maxlength: 9,
              autocomplete: false,
            },
            {
              name: "precioAlquiler",
              label: "Precio de alquiler (S/)",
              value: Number(p.precioAlquiler).toFixed(2),
              regla: "precio",
              maxlength: 9,
              autocomplete: false,
            },
            {
              name: "imagen",
              label: "Actualizar imagen",
              type: "imagen",
              value: p.imagen || "",
            },
          ],
          onOk: async (v) => {
            await TG.put("/api/prendas/actualizar/" + p.id, {
              ...p,
              tipo: v.tipo,
              precioVenta: Number(v.precioVenta),
              precioAlquiler: Number(v.precioAlquiler),
              imagen: v.imagen || null,
            });
            TG.toast("Producto actualizado");
            await pintar();
          },
        });
      }
      /* suspender lo da de baja sin borrarlo y lo pasa */
      if (bSu) {
        const p = prendas.find((x) => x.id === Number(bSu.dataset.suspender));
        if (p && p.estado === "Vendido") {
          TG.toast("Una prenda vendida no se puede suspender");
          return;
        }
        try {
          await TG.put("/api/prendas/suspender/" + bSu.dataset.suspender);
          TG.toast("Producto suspendido");
          await pintar();
        } catch (err) {
          TG.toast(err.message);
        }
      }
      if (bRe) {
        const p = prendas.find((x) => x.id === Number(bRe.dataset.reactivar));
        if (p && p.estado === "Vendido") {
          TG.toast("Una prenda vendida no se puede reactivar");
          return;
        }
        try {
          await TG.put("/api/prendas/reactivar/" + bRe.dataset.reactivar);
          TG.toast("Producto reactivado");
          await pintar();
        } catch (err) {
          TG.toast(err.message);
        }
      }
    });

    try {
      await pintar();
    } catch (err) {
      TG.toast(err.message);
    }
  }),
);
