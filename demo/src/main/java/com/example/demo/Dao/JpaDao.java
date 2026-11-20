package com.example.demo.Dao;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

/* implementacion base de genericdao apoyada en un repositorio de spring */
public abstract class JpaDao<T> implements GenericDao<T> {

    private final JpaRepository<T, Long> repositorio;

    protected JpaDao(JpaRepository<T, Long> repositorio) {
        this.repositorio = repositorio;
    }

    @Override
    public List<T> listar() {
        return repositorio.findAll();
    }

    @Override
    public Optional<T> buscarPorId(Long id) {
        return repositorio.findById(id);
    }

    @Override
    public T guardar(T entidad) {
        return repositorio.save(entidad);
    }

    @Override
    public void eliminarPorId(Long id) {
        repositorio.deleteById(id);
    }

    @Override
    public long contar() {
        return repositorio.count();
    }
}
