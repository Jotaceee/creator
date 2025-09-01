var can_reset = false;
var finished = false;
var assembled = false;
var linked = false;
var dissambled = false;
var comp_after_run = false;
var is_32b_arch = false;
var insn_number;
var entry_elf;
var length_vext = 64;
var selectedFile = null;
var activeTabIndex = -1;
var set_extensions = [
                      {"name": "M",  "description": "(Multiply and Division)",   "arg": "m",  "activated" : true},
                      {"name": "FD", "description": "(Float and Double)",        "arg": "fd", "activated" : true},
                      {"name": "A",  "description": "(Atomic)",                  "arg": "a",  "activated" : false},
                      {"name": "C",  "description": "(Compressed)",              "arg": "c",  "activated" : false},
                      {"name": "V",  "description": "(Vector)",                  "arg": "v",  "activated" : true},
                      {"name": "Q",  "description": "(Quad)",                    "arg": "q",  "activated" : false},
                      {"name": "B",  "description": "(Bit manipulation)",        "arg": "_zba_zbb_zbs", "activated" : false},
                      {"name": "P",  "description": "(Privileged instructions)", "arg": "_zicsr", "activated" : false},
                      // {"name": "T",  "activated" : false}, Non officially implemented
                      // {"name": "P",  "activated" : false}, Non officially implemented                 
                      ];


// FP Extension:
const fpdextension = ["fadd.s", "fadd.d", "fsub.s", "fsub.d", "fmul.s", "fmul.d", "fdiv.s", "fdiv.d", "fsqrt.s", "fsqrt.d", "fmadd.s", 
  "fmadd.d", "fmsub.s", "fmsub.d", "fnmadd.s", "fnmadd.d", "fnmsub.s", "fnmsub.d", "fcvt.w.s", "fcvt.wu.s", "fcvt.w.d", 
  "fcvt.wu.d", "fcvt.s.w", "fcvt.s.wu", "fcvt.d.w", "fcvt.d.wu", "feq.s", "feq.d", "flt.s", "flt.d", "fle.s", "fle.w", 
  "fsgnj.s", "fsgnj.d", "fsgnjn.s", "fsgnjn.d", "fsgnjx.s", "fsgnjx.d", "fclass.s", "fclass.d", "fmax.s", "fmax.d", 
  "fmin.s", "fmin.d", "flw", "flsw", "fld", "fsd"];
// Vector Extension:
  const vecextension = ["vle8.v", "vse8.v", "vle16.v", "vse16.v", "vle32.v", "vse32.v", "vle64.v", "vse64.v", "vadd.vv", "vadd.vx", "vadd.vi",
 "vsub.vv", "vsub.vx", "vmul.vv", "vmul.vx", "vdiv.vv", "vdiv.vx", "vand.vv", "vor.vv", "vxor.vv", "vnot.v", "vsll.vv", 
 "vsrl.vv", "vsra.vv", "vmseq.vv", "vmsne.vv", "vmslt.vv", "vmsle.vv"];

// Crear una expresión regular optimizada
const regexfpd = new RegExp(`\\b(${fpdextension.join('|')})\\b`, 'g');
const regexvec = new RegExp(`\\b(${vecextension.join('|')})\\b`, 'g');
let enablefpd = false;
let enablevec = false;

var linkercontent, objectcontent, elffile, file, content, reader, scriptas, scriptld, scriptsail, scriptdump;
const filenames = [];
const filecontents = [];


function clean_environment() {
  const moduleKeys = [
    'ENVIRONMENT', 'HEAP16', 'HEAP32', 'HEAP8', 'HEAPF32', 'HEAPF64', 'HEAPU16', 
    'HEAPU32', 'HEAPU8', 'INITIAL_MEMORY', 'TOTAL_MEMORY', 'TOTAL_STACK', '_main', 
    'arguments', 'asm', 'calledRun', 'cdInitializerPrefixURL', 'extraStackTrace', 
    'filePackagePrefixURL', 'inspect', 'instantiateWasm', 'locateFile', 'logReadFiles', 
    'memoryInitializerPrefixURL', 'monitorRunDependencies', 'noExitRuntime', 'noInitialRun', 
    'onAbort', 'onExit', 'onRuntimeInitialized', 'postRun', 'preInit', 'preRun', 'print', 
    'printErr', 'pthreadMainPrefixURL', 'quit', 'read', 'readAsync', 'readBinary', 'run', 
    'setStatus', 'setWindowTitle', 'stderr', 'stdin', 'stdout', 'thisProgram', 'wasmBinary'
    ,'createWasm', 'STACK_SIZE' ,'wasmMemory', 'preloadPlugins', 'safeSetTimeout', 'ccall', 'missingLibrarySymbol'
    , 'hookGlobalSymbolAccess'
  ];

    moduleKeys.forEach(key => {
      delete Module[key];
    });
    
  
  delete window.missingLibrarySymbol;
  delete window.ccall;
  delete window.safeSetTimeout;
  delete window.runAndAbortIfError;
  delete window.ExitStatus;
  wasmBinaryFile = undefined;
  if ( typeof preprocess_as === "function")
    preprocess_as = undefined;
  if (typeof preprocess_ld === "function")
    preprocess_ld = undefined;
  if (typeof preprocess_sail === "function")
    preprocess_sail = undefined;
  if (typeof preprocess_dissamble === "function")
    preprocess_dissamble = undefined;
  if (typeof Module !== 'undefined'){
    Module = null;
    window.Module = undefined;
  }
}

