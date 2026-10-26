/* The room descriptions, evidence and test cases are shared by the interface and its isolated reader. */
globalThis.GrinbergRooms = [
  {
    title:'La recepción', chapter:'EL PRIMER RASTRO', scene:'reception', location:'LABORATORIO / PLANTA 00',
    welcomeKicker:'EL SILENCIO NO ES UNA RESPUESTA', welcomeTitle:'Alguien estuvo aquí.',
    welcome:['Una taza fría. El zumbido de un monitor. Al fondo, la luz roja de una cerradura.','Junto al teclado hay una nota escrita a mano. Parece que el doctor esperaba una visita.'],
    noteTitle:'«Busca mi marca».', note:['Si alguien ha borrado mi rastro, aún quedarán mensajes en la terminal.','Todos los míos contienen ORIGEN, en mayúsculas. La marca puede estar en cualquier parte.','Filtra el ruido. Recupera mi transmisión.'],
    terminalName:'TERMINAL', terminalAction:'BUSCAR TRANSMISIÓN', terminalSolved:'TRANSMISIÓN RECUPERADA', doorName:'PUERTA', doorLocked:'CERRADURA BLOQUEADA', doorReady:'ACTIVAR CERRADURA', doorSolved:'PUERTA DESBLOQUEADA',
    art:['  .--------------------.','  | >_                 |','  |   SEÑAL PERDIDA    |','  |                    |',"  '--------------------'",'          |    |','       ___|____|___','  ____/____________\\____'],
    solvedArt:['  .--------------------.','  | >_                 |','  |   SEÑAL RECUPERADA |','  |                    |',"  '--------------------'",'          |    |','       ___|____|___','  ____/____________\\____'],
    doorArt:[' .---------------.',' | .-----------. |',' | |  ARCHIVO  | |',' | |    02     | |',' | |           | |',' | |   [ ? ]   | |',' | |           | |',' | |       [o] | |',' | |           | |',' |_|___________|_|'],
    lockedTitle:'La puerta no responde.', locked:['El lector necesita una transmisión del doctor para activar la cerradura.','La terminal de recepción sigue encendida. Quizá puedas recuperar algo allí.'],
    evidence:'Transmisión ORIGEN', access:'Acceso al archivo', recoveredTitle:'TRANSMISIÓN AUTÉNTICA / RECUPERADA',
    recovered:'«La puerta reconoce ORIGEN. Solo esa palabra. Ni un carácter delante. Ni uno detrás. Cuidado con las copias».',
    ready:'Oyes un clic. El indicador cambia a verde.', openAction:'ABRIR LA PUERTA',
    successTitle:'Has encontrado\nel primer rastro.', successPersonal:'la puerta del archivo se ha abierto.',
    fragmentTitle:'FRAGMENTO 01 / PROYECTO ORIGEN', fragment:'«Hay un nombre que han intentado borrar.\nBúscalo entre las identidades».',
    nextText:'El archivo de identidades está al otro lado.\nAlguien ha manipulado sus credenciales.', nextAction:'ENTRAR EN EL ARCHIVO',
    challenges:[
      {kicker:'ENCONTRAR LA MARCA', title:'Una señal entre el ruido.', description:'Selecciona todos los registros que contienen la marca del doctor, esté donde esté. Si no sabes cuál es, lee la nota de la mesa.', source:'TERMINAL / FILTRO DE TRANSMISIONES', label:'REGISTROS DE LA TERMINAL',
        records:['CANAL_04 / SIN SEÑAL','ORIGEN / TRANSMISIÓN 01','SENSOR / PUERTA CERRADA','CANAL_07 > ORIGEN','origen / señal de prueba','PAQUETE_ORIGEN_03','OR1GEN / DATO CORRUPTO'], expected:'ORIGEN',
        probes:['','ORIGE','ORIGENN','ORIGENORIGEN','XORIGEN','ORIGENX','PRE ORIGEN POST','_ORIGEN_','ORIGEN.','.ORIGEN','ORIGEN/17','0ORIGEN0','ORIGEN-2026','Origen','RUIDO'],
        hints:['Un patrón puede encontrar un texto dentro de otro. Busca la marca que el doctor escribió en su nota.','Para buscar una palabra tal cual, basta con escribir sus letras. Las mayúsculas cuentan.','Prueba ORIGEN. Seleccionará los registros que contienen esas seis letras, estén donde estén.'], success:'TRANSMISIÓN RECUPERADA. El doctor ha dejado un mensaje para ti.'},
      {kicker:'LOS LÍMITES DEL CÓDIGO',title:'Una palabra. Nada más.',description:'La transmisión dice: «Solo ORIGEN. Ni un carácter delante. Ni uno detrás». Acepta el código auténtico y rechaza todas las copias. Los puntos · representan espacios.',source:'PUERTA 02 / CONTROL DE ACCESO',label:'CÓDIGOS DEL LECTOR',
        records:['ORIGEN','ORIGEN_2','FALSO_ORIGEN','ORIGEN_COPIA','origen',' ORIGEN','ORIGEN '],expected:'^ORIGEN$',
        probes:['','ORIGE','ORIGENN','ORIGENORIGEN','XORIGEN','ORIGENX','PRE ORIGEN POST','_ORIGEN_','ORIGEN.','.ORIGEN','ORIGEN/17','0ORIGEN0','ORIGEN-2026','Origen'],
        hints:['Buscar una palabra dentro de un código no garantiza que sea el código completo. Necesitas marcar sus límites.','^ marca el inicio y $ marca el final. Coloca la palabra entre las dos anclas.','Prueba ^ORIGEN$. Así no queda espacio para caracteres antes ni después de la palabra.'],success:'ACCESO AUTORIZADO. La cerradura se ha desbloqueado.'}
    ]
  },
  {
    title:'El archivo de identidades',chapter:'EL NOMBRE BORRADO',scene:'archive',location:'ARCHIVO PRIVADO / PLANTA 01',
    welcomeKicker:'TODO ARCHIVO TIENE SUS FANTASMAS',welcomeTitle:'Falta una identidad.',
    welcome:['Los cajones están abiertos. Entre credenciales intactas aparecen otras con letras cambiadas y números incompletos.','Una ficha del doctor explica cómo reconocer al personal del proyecto. Recupera el fichero antes de tocar el lector de salida.'],
    noteTitle:'«Reconstruye el equipo».',note:['El personal de ORIGEN se identifica con una letra de grupo: A, B o C. Siempre en mayúscula.','Después de la letra hay exactamente dos dígitos, del 0 al 9. Nada más.','Las tarjetas de otros grupos y los códigos incompletos son señuelos. Recupera las credenciales válidas.'],
    terminalName:'FICHERO',terminalAction:'RECONSTRUIR IDENTIDADES',terminalSolved:'IDENTIDAD RECUPERADA',doorName:'LECTOR',doorLocked:'LECTOR SIN IDENTIDAD',doorReady:'VERIFICAR EL SELLO',doorSolved:'ACCESO A COMUNICACIONES',
    art:[' .----------------------.',' | ARCHIVO / PERSONAL   |',' |----------------------|',' | [ A ]   [ B ]  [ C ] |',' |------.-------.-------|',' |  --  |  --   |  --   |',' |------|-------|-------|',' |  ??  |  ??   |  ??   |'," '------'-------'-------'"],
    solvedArt:[' .----------------------.',' | ARCHIVO / PERSONAL   |',' |----------------------|',' |    MARA VEGA / A07   |',' |------.-------.-------|',' |  OK  |  OK   |  OK   |',' |------|-------|-------|',' |  --  |  --   |  --   |'," '------'-------'-------'"],
    doorArt:[' .---------------.',' | .-----------. |',' | |  COMMS.   | |',' | |    03     | |',' | |           | |',' | |  GR.??    | |',' | |           | |',' | |       [o] | |',' | |           | |',' |_|___________|_|'],
    lockedTitle:'El lector pide un sello.',locked:['El expediente que contiene el sello de paso está dañado. Primero debes reconstruir las identidades válidas.','La ficha del doctor, junto al fichero, explica el formato de las credenciales.'],
    evidence:'Mara Vega / A07',access:'Sello de comunicaciones',recoveredTitle:'IDENTIDAD RESTAURADA / MARA VEGA',
    recovered:'Mara Vega, operadora de comunicaciones. Nota al margen: «El sello de salida empieza por GR, después lleva un punto de verdad y exactamente dos dígitos. No confundas el punto con cualquier otro carácter».',
    ready:'El lector reconoce el sello. La puerta de comunicaciones queda abierta.',openAction:'ABRIR COMUNICACIONES',
    successTitle:'El archivo vuelve\na tener un nombre.',successPersonal:'has recuperado la identidad de Mara Vega.',
    fragmentTitle:'FRAGMENTO 02 / MARA VEGA',fragment:'«La última llamada del doctor no quedó registrada.\nReajusta el receptor. Su señal sigue ahí».',
    nextText:'En la sala de comunicaciones hay un receptor encendido.\nMara dejó instrucciones junto a él.',nextAction:'IR A COMUNICACIONES',
    challenges:[
      {kicker:'CLASES DE CARACTERES',title:'¿Quién pertenece al equipo?',description:'Recupera las credenciales de los grupos A, B o C: una letra mayúscula del grupo y exactamente dos dígitos. Los puntos · representan espacios.',source:'FICHERO / CREDENCIALES',label:'TARJETAS RECUPERADAS',
        records:['A07','B12','C90','D12','A7','A007','a07','A0X'],expected:'^[A-C][0-9][0-9]$',
        probes:['A00','A99','B00','B78','C03','C99','Z11','AA7','AB12','1A7',' A07','A07 ','XA07','A07X','B1B','C-1','c90','A٠٧',''],
        hints:['Cada posición tiene una regla: primero una letra permitida, después un dígito y después otro. Usa las anclas para validar la tarjeta entera.','[ABC] o [A-C] acepta una letra del grupo. [0-9] acepta un dígito. Dos clases seguidas representan dos caracteres.','Una solución es ^[A-C][0-9][0-9]$. También puedes escribir [ABC] para la primera posición.'],success:'FICHERO RECONSTRUIDO. Entre los expedientes aparece la operadora Mara Vega.'},
      {kicker:'EL PUNTO LITERAL',title:'El sello del doctor.',description:'El lector exige GR, un punto literal y dos dígitos, sin ningún carácter adicional. Un punto en una expresión regular tiene un significado especial.',source:'LECTOR / SELLO DE PASO',label:'SELLOS DE ACCESO',
        records:['GR.07','GR.42','GRX07','GR-42','GR.7','GR.007','XGR.07','gr.07'],expected:'^GR\\.[0-9][0-9]$',
        probes:['GR.00','GR.99','GR.18','GRa12','GR/10','GR 12','GR..12','GR.12X','GR.12 ',' GR.12','GR.1A','GR.','GRX',''],
        hints:['Recuerda: . por sí solo admite cualquier carácter. El sello necesita un punto real.','Para quitar el significado especial del punto, escribe \\. También sirve [.] dentro de una clase.','Una solución es ^GR\\.[0-9][0-9]$. Otra equivalente es ^GR[.][0-9][0-9]$.'],success:'SELLO VERIFICADO. Puedes abrir la sala de comunicaciones.'}
    ]
  },
  {
    title:'La sala de comunicaciones',chapter:'LA SEÑAL QUE NO CESÓ',scene:'signal',location:'COMUNICACIONES / PLANTA 02',
    welcomeKicker:'ALGUIEN SIGUE AL OTRO LADO',welcomeTitle:'Escucha el silencio.',
    welcome:['El receptor repite una ráfaga de estática. La pantalla muestra números que parecen frecuencias, pero algunos paquetes están incompletos.','Mara dejó una tarjeta de mantenimiento junto al receptor. Ajusta el filtro y después responde a la señal.'],
    noteTitle:'«Ajusta la longitud».',note:['El receptor usa identificadores de canal de exactamente cinco dígitos. Los ceros del principio también cuentan.','Descarta las secuencias con letras, espacios o una longitud distinta.','Cuando el filtro funcione, podrás leer la última transmisión del doctor. — Mara'],
    terminalName:'RECEPTOR',terminalAction:'SINTONIZAR LA SEÑAL',terminalSolved:'SEÑAL SINTONIZADA',doorName:'TRANSMISOR',doorLocked:'SIN ENLACE',doorReady:'ENVIAR RESPUESTA',doorSolved:'ENLACE RESTABLECIDO',
    art:[' .----------------------.',' | RECEPTOR / CANAL ??? |',' |----------------------|',' | _/\\___/\\_/\\___/\\_ |',' |                      |',' |   [?? ???]   (O)     |',' |  o  o  o  o  o       |'," '----------------------'"],
    solvedArt:[' .----------------------.',' | RECEPTOR / EN LÍNEA  |',' |----------------------|',' | _/\\_/\\_/\\_/\\_/\\_ |',' |                      |',' |   [04217]    (O)     |',' |  o  o  o  o  o       |'," '----------------------'"],
    doorArt:['       .       .','     .  \\ | /  .','         \\|/','          |','       ___|___','      | TX-03 |','      |-------|','      |  E??  |','      |       |','      | [___] |','      |_______|'],
    lockedTitle:'Solo hay estática.',locked:['El transmisor necesita un canal estable para enviar una respuesta.','Filtra primero los paquetes del receptor. La tarjeta de mantenimiento indica su longitud.'],
    evidence:'Última llamada / 04217',access:'Respuesta enviada',recoveredTitle:'ÚLTIMA TRANSMISIÓN / CANAL 04217',
    recovered:'«¿Mara? Necesito confirmar el enlace. Acepta paquetes con E mayúscula, de dos a cuatro dígitos y, al final, un signo ! opcional. No dejes pasar paquetes de otra longitud».',
    ready:'El transmisor está preparado. Ya puedes enviar la respuesta.',openAction:'TRANSMITIR RESPUESTA',
    successTitle:'El silencio\nacaba de responder.',successPersonal:'has restablecido el enlace con el laboratorio.',
    fragmentTitle:'FRAGMENTO 03 / EL ORIGEN DE LA SEÑAL',fragment:'«La llamada nunca salió del edificio.\nEl doctor transmitió desde el laboratorio interior».',
    nextText:'Has completado las tres salas de esta demo.\nEl laboratorio interior y el muro quedan para la siguiente fase.',nextAction:null,
    challenges:[
      {kicker:'UNA LONGITUD EXACTA',title:'Cinco dígitos de señal.',description:'Selecciona los identificadores de canal que tienen exactamente cinco dígitos. Los ceros iniciales cuentan. Los puntos · representan espacios.',source:'RECEPTOR / FILTRO DE CANALES',label:'PAQUETES RECIBIDOS',
        records:['04217','00001','93108','4217','042170','04A17','04217 ','CANAL04217'],expected:'^[0-9]{5}$',
        probes:['00000','99999','12345','54321','01234','0000','000000','123456789',' 12345','12 45','+12345','12345X','X12345','12.45',''],
        hints:['Una clase como [0-9] representa un solo dígito. Necesitas indicar cuántas veces se repite.','{5} exige exactamente cinco repeticiones de lo que tiene justo delante. Mantén las anclas.','Prueba ^[0-9]{5}$. También sirve ^\\d{5}$ en este lector.'],success:'SEÑAL SINTONIZADA. La última llamada del doctor vuelve a escucharse.'},
      {kicker:'RANGOS Y CARACTERES OPCIONALES',title:'Confirma que sigues ahí.',description:'Acepta paquetes con E mayúscula, de dos a cuatro dígitos y un ! opcional al final. El resto debe quedar fuera.',source:'TRANSMISOR / PROTOCOLO DE RESPUESTA',label:'PAQUETES DE RESPUESTA',
        records:['E17','E042!','E2500','E01!','E7','E12345','E12!!','X12'],expected:'^E[0-9]{2,4}!?$',
        probes:['E00','E9999!','E123','E0000','E12','E123!','E1234!','E1!','E12345!','E!','E','e12','XE12','E12X',' E12','E12 ','E12!X','E12?','E!12','E1A',''],
        hints:['Hay tres piezas: una E fija, una cantidad limitada de dígitos y un signo que puede aparecer una vez o ninguna.','{2,4} significa entre dos y cuatro repeticiones. ? vuelve opcional el carácter anterior; !? admite cero o un signo !.','Prueba ^E[0-9]{2,4}!?$. Las dos anclas impiden que se cuele texto adicional.'],success:'PROTOCOLO RESTAURADO. El transmisor está listo para responder.'}
    ]
  }
];
