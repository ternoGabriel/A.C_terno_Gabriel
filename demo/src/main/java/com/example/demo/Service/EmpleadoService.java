package com.example.demo.Service;

import java.util.List;
import com.example.demo.Model.Empleado;

/* casos de uso de la gestion de empleados */
public interface EmpleadoService {

    List<Empleado> listar();

    /* crea un empleado genera su codigo lo deja activo */
    Empleado crear(Empleado nuevo);

    Empleado actualizar(Long id, Empleado datos);

    Empleado suspender(Long id);

    Empleado reactivar(Long id);

    /* genera una contrasena temporal la guarda cifrada y la devuelve */
    String restablecerContrasena(Long id);

    /* el administrador escribe una contrasena nueva */
    void cambiarContrasena(Long id, String nueva);

    void eliminar(Long id);

    /* cifra las contrasenas que todavia esten en texto plano */
    int cifrarContrasenasPendientes();
}
