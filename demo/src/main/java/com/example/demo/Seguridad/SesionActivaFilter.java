package com.example.demo.Seguridad;

import java.io.IOException;
import java.util.Optional;
import java.util.function.LongSupplier;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;
import com.example.demo.Dao.EmpleadoDao;
import com.example.demo.Model.Empleado;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;

/* responsabilidad unica mantener valida la sesion de quien ya inicio */
public class SesionActivaFilter extends OncePerRequestFilter {

    public static final String ULTIMA_ACTIVIDAD = "terno.ultimaActividad";
    public static final long LIMITE_ADMINISTRADOR_MS = 10L * 60 * 1000;
    public static final long LIMITE_EMPLEADO_MS = 30L * 60 * 1000;
    public static final String MENSAJE_SUSPENDIDA = "Tu cuenta fue suspendida. Comunícate con el administrador.";
    public static final String MENSAJE_INACTIVIDAD = "Tu sesión se cerró por inactividad. Inicia sesión de nuevo.";
    public static final String MENSAJE_VENTANA = "Cerraste la ventana del sistema. Inicia sesión de nuevo.";
    public static final String MENSAJE_OTRA_PESTANA = "Este usuario ya tiene el sistema abierto en otra pestaña.";
    /* cada pestana envia su identificador en esta cabecera */
    public static final String CABECERA_PESTANA = "X-Tab-Id";

    private final EmpleadoDao empleados;
    private final LongSupplier reloj;
    /* puede ser null y entonces no se controla ventana ni pestana */
    private final RegistroSesiones registro;

    public SesionActivaFilter(EmpleadoDao empleados) {
        this(empleados, System::currentTimeMillis, null);
    }

    public SesionActivaFilter(EmpleadoDao empleados, LongSupplier reloj) {
        this(empleados, reloj, null);
    }

    public SesionActivaFilter(EmpleadoDao empleados, RegistroSesiones registro) {
        this(empleados, System::currentTimeMillis, registro);
    }

    public SesionActivaFilter(EmpleadoDao empleados, LongSupplier reloj, RegistroSesiones registro) {
        this.empleados = empleados;
        this.reloj = reloj;
        this.registro = registro;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest peticion, HttpServletResponse respuesta, FilterChain cadena)
            throws ServletException, IOException {
        Authentication autenticacion = SecurityContextHolder.getContext().getAuthentication();
        HttpSession sesion = peticion.getSession(false);

        if (sesion != null && autenticacion != null && autenticacion.getPrincipal() instanceof UsuarioSesion usuario) {
            String motivo = null;
            String mensaje = null;
            long ahora = reloj.getAsLong();
            Object ultima = sesion.getAttribute(ULTIMA_ACTIVIDAD);

            if (!sigueActivo(usuario)) {
                motivo = "suspendida";
                mensaje = MENSAJE_SUSPENDIDA;
            } else if (registro != null && registro.cierreVencido(sesion.getId())) {
                /* la ventana se cerro y nadie la recargo a tiempo */
                motivo = "ventana";
                mensaje = MENSAJE_VENTANA;
            } else if (ultima instanceof Long anterior && ahora - anterior > limiteDe(usuario.getRol())) {
                motivo = "inactividad";
                mensaje = MENSAJE_INACTIVIDAD;
            }

            if (motivo != null) {
                /* quien vuelve a iniciar sesion no recibe el error de la sesion vieja */
                if (esLogin(peticion)) {
                    cerrarEnSilencio(sesion);
                    cadena.doFilter(peticion, respuesta);
                } else {
                    cerrar(peticion, respuesta, sesion, motivo, mensaje);
                }
                return;
            }

            /* otra pestana del mismo navegador no puede usar esta sesion */
            String pestana = peticion.getHeader(CABECERA_PESTANA);
            if (registro != null && pestana != null && esApi(peticion)
                    && registro.latido(sesion.getId(), pestana) == RegistroSesiones.Latido.OTRA_PESTANA) {
                responderOtraPestana(respuesta);
                return;
            }

            /* la consulta periodica de la pantalla no cuenta como actividad */
            if (!esSondeo(peticion) || !(ultima instanceof Long)) sesion.setAttribute(ULTIMA_ACTIVIDAD, ahora);
        }
        cadena.doFilter(peticion, respuesta);
    }

    static long limiteDe(String rol) {
        return "Administrador".equals(rol) ? LIMITE_ADMINISTRADOR_MS : LIMITE_EMPLEADO_MS;
    }

    private boolean sigueActivo(UsuarioSesion usuario) {
        Optional<Empleado> actual = usuario.getId() != null
            ? empleados.buscarPorId(usuario.getId())
            : empleados.buscarPorUsuario(usuario.getUsername());
        return actual.isPresent() && "Activo".equals(actual.get().getEstado());
    }

    private static boolean esSondeo(HttpServletRequest peticion) {
        return "GET".equals(peticion.getMethod()) && peticion.getRequestURI().equals(peticion.getContextPath() + "/api/sesion");
    }

    private static boolean esApi(HttpServletRequest peticion) {
        return peticion.getRequestURI().startsWith(peticion.getContextPath() + "/api/");
    }

    private static boolean esLogin(HttpServletRequest peticion) {
        return peticion.getRequestURI().equals(peticion.getContextPath() + "/api/login");
    }

    /* responde 409 sin cerrar la sesion de la pestana duena */
    private static void responderOtraPestana(HttpServletResponse respuesta) throws IOException {
        respuesta.setStatus(HttpServletResponse.SC_CONFLICT);
        respuesta.setCharacterEncoding("UTF-8");
        respuesta.setContentType("application/json;charset=UTF-8");
        respuesta.getWriter().write("{\"mensaje\":\"" + MENSAJE_OTRA_PESTANA + "\",\"motivo\":\"otra-pestana\"}");
    }

    private static void cerrarEnSilencio(HttpSession sesion) {
        SecurityContextHolder.clearContext();
        try {
            sesion.invalidate();
        } catch (IllegalStateException yaInvalidada) {
            /* ya estaba cerrada */
        }
    }

    private static void cerrar(HttpServletRequest peticion, HttpServletResponse respuesta, HttpSession sesion,
            String motivo, String mensaje) throws IOException {
        SecurityContextHolder.clearContext();
        try {
            sesion.invalidate();
        } catch (IllegalStateException yaInvalidada) {
            /* ya estaba cerrada */
        }
        if (peticion.getRequestURI().startsWith(peticion.getContextPath() + "/api/")) {
            respuesta.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            respuesta.setCharacterEncoding("UTF-8");
            respuesta.setContentType("application/json;charset=UTF-8");
            respuesta.getWriter().write("{\"mensaje\":\"" + mensaje + "\",\"motivo\":\"" + motivo + "\"}");
        } else {
            respuesta.sendRedirect(peticion.getContextPath() + "/login?motivo=" + motivo);
        }
    }
}
