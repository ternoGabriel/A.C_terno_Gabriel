package com.example.demo.Dao;

import java.util.List;
import com.example.demo.Model.Calificacion;

/* dao de calificacion */
public interface CalificacionDao extends GenericDao<Calificacion> {

    /* todas las calificaciones recibidas por un cliente */
    List<Calificacion> buscarPorCliente(Long idCliente);
}
