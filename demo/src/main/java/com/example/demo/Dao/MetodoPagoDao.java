package com.example.demo.Dao;

import java.util.Optional;
import com.example.demo.Model.MetodoPago;

/* dao de metodopago */
public interface MetodoPagoDao extends GenericDao<MetodoPago> {

    /* el metodo de pago de ese tipo */
    Optional<MetodoPago> buscarPorTipo(String tipo);
}
