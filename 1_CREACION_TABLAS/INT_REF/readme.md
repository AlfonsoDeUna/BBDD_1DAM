# Integridad referencial: ejercicios guiados

Presentación HTML de **67 diapositivas** para Bases de Datos de **1.º DAM**.

## Abrir la presentación

[**Abrir la presentación en el navegador**](https://alfonsodeuna.github.io/BBDD_1DAM/1_CREACION_TABLAS/INT_REF/)

La presentación muestra una diapositiva cada vez. El análisis, los diagramas y las soluciones aparecen al avanzar.

## Contenido

| Bloque | Diapositivas | Forma de trabajo |
|---|---:|---|
| Inicio | 1–3 | Objetivo y condiciones comunes. |
| Proyectos y tareas | 4–23 | Modelado y práctica conjunta. |
| Tutores y alumnos | 24–47 | Práctica con ayuda y cambio de nulabilidad. |
| Clientes y facturas | 48–64 | Resolución autónoma antes de la corrección. |
| Cierre y entrega | 65–67 | Comparación y requisitos del archivo SQL. |

Cada ejercicio empieza por su enunciado original íntegro, sin subrayados ni pistas. Después se revelan el análisis con colores, las tablas y sus relaciones, el SQL por etapas y la solución completa. Incluye preguntas de comprobación.

## Navegación

- **Flechas izquierda y derecha**, o botones **Anterior** y **Siguiente**.
- **Inicio** y **Fin** para ir a la primera o a la última diapositiva.
- **Índice** para acceder al comienzo de cada ejercicio.
- **Pantalla completa** para proyectar.
- **Imprimir** para imprimir todas las diapositivas.

La dirección conserva el número de diapositiva, por ejemplo `#diapositiva-24`.

## Uso sin conexión

Abre **Índice → Descargar HTML**. Guarda el archivo `integridad-referencial.html` y ábrelo con un navegador. Incluye estilos, diagramas y navegación dentro del propio archivo y no necesita conexión ni bibliotecas externas. El navegador debe permitir JavaScript.

[Ver el archivo HTML del repositorio](index.html)

## Práctica de origen

[Ejercicios originales de integridad referencial](../../2_CLAVES/ejercicios-integridad-referencial.html)

Se mantienen las condiciones originales: MySQL, creación inicial y modificación de las relaciones, conservación de las tablas y entrega de un único archivo SQL. Las soluciones utilizan seis `CREATE TABLE` y siete `ALTER TABLE`, sin operaciones sobre datos.

Referencias técnicas: [claves foráneas en MySQL](https://dev.mysql.com/doc/refman/8.4/en/create-table-foreign-keys.html) y [ALTER TABLE](https://dev.mysql.com/doc/refman/8.4/en/alter-table.html).
