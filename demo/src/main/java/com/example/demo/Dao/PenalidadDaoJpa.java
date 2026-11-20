package com.example.demo.Dao;


import org.springframework.stereotype.Repository;
import com.example.demo.Model.Penalidad;
import com.example.demo.Repository.PenalidadRepository;

/* implementacion jpa de penalidaddao */
@Repository
public class PenalidadDaoJpa extends JpaDao<Penalidad> implements PenalidadDao {

    private final PenalidadRepository repositorio;

    public PenalidadDaoJpa(PenalidadRepository repositorio) {
        super(repositorio);
        this.repositorio = repositorio;
    }
}
