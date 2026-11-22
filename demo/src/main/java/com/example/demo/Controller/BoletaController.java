package com.example.demo.Controller;

import java.util.List;
import java.util.Map;
import java.util.Objects;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import jakarta.validation.Valid;
import com.example.demo.Model.Boleta;
import com.example.demo.Seguridad.UsuarioSesion;
import com.example.demo.Service.BoletaService;
import com.example.demo.Service.ReservaPrendas;

@RestController
@RequestMapping("/api/boletas")
public class BoletaController {

    private final BoletaService servicio;
    private final ReservaPrendas reservas;

    public BoletaController(BoletaService servicio, ReservaPrendas reservas) {
        this.servicio = servicio;
        this.reservas = reservas;
    }

    @GetMapping
    public List<Boleta> traerBoletas() {
        return servicio.listar();
    }

    @PostMapping("nuevo")
    public Boleta guardarBoleta(@Valid @RequestBody Boleta nueva, Authentication autenticacion) {
        Long prendaId = nueva.getPrenda() != null ? nueva.getPrenda().getId() : null;
        Long yo = autenticacion != null && autenticacion.getPrincipal() instanceof UsuarioSesion usuario ? usuario.getId() : null;
        /* si otro empleado eligio primero esa prenda no se emite */
        if (prendaId != null) {
            reservas.ocupante(prendaId)
                .filter(r -> !Objects.equals(r.empleadoId(), yo))
                .ifPresent(r -> {
                    throw new IllegalArgumentException("Esta prenda ya está seleccionada por " + r.empleado());
                });
        }
        Boleta emitida = servicio.emitir(nueva);
        if (prendaId != null) reservas.liberarPrenda(prendaId);
        return emitida;
    }

    @PutMapping("devolver/{id}")
    public Boleta devolverBoleta(@PathVariable Long id,
                                 @RequestParam(defaultValue = "En lavandería") String estadoPrenda) {
        return servicio.devolver(id, estadoPrenda);
    }

    @PutMapping("anular/{id}")
    public Boleta anularBoleta(@PathVariable Long id, @RequestParam String motivo) {
        return servicio.anular(id, motivo);
    }

    @PutMapping("actualizar/{id}")
    public Boleta editarBoleta(@PathVariable Long id, @Valid @RequestBody Boleta datos) {
        return servicio.actualizar(id, datos);
    }

    @DeleteMapping("eliminar/{id}")
    public Map<String, String> eliminarBoleta(@PathVariable Long id) {
        servicio.eliminar(id);
        return Map.of("mensaje", "BOLETA ELIMINADO");
    }
}
