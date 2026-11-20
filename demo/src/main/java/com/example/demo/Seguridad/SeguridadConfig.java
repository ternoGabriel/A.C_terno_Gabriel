package com.example.demo.Seguridad;

import java.io.IOException;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.ProviderManager;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.security.web.authentication.www.BasicAuthenticationFilter;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.security.web.csrf.CsrfException;
import org.springframework.security.web.csrf.CsrfTokenRequestAttributeHandler;
import org.springframework.security.web.header.writers.ClearSiteDataHeaderWriter;
import org.springframework.security.web.authentication.logout.HeaderWriterLogoutHandler;
import com.example.demo.Dao.EmpleadoDao;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/* configuracion de spring security */
@Configuration
@EnableWebSecurity
/* permite preauthorize en controladores y servicios */
@EnableMethodSecurity
public class SeguridadConfig {

    /* bcrypt con factor de costo 10 */
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(10);
    }

    /* autentica contra la tabla empleado mediante proveedorautenticacion */
    @Bean
    public AuthenticationManager authenticationManager(ProveedorAutenticacion proveedor) {
        return new ProviderManager(proveedor);
    }

    /* guarda el contexto de seguridad en la sesion http */
    @Bean
    public SecurityContextRepository securityContextRepository() {
        return new HttpSessionSecurityContextRepository();
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http, SecurityContextRepository repositorio, EmpleadoDao empleados,
            RegistroSesiones registro) throws Exception {
        CsrfTokenRequestAttributeHandler manejadorCsrf = new CsrfTokenRequestAttributeHandler();

        http
            .authorizeHttpRequests(auth -> auth
                /* publico pantalla de login pagina de acceso denegado estaticos */
                .requestMatchers("/", "/login", "/acceso-denegado", "/error", "/favicon.ico",
                    "/css/**", "/js/**", "/img/**").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/login").permitAll()
                /* rutas de ejemplo de la sesion 14 */
                .requestMatchers("/public/**").permitAll()
                .requestMatchers("/privado/admin").hasAuthority("ADMIN")
                .requestMatchers("/privado/**").authenticated()

                /* pantallas por rol */
                .requestMatchers("/admin/**").hasRole("ADMIN")
                .requestMatchers("/empleado/**").hasRole("EMPLEADO")

                /* api solo el administrador gestiona empleados reportes configuracion metodos */
                .requestMatchers("/api/empleados/**", "/api/reportes/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.PUT, "/api/configuracion/**", "/api/metodos-pago/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.POST, "/api/prendas/nuevo").hasRole("ADMIN")
                .requestMatchers(HttpMethod.PUT, "/api/prendas/actualizar/**", "/api/prendas/suspender/**",
                    "/api/prendas/reactivar/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.PUT, "/api/clientes/actualizar/**", "/api/penalidades/actualizar/**",
                    "/api/boletas/actualizar/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.DELETE, "/api/prendas/**", "/api/clientes/**", "/api/penalidades/**",
                    "/api/boletas/**").hasRole("ADMIN")

                /* el resto de la api */
                .requestMatchers("/api/**").authenticated()
                .anyRequest().authenticated())

            /* csrf el token viaja en la cookie xsrf token */
            .csrf(csrf -> csrf
                .csrfTokenRepository(CookieCsrfTokenRepository.withHttpOnlyFalse())
                .csrfTokenRequestHandler(manejadorCsrf))
            .addFilterAfter(new CookieCsrfFilter(), BasicAuthenticationFilter.class)
            /* cierra la sesion si el empleado fue suspendido cerro la ventana o esta inactivo */
            .addFilterAfter(new SesionActivaFilter(empleados, registro), BasicAuthenticationFilter.class)

            .securityContext(contexto -> contexto.securityContextRepository(repositorio))

            /* cierre de sesion invalida la sesion del servidor limpia las cookies y el cache del navegador */
            .logout(logout -> logout
                .logoutUrl("/logout")
                .logoutSuccessUrl("/login?logout")
                .invalidateHttpSession(true)
                .clearAuthentication(true)
                .deleteCookies("JSESSIONID", "XSRF-TOKEN")
                .addLogoutHandler(new HeaderWriterLogoutHandler(new ClearSiteDataHeaderWriter(
                    ClearSiteDataHeaderWriter.Directive.CACHE, ClearSiteDataHeaderWriter.Directive.COOKIES))))

            /* mismas cabeceras que ya enviaba cabecerasseguridadfilter */
            .headers(cabeceras -> cabeceras.frameOptions(marcos -> marcos.sameOrigin()))

            .exceptionHandling(errores -> errores
                .authenticationEntryPoint(sinSesion())
                .accessDeniedHandler(sinPermiso()));

        return http.build();
    }

    /* sin sesion la api responde 401 */
    private AuthenticationEntryPoint sinSesion() {
        return (peticion, respuesta, error) -> {
            if (esApi(peticion)) responderJson(respuesta, 401, "Tu sesión venció. Inicia sesión de nuevo.");
            else respuesta.sendRedirect(peticion.getContextPath() + "/login");
        };
    }

    /* sin permiso la api responde 403 */
    private AccessDeniedHandler sinPermiso() {
        return (peticion, respuesta, error) -> {
            if (esApi(peticion)) {
                String mensaje = error instanceof CsrfException
                    ? "La sesión de seguridad venció. Recarga la página e inicia sesión de nuevo."
                    : "No tienes permiso para realizar esta acción.";
                responderJson(respuesta, 403, mensaje);
            } else {
                respuesta.sendRedirect(peticion.getContextPath() + "/acceso-denegado");
            }
        };
    }

    private static boolean esApi(HttpServletRequest peticion) {
        return peticion.getRequestURI().startsWith(peticion.getContextPath() + "/api/");
    }

    private static void responderJson(HttpServletResponse respuesta, int estado, String mensaje) throws IOException {
        respuesta.setStatus(estado);
        respuesta.setContentType("application/json;charset=UTF-8");
        respuesta.getWriter().write("{\"mensaje\":\"" + mensaje + "\"}");
    }
}
