/* cuenta del administrador en la base ac terno gabriel */
/* paso 1 ejecutar la aplicacion una vez */
/* paso 2 ejecutar este archivo en workbench */
/* paso 3 reiniciar la aplicacion */
/* paso 4 iniciar sesion con el correo del administrador */
USE AC_terno_gabriel;

INSERT IGNORE INTO `Empleado` (codigo, nombre, apellido, usuario, contrasena, correo, telefono, area, rol, estado, desde) VALUES
('E001', 'Jefferson', 'Encarnacion', 'admin', 'AJeffer01', 'jeffersonadmin1@gmail.com', '974673845', 'Administración', 'Administrador', 'Activo', CURDATE());
