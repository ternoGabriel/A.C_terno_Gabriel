package com.example.demo.Seguridad;

import java.io.IOException;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.filter.OncePerRequestFilter;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/* obliga a que el token csrf se cargue */
public class CookieCsrfFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(HttpServletRequest peticion, HttpServletResponse respuesta, FilterChain cadena)
            throws ServletException, IOException {
        CsrfToken token = (CsrfToken) peticion.getAttribute(CsrfToken.class.getName());
        if (token != null) token.getToken();
        cadena.doFilter(peticion, respuesta);
    }
}
