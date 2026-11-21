package com.example.demo.Repository;

import java.util.List;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import com.example.demo.Model.Confeccion;

public interface ConfeccionRepository extends JpaRepository<Confeccion, Long> {

    /* trae las relaciones en una sola consulta en vez de una por registro */
    @Override
    @EntityGraph(attributePaths = {"cliente"})
    List<Confeccion> findAll();
}
