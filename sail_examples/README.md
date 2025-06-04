# Códigos de ejemplo para probar la herramienta

Os he adjuntado una serie de ejemplos que cubren en su totalidad las funcionalidades de CREATOR. Os describo por orden el comportamiento espera de cada uno.

* 0: Estos dos ficheros son para crear con Lib.s una librería y luego con el main_lib llamarla una vez ya creada y cargada

* 1: Estos programas son para probar principalmente los tipos de datos en instrucciones vectoriales

* 2: Dos ficheros para probar la compilación multifichero y probar que se puede ejecutar correctamente.

* 3: Programa para probar las llamadas al sistema implementadas ya en CREATOR.

* 4: Programa para probar la divergencia y que el simulador sea capaz de detener la ejecución.

# Uso de la herramienta

Para usar el simulador igual que siempre en CREATOR, lo único es que tienes que crear ficheros para poder compilar y ejecutar programas sino no te va a dejar hacer nada.

Puedes generar librerías igual que en la version actual de CREATOR (no tiene que contener la funcion main).

Luego en el simulador pues el comportamiento es exactamente igual que en la version actual.


# Aspectos pendientes a mejorar a futuro que soy consciente

* Mapa de memoria de CREATOR: como está hecho ahora para la version de 64 bits me da ciertos problemas en el mapeo, he solventado ese error para su funcionamiento, pero quiero modificarlo e implementar un modelo de memoria completo que sea adaptable para ambos.

* Popover CSR: Añadir los comentarios para dar información de que representa cada registro.

* CodeMirror: Restablecer el backup si refrescas la página. Es adaptarlo a los nuevos elementos introducido en el simulador.

* (Posible cambio): Pasar de que los modulos WebAssembly cargarlos asincronamente, pasarlo a Modulos independientes y que puedan ser cargados todos a la vez en su entorno sin necesidad de hacer carga y descarga dinámica que puede dar más problemas a futuro.

* Limpiar código: Seguro que tengo mucho código basura y que puedo hacerlo mejor, pero hasta que no vea una version totalmente estable y que no falte nada no me fio de tocar nada por si las moscas (No me fío de JavaScript).