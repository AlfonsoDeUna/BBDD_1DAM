# Laboratorios y prácticas · Bases de Datos (1.º DAM)

> Índice conjunto de actividades, recursos y herramientas de `1_CREACION_TABLAS` y `2_CLAVES`. Organizados por contenidos y secuencia didáctica, sin cambiar la ubicación de los archivos originales.

## Acceso directo

**🌐 [Abrir el índice web de laboratorios y prácticas](https://alfonsodeuna.github.io/BBDD_1DAM/1_CREACION_TABLAS/)**

El índice web permite acceder a las actividades desde el navegador, con una breve descripción y los recursos complementarios. También puedes usar los enlaces de esta misma página desde GitHub.

## Ruta de aprendizaje sugerida

| Orden | Actividad | Contenido y objetivo | Formato |
| --- | --- | --- | --- |
| 1 | **[Laboratorio de claves primarias y foráneas](https://alfonsodeuna.github.io/BBDD_1DAM/1_CREACION_TABLAS/laboratorio_claves.html)** | PK, FK, relaciones 1:N, N:M y 1:1; predicción, simulaciones y cuaderno exportable. | Laboratorio interactivo |
| 2 | **[Ejercicios guiados de creación de tablas y relaciones](https://alfonsodeuna.github.io/BBDD_1DAM/1_CREACION_TABLAS/EJERCICIOS_GUIADOS_PK_FK/)** | 6 ejercicios en 49 diapositivas: interpretar enunciados, diagramar tablas y completar SQL con ayudas progresivas. | Presentación guiada |
| 2A | **[Recorrido de claves PK, FK e integridad referencial](https://alfonsodeuna.github.io/BBDD_1DAM/2_CLAVES/)** | Laboratorio por pantallas: concepto y elección de PK, FK, 1:N, N:M, 1:1, SQL y simulación de integridad. Incluye prácticas y prueba final. | Unidad web ampliada · `2_CLAVES` |
| 3 | **[Laboratorio de restricciones CHECK](https://alfonsodeuna.github.io/BBDD_1DAM/1_CREACION_TABLAS/laboratorio_check.html)** | Comparaciones, rangos, NULL, reglas entre columnas, ALTER TABLE y pruebas de tablas. | Laboratorio interactivo |
| 4 | **[LaLiga: de las estadísticas a una base de datos](https://alfonsodeuna.github.io/BBDD_1DAM/1_CREACION_TABLAS/PR%C3%81CTICA_LIGA_FUTBOL/)** | Tablas equipo/jugador, cardinalidad 1:N, PK/FK, dos CHECK, INSERT con ayuda de IA y SELECT. | Práctica guiada, 9 diapositivas |
| 5 | **[Laboratorio REGEXP_LIKE](https://alfonsodeuna.github.io/BBDD_1DAM/1_CREACION_TABLAS/laboratorio_regexp_like.html)** | 11 niveles sobre patrones, anclas, clases, cuantificadores, formatos y uso de REGEXP_LIKE en CHECK. | Laboratorio interactivo |
| 6 | **[PulsoFit: creación de tablas y 15 CHECK](https://alfonsodeuna.github.io/BBDD_1DAM/1_CREACION_TABLAS/EXPRESIONES%20REGULARES/)** | Crear socios y clases a partir del SQL proporcionado y añadir 15 restricciones mediante ALTER TABLE. | Práctica SQL individual |
| 7 | **[El secreto del doctor Grinberg](https://alfonsodeuna.github.io/BBDD_1DAM/1_CREACION_TABLAS/SECRETODRGRINBERG/)** | Escape room de 5 salas y 10 pruebas para repasar expresiones regulares y CHECK con REGEXP_LIKE. | Juego de repaso |
| 8 | **[PulsoFit: presentación y controles de aprendizaje](https://alfonsodeuna.github.io/BBDD_1DAM/1_CREACION_TABLAS/EJERCICIO_PULSOFIT_CHECKS/)** | 15 ejercicios y 5 controles de 3 preguntas con seguimiento docente. | Evaluación formativa; requiere configuración |

La secuencia es una **propuesta de uso**, no un requisito técnico. Los laboratorios permiten trabajar de forma independiente si ya se conocen los conceptos previos.

## Unidad ampliada: claves primarias, foráneas y relaciones (`2_CLAVES`)

**[Abrir el laboratorio completo de claves](https://alfonsodeuna.github.io/BBDD_1DAM/2_CLAVES/)** · [Explorar la carpeta en GitHub](https://github.com/AlfonsoDeUna/BBDD_1DAM/tree/main/2_CLAVES) · [Leer instrucciones](../2_CLAVES/readme.md)

Esta unidad tiene un recorrido visual por pantallas, un menú interno para saltar de tema, demostraciones interactivas, prácticas de SQL y una actividad final evaluable. Se complementa con el laboratorio de claves y los ejercicios guiados de `1_CREACION_TABLAS`, **sin sustituirlos**.

### Explicación y modelado

| Pantalla | Tema | Enlace |
| --- | --- | --- |
| 01 | Debate inicial: ¿por qué necesitamos una clave? | [Abrir](https://alfonsodeuna.github.io/BBDD_1DAM/2_CLAVES/inicio-laboratorio.html) |
| 02 | Qué es una clave primaria: unicidad, NULL y claves compuestas | [Abrir](https://alfonsodeuna.github.io/BBDD_1DAM/2_CLAVES/laboratorio-claves-primarias.html) |
| 03 | Cómo elegir una PK natural, artificial, simple o compuesta | [Abrir](https://alfonsodeuna.github.io/BBDD_1DAM/2_CLAVES/elegir-clave-primaria.html) |
| 04 | Sintaxis PRIMARY KEY en columna, tabla y AUTO_INCREMENT; dos ejercicios | [Abrir](https://alfonsodeuna.github.io/BBDD_1DAM/2_CLAVES/sintaxis-clave-primaria.html) |
| 05 | Relaciones 1:N: productos-ventas y clientes-pedidos | [Abrir](https://alfonsodeuna.github.io/BBDD_1DAM/2_CLAVES/relaciones-uno-a-muchos.html) |
| 06 | Claves foráneas e integridad referencial: PK frente a FK | [Abrir](https://alfonsodeuna.github.io/BBDD_1DAM/2_CLAVES/claves-foraneas.html) |
| 07 | Sintaxis FOREIGN KEY, REFERENCES y CONSTRAINT | [Abrir](https://alfonsodeuna.github.io/BBDD_1DAM/2_CLAVES/sintaxis-clave-foranea.html) |
| 08 | Simulador de integridad: RESTRICT, CASCADE y SET NULL; DELETE y UPDATE | [Abrir](https://alfonsodeuna.github.io/BBDD_1DAM/2_CLAVES/integridad-referencial.html) |
| 09 | Todo en SQL: CREATE TABLE, ALTER TABLE y acciones referenciales | [Abrir](https://alfonsodeuna.github.io/BBDD_1DAM/2_CLAVES/sql-claves-integridad.html) |
| 10 | Relaciones 1:N, N:M y 1:1 con su correspondiente SQL | [Abrir](https://alfonsodeuna.github.io/BBDD_1DAM/2_CLAVES/relaciones-entre-tablas.html) |

### Práctica, aplicación y evaluación

| Actividad | Tarea del alumno | Enlace |
| --- | --- | --- |
| 07B · Ejercicios de FOREIGN KEY | 3 ejercicios breves para construir tablas hijas y sus FK. | [Practicar](https://alfonsodeuna.github.io/BBDD_1DAM/2_CLAVES/ejercicios-foreign-key.html) |
| 09B · Ejercicios de SQL | 4 ejercicios de PK, AUTO_INCREMENT, FK, CONSTRAINT y acciones referenciales. | [Practicar](https://alfonsodeuna.github.io/BBDD_1DAM/2_CLAVES/ejercicios-sql-completo.html) |
| 09C · Integridad referencial | 3 situaciones para modificar el comportamiento de relaciones existentes. | [Practicar](https://alfonsodeuna.github.io/BBDD_1DAM/2_CLAVES/ejercicios-integridad-referencial.html) |
| Práctica guiada de relaciones | Biblioteca: estanterías y libros, crear tablas y probar restricciones paso a paso. | [Practicar](https://alfonsodeuna.github.io/BBDD_1DAM/2_CLAVES/practica-guiada-relaciones.html) |
| Práctica de creación de tablas relacionadas | 6 enunciados sobre departamentos, empleados, productos, pedidos y otras relaciones. | [Practicar](https://alfonsodeuna.github.io/BBDD_1DAM/2_CLAVES/practica-relaciones.html) |
| Actividad evaluable final | 7 ejercicios; PK, FK, AUTO_INCREMENT, claves compuestas, 1:N, N:M y 1:1. | [Abrir actividad](https://alfonsodeuna.github.io/BBDD_1DAM/2_CLAVES/actividad-evaluable.html) |

**Para preparar clase:** empieza por el [menú del laboratorio](https://alfonsodeuna.github.io/BBDD_1DAM/2_CLAVES/) para recorrer la unidad, usa las dos prácticas de relaciones como trabajo individual y reserva la actividad final para comprobar la autonomía. Las páginas de ejercicios pueden imprimirse o guardarse en PDF desde el navegador.

## Accesos para el profesor y el alumnado

| Recurso | Enlace | Uso |
| --- | --- | --- |
| PulsoFit: presentación | [Proyectar actividades](https://alfonsodeuna.github.io/BBDD_1DAM/1_CREACION_TABLAS/EJERCICIO_PULSOFIT_CHECKS/) | Desarrollo y corrección de ejercicios, sin mostrar las preguntas del test. |
| PulsoFit: alumnado | [Responder controles](https://alfonsodeuna.github.io/BBDD_1DAM/1_CREACION_TABLAS/EJERCICIO_PULSOFIT_CHECKS/alumnos.html) | Participación de estudiantes en los controles abiertos. |
| PulsoFit: profesor | [Panel de resultados](https://alfonsodeuna.github.io/BBDD_1DAM/1_CREACION_TABLAS/EJERCICIO_PULSOFIT_CHECKS/profesor.html) | Abrir/cerrar controles, consultar resultados, exportar CSV y reiniciar. |
| Doctor Grinberg: profesor | [Tablón del aula](https://alfonsodeuna.github.io/BBDD_1DAM/1_CREACION_TABLAS/SECRETODRGRINBERG/tablon.html) | Mostrar el progreso de una partida. |
| Doctor Grinberg: demostración | [Tablón con datos ficticios](https://alfonsodeuna.github.io/BBDD_1DAM/1_CREACION_TABLAS/SECRETODRGRINBERG/tablon.html?demo=1) | Conocer el aspecto del panel sin utilizar una clase real. |

**Importante — PulsoFit con controles:** según su [guía de instalación](EJERCICIO_PULSOFIT_CHECKS/readme.md), el proyecto Supabase tiene cargados el esquema y las preguntas, pero aún hay que habilitar el acceso anónimo del alumnado y autorizar una cuenta de profesor antes de utilizarlo con alumnos reales. La práctica SQL PulsoFit del paso 6 no depende de ese panel.

## Archivos de apoyo y material técnico

- **[Guion MySQL de claves](guion_mysql_claves.sql):** archivo SQL con ejemplos de PK, FK, PK compuestas, relaciones 1:N, N:M y 1:1, pruebas con transacciones y un reto final. Debe ejecutarse en una base de prácticas, no en producción.
- **[Datasheet PDF: expresiones regulares en MySQL](SECRETODRGRINBERG/datasheet-regexp-mysql.pdf):** hoja de consulta para los retos de REGEXP_LIKE.
- **[Instrucciones de los ejercicios guiados](EJERCICIOS_GUIADOS_PK_FK/readme.md):** navegación de la presentación y dinámica.
- **[Instrucciones de LaLiga](PR%C3%81CTICA_LIGA_FUTBOL/readme.md):** objetivos y pasos de la práctica.
- **[Instrucciones de PulsoFit y Supabase](EJERCICIO_PULSOFIT_CHECKS/readme.md):** configuración, seguridad, gestión de resultados y reinicio.
- **[Carpeta 1_CREACION_TABLAS en GitHub](https://github.com/AlfonsoDeUna/BBDD_1DAM/tree/main/1_CREACION_TABLAS):** HTML, JavaScript, CSS, SQL y archivos auxiliares.
- **[Carpeta 2_CLAVES en GitHub](https://github.com/AlfonsoDeUna/BBDD_1DAM/tree/main/2_CLAVES):** recorrido completo de claves, ejercicios, prácticas de relaciones y evaluación.

### Qué es cada tipo de archivo

Los archivos `.html` son las páginas o presentaciones; `.js` y `.css` son recursos de funcionamiento y estilo; `.sql` contiene código de base de datos; `.pdf` sirve como ficha de consulta; y los `readme.md` explican el uso o la configuración de cada actividad. Para el alumnado, normalmente basta con compartir el enlace web correspondiente.

---

**Índice mantenido en:** [`1_CREACION_TABLAS/laboratorios.md`](https://github.com/AlfonsoDeUna/BBDD_1DAM/blob/main/1_CREACION_TABLAS/laboratorios.md) · [Versión web](https://alfonsodeuna.github.io/BBDD_1DAM/1_CREACION_TABLAS/)
