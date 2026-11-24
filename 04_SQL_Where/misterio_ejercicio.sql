-- ============================================================
--  EL MISTERIO DEL GRAN HOTEL PICO NEVADO
--  Base de datos para practicar SELECT ... FROM ... WHERE
--  MySQL 8  ·  Bases de Datos  ·  1º DAM
--
--  Uso:  ejecuta este script completo (crea la base de datos
--        misterio_pico_nevado desde cero cada vez).
-- ============================================================

DROP DATABASE IF EXISTS misterio_pico_nevado;
CREATE DATABASE misterio_pico_nevado CHARACTER SET utf8mb4;
USE misterio_pico_nevado;

-- ------------------------------------------------------------
-- PERSONAS: todos los que estaban en el hotel la noche del sábado
-- ------------------------------------------------------------
CREATE TABLE personas (
    id           INT PRIMARY KEY,
    nombre       VARCHAR(30) NOT NULL,
    apellidos    VARCHAR(40) NOT NULL,
    tipo         VARCHAR(10) NOT NULL,      -- 'huesped' o 'empleado'
    profesion    VARCHAR(40) NOT NULL,
    edad         INT NOT NULL,
    estatura_cm  INT NOT NULL,
    color_pelo   VARCHAR(15) NOT NULL,
    usa_gafas    TINYINT NOT NULL           -- 1 = sí, 0 = no
);

INSERT INTO personas VALUES
( 1, 'Leonor',    'de Villaescusa', 'huesped',  'Marquesa viuda',          71, 156, 'blanco',    1),
( 2, 'Álvaro',    'de Villaescusa', 'huesped',  'Rentista',                34, 183, 'castaño',   0),
( 3, 'Hortensia', 'Quiroga',        'huesped',  'Novelista de misterio',   68, 160, 'gris',      1),
( 4, 'Tobías',    'Benavente',      'huesped',  'Tasador de seguros',      47, 186, 'moreno',    1),
( 5, 'Teresa',    'Bermúdez',       'huesped',  'Pianista',                39, 170, 'pelirrojo', 0),
( 6, 'Fermín',    'Ansúrez',        'huesped',  'Coronel retirado',        66, 181, 'canoso',    1),
( 7, 'Mauro',     'Estévez',        'huesped',  'Ilusionista',             41, 184, 'negro',     0),
( 8, 'Irene',     'Solís',          'huesped',  'Médica',                  52, 168, 'rubio',     1),
( 9, 'Bruno',     'Carvajal',       'huesped',  'Anticuario',              58, 175, 'canoso',    1),
(10, 'Olimpia',   'Rey',            'huesped',  'Cantante de ópera',       45, 172, 'negro',     0),
(11, 'Gaspar',    'Lodeiro',        'huesped',  'Banquero',                60, 182, 'calvo',     1),
(12, 'Noelia',    'Pastrana',       'huesped',  'Periodista',              29, 165, 'castaño',   0),
(13, 'Íker',      'Zabaleta',       'huesped',  'Alpinista',               33, 190, 'rubio',     0),
(14, 'Casilda',   'Montero',        'huesped',  'Joyera',                  50, 162, 'moreno',    1),
(15, 'Ramiro',    'Fuentes',        'huesped',  'Fotógrafo',               36, 181, 'castaño',   1),
(16, 'Elvira',    'Sandoval',       'huesped',  'Profesora jubilada',      70, 158, 'blanco',    1),
(17, 'Anselmo',   'Rivas',          'huesped',  'Notario',                 63, 178, 'gris',      1),
(18, 'Paloma',    'Ibáñez',         'huesped',  'Arquitecta',              38, 176, 'rubio',     0),
(19, 'Leandro',   'Mújica',         'huesped',  'Cerrajero',               44, 179, 'moreno',    0),
(20, 'Victoria',  'Lamas',          'huesped',  'Diplomática',             55, 181, 'canoso',    1),
(21, 'Arturo',    'Peñalver',       'empleado', 'Director del hotel',      57, 174, 'gris',      1),
(22, 'Benigno',   'Otero',          'empleado', 'Chef',                    49, 177, 'moreno',    0),
(23, 'Íñigo',     'Larrea',         'empleado', 'Recepcionista',           27, 180, 'castaño',   0),
(24, 'Remedios',  'Gallardo',       'empleado', 'Gobernanta',              54, 163, 'castaño',   1),
(25, 'Tomás',     'Berenguer',      'empleado', 'Sumiller',                42, 185, 'negro',     1),
(26, 'Lucía',     'Varela',         'empleado', 'Masajista del spa',       31, 164, 'moreno',    0),
(27, 'Samuel',    'Cortés',         'empleado', 'Botones',                 22, 172, 'rubio',     0),
(28, 'Marina',    'Feijóo',         'empleado', 'Camarera',                26, 167, 'negro',     0),
(29, 'Dionisio',  'Prada',          'empleado', 'Maître',                  59, 176, 'canoso',    1),
(30, 'Carlota',   'Méndez',         'empleado', 'Socorrista del spa',      24, 171, 'rubio',     0);

