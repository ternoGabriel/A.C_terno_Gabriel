package com.example.demo.Controller;

import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import com.example.demo.Model.Prenda;
import com.example.demo.Seguridad.UsuarioSesion;
import com.example.demo.Service.PrendaService;
import com.example.demo.Service.ReservaPrendas;

/* seleccion de prendas en el catalogo de compra y alquiler */
@RestController
@RequestMapping("/api/prendas")
public class ReservaPrendaController {

    private final ReservaPrendas reservas;
    private final PrendaService prendas;

    public ReservaPrendaController(ReservaPrendas reservas, PrendaService prendas) {
        this.reservas = reservas;
        this.prendas = prendas;
    }

    /* prendas elegidas ahora y si la eleccion es de quien consulta */
    @GetMapping("reservas")
    public List<Map<String, Object>> listar(Authentication autenticacion) {
        Long yo = idDe(autenticacion);
        return reservas.vigentes().stream()
            .<Map<String, Object>>map(r -> Map.of(
                "prendaId", r.prendaId(),
                "empleado", r.empleado(),
                "mia", Objects.equals(r.empleadoId(), yo)))
            .toList();
    }

    /* elige la prenda o renueva la eleccion si ya era suya */
    @PostMapping("reservar/{id}")
    public ResponseEntity<Map<String, String>> reservar(@PathVariable Long id, Authentication autenticacion) {
        Optional<Prenda> prenda = prendas.listar().stream().filter(p -> id.equals(p.getId())).findFirst();
        if (prenda.isEmpty() || !"Disponible".equals(prenda.get().getEstado()) || prenda.get().isSuspendida()) {
            return ResponseEntity.status(409).body(Map.of("mensaje", "Esta prenda ya no está disponible"));
        }
        if (!(autenticacion != null && autenticacion.getPrincipal() instanceof UsuarioSesion usuario)) {
            return ResponseEntity.status(401).body(Map.of("mensaje", "Tu sesión venció. Inicia sesión de nuevo."));
        }
        Optional<ReservaPrendas.Reserva> ocupante = reservas.reservar(id, usuario.getId(), nombreVisible(usuario));
        if (ocupante.isPresent()) {
            return ResponseEntity.status(409).body(Map.of("mensaje",
                "Esta prenda ya está seleccionada por " + ocupante.get().empleado() + ". Podrás elegirla cuando termine o anule su proceso."));
        }
        return ResponseEntity.ok(Map.of("mensaje", "Prenda seleccionada"));
    }

    /* anula la eleccion y la prenda vuelve a quedar libre */
    @PostMapping("liberar/{id}")
    public ResponseEntity<Map<String, String>> liberar(@PathVariable Long id, Authentication autenticacion) {
        reservas.liberar(id, idDe(autenticacion));
        return ResponseEntity.ok(Map.of("mensaje", "Prenda liberada"));
    }

    private static Long idDe(Authentication autenticacion) {
        return autenticacion != null && autenticacion.getPrincipal() instanceof UsuarioSesion usuario ? usuario.getId() : null;
    }

    /* nombre y primer apellido */
    private static String nombreVisible(UsuarioSesion usuario) {
        String nombre = usuario.getNombre() == null ? "" : usuario.getNombre().trim().split("\\s+")[0];
        String apellido = usuario.getApellido() == null ? "" : usuario.getApellido().trim().split("\\s+")[0];
        String completo = (nombre + " " + apellido).trim();
        return completo.isEmpty() ? "otro empleado" : completo;
    }
}
