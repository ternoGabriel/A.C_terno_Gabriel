package com.example.demo.Seguridad;

import java.util.List;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.User;
import com.example.demo.Model.Empleado;

/* usuario que spring security guarda en la sesion tras iniciar */
public class UsuarioSesion extends User {

    private static final long serialVersionUID = 1L;

    private final Long id;
    private final String nombre;
    private final String apellido;
    private final String rol;

    public UsuarioSesion(Empleado empleado) {
        /* la contrasena no se conserva en la sesion */
        super(empleado.getUsuario(), "", autoridadesDe(empleado.getRol()));
        this.id = empleado.getId();
        this.nombre = empleado.getNombre();
        this.apellido = empleado.getApellido() == null ? "" : empleado.getApellido();
        this.rol = empleado.getRol();
    }

    static List<GrantedAuthority> autoridadesDe(String rol) {
        String autoridad = "Administrador".equals(rol) ? "ADMIN" : "EMPLEADO";
        /* role x sirve para hasrole */
        return List.of(new SimpleGrantedAuthority("ROLE_" + autoridad), new SimpleGrantedAuthority(autoridad));
    }

    /* id del empleado en la tabla */
    public Long getId() {
        return id;
    }

    public String getNombre() {
        return nombre;
    }

    public String getApellido() {
        return apellido;
    }

    /* rol tal como lo ve la pantalla */
    public String getRol() {
        return rol;
    }
}
