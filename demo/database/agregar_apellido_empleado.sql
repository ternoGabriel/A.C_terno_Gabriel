/* columna apellido en la tabla empleado */
USE AC_terno_gabriel;

ALTER TABLE `Empleado` ADD COLUMN `apellido` VARCHAR(100) NULL AFTER `nombre`;
