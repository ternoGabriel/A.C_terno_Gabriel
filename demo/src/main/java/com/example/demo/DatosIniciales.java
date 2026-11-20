package com.example.demo;

import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import javax.sql.DataSource;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import com.example.demo.Model.Empleado;
import com.example.demo.Seguridad.GestorContrasenas;
import com.example.demo.Service.EmpleadoService;
import jakarta.persistence.EntityManagerFactory;
import jakarta.persistence.metamodel.Attribute;
import jakarta.persistence.metamodel.EntityType;

/* arranque de la base de datos */
@Configuration
public class DatosIniciales {

    private static final Logger LOG = LoggerFactory.getLogger(DatosIniciales.class);

    private static final String CORREO_ADMIN = "jeffersonadmin1@gmail.com";
    private static final String CONTRASENA_ADMIN = "AJeffer01";
    private static final List<String> CONTRASENAS_ANTIGUAS = List.of("Admin1pru", "admin", "Admin");

    @Value("${terno.reiniciar-datos:false}")
    private boolean forzarReinicio;

    @Bean
    CommandLineRunner cargar(DataSource ds, EntityManagerFactory emf, EmpleadoService empleados, GestorContrasenas contrasenas) {
        return args -> {
            repararEsquema(ds, emf);

            /* el arranque normal nunca borra datos */
            if (forzarReinicio) {
                LOG.warn("Se solicitó explícitamente terno.reiniciar-datos=true; se vaciarán todas las tablas.");
                borrarTodo(ds);
            }

            /* si la tabla de empleados esta vacia se inserta */
            crearAdministradorInicial(empleados);
            actualizarContrasenaInicialAntigua(empleados, contrasenas);

            /* seguridad las contrasenas cargadas desde el script sql */
            empleados.cifrarContrasenasPendientes();
        };
    }

    /* administrador inicial */

    /* solo cuando no hay ningun empleado */
    private void crearAdministradorInicial(EmpleadoService empleados) {
        try {
            if (!empleados.listar().isEmpty()) return;
            Empleado admin = new Empleado();
            admin.setNombre("Jefferson");
            admin.setApellido("Encarnacion");
            admin.setUsuario("admin");
            admin.setContrasena(CONTRASENA_ADMIN);
            admin.setCorreo("jeffersonadmin1@gmail.com");
            admin.setTelefono("974673845");
            admin.setArea("Administración");
            admin.setRol("Administrador");
            empleados.crear(admin);
            LOG.info("Se creó la cuenta del administrador en la tabla Empleado.");
        } catch (RuntimeException e) {
            LOG.error("No se pudo crear el administrador inicial: {}", e.getMessage());
        }
    }

    /* si la cuenta del administrador se creo con alguna contrasena */
    private void actualizarContrasenaInicialAntigua(EmpleadoService empleados, GestorContrasenas contrasenas) {
        try {
            for (Empleado e : empleados.listar()) {
                if (!CORREO_ADMIN.equalsIgnoreCase(e.getCorreo())) continue;
                for (String antigua : CONTRASENAS_ANTIGUAS) {
                    if (contrasenas.coincide(antigua, e.getContrasena())) {
                        empleados.cambiarContrasena(e.getId(), CONTRASENA_ADMIN);
                        LOG.info("Se actualizó la contraseña inicial de la cuenta del administrador.");
                        return;
                    }
                }
            }
        } catch (RuntimeException ex) {
            LOG.error("No se pudo actualizar la contraseña inicial del administrador: {}", ex.getMessage());
        }
    }

    /* esquema */

