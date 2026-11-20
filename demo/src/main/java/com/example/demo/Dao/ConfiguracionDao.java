package com.example.demo.Dao;

import java.util.Optional;
import com.example.demo.Model.Configuracion;

/* dao de configuracion */
public interface ConfiguracionDao extends GenericDao<Configuracion> {

    /* valor de configuracion con esa clave */
    Optional<Configuracion> buscarPorClave(String clave);
}
