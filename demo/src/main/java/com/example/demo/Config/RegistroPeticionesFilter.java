package com.example.demo.Config;

import java.io.IOException;
import org.apache.commons.lang3.StringUtils;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.apache.logging.log4j.Level;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;

/* registra cada peticion que llega al servidor */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class RegistroPeticionesFilter extends OncePerRequestFilter {

    private static final Logger LOG = LogManager.getLogger(RegistroPeticionesFilter.class);
    private static final long LENTA_MS = 2000;

    /* no se registran estaticos ni el ping */
    @Override
    protected boolean shouldNotFilter(HttpServletRequest peticion) {
        String ruta = peticion.getRequestURI();
        return ruta.startsWith("/css/") || ruta.startsWith("/js/") || ruta.startsWith("/img/")
            || ruta.equals("/favicon.ico") || ruta.equals("/api/health");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest peticion, HttpServletResponse respuesta, FilterChain cadena)
            throws ServletException, IOException {
        long inicio = System.currentTimeMillis();
        try {
            cadena.doFilter(peticion, respuesta);
        } finally {
            long ms = System.currentTimeMillis() - inicio;
            int estado = respuesta.getStatus();
            Level nivel = estado >= 500 ? Level.ERROR : estado >= 400 || ms >= LENTA_MS ? Level.WARN : Level.INFO;
            /* sin parametros ni cuerpo */
            LOG.log(nivel, "{} {} {} {}ms usuario={} ip={}", peticion.getMethod(), limpio(peticion.getRequestURI()),
                estado, ms, usuarioDe(peticion), limpio(ipDe(peticion)));
        }
    }

    /* usuario guardado en la sesion */
    private String usuarioDe(HttpServletRequest peticion) {
        HttpSession sesion = peticion.getSession(false);
        if (sesion == null) return "anonimo";
        Object contexto = sesion.getAttribute(HttpSessionSecurityContextRepository.SPRING_SECURITY_CONTEXT_KEY);
        if (contexto instanceof SecurityContext sc) {
            Authentication a = sc.getAuthentication();
            if (a != null && a.isAuthenticated()) return limpio(a.getName());
        }
        return "anonimo";
    }

    /* ip real detras de render */
    private String ipDe(HttpServletRequest peticion) {
        String reenviada = peticion.getHeader("X-Forwarded-For");
        return reenviada == null ? peticion.getRemoteAddr() : reenviada.split(",")[0].trim();
    }

    /* evita saltos de linea en el log */
    private String limpio(String texto) {
        return StringUtils.abbreviate(StringUtils.replaceChars(StringUtils.defaultString(texto), "\r\n\t", "___"), 60);
    }
}
