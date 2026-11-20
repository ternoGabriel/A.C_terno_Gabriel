package com.example.demo.Service;

import java.time.LocalDate;

/* casos de uso de informes exportables */
public interface ReporteService {

    /* genera un libro de excel */
    byte[] generarExcel(String tipo, LocalDate desde, LocalDate hasta);
}
