package com.example.demo.Seguridad;

import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.stereotype.Component;
import com.example.demo.Model.Empleado;
import com.example.demo.Service.AuthService;

/* conecta spring security con la tabla empleado */
@Component
public class ProveedorAutenticacion implements AuthenticationProvider {

    private final AuthService autenticacion;

    public ProveedorAutenticacion(AuthService autenticacion) {
        this.autenticacion = autenticacion;
    }

    @Override
    public Authentication authenticate(Authentication solicitud) throws AuthenticationException {
        String usuario = solicitud.getName();
        Object credencial = solicitud.getCredentials();
        String contrasena = credencial == null ? null : credencial.toString();

        /* primero valida el formato y luego compara */
        if (!ValidadorCredenciales.correoValido(usuario) || !ValidadorCredenciales.contrasenaSegura(contrasena))
            throw new BadCredentialsException("Correo o contraseña con formato inválido");

        Empleado empleado = autenticacion.autenticar(usuario, contrasena)
            .orElseThrow(() -> new BadCredentialsException("Correo o contraseña incorrectos"));

        UsuarioSesion principal = new UsuarioSesion(empleado);
        return UsernamePasswordAuthenticationToken.authenticated(principal, null, principal.getAuthorities());
    }

    @Override
    public boolean supports(Class<?> tipo) {
        return UsernamePasswordAuthenticationToken.class.isAssignableFrom(tipo);
    }
}
