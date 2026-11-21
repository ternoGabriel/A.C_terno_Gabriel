package com.example.demo.Service.impl;

import org.springframework.cache.annotation.Cacheable;
import com.example.demo.Config.InvalidaCache;
import com.example.demo.Config.NombresCache;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.example.demo.Dao.PenalidadDao;
import com.example.demo.Model.Penalidad;
import com.example.demo.Service.PenalidadService;

@Service
public class PenalidadServiceImpl implements PenalidadService {

    private final PenalidadDao dao;

    public PenalidadServiceImpl(PenalidadDao dao) {
        this.dao = dao;
    }

    @Override
    @Cacheable(NombresCache.PENALIDADES)
    public List<Penalidad> listar() {
        return dao.listar();
    }

    @Override
    @Transactional
    @InvalidaCache
    public Penalidad crear(Penalidad nueva) {
        return dao.guardar(nueva);
    }

    @Override
    @Transactional
    @InvalidaCache
    public Penalidad actualizar(Long id, Penalidad datos) {
        dao.buscarPorId(id).orElseThrow();
        datos.setId(id);
        return dao.guardar(datos);
    }

    @Override
    @Transactional
    @InvalidaCache
    public void eliminar(Long id) {
        dao.eliminarPorId(id);
    }
}
