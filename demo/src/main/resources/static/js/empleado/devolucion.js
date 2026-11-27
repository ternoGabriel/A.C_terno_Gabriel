/* devolucion busca el alquiler real en la base de datos */
document.addEventListener("DOMContentLoaded", () =>
  TG.listo(async () => {
    const $ = (id) => document.getElementById(id);
    const inputBusqueda = $("inputBusqueda"),
      detalle = $("detalleResultado"),
      noEncontrado = $("mensajeNoEncontrado");
    let config = { demora: 0, malEstado: 0 },
      boleta = null,
      estadoActual = "bueno",
      /* monto por mal estado el del administrador por defecto el empleado lo puede cambiar */
      precioDano = 0,
      precioModificado = false,
      dias = 0,
      terminado = false;
    try {
      const c = await TG.configuracion();
      config = {
        /* hasta que el administrador defina las penalidades el monto */
        demora: c.penalidadDemora?.valor ?? 0,
        malEstado: c.penalidadMalEstado?.valor ?? 0,
      };
    } catch (e) {
      TG.toast(e.message);
    }
    precioDano = config.malEstado;
    const inputPrecioDano = $("inputPrecioDano");
    const mostrarPrecioDano = () => {
      if (inputPrecioDano) inputPrecioDano.value = precioDano.toFixed(2);
    };
    $("lblPrecioDia").textContent = TG.money(config.demora);
    mostrarPrecioDano();
    const u = TG.usuario();
    if (u && $("bEmpleado")) $("bEmpleado").textContent = TG.empleadoNombre();
    if ($("bFecha")) $("bFecha").textContent = TG.fechaHora();

    /* solo deja escribir un dni */
    TG.filtroBusqueda(inputBusqueda, "B");

    const totales = () => {
      const sub = dias * config.demora,
        dano = estadoActual === "observaciones" ? precioDano : 0,
        total = sub + dano;
      const metodo =
        document.querySelector(".metodo-btn.active")?.dataset.metodo ||
        "Efectivo";
      $("lblCantDias").textContent = dias;
      $("txtSubtotalRetraso").textContent = TG.money(sub);
      $("txtConceptoDaño").textContent =
        estadoActual === "observaciones"
          ? "Estado de prenda: Con observaciones (dañado)"
          : "Estado de prenda: Buen estado";
      $("lblCantDaño").textContent = estadoActual === "observaciones" ? 1 : 0;
      if (inputPrecioDano)
        inputPrecioDano.disabled = estadoActual !== "observaciones" || terminado;
      $("txtCargoDaño").textContent = TG.money(dano);
      $("lblTipoPagoFila").textContent = metodo;
      $("txtTotalPenalizacion").textContent = TG.money(total);
      $("pagoTotalCobrar").value = TG.money(total);
      if (metodo === "Efectivo")
        $("inputTercerCampo").value = TG.money(
          Math.max(0, (parseFloat($("pagoEntregado").value) || 0) - total),
        );
      $("bResumenRetraso").textContent = dias + " días (" + TG.money(sub) + ")";
      $("bResumenEstado").textContent =
        (estadoActual === "observaciones"
          ? "Con observaciones (Daño)"
          : "Buen estado") +
        " (" +
        TG.money(dano) +
        ")";
      /* la boleta muestra el motivo del mal estado que escribio el empleado */
      const motivo = ($("inputObservaciones")?.value || "").trim();
      if ($("bFilaMotivo")) {
        $("bFilaMotivo").hidden = estadoActual !== "observaciones" || !motivo;
        $("bResumenMotivo").textContent = motivo || "—";
      }
      $("bResumenPago").textContent = metodo;
      $("bTotalCobrado").textContent = TG.money(total);
      actualizarAcciones();
      return { sub, dano, total, metodo };
    };

    /* si el administrador cambia los montos se recalcula */
    TG.vigilarPenalidades(({ demora, malEstado }) => {
      config.demora = demora;
      config.malEstado = malEstado;
      $("lblPrecioDia").textContent = TG.money(demora);
      /* si el empleado no lo cambio se actualiza al monto del administrador */
      if (!precioModificado) {
        precioDano = malEstado;
        mostrarPrecioDano();
      }
      if (boleta && !terminado) totales();
    });

    /* el cuadro de metodo de pago solo sale si hay */
    const seccionPago = $("seccionPagoDevolucion"),
      seccionBoleta = $("seccionBoletaDevolucion"),
      btnEmitir = $("btnEmitirDevolucion");
    function actualizarAcciones() {
      const cobra = dias > 0 || estadoActual === "observaciones";
      if (seccionPago) seccionPago.hidden = !cobra || terminado;
      if (btnEmitir) btnEmitir.hidden = cobra || terminado;
    }

    const buscar = async () => {
      const val = inputBusqueda.value.trim();
      terminado = false;
      boleta = null;
      try {
        const boletas = (await TG.boletas()).filter(
          (b) => b.tipo === "Alquiler" && b.estado === "Vigente",
        );
        if (/^\d{8}$/.test(val))
          boleta = boletas
            .filter((b) => b.cliente.dni === val)
            .sort((a, b) => b.id - a.id)[0];
        else if (/^B\d{3}-\d{1,4}$/i.test(val)) {
          /* b001 5 b001 0005 */
          const numero =
            "B" + val.slice(1, 4) + "-" + val.split("-")[1].padStart(4, "0");
          boleta = boletas.find(
            (b) => String(b.numero || "").toUpperCase() === numero,
          );
        }
      } catch (e) {
        TG.toast(e.message);
        return;
      }
      if (!boleta) {
        detalle.style.display = "none";
        noEncontrado.style.display = "block";
        boleta = null;
        return;
      }
      detalle.style.display = "block";
      noEncontrado.style.display = "none";
      $("lblCliente").textContent = TG.nombre(boleta.cliente);
      $("lblPrenda").textContent = TG.descripcionPrenda(boleta.prenda);
      $("lblFechaPactada").textContent = TG.fecha(boleta.fechaDevolucion);
      $("lblEstadoAlquiler").textContent = "Alquiler activo";
      $("lblFechaHoraOp").textContent = TG.fecha(boleta.fecha);
      $("lblMetodoPagoOp").textContent = boleta.metodoPago || "—";
      $("lblMontoPagadoOp").textContent = TG.money(boleta.monto);
      const re = $("rowEfectivoDetalle");
      if (re) re.style.display = "none";
      $("bCodigoBoleta").textContent = "Código: " + boleta.numero;
      $("bDni").textContent = boleta.cliente.dni;
      $("bPrenda").textContent = TG.descripcionPrenda(boleta.prenda);
      $("bCliente").textContent = TG.nombre(boleta.cliente);
      $("bFechaPactada").textContent = TG.fecha(boleta.fechaDevolucion);
      dias = boleta.fechaDevolucion
        ? Math.max(0, TG.diasEntre(boleta.fechaDevolucion, TG.hoyISO()))
        : 0;
      $("inputDiasRetraso").value = dias;
      totales();
    };
    document
      .querySelectorAll("[data-print-receipt]")
      .forEach((btn) => btn.addEventListener("click", () => window.print()));
    $("btnBuscar")?.addEventListener("click", buscar);
    inputBusqueda?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") buscar();
    });

    const bBueno = $("btnBuenEstado"),
      bMalo = $("btnMalEstado");
    bBueno?.addEventListener("click", () => {
      bBueno.classList.add("active");
      bMalo.classList.remove("active");
      estadoActual = "bueno";
      totales();
    });
    bMalo?.addEventListener("click", () => {
      bMalo.classList.add("active");
      bBueno.classList.remove("active");
      estadoActual = "observaciones";
      totales();
    });

    /* el empleado puede cambiar el monto por mal estado */
    inputPrecioDano?.addEventListener("input", () => {
      let v = inputPrecioDano.value.replace(/[^\d.]/g, "");
      const i = v.indexOf(".");
      if (i !== -1)
        v = v.slice(0, i + 1) + v.slice(i + 1).replace(/\./g, "").slice(0, 2);
      v = v.slice(0, 7);
      if (v !== inputPrecioDano.value) inputPrecioDano.value = v;
      precioDano = parseFloat(v) || 0;
      precioModificado = precioDano !== config.malEstado;
      totales();
    });
    inputPrecioDano?.addEventListener("focus", function () {
      this.select();
    });
    inputPrecioDano?.addEventListener("blur", () => mostrarPrecioDano());

    /* el motivo empieza siempre con mayuscula y se refleja en la boleta */
    const inputMotivo = $("inputObservaciones");
    inputMotivo?.addEventListener("input", () => {
      const v = inputMotivo.value.replace(/^\s+/, "");
      const mayus = v.charAt(0).toUpperCase() + v.slice(1);
      if (mayus !== inputMotivo.value) {
        const pos = inputMotivo.selectionStart;
        inputMotivo.value = mayus;
        inputMotivo.setSelectionRange(pos, pos);
      }
      totales();
    });

    const entregado = $("pagoEntregado");
    TG.vincular(entregado, {
      ok: (v) =>
        (document.querySelector(".metodo-btn.active")?.dataset.metodo ||
          "Efectivo") !== "Efectivo" || Number(v) >= totales().total,
      msg: "Monto inválido: no cubre el total a cobrar",
    });
    entregado?.addEventListener("focus", function () {
      this.select();
    });
    entregado?.addEventListener("input", totales);
    const metodos = document.querySelectorAll(".metodo-btn"),
      tercero = $("campoDinamicoTercero"),
      grid = $("pagoGridContainer"),
      yape = $("yapeAdminContainer");
    metodos.forEach((b) =>
      b.addEventListener("click", () => {
        metodos.forEach((x) => x.classList.remove("active"));
        b.classList.add("active");
        const m = b.dataset.metodo,
          ef = m === "Efectivo";
        grid.classList.toggle("transferencia-layout", !ef);
        tercero.style.display = ef ? "flex" : "none";
        yape.style.display = m === "Yape" ? "block" : "none";
        totales();
      }),
    );

    /* registra la devolucion cobro */
    const procesar = async (conPago) => {
      if (!boleta) {
        TG.toast("Primero busca el alquiler a devolver");
        return;
      }
      if (terminado) return;
      const t = totales();
      const comentario = ($("inputObservaciones")?.value || "").trim();
      if (estadoActual === "observaciones") {
        if (precioDano <= 0) {
          TG.toast("Escribe el monto a cobrar por el mal estado");
          return;
        }
        /* si cambia el monto del administrador el motivo es obligatorio */
        if (precioModificado && !comentario) {
          TG.toast(
            "Escribe el motivo del mal estado: se manchó, se rompió levemente o se destrozó totalmente",
          );
          $("inputObservaciones")?.focus();
          return;
        }
      }
      if (conPago && !TG.validarTodo([entregado])) return;
      try {
        const cliente = { id: boleta.cliente.id };
        /* un solo cargo por demora por mal estado */
        if (t.sub > 0 || t.dano > 0) {
          const tipo =
            t.sub > 0 && t.dano > 0
              ? "Ambos"
              : t.sub > 0
                ? "Demora"
                : "Mal estado";
          await TG.post("/api/penalidades/nuevo", {
            cliente,
            tipo,
            monto: t.sub + t.dano,
            montoDemora: t.sub,
            montoMalEstado: t.dano,
            estado: "Cobrado",
            idBoleta: boleta.id,
            /* solo para mal estado se guarda el comentario y si se cambio el monto */
            ...(t.dano > 0
              ? {
                  comentarioMalEstado: comentario,
                  malEstadoModificado: precioModificado,
                  montoMalEstadoPorDefecto: config.malEstado,
                  empleado: TG.empleadoNombre(),
                }
              : {}),
          });
        }
        /* devolucion normal lavanderia con danos restauracion */
        await TG.put(
          "/api/boletas/devolver/" +
            boleta.id +
            "?estadoPrenda=" +
            encodeURIComponent(
              estadoActual === "observaciones"
                ? "En restauración"
                : "En lavandería",
            ),
        );
        terminado = true;
        $("btnConfirmarPago").disabled = true;
        if (btnEmitir) btnEmitir.disabled = true;
        if ($("bFecha")) $("bFecha").textContent = TG.fechaHora();
        if (seccionBoleta) seccionBoleta.hidden = false;
        actualizarAcciones();
        TG.toast("Devolución registrada correctamente");
        await TG.calificarObligatorio(boleta.cliente);
      } catch (e) {
        alert(e.message);
      }
    };
    $("btnConfirmarPago")?.addEventListener("click", () => procesar(true));
    btnEmitir?.addEventListener("click", () => procesar(false));
    /* atras reinicia si hay avance o proceso terminado */
    TG.historial?.registrar({ hayAvance: () => terminado || boleta !== null });
    totales();
  }),
);
