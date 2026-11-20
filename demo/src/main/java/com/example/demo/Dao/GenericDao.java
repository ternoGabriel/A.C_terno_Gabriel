package com.example.demo.Dao;

import java.util.List;
import java.util.Optional;

/* contrato generico de acceso a datos */
public interface GenericDao<T> {

    /* todos los registros de la entidad */
    List<T> listar();

    /* el registro con ese id o vacio si no existe */
    Optional<T> buscarPorId(Long id);

    /* inserta o actualiza el registro y devuelve la version guardada */
    T guardar(T entidad);

    /* elimina el registro con ese id */
    void eliminarPorId(Long id);

    /* cantidad de registros almacenados */
    long contar();
}
