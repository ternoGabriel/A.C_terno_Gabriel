package com.example.demo.Model;

import java.time.LocalDate;
import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Getter
@Setter
public class Boleta extends Base {

    /* lo genera el sistema al emitir */
    @Pattern(regexp = "B\\d{3}-\\d{4,}", message = "El número de boleta debe tener el formato B001-0001")
    @Column(unique = true)
    private String numero;

    @NotBlank(message = "El tipo de operación es obligatorio")
    @Pattern(regexp = "Venta|Alquiler|Reserva|Confección", message = "El tipo debe ser Venta, Alquiler, Reserva o Confección")
    private String tipo;

    /* muchas boletas pertenecen a un cliente */
    @NotNull(message = "Debe seleccionar un cliente")
    @ManyToOne
    @JoinColumn(name = "idCliente")
    private Cliente cliente;

    /* muchas boletas pueden referirse a una misma prenda */
    @ManyToOne
    @JoinColumn(name = "idPrenda")
    private Prenda prenda;

    @NotNull(message = "La fecha de la boleta es obligatoria")
    private LocalDate fecha = LocalDate.now();

    /* la fecha no puede ser pasada al crear la boleta */
    private LocalDate fechaDevolucion;

    /* solo alquileres fecha de recojo */
    private LocalDate fechaRecojo;

    /* solo alquileres si el empleado lo marca los dias 1 */
    private Boolean cobrarDosDiasComoUno = Boolean.FALSE;

    @NotNull(message = "El monto es obligatorio")
    @Positive(message = "El monto debe ser mayor a 0")
    private Double monto;

    @NotBlank(message = "El estado de la boleta es obligatorio")
    @Pattern(regexp = "Vigente|Devuelta|Anulada", message = "El estado debe ser Vigente, Devuelta o Anulada")
    private String estado = "Vigente";

    /* nombre visible conservado para no cambiar el json que consume */
    @Size(max = 255, message = "El nombre del empleado no debe superar 255 caracteres")
    private String empleado;

    /* relacion real con el empleado que emitio la boleta */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "idEmpleado")
    @com.fasterxml.jackson.annotation.JsonIgnore
    private Empleado empleadoResponsable;

    @Pattern(regexp = "Efectivo|Yape|Transferencia", message = "El método de pago debe ser Efectivo, Yape o Transferencia")
    private String metodoPago;

    /* solo para boletas de confeccion */
    @ManyToOne
    @JoinColumn(name = "idConfeccion")
    private Confeccion confeccion;

    @Size(max = 255, message = "El motivo de anulación no debe superar 255 caracteres")
    private String motivoAnulacion;
}
