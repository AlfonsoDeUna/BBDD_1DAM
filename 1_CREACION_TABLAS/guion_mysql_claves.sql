-- LABORATORIO DE CLAVES · MySQL 8.0/8.4 · InnoDB
-- Guion de ejemplos. Ejecuta la preparación una sola vez en un servidor de prácticas.
-- No contiene DROP ni desactiva FOREIGN_KEY_CHECKS.
-- Si la base ya existe, DETENTE: elige otro nombre o revisa tu práctica anterior.
-- No ejecutes este guion en una base con datos de producción.

CREATE DATABASE laboratorio_claves_aula;
USE laboratorio_claves_aula;

CREATE TABLE proveedores (
    id_proveedor INT,
    nombre VARCHAR(100) NOT NULL,
    PRIMARY KEY (id_proveedor)
) ENGINE = InnoDB;

CREATE TABLE facturas (
    id_factura INT PRIMARY KEY,
    numero VARCHAR(30) NOT NULL,
    id_proveedor INT NOT NULL,
    CONSTRAINT fk_facturas_proveedores
        FOREIGN KEY (id_proveedor)
        REFERENCES proveedores (id_proveedor)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
) ENGINE = InnoDB;

CREATE TABLE lineas_factura (
    id_factura INT,
    numero_linea INT,
    descripcion VARCHAR(100) NOT NULL,
    PRIMARY KEY (id_factura, numero_linea),
    CONSTRAINT fk_lineas_factura_facturas
        FOREIGN KEY (id_factura)
        REFERENCES facturas (id_factura)
        ON DELETE CASCADE
        ON UPDATE CASCADE
) ENGINE = InnoDB;

CREATE TABLE incidencias (
    id_incidencia INT PRIMARY KEY,
    id_factura INT NOT NULL,
    numero_linea INT NOT NULL,
    descripcion VARCHAR(100) NOT NULL,
    CONSTRAINT fk_incidencias_lineas
        FOREIGN KEY (id_factura, numero_linea)
        REFERENCES lineas_factura (id_factura, numero_linea)
) ENGINE = InnoDB;

CREATE TABLE empleados (
    id_empleado INT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL
) ENGINE = InnoDB;

CREATE TABLE comites (
    id_comite INT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL
) ENGINE = InnoDB;

CREATE TABLE pertenencias (
    id_empleado INT,
    id_comite INT,
    PRIMARY KEY (id_empleado, id_comite),
    CONSTRAINT fk_pertenencias_empleados
        FOREIGN KEY (id_empleado)
        REFERENCES empleados (id_empleado),
    CONSTRAINT fk_pertenencias_comites
        FOREIGN KEY (id_comite)
        REFERENCES comites (id_comite)
) ENGINE = InnoDB;

CREATE TABLE fotos_empleados (
    id_foto INT PRIMARY KEY,
    id_empleado INT NOT NULL,
    ruta_foto VARCHAR(255) NOT NULL,
    UNIQUE (id_empleado),
    CONSTRAINT fk_fotos_empleados
        FOREIGN KEY (id_empleado)
        REFERENCES empleados (id_empleado)
) ENGINE = InnoDB;

INSERT INTO proveedores (id_proveedor, nombre)
VALUES (1, 'Norte'), (2, 'Sur');
INSERT INTO facturas (id_factura, numero, id_proveedor)
VALUES (101, 'F-001', 1), (102, 'F-002', 1), (103, 'F-001', 2);
INSERT INTO lineas_factura (id_factura, numero_linea, descripcion)
VALUES (101, 1, 'Monitor'), (101, 2, 'Cable'), (102, 1, 'Teclado');
INSERT INTO empleados (id_empleado, nombre)
VALUES (1, 'Ana'), (2, 'Luis'), (3, 'Sara');
INSERT INTO comites (id_comite, nombre)
VALUES (10, 'Seguridad'), (20, 'Actividades');
INSERT INTO pertenencias (id_empleado, id_comite)
VALUES (1, 10), (1, 20), (2, 10);
INSERT INTO fotos_empleados (id_foto, id_empleado, ruta_foto)
VALUES (1, 1, 'ana.jpg');

-- 1. COMPROBAR EL ESQUEMA
SHOW CREATE TABLE proveedores;
SHOW CREATE TABLE facturas;
SHOW CREATE TABLE lineas_factura;
SHOW CREATE TABLE pertenencias;
SHOW CREATE TABLE fotos_empleados;
SHOW INDEX FROM facturas;

-- 2. PREDECIR Y OBSERVAR ON UPDATE CASCADE. ROLLBACK restaura los datos.
START TRANSACTION;
UPDATE proveedores SET id_proveedor = 10 WHERE id_proveedor = 1;
SELECT * FROM proveedores;
SELECT * FROM facturas;
ROLLBACK;

-- 3. BORRAR UNA FACTURA. Sus líneas se borran, pero no su proveedor.
START TRANSACTION;
DELETE FROM facturas WHERE id_factura = 101;
SELECT * FROM facturas;
SELECT * FROM lineas_factura;
SELECT * FROM proveedores;
ROLLBACK;

-- 4. PRUEBAS QUE DEBEN FALLAR. Están comentadas para no interrumpir el guion.
-- Descomenta y ejecuta UNA a la vez; identifica la restricción que lo impide.
-- PK repetida:
-- INSERT INTO proveedores VALUES (1, 'Otro proveedor');
-- FK inexistente:
-- INSERT INTO facturas VALUES (104, 'F-003', 99);
-- NOT NULL:
-- INSERT INTO facturas VALUES (104, 'F-003', NULL);
-- RESTRICT:
-- DELETE FROM proveedores WHERE id_proveedor = 1;
-- PK compuesta repetida:
-- INSERT INTO pertenencias VALUES (1, 10);
-- FK compuesta inexistente: no existe la línea (102, 2).
-- INSERT INTO incidencias VALUES (1, 102, 2, 'Revisión');
-- 1:1: otra foto del empleado 1.
-- INSERT INTO fotos_empleados VALUES (2, 1, 'otra.jpg');

-- 5. PADRES DEL RETO FINAL. Las demás tablas debes escribirlas tú.
CREATE TABLE docentes (
    id_docente INT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL
) ENGINE = InnoDB;
CREATE TABLE alumnos (
    id_alumno INT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL
) ENGINE = InnoDB;
INSERT INTO docentes VALUES (1, 'Marta'), (2, 'Jorge');
INSERT INTO alumnos VALUES (1, 'Leo'), (2, 'Ines');
-- Crea talleres; después, matriculas y carnets.
-- Comprueba cada definición con SHOW CREATE TABLE y diseña tus pruebas.
