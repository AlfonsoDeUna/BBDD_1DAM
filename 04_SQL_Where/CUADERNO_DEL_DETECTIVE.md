# 🔍 El misterio del Gran Hotel Pico Nevado

**Práctica de consultas SQL · `SELECT … FROM … WHERE`**

## El caso

Sábado por la noche. Una gran nevada ha cortado la carretera del Gran Hotel Pico Nevado: nadie puede entrar ni salir. Dentro hay 20 huéspedes y 10 empleados.

Durante la cena de gala, la **Estrella de Medianoche**, el famoso zafiro de la marquesa doña Leonor de Villaescusa, **ha desaparecido** de la caja fuerte de su habitación.

El ladrón sigue en el hotel. La policía no puede llegar hasta que abran la carretera, pero el director te ha dado acceso a la base de datos del hotel. Tú eres el detective.

## Tu material de investigación

Base de datos: `misterio_pico_nevado`

| Tabla | Qué contiene |
|---|---|
| `personas` | Todos los presentes en el hotel: `id`, `nombre`, `apellidos`, `tipo` (huesped / empleado), `profesion`, `edad`, `estatura_cm`, `color_pelo`, `usa_gafas` (1 = sí, 0 = no) |
| `habitaciones` | `numero`, `planta`, `tipo`, `precio_noche`, `id_huesped` (NULL si está libre) |
| `accesos` | Cada puerta abierta con tarjeta: `id`, `id_persona` (titular de la tarjeta), `puerta`, `hora` |
| `cena_gala` | La libreta del maître: `id_persona`, `mesa`, `plato_principal`, `ausencia_desde`, `ausencia_hasta` (NULL si no se levantó de la mesa) |
| `llamadas` | Centralita: `id`, `habitacion_origen`, `destino`, `hora`, `duracion_min` |
| `objetos_encontrados` | `id`, `lugar`, `descripcion`, `hora_hallazgo` |
| `declaraciones` | Lo que ha contado cada persona: `id`, `id_persona`, `texto` |

## Reglas del detective

1. Solo puedes usar `SELECT … FROM … WHERE` (con `AND`, `OR`, `BETWEEN`, `IN`, `LIKE`, `IS NULL`…).
2. Cada consulta trabaja sobre **una sola tabla**. Para pasar de una tabla a otra, apunta los `id` que encuentres y úsalos en la siguiente consulta.
3. Apunta en tu cuaderno **la consulta** y **lo que has descubierto** en cada pista. Un buen detective no se fía de su memoria.
4. Las horas se escriben entre comillas: `'22:30'`.
5. No acuses a nadie sin pruebas: las personas mienten, los datos no.

---

## Las pistas

### Pista 1 · La víctima
Todo empieza por doña Leonor, la marquesa. Búscala en la lista de personas y apunta su `id`.
> ⚠️ Cuidado: no es la única persona con ese apellido en el hotel.

### Pista 2 · La escena
¿En qué habitación se aloja la marquesa? Apunta el número y la planta.

### Pista 3 · La declaración de la marquesa
Lee lo que ha declarado. Necesitas dos datos: **a qué hora guardó el zafiro** y **a qué hora descubrió que no estaba**. Fíjate también en lo que dice sobre la combinación de la caja fuerte… puede servirte al final.

### Pista 4 · La puerta
La habitación solo se abre con tarjeta. ¿Alguien abrió esa puerta **entre** las dos horas que has apuntado? Anota **quién** y **a qué hora exacta**: esa es la hora del robo.

### Pista 5 · ¿Caso resuelto?
Averigua quién es esa persona y lee su declaración. Antes de acusarla, comprueba su coartada: busca al **chef** del hotel y lee lo que dice.
> Apunta bien el lugar y las dos horas que menciona en su declaración.

### Pista 6 · La tarjeta perdida
Alguien se llevó esa tarjeta. ¿Quién entró en ese lugar en esa franja de tiempo? Apunta todos los `id`: son tus primeros sospechosos.

### Pista 7 · La cena
A la hora del robo casi todo el mundo estaba cenando. El maître lo apuntó todo. ¿Quién **no estaba en su mesa** justo a la hora del robo? (Se había levantado antes y volvió después.)

Ahora cruza las dos listas: ¿quiénes estuvieron en el lugar de la pista 6 **y además** estaban fuera de la mesa a la hora del robo?
> ¿Y los empleados? Lee la declaración del director del hotel.

### Pista 8 · Los vecinos
Quizá alguien de la misma planta vio u oyó algo. Busca las habitaciones **ocupadas** de la planta de la marquesa (sin contar la suya) y lee las declaraciones de esos huéspedes.

Una de ellas describe a la persona que entró. Usa esa descripción para reducir tu lista de sospechosos.

### Pista 9 · El registro
La policía del hotel (o sea, el botones con una linterna) ha encontrado varios objetos. Busca los que aparecieron en un lugar relacionado con la habitación del robo.

Uno de ellos lleva unas iniciales. ¿Qué personas del hotel tienen un nombre y un apellido que **empiezan** por esas letras? ¿Alguna está en tu lista?

### Pista 10 · Pillando la mentira
Ya tienes un nombre. Lee su declaración y compárala con lo que apuntó el maître. ¿Dice la verdad?

Averigua su habitación y comprueba si se hizo alguna llamada desde ella **después** de la hora del robo. ¿A quién llamó? ¿Por qué crees que lo hizo?

### Pista 11 · Sus pasos
Reconstruye qué puertas abrió tu sospechoso con su propia tarjeta **después** del robo. ¿Adónde fue cuando terminó la cena?

### Pista 12 · La acusación
Si lo tienes claro, ha llegado el momento. Ejecuta:

```sql
CALL acusar(id_del_culpable);
```

Si aciertas, el caso queda resuelto. Si no… repasa tus notas.

---

## Informe final del detective

Cuando resuelvas el caso, responde en tu cuaderno:

1. ¿Quién es el culpable y qué **cuatro pruebas** lo señalan?
2. ¿Cómo consiguió entrar en la habitación?
3. ¿Cómo pudo abrir la caja fuerte sin forzarla? (Relee la pista 3 y piensa en su profesión.)
4. ¿Qué otros personajes parecían sospechosos y qué dato los descarta?
