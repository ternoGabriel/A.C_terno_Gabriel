package com.example.demo.Seguridad;

import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.function.LongSupplier;
import org.springframework.stereotype.Component;
import jakarta.servlet.http.HttpSession;
import jakarta.servlet.http.HttpSessionEvent;
import jakarta.servlet.http.HttpSessionListener;

/* responsabilidad unica saber quien tiene el sistema abierto y en que pestana */
@Component
public class RegistroSesiones implements HttpSessionListener {

    /* tiempo para que una recarga o cambio de pagina cancele el cierre de ventana */
    public static final long GRACIA_CIERRE_MS = 10_000L;
    /* sin latidos durante este tiempo se da por perdida la conexion del navegador */
    public static final long LIMITE_LATIDO_MS = 120_000L;
    private static final int MAXIMO_AVISOS = 5;

    /* resultado de un latido de pestana */
    public enum Latido { OK, OTRA_PESTANA }

    /* datos de la sesion abierta de un empleado */
    public static final class Entrada {
        private final Long empleadoId;
        private final HttpSession sesion;
        private final String sesionId;
        private final String pestana;
        private long ultimoLatido;
        private long cierrePendiente;
        private final Deque<String> avisos = new ArrayDeque<>();

        private Entrada(Long empleadoId, HttpSession sesion, String pestana, long ahora) {
            this.empleadoId = empleadoId;
            this.sesion = sesion;
            this.sesionId = sesion.getId();
            this.pestana = pestana;
            this.ultimoLatido = ahora;
        }

        public Long getEmpleadoId() {
            return empleadoId;
        }

        public String getSesionId() {
            return sesionId;
        }

        public String getPestana() {
            return pestana;
        }
    }

    private final LongSupplier reloj;
    private final Map<Long, Entrada> porEmpleado = new HashMap<>();
    private final Map<String, Entrada> porSesion = new HashMap<>();

    public RegistroSesiones() {
        this(System::currentTimeMillis);
    }

    RegistroSesiones(LongSupplier reloj) {
        this.reloj = reloj;
    }

    /* registra la sesion recien iniciada como la unica del empleado */
    public synchronized void registrar(Long empleadoId, HttpSession sesion, String pestana) {
        if (empleadoId == null || sesion == null) return;
        Entrada previa = porEmpleado.get(empleadoId);
        if (previa != null) cerrar(previa);
        Entrada nueva = new Entrada(empleadoId, sesion, vacioANulo(pestana), reloj.getAsLong());
        porEmpleado.put(empleadoId, nueva);
        porSesion.put(nueva.sesionId, nueva);
    }

    /* la sesion viva del empleado o null si no tiene o ya estaba perdida */
    public synchronized Entrada activaDe(Long empleadoId) {
        if (empleadoId == null) return null;
        return vigente(porEmpleado.get(empleadoId), true);
    }

    /* la sesion viva que corresponde a esta sesion http o null */
    public synchronized Entrada activaDeSesion(String sesionId) {
        if (sesionId == null) return null;
        return vigente(porSesion.get(sesionId), true);
    }

    /* true si la ventana se cerro y no hubo recarga dentro del tiempo de gracia */
    public synchronized boolean cierreVencido(String sesionId) {
        Entrada e = sesionId == null ? null : porSesion.get(sesionId);
        return e != null && cierreVencido(e, reloj.getAsLong());
    }

    /* la pestana avisa que sigue abierta cancela un cierre pendiente */
    public synchronized Latido latido(String sesionId, String pestana) {
        Entrada e = sesionId == null ? null : porSesion.get(sesionId);
        if (e == null || e.pestana == null) return Latido.OK;
        if (!e.pestana.equals(pestana)) return Latido.OTRA_PESTANA;
        long ahora = reloj.getAsLong();
        e.ultimoLatido = ahora;
        if (e.cierrePendiente != 0 && ahora - e.cierrePendiente <= GRACIA_CIERRE_MS) e.cierrePendiente = 0;
        return Latido.OK;
    }

    /* el navegador aviso que la pestana duena se esta cerrando o recargando */
    public synchronized void marcarCierre(String sesionId, String pestana) {
        Entrada e = sesionId == null ? null : porSesion.get(sesionId);
        if (e == null) return;
        if (e.pestana != null && !e.pestana.equals(pestana)) return;
        if (e.cierrePendiente == 0) e.cierrePendiente = reloj.getAsLong();
    }

    /* deja un aviso para quien tiene la sesion abierta */
    public synchronized void avisarIntento(Long empleadoId, String texto) {
        Entrada e = porEmpleado.get(empleadoId);
        if (e == null) return;
        if (e.avisos.size() >= MAXIMO_AVISOS) e.avisos.removeFirst();
        e.avisos.addLast(texto);
    }

    /* entrega los avisos pendientes una sola vez */
    public synchronized List<String> tomarAvisos(String sesionId) {
        Entrada e = sesionId == null ? null : porSesion.get(sesionId);
        if (e == null || e.avisos.isEmpty()) return List.of();
        List<String> lista = new ArrayList<>(e.avisos);
        e.avisos.clear();
        return lista;
    }

    /* invalida la sesion http y la quita del registro */
    public synchronized void cerrar(Entrada e) {
        if (e == null) return;
        porEmpleado.remove(e.empleadoId, e);
        porSesion.remove(e.sesionId, e);
        try {
            e.sesion.invalidate();
        } catch (IllegalStateException yaInvalidada) {
            /* ya estaba cerrada */
        }
    }

    /* tomcat avisa cuando una sesion termina por logout vencimiento o invalidacion */
    @Override
    public synchronized void sessionDestroyed(HttpSessionEvent evento) {
        Entrada e = porSesion.remove(evento.getSession().getId());
        if (e != null) porEmpleado.remove(e.empleadoId, e);
    }

    private Entrada vigente(Entrada e, boolean cerrarSiMuerta) {
        if (e == null) return null;
        long ahora = reloj.getAsLong();
        boolean muerta = cierreVencido(e, ahora) || ahora - e.ultimoLatido > LIMITE_LATIDO_MS;
        if (!muerta) return e;
        if (cerrarSiMuerta) cerrar(e);
        return null;
    }

    private static boolean cierreVencido(Entrada e, long ahora) {
        return e.cierrePendiente != 0 && ahora - e.cierrePendiente > GRACIA_CIERRE_MS;
    }

    private static String vacioANulo(String texto) {
        return texto == null || texto.isBlank() ? null : texto;
    }
}
