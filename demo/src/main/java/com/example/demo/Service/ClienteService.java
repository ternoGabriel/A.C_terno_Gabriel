package com.example.demo.Service;

import java.util.List;
import com.example.demo.Model.Cliente;

/* casos de uso de la gestion de clientes */
public interface ClienteService {

    List<Cliente> listar();

    Cliente crear(Cliente nuevo);

    Cliente actualizar(Long id, Cliente datos);

    /* registra una calificacion y recalcula el promedio del cliente */
    Cliente calificar(Long id, Object estrellas, Object comentario);

    void eliminar(Long id);
}
