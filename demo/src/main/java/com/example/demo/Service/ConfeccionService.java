package com.example.demo.Service;

import java.time.LocalDate;
import java.util.List;
import com.example.demo.Model.Confeccion;

/* casos de uso de las ordenes de confeccion a medida */
public interface ConfeccionService {

    List<Confeccion> listar();

    /* registra la orden y emite su ticket */
    Confeccion registrar(Confeccion nueva);

    /* registra una prueba de la orden */
    Confeccion registrarPrueba(Long id, String comentario, LocalDate entregaFinal);
}
