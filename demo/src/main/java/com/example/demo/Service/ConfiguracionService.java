package com.example.demo.Service;

import java.util.List;
import com.example.demo.Model.Configuracion;

/* casos de uso de los valores configurables */
public interface ConfiguracionService {

    List<Configuracion> listar();

    /* cambia el valor de una clave */
    Configuracion cambiar(String clave, Object valor, Object modificadoPor);
}
