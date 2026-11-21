package com.example.demo.Repository;

import java.util.List;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import com.example.demo.Model.Boleta;

public interface BoletaRepository extends JpaRepository<Boleta, Long> {

    /* trae las relaciones en una sola consulta en vez de una por registro */
    @Override
    @EntityGraph(attributePaths = {"cliente", "prenda", "confeccion", "confeccion.cliente"})
    List<Boleta> findAll();
}
