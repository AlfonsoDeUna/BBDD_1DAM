# PASOS PARA ARRANCAR MYSQL SERVER Y MYSQL WORKBENCH DESDE EL ZIP

**Primera vez** (inicializa `data` y arranca):

```
cd C:\MySQL\mysql-26.7.0-winx64\bin
mysqld --initialize-insecure --console
mysqld --console
```

- El primer `mysqld` debe acabar en `MySQL Server Initialization - end`. Con eso ya existe `..\data\ibdata1`.
- El segundo arranca el servidor y debe mostrar `ready for connections`. Deja esa ventana abierta.
- No ejecutes el segundo antes de que termine el primero. Es lo que te dio el error de `ibdata1` al principio.

**Las siguientes veces** solo hace falta el arranque:

```
cd C:\MySQL\mysql-26.7.0-winx64\bin
mysqld --console
```

**Si quieres el `my.ini`** (puerto y `utf8mb4`), créalo antes de inicializar y pásalo como primer argumento en los dos comandos:

```
echo [mysqld] > ..\my.ini
echo port=3306 >> ..\my.ini
echo character-set-server=utf8mb4 >> ..\my.ini
mysqld --defaults-file=..\my.ini --initialize-insecure --console
mysqld --defaults-file=..\my.ini --console
```

Sin `my.ini` funciona igual, con el puerto 3306 por defecto.

**Si la inicialización falla** y sale `the data directory has files in it`, borra `data` y repite desde el paso de inicializar:

```
rmdir /s /q ..\data
```

**Para parar el servidor**, en otra ventana de `cmd`, en `bin`:

```
mysqladmin -u root shutdown
```

Y para conectarte desde la consola, sin contraseña porque usaste `--initialize-insecure`:

```
mysql -u root --skip-password
```