// Funcion para limpiar el entorno en caso de que haya ocurrido algun error durante la ejecución 
// o si ha ido exitoso para volver a utilizarlo sin tener que recargar la página.
function resetenvironment (value){
  if (can_reset || value === 2) {
      if (Module !== undefined)
        clean_environment();
      if (is_32b_arch){
        scriptas = document.querySelector('script[src="'+ window.location.href +'js/toolchain_compiler/32bits/as-new.js"]');
        scriptld = document.querySelector('script[src="'+ window.location.href +'js/toolchain_compiler/32bits/ld-new.js"]');
        scriptsail = document.querySelector('script[src="'+ window.location.href +'js/toolchain_compiler/32bits/riscv_sim_RV32.js"]');
        scriptdump = document.querySelector('script[src="'+ window.location.href +'js/toolchain_compiler/32bits/objdump.js"]');
      }
      else {
        scriptas = document.querySelector('script[src="'+ window.location.href +'js/toolchain_compiler/64bits/as-new.js"]');
        scriptld = document.querySelector('script[src="'+ window.location.href +'js/toolchain_compiler/64bits/ld-new.js"]');
        scriptsail = document.querySelector('script[src="'+ window.location.href +'js/toolchain_compiler/64bits/riscv_sim_RV64.js"]');
        scriptdump = document.querySelector('script[src="'+ window.location.href +'js/toolchain_compiler/64bits/objdump.js"]');
      }

      if(scriptas)
        scriptas.parentNode.removeChild(scriptas);
      if(scriptld)
        scriptld.parentNode.removeChild(scriptld);
      if(scriptsail)
        scriptsail.parentNode.removeChild(scriptsail);
      if(scriptdump)
        scriptdump.parentNode.removeChild(scriptdump);
    if (value === 0) {
      can_reset = false;
      filenames.length = 0;
      filecontents.length = 0;
      calledRun = false;
      calledMain = false;
      calledRun = false;
      err_comp = false;
      runtimeInitialized = false;
      entry_elf = undefined;
      enablefpd = false;
      enablevec = false;
      instructions.length = 0;
      if (typeof dumpdatainstructions !== 'undefined')
        dumpdatainstructions.length = 0;
      if (typeof dumptextinstructions !== 'undefined')
        dumptextinstructions.length = 0;
      if (typeof dumplabels !== 'undefined')
        dumplabels.length = 0;
      list_user_instructions.length = 0;
      list_data_instructions.length = 0;
      insn_number = undefined;
      scriptas = document.createElement('script');
      if (is_32b_arch)
        scriptas.src = window.location.href +'js/toolchain_compiler/32bits/as-new.js';
      else
        scriptas.src = window.location.href +'js/toolchain_compiler/64bits/as-new.js';
      scriptas.async = true;
      scriptas.type = 'text/javascript';
      document.head.appendChild(scriptas);
      creator_memory_clearall();
    } else if (value === 1){
      last_execution_mode_run = -1;
      execution_mode_run = -1;
      calledRun = false;
      calledMain = false;
      calledRun = false;
      runtimeInitialized = false;
      scriptsail = document.createElement('script');
      if (is_32b_arch)
        scriptsail.src = window.location.href +'js/toolchain_compiler/32bits/riscv_sim_RV32.js';
      else
        scriptsail.src = window.location.href +'js/toolchain_compiler/64bits/riscv_sim_RV64.js';
      scriptsail.async = true;
      scriptsail.type = 'text/javascript';
      document.head.appendChild(scriptsail);
      can_reset = false;
      finished = false;
    } else if (value === 2){
      if(can_reset){
        last_execution_mode_run = -1;
        execution_mode_run = -1;
        assembled = false;
        linked = false;
        dissambled = false;
        can_reset = false;
        finished = false;
      }else if (execution_mode_run === -1 || can_reset) {
        calledRun = false;
        calledMain = false;
        calledRun = false;
        err_comp = false;
        entry_elf = undefined;
        runtimeInitialized = false;
        enablefpd = false;
        enablevec = false;
        objectcontent = undefined;
        elffile = undefined;
        insn_number = undefined;
        instructions.length = 0;
        dumpdatainstructions.length = 0;
        dumptextinstructions.length = 0;
        list_user_instructions.length = 0;
        list_data_instructions.length = 0;
        filenames.length = 0;
        filecontents.length = 0;
        scriptas = document.createElement('script');
        scriptas.id = 'as-new';
        if (is_32b_arch)
          scriptas.src = window.location.href +'js/toolchain_compiler/32bits/as-new.js';
        else
          scriptas.src = window.location.href +'js/toolchain_compiler/64bits/as-new.js';
        scriptas.async = true;
        scriptas.type = 'text/javascript';
        document.head.appendChild(scriptas);
        comp_after_run = true;
        creator_memory_clearall();
        if(execution_mode_run === -1){
          assembled = false;
          linked = false;
          dissambled = false;
        }
      }
    }

    can_reset = false;

  }
  else setTimeout(resetenvironment, 100, 1);
}