    private void repararEsquema(DataSource ds, EntityManagerFactory emf) {
        /* columnas que si usa cada entidad */
        Map<String, Set<String>> conocidas = new HashMap<>();
        for (EntityType<?> et : emf.getMetamodel().getEntities()) {
            Set<String> cols = new HashSet<>();
            cols.add("id");
            for (Attribute<?, ?> a : et.getAttributes()) {
                String n = a.getName().toLowerCase();
                cols.add(n);
                cols.add("id" + n);
            }
            conocidas.put(et.getName().toLowerCase(), cols);
        }
        try (Connection con = ds.getConnection()) {
            /* columnas antiguas not null sin valor por defecto */
            List<String[]> viejas = new ArrayList<>();
            try (Statement st = con.createStatement();
                 ResultSet rs = st.executeQuery("SELECT TABLE_NAME, COLUMN_NAME, COLUMN_TYPE FROM information_schema.COLUMNS "
                     + "WHERE TABLE_SCHEMA = DATABASE() AND IS_NULLABLE = 'NO' AND COLUMN_DEFAULT IS NULL "
                     + "AND EXTRA NOT LIKE '%auto_increment%' AND EXTRA NOT LIKE '%GENERATED%' AND COLUMN_KEY <> 'PRI'")) {
                while (rs.next()) viejas.add(new String[] { rs.getString(1), rs.getString(2), rs.getString(3) });
            }
            for (String[] c : viejas) {
                Set<String> cols = conocidas.get(c[0].toLowerCase());
                if (cols == null || cols.contains(c[1].toLowerCase())) continue;
                ejecutar(con, "ALTER TABLE `" + c[0] + "` MODIFY `" + c[1] + "` " + c[2] + " NULL");
                LOG.warn("Columna antigua {}.{} ahora acepta valores vacíos.", c[0], c[1]);
            }
            /* columnas de texto que en bases antiguas quedaron cortas */
            asegurarTexto(con, "Confeccion", "detalle", "TEXT", Set.of("text", "mediumtext", "longtext"));
            asegurarTexto(con, "Prenda", "imagen", "LONGTEXT", Set.of("longtext"));
        } catch (SQLException e) {
            LOG.error("No se pudo revisar el esquema de la base de datos: {}", e.getMessage());
        }
    }

    private void asegurarTexto(Connection con, String tabla, String columna, String tipoNuevo, Set<String> aceptados) throws SQLException {
        String tipoActual = null, tablaReal = null, columnaReal = null;
        try (Statement st = con.createStatement();
             ResultSet rs = st.executeQuery("SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() "
                 + "AND LOWER(TABLE_NAME) = '" + tabla.toLowerCase() + "' AND LOWER(COLUMN_NAME) = '" + columna.toLowerCase() + "'")) {
            if (rs.next()) { tablaReal = rs.getString(1); columnaReal = rs.getString(2); tipoActual = rs.getString(3); }
        }
        if (tipoActual != null && !aceptados.contains(tipoActual.toLowerCase())) {
            ejecutar(con, "ALTER TABLE `" + tablaReal + "` MODIFY `" + columnaReal + "` " + tipoNuevo + " NULL");
            LOG.warn("Columna {}.{} ampliada a {}.", tablaReal, columnaReal, tipoNuevo);
        }
    }

    private void ejecutar(Connection con, String sql) {
        try (Statement st = con.createStatement()) {
            st.execute(sql);
        } catch (SQLException e) {
            LOG.error("No se pudo ejecutar [{}]: {}", sql, e.getMessage());
        }
    }

    /* vacia todas las tablas de la base */
    private void borrarTodo(DataSource ds) throws SQLException {
        try (Connection con = ds.getConnection()) {
            List<String> tablas = new ArrayList<>();
            try (Statement st = con.createStatement();
                 ResultSet rs = st.executeQuery("SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE = 'BASE TABLE'")) {
                while (rs.next()) tablas.add(rs.getString(1));
            }
            try (Statement st = con.createStatement()) {
                st.execute("SET FOREIGN_KEY_CHECKS = 0");
                try {
                    for (String t : tablas) st.execute("TRUNCATE TABLE `" + t + "`");
                } finally {
                    st.execute("SET FOREIGN_KEY_CHECKS = 1");
                }
            }
        }
    }
}
