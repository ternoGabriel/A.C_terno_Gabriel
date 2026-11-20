package com.example.demo.Dao;

import java.util.Optional;
import com.example.demo.Model.Cliente;

/* dao de cliente */
public interface ClienteDao extends GenericDao<Cliente> {

    /* cliente con ese dni */
    Optional<Cliente> buscarPorDni(String dni);
}
