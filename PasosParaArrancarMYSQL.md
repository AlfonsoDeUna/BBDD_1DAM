# PASOS PARA ARRANCAR MYSQL SERVER Y MYSQL WORKBENCH DESDE EL ZIP

Guía para poner en marcha **MySQL Server 26.7.0** y **MySQL Workbench 26.7** en Windows, sin instalador, a partir de los ficheros ZIP.

> **¿Por qué 26.7?** Desde julio de 2026 MySQL numera sus versiones por calendario (año.mes): 26.7 = julio de 2026. Es la versión siguiente a la 9.7.

## El camino completo

| | Paso | Cuándo |
|---|---|---|
| 0 | Descargar los ZIP | Solo la primera vez |
| 1 | Crear la carpeta `D:\MySQL` | Solo la primera vez |
| 2 | Descomprimir los dos ZIP | Solo la primera vez |
| 3 | Crear el fichero `my.ini` | Solo la primera vez |
| 4 | Inicializar la BBDD | Solo la primera vez |
| 5 | Arrancar el servidor | **Cada sesión** |
| 6 | Comprobar desde la consola | **Cada sesión** (opcional) |
| 7 | Conectar con MySQL Workbench | **Cada sesión** (la conexión se crea solo la 1ª vez) |
| 8 | Apagar el servidor | **Cada sesión** |

**NOTA:** Los pasos del 0 al 4 se hacen solo la primera vez, para configurar la BBDD. Una vez preparada, cada vez que quieras trabajar vas directamente al **paso 5**.

---

## 0. Descargar los ZIP

| Programa | Web | Elige | Fichero |
|---|---|---|---|
| MySQL Community Server | https://dev.mysql.com/downloads/mysql/ | Microsoft Windows → ZIP Archive | `mysql-26.7.0-winx64.zip` |
| MySQL Workbench | https://dev.mysql.com/downloads/workbench/ | Microsoft Windows → ZIP Archive | `mysql-workbench-26.7.0-winx64.zip` |

- Descarga el **ZIP Archive**, no el instalador MSI.
- Si la web te pide iniciar sesión, pulsa **"No thanks, just start my download"**.

## 1. Crear la carpeta

Crea la carpeta `MySQL` en `D:`

```
D:\MySQL
```

## 2. Descomprimir los ZIP

Clic derecho sobre cada ZIP → **Extraer todo…** → destino `D:\MySQL`.

Cuando termine, comprueba que la estructura queda **exactamente** así:

```
D:\MySQL\
├── mysql-26.7.0-winx64\
│   ├── bin\          (mysqld.exe, mysql.exe, mysqladmin.exe…)
│   ├── lib\
│   ├── share\
│   └── my.ini        ← lo creas en el paso 3
└── mysql-workbench-26.7.0-winx64\
```

