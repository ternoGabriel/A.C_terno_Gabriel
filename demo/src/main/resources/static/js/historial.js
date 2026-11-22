/* boton atras del navegador con la sesion iniciada */
(() => {
  const RAIZ = "/empleado/comprar-alquilar";
  const INICIO_EMPLEADO = "/empleado/inicio";
  const INICIO_ADMIN = "/admin/inicio";
  let hook = null;
  let instalado = false;
  let navegando = false;

  const ruta = () => location.pathname.replace(/\/+$/, "") || "/";

  /* cada pantalla avisa si tiene algo avanzado o terminado */
  const registrar = (opciones) => {
    hook = opciones || null;
  };

  /* a donde lleva atras desde la pantalla actual */
  const destino = () => {
    const r = ruta();

    /* desde inicio se cierra la sesion */
    if (r === INICIO_EMPLEADO || r === INICIO_ADMIN) return { salir: true };

    /* todo el admin vuelve a inicio */
    if (r.startsWith("/admin/")) return { url: INICIO_ADMIN };

    /* pasos de comprar y alquilar */
    if (r.startsWith(RAIZ + "/paso-")) {
      const n = Number(r.slice(-1));
      const sesion = new CA.Sesion(CA.KEY);
      const s = sesion.leer();

      /* proceso terminado vuelve al paso 1 vacio */
      if (n >= 5 && s.boletaId) return { url: RAIZ, limpiar: true };
      if (n >= 5) return { url: RAIZ + "/paso-4" };
      if (n === 4 && sesion.operacion() === "Comprar")
        return { url: RAIZ + "/paso-2" };
      return { url: n <= 2 ? RAIZ : RAIZ + "/paso-" + (n - 1) };
    }

    /* primer paso de comprar y alquilar vuelve a inicio */
    if (r === RAIZ) return { url: INICIO_EMPLEADO };

    /* otras opciones con avance o proceso terminado se reinician */
    if (hook && hook.hayAvance && hook.hayAvance()) return { url: r };

    return { url: INICIO_EMPLEADO };
  };

  const atras = () => {
    if (navegando) return;
    navegando = true;
    ir(destino());
  };

  /* ejecuta un destino */
  const ir = (d) => {
    if (d.salir) {
      TG.salirDelSistema("");
      return;
    }
    if (d.limpiar) new CA.Sesion(CA.KEY).borrar();
    /* al salir de comprar y alquiler la prenda elegida queda libre */
    else if (window.CA && d.url && !d.url.startsWith(RAIZ)) {
      const id = new CA.Sesion(CA.KEY).leer().prendaId;
      if (id && TG.liberarPrenda) TG.liberarPrenda(id);
    }
    location.replace(d.url);
  };

  /* recuerda a donde debia llevar atras la pantalla que se deja */
  const SALIDA = "tgSalida";
  const guardarSalida = () => {
    try {
      sessionStorage.setItem(
        SALIDA,
        JSON.stringify({ dest: destino(), t: Date.now() }),
      );
    } catch {
      /* sin almacenamiento no hay respaldo */
    }
  };

  /* si el navegador salto la guardia y mostro otra pantalla vieja */
  const revisarSalida = () => {
    let salida = null;
    try {
      salida = JSON.parse(sessionStorage.getItem(SALIDA) || "null");
      sessionStorage.removeItem(SALIDA);
    } catch {
      salida = null;
    }
    if (!salida || !salida.dest || Date.now() - salida.t > 15000)
      return false;
    navegando = true;
    ir(salida.dest);
    return true;
  };

  /* deja dos entradas para atrapar el atras */
  const instalarGuardia = () => {
    try {
      const g = history.state && history.state.tgGuard;
      if (g === undefined || g === 0) {
        history.replaceState({ tgGuard: 0 }, "", location.href);
        history.pushState({ tgGuard: 1 }, "", location.href);
      }
    } catch {
      /* sin historial no hay guardia */
    }
  };

  const iniciar = () => {
    if (instalado) return;
    instalado = true;

    /* llegar con atras a una pantalla vieja redirige al destino correcto */
    const tipo = performance.getEntriesByType("navigation")[0]?.type;
    if (tipo === "back_forward" && revisarSalida()) return;
    instalarGuardia();

    window.addEventListener("pagehide", guardarSalida);

    /* algunos navegadores ignoran entradas creadas sin tocar la pagina */
    const reforzar = () => {
      try {
        if (history.state && history.state.tgGuard === 1)
          history.pushState({ tgGuard: 2 }, "", location.href);
      } catch {
        /* sin historial no hay refuerzo */
      }
    };
    ["pointerdown", "keydown", "touchstart"].forEach((ev) =>
      window.addEventListener(ev, reforzar, { once: true, passive: true }),
    );

    window.addEventListener("popstate", (e) => {
      const g = e.state && e.state.tgGuard;
      if (g === undefined || g > 1) return;
      atras();
    });

    /* pantalla restaurada desde la memoria del navegador */
    window.addEventListener("pageshow", (e) => {
      if (!e.persisted) return;
      navegando = false;
      if (revisarSalida()) return;
      instalarGuardia();
    });
  };

  window.TG = window.TG || {};
  TG.historial = { iniciar, registrar, destino };
})();
