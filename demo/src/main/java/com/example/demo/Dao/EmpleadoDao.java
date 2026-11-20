package com.example.demo.Dao;

import java.util.Optional;
import com.example.demo.Model.Empleado;

/* dao de empleado */
public interface EmpleadoDao extends GenericDao<Empleado> {

    /* empleado con ese codigo */
    Optional<Empleado> buscarPorCodigo(String codigo);

    /* si ya existe un empleado con ese codigo */
    boolean existePorCodigo(String codigo);

    /* empleado con ese usuario */
    Optional<Empleado> buscarPorUsuario(String usuario);

    /* empleado con ese correo */
    Optional<Empleado> buscarPorCorreo(String correo);
}