>  **Carpeta duplicada:** si te queda `mysql-26.7.0-winx64\mysql-26.7.0-winx64\`, mueve la carpeta interior un nivel arriba.

## 3. Crear el fichero my.ini

**Crea el fichero de configuración `my.ini` antes de inicializar la BBDD.**

Dentro de la carpeta:

```
D:\MySQL\mysql-26.7.0-winx64\
```

crea el fichero `my.ini` con el Bloc de notas y escribe exactamente estas líneas:

```ini
[mysqld]
basedir=D:/MySQL/mysql-26.7.0-winx64
datadir=D:/MySQL/mysql-26.7.0-winx64/data
port=3306
character-set-server=utf8mb4
```

¡Ojo! Cómo guardarlo bien:

- **Guardar como** → Tipo: **Todos los archivos (\*.\*)** → Nombre: `my.ini`
- Se guarda junto a la carpeta `bin`, **no dentro** de ella.
- Activa **Vista → Extensiones de nombre de archivo** en el Explorador y comprueba que no se ha guardado como `my.ini.txt`.


## 4. Inicializar la BBDD

**Primera vez** (crea la carpeta `data` y arranca):

Abre el CMD → teclas **WIN + R** y escribe `cmd`

```
cd /d D:\MySQL\mysql-26.7.0-winx64\bin
mysqld --initialize-insecure --console
```

- El `/d` de `cd /d` sirve para cambiar también de unidad (la consola suele abrirse en `C:`).
- El comando debe acabar en `MySQL Server Initialization - end` y devolver el prompt. Con eso ya existe `..\data\ibdata1`.
- **No ejecutes el siguiente comando antes de que termine este.**
- `--initialize-insecure` crea el usuario `root` **sin contraseña**: vale para clase, nunca en producción.

Cuando termine, arranca el servidor por primera vez en la misma ventana:

```
mysqld --console
```

## 5. Arrancar el servidor

**Las siguientes veces** solo hace falta el arranque:

```
cd /d D:\MySQL\mysql-26.7.0-winx64\bin
mysqld --console
```

Debe mostrar:

```
[System] ... mysqld: ready for connections. ... port: 3306  MySQL Community Server - GPL.
```

- **Esta ventana ES el servidor.** Parece "colgada", pero es normal: déjala abierta y minimizada mientras trabajas.
- Si salta el **Firewall de Windows**, pulsa **Permitir acceso** (redes privadas).

## 6. Comprobar desde la consola (cliente CLI)

Abre una **segunda** ventana de `cmd` (la del servidor sigue abierta) y conéctate como `root`, sin contraseña porque usaste `--initialize-insecure`:

```
cd /d D:\MySQL\mysql-26.7.0-winx64\bin
mysql -u root --skip-password
```

Dentro de `mysql>` prueba:

```sql
SELECT VERSION();
SHOW DATABASES;
exit
```

Debe salir la versión `26.7.0` y las bases de datos del sistema: `information_schema`, `mysql`, `performance_schema` y `sys`.

## 7. Conectar con MySQL Workbench 26.7

> Arranca antes el servidor (paso 5): Workbench solo es un cliente.

### 7.1 Abrir Workbench

1. Entra en `D:\MySQL\mysql-workbench-26.7.0-winx64`
2. Doble clic en el ejecutable de MySQL Workbench.
3. Opcional: clic derecho → **Enviar a → Escritorio (crear acceso directo)**.

> Workbench 26.7 es la **nueva generación** de Workbench (reescrito sobre MySQL Shell, sustituye a Workbench 8.0). Si buscas tutoriales, comprueba que sean de la versión 26: la interfaz ha cambiado.

### 7.2 Crear la conexión (solo la primera vez)

| Campo | Valor |
|---|---|
| Nombre | `Local MySQL 26.7` |
| Host | `127.0.0.1` |
| Puerto | `3306` |
| Usuario | `root` |
| Contraseña | *(vacía)* |

### 7.3 Probar

1. Guarda la conexión y ábrela con doble clic.
2. Botón **+** del editor → **SQL Script** (o **Notebook**).
3. Escribe y ejecuta:

```sql
SELECT VERSION();
```

Si devuelve `26.7.0`, todo funciona.

## 8. Apagar el servidor

**Para parar el servidor**, en otra ventana de `cmd`, en `bin`:

```
cd /d D:\MySQL\mysql-26.7.0-winx64\bin
mysqladmin -u root shutdown
```

En la ventana del servidor verás `Shutdown complete` y volverá el prompt.

>  **No cierres la ventana del servidor con la X:** lo corta de golpe. Apagar con `mysqladmin` deja los datos bien guardados.

---

## La rutina de cada clase

1. **Arrancar:** `cmd` → `cd /d D:\MySQL\mysql-26.7.0-winx64\bin` → `mysqld --console`
2. **Conectar:** abrir Workbench → conexión `Local MySQL 26.7`
3. **Trabajar:** scripts SQL, notebooks, consultas
4. **Apagar:** `mysqladmin -u root shutdown`

## Problemas frecuentes

| Error | Causa y solución |
|---|---|
| `the data directory has files in it` | La BBDD ya estaba inicializada o la inicialización falló a medias. Desde `bin`, borra `data` y repite el paso 4: `rmdir /s /q ..\data` — ⚠️ **borra todas tus bases de datos**. |
| `Found option without preceding group` | Falta `[mysqld]` al principio del `my.ini` (o sobra `echo`). |
| `"mysqld" no se reconoce como un comando…` | No estás en la carpeta `bin`. Usa `cd /d` con la ruta completa. |
| Falta `VCRUNTIME140_1.dll` o `MSVCP140.dll` | Instala **Microsoft Visual C++ Redistributable (x64)** y vuelve a probar. |
| El puerto 3306 ya está en uso | Hay otro MySQL arrancado (XAMPP…). Ciérralo, o pon `port=3307` en `my.ini` y en la conexión de Workbench. |
| Workbench no conecta (error 10061) | El servidor no está arrancado: revisa que la ventana diga `ready for connections`. |

## Checklist: ¿lo tienes?

- [ ] Existe la carpeta `data` dentro de `mysql-26.7.0-winx64`
- [ ] La consola del servidor muestra `ready for connections`
- [ ] `SELECT VERSION();` devuelve `26.7.0` desde la consola
- [ ] La conexión `Local MySQL 26.7` está guardada en Workbench
- [ ] Sabes apagar el servidor con `mysqladmin`


```
mysql -u root --skip-password
```