-- ------------------------------------------------------------
-- HABITACIONES: id_huesped es NULL si la habitación está libre
-- ------------------------------------------------------------
CREATE TABLE habitaciones (
    numero        INT PRIMARY KEY,
    planta        INT NOT NULL,
    tipo          VARCHAR(15) NOT NULL,     -- 'individual', 'doble', 'suite'
    precio_noche  INT NOT NULL,
    id_huesped    INT NULL,
    FOREIGN KEY (id_huesped) REFERENCES personas(id)
);

INSERT INTO habitaciones VALUES
(101, 1, 'individual',  95, NULL),
(102, 1, 'individual',  95, NULL),
(103, 1, 'doble',      130, NULL),
(104, 1, 'doble',      130, NULL),
(201, 2, 'doble',      150,  6),
(202, 2, 'individual', 110,  7),
(203, 2, 'individual', 110,  8),
(204, 2, 'doble',      150,  9),
(205, 2, 'doble',      150, 10),
(206, 2, 'individual', 110, 12),
(207, 2, 'individual', 110, 13),
(208, 2, 'doble',      150, 14),
(209, 2, 'individual', 110, 15),
(210, 2, 'doble',      150,  5),
(211, 2, 'individual', 110, 16),
(212, 2, 'doble',      150, 17),
(213, 2, 'individual', 110, 18),
(214, 2, 'individual', 110,  4),
(215, 2, 'individual', 110, 19),
(216, 2, 'doble',      150, 20),
(301, 3, 'suite',      420,  1),
(302, 3, 'suite',      380,  3),
(303, 3, 'doble',      190,  2),
(304, 3, 'suite',      380, 11),
(305, 3, 'doble',      190, NULL),
(306, 3, 'doble',      190, NULL);

-- ------------------------------------------------------------
-- ACCESOS: cada vez que alguien abre una puerta con su tarjeta
-- (el sistema guarda de quién es la tarjeta). Todo es del sábado.
-- ------------------------------------------------------------
CREATE TABLE accesos (
    id          INT PRIMARY KEY,
    id_persona  INT NOT NULL,               -- titular de la tarjeta usada
    puerta      VARCHAR(40) NOT NULL,
    hora        TIME NOT NULL,
    FOREIGN KEY (id_persona) REFERENCES personas(id)
);

INSERT INTO accesos VALUES
( 1, 24, 'Habitación 301',        '10:15:00'),
( 2, 24, 'Habitación 302',        '10:40:00'),
( 3, 27, 'Consigna de equipajes', '11:05:00'),
( 4, 24, 'Lavandería',            '12:00:00'),
( 5, 13, 'Gimnasio',              '12:20:00'),
( 6, 22, 'Bodega',                '13:10:00'),
( 7,  1, 'Habitación 301',        '15:30:00'),
( 8, 21, 'Despacho de dirección', '16:00:00'),
( 9,  8, 'Spa',                   '16:30:00'),
(10,  4, 'Habitación 214',        '16:40:00'),
(11, 10, 'Spa',                   '17:10:00'),
(12, 24, 'Spa',                   '17:38:00'),
(13, 26, 'Spa',                   '17:41:00'),
(14,  5, 'Spa',                   '17:45:00'),
(15,  4, 'Spa',                   '17:52:00'),
(16, 13, 'Spa',                   '17:58:00'),
(17, 19, 'Spa',                   '18:01:00'),
(18,  6, 'Spa',                   '18:05:00'),
(19, 15, 'Spa',                   '18:10:00'),
(20,  2, 'Spa',                   '18:15:00'),
(21,  4, 'Habitación 214',        '18:35:00'),
(22, 18, 'Spa',                   '18:45:00'),
(23, 12, 'Spa',                   '19:00:00'),
(24,  3, 'Habitación 302',        '19:50:00'),
(25,  1, 'Habitación 301',        '20:10:00'),
(26, 25, 'Bodega',                '20:30:00'),
(27, 19, 'Habitación 215',        '21:22:00'),
(28, 11, 'Habitación 304',        '21:51:00'),
(29, 20, 'Habitación 216',        '22:06:00'),
(30, 15, 'Habitación 209',        '22:06:00'),
(31, 24, 'Habitación 301',        '22:07:00'),
(32,  4, 'Habitación 214',        '22:12:00'),
(33,  6, 'Habitación 201',        '22:32:00'),
(34, 27, 'Consigna de equipajes', '23:10:00'),
(35,  1, 'Habitación 301',        '23:15:00'),
(36,  4, 'Consigna de equipajes', '23:24:00'),
(37,  4, 'Habitación 214',        '23:31:00'),
(38, 13, 'Consigna de equipajes', '23:40:00'),
(39,  2, 'Habitación 303',        '23:45:00'),
(40, 11, 'Habitación 304',        '23:50:00');

