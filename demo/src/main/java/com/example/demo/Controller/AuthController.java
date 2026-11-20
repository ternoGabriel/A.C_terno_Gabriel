package com.example.demo.Controller;

import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.web.bind.annotation.*;
import com.example.demo.Seguridad.CuentaSuspendidaException;
import com.example.demo.Seguridad.RegistroSesiones;
import com.example.demo.Seguridad.UsuarioSesion;
import com.example.demo.Seguridad.ValidadorCredenciales;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;

/* capa controlador recibe el inicio de sesion y lo autentica */
@RestController
@RequestMapping("/api")
public class AuthController {

    private static final String MENSAJE_INVALIDO = "Correo o contraseña incorrectos. Por favor, verifique sus datos.";

    private final AuthenticationManager autenticador;
    private static final String MENSAJE_YA_ACTIVO = "Este usuario ya está activo en otra sesión. Cierra esa sesión para poder ingresar.";
    private static final String MENSAJE_NAVEGADOR_OCUPADO = "Ya hay otra cuenta abierta en este navegador. Ciérrala o usa otro navegador.";

    private final SecurityContextRepository repositorio;
    private final RegistroSesiones registro;

    public AuthController(AuthenticationManager autenticador, SecurityContextRepository repositorio, RegistroSesiones registro) {
        this.autenticador = autenticador;
        this.repositorio = repositorio;
        this.registro = registro;
    }

    /* inicio de sesion contra la tabla empleado */
    @PostMapping("login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> datos, HttpServletRequest peticion, HttpServletResponse respuesta) {
        /* spring security solo recibe credenciales con el formato correcto */
        String correo = datos.get("usuario");
        if (!ValidadorCredenciales.correoValido(correo))
            return ResponseEntity.badRequest().body(Map.of("mensaje", ValidadorCredenciales.MENSAJE_CORREO));
        if (!ValidadorCredenciales.contrasenaSegura(datos.get("contrasena")))
            return ResponseEntity.badRequest().body(Map.of("mensaje", ValidadorCredenciales.mensajeContrasena(datos.get("contrasena"))));

        Authentication autenticacion;
        try {
            autenticacion = autenticador.authenticate(
                UsernamePasswordAuthenticationToken.unauthenticated(correo.trim().toLowerCase(), datos.get("contrasena")));
        } catch (CuentaSuspendidaException e) {
            /* cuenta suspendida no entra */
            return ResponseEntity.status(403).body(Map.of("mensaje", e.getMessage()));
        } catch (AuthenticationException e) {
            return ResponseEntity.status(401).body(Map.of("mensaje", MENSAJE_INVALIDO));
        }

        UsuarioSesion nuevo = (UsuarioSesion) autenticacion.getPrincipal();
        String pestana = datos.get("pestana");
        HttpSession actual = peticion.getSession(false);

        /* un mismo empleado no puede tener dos sesiones activas a la vez */
        RegistroSesiones.Entrada viva = registro.activaDe(nuevo.getId());
        if (viva != null) {
            boolean estaPestana = actual != null && actual.getId().equals(viva.getSesionId())
                && pestana != null && pestana.equals(viva.getPestana());
            if (!estaPestana) {
                registro.avisarIntento(nuevo.getId(), "Alguien intentó ingresar con tu cuenta a las "
                    + LocalTime.now().format(DateTimeFormatter.ofPattern("HH:mm"))
                    + ". Si no fuiste tú, avisa al administrador.");
                return ResponseEntity.status(409).body(Map.of("mensaje", MENSAJE_YA_ACTIVO, "motivo", "usuario-activo"));
            }
            registro.cerrar(viva);
            actual = null;
        }
        /* el navegador comparte cookie y ya tiene otra cuenta abierta */
        if (actual != null) {
            RegistroSesiones.Entrada ocupada = registro.activaDeSesion(actual.getId());
            if (ocupada != null && !(pestana != null && pestana.equals(ocupada.getPestana())))
                return ResponseEntity.status(409).body(Map.of("mensaje", MENSAJE_NAVEGADOR_OCUPADO, "motivo", "navegador-ocupado"));
            if (ocupada != null) registro.cerrar(ocupada);
        }

        /* proteccion contra fijacion de sesion */
        if (peticion.getSession(false) != null) peticion.changeSessionId();

        SecurityContext contexto = SecurityContextHolder.createEmptyContext();
        contexto.setAuthentication(autenticacion);
        SecurityContextHolder.setContext(contexto);
        repositorio.saveContext(contexto, peticion, respuesta);

        registro.registrar(nuevo.getId(), peticion.getSession(), pestana);
        return ResponseEntity.ok(Map.of("nombre", nuevo.getNombre(), "apellido", nuevo.getApellido(), "rol", nuevo.getRol()));
    }

    /* consulta si la sesion sigue vigente */
    @GetMapping("sesion")
    public ResponseEntity<?> sesion(Authentication autenticacion, HttpServletRequest peticion) {
        UsuarioSesion usuario = (UsuarioSesion) autenticacion.getPrincipal();
        HttpSession sesion = peticion.getSession(false);
        List<String> avisos = sesion == null ? List.of() : registro.tomarAvisos(sesion.getId());
        return ResponseEntity.ok(Map.of("nombre", usuario.getNombre(), "apellido", usuario.getApellido(),
            "rol", usuario.getRol(), "avisos", avisos));
    }

    /* el navegador avisa que la pestana se cierra o se recarga */
    @PostMapping("sesion/cierre")
    public ResponseEntity<Void> cierre(@RequestParam(value = "pestana", required = false) String pestana, HttpServletRequest peticion) {
        HttpSession sesion = peticion.getSession(false);
        if (sesion != null) registro.marcarCierre(sesion.getId(), pestana);
        return ResponseEntity.noContent().build();
    }

    /* renueva el tiempo de inactividad */
    @PostMapping("sesion/actividad")
    public ResponseEntity<Void> actividad() {
        return ResponseEntity.noContent().build();
    }
}