// Funcion asíncrona para lanzar el motor de sail
function loadSailFunction(maxAttemps = 50){
  preprocess_sail(elffile, enablefpd, enablevec, entry_elf);
}

async function dissamble_binary(maxAttemps = 50) {
  let attempsdis = 0;
  
  while ((typeof preprocess_dissamble !== "function" || typeof preprocess_ld === "function" ) && attempsdis < maxAttemps ) {
    await new Promise(resolve => setTimeout(resolve, 100)); // Espera 100 ms antes de volver a verificar
    attempsdis++;
  }
  while ((typeof runDependencies === 'undefined' || runDependencies !== 0)) {
    await new Promise(resolve => setTimeout(resolve, 100)); // Espera 100 ms antes de volver a verificar
  }
  if (!preprocess_dissamble(elffile)){
    scriptdump.parentNode.removeChild(scriptdump);
    clean_environment();
    scriptdump = document.createElement('script');
    if (is_32b_arch)
      scriptdump.src = window.location.href +'js/toolchain_compiler/32bits/objdump.js';
    else
      scriptdump.src = window.location.href +'js/toolchain_compiler/64bits/objdump.js';
    scriptdump.async = true;
    scriptdump.id = 'objdump';
    scriptdump.type = 'text/javascript';
    document.head.appendChild(scriptdump);
    return new Promise(resolve => setTimeout(resolve(false), 100));
  }
  else{
    scriptdump.parentNode.removeChild(scriptdump);
    clean_environment();
    scriptsail = document.createElement('script');
    if (is_32b_arch)
      scriptsail.src = window.location.href +'js/toolchain_compiler/32bits/riscv_sim_RV32.js';
    else
      scriptsail.src = window.location.href +'js/toolchain_compiler/64bits/riscv_sim_RV64.js';
    scriptsail.async = true;
    if(is_32b_arch)
      scriptsail.id = 'riscv_sim_RV32';
    else 
      scriptsail.id = 'riscv_sim_RV64';
    
    scriptsail.type = 'text/javascript';
    document.head.appendChild(scriptsail);
    return new Promise(resolve => setTimeout(resolve(true), 100));
  }


}

function preprocess_run(asfilen, ascode, fpd, vec){
  objectcontent = preprocess_as(asfilen, ascode, fpd, vec);
  scriptas = document.getElementById('as-new');
  if(scriptas){
    clean_environment();
  scriptas.parentNode.removeChild(scriptas);
  }
  if (!assembled) {
    return false;
  }
  scriptld = document.createElement('script');
  if(is_32b_arch)
    scriptld.src = window.location.href +'js/toolchain_compiler/32bits/ld-new.js';
  else
    scriptld.src = window.location.href +'js/toolchain_compiler/64bits/ld-new.js';
  scriptld.async = true;
  scriptld.id = 'ld-new';
  scriptld.type = 'text/javascript';
  document.head.appendChild(scriptld);
  return true;
}

// Funcion asíncrona que se espera a terminar el ensamblado y cargar el enlazador para poder generar el binario que se envia al motor de ejecución
async function waitForFunction(maxAttemps = 50) {
  let attemps = 0;
  while (typeof preprocess_ld === 'undefined' && attemps < maxAttemps) {
    await new Promise(resolve => setTimeout(resolve, 100)); // Espera 100 ms antes de volver a verificar
    attemps++;
  }
  while ((typeof runDependencies === 'undefined' || runDependencies !== 0)) {
    await new Promise(resolve => setTimeout(resolve, 100)); // Espera 100 ms antes de volver a verificar
  }
  if(load_binary)
    elffile = preprocess_ld(objectcontent, linkercontent, app.update_binary); 
  else 
    elffile = preprocess_ld(objectcontent, linkercontent);

  scriptld.parentNode.removeChild(scriptld);
  clean_environment();

  if(elffile === undefined){
    // retornas una promesa mala
    scriptld = document.createElement('script');
    if (is_32b_arch)
      scriptld.src = window.location.href +'js/toolchain_compiler/32bits/ld-new.js';
    else
      scriptld.src = window.location.href +'js/toolchain_compiler/64bits/ld-new.js';
    scriptld.async = true;
    scriptld.id = 'ld-new';
    scriptld.type = 'text/javascript';
    document.head.appendChild(scriptld);
    return new Promise(resolve => setTimeout(resolve(false), 100));
  }
  else {
    scriptdump = document.createElement('script');
    if (is_32b_arch)
      scriptdump.src = window.location.href +'js/toolchain_compiler/32bits/objdump.js';
    else
      scriptdump.src = window.location.href +'js/toolchain_compiler/64bits/objdump.js';
    scriptdump.async = true;
    scriptdump.id = 'objdump';
    scriptdump.type = 'text/javascript';
    document.head.appendChild(scriptdump);
    return new Promise(resolve => setTimeout(resolve(true), 100));
  }
}


