package com.example.demo.Seguridad;

import java.io.IOException;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/* agrega cabeceras http de seguridad a todas las respuestas */
/* va primero para que spring security respete la cabecera de cache de las pantallas protegidas */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class CabecerasSeguridadFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(HttpServletRequest peticion, HttpServletResponse respuesta, FilterChain cadena)
            throws ServletException, IOException {
        respuesta.setHeader("X-Content-Type-Options", "nosniff");
        respuesta.setHeader("X-Frame-Options", "SAMEORIGIN");
        respuesta.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
        if (esProtegida(peticion)) {
            /* el navegador no guarda estas respuestas ni las muestra al volver con atras */
            respuesta.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
            respuesta.setHeader("Pragma", "no-cache");
            respuesta.setDateHeader("Expires", 0);
        }
        cadena.doFilter(peticion, respuesta);
    }

    /* pantallas del sistema login y api nunca se guardan en cache */
    private static boolean esProtegida(HttpServletRequest peticion) {
        String ruta = peticion.getRequestURI().substring(peticion.getContextPath().length());
        return ruta.equals("/") || ruta.equals("/login") || ruta.equals("/acceso-denegado")
            || ruta.startsWith("/admin/") || ruta.startsWith("/empleado/")
            || ruta.startsWith("/privado/") || ruta.startsWith("/api/");
    }
}
