package com.example.demo.Model;

import java.util.List;
import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Getter
@Setter
public class Prenda extends Base {

    /* tres letras mayusculas guion y numeros */
    @NotBlank(message = "El código es obligatorio")
    @Pattern(regexp = "[A-Z]{3}-\\d{3,}", message = "El código debe tener 3 letras, un guion y números (ej. TRN-001)")
    @Column(unique = true)
    private String codigo;

    @NotBlank(message = "El diseño es obligatorio")
    @Size(max = 255, message = "El diseño no debe superar 255 caracteres")
    private String diseno;

    @NotBlank(message = "El tipo es obligatorio")
    @Pattern(regexp = "Nuevo|Seminuevo", message = "El tipo debe ser Nuevo o Seminuevo")
    private String tipo;

    @NotBlank(message = "La talla es obligatoria")
    @Size(max = 20, message = "La talla no debe superar 20 caracteres")
    private String talla;

    @NotBlank(message = "El estado es obligatorio")
    @Pattern(regexp = "Disponible|Alquilado|Reservado|Vendido|En confección|En lavandería|En restauración",
             message = "Estado de prenda no válido")
    private String estado = "Disponible";

    @NotNull(message = "El precio de venta es obligatorio")
    @Positive(message = "El precio de venta debe ser mayor a 0")
    private Double precioVenta;

    @NotNull(message = "El precio de alquiler es obligatorio")
    @Positive(message = "El precio de alquiler debe ser mayor a 0")
    private Double precioAlquiler;

    /* atributos que usan los filtros del catalogo */
    @Size(max = 255, message = "El color no debe superar 255 caracteres")
    private String color;

    /* ninos jovenes adultos */
    @Pattern(regexp = "Niños|Jóvenes|Adultos", message = "La categoría debe ser Niños, Jóvenes o Adultos")
    private String categoria;

    @Size(max = 255, message = "El estilo no debe superar 255 caracteres")
    private String estilo;

    @Size(max = 255, message = "El componente no debe superar 255 caracteres")
    private String componente;

    /* el administrador puede dar de baja una prenda sin borrarla */
    private boolean suspendida = false;
    /* fecha en que el administrador registro la prenda y fecha */
    private java.time.LocalDate fechaCreacion;
    private java.time.LocalDate fechaEdicion;

    /* foto de la prenda */
    @Size(max = 5_000_000, message = "La imagen de la prenda es demasiado pesada")
    @Column(columnDefinition = "LONGTEXT")
    private String imagen;

    @OneToMany(mappedBy = "prenda")
    @JsonIgnore
    private List<Boleta> boletas;
}
