document.addEventListener("DOMContentLoaded", () => {
  const usuario = document.getElementById("email"),
    password = document.getElementById("claveAcceso"),
    error = document.getElementById("loginError");
  TG.ojo(password);
  /* sin autocompletar campos vacios al cerrar sesion */
  let escribio = false;
  const limpiarCampos = (forzar) => {
    if (escribio && forzar !== true) return;
    usuario.value = "";
    password.value = "";
    if (password._tgPintar) password._tgPintar();
  };
  [usuario, password].forEach((c) =>
    c.addEventListener("keydown", () => {
      escribio = true;
    }),
  );
  /* contrasena de solo lectura hasta tocarla */
  password.readOnly = true;
  ["focus", "pointerdown", "touchstart", "keydown"].forEach((ev) =>
    password.addEventListener(ev, () => {
      password.readOnly = false;
    }),
  );
  limpiarCampos();
  [150, 600, 1500].forEach((ms) => setTimeout(limpiarCampos, ms));
  window.addEventListener("pageshow", limpiarCampos);
  /* mismas reglas que valida spring security en el servidor */
  TG.vincular(usuario, "correoAcceso");
  TG.vincular(password, "contrasenaSegura");
  document.querySelectorAll("[data-demo]").forEach((b) =>
    b.addEventListener("click", () => {
      if (b.dataset.demo === "empleado") {
        usuario.value = "empleado";
        password.value = "1234";
      } else {
        usuario.value = "admin";
        password.value = "admin";
      }
      error.hidden = true;
    }),
  );
  document.getElementById("forgotPassword")?.addEventListener("click", () => {
    error.textContent =
      "Solicita al administrador el restablecimiento de tu contraseña.";
    error.hidden = false;
  });

  const loginForm = document.getElementById("loginForm");
  const destinoDe = (rol) =>
    rol === "Administrador" ? "/admin/inicio" : "/empleado/inicio";

  /* mensaje cuando el sistema cerro la sesion */
  const MOTIVOS = {
    inactividad: "Tu sesión se cerró por inactividad. Inicia sesión de nuevo.",
    suspendida: "Tu cuenta fue suspendida. Comunícate con el administrador.",
    sesion: "Tu sesión venció. Inicia sesión de nuevo.",
    ventana: "Cerraste la ventana del sistema.",
    "otra-pestana": "Este usuario ya está activo en otra pestaña.",
  };
  const params = new URLSearchParams(location.search);
  const motivo = params.get("motivo");
  if (motivo && MOTIVOS[motivo]) {
    error.textContent = MOTIVOS[motivo];
    error.hidden = false;
  }
  /* historial bloqueado atras se queda siempre en el login */
  const ruta = location.pathname;
  const trampa = () => {
    try {
      history.replaceState({ tgLogin: 1 }, "", ruta);
      history.pushState({ tgLogin: 2 }, "", ruta);
    } catch {
      /* sin historial no hay trampa */
    }
  };
  trampa();
  window.addEventListener("popstate", () => {
    history.pushState({ tgLogin: 2 }, "", ruta);
    limpiarCampos(true);
    cerrarSiHaySesion();
  });
  /* algunos navegadores ignoran entradas creadas sin tocar la pagina */
  ["pointerdown", "keydown", "touchstart"].forEach((ev) =>
    window.addEventListener(ev, () => history.pushState({ tgLogin: 2 }, "", ruta), {
      once: true,
      passive: true,
    }),
  );

  /* llegar al login con atras cierra la sesion del servidor */
  let cierre = Promise.resolve();
  function cerrarSiHaySesion() {
    if (!TG.usuario()) return;
    TG.cerrarSesion();
    const token = TG.csrf();
    cierre = fetch("/logout", {
      method: "POST",
      headers: token ? { "X-XSRF-TOKEN": token } : {},
      cache: "no-store",
    }).catch(() => {});
  }
  cerrarSiHaySesion();
  window.addEventListener("pageshow", (e) => {
    if (!e.persisted) return;
    trampa();
    limpiarCampos(true);
    cerrarSiHaySesion();
  });
  if (motivo || params.has("logout")) TG.cerrarSesion();

  const entrar = async (usr, clave) => {
    const u = await TG.post("/api/login", {
      usuario: usr,
      contrasena: clave,
      pestana: TG.pestana(),
    });
    TG.cerrarSesion();
    TG.iniciarSesion({ nombre: u.nombre, apellido: u.apellido || "", rol: u.rol });
    /* replace deja el login detras de la pantalla de inicio */
    location.replace(destinoDe(u.rol));
  };

  loginForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    error.hidden = true;
    /* valida formato de correo y contrasena */
    if (!TG.validarTodo([usuario, password])) return;
    const clave = password.value;
    try {
      await cierre;
      /* la clave no queda escrita en el campo para que el navegador no la guarde */
      password.value = "";
      if (password._tgPintar) password._tgPintar();
      /* valida contra la tabla empleado */
      await entrar(usuario.value.trim().toLowerCase(), clave);
    } catch (err) {
      password.value = clave;
      if (password._tgPintar) password._tgPintar();
      error.textContent = err.message;
      error.hidden = false;
    }
  });
});
