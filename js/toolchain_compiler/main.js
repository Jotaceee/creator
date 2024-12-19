// // Lista de instrucciones especificas de cada extension para indicarle al compilador que flags tiene que activar en el proceso de ensamblado y enlazado del binario
// // FP Extension:
// const fpdextension = ["fadd.s", "fadd.d", "fsub.s", "fsub.d", "fmul.s", "fmul.d", "fdiv.s", "fdiv.d", "fsqrt.s", "fsqrt.d", "fmadd.s", 
//     "fmadd.d", "fmsub.s", "fmsub.d", "fnmadd.s", "fnmadd.d", "fnmsub.s", "fnmsub.d", "fcvt.w.s", "fcvt.wu.s", "fcvt.w.d", 
//     "fcvt.wu.d", "fcvt.s.w", "fcvt.s.wu", "fcvt.d.w", "fcvt.d.wu", "feq.s", "feq.d", "flt.s", "flt.d", "fle.s", "fle.w", 
//     "fsgnj.s", "fsgnj.d", "fsgnjn.s", "fsgnjn.d", "fsgnjx.s", "fsgnjx.d", "fclass.s", "fclass.d", "fmax.s", "fmax.d", 
//     "fmin.s", "fmin.d", "flw", "flsw", "fld", "fsd"];
//   // Vector Extension:
//     const vecextension = ["vle8.v", "vse8.v", "vle16.v", "vse16.v", "vle32.v", "vse32.v", "vle64.v", "vse64.v", "vadd.vv", "vadd.vx", "vadd.vi",
//    "vsub.vv", "vsub.vx", "vmul.vv", "vmul.vx", "vdiv.vv", "vdiv.vx", "vand.vv", "vor.vv", "vxor.vv", "vnot.v", "vsll.vv", 
//    "vsrl.vv", "vsra.vv", "vmseq.vv", "vmsne.vv", "vmslt.vv", "vmsle.vv"];
  
//   // Crear una expresión regular optimizada
//   const regexfpd = new RegExp(`\\b(${fpdextension.join('|')})\\b`, 'g');
//   const regexvec = new RegExp(`\\b(${vecextension.join('|')})\\b`, 'g');
//   let enablefpd = false;
//   let enablevec = false;
  
//   // const fileInput = document.getElementById('FileInput');
  
//   var linkercontent, objectcontent, elffile, file, content, reader, scriptas, scriptld, scriptsail, scriptdump;
//   const filenames = [];
//   const filecontents = [];
  
//   // Cargado del script de enlace para generar el binario (Falta diferencia para el caso de 32 o 64 bits)
//   fetch(window.location.href+'js/toolchain_compiler/linker.ld')
//   .then(response => {
//   return response.text();})
//   .then(data => {
//   linkercontent = data;
//   });
  
//   function clean_environment() {
//   const moduleKeys = [
//   'ENVIRONMENT', 'HEAP16', 'HEAP32', 'HEAP8', 'HEAPF32', 'HEAPF64', 'HEAPU16', 
//   'HEAPU32', 'HEAPU8', 'INITIAL_MEMORY', 'TOTAL_MEMORY', 'TOTAL_STACK', '_main', 
//   'arguments', 'asm', 'calledRun', 'cdInitializerPrefixURL', 'extraStackTrace', 
//   'filePackagePrefixURL', 'inspect', 'instantiateWasm', 'locateFile', 'logReadFiles', 
//   'memoryInitializerPrefixURL', 'monitorRunDependencies', 'noExitRuntime', 'noInitialRun', 
//   'onAbort', 'onExit', 'onRuntimeInitialized', 'postRun', 'preInit', 'preRun', 'print', 
//   'printErr', 'pthreadMainPrefixURL', 'quit', 'read', 'readAsync', 'readBinary', 'run', 
//   'setStatus', 'setWindowTitle', 'stderr', 'stdin', 'stdout', 'thisProgram', 'wasmBinary', 
//   'wasmMemory'
//   ];
  
//   moduleKeys.forEach(key => {
//   delete Module[key];
//   });
//   if ( typeof preprocess_run === "function")
//   preprocess_run = undefined;
//   if (typeof preprocess_ld === "function")
//   preprocess_ld = undefined;
//   if (typeof preprocess_sail === "function")
//   preprocess_sail = undefined;
//   }
  
//   // Funcion para limpiar el entorno en caso de que haya ocurrido algun error durante la ejecución 
//   // o si ha ido exitoso para volver a utilizarlo sin tener que recargar la página.
//   function resetenvironment (){
//     clean_environment();
//     scriptas = document.querySelector('script[src="toolchain_compiler/as-new.js"]');
//     scriptld = document.querySelector('script[src="toolchain_compiler/ld-new.js"]');
//     scriptsail = document.querySelector('script[src="toolchain_compiler/riscv_sim_RV32.js"]');
  
//     if(scriptas)
//     scriptas.parentNode.removeChild(scriptas);
//     if(scriptld)
//     scriptld.parentNode.removeChild(scriptld);
//     if(scriptsail)
//     scriptsail.parentNode.removeChild(scriptsail);
  
//     scriptas = document.createElement('script');
//     scriptas.src = 'as-new.js';
//     scriptas.async = true;
//     scriptas.type = 'text/javascript';
//     document.head.appendChild(scriptas);
//   }
  
//   // Funcion asíncrona para lanzar el motor de sail
//   async function loadSailFunction(){
//     while (typeof preprocess_sail === 'undefined' ) {
//     await new Promise(resolve => setTimeout(resolve, 100)); // Espera 100 ms antes de volver a verificar
//     }
//     preprocess_sail(elffile, enablefpd, enablevec);
  
//   }
  
//   async function dissamble_binary(maxAttemps = 50) {
//     let attempsdis = 0;
//     while ((typeof preprocess_dissamble === 'undefined' || typeof preprocess_ld === "function" ) && attempsdis < maxAttemps ) {
//       console.log("Espero");
//       await new Promise(resolve => setTimeout(resolve, 100)); // Espera 100 ms antes de volver a verificar
//     }
//     var dissambled = preprocess_dissamble(elffile); // Llamamos a runner_ld cuando preprocess_ld esté definida
//   }
  
  
  
//   // Funcion asíncrona que se espera a terminar el ensamblado y cargar el enlazador para poder generar el binario que se envia al motor de ejecución
//   async function waitForFunction(maxAttemps = 50) {
//     let attemps = 0;
//     while (typeof preprocess_ld === 'undefined' && attemps < maxAttemps) {
//       await new Promise(resolve => setTimeout(resolve, 100)); // Espera 100 ms antes de volver a verificar
//     }
//     elffile = preprocess_ld(objectcontent, linkercontent); // Llamamos a runner_ld cuando preprocess_ld esté definida
  
//     const outputfile = FS.readFile('./input.o');
//     console.log("Binario ",elffile);
//     // scriptld = document.getElementById('ld-new');
//       // if(scriptld){
//     clean_environment();
//     scriptld.parentNode.removeChild(scriptld);
//     // }
  
//     // Se carga el script ld.js para ejecutar el enlazador.
//     scriptdump = document.createElement('script');
//     scriptdump.src = window.location.href +'js/toolchain_compiler/objdump.js';
//     scriptdump.async = true;
//     scriptdump.id = 'objdump';
//     scriptdump.type = 'text/javascript';
//     document.head.appendChild(scriptdump);
//     dissamble_binary();
  
//   }
  