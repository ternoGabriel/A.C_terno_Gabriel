package com.example.demo.Service;

import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.LongSupplier;
import org.springframework.stereotype.Component;

/* prendas elegidas en el catalogo de compra y alquiler la primera persona que elige se queda con la prenda */
@Component
public class ReservaPrendas {

    /* quien eligio la prenda y hasta cuando vale la eleccion */
    public record Reserva(Long prendaId, Long empleadoId, String empleado, long expira) {
    }

    /* red de seguridad si el navegador se cierra sin avisar la pantalla renueva cada minuto */
    static final long VIGENCIA_MS = 5L * 60 * 1000;

    private final Map<Long, Reserva> reservas = new ConcurrentHashMap<>();
    private final LongSupplier reloj;

    public ReservaPrendas() {
        this(System::currentTimeMillis);
    }

    ReservaPrendas(LongSupplier reloj) {
        this.reloj = reloj;
    }

    /* vacio si la prenda queda para este empleado y si no devuelve a quien la tiene */
    public synchronized Optional<Reserva> reservar(Long prendaId, Long empleadoId, String empleado) {
        long ahora = reloj.getAsLong();
        Reserva actual = reservas.get(prendaId);
        if (actual != null && actual.expira() > ahora && !Objects.equals(actual.empleadoId(), empleadoId)) {
            return Optional.of(actual);
        }
        reservas.put(prendaId, new Reserva(prendaId, empleadoId, empleado == null ? "" : empleado, ahora + VIGENCIA_MS));
        return Optional.empty();
    }

    /* quien tiene la prenda ahora */
    public synchronized Optional<Reserva> ocupante(Long prendaId) {
        Reserva actual = reservas.get(prendaId);
        if (actual == null) return Optional.empty();
        if (actual.expira() <= reloj.getAsLong()) {
            reservas.remove(prendaId);
            return Optional.empty();
        }
        return Optional.of(actual);
    }

    /* solo quien la eligio puede soltarla */
    public synchronized void liberar(Long prendaId, Long empleadoId) {
        Reserva actual = reservas.get(prendaId);
        if (actual != null && Objects.equals(actual.empleadoId(), empleadoId)) reservas.remove(prendaId);
    }

    /* al terminar la boleta la prenda ya no esta en el catalogo */
    public synchronized void liberarPrenda(Long prendaId) {
        reservas.remove(prendaId);
    }

    /* al cerrar sesion se sueltan todas las prendas de ese empleado */
    public synchronized void liberarDe(Long empleadoId) {
        reservas.values().removeIf(r -> Objects.equals(r.empleadoId(), empleadoId));
    }

    /* prendas elegidas que siguen vigentes */
    public synchronized List<Reserva> vigentes() {
        long ahora = reloj.getAsLong();
        reservas.values().removeIf(r -> r.expira() <= ahora);
        return List.copyOf(reservas.values());
    }
}
