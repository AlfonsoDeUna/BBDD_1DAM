# PulsoFit · Evaluación formativa en clase

Material de **Bases de Datos de 1.º DAM** con 15 ejercicios y cinco controles de aprendizaje de tres preguntas cada uno.

## Tres páginas separadas

| Destinatario | Página | Función |
| --- | --- | --- |
| Profesor (proyector) | [Presentación de clase](https://alfonsodeuna.github.io/BBDD_1DAM/1_CREACION_TABLAS/EJERCICIO_PULSOFIT_CHECKS/) | Explicación y resolución de ejercicios; indica cuándo realizar cada control, sin mostrar las preguntas tipo test ni sus respuestas |
| Alumnado | [Responder preguntas](https://alfonsodeuna.github.io/BBDD_1DAM/1_CREACION_TABLAS/EJERCICIO_PULSOFIT_CHECKS/alumnos.html) | Identificación mediante nombre y grupo; cinco controles de tres preguntas, con cuatro opciones y un intento por pregunta |
| Profesor (privado) | [Dashboard de resultados](https://alfonsodeuna.github.io/BBDD_1DAM/1_CREACION_TABLAS/EJERCICIO_PULSOFIT_CHECKS/profesor.html) | Acceso autenticado, abrir/cerrar controles, ver aciertos, errores, participantes y exportar CSV |

El enlace al dashboard es público, **pero los resultados no lo son**: necesitan una sesión autorizada del profesor y políticas RLS en Supabase.

## Estado de la conexión

**SUPABASE CONECTADO Y ESQUEMA INSTALADO.** Las 15 preguntas, sus 15 respuestas correctas privadas y los cinco controles están creados en el proyecto `icemxcczzopnpsgsuhnq`. La web ya utiliza la clave publicable. **PENDIENTE:** habilitar los inicios de sesión anónimos en Supabase Auth y crear/autorizar una cuenta de profesor. Hasta entonces no está listo para utilizarlo con alumnos reales.

Se reutiliza un único proyecto Supabase y el mismo esquema se puede ampliar con otras actividades. Las respuestas de cada actividad permanecen separadas por identificador.

### Pasos de activación (solo profesor/administrador)

1. **Completado:** esquema y preguntas cargados, incluida la corrección en el esquema privado `pf_private`. El SQL con soluciones no debe subirse a GitHub. La versión sin soluciones está en [supabase_schema_public.sql](supabase_schema_public.sql).
2. **Pendiente:** en [Supabase Auth → Providers](https://supabase.com/dashboard/project/icemxcczzopnpsgsuhnq/auth/providers), activar **Anonymous Sign-ins** para que el alumnado entre sin correo. Valorar CAPTCHA y los límites de registro para evitar altas abusivas.
3. Crear o identificar un **usuario profesor** en Authentication → Users, y anotar su *User UID*. En SQL Editor, ejecutar `insert into pf_private.teachers(user_id) values ('AQUI_EL_UUID_REAL') on conflict do nothing;`.
4. **Completado:** [config.js](config.js) contiene la clave publicable `sb_publishable_...` de este proyecto. **No utilizar nunca `service_role`, clave secreta, contraseña de la base de datos ni tokens de administración.**
5. Entrar al [dashboard](profesor.html) con correo y contraseña del **usuario de Supabase Auth** que se ha autorizado; abrir el control 1 y pedir al alumnado que entre a [su página](alumnos.html).
6. Comprobar una respuesta de prueba y que el resultado llega al dashboard antes de utilizarlo con una clase real.

### Funcionamiento durante la clase

- La presentación se proyecta. Tras los ejercicios **3, 6, 9, 12 y 15** se muestra una diapositiva de pausa y el enlace de estudiantes.
- El alumnado nunca necesita la URL de la presentación. Entra solo a `alumnos.html`, escribe su nombre/grupo y responde el control abierto.
- Cada pregunta tiene **cuatro opciones y un único intento**. La corrección se realiza en la base de datos; el navegador del alumno no recibe las respuestas correctas hasta que el profesor habilita su publicación.
- El profesor ve una matriz de alumnos por pregunta, porcentaje de aciertos, distribución A/B/C/D y quién sigue sin responder. La pantalla se actualiza automáticamente cada **6 segundos**.
- El profesor puede cerrar cada control y decidir si muestra la solución. El CSV incluye respuestas individuales.

### Privacidad y limitaciones

Los nombres introducidos por alumnos no constituyen una identificación verificada. Las sesiones anónimas se conservan en ese navegador; si un estudiante borra sus datos o cambia de dispositivo puede aparecer como otra sesión. En un entorno educativo, hay que establecer previamente la base jurídica y los criterios de conservación y eliminación de los datos de alumnado.

La seguridad se basa en autenticación y RLS, no en ocultar la dirección del dashboard. No incluir secretos en el repositorio. Las claves correctas están en el esquema **no expuesto** `pf_private`, no en el código público. El HTML del proyector mantiene las soluciones **SQL del ejercicio original** porque son parte de la enseñanza, pero no revela las opciones de respuesta de los controles.
