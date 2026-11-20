package com.example.demo.Dao;


import org.springframework.stereotype.Repository;
import com.example.demo.Model.Confeccion;
import com.example.demo.Repository.ConfeccionRepository;

/* implementacion jpa de confecciondao */
@Repository
public class ConfeccionDaoJpa extends JpaDao<Confeccion> implements ConfeccionDao {

    private final ConfeccionRepository repositorio;

    public ConfeccionDaoJpa(ConfeccionRepository repositorio) {
        super(repositorio);
        this.repositorio = repositorio;
    }
}