-- ------------------------------------------------------------
-- CENA_GALA: la libreta del maître (21:00 a 23:00).
-- Si alguien se levantó de la mesa, anotó desde y hasta cuándo.
-- NULL = no se levantó en toda la cena.
-- ------------------------------------------------------------
CREATE TABLE cena_gala (
    id_persona       INT PRIMARY KEY,
    mesa             INT NOT NULL,
    plato_principal  VARCHAR(30) NOT NULL,
    ausencia_desde   TIME NULL,
    ausencia_hasta   TIME NULL,
    FOREIGN KEY (id_persona) REFERENCES personas(id)
);

INSERT INTO cena_gala VALUES
( 1, 1, 'Merluza en salsa verde', NULL,       NULL),
( 2, 1, 'Solomillo',              '22:00:00', '22:15:00'),
( 4, 1, 'Solomillo',              '21:58:00', '22:21:00'),
( 5, 2, 'Risotto de setas',       NULL,       NULL),
( 6, 2, 'Solomillo',              '22:30:00', '22:45:00'),
( 7, 2, 'Merluza en salsa verde', NULL,       NULL),
( 8, 2, 'Risotto de setas',       NULL,       NULL),
( 9, 3, 'Solomillo',              NULL,       NULL),
(10, 3, 'Risotto de setas',       NULL,       NULL),
(11, 3, 'Merluza en salsa verde', '21:50:00', '22:30:00'),
(12, 3, 'Risotto de setas',       NULL,       NULL),
(13, 4, 'Solomillo',              NULL,       NULL),
(14, 4, 'Merluza en salsa verde', NULL,       NULL),
(15, 4, 'Solomillo',              '22:03:00', '22:12:00'),
(16, 4, 'Merluza en salsa verde', NULL,       NULL),
(17, 5, 'Solomillo',              NULL,       NULL),
(18, 5, 'Risotto de setas',       NULL,       NULL),
(19, 5, 'Merluza en salsa verde', '21:20:00', '21:40:00'),
(20, 5, 'Risotto de setas',       '22:05:00', '22:10:00');

-- ------------------------------------------------------------
-- LLAMADAS: registro de la centralita telefónica del hotel
-- ------------------------------------------------------------
CREATE TABLE llamadas (
    id                 INT PRIMARY KEY,
    habitacion_origen  INT NOT NULL,
    destino            VARCHAR(60) NOT NULL,
    hora               TIME NOT NULL,
    duracion_min       INT NOT NULL,
    FOREIGN KEY (habitacion_origen) REFERENCES habitaciones(numero)
);

INSERT INTO llamadas VALUES
(1, 214, 'Seguros La Previsora (Madrid)',        '16:05:00', 12),
(2, 301, 'Recepción',                            '19:45:00',  2),
(3, 215, 'Domicilio particular (Valencia)',      '21:25:00', 10),
(4, 304, 'Banco Helvético (Zúrich)',             '21:52:00', 35),
(5, 216, 'Embajada (Lisboa)',                    '22:06:00',  3),
(6, 214, 'Casa de subastas Lindqvist (Ginebra)', '22:14:00',  5),
(7, 302, 'Recepción',                            '22:20:00',  1),
(8, 301, 'Recepción',                            '23:17:00',  4),
(9, 206, 'Redacción de El Faro (Bilbao)',        '23:30:00', 15);

