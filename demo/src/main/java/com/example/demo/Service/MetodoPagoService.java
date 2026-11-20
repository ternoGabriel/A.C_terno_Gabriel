package com.example.demo.Service;

import java.util.List;
import java.util.Map;
import com.example.demo.Model.MetodoPago;

/* casos de uso de los metodos de pago */
public interface MetodoPagoService {

    List<MetodoPago> listar();

    /* actualiza el metodo de pago de ese tipo */
    MetodoPago guardar(String tipo, Map<String, Object> datos);
}
