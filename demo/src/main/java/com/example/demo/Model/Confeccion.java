package com.example.demo.Model;

import java.time.LocalDate;
import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.Getter;
import lombok.Setter;

/* orden de confeccion al registrarla se emite un ticket */
@Entity
@Getter
@Setter
public class Confeccion extends Base {

    /* lo genera el sistema al registrar la orden */
    @Pattern(regexp = "T\\d{3}-\\d{4,}", message = "El ticket debe tener el formato T001-0001")
    @Column(unique = true)
    private String ticket;

    @NotNull(message = "Debe seleccionar un cliente")
    @ManyToOne
    @JoinColumn(name = "idCliente")
    private Cliente cliente;

    @NotNull(message = "El costo total es obligatorio")
    @Positive(message = "El costo total debe ser mayor a 0")
    private Double costoTotal;

    @NotNull(message = "El adelanto es obligatorio")
    @PositiveOrZero(message = "El adelanto no puede ser negativo")
    private Double adelanto;

    private LocalDate fecha = LocalDate.now();

    private LocalDate primeraPrueba;

    @NotNull(message = "La fecha de entrega final es obligatoria")
    private LocalDate entregaFinal;

    /* compatibilidad con el esquema mysql existente que tambien exige fechaentrega */
    @Column(name = "fechaEntrega")
    private LocalDate fechaEntrega;

    /* en confeccion entregada */
    @NotBlank(message = "El estado de la orden es obligatorio")
    @Pattern(regexp = "En confección|Entregada", message = "El estado debe ser En confección o Entregada")
    private String estado = "En confección";

    @Pattern(regexp = "Efectivo|Yape|Transferencia", message = "El método de pago debe ser Efectivo, Yape o Transferencia")
    private String metodoPago;

    /* texto legado para mantener compatibilidad con la interfaz */
    @Size(max = 255, message = "El nombre del empleado no debe superar 255 caracteres")
    private String empleado;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "idEmpleado")
    @com.fasterxml.jackson.annotation.JsonIgnore
    private Empleado empleadoResponsable;

    /* color principal de la confeccion */
    @Size(max = 255, message = "El color no debe superar 255 caracteres")
    @Column(name = "color", length = 255)
    private String color = "No especificado";

    /* diseno telas colores y medidas */
    @NotBlank(message = "La ficha de medidas es obligatoria")
    @Column(columnDefinition = "TEXT")
    private String detalle;

    /* numero de la boleta emitida al entregar */
    @Pattern(regexp = "B\\d{3}-\\d{4,}", message = "El número de boleta debe tener el formato B001-0001")
    private String boleta;

    /* cuantas pruebas de confeccion se han registrado */
    @PositiveOrZero(message = "La cantidad de pruebas no puede ser negativa")
    private Integer pruebas = 0;

    /* comentarios de las pruebas */
    @Column(columnDefinition = "TEXT")
    private String comentarioPrueba;
}
