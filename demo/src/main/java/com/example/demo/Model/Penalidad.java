package com.example.demo.Model;

import java.time.LocalDate;
import java.time.LocalDateTime;
import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Getter
@Setter
public class Penalidad extends Base {

    @NotNull(message = "Debe seleccionar un cliente")
    @ManyToOne
    @JoinColumn(name = "idCliente")
    private Cliente cliente;

    @NotBlank(message = "El tipo es obligatorio")
    @Pattern(regexp = "Demora|Mal estado|Ambos", message = "El tipo debe ser Demora, Mal estado o Ambos")
    private String tipo;

    @NotNull(message = "El monto es obligatorio")
    @Positive(message = "El monto debe ser mayor a 0")
    private Double monto;

    /* desglose para que el tablero pueda sumar demora y mal */
    @PositiveOrZero(message = "El monto por demora no puede ser negativo")
    private Double montoDemora = 0.0;

    @PositiveOrZero(message = "El monto por mal estado no puede ser negativo")
    private Double montoMalEstado = 0.0;

    @Pattern(regexp = "Cobrado|Pendiente", message = "El estado debe ser Cobrado o Pendiente")
    private String estado = "Pendiente";

    @NotNull(message = "La fecha de la penalidad es obligatoria")
    private LocalDate fecha = LocalDate.now();

    /* lo que escribio el empleado sobre el mal estado de la prenda */
    @Size(max = 255, message = "El comentario no debe superar 255 caracteres")
    private String comentarioMalEstado;

    /* el empleado cambio el monto que puso el administrador */
    private Boolean malEstadoModificado = false;

    /* monto por mal estado que tenia definido el administrador */
    @PositiveOrZero(message = "El monto por defecto no puede ser negativo")
    private Double montoMalEstadoPorDefecto;

    /* boleta de alquiler a la que pertenece esta devolucion */
    private Long idBoleta;

    @Size(max = 100, message = "El nombre del empleado no debe superar 100 caracteres")
    private String empleado;

    private LocalDateTime fechaHora = LocalDateTime.now();
}
