package com.example.demo.Service.impl;

import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.example.demo.Dao.EmpleadoDao;
import com.example.demo.Model.Empleado;
import com.example.demo.Seguridad.GestorContrasenas;
import com.example.demo.Seguridad.ValidadorCredenciales;
import com.example.demo.Service.EmpleadoService;
import com.google.common.base.Preconditions;

@Service
public class EmpleadoServiceImpl implements EmpleadoService {

    private static final Logger LOG = LoggerFactory.getLogger(EmpleadoServiceImpl.class);
    private static final String NO_EXISTE = "El empleado no existe";

    private final EmpleadoDao dao;
    private final GestorContrasenas contrasenas;

    public EmpleadoServiceImpl(EmpleadoDao dao, GestorContrasenas contrasenas) {
        this.dao = dao;
        this.contrasenas = contrasenas;
    }

    @Override
    public List<Empleado> listar() {
        return dao.listar();
    }

    @Override
    @Transactional
    public Empleado crear(Empleado nuevo) {
        Preconditions.checkArgument(nuevo.getApellido() != null && !nuevo.getApellido().isBlank(), "El apellido es obligatorio");
        Preconditions.checkArgument(nuevo.getContrasena() != null && !nuevo.getContrasena().isBlank(), "La contraseña es obligatoria");
        Preconditions.checkArgument(ValidadorCredenciales.contrasenaSegura(nuevo.getContrasena()), ValidadorCredenciales.mensajeContrasena(nuevo.getContrasena()));
        nuevo.setCorreo(nuevo.getCorreo().trim().toLowerCase());
        nuevo.setNombre(nuevo.getNombre().trim());
        nuevo.setApellido(nuevo.getApellido().trim());
        Preconditions.checkArgument(dao.buscarPorUsuario(nuevo.getUsuario()).isEmpty(), "Ya existe un empleado con ese usuario");
        Preconditions.checkArgument(dao.buscarPorCorreo(nuevo.getCorreo()).isEmpty(), "Ya existe un empleado con ese correo");
        nuevo.setCodigo(siguienteCodigo());
        nuevo.setEstado("Activo");
        nuevo.setContrasena(contrasenas.cifrar(nuevo.getContrasena()));
        Empleado guardado = dao.guardar(nuevo);
        LOG.info("Empleado {} creado con rol {}", guardado.getCodigo(), guardado.getRol());
        return guardado;
    }

    @Override
    @Transactional
    public Empleado actualizar(Long id, Empleado datos) {
        Empleado actual = dao.buscarPorId(id).orElseThrow(() -> new IllegalArgumentException(NO_EXISTE));
        Preconditions.checkArgument(datos.getApellido() != null && !datos.getApellido().isBlank(), "El apellido es obligatorio");
        datos.setCorreo(datos.getCorreo().trim().toLowerCase());
        dao.buscarPorUsuario(datos.getUsuario()).ifPresent(otro ->
            Preconditions.checkArgument(otro.getId().equals(id), "Ya existe un empleado con ese usuario"));
        dao.buscarPorCorreo(datos.getCorreo()).ifPresent(otro ->
            Preconditions.checkArgument(otro.getId().equals(id), "Ya existe un empleado con ese correo"));
        /* solo se cambian los datos editables */
        actual.setNombre(datos.getNombre().trim());
        actual.setApellido(datos.getApellido().trim());
        actual.setUsuario(datos.getUsuario());
        actual.setCorreo(datos.getCorreo());
        actual.setTelefono(datos.getTelefono());
        actual.setArea(datos.getArea());
        actual.setRol(datos.getRol());
        /* editar nunca cambia la contrasena */
        LOG.info("Empleado {} editado", actual.getCodigo());
        return dao.guardar(actual);
    }

    @Override
    @Transactional
    public Empleado suspender(Long id) {
        Empleado e = dao.buscarPorId(id).orElseThrow(() -> new IllegalArgumentException(NO_EXISTE));
        e.setEstado("Suspendido");
        LOG.info("Empleado {} suspendido", e.getCodigo());
        return dao.guardar(e);
    }

    @Override
    @Transactional
    public Empleado reactivar(Long id) {
        Empleado e = dao.buscarPorId(id).orElseThrow(() -> new IllegalArgumentException(NO_EXISTE));
        e.setEstado("Activo");
        LOG.info("Empleado {} reactivado", e.getCodigo());
        return dao.guardar(e);
    }

    @Override
    @Transactional
    public String restablecerContrasena(Long id) {
        Empleado e = dao.buscarPorId(id).orElseThrow(() -> new IllegalArgumentException(NO_EXISTE));
        String temporal = contrasenas.generarTemporal();
        e.setContrasena(contrasenas.cifrar(temporal));
        dao.guardar(e);
        LOG.info("Contraseña restablecida para el empleado {}", e.getCodigo());
        return temporal;
    }

    @Override
    @Transactional
    public void cambiarContrasena(Long id, String nueva) {
        Empleado e = dao.buscarPorId(id).orElseThrow(() -> new IllegalArgumentException(NO_EXISTE));
        Preconditions.checkArgument(ValidadorCredenciales.contrasenaSegura(nueva), ValidadorCredenciales.mensajeContrasena(nueva));
        e.setContrasena(contrasenas.cifrar(nueva));
        dao.guardar(e);
        LOG.info("Contraseña cambiada para el empleado {}", e.getCodigo());
    }

    @Override
    @Transactional
    public void eliminar(Long id) {
        dao.eliminarPorId(id);
        LOG.info("Empleado con id {} eliminado", id);
    }

    @Override
    @Transactional
    public int cifrarContrasenasPendientes() {
        int cifradas = 0;
        for (Empleado e : dao.listar()) {
            if (e.getContrasena() != null && !contrasenas.estaCifrada(e.getContrasena())) {
                e.setContrasena(contrasenas.cifrar(e.getContrasena()));
                dao.guardar(e);
                cifradas++;
            }
        }
        if (cifradas > 0) LOG.info("Se cifraron {} contraseña(s) que estaban en texto plano", cifradas);
        return cifradas;
    }

    /* el codigo lo genera el sistema no se escribe */
    private String siguienteCodigo() {
        int max = dao.listar().stream()
            .map(Empleado::getCodigo)
            .filter(c -> c != null && c.matches("E\\d{3}"))
            .mapToInt(c -> Integer.parseInt(c.substring(1)))
            .max().orElse(0);
        String codigo;
        do { codigo = String.format("E%03d", ++max); } while (dao.existePorCodigo(codigo));
        return codigo;
    }
}
