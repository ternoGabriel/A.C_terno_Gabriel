package com.example.demo.Service;

import java.util.Optional;
import com.example.demo.Model.Empleado;

/* caso de uso iniciar sesion */
public interface AuthService {

    /* valida usuario y contrasena de un empleado activo */
    Optional<Empleado> autenticar(String usuario, String contrasena);
}
