/* utilidades compartidas conexion con la api */
(() => {
  const SESION = "tgUsuario";
  const TG = (window.TG = {});

  /* api */
  /* spring security guarda el token csrf en la cookie xsrf */
  TG.csrf = () => {
    const m = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]*)/);
    return m ? decodeURIComponent(m[1]) : "";
  };

  /* identificador de esta pestana se conserva al recargar */
  TG.pestana = () => {
    let id = "";
    try {
      id = sessionStorage.getItem("tgPestana") || "";
      if (!id) {
        id =
          window.crypto && crypto.randomUUID
            ? crypto.randomUUID()
            : Date.now().toString(36) + Math.random().toString(36).slice(2);
        sessionStorage.setItem("tgPestana", id);
      }
    } catch {
      id = "";
    }
    return id;
  };

  TG.api = async (ruta, opciones = {}) => {
    const init = {
      method: (opciones.method || "GET").toUpperCase(),
      headers: { "X-Tab-Id": TG.pestana() },
    };
    if (init.method !== "GET" && init.method !== "HEAD") {
      const token = TG.csrf();
      if (token) init.headers["X-XSRF-TOKEN"] = token;
    }
    if (opciones.body !== undefined) {
      init.headers["Content-Type"] = "application/json";
      init.body = JSON.stringify(opciones.body);
    }
    let resp;
    try {
      resp = await fetch(ruta, init);
    } catch {
      throw new Error("No se pudo conectar con el servidor.");
    }
    /* si la sesion del servidor vencio se vuelve al inicio */
    if (resp.status === 401 && ruta !== "/api/login") {
      let motivo = "";
      try {
        motivo = (await resp.json()).motivo || "";
      } catch {
        motivo = "";
      }
      TG.cerrarSesion();
      location.replace("/login" + (motivo ? "?motivo=" + motivo : ""));
      throw new Error("Tu sesión venció. Inicia sesión de nuevo.");
    }
    let datos = null;
    try {
      datos = await resp.json();
    } catch {
      datos = null;
    }
    /* otra pestana ya tiene abierta la sesion de este usuario */
    if (resp.status === 409 && datos && datos.motivo === "otra-pestana") {
      TG.cerrarSesion();
      location.replace("/login?motivo=otra-pestana");
      throw new Error(datos.mensaje);
    }
    if (!resp.ok) {
      const msg = datos && (datos.mensaje || Object.values(datos).join(". "));
      const fallo = new Error(msg || "Ocurrió un error (" + resp.status + ").");
      /* la pantalla distingue por ejemplo una prenda ya elegida 409 */
      fallo.status = resp.status;
      throw fallo;
    }
    return datos;
  };
  TG.get = (ruta) => TG.api(ruta);
  TG.post = (ruta, body) => TG.api(ruta, { method: "POST", body });
  TG.put = (ruta, body) =>
    TG.api(ruta, {
      method: "PUT",
      body: body === undefined ? undefined : body,
    });

  TG.prendas = () => TG.get("/api/prendas");
  TG.clientes = () => TG.get("/api/clientes");
  TG.boletas = () => TG.get("/api/boletas");
  TG.penalidades = () => TG.get("/api/penalidades");
  TG.configuracion = async () => {
    const lista = await TG.get("/api/configuracion");
    const mapa = {};
    lista.forEach((c) => {
      mapa[c.clave] = c;
    });
    return mapa;
  };

  /* revisa los montos de penalizacion del admin */
  TG.vigilarPenalidades = (alCambiar) => {
    let ultimo = "";
    const leer = async () => {
      try {
        const c = await TG.configuracion();
        const demora = Number(c.penalidadDemora?.valor) || 0;
        const malEstado = Number(c.penalidadMalEstado?.valor) || 0;
        const clave = demora + "|" + malEstado;
        if (clave === ultimo) return;
        ultimo = clave;
        alCambiar({ demora, malEstado });
      } catch {
        /* sin respuesta se vuelve a intentar */
      }
    };
    leer();
    setInterval(leer, 10000);
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) leer();
    });
  };

  /* metodos de pago yape y transferencia */
  TG.metodosPago = async () => {
    const lista = await TG.get("/api/metodos-pago");
    const mapa = {};
    lista.forEach((m) => {
      mapa[m.tipo] = m;
    });
    return mapa;
  };

  /* muestra bajo el selector de metodo los datos de cobro */
  let pedidoPago = 0;
  TG.mostrarDatosPago = async (metodo) => {
    const yape = document.getElementById("yapeAdminContainer");
    if (!yape) return;
    let trans = document.getElementById("transferenciaAdminContainer");
    if (!trans) {
      trans = document.createElement("div");
      trans.id = "transferenciaAdminContainer";
      trans.className = "yape-qr-box";
      trans.style.display = "none";
      yape.insertAdjacentElement("afterend", trans);
    }
    const id = ++pedidoPago;
    yape.style.display = "none";
    trans.style.display = "none";
    if (metodo !== "Yape" && metodo !== "Transferencia") return;

    let datos = {};
    try {
      datos = await TG.metodosPago();
    } catch (err) {
      TG.toast(err.message);
      return;
    }
    if (id !== pedidoPago) return; /* el empleado ya eligio otro metodo */

    const agrupar = (n, tam) =>
      String(n || "")
        .replace(new RegExp("(.{" + tam + "})(?=.)", "g"), "$1 ")
        .trim();

    if (metodo === "Yape") {
      const y = datos.YAPE || {};
      document.getElementById("yapeAdminTitulo").textContent =
        "Yape" + (y.titular ? " · " + y.titular : "");
      const img = document.getElementById("yapeAdminImg");
      const marco = img.closest(".yape-qr-img-wrapper") || img;
      if (y.qr) {
        img.src = y.qr;
        marco.style.display = "";
      } else {
        img.removeAttribute("src");
        marco.style.display = "none";
      }
      document.getElementById("yapeAdminNumero").textContent = y.numero
        ? agrupar(y.numero, 3)
        : "Yape sin configurar";
      yape.style.display = "block";
      return;
    }

    const t = datos.TRANSFERENCIA || {};
    const fila = (k, v) =>
      v
        ? '<div class="pago-datos-fila"><span>' +
          k +
          "</span><strong>" +
          TG.esc(v) +
          "</strong></div>"
        : "";
    trans.innerHTML =
      '<div class="yape-qr-title">Transferencia bancaria</div>' +
      (t.numero
        ? fila("Banco", t.banco) +
          fila("Titular", t.titular) +
          fila("N.° de cuenta", t.numero) +
          fila("CCI", t.cci)
        : '<div class="pago-datos-fila"><strong>Transferencia sin configurar</strong></div>');
    trans.style.display = "block";
  };

  /* sesion */
  TG.usuario = () => {
    try {
      return JSON.parse(sessionStorage.getItem(SESION) || "null");
    } catch {
      return null;
    }
  };
  /* nombre y primer apellido de quien atiende */
  TG.empleadoNombre = () => {
    const u = TG.usuario();
    if (!u) return "";
    const n = String(u.nombre || "").trim().split(/\s+/)[0] || "";
    const a = String(u.apellido || "").trim().split(/\s+/)[0] || "";
    return (n + " " + a).trim();
  };
  TG.iniciarSesion = (u) => sessionStorage.setItem(SESION, JSON.stringify(u));
  /* suelta la prenda elegida en comprar y alquilar sin esperar la respuesta */
  TG.liberarPrenda = (id) => {
    if (!id) return;
    const token = TG.csrf();
    const cabeceras = { "X-Tab-Id": TG.pestana() };
    if (token) cabeceras["X-XSRF-TOKEN"] = token;
    try {
      fetch("/api/prendas/liberar/" + id, {
        method: "POST",
        headers: cabeceras,
        keepalive: true,
      }).catch(() => {});
    } catch {
      /* si falla el servidor la suelta solo en unos minutos */
    }
  };
  TG.cerrarSesion = () => {
    try {
      const flujo = JSON.parse(
        sessionStorage.getItem("ternoCompraAlquiler") || "{}",
      );
      if (flujo.prendaId) TG.liberarPrenda(flujo.prendaId);
    } catch {
      /* sin datos del flujo no hay prenda que soltar */
    }
    sessionStorage.removeItem(SESION);
    sessionStorage.removeItem("ternoCompraAlquiler");
  };

  /* formato */
  const MESES = [
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
  TG.esc = (s) =>
    String(s ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
  TG.money = (n) =>
    "S/ " +
    (Number(n) || 0).toLocaleString("es-PE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  /* monto en letras para el pie de la boleta */
  TG.montoLetras = (n) => {
    n = Math.round((Number(n) || 0) * 100) / 100;
    const ent = Math.floor(n),
      cts = Math.round((n - ent) * 100);
    const U = [
      "cero",
      "uno",
      "dos",
      "tres",
      "cuatro",
      "cinco",
      "seis",
      "siete",
      "ocho",
      "nueve",
      "diez",
      "once",
      "doce",
      "trece",
      "catorce",
      "quince",
      "dieciséis",
      "diecisiete",
      "dieciocho",
      "diecinueve",
      "veinte",
      "veintiuno",
      "veintidós",
      "veintitrés",
      "veinticuatro",
      "veinticinco",
      "veintiséis",
      "veintisiete",
      "veintiocho",
      "veintinueve",
    ];
    const D = [
      "",
      "",
      "",
      "treinta",
      "cuarenta",
      "cincuenta",
      "sesenta",
      "setenta",
      "ochenta",
      "noventa",
    ];
    const C = [
      "",
      "ciento",
      "doscientos",
      "trescientos",
      "cuatrocientos",
      "quinientos",
      "seiscientos",
      "setecientos",
      "ochocientos",
      "novecientos",
    ];
    const menosMil = (x) => {
      if (x === 100) return "cien";
      const c = Math.floor(x / 100),
        r = x % 100;
      let s = c ? C[c] + (r ? " " : "") : "";
      if (r < 30) {
        if (r || !c) s += U[r];
      } else s += D[Math.floor(r / 10)] + (r % 10 ? " y " + U[r % 10] : "");
      return s;
    };
    let t = "cero";
    if (ent > 0 && ent < 1000) t = menosMil(ent);
    else if (ent >= 1000 && ent < 1000000) {
      const m = Math.floor(ent / 1000),
        r = ent % 1000;
      t =
        (m === 1
          ? "mil"
          : menosMil(m)
              .replace(/veintiuno$/, "veintiún")
              .replace(/uno$/, "un") + " mil") + (r ? " " + menosMil(r) : "");
    }
    return (
      "SON: " +
      t.toUpperCase() +
      " CON " +
      String(cts).padStart(2, "0") +
      "/100 SOLES"
    );
  };
  TG.hoyISO = () => {
    const d = new Date();
    return (
      d.getFullYear() +
      "-" +
      String(d.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(d.getDate()).padStart(2, "0")
    );
  };
  TG.fecha = (iso) => {
    if (!iso) return "—";
    const [a, m, d] = String(iso).slice(0, 10).split("-");
    return d + "/" + m + "/" + a;
  };
  TG.fechaCabecera = () => {
    const d = new Date();
    return (
      String(d.getDate()).padStart(2, "0") +
      " " +
      MESES[d.getMonth()] +
      " " +
      d.getFullYear()
    );
  };
  TG.fechaHora = () => {
    const d = new Date();
    let h = d.getHours();
    const ampm = h >= 12 ? "p. m." : "a. m.";
    h = h % 12 || 12;
    return (
      TG.fecha(TG.hoyISO()) +
      " · " +
      h +
      ":" +
      String(d.getMinutes()).padStart(2, "0") +
      " " +
      ampm
    );
  };
  TG.diasEntre = (desdeISO, hastaISO) =>
    Math.round(
      (new Date(hastaISO + "T00:00:00") - new Date(desdeISO + "T00:00:00")) /
        86400000,
    );
  TG.nombre = (c) => (c ? (c.nombres + " " + c.apellidos).trim() : "");
  TG.iniciales = (t) =>
    String(t || "")
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0].toUpperCase())
      .join("");
  TG.telefono = (c) => {
    const s = String(c?.celular || "");
    return s.length === 9 ? s.replace(/(\d{3})(\d{3})(\d{3})/, "$1 $2 $3") : s;
  };
  /* en las vistas de calificaciones se muestran unicamente las estrellas */
  TG.estrellas = (n, promedio) => {
    n = Math.max(0, Math.min(5, Math.round(Number(promedio || n) || 0)));
    if (!n) return '<span class="stars-empty">Sin calificar</span>';
    return (
      '<span class="stars" aria-label="' +
      n +
      ' de 5 estrellas">' +
      "★".repeat(n) +
      "</span>" +
      (n < 5
        ? '<span class="stars-empty">' + "☆".repeat(5 - n) + "</span>"
        : "")
    );
  };
  TG.descripcionPrenda = (p) => (p ? p.diseno + " · Talla " + p.talla : "");
  TG.claseEstado = (e) =>
    ({
      Disponible: "success",
      Alquilado: "warning",
      Reservado: "purple",
      "En lavandería": "info",
      "En confección": "info",
      "En restauración": "danger",
      Vendido: "info",
      Suspendido: "danger",
    })[e] || "info";
  /* texto que se muestra al usuario */
  TG.etiquetaEstado = (e) =>
    ({ "En lavandería": "Lavandería", "En restauración": "Restauración" })[e] ||
    e;
  TG.claveEstado = (e) =>
    ({
      Disponible: "disponible",
      Alquilado: "alquilado",
      Reservado: "reservado",
      Vendido: "vendido",
      "Vendido a medida": "vendidomedida",
      Entregada: "entregada",
      "En lavandería": "lavanderia",
      "En restauración": "restauracion",
      "En confección": "confeccion",
      Suspendido: "suspendido",
    })[e] || "otro";
  /* insignia con punto fondo suave texto contrastado y punto */
  TG.insigniaEstado = (e) =>
    '<span class="badge-estado est-' +
    TG.claveEstado(e) +
    '"><i></i>' +
    TG.esc(TG.etiquetaEstado(e)) +
    "</span>";
  TG.etiquetaPenalidad = (t) =>
    ({
      Demora: "Por demora",
      "Mal estado": "Por mal estado",
      Ambos: "Por ambos",
    })[t] || t;
  /* las prendas suspendidas no salen en catalogos cobros ni inventarios */
  TG.prendasVisibles = (lista) => lista.filter((p) => !p.suspendida);

  /* un cliente esta con deuda si tiene penalidades pendientes bloqueado */
  TG.estadoCliente = (c, penalidades) => {
    if (
      (penalidades || []).some(
        (p) => p.cliente && p.cliente.id === c.id && p.estado === "Pendiente",
      )
    )
      return "Con deuda";
    return c.alquilerBloqueado ? "Bloqueado" : "Activo";
  };
  /* ultimo servicio realmente tomado por el cliente */
  TG.ultimaOperacion = (c, boletas) => {
    const operaciones = (boletas || [])
      .filter(
        (b) => b.cliente && b.cliente.id === c.id && b.estado !== "Anulada",
      )
      .sort(
        (a, b) =>
          String(b.fecha || "").localeCompare(String(a.fecha || "")) ||
          Number(b.id || 0) - Number(a.id || 0),
      );
    if (!operaciones.length) return "Sin operaciones";
    const ultima = operaciones[0];
    const tipo =
      {
        Venta: "Compra",
        Alquiler: "Alquiler",
        Reserva: "Reserva",
        Confección: "Confección",
      }[ultima.tipo] ||
      ultima.tipo ||
      "Servicio";
    return TG.esc(tipo) + (ultima.fecha ? " · " + TG.fecha(ultima.fecha) : "");
  };

  /* aviso emergente tipo */
  const AVISOS = {
    ok: ["✓", "Operación exitosa", 4000],
    info: ["i", "Aviso", 5500],
    error: ["!", "No se pudo completar", 8000],
  };
  TG.cerrarToast = () => {
    const c = document.getElementById("toast");
    if (c) c.hidden = true;
    clearTimeout(TG._t);
  };
  TG.toast = (mensaje, tipo = "ok") => {
    const caja = document.getElementById("toast"),
      txt = document.getElementById("toastMessage");
    if (!caja) {
      alert(mensaje);
      return;
    }
    const [icono, titulo, ms] = AVISOS[tipo] || AVISOS.ok;
    if (txt) txt.textContent = mensaje;
    caja.classList.toggle("is-error", tipo === "error");
    caja.classList.toggle("is-info", tipo === "info");
    caja.setAttribute("role", tipo === "error" ? "alert" : "status");
    const i = caja.querySelector(":scope > i"),
      t = caja.querySelector("strong");
    if (i) i.textContent = icono;
    if (t) t.textContent = titulo;
    let x = caja.querySelector(".toast-close");
    if (!x) {
      x = document.createElement("button");
      x.type = "button";
      x.className = "toast-close";
      x.setAttribute("aria-label", "Cerrar aviso");
      x.textContent = "×";
      caja.appendChild(x);
    }
    if (!x._cierra) {
      x._cierra = true;
      x.addEventListener("click", TG.cerrarToast);
    }
    caja.hidden = false;
    clearTimeout(TG._t);
    TG._t = setTimeout(TG.cerrarToast, ms);
  };
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") TG.cerrarToast();
  });

  /* ventana de formulario reutilizable */
  const estiloInput =
    "border:1px solid #d0d5dd;border-radius:8px;padding:10px 14px;font-size:14px;width:100%;box-sizing:border-box;font-family:inherit;";
  /* ventana de confirmacion con dos botones */
  TG.confirmar = ({
    titulo,
    mensaje,
    textoOk = "Confirmar",
    textoCancelar = "Cancelar",
    onOk,
    onCancel,
  }) => {
    const fondo = document.createElement("div");
    fondo.setAttribute("data-tg-modal", "");
    fondo.style.cssText =
      "position:fixed;inset:0;background:rgba(16,24,40,.55);display:flex;align-items:center;justify-content:center;z-index:9999;padding:16px;";
    fondo.innerHTML =
      '<div role="dialog" aria-modal="true" style="background:#fff;border-radius:14px;padding:24px;width:100%;max-width:400px;display:flex;flex-direction:column;gap:12px;box-shadow:0 20px 50px rgba(0,0,0,.25);">' +
      '<h2 style="margin:0;font-size:18px;color:#101828;">' +
      TG.esc(titulo) +
      "</h2>" +
      (mensaje
        ? '<p style="margin:0;font-size:14px;line-height:1.4;color:#667085;">' +
          TG.esc(mensaje) +
          "</p>"
        : "") +
      '<div data-modal-actions style="display:flex;justify-content:flex-end;gap:10px;margin-top:8px;">' +
      '<button type="button" data-cancelar style="padding:10px 20px;border-radius:8px;border:1px solid #d0d5dd;background:#fff;color:#344054;font-weight:600;cursor:pointer;">' +
      TG.esc(textoCancelar) +
      "</button>" +
      '<button type="button" data-ok style="padding:10px 20px;border-radius:8px;border:none;background:#b3820a;color:#fff;font-weight:600;cursor:pointer;">' +
      TG.esc(textoOk) +
      "</button></div></div>";
    document.body.appendChild(fondo);
    let cerrado = false;
    const cerrar = () => {
      cerrado = true;
      fondo.remove();
      document.removeEventListener("keydown", esc);
    };
    const cancelar = () => {
      if (cerrado) return;
      cerrar();
      onCancel && onCancel();
    };
    const esc = (e) => e.key === "Escape" && cancelar();
    document.addEventListener("keydown", esc);
    fondo.querySelector("[data-cancelar]").addEventListener("click", cancelar);
    fondo.addEventListener("mousedown", (e) => {
      if (e.target === fondo) cancelar();
    });
    fondo.querySelector("[data-ok]").addEventListener("click", () => {
      if (cerrado) return;
      cerrar();
      onOk && onOk();
    });
    fondo.querySelector("[data-ok]").focus();
  };

  TG.modal = ({
    titulo,
    subtitulo,
    campos,
    textoOk = "Guardar",
    onOk,
    compacto = false,
  }) => {
    const fondo = document.createElement("div");
    fondo.setAttribute("data-tg-modal", "");
    fondo.style.cssText =
      "position:fixed;inset:0;background:rgba(16,24,40,.55);display:flex;align-items:center;justify-content:center;z-index:9999;padding:16px;";
    const filas = campos
      .map((c) => {
        let ctl;
        if (c.options || c.grupos) {
          const opcion = (o) =>
            '<option value="' +
            TG.esc(o) +
            '"' +
            (o === c.value ? " selected" : "") +
            ">" +
            TG.esc(o) +
            "</option>";
          ctl =
            '<select name="' +
            c.name +
            '" style="' +
            estiloInput +
            '">' +
            (c.grupos
              ? c.grupos
                  .map(
                    ([g, lista]) =>
                      '<optgroup label="' +
                      TG.esc(g) +
                      '">' +
                      lista.map(opcion).join("") +
                      "</optgroup>",
                  )
                  .join("")
              : c.options.map(opcion).join("")) +
            "</select>";
        } else if (c.type === "imagen") {
          ctl =
            '<input name="' +
            c.name +
            '" type="file" accept="image/*" style="' +
            estiloInput +
            'padding:8px;">' +
            '<img data-prev="' +
            c.name +
            '" alt="" style="' +
            (c.value ? "" : "display:none;") +
            'max-height:120px;border-radius:8px;object-fit:cover;align-self:flex-start;" ' +
            (c.value ? 'src="' + TG.esc(c.value) + '"' : "") +
            ">";
        } else if (c.type === "textarea") {
          ctl =
            '<textarea name="' +
            c.name +
            '" rows="3" style="' +
            estiloInput +
            '">' +
            TG.esc(c.value ?? "") +
            "</textarea>";
        } else {
          ctl =
            '<input name="' +
            c.name +
            '" type="' +
            (c.type || "text") +
            '" value="' +
            TG.esc(c.value ?? "") +
            '" placeholder="' +
            TG.esc(c.placeholder || "") +
            '"' +
            (c.step ? ' step="' + c.step + '"' : "") +
            (c.maxlength ? ' maxlength="' + c.maxlength + '"' : "") +
            (c.autocomplete === false ? ' autocomplete="off"' : "") +
            (c.readonly ? " readonly" : "") +
            (c.sugerencias ? ' list="tg-sug-' + c.name + '"' : "") +
            ' style="' +
            estiloInput +
            (c.readonly ? "background:#f2f4f7;" : "") +
            '">' +
            (c.sugerencias
              ? '<datalist id="tg-sug-' +
                c.name +
                '">' +
                c.sugerencias
                  .map((o) => '<option value="' + TG.esc(o) + '"></option>')
                  .join("") +
                "</datalist>"
              : "");
        }
        return (
          "<label" +
          (c.type === "imagen" || c.type === "textarea"
            ? " data-ancho"
            : "") +
          ' style="display:flex;flex-direction:column;gap:6px;font-size:13px;font-weight:500;color:#374151;">' +
          TG.esc(c.label) +
          ctl +
          "</label>"
        );
      })
      .join("");
    fondo.innerHTML =
      "<form" +
      (compacto ? " data-compacto" : "") +
      ' style="background:#fff;border-radius:14px;padding:24px;width:100%;max-width:480px;max-height:90vh;overflow:auto;display:flex;flex-direction:column;gap:14px;box-shadow:0 20px 50px rgba(0,0,0,.25);">' +
      '<div data-modal-head><h2 style="margin:0;font-size:18px;color:#101828;">' +
      TG.esc(titulo) +
      "</h2>" +
      (subtitulo
        ? '<p style="margin:4px 0 0;font-size:13px;color:#667085;">' +
          TG.esc(subtitulo) +
          "</p>"
        : "") +
      "</div>" +
      filas +
      '<div data-error style="display:none;background:#fef3f2;color:#b42318;border-radius:8px;padding:10px 12px;font-size:13px;"></div>' +
      '<div data-modal-actions style="display:flex;justify-content:flex-end;gap:10px;margin-top:6px;">' +
      '<button type="button" data-cancelar style="padding:10px 20px;border-radius:8px;border:1px solid #d0d5dd;background:#fff;color:#344054;font-weight:600;cursor:pointer;">Cancelar</button>' +
      '<button type="submit" style="padding:10px 20px;border-radius:8px;border:none;background:#b3820a;color:#fff;font-weight:600;cursor:pointer;">' +
      TG.esc(textoOk) +
      "</button></div></form>";
    document.body.appendChild(fondo);
    const form = fondo.querySelector("form"),
      caja = fondo.querySelector("[data-error]");
    const cerrar = () => fondo.remove();
    const imagenes = {};
    campos
      .filter((c) => c.type === "imagen")
      .forEach((c) => {
        form.elements[c.name].addEventListener("change", async (e) => {
          const f = e.target.files[0];
          if (!f) return;
          try {
            imagenes[c.name] = await TG.reducirImagen(f);
            const prev = form.querySelector('[data-prev="' + c.name + '"]');
            prev.src = imagenes[c.name];
            prev.style.display = "block";
          } catch (err) {
            TG.toast(err.message);
            e.target.value = "";
          }
        });
      });
    fondo.querySelector("[data-cancelar]").addEventListener("click", cerrar);
    fondo.addEventListener("mousedown", (e) => {
      if (e.target === fondo) cerrar();
    });
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (
        !TG.validarTodo(
          campos.filter((c) => c.regla).map((c) => form.elements[c.name]),
        )
      )
        return;
      const valores = {};
      campos.forEach((c) => {
        valores[c.name] =
          c.type === "imagen"
            ? imagenes[c.name] || ""
            : form.elements[c.name].value.trim();
      });
      caja.style.display = "none";
      try {
        await onOk(valores);
        cerrar();
      } catch (err) {
        caja.textContent = err.message;
        caja.style.display = "block";
      }
    });
    campos
      .filter((c) => c.regla)
      .forEach((c) =>
        TG.vincular(form.elements[c.name], c.regla, {
          requerido: c.requerido !== false,
        }),
      );
    campos
      .filter((c) => c.type === "password")
      .forEach((c) => TG.ojo(form.elements[c.name]));

    /* campos con limpiaralclic muestran su valor actual */
    campos
      .filter((c) => c.limpiarAlClic)
      .forEach((c) => {
        const el = form.elements[c.name];
        let limpio = false;
        el.addEventListener("focus", () => {
          if (limpio) return;
          limpio = true;
          el.value = "";
        });
      });
    /* al editar no se enfoca ningun campo */
    const primero = campos.some((c) => c.limpiarAlClic)
      ? null
      : form.querySelector("input:not([readonly]),select,textarea");
    primero && primero.focus();
    return { cerrar };
  };

  /* lee una foto y la reduce */
  TG.reducirImagen = (archivo) =>
    new Promise((resolve, reject) => {
      if (!/^image\//.test(archivo.type)) {
        reject(new Error("El archivo debe ser una imagen."));
        return;
      }
      const lector = new FileReader();
      lector.onerror = () => reject(new Error("No se pudo leer la imagen."));
      lector.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error("No se pudo abrir la imagen."));
        img.onload = () => {
          const k = Math.min(1, 700 / Math.max(img.width, img.height));
          const c = document.createElement("canvas");
          c.width = Math.round(img.width * k);
          c.height = Math.round(img.height * k);
          c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
          resolve(c.toDataURL("image/jpeg", 0.82));
        };
        img.src = lector.result;
      };
      lector.readAsDataURL(archivo);
    });

  /* un cliente queda eliminado cuando tuvo boletas y todas fueron */
  TG.clienteEliminado = (c, boletas) => {
    const mias = (boletas || []).filter(
      (b) => b.cliente && b.cliente.id === c.id,
    );
    return mias.length > 0 && mias.every((b) => b.estado === "Anulada");
  };

  /* calificacion obligatoria del cliente */
  /* la opcion de calificacion se elige sola segun las estrellas */
  const ETIQUETAS = {
    5: "Excelente",
    4: "Bueno",
    3: "Regular",
    2: "Malo",
    1: "Pésimo",
  };
  /* comentarios que se guardaban antes de este cambio */
  const MOTIVOS_ANTIGUOS = [
    "Se comporta mal",
    "Insulta o maltrata al personal",
    "Se portó normal",
    "Buen cliente",
    "Recontra buen cliente",
    "Cliente excelente",
  ];
  /* comentario que corresponde a las estrellas */
  TG.comentarioAuto = (estrellas, comentario) => {
    const n = Math.max(0, Math.min(5, Math.round(Number(estrellas) || 0)));
    if (!n) return "—";
    const [base, ...resto] = String(comentario || "").split(" — ");
    const extra = resto.join(" — ").trim();
    const b = base.trim();
    const esMotivo =
      Object.values(ETIQUETAS).includes(b) || MOTIVOS_ANTIGUOS.includes(b);
    return ETIQUETAS[n] + (esMotivo && extra ? " — " + extra : "");
  };
  TG.calificarObligatorio = (cliente) =>
    new Promise((resolve) => {
      let estrellas = 0,
        motivo = "";
      const fondo = document.createElement("div");
      fondo.setAttribute("data-tg-modal", "");
      fondo.style.cssText =
        "position:fixed;inset:0;background:rgba(16,24,40,.6);display:flex;align-items:center;justify-content:center;z-index:10000;padding:16px;";
      fondo.innerHTML =
        '<div data-tg-calificador style="background:#fff;border-radius:14px;padding:26px;width:100%;max-width:480px;max-height:92vh;overflow:auto;box-shadow:0 20px 50px rgba(0,0,0,.3);">' +
        '<h2 style="margin:0;font-size:19px;color:#101828;">Califica al cliente</h2>' +
        '<p style="margin:4px 0 16px;font-size:13px;color:#667085;">' +
        TG.esc(TG.nombre(cliente)) +
        " · DNI " +
        TG.esc(cliente.dni) +
        ". Es obligatorio para terminar.</p>" +
        '<div data-estrellas style="display:flex;gap:6px;justify-content:center;margin-bottom:6px;"></div>' +
        '<p data-etq style="text-align:center;margin:0 0 14px;font-size:13px;color:#667085;min-height:18px;">Elige de 1 a 5 estrellas</p>' +
        '<div data-motivos style="display:none;flex-direction:column;gap:8px;margin-bottom:14px;"></div>' +
        '<label style="display:flex;flex-direction:column;gap:6px;font-size:13px;font-weight:500;color:#374151;">Comentario (opcional)' +
        '<textarea data-comentario rows="3" maxlength="150" placeholder="Cuéntanos cómo fue el cliente..." style="' +
        estiloInput +
        '"></textarea></label>' +
        '<div style="display:flex;justify-content:flex-end;margin-top:18px;"><button type="button" data-ok disabled style="padding:11px 22px;border-radius:8px;border:none;background:#b3820a;color:#fff;font-weight:600;cursor:not-allowed;opacity:.5;">Confirmar calificación</button></div></div>';
      document.body.appendChild(fondo);
      const caja = fondo.querySelector("[data-estrellas]"),
        motivos = fondo.querySelector("[data-motivos]"),
        etq = fondo.querySelector("[data-etq]"),
        ok = fondo.querySelector("[data-ok]");
      const pintarEstrellas = () => {
        caja.innerHTML = [1, 2, 3, 4, 5]
          .map(
            (n) =>
              '<button type="button" data-n="' +
              n +
              '" aria-label="' +
              n +
              ' estrellas" style="background:none;border:none;font-size:38px;line-height:1;cursor:pointer;padding:0 3px;color:' +
              (n <= estrellas ? "#f5a623" : "#d0d5dd") +
              ';">★</button>',
          )
          .join("");
      };
      /* una sola opcion marcada automaticamente segun las estrellas elegidas */
      const pintarMotivos = () => {
        if (!estrellas) {
          motivos.style.display = "none";
          return;
        }
        motivos.style.display = "flex";
        motivos.innerHTML =
          '<span style="font-size:13px;font-weight:500;color:#374151;">¿Cómo fue el cliente?</span>' +
          '<div data-motivo-auto="' +
          TG.esc(motivo) +
          '" style="text-align:left;padding:10px 14px;border-radius:8px;font-size:14px;border:1px solid #b3820a;background:#fffaf0;color:#344054;font-weight:600;">● ' +
          TG.esc(motivo) +
          "</div>";
      };
      const refrescar = () => {
        pintarEstrellas();
        pintarMotivos();
        etq.textContent = estrellas
          ? estrellas + " de 5 estrellas"
          : "Elige de 1 a 5 estrellas";
        const listo = estrellas > 0 && motivo !== "";
        ok.disabled = !listo;
        ok.style.opacity = listo ? "1" : ".5";
        ok.style.cursor = listo ? "pointer" : "not-allowed";
      };
      caja.addEventListener("click", (e) => {
        const b = e.target.closest("[data-n]");
        if (!b) return;
        const n = Number(b.dataset.n);
        estrellas = n;
        motivo = ETIQUETAS[n];
        refrescar();
      });
      ok.addEventListener("click", async () => {
        if (!estrellas || !motivo) return;
        ok.disabled = true;
        ok.textContent = "Guardando...";
        const extra = fondo.querySelector("[data-comentario]").value.trim();
        try {
          const actualizado = await TG.put(
            "/api/clientes/calificar/" + cliente.id,
            {
              calificacion: estrellas,
              comentario: motivo + (extra ? " — " + extra : ""),
            },
          );
          fondo.remove();
          TG.toast("Calificación guardada");
          resolve(actualizado);
        } catch (err) {
          ok.disabled = false;
          ok.textContent = "Confirmar calificación";
          TG.toast(err.message);
        }
      });
      refrescar();
    });

  /* validacion de formularios */
  const css = document.createElement("style");
  css.textContent =
    ".tg-invalid{border-color:#d92d20!important;box-shadow:0 0 0 1px #d92d20!important;outline:none!important}" +
    ".tg-msg{display:block;color:#d92d20;font-size:12px;font-weight:500;margin-top:4px;line-height:1.3}";
  document.head.appendChild(css);

  /* contrasena facil palabra comun 3 caracteres iguales */
  const PALABRAS_FACILES = [
    "admin", "password", "passw0rd", "contrasena", "contraseña", "clave",
    "qwerty", "asdf", "zxcv", "empleado", "usuario", "gabriel", "terno",
    "peru", "lima", "abc123", "letmein", "welcome",
  ];
  TG.esFacil = (v) => {
    const c = String(v).toLowerCase();
    if (PALABRAS_FACILES.some((p) => c.includes(p))) return true;
    let iguales = 1, sube = 1, baja = 1;
    for (let i = 1; i < c.length; i++) {
      const d = c.charCodeAt(i) - c.charCodeAt(i - 1);
      iguales = d === 0 ? iguales + 1 : 1;
      sube = d === 1 ? sube + 1 : 1;
      baja = d === -1 ? baja + 1 : 1;
      if (iguales >= 3 || sube >= 4 || baja >= 4) return true;
    }
    return false;
  };
  TG.reglas = {
    dni: {
      filtro: (v) => v.replace(/\D/g, "").slice(0, 8),
      ok: (v) => /^\d{8}$/.test(v),
      msg: "DNI inválido: debe tener exactamente 8 números",
    },
    celular: {
      filtro: (v) => v.replace(/\D/g, "").slice(0, 9),
      ok: (v) => /^9\d{8}$/.test(v),
      msg: "Teléfono inválido: 9 números y debe empezar con 9",
    },
    correo: {
      ok: (v) => /^[A-Za-z0-9._%+-]+@gmail\.com$/i.test(v),
      msg: "Correo inválido: debe terminar en @gmail.com",
    },
    nombre: {
      filtro: (v) =>
        v.replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ\s'-]/g, "").replace(/\s{2,}/g, " "),
      ok: (v) => v.trim().length >= 2,
      msg: "Inválido: solo letras (mínimo 2)",
    },
    direccion: {
      ok: (v) => v.trim().length >= 5,
      msg: "Dirección inválida (mínimo 5 caracteres)",
    },
    texto: { ok: (v) => v.trim().length >= 1, msg: "Dato inválido" },
    codigo: {
      ok: (v) => /^[A-Za-z0-9-]{3,}$/.test(v.trim()),
      msg: "Código inválido (letras, números y guion, mínimo 3)",
    },
    monto: {
      ok: (v) => Number(v) > 0,
      msg: "Monto inválido: debe ser mayor a 0",
    },
    /* prenda 3 letras en mayuscula guion automatico y solo numeros */
    codigoPrenda: {
      filtro: (v, e) => {
        v = v.toUpperCase();
        let l = "",
          d = "";
        for (const ch of v) {
          if (l.length < 3) {
            if (/[A-Z]/.test(ch)) l += ch;
          } else if (/\d/.test(ch) && d.length < 3) d += ch;
        }
        const borrando = e && e.inputType && e.inputType.startsWith("delete");
        return l.length === 3 && (d || !borrando) ? l + "-" + d : l;
      },
      ok: (v) => /^[A-Z]{3}-\d{3}$/.test(v),
      msg: "Código inválido: 3 letras, guion y 3 números (ej. TRN-005)",
    },
    /* precio solo numeros y un punto */
    precio: {
      filtro: (v) => {
        let s = v.replace(/[^\d.]/g, "");
        const i = s.indexOf(".");
        if (i >= 0)
          s =
            s.slice(0, i + 1) +
            s
              .slice(i + 1)
              .replace(/\./g, "")
              .slice(0, 2);
        return s.slice(0, 9);
      },
      formato: (v) => {
        const n = Number(v);
        return v && !isNaN(n) ? n.toFixed(2) : v;
      },
      ok: (v) => Number(v) > 0,
      msg: "Precio inválido: debe ser mayor a 0",
    },
    /* codigo de empleado 4 caracteres mayusculas sin espacios letras */
    codigoEmpleado: {
      filtro: (v) =>
        v
          .toUpperCase()
          .replace(/[^A-Z0-9]/g, "")
          .slice(0, 4),
      ok: (v) => /^[A-Z0-9]{4}$/.test(v),
      msg: "Código inválido: 4 caracteres entre letras y números (ej. E001)",
    },
    usuario: {
      filtro: (v) => v.replace(/\s/g, ""),
      ok: (v) => /^[A-Za-z0-9._-]{4,}$/.test(v),
      msg: "Usuario inválido: mínimo 4 caracteres, sin espacios",
    },
    contrasena: {
      ok: (v) => v.length >= 4,
      msg: "La contraseña debe tener al menos 4 caracteres",
    },
    /* reglas de correo y contrasena de acceso */
    correoAcceso: {
      filtro: (v) => v.replace(/\s/g, "").slice(0, 50),
      ok: (v) =>
        /^(?=.{1,50}$)[a-z0-9]+([._+-][a-z0-9]+)*@gmail\.com$/i.test(v),
      msg: (v) =>
        !v.includes("@")
          ? "Falta el @. Ejemplo: nombre@gmail.com"
          : !/@gmail\.com$/i.test(v)
            ? "El correo debe terminar en @gmail.com (revisa que no haya puntos de más). Ejemplo: nombre@gmail.com"
            : "Revisa lo que va antes de @gmail.com: sin puntos al inicio, al final o seguidos",
    },
    contrasenaSegura: {
      filtro: (v) => v.replace(/\s/g, "").slice(0, 72),
      ok: (v) =>
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)\S{9,72}$/.test(v) && !TG.esFacil(v),
      msg: (v) => {
        const falta = [];
        if (v.length < 9) falta.push("más de 8 caracteres");
        if (!/[a-z]/.test(v)) falta.push("una minúscula");
        if (!/[A-Z]/.test(v)) falta.push("una mayúscula");
        if (!/\d/.test(v)) falta.push("un número");
        return falta.length
          ? "La contraseña necesita: " + falta.join(", ") + ". Ejemplo: Luna7Cafe42"
          : "Contraseña muy fácil de adivinar: no uses palabras comunes (admin, clave, password…), números seguidos (1234) ni caracteres repetidos (aaa). Ejemplo: Luna7Cafe42";
      },
    },
    area: {
      ok: (v) => v.trim().length >= 3,
      msg: "Indica el área o puesto (mínimo 3 caracteres)",
    },
    fechaHoy: {
      ok: (v) => !!v && v >= TG.hoyISO(),
      msg: "Fecha inválida: no puede ser anterior a hoy",
    },
  };

  /* buscadores solo dejan escribir un dni */
  TG.filtroBusqueda = (input, letra) => {
    if (!input) return;
    const SERIE = "001";
    input.maxLength = 9;
    input.setAttribute("autocomplete", "off");
    input.addEventListener("input", (e) => {
      let v = input.value.toUpperCase();
      if (/^\d/.test(v)) {
        v = v.replace(/\D/g, "").slice(0, 8);
      } else if (v) {
        if (v[0] !== letra) v = "";
        else {
          let serie = "",
            num = "";
          for (const ch of v.slice(1).replace(/\D/g, "")) {
            if (serie.length < 3) {
              if (ch === SERIE[serie.length]) serie += ch;
            } else if (num.length < 4) num += ch;
          }
          const borrando = e && e.inputType && e.inputType.startsWith("delete");
          v =
            letra +
            serie +
            (serie.length === 3 && (num || !borrando) ? "-" + num : "");
        }
      }
      if (v !== input.value) input.value = v;
    });
  };

  /* ojito para campos de contrasena */
  const OJO_ABIERTO =
    '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg>';
  const OJO_CERRADO =
    '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17.94 17.94A10.9 10.9 0 0 1 12 19C5 19 1 12 1 12a19.8 19.8 0 0 1 5.06-5.94"/><path d="M9.9 4.24A10.9 10.9 0 0 1 12 4c7 0 11 8 11 8a19.8 19.8 0 0 1-3.17 4.19"/><path d="M1 1l22 22"/></svg>';
  /* sin autocompletar ni guardado y sin copiar cortar arrastrar ni clic derecho */
  TG.protegerClave = (input) => {
    /* new-password lo respetan todos los navegadores y off lo ignoran */
    input.setAttribute("autocomplete", "new-password");
    input.setAttribute("autocapitalize", "none");
    input.setAttribute("spellcheck", "false");
    input.setAttribute("data-lpignore", "true");
    input.setAttribute("data-1p-ignore", "");
    input.setAttribute("data-bwignore", "true");
    input.setAttribute("data-form-type", "other");
    const frenar = (e) => e.preventDefault();
    ["copy", "cut", "dragstart", "drag", "drop", "contextmenu"].forEach((ev) =>
      input.addEventListener(ev, frenar),
    );
    input.addEventListener("keydown", (e) => {
      const k = e.key.toLowerCase();
      if (
        ((e.ctrlKey || e.metaKey) && (k === "c" || k === "x" || k === "insert")) ||
        (e.shiftKey && k === "delete")
      )
        e.preventDefault();
    });
  };

  /* puntos simulados mas puntos que letras sin tocar el valor real */
  TG.claveVisual = (input, caja) => {
    const PASO = 9;
    const panel = document.createElement("span");
    panel.className = "clave-visual";
    panel.setAttribute("aria-hidden", "true");
    const puntos = document.createElement("i");
    puntos.className = "clave-puntos";
    const cursor = document.createElement("i");
    cursor.className = "clave-cursor";
    panel.append(puntos, cursor);
    caja.appendChild(panel);
    let activo = true;
    const simulados = (n) => (n ? n + 4 + Math.floor(n / 3) : 0);
    const pintar = () => {
      if (!activo) return;
      const n = input.value.length;
      const cabe = Math.max(1, Math.floor(panel.clientWidth / PASO) - 1);
      const m = Math.min(simulados(n), cabe);
      puntos.style.width = m * PASO + "px";
      const p = input.selectionStart == null ? n : input.selectionStart;
      const sinRango = input.selectionStart === input.selectionEnd;
      const idx = n ? Math.round((p * m) / n) : 0;
      cursor.style.left = Math.min(idx, m) * PASO + "px";
      cursor.style.visibility = sinRango ? "visible" : "hidden";
    };
    ["input", "keyup", "click", "focus", "select", "mouseup", "change"].forEach(
      (ev) => input.addEventListener(ev, pintar),
    );
    input.addEventListener("keydown", () => setTimeout(pintar, 0));
    window.addEventListener("resize", pintar);
    input._tgPintar = pintar;
    /* al mostrar la clave se quitan los puntos simulados */
    input._tgOcultar = (oculta) => {
      activo = oculta;
      input.classList.toggle("clave-visual-on", oculta);
      panel.hidden = !oculta;
      if (oculta) pintar();
    };
    input._tgOcultar(true);
  };

  TG.ojo = (input) => {
    if (!input || input._tgOjo) return;
    input._tgOjo = true;
    /* los mensajes de error siguen saliendo debajo del campo */
    input._tgCont = input._tgCont || input.parentElement;
    const caja = document.createElement("span");
    caja.style.cssText = "position:relative;display:block;width:100%;";
    input.parentElement.insertBefore(caja, input);
    caja.appendChild(input);
    input.style.paddingRight = "42px";
    /* la clave sigue siendo type password */
    if (input.hasAttribute("data-sin-autocompletar")) TG.protegerClave(input);
    if (input.hasAttribute("data-clave-visual")) TG.claveVisual(input, caja);
    const b = document.createElement("button");
    b.type = "button";
    b.setAttribute("aria-label", "Mostrar contraseña");
    b.setAttribute("aria-pressed", "false");
    b.style.cssText =
      "position:absolute;top:0;right:0;height:" +
      (input.offsetHeight || 42) +
      "px;width:40px;display:flex;align-items:center;justify-content:center;background:none;border:none;padding:0;cursor:pointer;color:#667085;";
    b.innerHTML = OJO_ABIERTO;
    b.addEventListener("click", () => {
      const ver = input.type === "password";
      input.type = ver ? "text" : "password";
      if (input._tgOcultar) input._tgOcultar(!ver);
      b.innerHTML = ver ? OJO_CERRADO : OJO_ABIERTO;
      b.setAttribute("aria-pressed", ver ? "true" : "false");
      b.setAttribute("aria-label", ver ? "Ocultar contraseña" : "Mostrar contraseña");
    });
    caja.appendChild(b);
  };

  /* pone o quita el borde rojo y el mensaje */
  TG.marcar = (input, mensaje) => {
    const cont = input._tgCont || input.parentElement;
    let msg = cont.querySelector(
      ':scope > .tg-msg[data-de="' + (input.name || input.id) + '"]',
    );
    if (mensaje) {
      input.classList.add("tg-invalid");
      if (!msg) {
        msg = document.createElement("span");
        msg.className = "tg-msg";
        msg.setAttribute("data-de", input.name || input.id);
        cont.appendChild(msg);
      }
      msg.textContent = mensaje;
    } else {
      input.classList.remove("tg-invalid");
      if (msg) msg.remove();
    }
  };
  TG.validarCampo = (input) => {
    const cfg = input._tg;
    if (!cfg) return true;
    const v = String(input.value ?? "").trim();
    let mensaje = null;
    if (v === "") mensaje = cfg.requerido ? "Este campo es obligatorio" : null;
    else if (cfg.regla.ok && !cfg.regla.ok(v))
      mensaje =
        typeof cfg.regla.msg === "function" ? cfg.regla.msg(v) : cfg.regla.msg;
    TG.marcar(input, mensaje);
    return !mensaje;
  };
  /* valida varios campos a la vez */
  TG.validarTodo = (inputs) => {
    let todoOk = true,
      primero = null;
    inputs
      .filter((i) => i && i._tg && !i.readOnly && !i.disabled)
      .forEach((i) => {
        i._tocado = true;
        if (!TG.validarCampo(i)) {
          todoOk = false;
          primero = primero || i;
        }
      });
    primero && primero.focus();
    return todoOk;
  };
  TG.limpiarValidacion = (contenedor) => {
    contenedor
      .querySelectorAll(".tg-invalid")
      .forEach((i) => i.classList.remove("tg-invalid"));
    contenedor.querySelectorAll(".tg-msg").forEach((m) => m.remove());
    contenedor.querySelectorAll("input").forEach((i) => {
      i._tocado = false;
    });
  };
  /* enlaza un campo con una regla */
  TG.vincular = (input, regla, opciones = {}) => {
    const r = typeof regla === "string" ? TG.reglas[regla] : regla;
    input._tg = { regla: r, requerido: opciones.requerido !== false };
    if (opciones.contenedor) input._tgCont = opciones.contenedor;
    if (r.filtro)
      input.addEventListener("input", (e) => {
        const n = r.filtro(input.value, e);
        if (n !== input.value) input.value = n;
      });
    if (r.formato)
      input.addEventListener("blur", () => {
        if (input.value) input.value = r.formato(input.value);
      });
    input.addEventListener("input", () => {
      if (input._tocado) TG.validarCampo(input);
    });
    input.addEventListener("change", () => {
      input._tocado = true;
      TG.validarCampo(input);
    });
    input.addEventListener("blur", () => {
      input._tocado = true;
      TG.validarCampo(input);
    });
    if (input.tagName === "INPUT" && input.placeholder) {
      /* el ejemplo desaparece al hacer clic */
      const ejemplo = input.placeholder;
      input.addEventListener("focus", () => {
        input.placeholder = "";
      });
      input.addEventListener("blur", () => {
        input.placeholder = ejemplo;
      });
    }
    return input;
  };

  /* catalogo con los precios vigentes */
  const IMG = {
    Ternos:
      "https://images.unsplash.com/photo-1618886614638-80e3c103d31a?auto=format&fit=crop&w=700&q=85",
    Smoking:
      "https://images.unsplash.com/photo-1617127365659-c47fa864d8bc?auto=format&fit=crop&w=700&q=85",
  };
  /* opciones que define el administrador y usan los filtros */
  /* colores base nombre color de la bolita */
  TG.COLORES_BASE = [
    ["Negro", "#111111", /negro/i],
    ["Blanco", "#ffffff", /blanco/i],
    ["Crema", "#f3e9c9", /crema|cream/i],
    ["Gris Claro", "#d1d5db", /gris\s*(claro|perla)|perla/i],
    ["Gris Oscuro", "#4b5058", /gris\s*oscuro|plomo|oxford/i],
    ["Azul Marino", "#1f2f5c", /azul\s*marino|marino|navy/i],
    ["Azul Rey", "#2347c5", /azul\s*rey|^\s*azul\s*$/i],
    ["Celeste", "#7dd3fc", /celeste/i],
    ["Beige", "#d9c7a3", /beige/i],
    ["Marrón", "#6b4423", /marr[oó]n|caf[eé]/i],
    ["Dorado", "#d4af37", /dorado|oro/i],
    ["Guinda / Vino", "#7a1f33", /guinda|vino|burgundy|granate/i],
    ["Rojo", "#c62828", /rojo/i],
    ["Morado", "#7e57c2", /morado|lila|violeta/i],
    ["Verde", "#2e7d32", /verde/i],
    ["Rosado", "#f9a8d4", /rosado|rosa/i],
  ];
  /* tallas por grupo las usan agregar producto y el filtro */
  TG.TALLAS_GRUPOS = [
    ["Niño", ["2", "4", "6", "8", "10", "12", "14", "16"]],
    ["Estándar", ["XS", "S", "M", "L", "XL", "XXL"]],
    ["Saco (numérica)", ["34", "36", "38", "40", "42", "44", "46", "48"]],
    ["Talla única", ["Talla Única"]],
  ];
  TG.OPCIONES = {
    color: TG.COLORES_BASE.map((c) => c[0]),
    categoria: ["Niños", "Jóvenes", "Adultos"],
    estilo: ["Ejecutivo", "Smoking", "Clásico", "Moderno Slim", "Premium"],
    talla: TG.TALLAS_GRUPOS.flatMap((g) => g[1]),
    componente: [
      "Terno completo",
      "Saco",
      "Pantalón",
      "Chaleco",
      "Corbata / Michi",
      "Camisa",
    ],
  };
  TG.llenarSelect = (select, lista, textoTodos) => {
    if (!select) return;
    select.innerHTML =
      '<option value="">' +
      TG.esc(textoTodos) +
      "</option>" +
      lista
        .map(
          (o) => '<option value="' + TG.esc(o) + '">' + TG.esc(o) + "</option>",
        )
        .join("");
  };
  const igual = (a, b) =>
    String(a || "")
      .trim()
      .toLowerCase() ===
    String(b || "")
      .trim()
      .toLowerCase();
  /* filtros vacio sin filtrar */
  TG.pasaFiltros = (p, f) => {
    if (f.color && !igual(p.color, f.color)) return false;
    if (f.categoria && !igual(p.categoria, f.categoria)) return false;
    if (f.estilo && !igual(p.estilo, f.estilo)) return false;
    if (f.talla && !igual(p.talla, f.talla)) return false;
    if (f.componentes && f.componentes.length) {
      const ok =
        f.componentes.some((c) => igual(p.componente, c)) ||
        (igual(p.componente, "Terno completo") &&
          f.componentes.some((c) => igual(c, "Saco") || igual(c, "Pantalón")));
      if (!ok) return false;
    }
    return true;
  };
  TG.categoriaPrenda = (p) => {
    if (/corbata|camisa/i.test(p.componente || "")) return "Accesorios";
    if (igual(p.estilo, "Smoking") || /smoking/i.test(p.diseno))
      return "Smoking";
    return "Ternos";
  };
  /* color de la prenda color css */
  const COLORES_CSS = [
    [/azul\s*marino|marino|navy/i, "#1f2f5c"],
    [/azul/i, "#2563eb"],
    [/negro/i, "#111111"],
    [/gris\s*perla|perla/i, "#d4d4d2"],
    [/plomo|oxford/i, "#4b5058"],
    [/gris/i, "#9ca3af"],
    [/burgundy|vino|guinda|granate/i, "#7a1f33"],
    [/rojo/i, "#c62828"],
    [/beige|cream|crema/i, "#e6d8b8"],
    [/blanco/i, "#ffffff"],
    [/verde/i, "#2e7d32"],
    [/marr[oó]n|café|cafe/i, "#6b4423"],
    [/celeste/i, "#7dd3fc"],
    [/plateado|plata/i, "#c0c0c0"],
    [/dorado|oro/i, "#d4af37"],
    [/rosado|rosa/i, "#f9a8d4"],
    [/morado|lila|violeta/i, "#7e57c2"],
    [/amarillo/i, "#facc15"],
    [/naranja/i, "#f97316"],
  ];
  TG.colorCss = (nombre) => {
    const base = TG.COLORES_BASE.find((c) => c[2].test(String(nombre || "")));
    if (base) return base[1];
    const hit = COLORES_CSS.find(([re]) => re.test(String(nombre || "")));
    return hit ? hit[1] : "#e5e7eb";
  };
  /* tarjetas del catalogo el titulo de la tarjeta */
  TG.tarjetasCatalogo = (prendas) =>
    prendas
      .map((p) => {
        const cat = TG.categoriaPrenda(p),
          a = (x) => TG.esc(String(x || "").toLowerCase());
        const fila = (k, v) =>
          "<div><dt>" + k + "</dt><dd>" + TG.esc(v || "—") + "</dd></div>";
        return (
          '<article class="product-card" data-product-category="' +
          cat +
          '" data-color="' +
          a(p.color) +
          '" data-categoria="' +
          a(p.categoria) +
          '" data-estilo="' +
          a(p.estilo) +
          '" data-talla="' +
          a(p.talla) +
          '" data-componente="' +
          a(p.componente) +
          '" data-tipo="' +
          a(p.tipo) +
          '"><div class="product-image"><img src="' +
          TG.esc(p.imagen || IMG[cat] || IMG.Ternos) +
          '" alt="' +
          TG.esc(p.estilo || p.diseno) +
          '"><span class="status est-' +
          TG.claveEstado(p.estado) +
          '"><i></i>' +
          TG.esc(TG.etiquetaEstado(p.estado)) +
          '</span></div><div class="product-body">' +
          '<div class="pb-fila pb-top"><span class="pb-comp">' +
          TG.esc(p.componente || cat) +
          '</span><b class="pb-precio"><small>Alquiler</small><em>' +
          TG.money(p.precioAlquiler) +
          "</em></b></div><h3>" +
          TG.esc(p.estilo || "—") +
          '</h3><div class="pb-fila"><span>' +
          TG.esc(p.codigo) +
          " · Talla " +
          TG.esc(p.talla) +
          '</span><b class="pb-precio"><small>Venta</small><em>' +
          TG.money(p.precioVenta) +
          '</em></b></div><footer><button class="btn secondary" type="button" data-detalle="' +
          p.id +
          '" aria-expanded="false">Ver detalle</button>' +
          '<span class="pb-color"><i class="color-dot" style="background:' +
          TG.colorCss(p.color) +
          '"></i>' +
          TG.esc(p.color || "—") +
          "</span></footer>" +
          '<div class="product-extra"><div class="product-extra-inner"><dl>' +
          fila("Tipo", p.tipo) +
          fila("Categoría", p.categoria) +
          fila("Diseño", p.diseno) +
          fila("Estado", TG.etiquetaEstado(p.estado)) +
          "</dl></div></div></div></article>"
        );
      })
      .join("");
  /* expande o contrae la tarjeta del boton ver detalle */
  TG.alternarDetalle = (boton) => {
    const tarjeta = boton.closest(".product-card");
    if (!tarjeta) return;
    const abierta = tarjeta.classList.toggle("is-open");
    boton.setAttribute("aria-expanded", abierta ? "true" : "false");
    boton.textContent = abierta ? "Ocultar detalle" : "Ver detalle";
  };

  /* arranque comun */
  TG.protegerPagina = () => {
    const ruta = location.pathname;
    const rol = ruta.startsWith("/admin")
      ? "Administrador"
      : ruta.startsWith("/empleado")
        ? "Empleado"
        : null;
    if (!rol) return true;
    const u = TG.usuario();
    if (!u || u.rol !== rol) {
      location.replace("/login");
      return false;
    }
    return true;
  };
  TG.iniciarPagina = () => {
    const u = TG.usuario();
    if (u) {
      const caja = document.querySelector(".side-user");
      if (caja) {
        const av = caja.querySelector(".avatar"),
          nom = caja.querySelector("strong"),
          rol = caja.querySelector("span");
        /* en el perfil se muestra solo un nombre */
        const palabras = String(u.nombre || "").trim().split(/\s+/).filter(Boolean);
        const apellidos = String(u.apellido || "").trim().split(/\s+/).filter(Boolean);
        const corto = apellidos.length
          ? palabras[0] + " " + apellidos[0]
          : palabras.slice(0, 2).join(" ");
        av && (av.textContent = TG.iniciales(corto));
        nom && (nom.textContent = corto);
        rol && (rol.textContent = u.rol);
      }
    }
    document.querySelectorAll(".date-block strong").forEach((el) => {
      el.textContent = TG.fechaCabecera();
    });
    document
      .querySelectorAll(".logout-link")
      .forEach((a) =>
        a.addEventListener("click", (e) => {
          /* cierra la sesion tambien en el servidor */
          e.preventDefault();
          TG.salirDelSistema("");
        }),
      );
  };

  /* cierre de sesion y vigilancia */
  const LIMITE_INACTIVIDAD_MIN = { Administrador: 10, Empleado: 30 };
  const CLAVE_ACTIVIDAD = "tgActividad";
  let saliendo = false;

  TG.salirDelSistema = (motivo) => {
    if (saliendo) return;
    saliendo = true;
    TG.cerrarSesion();
    const token = TG.csrf();
    const irAlLogin = () =>
      location.replace("/login" + (motivo ? "?motivo=" + motivo : ""));
    /* cierra tambien la sesion del servidor */
    const limite = setTimeout(irAlLogin, 1500);
    fetch("/logout", {
      method: "POST",
      headers: token ? { "X-XSRF-TOKEN": token } : {},
    })
      .catch(() => {})
      .finally(() => {
        clearTimeout(limite);
        irAlLogin();
      });
  };

  TG.vigilarSesion = () => {
    if (TG.vigilando) return;
    const u = TG.usuario();
    if (!u) return;
    TG.vigilando = true;
    const limite = (LIMITE_INACTIVIDAD_MIN[u.rol] || 30) * 60 * 1000;
    let ultima = Date.now();
    let ultimoAviso = 0;
    const guardar = (valor) => {
      try {
        localStorage.setItem(CLAVE_ACTIVIDAD, String(valor));
      } catch {
        /* sin almacenamiento compartido se usa solo esta pestana */
      }
    };
    const leer = () => {
      try {
        return Number(localStorage.getItem(CLAVE_ACTIVIDAD)) || 0;
      } catch {
        return 0;
      }
    };
    guardar(ultima);

    const hayActividad = () => {
      const ahora = Date.now();
      if (ahora - ultima < 1000) return;
      ultima = ahora;
      guardar(ahora);
      /* avisa al servidor como maximo una vez por minuto */
      if (ahora - ultimoAviso > 60000) {
        ultimoAviso = ahora;
        const token = TG.csrf();
        fetch("/api/sesion/actividad", {
          method: "POST",
          headers: token ? { "X-XSRF-TOKEN": token } : {},
        }).catch(() => {});
      }
    };
    ["mousemove", "mousedown", "keydown", "touchstart", "scroll", "wheel", "click"].forEach(
      (ev) => window.addEventListener(ev, hayActividad, { passive: true, capture: true }),
    );

    const revisarInactividad = () => {
      /* tambien cuenta la actividad en otra pestana del mismo navegador */
      if (Date.now() - Math.max(ultima, leer()) >= limite)
        TG.salirDelSistema("inactividad");
    };
    setInterval(revisarInactividad, 5000);
    document.addEventListener("visibilitychange", revisarInactividad);

    /* suspension en vivo y sesion vencida en el servidor */
    const preguntarAlServidor = async () => {
      if (saliendo) return;
      try {
        const r = await fetch("/api/sesion", {
          headers: { Accept: "application/json", "X-Tab-Id": TG.pestana() },
          cache: "no-store",
        });
        if (r.status === 409) {
          /* otra pestana tiene esta sesion se sale sin cerrar la del servidor */
          saliendo = true;
          TG.cerrarSesion();
          location.replace("/login?motivo=otra-pestana");
          return;
        }
        if (r.ok) {
          /* avisos de intentos de ingreso con esta cuenta */
          const d = await r.json().catch(() => null);
          if (d && Array.isArray(d.avisos))
            d.avisos.forEach((t) => TG.toast(t, "error"));
        }
        if (r.status === 401) {
          let motivo = "sesion";
          try {
            motivo = (await r.json()).motivo || "sesion";
          } catch {
            motivo = "sesion";
          }
          TG.salirDelSistema(motivo);
        }
      } catch {
        /* sin conexion se vuelve a intentar en la siguiente consulta */
      }
    };
    setInterval(preguntarAlServidor, 4000);
    /* al cargar confirma que esta pestana sigue viva y cancela un cierre pendiente */
    preguntarAlServidor();

    /* cerrar pestana o ventana avisa al servidor recargar no cierra la sesion */
    window.addEventListener("pagehide", () => {
      if (saliendo) return;
      try {
        const datos = new URLSearchParams({ pestana: TG.pestana() });
        const token = TG.csrf();
        if (token) datos.set("_csrf", token);
        navigator.sendBeacon("/api/sesion/cierre", datos);
      } catch {
        /* sin beacon el servidor cierra por falta de latidos */
      }
    });

    /* si el navegador muestra la pantalla desde su memoria */
    window.addEventListener("pageshow", (e) => {
      if (!TG.usuario()) location.replace("/login");
      else if (e.persisted) preguntarAlServidor();
    });
  };

  /* paginador anterior y siguiente para tablas y catalogos
     trabaja sobre las filas o tarjetas que ya estan dibujadas asi no
     cambia como cada pantalla las pinta ni como las filtra */
  TG.paginar = (contenedor, porPagina) => {
    if (!contenedor || contenedor.dataset.paginado) return;
    contenedor.dataset.paginado = "1";
    const esTabla = contenedor.tagName === "TBODY";
    const barra = document.createElement("nav");
    barra.className = "tg-pager";
    barra.hidden = true;
    barra.setAttribute("aria-label", "Páginas");
    barra.innerHTML =
      '<button type="button" data-pag="anterior">‹ Anterior</button>' +
      '<span data-pag-info>Página 1 de 1</span>' +
      '<button type="button" data-pag="siguiente">Siguiente ›</button>';
    const ancla = esTabla
      ? contenedor.closest("table").parentElement
      : contenedor;
    ancla.insertAdjacentElement("afterend", barra);
    const info = barra.querySelector("[data-pag-info]");
    const btnAnterior = barra.querySelector('[data-pag="anterior"]');
    const btnSiguiente = barra.querySelector('[data-pag="siguiente"]');
    let pagina = 0,
      firma = "",
      pendiente = false;

    /* las filas que un filtro oculta no cuentan */
    const visible = (el) => !el.hidden && el.style.display !== "none";

    const aplicar = () => {
      pendiente = false;
      const items = [...contenedor.children].filter(visible);
      const nueva =
        items.length +
        "|" +
        (items[0] ? items[0].textContent.slice(0, 40) : "") +
        "|" +
        (items.length
          ? items[items.length - 1].textContent.slice(0, 40)
          : "");
      /* si cambio la busqueda o el filtro vuelve a la primera pagina */
      if (nueva !== firma) {
        firma = nueva;
        pagina = 0;
      }
      const total = Math.max(1, Math.ceil(items.length / porPagina));
      if (pagina >= total) pagina = total - 1;
      const desde = pagina * porPagina;
      [...contenedor.children].forEach((el) => {
        const idx = items.indexOf(el);
        if (idx !== -1 && (idx < desde || idx >= desde + porPagina))
          el.setAttribute("data-pag-oculta", "");
        else el.removeAttribute("data-pag-oculta");
      });
      barra.hidden = items.length <= porPagina;
      info.textContent = "Página " + (pagina + 1) + " de " + total;
      btnAnterior.disabled = pagina <= 0;
      btnSiguiente.disabled = pagina >= total - 1;
    };
    const programar = () => {
      if (pendiente) return;
      pendiente = true;
      requestAnimationFrame(aplicar);
    };
    new MutationObserver(programar).observe(contenedor, {
      childList: true,
      ...(esTabla
        ? {
            subtree: true,
            attributes: true,
            attributeFilter: ["style", "hidden"],
          }
        : {}),
    });
    barra.addEventListener("click", (e) => {
      const b = e.target.closest("[data-pag]");
      if (!b || b.disabled) return;
      pagina += b.dataset.pag === "siguiente" ? 1 : -1;
      pagina = Math.max(0, pagina);
      aplicar();
      /* sube al inicio del listado para ver los nuevos */
      ancla.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    aplicar();
  };

  /* activa el paginador en todo lo marcado con data-paginar */
  TG.iniciarPaginadores = () =>
    document.querySelectorAll("[data-paginar]").forEach((el) => {
      TG.paginar(el, Number(el.dataset.paginar) || 50);
    });

  /* ejecuta fn cuando el dom este listo y la persona */
  TG.listo = (fn) => {
    const correr = () => {
      if (!TG.protegerPagina()) return;
      TG.iniciarPagina();
      TG.iniciarPaginadores();
      TG.vigilarSesion();
      TG.historial && TG.historial.iniciar();
      fn && fn();
    };
    if (document.readyState === "loading")
      document.addEventListener("DOMContentLoaded", correr);
    else correr();
  };
})();

/* pone el valor de una tarjeta kpi segun su titulo */
TG.kpi = (titulo, valor, pie) => {
  document.querySelectorAll(".kpi-copy").forEach((c) => {
    if (c.querySelector("span")?.textContent.trim() !== titulo) return;
    c.querySelector("strong").textContent = valor;
    if (pie !== undefined && c.querySelector("small"))
      c.querySelector("small").textContent = pie;
  });
};