-- ------------------------------------------------------------
-- OBJETOS_ENCONTRADOS durante el registro del hotel
-- ------------------------------------------------------------
CREATE TABLE objetos_encontrados (
    id             INT PRIMARY KEY,
    lugar          VARCHAR(60) NOT NULL,
    descripcion    VARCHAR(200) NOT NULL,
    hora_hallazgo  TIME NOT NULL
);

INSERT INTO objetos_encontrados VALUES
(1, 'Habitación 301',                 'Caja fuerte abierta y sin forzar. Dentro, un estuche de terciopelo vacío.', '23:20:00'),
(2, 'Pasillo frente a la habitación 301', 'Un gemelo de plata caído junto al rodapié, con las iniciales «T. B.» grabadas.', '23:40:00'),
(3, 'Terraza',                        'Un puro a medio fumar en el cenicero, todavía templado.',                   '23:45:00'),
(4, 'Comedor',                        'La tapa del objetivo de una cámara de fotos, debajo de la mesa 4.',         '23:50:00'),
(5, 'Spa',                            'Un carrito de toallas limpias sin recoger junto al mostrador.',             '23:55:00'),
(6, 'Biblioteca',                     'Una baraja de cartas en la que faltan los cuatro ases.',                    '00:05:00'),
(7, 'Ascensor',                       'Un guante de lana desparejado, de talla pequeña.',                          '00:10:00'),
(8, 'Gimnasio',                       'Un mosquetón de escalada olvidado en un banco.',                            '00:15:00');

-- ------------------------------------------------------------
-- DECLARACIONES tomadas a todos los presentes
-- ------------------------------------------------------------
CREATE TABLE declaraciones (
    id          INT PRIMARY KEY,
    id_persona  INT NOT NULL,
    texto       VARCHAR(600) NOT NULL,
    FOREIGN KEY (id_persona) REFERENCES personas(id)
);

