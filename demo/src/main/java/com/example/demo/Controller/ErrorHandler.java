package com.example.demo.Controller;

import java.util.Map;
import java.util.NoSuchElementException;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataAccessException;
import org.springframework.transaction.TransactionSystemException;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import jakarta.validation.ConstraintViolationException;
import com.example.demo.Seguridad.IntentosExcedidosException;

/* devuelve siempre un mensaje legible */
@RestControllerAdvice
public class ErrorHandler {

    private static final Logger LOG = LoggerFactory.getLogger(ErrorHandler.class);

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, String>> validacion(MethodArgumentNotValidException ex) {
        LOG.warn("Validacion fallida en {} campo(s)", ex.getBindingResult().getErrorCount());
        return ResponseEntity.badRequest().body(ex.getBindingResult().getFieldErrors().stream()
            .collect(Collectors.toMap(f -> f.getField(), f -> f.getDefaultMessage(), (a, b) -> a)));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, String>> regla(IllegalArgumentException ex) {
        LOG.warn("Regla de negocio: {}", ex.getMessage());
        return ResponseEntity.badRequest().body(Map.of("mensaje", ex.getMessage() == null ? "Solicitud no válida" : ex.getMessage()));
    }

    /* demasiados intentos de inicio de sesion fallidos */
    @ExceptionHandler(IntentosExcedidosException.class)
    public ResponseEntity<Map<String, String>> demasiadosIntentos(IntentosExcedidosException ex) {
        LOG.warn("Intentos excedidos");
        return ResponseEntity.status(429).body(Map.of("mensaje", ex.getMessage()));
    }

    @ExceptionHandler(NoSuchElementException.class)
    public ResponseEntity<Map<String, String>> noExiste(NoSuchElementException ex) {
        LOG.warn("Registro no existe: {}", ex.getMessage());
        return ResponseEntity.status(404).body(Map.of("mensaje", "El registro solicitado no existe"));
    }

    /* validaciones de las entidades al guardar */
    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<Map<String, String>> entidad(ConstraintViolationException ex) {
        LOG.warn("Entidad invalida: {} error(es)", ex.getConstraintViolations().size());
        String detalle = ex.getConstraintViolations().stream().map(v -> v.getMessage()).distinct().collect(Collectors.joining(". "));
        return ResponseEntity.badRequest().body(Map.of("mensaje", detalle));
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<Map<String, String>> ilegible(HttpMessageNotReadableException ex) {
        LOG.warn("Cuerpo ilegible");
        return ResponseEntity.badRequest().body(Map.of("mensaje", "Hay un dato con formato no válido (revisa fechas y montos)"));
    }

    /* la validacion de la entidad puede fallar al confirmar */
    @ExceptionHandler(TransactionSystemException.class)
    public ResponseEntity<Map<String, String>> transaccion(TransactionSystemException ex) {
        Throwable t = ex.getMostSpecificCause();
        if (t instanceof ConstraintViolationException cv) return entidad(cv);
        LOG.error("Error de transaccion", ex);
        return ResponseEntity.badRequest().body(Map.of("mensaje", "No se pudo guardar: " + (t == null ? "error de transacción" : t.getMessage())));
    }

    @ExceptionHandler(DataAccessException.class)
    public ResponseEntity<Map<String, String>> integridad(DataAccessException ex) {
        Throwable causa = ex.getMostSpecificCause();
        String texto = causa == null || causa.getMessage() == null ? "" : causa.getMessage();
        /* duplicado o relacion es error del usuario */
        if (texto.contains("Duplicate entry") || texto.contains("foreign key")) LOG.warn("Dato repetido o relacionado");
        else LOG.error("Error de base de datos", ex);
        String mensaje = texto.contains("Duplicate entry") ? "Ya existe un registro con ese dato (código, DNI o usuario repetido)"
            : texto.contains("foreign key") ? "No se puede completar: el registro está relacionado con otros datos"
            : "No se pudo guardar: " + texto;
        return ResponseEntity.badRequest().body(Map.of("mensaje", mensaje));
    }
}
