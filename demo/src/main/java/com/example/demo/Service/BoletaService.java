package com.example.demo.Service;

import java.util.List;
import com.example.demo.Model.Boleta;

/* casos de uso de ventas alquileres reservas y entrega */
public interface BoletaService {

    List<Boleta> listar();

    /* emite la boleta calcula el monto genera el numero */
    Boleta emitir(Boleta nueva);

    /* cierra un alquiler vigente y envia la prenda a lavanderia */
    Boleta devolver(Long id, String estadoPrenda);

    /* anula una boleta vigente */
    Boleta anular(Long id, String motivo);

    Boleta actualizar(Long id, Boleta datos);

    void eliminar(Long id);
}