INSERT INTO declaraciones VALUES
( 1,  1, 'Guardé la Estrella de Medianoche en la caja fuerte de mi suite a las 20:50, justo antes de bajar a cenar. No me levanté de la mesa en toda la cena. Cuando volví a mi habitación, a las 23:15, la caja estaba abierta y el zafiro había desaparecido. La combinación la elegí yo misma; solo consta en el expediente de mi póliza de seguros.'),
( 2,  2, 'Sí, me levanté de la mesa sobre las diez: salí a la terraza a fumarme un puro. Y sí, mi tía y yo hemos discutido por dinero, lo sabe todo el hotel. Pero yo no he subido a su habitación.'),
( 3,  3, 'No bajé a la cena: pedí que me la subieran y me quedé escribiendo. Poco después de las diez oí abrirse una puerta en el pasillo y me asomé a la mirilla. Vi de espaldas a una persona entrando en la suite de la marquesa: alta, de un metro ochenta por lo menos, y con gafas. Desde luego no era Leonor, que es bajita. Pensé que sería del servicio y seguí a lo mío.'),
( 4,  4, 'He venido a tasar el zafiro para la aseguradora; tenía la cita con la marquesa el lunes. Durante la cena no me moví de mi silla ni un minuto, pueden preguntar a quien quieran.'),
( 5,  5, 'Estuve en el spa por la tarde y luego en la cena, en la mesa 2. No me levanté hasta los postres. Mañana tenía que dar un recital, pero con esta nevada no sé si habrá público.'),
( 6,  6, 'Cené en la mesa 2. Subí a mi habitación un rato sobre las diez y media a por mis pastillas para la digestión. En mis tiempos estas cosas se resolvían antes del desayuno.'),
( 7,  7, 'Hacer desaparecer cosas es mi oficio, pero yo siempre las devuelvo al final del número. Estuve en la cena de principio a fin, haciendo trucos de cartas a los de mi mesa.'),
( 8,  8, 'Fui al spa a primera hora de la tarde y después descansé en mi habitación. En la cena no me levanté de la mesa.'),
( 9,  9, 'Reconozco que ese zafiro me interesaría para mi tienda, pero comprado con factura. No me moví del comedor en toda la noche.'),
(10, 10, 'Canté dos arias entre el primer plato y el segundo. Todo el comedor me estuvo mirando, así que tengo sesenta testigos.'),
(11, 11, 'Salí del comedor casi a las diez menos diez y subí a mi habitación a atender una llamada con mi banco. Estuve más de media hora al teléfono; compruébenlo en la centralita. No oí nada raro en el pasillo.'),
(12, 12, 'Vine a escribir un reportaje sobre el balneario y me encuentro con una exclusiva. No me levanté de la mesa; después de la cena llamé a mi redacción para contarlo.'),
(13, 13, 'Pasé la mañana en el gimnasio y la tarde en el spa. Cené en la mesa 4 sin moverme y después bajé a la consigna a dejar mi material de escalada.'),
(14, 14, 'La marquesa enseñó el zafiro a todo el mundo en el cóctel de las siete. Es una pieza única: quien se lo haya llevado sabía muy bien lo que vale. Yo no me levanté de la mesa.'),
(15, 15, 'Subí un momento a mi habitación a por otro objetivo para la cámara. No tardé ni diez minutos y volví al comedor a seguir haciendo fotos de la cena.'),
(16, 16, 'Cené en la mesa 4, al lado del fotógrafo, que no paraba quieto. Yo no me moví de mi sitio.'),
(17, 17, 'Como notario, doy fe de que no abandoné la mesa 5 en ningún momento.'),
(18, 18, 'Fui al spa antes de la cena, cuando ya quedaba poca gente. Luego estuve en el comedor toda la noche.'),
(19, 19, 'Ya sé lo que están pensando, porque soy cerrajero. Pero esa caja no estaba forzada, ¿verdad? Me levanté de la mesa a las nueve y veinte para llamar a mi hija desde la habitación y a las diez menos veinte ya estaba otra vez sentado.'),
(20, 20, 'Tuve que atender una llamada urgente de la embajada. Fueron cinco minutos escasos y volví a mi mesa.'),
(21, 21, 'La carretera está cortada por la nieve desde el sábado a mediodía: nadie ha entrado ni salido del hotel. Durante la cena de gala todo el personal estuvo trabajando en el comedor y en la cocina, a la vista del maître y del chef. Respondo por todos ellos.'),
(22, 22, 'Remedios estuvo conmigo en la cocina desde las ocho y media hasta pasadas las once, ayudando a emplatar. No salió ni un momento.'),
(23, 23, 'Estuve toda la noche en recepción. Nadie salió del hotel. La centralita registra todas las llamadas que se hacen desde las habitaciones.'),
(24, 24, 'A las 17:38 entré en el spa con el carrito de toallas. Estaba vacío; revisé todas las cabinas. A las 17:40 dejé mi tarjeta sobre el mostrador para colocar las toallas en el almacén, y cuando volví, a las 18:20, la tarjeta ya no estaba. Mi tarjeta es maestra: abre todas las habitaciones. Di parte al director. Durante la cena estuve en la cocina con el chef.'),
(25, 25, 'Bajé a la bodega a las ocho y media a por los vinos de la cena y después estuve sirviendo en el comedor toda la noche. Esta tarde no he pisado el spa.'),
(26, 26, 'Entré a trabajar en el spa a las 17:41. Atendí masajes hasta las siete y luego ayudé a servir la cena.'),
(27, 27, 'Bajé maletas a la consigna por la mañana y otra vez después de la cena. Durante la cena estuve ayudando en el comedor.'),
(28, 28, 'Serví las mesas 1 y 2 toda la noche. No vi nada raro, pero con tanto plato no me fijo en quién se levanta.'),
(29, 29, 'Tengo por costumbre anotar en mi libreta quién se levanta de la mesa y cuándo vuelve, para no servir platos a sillas vacías. Está todo apuntado en el registro de la cena.'),
(30, 30, 'Estuve de guardia en la piscina del spa por la tarde, de espaldas al mostrador. Después ayudé en la cena.');

-- ------------------------------------------------------------
-- ACUSAR: cuando tengas claro quién fue, ejecuta
--     CALL acusar(id_de_la_persona);
-- (La solución va cifrada: leer este código no te dirá quién es.)
-- ------------------------------------------------------------
DROP PROCEDURE IF EXISTS acusar;
CREATE PROCEDURE acusar(IN id_sospechoso INT)
    SELECT IF(
        SHA2(CONCAT('PicoNevado-', id_sospechoso), 256) = 'f87ae82804373af98cda40088e210484c7c38a820aa81c9efe234aa108f5de90',
        '¡CASO RESUELTO! Ante las pruebas, la persona acusada confiesa. La policía registra su equipaje y, envuelta en un pañuelo, aparece la Estrella de Medianoche junto a la tarjeta maestra desaparecida. La marquesa invita a champán a todo el equipo de detectives.',
        'Acusación rechazada: esa persona tiene coartada o te falta alguna prueba. Repasa tus notas, detective.'
    ) AS veredicto;
