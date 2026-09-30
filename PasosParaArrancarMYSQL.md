# PASOS PARA ARRANCAR MYSQL SERVER Y MYSQL WORKBENCH DESDE EL ZIP

## Pasos
1. Crea la carpeta MySQL en D:
2. Descomprime los ficheros zip en algún sitio de tu disco duro que tengas controlado D:, cuando termine verifica que tienes la carpeta mysql-26.7.0-winx64 dentro de la que has creado anteriormente (MySQL)
3. Crea el fichero my.ini (sólo la primera vez)
4. La primera vez que arranquemos inicializa la BBDD (sólo la primera vez
5. Arrancar la BBDD

**NOTA:** Los pasos del 1 al 4 solo la primera vez que descargas la BBDD para configurarla, una vez preparado cada vez que quieras trabajar con la BBDD vas al punto 5
   
## 3. Crear el fichero my.ini

**Crea el fichero de configuración `my.ini`**, créalo antes de inicializar la BBDD.

Dentro de la carpeta :
```
D:\MySQL\mysql-26.7.0-winx64\
```
crea el fichero my.ini y añade las siguientes líneas con un editor

```
echo port=3306 
echo character-set-server=utf8mb4

```

## 4. Inicializar la BBDD

**Primera vez** (inicializa `data` y arranca):
Abre el CMD --> teclas: WIN + R y escribe CMD

```
cd D:\MySQL\mysql-26.7.0-winx64\bin
mysqld --initialize-insecure --console
mysqld --console
```

- El primer `mysqld` debe acabar en `MySQL Server Initialization - end`. Con eso ya existe `..\data\ibdata1`.

- No ejecutes el segundo comando antes de que termine el primero. 

## 5. Arrancar la BDD

**Las siguientes veces** solo hace falta el arranque:
Ahora con el siguiente comando arranca el servidor y debe mostrar `ready for connections`. Deja esa ventana abierta.
```
cd D:\MySQL\mysql-26.7.0-winx64\bin
mysqld --console
```

### Si hay problemas en el arranque de la base de datos.
**Si la inicialización falla** y sale `the data directory has files in it`, borra `data` y repite desde el paso de inicializar:

```
rmdir /s /q ..\data
```
## APAGAR LA BASE DE DATOS
**Para parar el servidor**, en otra ventana de `cmd`, en `bin`:

```
mysqladmin -u root shutdown
```

## ENTRAR CON EL CLI A LA BASE DE DATOS
Y para conectarte desde la consola, sin contraseña porque usaste `--initialize-insecure`:

```
mysql -u root --skip-password
```
