// Lista de instrucciones especificas de cada extension para indicarle al compilador que flags tiene que activar en el proceso de ensamblado y enlazado del binario
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

// const fileInput = document.getElementById('FileInput');

var linkercontent, objectcontent, elffile, file, content, reader, scriptas, scriptld, scriptsail, scriptdump;
const filenames = [];
const filecontents = [];

// Cargado del script de enlace para generar el binario (Falta diferencia para el caso de 32 o 64 bits)
fetch(window.location.href+'js/toolchain_compiler/linker.ld')
.then(response => {
return response.text();})
.then(data => {
linkercontent = data;
});

function clean_environment() {
const moduleKeys = [
'ENVIRONMENT', 'HEAP16', 'HEAP32', 'HEAP8', 'HEAPF32', 'HEAPF64', 'HEAPU16', 
'HEAPU32', 'HEAPU8', 'INITIAL_MEMORY', 'TOTAL_MEMORY', 'TOTAL_STACK', '_main', 
'arguments', 'asm', 'calledRun', 'cdInitializerPrefixURL', 'extraStackTrace', 
'filePackagePrefixURL', 'inspect', 'instantiateWasm', 'locateFile', 'logReadFiles', 
'memoryInitializerPrefixURL', 'monitorRunDependencies', 'noExitRuntime', 'noInitialRun', 
'onAbort', 'onExit', 'onRuntimeInitialized', 'postRun', 'preInit', 'preRun', 'print', 
'printErr', 'pthreadMainPrefixURL', 'quit', 'read', 'readAsync', 'readBinary', 'run', 
'setStatus', 'setWindowTitle', 'stderr', 'stdin', 'stdout', 'thisProgram', 'wasmBinary', 
'wasmMemory'
];

moduleKeys.forEach(key => {
  delete Module[key];
});
if ( typeof preprocess_run === "function")
  preprocess_run = undefined;
if (typeof preprocess_ld === "function")
  preprocess_ld = undefined;
if (typeof preprocess_sail === "function")
  preprocess_sail = undefined;
if (typeof preprocess_dissamble === "function")
  preprocess_dissamble = undefined;
}

// Funcion para limpiar el entorno en caso de que haya ocurrido algun error durante la ejecución 
// o si ha ido exitoso para volver a utilizarlo sin tener que recargar la página.
function resetenvironment (){
  clean_environment();
  scriptas = document.querySelector('script[src="toolchain_compiler/as-new.js"]');
  scriptld = document.querySelector('script[src="toolchain_compiler/ld-new.js"]');
  scriptsail = document.querySelector('script[src="toolchain_compiler/riscv_sim_RV32.js"]');
  scriptdump = document.querySelector('script[src="toolchain_compiler/objdump.js"]')
  if(scriptas)
  scriptas.parentNode.removeChild(scriptas);
  if(scriptld)
  scriptld.parentNode.removeChild(scriptld);
  if(scriptsail)
  scriptsail.parentNode.removeChild(scriptsail);
  if(scriptdump)
    scriptdump.parentNode.removeChild(scriptdump);

  scriptas = document.createElement('script');
  scriptas.src = 'as-new.js';
  scriptas.async = true;
  scriptas.type = 'text/javascript';
  document.head.appendChild(scriptas);
}

// Funcion asíncrona para lanzar el motor de sail
async function loadSailFunction(){
  while (typeof preprocess_sail === 'undefined' ) {
  await new Promise(resolve => setTimeout(resolve, 100)); // Espera 100 ms antes de volver a verificar
  }
  preprocess_sail(elffile, enablefpd, enablevec);
  // resetenvironment();

}

async function dissamble_binary(maxAttemps = 50) {
  let attempsdis = 0;
  while ((typeof preprocess_dissamble === 'undefined' || typeof preprocess_ld === "function" ) && attempsdis < maxAttemps ) {
    // console.log("Espero");
    await new Promise(resolve => setTimeout(resolve, 100)); // Espera 100 ms antes de volver a verificar
  }
  var dissambled = preprocess_dissamble(elffile); // Llamamos a runner_ld cuando preprocess_ld esté definida
  clean_environment();
  scriptdump.parentNode.removeChild(scriptdump);
  // }

  // Se carga el script ld.js para ejecutar el enlazador.
  scriptsail = document.createElement('script');
  scriptsail.src = window.location.href +'js/toolchain_compiler/riscv_sim_RV32.js';
  scriptsail.async = true;
  scriptsail.id = 'riscv_sim_RV32';
  scriptsail.type = 'text/javascript';
  document.head.appendChild(scriptsail);

}



// Funcion asíncrona que se espera a terminar el ensamblado y cargar el enlazador para poder generar el binario que se envia al motor de ejecución
async function waitForFunction(maxAttemps = 50) {
  let attemps = 0;
  while (typeof preprocess_ld === 'undefined' && attemps < maxAttemps) {
    await new Promise(resolve => setTimeout(resolve, 100)); // Espera 100 ms antes de volver a verificar
  }
  elffile = preprocess_ld(objectcontent, linkercontent); // Llamamos a runner_ld cuando preprocess_ld esté definida

  // const outputfile = FS.readFile('./input.o');
  // console.log("Binario ",elffile);
  // scriptld = document.getElementById('ld-new');
    // if(scriptld){
  clean_environment();
  scriptld.parentNode.removeChild(scriptld);
  // }

  // Se carga el script ld.js para ejecutar el enlazador.
  scriptdump = document.createElement('script');
  scriptdump.src = window.location.href +'js/toolchain_compiler/objdump.js';
  scriptdump.async = true;
  scriptdump.id = 'objdump';
  scriptdump.type = 'text/javascript';
  document.head.appendChild(scriptdump);
  // dissamble_binary();

}



function bi_intToBigInt(int_value, int_base) {
  return BigInt(parseInt(int_value) >>> 0, int_base);
}
function bi_floatToBigInt(float_value) {
  var BigInt_value = null;
  var bin = float2bin(float_value);
  var hex = bin2hex(bin);
  BigInt_value = BigInt("0x" + hex);
  return BigInt_value;
}
function bi_BigIntTofloat(big_int_value) {
  var hex = big_int_value.toString(16);
  if (hex.length > 8) {
    hex = hex.substring(hex.length - 8, hex.length);
  }
  return hex2float("0x" + hex);
}
function bi_doubleToBigInt(double_value) {
  var BigInt_value = null;
  var bin = double2bin(double_value);
  var hex = bin2hex(bin);
  BigInt_value = BigInt("0x" + hex);
  return BigInt_value;
}
function bi_BigIntTodouble(big_int_value) {
  var hex = big_int_value.toString(16).padStart(16, "0");
  return hex2double("0x" + hex);
}
function register_value_deserialize(architecture) {
  for (var i = 0; i < architecture.components.length; i++) {
    for (var j = 0; j < architecture.components[i].elements.length; j++) {
      if (architecture.components[i].type != "fp_registers") {
        architecture.components[i].elements[j].value = bi_intToBigInt(
          architecture.components[i].elements[j].value,
          10,
        );
      } else {
        architecture.components[i].elements[j].value = bi_floatToBigInt(
          architecture.components[i].elements[j].value,
        );
      }
      if (architecture.components[i].double_precision !== true) {
        if (architecture.components[i].type != "fp_registers") {
          architecture.components[i].elements[j].default_value = bi_intToBigInt(
            architecture.components[i].elements[j].default_value,
            10,
          );
        } else {
          architecture.components[i].elements[j].default_value =
            bi_floatToBigInt(
              architecture.components[i].elements[j].default_value,
            );
        }
      }
    }
  }
  return architecture;
}
function register_value_serialize(architecture) {
  var aux_architecture = jQuery.extend(true, {}, architecture);
  for (var i = 0; i < architecture.components.length; i++) {
    for (var j = 0; j < architecture.components[i].elements.length; j++) {
      if (architecture.components[i].type != "fp_registers") {
        aux_architecture.components[i].elements[j].value = parseInt(
          architecture.components[i].elements[j].value,
        );
      } else {
        aux_architecture.components[i].elements[j].value = bi_BigIntTofloat(
          architecture.components[i].elements[j].value,
        );
      }
      if (architecture.components[i].double_precision !== true) {
        if (architecture.components[i].type != "fp_registers") {
          aux_architecture.components[i].elements[j].default_value = parseInt(
            architecture.components[i].elements[j].default_value,
          );
        } else {
          aux_architecture.components[i].elements[j].default_value =
            bi_BigIntTofloat(
              architecture.components[i].elements[j].default_value,
            );
        }
      }
    }
  }
  return aux_architecture;
}
var is_ga_initialize = false;
function creator_ga(category, action, label) {
  if (typeof gtag !== "undefined") {
    gtag("event", label, {
      event_category: "creator_" + category,
      event_action: action,
      event_label: label,
    });
  }
}
function preload_load_example(data, url) {
  if (url == null) {
    show_notification("The example doesn't exist", "info");
    return;
  }
  code_assembly = data;
  uielto_toolbar_btngroup.methods.assembly_compiler(code_assembly);
  show_notification(" The selected example has been loaded.", "success");
  creator_ga("example", "example.loading", "example.loading." + url);
}
function preload_find_example(example_set_available, hash) {
  for (var i = 0; i < example_set_available.length; i++) {
    for (
      var j = 0;
      j < example_available[i].length &&
      example_set_available[i].text == hash.example_set;
      j++
    ) {
      if (example_available[i][j].id === hash.example) {
        return example_available[i][j].url;
      }
    }
  }
  return null;
}
function preload_find_architecture(arch_availables, arch_name) {
  for (var i = 0; i < arch_availables.length; i++) {
    if (arch_availables[i].alias.includes(arch_name)) {
      return arch_availables[i];
    }
  }
  return null;
}
function preload_example_uri(asm_decoded) {
  if (asm_decoded == null) {
    show_notification("Assembly not valid", "info");
    return;
  }
  code_assembly = asm_decoded;
  uielto_toolbar_btngroup.methods.assembly_compiler(code_assembly);
  show_notification("The assembly code has been loaded.", "success");
  creator_ga("example", "example.loading", "example.uri");
}
var creator_preload_tasks = [
  {
    name: "architecture",
    action: function (app, hash) {
      var arch_name = hash.architecture.trim();
      if (arch_name === "") {
        return new Promise(function (resolve, reject) {
          resolve("Empty architecture.");
        });
      }
      return $.getJSON(
        "architecture/available_arch.json",
        function (arch_availables) {
          var a_i = preload_find_architecture(arch_availables, arch_name);
          uielto_preload_architecture.methods.load_arch_select(a_i);
          return "Architecture loaded.";
        },
      );
    },
  },
  {
    name: "example_set",
    action: function (app, hash) {
      var exa_set = hash.example_set.trim();
      if (exa_set === "") {
        return new Promise(function (resolve, reject) {
          resolve("Empty example set.");
        });
      }
      uielto_preload_architecture.methods.load_examples_available(
        hash.example_set,
      );
      return uielto_preload_architecture.data.example_loaded;
    },
  },
  {
    name: "example",
    action: function (app, hash) {
      return new Promise(function (resolve, reject) {
        var url = preload_find_example(example_set_available, hash);
        if (null == url) {
          reject("Example not found.");
        }
        $.get(url, function (data) {
          preload_load_example(data, url);
        });
        resolve("Example loaded.");
      });
    },
  },
  {
    name: "asm",
    action: function (app, hash) {
      return new Promise(function (resolve, reject) {
        var assembly = hash.asm.trim();
        if (assembly === "") {
          return new Promise(function (resolve, reject) {
            resolve("Empty assembly.");
          });
        }
        var asm_decoded = decodeURI(assembly);
        preload_example_uri(asm_decoded);
        resolve("Assembly loaded.");
      });
    },
  },
];
function creator_preload_get2hash(window_location) {
  var hash = {};
  var hash_field = "";
  var uri_obj = null;
  if (typeof window_location === "undefined") {
    return hash;
  }
  var parameters = new URL(window_location).searchParams;
  for (i = 0; i < creator_preload_tasks.length; i++) {
    hash_field = creator_preload_tasks[i].name;
    hash[hash_field] = parameters.get(hash_field);
    if (hash[hash_field] === null) {
      hash[hash_field] = "";
    }
  }
  return hash;
}
async function creator_preload_fromHash(app, hash) {
  var key = "";
  var act = function () {};
  var o = "";
  for (var i = 0; i < creator_preload_tasks.length; i++) {
    key = creator_preload_tasks[i].name;
    act = creator_preload_tasks[i].action;
    if (hash[key] !== "") {
      try {
        var v = await act(app, hash);
        o = o + v + "<br>";
      } catch (e) {
        o = o + e + "<br>";
      }
    }
  }
  return o;
}
function checkTypeIEEE(s, e, m) {
  let rd = 0;
  if (!m && !e) rd = s ? 1 << 3 : 1 << 4;
  else if (!e) rd = s ? 1 << 2 : 1 << 5;
  else if (!(e ^ 255))
    if (m) rd = s ? 1 << 8 : 1 << 9;
    else rd = s ? 1 << 0 : 1 << 7;
  else rd = s ? 1 << 1 : 1 << 6;
  return rd;
}
function hex2char8(hexvalue) {
  var num_char = hexvalue.toString().length / 2;
  var exponent = 0;
  var pos = 0;
  var valuec = [];
  for (var i = 0; i < num_char; i++) {
    var auxHex = hexvalue.substring(pos, pos + 2);
    valuec[i] = String.fromCharCode(parseInt(auxHex, 16));
    pos = pos + 2;
  }
  var characters = "";
  for (var i = 0; i < valuec.length; i++) {
    characters = characters + valuec[i] + " ";
  }
  return characters;
}
function hex2float(hexvalue) {
  var value = hexvalue.split("x");
  if (typeof value[1] != "undefined" && value[1].length > 8) {
    value[1] = value[1].substring(0, 8);
  }
  var value_bit = "";
  for (var i = 0; i < value[1].length; i++) {
    var aux = value[1].charAt(i);
    aux = parseInt(aux, 16).toString(2).padStart(4, "0");
    value_bit = value_bit + aux;
  }
  value_bit = value_bit.padStart(32, "0");
  var buffer = new ArrayBuffer(4);
  new Uint8Array(buffer).set(value_bit.match(/.{8}/g).map(binaryStringToInt));
  return new DataView(buffer).getFloat32(0, false);
}
function uint_to_float32(value) {
  var buf = new ArrayBuffer(4);
  new Uint32Array(buf)[0] = value;
  return new Float32Array(buf)[0];
}
function float32_to_uint(value) {
  var buf = new ArrayBuffer(4);
  new Float32Array(buf)[0] = value;
  return new Uint32Array(buf)[0];
}
function uint_to_float64(value0, value1) {
  var buf = new ArrayBuffer(8);
  var arr = new Uint32Array(buf);
  arr[0] = value0;
  arr[1] = value1;
  return new Float64Array(buf)[0];
}
function float64_to_uint(value) {
  var buf = new ArrayBuffer(8);
  new Float64Array(buf)[0] = value;
  return new Uint32Array(buf);
}
function float2bin(number) {
  var i,
    result = "";
  var dv = new DataView(new ArrayBuffer(4));
  dv.setFloat32(0, number, false);
  for (i = 0; i < 4; i++) {
    var bits = dv.getUint8(i).toString(2);
    if (bits.length < 8) {
      bits = new Array(8 - bits.length).fill("0").join("") + bits;
    }
    result += bits;
  }
  return result;
}
function double2bin(number) {
  var i,
    result = "";
  var dv = new DataView(new ArrayBuffer(8));
  dv.setFloat64(0, number, false);
  for (i = 0; i < 8; i++) {
    var bits = dv.getUint8(i).toString(2);
    if (bits.length < 8) {
      bits = new Array(8 - bits.length).fill("0").join("") + bits;
    }
    result += bits;
  }
  return result;
}
function bin2hex(s) {
  var i,
    k,
    part,
    accum,
    ret = "";
  for (i = s.length - 1; i >= 3; i -= 4) {
    part = s.substr(i + 1 - 4, 4);
    accum = 0;
    for (k = 0; k < 4; k += 1) {
      if (part[k] !== "0" && part[k] !== "1") {
        return { valid: false };
      }
      accum = accum * 2 + parseInt(part[k], 10);
    }
    if (accum >= 10) {
      ret = String.fromCharCode(accum - 10 + "A".charCodeAt(0)) + ret;
    } else {
      ret = String(accum) + ret;
    }
  }
  if (i >= 0) {
    accum = 0;
    for (k = 0; k <= i; k += 1) {
      if (s[k] !== "0" && s[k] !== "1") {
        return { valid: false };
      }
      accum = accum * 2 + parseInt(s[k], 10);
    }
    ret = String(accum) + ret;
  }
  return ret;
}
function hex2double(hexvalue) {
  var value = hexvalue.split("x");
  var value_bit = "";
  for (var i = 0; i < value[1].length; i++) {
    var aux = value[1].charAt(i);
    aux = parseInt(aux, 16).toString(2).padStart(4, "0");
    value_bit = value_bit + aux;
  }
  value_bit = value_bit.padStart(64, "0");
  var buffer = new ArrayBuffer(8);
  new Uint8Array(buffer).set(value_bit.match(/.{8}/g).map(binaryStringToInt));
  return new DataView(buffer).getFloat64(0, false);
}
function float2int_v2(value) {
  return parseInt(float2bin(value), 2);
}
function double2int_v2(value) {
  return parseInt(double2bin(value), 2);
}
function int2float_v2(value) {
  return hex2float("0x" + bin2hex(value.toString(2)));
}
function full_print(value, bin_value, add_dot_zero) {
  var print_value = value;
  if (bin_value != null && value === 0 && bin_value[0] === 1) {
    print_value = "-" + print_value;
  }
  if (add_dot_zero) {
    var aux_value = value.toString();
    if (aux_value.indexOf(".") == -1 && Number.isInteger(aux_value)) {
      print_value = print_value + ".0";
    }
  }
  return print_value;
}
function clean_string(value, prefix) {
  var value2 = value.replace(/[&\/\\#,+()$~%.'":*?<>{}]/g, "_");
  re = new RegExp("^[0-9]+$");
  if (value2.search(re) != -1 && prefix != "undefined") {
    value2 = prefix + value2;
  }
  return value2;
}
var track_stack_names = [];
var track_stack_limits = [];
function track_stack_create() {
  var ret = { ok: true, msg: "" };
  track_stack_names = [];
  track_stack_limits = [];
  track_stack_enter("main");
  return ret;
}
function track_stack_enter(function_name) {
  var ret = { ok: true, msg: "" };
  track_stack_names.push(function_name);
  var new_elto = {
    function_name: function_name,
    begin_caller: track_stack_getTop().val.begin_callee,
    end_caller: track_stack_getTop().val.end_callee,
    begin_callee: architecture.memory_layout[4].value,
    end_callee: architecture.memory_layout[4].value,
  };
  track_stack_limits.push(new_elto);
  if (typeof window !== "undefined") {
    app._data.callee_subrutine =
      track_stack_names[track_stack_names.length - 1];
    app._data.caller_subrutine =
      track_stack_names[track_stack_names.length - 2];
    app._data.begin_caller = new_elto.begin_caller;
    app._data.end_caller = new_elto.end_caller;
    app._data.begin_callee = new_elto.begin_callee;
    app._data.end_callee = new_elto.end_callee;
  }
  return ret;
}
function track_stack_leave() {
  var ret = { ok: true, msg: "" };
  if (0 === track_stack_limits.length) {
    ret.msg = "track_stack_Leave: empty track_stack_limits !!.\n";
    return ret;
  }
  track_stack_limits.pop();
  if (track_stack_names.length > 0) {
    track_stack_names.pop();
  }
  var elto_top = track_stack_getTop();
  if (typeof window !== "undefined" && elto_top.val != null) {
    app._data.callee_subrutine =
      track_stack_names[track_stack_names.length - 1];
    app._data.caller_subrutine =
      track_stack_names[track_stack_names.length - 2];
    app._data.begin_caller = elto_top.val.begin_caller;
    app._data.end_caller = elto_top.val.end_caller;
    app._data.begin_callee = elto_top.val.begin_callee;
    app._data.end_callee = elto_top.val.end_callee;
  }
  return ret;
}
function track_stack_getTop() {
  var ret = {
    ok: true,
    val: {
      begin_caller: architecture.memory_layout[4].value,
      end_caller: architecture.memory_layout[4].value,
      begin_callee: architecture.memory_layout[4].value,
      end_callee: architecture.memory_layout[4].value,
    },
    msg: "",
  };
  if (0 === track_stack_limits.length) {
    ret.ok = false;
    ret.msg = "track_stack_getTop: empty track_stack_limits !!.\n";
    return ret;
  }
  ret.val = track_stack_limits[track_stack_limits.length - 1];
  if (typeof ret.val.begin_caller === "undefined") {
    ret.val.begin_caller = architecture.memory_layout[4].value;
  }
  return ret;
}
function track_stack_setTop(field, indexComponent, indexElement, value) {
  var ret = { ok: true, msg: "" };
  if (0 === track_stack_limits.length) {
    ret.ok = false;
    ret.msg = "track_stack_getTop: empty track_stack_limits !!.\n";
    return ret;
  }
  var elto = track_stack_limits[track_stack_limits.length - 1];
  if (typeof elto.length !== "undefined") {
    elto[field][indexComponent][indexElement] = value;
    return ret;
  }
  elto[field] = value;
  return ret;
}
function track_stack_setsp(value) {
  if (typeof window !== "undefined") {
    app._data.end_callee = value;
  }
  if (0 === track_stack_limits.length) {
    return;
  }
  var elto = track_stack_limits[track_stack_limits.length - 1];
  elto.end_callee = value;
}
function track_stack_reset() {
  var ret = { ok: true, msg: "" };
  track_stack_names = [];
  track_stack_limits = [];
  track_stack_enter("main");
  if (typeof window !== "undefined") {
    app._data.track_stack_names = track_stack_names;
    app._data.callee_subrutine =
      track_stack_names[track_stack_names.length - 1];
    app._data.caller_subrutine = "";
    app._data.begin_caller = architecture.memory_layout[4].value;
    app._data.end_caller = architecture.memory_layout[4].value;
    app._data.begin_callee = architecture.memory_layout[4].value;
    app._data.end_callee = architecture.memory_layout[4].value;
  }
  return ret;
}
var stack_call_names = [];
var stack_state_transition = [
  { "wm==": 1, "wm!=": 1, rm: 2, wr: 40, rr: 0, end: 3 },
  { "wm==": 1, "wm!=": 7, rm: 6, wr: 5, rr: 1, end: 40 },
  { "wm==": 1, "wm!=": 1, rm: 2, wr: 45, rr: 2, end: 3 },
  { "wm==": -1, "wm!=": -1, rm: -1, wr: -1, rr: -1, end: -1 },
  { "wm==": -1, "wm!=": -1, rm: -1, wr: -1, rr: -1, end: -1 },
  { "wm==": 44, "wm!=": 5, rm: 6, wr: 5, rr: 5, end: 43 },
  { "wm==": 44, "wm!=": 6, rm: 6, wr: 0, rr: 6, end: 43 },
  { "wm==": 7, "wm!=": 7, rm: 6, wr: 5, rr: 7, end: 42 },
];
var stack_call_register = [];
function creator_callstack_create() {
  var ret = { ok: true, msg: "" };
  stack_call_names = [];
  stack_call_register = [];
  creator_callstack_enter("main");
  return ret;
}
function creator_callstack_enter(function_name) {
  var ret = { ok: true, msg: "" };
  stack_call_names.push(function_name);
  var arr_sm = [];
  var arr_write = [];
  var arr_read = [];
  var arr_value = [];
  var arr_size_write = [];
  var arr_size_read = [];
  for (var i = 0; i < architecture.components.length; i++) {
    arr_sm.push([]);
    arr_write.push([]);
    arr_read.push([]);
    arr_value.push([]);
    arr_size_write.push([]);
    arr_size_read.push([]);
    for (var j = 0; j < architecture.components[i].elements.length; j++) {
      arr_sm[i].push(0);
      arr_write[i].push([]);
      arr_read[i].push([]);
      arr_size_write[i].push([]);
      arr_size_read[i].push([]);
      arr_value[i].push(architecture.components[i].elements[j].value);
    }
  }
  var new_elto = {
    function_name: function_name,
    enter_stack_pointer: architecture.memory_layout[4].value,
    register_sm: arr_sm,
    register_value: arr_value,
    register_size_write: arr_size_write,
    register_size_read: arr_size_read,
    register_address_write: arr_write,
    register_address_read: arr_read,
  };
  stack_call_register.push(new_elto);
  return ret;
}
function creator_callstack_leave() {
  var ret = { ok: true, msg: "" };
  if (0 === stack_call_register.length) {
    ret.msg = "creator_callstack_Leave: empty stack_call_register !!.\n";
    return ret;
  }
  var last_elto = stack_call_register[stack_call_register.length - 1];
  if (ret.ok) {
    if (architecture.memory_layout[4].value != last_elto.enter_stack_pointer) {
      ret.ok = false;
      ret.msg = "Stack memory has not been released successfully";
    }
  }
  if (ret.ok) {
    for (var i = 0; i < architecture.components.length; i++) {
      for (var j = 0; j < architecture.components[i].elements.length; j++) {
        if (
          last_elto.register_value[i][j] !=
            architecture.components[i].elements[j].value &&
          architecture.components[i].elements[j].properties.includes("saved")
        ) {
          ret.ok = false;
          ret.msg = "Possible failure in the parameter passing convention";
          break;
        }
      }
    }
  }
  if (ret.ok) {
    for (var i = 0; i < architecture.components.length; i++) {
      for (var j = 0; j < architecture.components[i].elements.length; j++) {
        creator_callstack_do_transition("end", i, j, null);
        last_elto = stack_call_register[stack_call_register.length - 1];
        last_index_read = last_elto.register_address_read[i][j].length - 1;
        if (
          last_elto.register_address_write[i][j][0] ==
            last_elto.register_address_read[i][j][last_index_read] &&
          last_elto.register_sm[i][j] === 45 &&
          architecture.components[i].elements[j].properties.includes("saved")
        ) {
          break;
        } else if (
          last_elto.register_sm[i][j] !== 3 &&
          architecture.components[i].elements[j].properties.includes("saved")
        ) {
          ret.ok = false;
          ret.msg = "Possible failure in the parameter passing convention";
          break;
        }
      }
    }
  }
  if (ret.ok) {
    for (var i = 0; i < architecture.components.length; i++) {
      for (var j = 0; j < architecture.components[i].elements.length; j++) {
        last_index_read = last_elto.register_address_read[i][j].length - 1;
        if (
          last_elto.register_address_write[i][j][0] !=
            last_elto.register_address_read[i][j][last_index_read] &&
          architecture.components[i].elements[j].properties.includes("saved")
        ) {
          ret.ok = false;
          ret.msg = "Possible failure in the parameter passing convention";
          break;
        }
      }
    }
  }
  if (ret.ok) {
    for (var i = 0; i < architecture.components.length; i++) {
      for (var j = 0; j < architecture.components[i].elements.length; j++) {
        last_index_read = last_elto.register_size_read[i][j].length - 1;
        if (
          last_elto.register_size_write[i][j][0] !=
            last_elto.register_size_read[i][j][last_index_read] &&
          architecture.components[i].elements[j].properties.includes("saved")
        ) {
          ret.ok = false;
          ret.msg = "Possible failure in the parameter passing convention";
          break;
        }
      }
    }
  }
  stack_call_register.pop();
  if (stack_call_names.length > 0) {
    stack_call_names.pop();
  }
  return ret;
}
function creator_callstack_getTop() {
  var ret = { ok: true, val: null, msg: "" };
  if (0 === stack_call_register.length) {
    ret.ok = false;
    ret.msg = "creator_callstack_getTop: empty stack_call_register !!.\n";
    return ret;
  }
  ret.val = stack_call_register[stack_call_register.length - 1];
  return ret;
}
function creator_callstack_setTop(field, indexComponent, indexElement, value) {
  var ret = { ok: true, msg: "" };
  if (0 === stack_call_register.length) {
    ret.ok = false;
    ret.msg = "creator_callstack_getTop: empty stack_call_register !!.\n";
    return ret;
  }
  var elto = stack_call_register[stack_call_register.length - 1];
  if (typeof elto.length !== "undefined") {
    elto[field][indexComponent][indexElement] = value;
    return ret;
  }
  elto[field] = value;
  return ret;
}
function creator_callstack_setState(indexComponent, indexElement, newState) {
  var elto = creator_callstack_getTop();
  if (elto.ok === false) {
    console_log("creator_callstack_setState: " + elto.msg);
    return "";
  }
  elto.val.register_sm[indexComponent][indexElement] = newState;
}
function creator_callstack_getState(indexComponent, indexElement) {
  var elto = creator_callstack_getTop();
  if (elto.ok === false) {
    console_log("creator_callstack_getState: " + elto.msg);
    return "";
  }
  return elto.val.register_sm[indexComponent][indexElement];
}
function creator_callstack_newWrite(
  indexComponent,
  indexElement,
  address,
  length,
) {
  creator_callstack_do_transition("wm", indexComponent, indexElement, address);
  var elto = creator_callstack_getTop();
  if (elto.ok == false) {
    console_log("creator_callstack_newWrite: " + elto.msg);
    return "";
  }
  elto.val.register_address_write[indexComponent][indexElement].push(address);
  elto.val.register_size_write[indexComponent][indexElement].push(length);
}
function creator_callstack_newRead(
  indexComponent,
  indexElement,
  address,
  length,
) {
  var elto = creator_callstack_getTop();
  if (elto.ok == false) {
    console_log("creator_callstack_newRead: " + elto.msg);
    return "";
  }
  elto.val.register_address_read[indexComponent][indexElement].push(address);
  elto.val.register_size_read[indexComponent][indexElement].push(length);
  creator_callstack_do_transition("rm", indexComponent, indexElement, address);
}
function creator_callstack_writeRegister(indexComponent, indexElement) {
  creator_callstack_do_transition("wr", indexComponent, indexElement, address);
}
function creator_callstack_reset() {
  var ret = { ok: true, msg: "" };
  stack_call_names = [];
  stack_call_register = [];
  creator_callstack_enter("main");
  return ret;
}
function creator_callstack_do_transition(
  doAction,
  indexComponent,
  indexElement,
  address,
) {
  var state = creator_callstack_getState(indexComponent, indexElement);
  var action = doAction;
  if (doAction == "wm") {
    var elto = creator_callstack_getTop();
    if (elto.ok == false) {
      console_log("creator_callstack_do_transition: " + elto.msg);
      return "";
    }
    var equal =
      elto.val.register_address_write[indexComponent][indexElement].includes(
        address,
      );
    action = equal ? "wm==" : "wm!=";
  }
  if (doAction == "rm") {
    var elto = creator_callstack_getTop();
    if (elto.ok == false) {
      console_log("creator_callstack_do_transition: " + elto.msg);
      return "";
    }
    var equal =
      elto.val.register_address_write[indexComponent][indexElement].includes(
        address,
      );
    if (equal == false) {
      return;
    }
  }
  if (
    typeof stack_state_transition[state] === "undefined" ||
    typeof stack_state_transition[state][action] === "undefined"
  ) {
    if (state < 40 || state < 0) {
      console_log("creator_callstack_do_transition: undefined action");
    }
    return;
  }
  var new_state = stack_state_transition[state][action];
  creator_callstack_setState(indexComponent, indexElement, new_state);
  if (action != "end") {
    console_log(
      "creator_callstack_do_transition [" +
        architecture.components[indexComponent].elements[indexElement].name +
        "]: transition from " +
        "state '" +
        state +
        "'' to state '" +
        new_state +
        "' and action '" +
        action +
        "' is empty (warning).",
    );
  }
}
function capi_raise(msg) {
  if (typeof app !== "undefined") {
    app.exception(msg);
  } else {
    console.log(msg);
  }
}
function capi_arithmetic_overflow(op1, op2, res_u) {
  op1_u = capi_uint2int(op1);
  op2_u = capi_uint2int(op2);
  res_u = capi_uint2int(res_u);
  return (
    (op1_u > 0 && op2_u > 0 && res_u < 0) ||
    (op1_u < 0 && op2_u < 0 && res_u > 0)
  );
}
function capi_bad_align(addr, type) {
  size = creator_memory_type2size(type);
  return addr % size !== 0;
}
function capi_mem_write(addr, value, type, reg_name) {
  var size = 1;
  if (capi_bad_align(addr, type)) {
    capi_raise("The memory must be align");
    creator_executor_exit(true);
  }
  var addr_16 = parseInt(addr, 16);
  if (
    addr_16 >= parseInt(architecture.memory_layout[0].value) &&
    addr_16 <= parseInt(architecture.memory_layout[1].value)
  ) {
    capi_raise("Segmentation fault. You tried to write in the text segment");
    creator_executor_exit(true);
  }
  try {
    writeMemory(value, addr, type);
  } catch (e) {
    capi_raise(
      "Invalid memory access to address '0x" + addr.toString(16) + "'",
    );
    creator_executor_exit(true);
  }
  var ret = crex_findReg(reg_name);
  if (ret.match === 0) {
    return;
  }
  var i = ret.indexComp;
  var j = ret.indexElem;
  creator_callstack_newWrite(i, j, addr, type);
}
function capi_mem_read(addr, type, reg_name) {
  var size = 1;
  var val = 0;
  if (capi_bad_align(addr, type)) {
    capi_raise("The memory must be align");
    creator_executor_exit(true);
  }
  var addr_16 = parseInt(addr, 16);
  if (
    addr_16 >= parseInt(architecture.memory_layout[0].value) &&
    addr_16 <= parseInt(architecture.memory_layout[1].value)
  ) {
    capi_raise("Segmentation fault. You tried to read in the text segment");
    creator_executor_exit(true);
  }
  try {
    val = readMemory(addr, type);
  } catch (e) {
    capi_raise(
      "Invalid memory access to address '0x" + addr.toString(16) + "'",
    );
    creator_executor_exit(true);
  }
  var ret = creator_memory_value_by_type(val, type);
  var find_ret = crex_findReg(reg_name);
  if (find_ret.match === 0) {
    return ret;
  }
  var i = find_ret.indexComp;
  var j = find_ret.indexElem;
  creator_callstack_newRead(i, j, addr, type);
  return ret;
}
function capi_exit() {
  creator_ga("execute", "execute.syscall", "execute.syscall.exit");
  return creator_executor_exit(false);
}
function capi_print_int(value1) {
  creator_ga("execute", "execute.syscall", "execute.syscall.print_int");
  var ret1 = crex_findReg(value1);
  if (ret1.match === 0) {
    throw packExecute(
      true,
      "capi_syscall: register " + value1 + " not found",
      "danger",
      null,
    );
  }
  var value = readRegister(ret1.indexComp, ret1.indexElem);
  var val_int = parseInt(value.toString()) >> 0;
  var value = readRegister(ret1.indexComp, ret1.indexElem);
  var val_int = parseInt(value.toString()) >> 0;
  display_print(full_print(val_int, null, false));
}
function capi_print_float(value1) {
  creator_ga("execute", "execute.syscall", "execute.syscall.print_float");
  var ret1 = crex_findReg(value1);
  if (ret1.match == 0) {
    throw packExecute(
      true,
      "capi_syscall: register " + value1 + " not found",
      "danger",
      null,
    );
  }
  var value = readRegister(ret1.indexComp, ret1.indexElem, "SFP-Reg");
  var bin = float2bin(value);
  display_print(full_print(value, bin, true));
}
function capi_print_double(value1) {
  creator_ga("execute", "execute.syscall", "execute.syscall.print_double");
  var ret1 = crex_findReg(value1);
  if (ret1.match == 0) {
    throw packExecute(
      true,
      "capi_syscall: register " + value1 + " not found",
      "danger",
      null,
    );
  }
  var value = readRegister(ret1.indexComp, ret1.indexElem, "DFP-Reg");
  var bin = double2bin(value);
  display_print(full_print(value, bin, true));
}
function capi_print_char(value1) {
  creator_ga("execute", "execute.syscall", "execute.syscall.print_char");
  var ret1 = crex_findReg(value1);
  if (ret1.match == 0) {
    throw packExecute(
      true,
      "capi_syscall: register " + value1 + " not found",
      "danger",
      null,
    );
  }
  var aux = readRegister(ret1.indexComp, ret1.indexElem);
  var aux2 = aux.toString(16);
  var length = aux2.length;
  var value = aux2.substring(length - 2, length);
  value = String.fromCharCode(parseInt(value, 16));
  display_print(value);
}
function capi_print_string(value1) {
  creator_ga("execute", "execute.syscall", "execute.syscall.print_string");
  var ret1 = crex_findReg(value1);
  if (ret1.match == 0) {
    throw packExecute(
      true,
      "capi_syscall: register " + value1 + " not found",
      "danger",
      null,
    );
  }
  var addr = readRegister(ret1.indexComp, ret1.indexElem);
  var msg = readMemory(parseInt(addr), "string");
  display_print(msg);
}
function capi_read_int(value1) {
  creator_ga("execute", "execute.syscall", "execute.syscall.read_int");
  var ret1 = crex_findReg(value1);
  if (ret1.match == 0) {
    throw packExecute(
      true,
      "capi_syscall: register " + value1 + " not found",
      "danger",
      null,
    );
  }
  if (typeof document != "undefined") {
    document.getElementById("enter_keyboard").scrollIntoView();
  }
  run_program = 3;
  return keyboard_read(kbd_read_int, ret1);
}
function capi_read_float(value1) {
  creator_ga("execute", "execute.syscall", "execute.syscall.read_float");
  var ret1 = crex_findReg(value1);
  if (ret1.match == 0) {
    throw packExecute(
      true,
      "capi_syscall: register " + value1 + " not found",
      "danger",
      null,
    );
  }
  if (typeof document != "undefined") {
    document.getElementById("enter_keyboard").scrollIntoView();
  }
  run_program = 3;
  return keyboard_read(kbd_read_float, ret1);
}
function capi_read_double(value1) {
  creator_ga("execute", "execute.syscall", "execute.syscall.read_double");
  var ret1 = crex_findReg(value1);
  if (ret1.match == 0) {
    throw packExecute(
      true,
      "capi_syscall: register " + value1 + " not found",
      "danger",
      null,
    );
  }
  if (typeof document != "undefined") {
    document.getElementById("enter_keyboard").scrollIntoView();
  }
  run_program = 3;
  return keyboard_read(kbd_read_double, ret1);
}
function capi_read_char(value1) {
  creator_ga("execute", "execute.syscall", "execute.syscall.read_char");
  var ret1 = crex_findReg(value1);
  if (ret1.match == 0) {
    throw packExecute(
      true,
      "capi_syscall: register " + value1 + " not found",
      "danger",
      null,
    );
  }
  if (typeof document != "undefined") {
    document.getElementById("enter_keyboard").scrollIntoView();
  }
  run_program = 3;
  return keyboard_read(kbd_read_char, ret1);
}
function capi_read_string(value1, value2) {
  creator_ga("execute", "execute.syscall", "execute.syscall.read_string");
  var ret1 = crex_findReg(value1);
  if (ret1.match === 0) {
    throw packExecute(
      true,
      "capi_syscall: register " + value1 + " not found",
      "danger",
      null,
    );
  }
  var ret2 = crex_findReg(value2);
  if (ret2.match === 0) {
    throw packExecute(
      true,
      "capi_syscall: register " + value2 + " not found",
      "danger",
      null,
    );
  }
  if (typeof document != "undefined") {
    document.getElementById("enter_keyboard").scrollIntoView();
  }
  ret1.indexComp2 = ret2.indexComp;
  ret1.indexElem2 = ret2.indexElem;
  run_program = 3;
  return keyboard_read(kbd_read_string, ret1);
}
function capi_sbrk(value1, value2) {
  creator_ga("execute", "execute.syscall", "execute.syscall.sbrk");
  var ret1 = crex_findReg(value1);
  if (ret1.match === 0) {
    throw packExecute(
      true,
      "capi_syscall: register " + value1 + " not found",
      "danger",
      null,
    );
  }
  var ret2 = crex_findReg(value2);
  if (ret2.match === 0) {
    throw packExecute(
      true,
      "capi_syscall: register " + value2 + " not found",
      "danger",
      null,
    );
  }
  var new_size = parseInt(readRegister(ret1.indexComp, ret1.indexElem));
  if (new_size < 0) {
    throw packExecute(true, "capi_syscall: negative size", "danger", null);
  }
  var new_addr = creator_memory_alloc(new_size);
  writeRegister(new_addr, ret2.indexComp, ret2.indexElem);
}
function capi_get_clk_cycles() {
  creator_ga("execute", "execute.syscall", "execute.syscall.get_clk_cycles");
  return total_clk_cycles;
}
function capi_callconv_begin(addr) {
  var function_name = "";
  if (architecture.arch_conf[6].value === 0) {
    return;
  }
  if (typeof architecture.components[0] !== "undefined") {
    if (typeof tag_instructions[addr] === "undefined")
      function_name = "0x" + parseInt(addr).toString(16);
    else function_name = tag_instructions[addr];
  }
  creator_callstack_enter(function_name);
}
function capi_callconv_end() {
  if (architecture.arch_conf[6].value === 0) {
    return;
  }
  var ret = creator_callstack_leave();
  if (ret.ok) {
    return;
  }
  creator_ga(
    "execute",
    "execute.exception",
    "execute.exception.protection_jrra" + ret.msg,
  );
  crex_show_notification(ret.msg, "danger");
}
function capi_drawstack_begin(addr) {
  var function_name = "";
  if (typeof architecture.components[0] !== "undefined") {
    if (typeof tag_instructions[addr] == "undefined")
      function_name = "0x" + parseInt(addr).toString(16);
    else function_name = tag_instructions[addr];
  }
  track_stack_enter(function_name);
}
function capi_drawstack_end() {
  var ret = track_stack_leave();
  if (ret.ok) {
    return;
  }
  crex_show_notification(ret.msg, "warning");
}
function capi_split_double(reg, index) {
  var value = bin2hex(double2bin(reg));
  console_log(value);
  if (index === 0) {
    return value.substring(0, 8);
  }
  if (index === 1) {
    return value.substring(8, 16);
  }
}
function capi_uint2float32(value) {
  return uint_to_float32(value);
}
function capi_float322uint(value) {
  return float32_to_uint(value);
}
function capi_int2uint(value) {
  return value >>> 0;
}
function capi_uint2int(value) {
  return value >> 0;
}
function capi_uint2float64(value0, value1) {
  return uint_to_float64(value0, value1);
}
function capi_float642uint(value) {
  return float64_to_uint(value);
}
function capi_check_ieee(s, e, m) {
  return checkTypeIEEE(s, e, m);
}
function capi_float2bin(f) {
  return float2bin(f);
}
function crex_findReg(value1) {
  var ret = {};
  ret.match = 0;
  ret.indexComp = null;
  ret.indexElem = null;
  if (value1 == "") {
    return ret;
  }
  for (var i = 0; i < architecture.components.length; i++) {
    for (var j = 0; j < architecture.components[i].elements.length; j++) {
      if (
        architecture.components[i].elements[j].name.includes(value1) !== false
      ) {
        ret.match = 1;
        ret.indexComp = i;
        ret.indexElem = j;
        break;
      }
    }
  }
  return ret;
}
function crex_findReg_bytag(value1) {
  var ret = {};
  ret.match = 0;
  ret.indexComp = null;
  ret.indexElem = null;
  if (value1 == "") {
    return ret;
  }
  for (var i = 0; i < architecture.components.length; i++) {
    for (var j = 0; j < architecture.components[i].elements.length; j++) {
      if (
        architecture.components[i].elements[j].properties.includes(value1) !==
        false
      ) {
        ret.match = 1;
        ret.indexComp = i;
        ret.indexElem = j;
        break;
      }
    }
  }
  return ret;
}
function readRegister(indexComp, indexElem, register_type) {
  var draw = { space: [], info: [], success: [], danger: [], flash: [] };
  if (
    architecture.components[indexComp].elements[indexElem].properties.includes(
      "read",
    ) !== true
  ) {
    for (var i = 0; i < instructions.length; i++) {
      draw.space.push(i);
    }
    draw.danger.push(execution_index);
    throw packExecute(
      true,
      "The register " +
        architecture.components[indexComp].elements[indexElem].name.join(
          " | ",
        ) +
        " cannot be read",
      "danger",
      null,
    );
  }
  if (
    architecture.components[indexComp].type == "ctrl_registers" ||
    architecture.components[indexComp].type == "int_registers"
  ) {
    console_log(
      parseInt(architecture.components[indexComp].elements[indexElem].value),
    );
    return parseInt(
      architecture.components[indexComp].elements[indexElem].value,
    );
  }
  if (architecture.components[indexComp].type == "fp_registers") {
    if (architecture.components[indexComp].double_precision === false) {
      console_log(
        bi_BigIntTofloat(
          architecture.components[indexComp].elements[indexElem].value,
        ),
      );
      return bi_BigIntTofloat(
        architecture.components[indexComp].elements[indexElem].value,
      );
    } else {
      if (
        architecture.components[indexComp].double_precision_type == "linked"
      ) {
        console_log(
          bi_BigIntTodouble(
            architecture.components[indexComp].elements[indexElem].value,
          ),
        );
        return bi_BigIntTodouble(
          architecture.components[indexComp].elements[indexElem].value,
        );
      } else {
        if (typeof register_type === "undefined") {
          register_type = "DFP-Reg";
        }
        if (register_type === "SFP-Reg") {
          console_log(
            bi_BigIntTofloat(
              architecture.components[indexComp].elements[indexElem].value,
            ),
          );
          return bi_BigIntTofloat(
            architecture.components[indexComp].elements[indexElem].value,
          );
        }
        if (register_type === "DFP-Reg") {
          console_log(
            bi_BigIntTodouble(
              architecture.components[indexComp].elements[indexElem].value,
            ),
          );
          return bi_BigIntTodouble(
            architecture.components[indexComp].elements[indexElem].value,
          );
        }
      }
    }
  }
}
function writeRegister(value, indexComp, indexElem, register_type) {
  var draw = { space: [], info: [], success: [], danger: [], flash: [] };
  if (value == null) {
    return;
  }
  if (
    architecture.components[indexComp].type == "int_registers" ||
    architecture.components[indexComp].type == "ctrl_registers"
  ) {
    if (
      architecture.components[indexComp].elements[
        indexElem
      ].properties.includes("write") !== true
    ) {
      if (
        architecture.components[indexComp].elements[
          indexElem
        ].properties.includes("ignore_write") !== false
      ) {
        return;
      }
      for (var i = 0; i < instructions.length; i++) {
        draw.space.push(i);
      }
      draw.danger.push(execution_index);
      throw packExecute(
        true,
        "The register " +
          architecture.components[indexComp].elements[indexElem].name.join(
            " | ",
          ) +
          " cannot be written",
        "danger",
        null,
      );
    }
    architecture.components[indexComp].elements[indexElem].value =
      bi_intToBigInt(value, 10);
    creator_callstack_writeRegister(indexComp, indexElem);
    if (
      architecture.components[indexComp].elements[
        indexElem
      ].properties.includes("stack_pointer") !== false &&
      value != parseInt(architecture.memory_layout[4].value)
    ) {
      writeStackLimit(parseInt(bi_intToBigInt(value, 10)));
    }
    if (typeof window !== "undefined") {
      btn_glow(
        architecture.components[indexComp].elements[indexElem].name,
        "Int",
      );
    }
  } else if (architecture.components[indexComp].type == "fp_registers") {
    if (architecture.components[indexComp].double_precision === false) {
      if (
        architecture.components[indexComp].elements[
          indexElem
        ].properties.includes("write") !== true
      ) {
        if (
          architecture.components[indexComp].elements[
            indexElem
          ].properties.includes("ignore_write") !== false
        ) {
          return;
        }
        draw.danger.push(execution_index);
        throw packExecute(
          true,
          "The register " +
            architecture.components[indexComp].elements[indexElem].name.join(
              " | ",
            ) +
            " cannot be written",
          "danger",
          null,
        );
      }
      architecture.components[indexComp].elements[indexElem].value =
        bi_floatToBigInt(value);
      creator_callstack_writeRegister(indexComp, indexElem);
      if (
        architecture.components[indexComp].elements[
          indexElem
        ].properties.includes("stack_pointer") !== false &&
        value != parseInt(architecture.memory_layout[4].value)
      ) {
        writeStackLimit(parseFloat(value));
      }
      updateDouble(indexComp, indexElem);
      if (typeof window !== "undefined") {
        btn_glow(
          architecture.components[indexComp].elements[indexElem].name,
          "FP",
        );
      }
    } else if (architecture.components[indexComp].double_precision === true) {
      if (
        architecture.components[indexComp].elements[
          indexElem
        ].properties.includes("write") !== true
      ) {
        if (
          architecture.components[indexComp].elements[
            indexElem
          ].properties.includes("ignore_write") !== false
        ) {
          return;
        }
        draw.danger.push(execution_index);
        throw packExecute(
          true,
          "The register " +
            architecture.components[indexComp].elements[indexElem].name.join(
              " | ",
            ) +
            " cannot be written",
          "danger",
          null,
        );
      }
      if (
        architecture.components[indexComp].double_precision_type == "linked"
      ) {
        architecture.components[indexComp].elements[indexElem].value =
          bi_doubleToBigInt(value);
        updateSimple(indexComp, indexElem);
      } else {
        if (typeof register_type === "undefined") {
          register_type = "DFP-Reg";
        }
        if (register_type === "SFP-Reg") {
          architecture.components[indexComp].elements[indexElem].value =
            bi_floatToBigInt(value);
        }
        if (register_type === "DFP-Reg") {
          architecture.components[indexComp].elements[indexElem].value =
            bi_doubleToBigInt(value);
        }
      }
      creator_callstack_writeRegister(indexComp, indexElem);
      if (typeof window !== "undefined") {
        btn_glow(
          architecture.components[indexComp].elements[indexElem].name,
          "DFP",
        );
      }
    }
  }
}
function updateDouble(comp, elem) {
  for (var i = 0; i < architecture.components.length; i++) {
    if (
      architecture.components[i].double_precision === true &&
      architecture.components[i].double_precision_type == "linked"
    ) {
      for (var j = 0; j < architecture.components[i].elements.length; j++) {
        if (
          architecture.components[comp].elements[elem].name.includes(
            architecture.components[i].elements[j].simple_reg[0],
          ) !== false
        ) {
          var simple = bin2hex(float2bin(readRegister(comp, elem)));
          var double = bin2hex(double2bin(readRegister(i, j))).substr(8, 15);
          var newDouble = simple + double;
          architecture.components[i].elements[j].value = bi_doubleToBigInt(
            hex2double("0x" + newDouble),
          );
        }
        if (
          architecture.components[comp].elements[elem].name.includes(
            architecture.components[i].elements[j].simple_reg[1],
          ) !== false
        ) {
          var simple = bin2hex(float2bin(readRegister(comp, elem)));
          var double = bin2hex(double2bin(readRegister(i, j))).substr(0, 8);
          var newDouble = double + simple;
          architecture.components[i].elements[j].value = bi_doubleToBigInt(
            hex2double("0x" + newDouble),
          );
        }
      }
    }
  }
}
function updateSimple(comp, elem) {
  if (architecture.components[comp].double_precision_type == "linked") {
    var part1 = bin2hex(double2bin(readRegister(comp, elem))).substr(0, 8);
    var part2 = bin2hex(double2bin(readRegister(comp, elem))).substr(8, 15);
    for (var i = 0; i < architecture.components.length; i++) {
      for (var j = 0; j < architecture.components[i].elements.length; j++) {
        if (
          architecture.components[i].elements[j].name.includes(
            architecture.components[comp].elements[elem].simple_reg[0],
          ) !== false
        ) {
          architecture.components[i].elements[j].value = bi_floatToBigInt(
            hex2float("0x" + part1),
          );
        }
        if (
          architecture.components[i].elements[j].name.includes(
            architecture.components[comp].elements[elem].simple_reg[1],
          ) !== false
        ) {
          architecture.components[i].elements[j].value = bi_floatToBigInt(
            hex2float("0x" + part2),
          );
        }
      }
    }
  }
}
var word_size_bits = 32;
var word_size_bytes = word_size_bits / 8;
var main_memory = [];
var main_memory_datatypes = {};
var memory_hash = ["data_memory", "instructions_memory", "stack_memory"];
function main_memory_get_addresses() {
  return Object.keys(main_memory).sort(function (a, b) {
    ia = parseInt(a);
    ib = parseInt(b);
    if (ia > ib) return -1;
    if (ib > ia) return 1;
    return 0;
  });
}
function main_memory_datatype_get_addresses() {
  return Object.keys(main_memory_datatypes).sort(function (a, b) {
    ia = parseInt(a);
    ib = parseInt(b);
    if (ia > ib) return -1;
    if (ib > ia) return 1;
    return 0;
  });
}
function main_memory_packs_forav(addr, value) {
  return {
    addr: addr,
    bin: value,
    def_bin: "00",
    tag: null,
    data_type: null,
    reset: true,
    break: false,
  };
}
function main_memory_datatypes_packs_foravt(addr, value, type, size) {
  var default_value = "00";
  if (typeof main_memory_datatypes[addr] !== "undefined") {
    default_value = main_memory_datatypes[addr].default_value;
  }
  return {
    address: addr,
    value: value,
    default: default_value,
    type: type,
    size: size,
  };
}
function main_memory_reset() {
  var i = 0;
  var addrs = main_memory_get_addresses();
  for (i = 0; i < addrs.length; i++) {
    main_memory[addrs[i]].bin = main_memory[addrs[i]].def_bin;
  }
  addrs = main_memory_datatype_get_addresses();
  for (i = 0; i < addrs.length; i++) {
    main_memory_datatypes[addrs[i]].value =
      main_memory_datatypes[addrs[i]].default;
  }
}
function main_memory_clear() {
  main_memory = [];
  main_memory_datatypes = {};
}
function main_memory_read(addr) {
  if (typeof main_memory[addr] !== "undefined") {
    return main_memory[addr];
  }
  return main_memory_packs_forav(addr, "00");
}
function main_memory_write(addr, value) {
  main_memory[addr] = value;
}
function main_memory_zerofill(addr, size) {
  var base = {
    addr: 0,
    bin: "00",
    def_bin: "00",
    tag: null,
    data_type: null,
    reset: true,
    break: false,
  };
  var value = Array(size)
    .fill(base)
    .map((x, i) => ({ ...x, addr: addr + i }));
  main_memory.splice(addr, size, ...value);
}
function main_memory_update_associated_datatype(addr, value, datatype) {
  var value = main_memory_read(addr);
  value.main_memory_datatypes = datatype;
  main_memory[addr] = value;
}
function main_memory_read_value(addr) {
  return main_memory_read(addr).bin;
}
function main_memory_write_value(addr, value) {
  var value_obj = main_memory_read(addr);
  value_obj.bin = value;
  main_memory_write(addr, value_obj);
}
function main_memory_write_tag(addr, tag) {
  var value_obj = main_memory_read(addr);
  value_obj.tag = tag;
  main_memory_write(addr, value_obj);
}
function main_memory_read_default_value(addr) {
  return main_memory_read(addr).def_bin;
}
function main_memory_read_nbytes(addr, n) {
  var value = "";
  for (var i = 0; i < n; i++) {
    value = value + main_memory_read_value(addr + i);
  }
  return value;
}
function main_memory_write_nbytes(addr, value, n) {
  var value_str = value.toString(16).padStart(2 * n, "0");
  var chunks = value_str.match(/.{1,2}/g);
  for (var i = 0; i < n; i++) {
    main_memory_write_value(addr + i, chunks[i]);
  }
}
var string_length_limit = 4 * 1024;
function create_memory_read_string(addr) {
  var ch = "";
  var ret_msg = "";
  for (var i = 0; i < string_length_limit; i++) {
    ch = main_memory_read_value(addr + i);
    if (ch == "00") {
      return ret_msg;
    }
    ret_msg += String.fromCharCode(parseInt(ch, 16));
  }
  return (
    ret_msg +
    "... (string length greater than " +
    string_length_limit +
    " chars)"
  );
}
function main_memory_read_bydatatype(addr, type) {
  var ret = 0;
  switch (type) {
    case "b":
    case "bu":
    case "byte":
      ret = "0x" + main_memory_read_value(addr);
      ret = parseInt(ret, 16);
      break;
    case "h":
    case "hu":
    case "half":
    case "half_word":
      ret = "0x" + main_memory_read_nbytes(addr, word_size_bytes / 2);
      ret = parseInt(ret, 16);
      break;
    case "w":
    case "integer":
    case "word":
      ret = "0x" + main_memory_read_nbytes(addr, word_size_bytes);
      ret = parseInt(ret, 16);
      break;
    case "float":
      ret = "0x" + main_memory_read_nbytes(addr, word_size_bytes);
      ret = hex2float(ret);
      break;
    case "d":
    case "double":
    case "double_word":
      ret = "0x" + main_memory_read_nbytes(addr, word_size_bytes * 2);
      ret = hex2double(ret);
      break;
    case "c":
    case "cu":
    case "char":
      ch = main_memory_read_value(addr);
      ret = String.fromCharCode(parseInt(ch, 16));
      break;
    case "asciiz":
    case "string":
    case "ascii_null_end":
      ret = create_memory_read_string(addr);
      break;
    case "ascii":
    case "ascii_not_null_end":
      break;
    case "space":
      break;
  }
  return ret;
}
function main_memory_datatypes_update(addr) {
  var data = main_memory_read(addr);
  var data_type = data.data_type;
  if (data_type != null) {
    var new_value = main_memory_read_bydatatype(addr, data_type.type);
    data_type.value = new_value;
    return true;
  }
  return false;
}
function main_memory_datatypes_update_or_create(addr, value_human, size, type) {
  var addr_i;
  var data = main_memory_read(addr);
  var data_type = data.data_type;
  if (data_type == null) {
    data_type = main_memory_datatypes_packs_foravt(
      addr,
      value_human,
      type,
      size,
    );
    main_memory_datatypes[addr] = data_type;
  } else {
    var new_value = main_memory_read_bydatatype(
      data_type.address,
      data_type.type,
    );
    data_type.value = new_value;
  }
  var data = null;
  for (var i = 0; i < size; i++) {
    data = main_memory_read(addr + i);
    data.data_type = data_type;
    main_memory_write(addr + i, data);
  }
}
function main_memory_write_bydatatype(addr, value, type, value_human) {
  var ret = 0;
  var size = 0;
  switch (type) {
    case "b":
    case "byte":
      size = 1;
      var value2 = creator_memory_value_by_type(value, type);
      ret = main_memory_write_nbytes(addr, value2, size, type);
      main_memory_datatypes_update_or_create(addr, value_human, size, type);
      break;
    case "h":
    case "half":
    case "half_word":
      size = word_size_bytes / 2;
      var value2 = creator_memory_value_by_type(value, type);
      ret = main_memory_write_nbytes(addr, value2, size, type);
      main_memory_datatypes_update_or_create(addr, value_human, size, type);
      break;
    case "w":
    case "integer":
    case "float":
    case "word":
      size = word_size_bytes;
      ret = main_memory_write_nbytes(addr, value, size, type);
      main_memory_datatypes_update_or_create(addr, value_human, size, type);
      break;
    case "d":
    case "double":
    case "double_word":
      size = word_size_bytes * 2;
      ret = main_memory_write_nbytes(addr, value, size, type);
      main_memory_datatypes_update_or_create(addr, value_human, size, type);
      break;
    case "string":
    case "ascii_null_end":
    case "asciiz":
    case "ascii_not_null_end":
    case "ascii":
      var ch = 0;
      var ch_h = "";
      for (var i = 0; i < value.length; i++) {
        ch = value.charCodeAt(i);
        ch_h = value.charAt(i);
        main_memory_write_nbytes(addr + i, ch.toString(16), 1, type);
        main_memory_datatypes_update_or_create(addr + i, ch_h, 1, "char");
        size++;
      }
      if (type != "ascii" && type != "ascii_not_null_end") {
        main_memory_write_nbytes(addr + value.length, "00", 1, type);
        main_memory_datatypes_update_or_create(
          addr + value.length,
          "0",
          1,
          "char",
        );
        size++;
      }
      break;
    case "space":
      for (var i = 0; i < parseInt(value); i++) {
        main_memory_write_nbytes(addr + i, "00", 1, type);
        size++;
      }
      main_memory_datatypes_update_or_create(addr, value_human, size, type);
      break;
    case "instruction":
      size = Math.ceil(value.toString().length / 2);
      ret = main_memory_write_nbytes(addr, value, size, type);
      main_memory_datatypes_update_or_create(addr, value_human, size, type);
      break;
  }
  creator_memory_updateall();
  return ret;
}
function creator_memory_type2size(type) {
  var size = 4;
  switch (type) {
    case "b":
    case "bu":
    case "byte":
      size = 1;
      break;
    case "h":
    case "hu":
    case "half":
    case "half_word":
      size = word_size_bytes / 2;
      break;
    case "w":
    case "wu":
    case "word":
    case "float":
    case "integer":
    case "instruction":
      size = word_size_bytes;
      break;
    case "d":
    case "du":
    case "double":
    case "double_word":
      size = word_size_bytes * 2;
      break;
  }
  return size;
}
function creator_memory_value_by_type(val, type) {
  switch (type) {
    case "b":
      val = val & 255;
      if (val & 128) {
        val = 4294967040 | val;
        val = val >>> 0;
      }
      break;
    case "bu":
      val = (val << 24) >>> 24;
      break;
    case "h":
      val = val & 65535;
      if (val & 32768) {
        val = 4294901760 | val;
        val = val >>> 0;
      }
      break;
    case "hu":
      val = (val << 16) >>> 16;
      break;
    default:
      break;
  }
  return val;
}
function creator_memory_alignelto(new_addr, new_size) {
  var ret = { new_addr: new_addr, new_size: new_size };
  for (var i = 0; i < align; i++) {
    if ((new_addr + i) % align === 0) {
      ret.new_addr = new_addr + i;
    }
    if ((new_size + i) % align === 0) {
      ret.new_size = new_size + i;
    }
  }
  return ret;
}
function creator_memory_prereset() {
  var i = 0;
  var addrs = main_memory_get_addresses();
  for (i = 0; i < addrs.length; i++) {
    main_memory[addrs[i]].def_bin = main_memory[addrs[i]].bin;
  }
  addrs = main_memory_datatype_get_addresses();
  for (i = 0; i < addrs.length; i++) {
    main_memory_datatypes[addrs[i]].default =
      main_memory_datatypes[addrs[i]].value;
  }
}
function creator_memory_findaddress_bytag(tag) {
  var ret = { exit: 0, value: 0 };
  var addrs = main_memory_get_addresses();
  for (var i = 0; i < addrs.length; i++) {
    if (main_memory[addrs[i]].tag == tag) {
      ret.exit = 1;
      ret.value = parseInt(addrs[i]);
    }
  }
  return ret;
}
function creator_memory_zerofill(new_addr, new_size) {
  main_memory_zerofill(new_addr, new_size);
  creator_memory_updateall();
  return new_addr;
}
function creator_memory_alloc(new_size) {
  var new_addr = parseInt(architecture.memory_layout[3].value) + 1;
  var algn = creator_memory_alignelto(new_addr, new_size);
  creator_memory_zerofill(algn.new_addr, algn.new_size);
  architecture.memory_layout[3].value =
    "0x" +
    (algn.new_addr + new_size).toString(16).padStart(8, "0").toUpperCase();
  if (typeof app !== "undefined") {
    app.architecture.memory_layout[3].value =
      "0x" +
      (algn.new_addr + new_size).toString(16).padStart(8, "0").toUpperCase();
  }
  return algn.new_addr;
}
function main_memory_storedata(
  data_address,
  value,
  size,
  dataLabel,
  value_human,
  DefValue,
  type,
) {
  var algn = creator_memory_alignelto(data_address, size);
  main_memory_write_bydatatype(algn.new_addr, value, type, value_human);
  creator_memory_zerofill(algn.new_addr + size, algn.new_size - size);
  if (dataLabel != "") {
    main_memory_write_tag(algn.new_addr, dataLabel);
  }
  return parseInt(algn.new_addr) + parseInt(size);
}
function creator_memory_consolelog() {
  var i = 0;
  console.log(" ~~~ main memory ~~~~~~~~~~~~~~");
  var addrs = main_memory_get_addresses();
  for (i = 0; i < addrs.length; i++) {
    console.log(JSON.stringify(main_memory[addrs[i]]));
  }
  console.log(" ~~~ datatypes ~~~~~~~~~~~~~~");
  addrs = main_memory_datatype_get_addresses();
  for (i = 0; i < addrs.length; i++) {
    console.log(JSON.stringify(main_memory_datatypes[addrs[i]]));
  }
}
function creator_memory_updaterow(addr) {
  if (
    typeof app == "undefined" ||
    typeof app._data.main_memory == "undefined"
  ) {
    return;
  }
  var addr_base = parseInt(addr);
  addr_base = addr_base - (addr_base % word_size_bytes);
  var elto = {
    addr: 0,
    addr_begin: "",
    addr_end: "",
    value: "",
    size: 0,
    hex: [],
    eye: true,
  };
  if (typeof app._data.main_memory[addr_base] != "undefined") {
    elto = app._data.main_memory[addr_base];
  } else {
    Vue.set(app._data.main_memory, addr_base, elto);
    for (var i = 0; i < word_size_bytes; i++) {
      elto.hex[i] = { byte: "00", tag: null };
    }
  }
  elto.addr_begin =
    "0x" +
    addr_base
      .toString(16)
      .padStart(word_size_bytes * 2, "0")
      .toUpperCase();
  var addr_end = addr_base + word_size_bytes - 1;
  elto.addr_end =
    "0x" +
    addr_end
      .toString(16)
      .padStart(word_size_bytes * 2, "0")
      .toUpperCase();
  elto.addr = addr_end;
  var v1 = {};
  elto.hex_packed = "";
  for (var i = 0; i < word_size_bytes; i++) {
    v1 = main_memory_read(addr_base + i);
    elto.hex[i].byte = v1.bin;
    elto.hex[i].tag = v1.tag;
    if (v1.tag == "") {
      elto.hex[i].tag = null;
    }
    elto.hex_packed += v1.bin;
  }
  elto.value = "";
  elto.size = 0;
  for (var i = 0; i < word_size_bytes; i++) {
    if (typeof main_memory_datatypes[addr_base + i] == "undefined") {
      continue;
    }
    elto.size = elto.size + main_memory_datatypes[addr_base + i].size;
    if (main_memory_datatypes[addr_base + i].type != "space") {
      if (elto.value != "") elto.value += ", ";
      elto.value += main_memory_datatypes[addr_base + i].value;
    } else {
      elto.eye = true;
    }
  }
}
function creator_memory_updateall() {
  if (
    typeof app == "undefined" ||
    typeof app._data.main_memory == "undefined"
  ) {
    return;
  }
  var addrs = main_memory_get_addresses();
  var last_addr = -1;
  var curr_addr = -1;
  for (var i = 0; i < addrs.length; i++) {
    curr_addr = parseInt(addrs[i]);
    if (Math.abs(curr_addr - last_addr) > word_size_bytes - 1) {
      creator_memory_updaterow(addrs[i]);
      last_addr = curr_addr;
    }
  }
}
function creator_memory_clearall() {
  if (
    typeof app == "undefined" ||
    typeof app._data.main_memory == "undefined"
  ) {
    return;
  }
  app._data.main_memory = {};
}
function creator_memory_update_row_view(selected_view, segment_name, row_info) {
  if (typeof app._data.main_memory[row_info.addr] == "undefined") {
    return;
  }
  var hex_packed = app._data.main_memory[row_info.addr].hex_packed;
  var new_value = app._data.main_memory[row_info.addr].value;
  switch (selected_view) {
    case "sig_int":
      new_value = parseInt(hex_packed, 16) >> 0;
      break;
    case "unsig_int":
      new_value = parseInt(hex_packed, 16) >>> 0;
      break;
    case "float":
      new_value = hex2float("0x" + hex_packed);
      break;
    case "char":
      new_value = hex2char8(hex_packed);
      break;
  }
  app._data.main_memory[row_info.addr].value = new_value;
}
function creator_memory_update_space_view(
  selected_view,
  segment_name,
  row_info,
) {
  for (var i = 0; i < row_info.size; i++) {
    creator_memory_update_row_view(selected_view, segment_name, row_info);
    row_info.addr++;
  }
}
function writeMemory(value, addr, type) {
  main_memory_write_bydatatype(addr, value, type, value);
  creator_memory_updaterow(addr);
}
function readMemory(addr, type) {
  return main_memory_read_bydatatype(addr, type);
}
function creator_memory_reset() {
  main_memory_reset();
  creator_memory_updateall();
}
function creator_memory_clear() {
  main_memory_clear();
  creator_memory_clearall();
}
function creator_memory_is_address_inside_segment(segment_name, addr) {
  var elto_inside_segment = false;
  if (segment_name == "instructions_memory") {
    elto_inside_segment =
      addr >= parseInt(architecture.memory_layout[0].value) &&
      addr <= parseInt(architecture.memory_layout[1].value);
  }
  if (segment_name == "data_memory") {
    elto_inside_segment =
      addr >= parseInt(architecture.memory_layout[2].value) &&
      addr <= parseInt(architecture.memory_layout[3].value);
  }
  if (segment_name == "stack_memory") {
    elto_inside_segment = addr >= parseInt(architecture.memory_layout[3].value);
  }
  return elto_inside_segment;
}
function creator_memory_is_segment_empty(segment_name) {
  var addrs = main_memory_get_addresses();
  var insiders = addrs.filter(function (elto) {
    return creator_memory_is_address_inside_segment(segment_name, elto);
  });
  return insiders.length === 0;
}
function creator_memory_data_compiler(
  data_address,
  value,
  size,
  dataLabel,
  DefValue,
  type,
) {
  var ret = { msg: "", data_address: 0 };
  if (data_address % align > 0) {
    var to_be_filled = align - (data_address % align);
    creator_memory_zerofill(data_address, to_be_filled);
    data_address = data_address + to_be_filled;
  }
  if (data_address % size !== 0 && data_address % word_size_bytes !== 0) {
    ret.msg = "m21";
    ret.data_address = data_address;
    return ret;
  }
  if (dataLabel != null) {
    data_tag.push({ tag: dataLabel, addr: data_address });
  }
  ret.msg = "";
  ret.data_address = main_memory_storedata(
    data_address,
    value,
    size,
    dataLabel,
    DefValue,
    DefValue,
    type,
  );
  return ret;
}
function creator_insert_instruction(
  auxAddr,
  value,
  def_value,
  hide,
  hex,
  fill_hex,
  label,
) {
  var size = Math.ceil(hex.toString().length / 2);
  return main_memory_storedata(
    auxAddr,
    hex,
    size,
    label,
    def_value,
    def_value,
    "instruction",
  );
}
function creator_memory_storestring(
  string,
  string_length,
  data_address,
  label,
  type,
  align,
) {
  if (label != null) {
    data_tag.push({ tag: label, addr: data_address });
  }
  return main_memory_storedata(
    data_address,
    string,
    string_length,
    label,
    string,
    string,
    type,
  );
}
var architecture_available = [];
var load_architectures_available = [];
var load_architectures = [];
var back_card = [];
var architecture_hash = [];
var architecture = {
  arch_conf: [],
  memory_layout: [],
  components: [],
  instructions: [],
  directives: [],
};
var architecture_json = "";
var textarea_assembly_editor;
var codemirrorHistory = null;
var code_assembly = "";
var tokenIndex = 0;
var nEnters = 0;
var pc = 4;
var address;
var data_address;
var stack_address;
var backup_stack_address;
var backup_data_address;
var pending_instructions = [];
var pending_tags = [];
var extern = [];
var compileError = {
  m0: function (ret) {
    return "" + ret.token + "";
  },
  m1: function (ret) {
    return "Repeated tag: " + ret.token + "";
  },
  m2: function (ret) {
    return "Instruction '" + ret.token + "' not found";
  },
  m3: function (ret) {
    return "Incorrect instruction syntax for '" + ret.token + "'";
  },
  m4: function (ret) {
    return "Register '" + ret.token + "' not found";
  },
  m5: function (ret) {
    return "Immediate number '" + ret.token + "' is too big";
  },
  m6: function (ret) {
    return "Immediate number '" + ret.token + "' is not valid";
  },
  m7: function (ret) {
    return "Tag '" + ret.token + "' is not valid";
  },
  m8: function (ret) {
    return "Address '" + ret.token + "' is too big";
  },
  m9: function (ret) {
    return "Address '" + ret.token + "' is not valid";
  },
  m10: function (ret) {
    return (
      ".space value out of range (" + ret.token + " is greater than 50MiB)"
    );
  },
  m11: function (ret) {
    return "The space directive value should be positive and greater than zero";
  },
  m12: function (ret) {
    return "This field is too small to encode in binary '" + ret.token + "";
  },
  m13: function (ret) {
    return "Incorrect pseudoinstruction definition " + ret.token + "";
  },
  m14: function (ret) {
    return "Invalid directive: " + ret.token + "";
  },
  m15: function (ret) {
    return "Invalid value '" + ret.token + "' as number.";
  },
  m16: function (ret) {
    return 'The string of characters must start with "' + ret.token + "";
  },
  m17: function (ret) {
    return 'The string of characters must end with "' + ret.token + "";
  },
  m18: function (ret) {
    return "Number '" + ret.token + "' is too big";
  },
  m19: function (ret) {
    return "Number '" + ret.token + "' is empty";
  },
  m21: function (ret) {
    return "The data must be aligned" + ret.token + "";
  },
  m22: function (ret) {
    return "The number should be positive '" + ret.token + "'";
  },
  m23: function (ret) {
    return "Empty directive" + ret.token + "";
  },
  m24: function (ret) {
    return "After the comma you should go a blank --\x3e " + ret.token + "";
  },
  m26: function (ret) {
    return "Syntax error near line: " + ret.token + "";
  },
  m27: function (ret) {
    return "Please check instruction syntax, inmediate ranges, register name, etc.";
  },
};
let promise;
var notifications = [];
var example_set_available = [];
var example_available = [];
var instructions = [];
var instructions_tag = [];
var tag_instructions = {};
var instructions_binary = [];
var data = [];
var data_tag = [];
var code_binary = "";
var update_binary = "";
var load_binary = false;
function load_arch_select(cfg) {
  var ret = { errorcode: "", token: "", type: "", update: "", status: "ok" };
  var auxArchitecture = cfg;
  architecture = register_value_deserialize(auxArchitecture);
  architecture_hash = [];
  for (var i = 0; i < architecture.components.length; i++) {
    architecture_hash.push({ name: architecture.components[i].name, index: i });
  }
  backup_stack_address = architecture.memory_layout[4].value;
  backup_data_address = architecture.memory_layout[3].value;
  ret.token = "The selected architecture has been loaded correctly";
  ret.type = "success";
  return ret;
}
var creator_debug = false;
function console_log(msg) {
  if (creator_debug) {
    console_log(msg);
  }
}
function packCompileError(err_code, err_token, err_ti, err_bgcolor) {
  var ret = {};
  ret.status = "error";
  ret.errorcode = err_code;
  ret.token = err_token;
  ret.type = err_ti;
  ret.bgcolor = err_bgcolor;
  ret.tokenIndex = tokenIndex;
  ret.line = nEnters;
  if (typeof err_token == "undefined") {
    err_code = "m27";
    ret.token = "";
  }
  ret.msg = compileError[err_code](ret);
  creator_ga("compile", "compile.error", "compile.error." + ret.msg);
  creator_ga("compile", "compile.type_error", "compile.type_error." + err_code);
  return ret;
}
function first_token() {
  var assembly = code_assembly;
  var index = tokenIndex;
  if (index >= assembly.length) {
    return null;
  }
  while (
    ":\t\n \r#".includes(assembly.charAt(index)) &&
    index < assembly.length
  ) {
    while (
      ":\t\n \r".includes(assembly.charAt(index)) &&
      index < assembly.length
    ) {
      if (assembly.charAt(index) == "\n") nEnters++;
      index++;
    }
    if (assembly.charAt(index) == "#") {
      while (assembly.charAt(index) != "\n" && index < assembly.length) {
        index++;
      }
      while (
        ":\t\n \r".includes(assembly.charAt(index)) &&
        index < assembly.length
      ) {
        if (assembly.charAt(index) == "\n") nEnters++;
        index++;
      }
    }
  }
  tokenIndex = index;
}
function get_token() {
  var assembly = code_assembly;

  console.log("El codigo ensamblador: ", assembly);
  preprocess_run(["input.s"], [assembly], false, false);
  var index = tokenIndex;
  if (index >= assembly.length) {
    return null;
  }
  if (assembly.charAt(index) == "'") {
    index++;
    while (assembly.charAt(index) != "'" && index < assembly.length) {
      index++;
    }
    index++;
    return assembly.substring(tokenIndex, index);
  }
  if (assembly.charAt(index) == '"') {
    index++;
    while (assembly.charAt(index) != '"' && index < assembly.length) {
      index++;
    }
    index++;
    return assembly.substring(tokenIndex, index);
  }
  if ("([{".includes(assembly.charAt(index))) {
    index++;
  }
  while (
    ",()[]{}:#\t\n \r".includes(assembly.charAt(index)) === false &&
    index < assembly.length
  ) {
    index++;
  }
  var res = assembly.substring(tokenIndex, index);
  if (":)]}".includes(assembly.charAt(index))) {
    res = res + assembly.charAt(index);
  }
  return res;
}
function next_token() {
  var assembly = code_assembly;
  var index = tokenIndex;
  if (assembly.charAt(index) == "'") {
    index++;
    while (assembly.charAt(index) != "'" && index < assembly.length) {
      if (assembly.charAt(index) == "\n") nEnters++;
      index++;
    }
    index++;
  }
  if (assembly.charAt(index) == '"') {
    index++;
    while (assembly.charAt(index) != '"' && index < assembly.length) {
      if (assembly.charAt(index) == "\n") nEnters++;
      index++;
    }
    index++;
  }
  if ("([{".includes(assembly.charAt(index))) {
    index++;
  }
  while (
    ",()[]{}:#\t\n \r".includes(assembly.charAt(index)) === false &&
    index < assembly.length
  ) {
    index++;
  }
  while (
    ",()[]{}:#\t\n \r".includes(assembly.charAt(index)) &&
    index < assembly.length
  ) {
    while (
      ",)]}:\t\n \r".includes(assembly.charAt(index)) &&
      index < assembly.length
    ) {
      if (assembly.charAt(index) == "\n") nEnters++;
      index++;
    }
    if ("([{".includes(assembly.charAt(index))) {
      break;
    }
    if (assembly.charAt(index) == "#") {
      while (assembly.charAt(index) != "\n" && index < assembly.length) {
        index++;
      }
      while (
        "()[]{}:\t\n \r".includes(assembly.charAt(index)) &&
        index < assembly.length
      ) {
        if (assembly.charAt(index) == "\n") nEnters++;
        index++;
      }
    }
  }
  tokenIndex = index;
}
/*
function assembly_compiler() {
    console.log("Soy min fallo");
  
  var ret = { errorcode: "", token: "", type: "", update: "", status: "ok" };
  creator_ga("compile", "compile.assembly");
  instructions = [];
  instructions_tag = [];
  tag_instructions = {};
  pending_instructions = [];
  pending_tags = [];
  data_tag = [];
  instructions_binary = [];
  creator_memory_clear();
  extern = [];
  data = [];
  execution_init = 1;
  pc = 4;
  nEnters = 0;
  if (update_binary.instructions_binary != null) {
    for (var i = 0; i < update_binary.instructions_binary.length; i++) {
      pc = pc + architecture.instructions[i].nwords * 4;
      instructions.push(update_binary.instructions_binary[i]);
      if (i === 0) {
        instructions[instructions.length - 1].hide = false;
        if (update_binary.instructions_binary[i].globl === false) {
          instructions[instructions.length - 1].Label = "";
        }
      } else if (update_binary.instructions_binary[i].globl === false) {
        instructions[instructions.length - 1].Label = "";
        instructions[instructions.length - 1].hide = true;
      } else if (update_binary.instructions_binary[i].globl == null) {
        instructions[instructions.length - 1].hide = true;
      } else {
        instructions[instructions.length - 1].hide = false;
      }
      address = parseInt(instructions[instructions.length - 1].Address, 16) + 4;
    }
  } else {
    address = parseInt(architecture.memory_layout[0].value);
  }
  var numBinaries = instructions.length;
  architecture.memory_layout[4].value = backup_stack_address;
  architecture.memory_layout[3].value = backup_data_address;
  data_address = parseInt(architecture.memory_layout[2].value);
  stack_address = parseInt(architecture.memory_layout[4].value);
  for (var i = 0; i < architecture.components.length; i++) {
    for (var j = 0; j < architecture.components[i].elements.length; j++) {
      if (
        architecture.components[i].elements[j].properties.includes(
          "program_counter",
        )
      ) {
        architecture.components[i].elements[j].value = bi_intToBigInt(
          address,
          10,
        );
        architecture.components[i].elements[j].default_value = bi_intToBigInt(
          address,
          10,
        );
      }
      if (
        architecture.components[i].elements[j].properties.includes(
          "stack_pointer",
        )
      ) {
        architecture.components[i].elements[j].value = bi_intToBigInt(
          stack_address,
          10,
        );
        architecture.components[i].elements[j].default_value = bi_intToBigInt(
          stack_address,
          10,
        );
      }
    }
  }
  totalStats = 0;
  for (var i = 0; i < stats.length; i++) {
    stats[i].percentage = 0;
    stats[i].number_instructions = 0;
    stats_value[i] = 0;
  }
  align = 1;
  var empty = false;
  first_token();
  if (get_token() == null) {
    return packCompileError(
      "m0",
      "Please enter the assembly code before compiling",
      "warning",
      "danger",
    );
  }
  token = get_token();
  console_log(token);
  while (!empty) {
    token = get_token();
    console_log(token);
    if (token == null) {
      empty = true;
      break;
    }
    var change = false;
    for (var i = 0; i < architecture.directives.length; i++) {
      if (token == architecture.directives[i].name) {
        switch (architecture.directives[i].action) {
          case "data_segment":
            console_log("data_segment");
            ret = data_segment_compiler();
            if (ret.status == "ok") {
              change = true;
            }
            if (ret.status != "ok") {
              instructions = [];
              pending_instructions = [];
              pending_tags = [];
              data_tag = [];
              instructions_binary = [];
              data = [];
              extern = [];
              creator_memory_clear();
              return ret;
            }
            break;
          case "code_segment":
            console_log("code_segment");
            ret = code_segment_compiler();
            if (ret.status == "ok") {
              change = true;
            }
            if (ret.status != "ok") {
              instructions = [];
              pending_instructions = [];
              pending_tags = [];
              data_tag = [];
              instructions_binary = [];
              extern = [];
              data = [];
              creator_memory_clear();
              return ret;
            }
            break;
          case "global_symbol":
            var isGlobl = true;
            next_token();
            while (isGlobl) {
              token = get_token();
              re = new RegExp(",", "g");
              token = token.replace(re, "");
              console_log("token: " + token);
              extern.push(token);
              change = true;
              next_token();
              token = get_token();
              console_log("token: " + token);
              for (var z = 0; z < architecture.directives.length; z++) {
                if (
                  token == architecture.directives[z].name ||
                  token == null ||
                  token.search(/\:$/) != -1
                ) {
                  isGlobl = false;
                }
              }
            }
            break;
          default:
            console_log("default");
            empty = true;
            break;
        }
      } else if (
        i == architecture.directives.length - 1 &&
        token != architecture.directives[i].name &&
        change === false &&
        token != null
      ) {
        empty = true;
        return packCompileError("m14", token, "error", "danger");
      }
    }
  }
  var found = false;
  if (update_binary.instructions_binary != null) {
    for (var j = 0; j < instructions.length; j++) {
      if (instructions[j].Label != "") {
        for (var i = 0; i < update_binary.instructions_tag.length; i++) {
          if (instructions[j].Label == update_binary.instructions_tag[i].tag) {
            update_binary.instructions_tag[i].addr = instructions[j].Address;
          }
        }
      }
    }
  }
  for (var i = 0; i < pending_instructions.length; i++) {
    var exit = 0;
    var signatureParts = pending_instructions[i].signature;
    var signatureRawParts = pending_instructions[i].signatureRaw;
    var instructionParts = pending_instructions[i].instruction.split(" ");
    console_log(instructionParts);
    for (var j = 0; j < signatureParts.length && exit === 0; j++) {
      if (
        signatureParts[j] == "inm-signed" ||
        signatureParts[j] == "inm-unsigned" ||
        signatureParts[j] == "address"
      ) {
        for (var z = 0; z < instructions.length && exit === 0; z++) {
          if (instructions[z].Label == instructionParts[j]) {
            var addr = instructions[z].Address;
            var bin = parseInt(addr, 16).toString(2);
            var startbit = pending_instructions[i].startBit;
            var stopbit = pending_instructions[i].stopBit;
            var fieldsLength = startbit - stopbit + 1;
            if (bin.length > fieldsLength) {
              nEnters = pending_instructions[i].line;
              return packCompileError(
                "m8",
                signatureRawParts[j],
                "error",
                "danger",
              );
            }
            instructionParts[j] = addr;
            var newInstruction = "";
            for (var w = 0; w < instructionParts.length; w++) {
              newInstruction = newInstruction + instructionParts[w];
              if (w != instructionParts.length - 1) {
                newInstruction = newInstruction + " ";
              }
            }
            for (var w = 0; w < instructions.length && exit === 0; w++) {
              var aux = "0x" + pending_instructions[i].address.toString(16);
              if (aux == instructions[w].Address) {
                instructions[w].loaded = newInstruction;
              }
            }
            for (var w = 0; w < instructions.length && exit === 0; w++) {
              var aux = "0x" + pending_instructions[i].address.toString(16);
              if (aux == instructions[w].Address) {
                instructions[w].loaded = newInstruction;
                console_log(w);
                console_log(numBinaries);
                console_log(w - numBinaries);
                var iload = instructions_binary[w - numBinaries].loaded;
                instructions_binary[w - numBinaries].loaded =
                  iload.substring(0, iload.length - (startbit + 1)) +
                  bin.padStart(fieldsLength, "0") +
                  iload.substring(iload.length - stopbit, iload.length);
                exit = 1;
              }
            }
          }
        }
        var ret1 = creator_memory_findaddress_bytag(instructionParts[j]);
        if (ret1.exit === 1) {
          var addr = ret1.value;
          var bin = parseInt(addr, 16).toString(2);
          var startbit = pending_instructions[i].startBit;
          var stopbit = pending_instructions[i].stopBit;
          var fieldsLength = startbit - stopbit + 1;
          if (bin.length > fieldsLength) {
            nEnters = pending_instructions[i].line;
            return packCompileError(
              "m8",
              instructionParts[j],
              "error",
              "danger",
            );
          }
          instructionParts[j] = "0x" + addr.toString(16);
          var newInstruction = "";
          for (var w = 0; w < instructionParts.length; w++) {
            newInstruction = newInstruction + instructionParts[w];
            if (w != instructionParts.length - 1) {
              newInstruction = newInstruction + " ";
            }
          }
          for (var w = 0; w < instructions.length; w++) {
            var aux = "0x" + pending_instructions[i].address.toString(16);
            if (aux == instructions[w].Address) {
              instructions[w].loaded = newInstruction;
            }
          }
          for (var w = 0; w < instructions.length && exit === 0; w++) {
            var aux = "0x" + pending_instructions[i].address.toString(16);
            if (aux == instructions[w].Address) {
              instructions[w].loaded = newInstruction;
              var fieldsLength = startbit - stopbit + 1;
              var iload = instructions_binary[w - numBinaries].loaded;
              instructions_binary[w - numBinaries].loaded =
                iload.substring(0, iload.length - (startbit + 1)) +
                bin.padStart(fieldsLength, "0") +
                iload.substring(iload.length - stopbit, iload.length);
              exit = 1;
            }
          }
        }
        if (exit === 0 && isNaN(instructionParts[j]) === true) {
          nEnters = pending_instructions[i].line;
          instructions = [];
          pending_instructions = [];
          pending_tags = [];
          data_tag = [];
          instructions_binary = [];
          creator_memory_clear();
          data = [];
          extern = [];
          return packCompileError("m7", instructionParts[j], "error", "danger");
        }
      }
      if (signatureParts[j] == "offset_words") {
        for (var z = 0; z < instructions.length && exit === 0; z++) {
          if (instructions[z].Label == instructionParts[j]) {
            var addr = instructions[z].Address;
            var startbit = pending_instructions[i].startBit;
            var stopbit = pending_instructions[i].stopBit;
            addr = (addr - pending_instructions[i].address) / 4 - 1;
            if (startbit.length > 1 && stopbit.length) {
              var fieldsLength = 0;
              for (var s = 0; s < startbit.length; s++) {
                fieldsLength = fieldsLength + startbit[s] - stopbit[s] + 1;
              }
              var bin = bi_intToBigInt(addr, 10).toString(2);
              bin = bin.padStart(fieldsLength, "0");
              bin = bin.slice(bin.length - fieldsLength, bin.length);
              var last_segment = 0;
              for (var s = 0; s < startbit.length; s++) {
                var starbit_aux = 31 - startbit[s];
                var stopbit_aux = 32 - stopbit[s];
                var fieldsLength2 = stopbit_aux - starbit_aux;
                var bin_aux = bin.substring(
                  last_segment,
                  fieldsLength2 + last_segment,
                );
                last_segment = last_segment + fieldsLength2;
                for (var w = 0; w < instructions.length && exit === 0; w++) {
                  var aux = "0x" + pending_instructions[i].address.toString(16);
                  if (aux == instructions[w].Address) {
                    instructions_binary[w - numBinaries].loaded =
                      instructions_binary[w - numBinaries].loaded.substring(
                        0,
                        instructions_binary[w - numBinaries].loaded.length -
                          (startbit[s] + 1),
                      ) +
                      bin_aux +
                      instructions_binary[w - numBinaries].loaded.substring(
                        instructions_binary[w - numBinaries].loaded.length -
                          stopbit[s],
                        instructions_binary[w - numBinaries].loaded.length,
                      );
                  }
                }
              }
            } else {
              var fieldsLength = startbit - stopbit + 1;
              console_log(fieldsLength);
              var bin = bi_intToBigInt(addr, 10).toString(2);
              bin = bin.padStart(fieldsLength, "0");
              for (var w = 0; w < instructions.length && exit === 0; w++) {
                var aux = "0x" + pending_instructions[i].address.toString(16);
                if (aux == instructions[w].Address) {
                  instructions_binary[w - numBinaries].loaded =
                    instructions_binary[w - numBinaries].loaded.substring(
                      0,
                      instructions_binary[w - numBinaries].loaded.length -
                        (startbit + 1),
                    ) +
                    bin.padStart(fieldsLength, "0") +
                    instructions_binary[w - numBinaries].loaded.substring(
                      instructions_binary[w - numBinaries].loaded.length -
                        stopbit,
                      instructions_binary[w - numBinaries].loaded.length,
                    );
                }
              }
            }
            instructionParts[j] = addr;
            var newInstruction = "";
            for (var w = 0; w < instructionParts.length; w++) {
              if (w == instructionParts.length - 1) {
                newInstruction = newInstruction + instructionParts[w];
              } else {
                newInstruction = newInstruction + instructionParts[w] + " ";
              }
            }
            for (var w = 0; w < instructions.length && exit === 0; w++) {
              var aux = "0x" + pending_instructions[i].address.toString(16);
              if (aux == instructions[w].Address) {
                instructions[w].loaded = newInstruction;
                exit = 1;
              }
            }
          }
        }
        if (exit === 0) {
          nEnters = pending_instructions[i].line;
          instructions = [];
          pending_instructions = [];
          pending_tags = [];
          data_tag = [];
          instructions_binary = [];
          creator_memory_clear();
          data = [];
          extern = [];
          return packCompileError("m7", instructionParts[j], "error", "danger");
        }
      }
      if (signatureParts[j] == "offset_bytes") {
        for (var z = 0; z < instructions.length && exit === 0; z++) {
          if (instructions[z].Label == instructionParts[j]) {
            var addr = instructions[z].Address;
            var startbit = pending_instructions[i].startBit;
            var stopbit = pending_instructions[i].stopBit;
            var fieldsLength = startbit - stopbit + 1;
            var bin = bi_intToBigInt(addr, 10).toString(2);
            bin = bin.padStart(fieldsLength, "0");
            instructionParts[j] = addr;
            var newInstruction = "";
            for (var w = 0; w < instructionParts.length; w++) {
              if (w == instructionParts.length - 1) {
                newInstruction = newInstruction + instructionParts[w];
              } else {
                newInstruction = newInstruction + instructionParts[w] + " ";
              }
            }
            for (var w = 0; w < instructions.length && exit == 0; w++) {
              var aux = "0x" + pending_instructions[i].address.toString(16);
              if (aux == instructions[w].Address) {
                instructions[w].loaded = newInstruction;
              }
            }
            for (var w = 0; w < instructions.length && exit == 0; w++) {
              var aux = "0x" + pending_instructions[i].address.toString(16);
              if (aux == instructions[w].Address) {
                instructions[w].loaded = newInstruction;
                var fieldsLength = startbit - stopbit + 1;
                console_log(w);
                console_log(numBinaries);
                console_log(w - numBinaries);
                instructions_binary[w - numBinaries].loaded =
                  instructions_binary[w - numBinaries].loaded.substring(
                    0,
                    instructions_binary[w - numBinaries].loaded.length -
                      (startbit + 1),
                  ) +
                  bin.padStart(fieldsLength, "0") +
                  instructions_binary[w - numBinaries].loaded.substring(
                    instructions_binary[w - numBinaries].loaded.length -
                      stopbit,
                    instructions_binary[w - numBinaries].loaded.length,
                  );
                exit = 1;
              }
            }
          }
        }
        if (exit == 0) {
          nEnters = pending_instructions[i].line;
          instructions = [];
          pending_instructions = [];
          pending_tags = [];
          data_tag = [];
          instructions_binary = [];
          creator_memory_clear();
          data = [];
          extern = [];
          return packCompileError("m7", instructionParts[j], "error", "danger");
        }
      }
    }
  }
  if (update_binary.instructions_binary != null) {
    for (var i = 0; i < update_binary.instructions_binary.length; i++) {
      var hex = bin2hex(update_binary.instructions_binary[i].loaded);
      var auxAddr = parseInt(update_binary.instructions_binary[i].Address, 16);
      var label = update_binary.instructions_binary[i].Label;
      var hide = false;
      if (i == 0) {
        hide = false;
        if (update_binary.instructions_binary[i].globl === false) {
          label = "";
        }
      } else if (update_binary.instructions_binary[i].globl === false) {
        hide = true;
        label = "";
      } else if (update_binary.instructions_binary[i].globl == null) {
        hide = true;
      } else {
        hide = false;
      }
      auxAddr = creator_insert_instruction(
        auxAddr,
        "********",
        "********",
        hide,
        hex,
        "**",
        label,
      );
    }
  }
  for (var i = 0; i < instructions_binary.length; i++) {
    var hex = bin2hex(instructions_binary[i].loaded);
    var auxAddr = parseInt(instructions_binary[i].Address, 16);
    var label = instructions_binary[i].Label;
    var binNum = 0;
    if (update_binary.instructions_binary != null) {
      binNum = update_binary.instructions_binary.length;
    }
    auxAddr = creator_insert_instruction(
      auxAddr,
      instructions[i + binNum].loaded,
      instructions[i + binNum].loaded,
      false,
      hex,
      "00",
      label,
    );
  }
  for (var i = 0; i < instructions_binary.length; i++) {
    if (extern.length === 0 && instructions_binary[i].Label != "") {
      instructions_binary[i].Label = instructions_binary[i].Label + "_symbol";
      instructions_binary[i].globl = false;
    } else {
      for (var j = 0; j < extern.length; j++) {
        if (
          instructions_binary[i].Label != extern[j] &&
          j == extern.length - 1 &&
          instructions_binary[i].Label != ""
        ) {
          instructions_binary[i].Label =
            instructions_binary[i].Label + "_symbol";
          instructions_binary[i].globl = false;
          break;
        } else if (instructions_binary[i].Label == extern[j]) {
          instructions_binary[i].globl = true;
          break;
        }
      }
    }
  }
  for (var i = 0; i < instructions_tag.length; i++) {
    if (extern.length === 0 && instructions_tag[i].tag != "") {
      instructions_tag[i].tag = instructions_tag[i].tag + "_symbol";
      instructions_tag[i].globl = false;
      break;
    } else {
      for (var j = 0; j < extern.length; j++) {
        if (
          instructions_tag[i].tag != extern[j] &&
          j == extern.length - 1 &&
          instructions_tag[i].tag != ""
        ) {
          instructions_tag[i].tag = instructions_tag[i].tag + "_symbol";
          instructions_tag[i].globl = false;
          break;
        } else if (instructions_tag[i].tag == extern[j]) {
          instructions_tag[i].globl = true;
          break;
        }
      }
    }
  }
  if (typeof app != "undefined") app._data.instructions = instructions;
  writeMemory("00", parseInt(stack_address), "word");
  address = parseInt(architecture.memory_layout[0].value);
  data_address = parseInt(architecture.memory_layout[2].value);
  stack_address = parseInt(architecture.memory_layout[4].value);
  creator_memory_prereset();
  return ret;
}
*/

function assembly_compiler()
{
  var ret = {
          errorcode: "",
          token: "",
          type: "",
          update: "",
          status: "ok"
        } ;

        /* Google Analytics */
        creator_ga('compile', 'compile.assembly');
  filecontents.push(code_assembly);
  filenames.push("input.s");
  for (let i = 0; i < filecontents.length; i++){
    if(filecontents[i].match(regexfpd))
    enablefpd = true;
    if(filecontents[i].match(regexvec))
    enablevec = true;
  }
  console.log("post comprobacion del flag", enablefpd, enablevec);
  objectcontent = preprocess_run(filenames, filecontents, enablefpd, enablevec);
  // console.log("salida ensamblador", objectcontent);
  
  // console.log(window.location.href);
  // scriptas = document.querySelector('script[src="'+ window.location.href +'js/toolchain_compiler/as-new.js"]');
  scriptas = document.getElementById('as-new');
  if(scriptas){
  clean_environment();
  scriptas.parentNode.removeChild(scriptas);
  }

  // Se carga el script ld.js para ejecutar el enlazador.
  scriptld = document.createElement('script');
  scriptld.src = window.location.href +'js/toolchain_compiler/ld-new.js';
  scriptld.async = true;
  scriptld.id = 'ld-new';
  scriptld.type = 'text/javascript';
  document.head.appendChild(scriptld);

  waitForFunction().then(() => {
    dissamble_binary();
  });
  console.log("He terminado!");
        // // TODO: fill ret with the "thing" returned by SAIL, navy SAIL

        // /* Enter the compilated instructions in the text segment */
        // for (var i = 0; i < IMAGEN_MEMORIA_DE_sAIl.length; i++)
        //   {
        //     var hex = bin2hex(instructions_binary[i].loaded);
        //     var auxAddr = parseInt(instructions_binary[i].Address, 16);
        //     var label = instructions_binary[i].Label;
        //     var binNum = 0;
  
        //     if (update_binary.instructions_binary != null) {
        //         binNum = update_binary.instructions_binary.length
        //     }
  
        //     auxAddr = creator_insert_instruction(auxAddr, instructions[i + binNum].loaded, instructions[i + binNum].loaded, false, hex, "00", label);
        //   }

        // if (typeof app != "undefined") {
        //     app._data.instructions = instructions;
        // }

        // /* Initialize stack */
        // writeMemory("00", parseInt(stack_address), "word") ;

        // address = parseInt(architecture.memory_layout[0].value);
        // data_address = parseInt(architecture.memory_layout[2].value);
        // stack_address = parseInt(architecture.memory_layout[4].value);

        // // save current value as default values for reset()...
        // creator_memory_prereset() ;
        // Como se llama a  una funcion asíncrona  tenemos que esperar a que termine su ejecución para hacer el return;
        return ret;
}

function data_segment_compiler() {
  var ret = { errorcode: "", token: "", type: "", update: "", status: "ok" };
  var existsData = true;
  next_token();
  while (existsData) {
    token = get_token();
    console_log("token: " + token);
    var label = "";
    if (token == null) {
      break;
    }
    var found = false;
    if (token.search(/\:$/) != -1) {
      if (token.length === 1) {
        return packCompileError("m0", "Empty label", "error", "danger");
      }
      for (var i = 0; i < data_tag.length; i++) {
        console_log(data_tag[i].tag);
        console_log(token.substring(0, token.length - 1));
        if (data_tag[i].tag == token.substring(0, token.length - 1)) {
          return packCompileError(
            "m1",
            token.substring(0, token.length - 1),
            "error",
            "danger",
          );
        }
      }
      for (var i = 0; i < instructions.length; i++) {
        if (instructions[i].Label == token.substring(0, token.length - 1)) {
          return packCompileError(
            "m1",
            token.substring(0, token.length - 1),
            "error",
            "danger",
          );
        }
      }
      label = token.substring(0, token.length - 1);
      next_token();
      token = get_token();
    }
    for (var j = 0; j < architecture.directives.length; j++) {
      if (token == architecture.directives[j].name) {
        switch (architecture.directives[j].action) {
          case "byte":
            var isByte = true;
            next_token();
            while (isByte) {
              token = get_token();
              if (token == null) {
                return packCompileError("m23", "", "error", "danger");
              }
              re = new RegExp("([0-9A-Fa-f-]),([0-9A-Fa-f-])");
              if (token.search(re) != -1) {
                return packCompileError("m24", token, "error", "danger");
              }
              re = new RegExp(",", "g");
              token = token.replace(re, "");
              console_log("byte, " + token);
              var auxToken;
              var auxTokenString;
              if (token.match(/^\'(.*?)\'$/)) {
                var re = /^\'(.*?)\'$/;
                console_log(re);
                var match = re.exec(token);
                console_log(match);
                var asciiCode;
                console_log(match[1]);
                if (token.search(/^\'\\n\'$/) != -1) {
                  asciiCode = 10;
                } else if (token.search(/^\'\\t\'$/) != -1) {
                  asciiCode = 9;
                } else {
                  asciiCode = match[1].charCodeAt(0);
                }
                console_log(asciiCode);
                auxTokenString = asciiCode.toString(16);
              } else if (token.match(/^0x/)) {
                var value = token.split("x");
                re = new RegExp("[0-9A-Fa-f]{" + value[1].length + "}", "g");
                if (value[1].search(re) == -1) {
                  return packCompileError("m15", token, "error", "danger");
                }
                auxTokenString = value[1].padStart(
                  2 * parseInt(architecture.directives[j].size),
                  "0",
                );
                if (value[1].length === 0) {
                  return packCompileError("m19", token, "error", "danger");
                }
                if (
                  auxTokenString.length >
                  2 * parseInt(architecture.directives[j].size)
                ) {
                  return packCompileError("m18", token, "error", "danger");
                }
                auxTokenString = auxTokenString.substring(
                  auxTokenString.length -
                    2 * parseInt(architecture.directives[j].size),
                  auxTokenString.length,
                );
              } else {
                var re = new RegExp("[0-9-]{" + token.length + "}", "g");
                if (token.search(re) == -1) {
                  return packCompileError("m15", token, "error", "danger");
                }
                auxToken = parseInt(token) >>> 0;
                auxTokenString = auxToken
                  .toString(16)
                  .substring(
                    auxToken.toString(16).length -
                      2 * parseInt(architecture.directives[j].size),
                    auxToken.toString(16).length,
                  )
                  .padStart(2 * parseInt(architecture.directives[j].size), "0");
                if (
                  auxTokenString.length >
                  2 * parseInt(architecture.directives[j].size)
                ) {
                  return packCompileError("m18", token, "error", "danger");
                }
                auxTokenString = auxTokenString.substring(
                  auxTokenString.length -
                    2 * parseInt(architecture.directives[j].size),
                  auxTokenString.length,
                );
              }
              console_log(auxTokenString);
              var r = creator_memory_data_compiler(
                data_address,
                auxTokenString,
                parseInt(architecture.directives[j].size),
                label,
                parseInt(auxTokenString, 16) >> 0,
                "byte",
              );
              if (r.msg != "") {
                return packCompileError(r.msg, "", "error", "danger");
              }
              data_address = r.data_address;
              label = null;
              console_log("byte Terminado");
              next_token();
              token = get_token();
              console_log("token: " + token);
              for (var z = 0; z < architecture.directives.length; z++) {
                if (
                  token == architecture.directives[z].name ||
                  token == null ||
                  token.search(/\:$/) != -1
                ) {
                  isByte = false;
                }
              }
              align = 1;
            }
            j = 0;
            break;
          case "half_word":
            console_log("half_word");
            var ishalf = true;
            next_token();
            while (ishalf) {
              token = get_token();
              if (token == null) {
                return packCompileError("m23", "", "error", "danger");
              }
              re = new RegExp("([0-9A-Fa-f-]),([0-9A-Fa-f-])");
              if (token.search(re) != -1) {
                return packCompileError("m24", token, "error", "danger");
              }
              re = new RegExp(",", "g");
              token = token.replace(re, "");
              console_log("half_word, " + token);
              var auxToken;
              var auxTokenString;
              if (token.match(/^0x/)) {
                var value = token.split("x");
                re = new RegExp("[0-9A-Fa-f]{" + value[1].length + "}", "g");
                if (value[1].search(re) == -1) {
                  return packCompileError("m15", token, "error", "danger");
                }
                auxTokenString = value[1].padStart(
                  2 * parseInt(architecture.directives[j].size),
                  "0",
                );
                if (value[1].length === 0) {
                  return packCompileError("m19", token, "error", "danger");
                }
                if (
                  auxTokenString.length >
                  2 * parseInt(architecture.directives[j].size)
                ) {
                  return packCompileError("m18", token, "error", "danger");
                }
                auxTokenString = auxTokenString.substring(
                  auxTokenString.length -
                    2 * parseInt(architecture.directives[j].size),
                  auxTokenString.length,
                );
              } else {
                var re = new RegExp("[0-9-]{" + token.length + "}", "g");
                if (token.search(re) == -1) {
                  return packCompileError("m15", token, "error", "danger");
                }
                auxToken = parseInt(token) >>> 0;
                auxTokenString = auxToken
                  .toString(16)
                  .substring(
                    auxToken.toString(16).length -
                      2 * parseInt(architecture.directives[j].size),
                    auxToken.toString(16).length,
                  )
                  .padStart(2 * parseInt(architecture.directives[j].size), "0");
                if (
                  auxTokenString.length >
                  2 * parseInt(architecture.directives[j].size)
                ) {
                  return packCompileError("m18", token, "error", "danger");
                }
                auxTokenString = auxTokenString.substring(
                  auxTokenString.length -
                    2 * parseInt(architecture.directives[j].size),
                  auxTokenString.length,
                );
              }
              console_log(auxTokenString);
              var r = creator_memory_data_compiler(
                data_address,
                auxTokenString,
                parseInt(architecture.directives[j].size),
                label,
                parseInt(auxTokenString, 16) >> 0,
                "half",
              );
              if (r.msg != "") {
                return packCompileError(r.msg, "", "error", "danger");
              }
              data_address = r.data_address;
              label = null;
              console_log("half Terminado");
              next_token();
              token = get_token();
              console_log("token: " + token);
              for (var z = 0; z < architecture.directives.length; z++) {
                if (
                  token == architecture.directives[z].name ||
                  token == null ||
                  token.search(/\:$/) != -1
                ) {
                  ishalf = false;
                }
              }
              align = 1;
            }
            j = 0;
            break;
          case "word":
            var isWord = true;
            next_token();
            while (isWord) {
              console_log("word");
              token = get_token();
              if (token == null) {
                return packCompileError("m23", "", "error", "danger");
              }
              re = new RegExp("([0-9A-Fa-f-]),([0-9A-Fa-f-])");
              if (token.search(re) != -1) {
                return packCompileError("m24", token, "error", "danger");
              }
              re = new RegExp(",", "g");
              token = token.replace(re, "");
              console_log("token: " + token);
              var auxToken;
              var auxTokenString;
              if (token.match(/^0x/)) {
                var value = token.split("x");
                re = new RegExp("[0-9A-Fa-f]{" + value[1].length + "}", "g");
                if (value[1].search(re) == -1) {
                  return packCompileError("m15", token, "error", "danger");
                }
                auxTokenString = value[1].padStart(
                  2 * parseInt(architecture.directives[j].size),
                  "0",
                );
                if (value[1].length == 0) {
                  return packCompileError("m19", token, "error", "danger");
                }
                if (
                  auxTokenString.length >
                  2 * parseInt(architecture.directives[j].size)
                ) {
                  return packCompileError("m18", token, "error", "danger");
                }
                auxTokenString = auxTokenString.substring(
                  auxTokenString.length -
                    2 * parseInt(architecture.directives[j].size),
                  auxTokenString.length,
                );
              } else {
                var re = new RegExp("[0-9-]{" + token.length + "}", "g");
                if (token.search(re) == -1) {
                  return packCompileError("m15", token, "error", "danger");
                }
                auxToken = parseInt(token) >>> 0;
                auxTokenString = auxToken
                  .toString(16)
                  .substring(
                    auxToken.toString(16).length -
                      2 * parseInt(architecture.directives[j].size),
                    auxToken.toString(16).length,
                  )
                  .padStart(2 * parseInt(architecture.directives[j].size), "0");
                if (
                  auxTokenString.length >
                  2 * parseInt(architecture.directives[j].size)
                ) {
                  return packCompileError("m18", token, "error", "danger");
                }
                auxTokenString = auxTokenString.substring(
                  auxTokenString.length -
                    2 * parseInt(architecture.directives[j].size),
                  auxTokenString.length,
                );
              }
              console_log(auxTokenString);
              var r = creator_memory_data_compiler(
                data_address,
                auxTokenString,
                parseInt(architecture.directives[j].size),
                label,
                parseInt(auxTokenString, 16) >> 0,
                "word",
              );
              if (r.msg != "") {
                return packCompileError(r.msg, "", "error", "danger");
              }
              data_address = r.data_address;
              label = null;
              console_log("word Terminado");
              next_token();
              token = get_token();
              console_log("token: " + token);
              for (var z = 0; z < architecture.directives.length; z++) {
                if (
                  token == architecture.directives[z].name ||
                  token == null ||
                  token.search(/\:$/) != -1
                ) {
                  isWord = false;
                }
              }
              align = 1;
            }
            j = 0;
            break;
          case "double_word":
            var isDoubleWord = true;
            next_token();
            while (isDoubleWord) {
              console_log("word");
              token = get_token();
              if (token == null) {
                return packCompileError("m23", "", "error", "danger");
              }
              re = new RegExp("([0-9A-Fa-f-]),([0-9A-Fa-f-])");
              if (token.search(re) != -1) {
                return packCompileError("m24", token, "error", "danger");
              }
              re = new RegExp(",", "g");
              token = token.replace(re, "");
              console_log("token: " + token);
              var auxToken;
              var auxTokenString;
              if (token.match(/^0x/)) {
                var value = token.split("x");
                re = new RegExp("[0-9A-Fa-f]{" + value[1].length + "}", "g");
                if (value[1].search(re) == -1) {
                  return packCompileError("m15", token, "error", "danger");
                }
                auxTokenString = value[1].padStart(
                  2 * parseInt(architecture.directives[j].size),
                  "0",
                );
                if (value[1].length == 0) {
                  return packCompileError("m19", token, "error", "danger");
                }
                if (
                  auxTokenString.length >
                  2 * parseInt(architecture.directives[j].size)
                ) {
                  return packCompileError("m18", token, "error", "danger");
                }
                auxTokenString = auxTokenString.substring(
                  auxTokenString.length -
                    2 * parseInt(architecture.directives[j].size),
                  auxTokenString.length,
                );
              } else {
                var re = new RegExp("[0-9-]{" + token.length + "}", "g");
                if (token.search(re) == -1) {
                  return packCompileError("m15", token, "error", "danger");
                }
                auxToken = parseInt(token) >>> 0;
                auxTokenString = auxToken
                  .toString(16)
                  .substring(
                    auxToken.toString(16).length -
                      2 * parseInt(architecture.directives[j].size),
                    auxToken.toString(16).length,
                  )
                  .padStart(2 * parseInt(architecture.directives[j].size), "0");
                if (
                  auxTokenString.length >
                  2 * parseInt(architecture.directives[j].size)
                ) {
                  return packCompileError("m18", token, "error", "danger");
                }
                auxTokenString = auxTokenString.substring(
                  auxTokenString.length -
                    2 * parseInt(architecture.directives[j].size),
                  auxTokenString.length,
                );
              }
              var r = creator_memory_data_compiler(
                data_address,
                auxTokenString,
                parseInt(architecture.directives[j].size),
                label,
                parseInt(auxTokenString, 16) >> 0,
                "double_word",
              );
              if (r.msg != "") {
                return packCompileError(r.msg, "", "error", "danger");
              }
              data_address = r.data_address;
              label = null;
              console_log("double word Terminado");
              next_token();
              token = get_token();
              console_log("token: " + token);
              for (var z = 0; z < architecture.directives.length; z++) {
                if (
                  token == architecture.directives[z].name ||
                  token == null ||
                  token.search(/\:$/) != -1
                ) {
                  isDoubleWord = false;
                }
              }
              align = 1;
            }
            j = 0;
            break;
          case "float":
            var isFloat = true;
            next_token();
            while (isFloat) {
              console_log("float");
              token = get_token();
              if (token == null) {
                return packCompileError("m23", "", "error", "danger");
              }
              re = new RegExp("([0-9A-Fa-f-]),([0-9A-Fa-f-])");
              if (token.search(re) != -1) {
                return packCompileError("m24", token, "error", "danger");
              }
              re = new RegExp(",", "g");
              token = token.replace(re, "");
              console_log("token: " + token);
              var auxToken;
              var auxTokenString;
              if (
                token == "-Inf" ||
                token == "-inf" ||
                token == "-Infinity" ||
                token == "-infinity"
              ) {
                token = "-Infinity";
                auxTokenString = "FF800000";
              } else if (
                token == "Inf" ||
                token == "+Inf" ||
                token == "inf" ||
                token == "+inf" ||
                token == "Infinity" ||
                token == "+Infinity" ||
                token == "infinity" ||
                token == "+infinity"
              ) {
                token = "+Infinity";
                auxTokenString = "7F800000";
              } else if (token == "NaN" || token == "nan") {
                token = "NaN";
                auxTokenString = "7FC00000";
              } else if (token.match(/^0x/)) {
                var value = token.split("x");
                re = new RegExp("[0-9A-Fa-f]{" + value[1].length + "}", "g");
                if (value[1].search(re) == -1) {
                  return packCompileError("m15", token, "error", "danger");
                }
                auxTokenString = value[1].padStart(
                  2 * parseInt(architecture.directives[j].size),
                  "0",
                );
                if (value[1].length == 0) {
                  return packCompileError("m19", token, "error", "danger");
                }
                if (
                  auxTokenString.length >
                  2 * parseInt(architecture.directives[j].size)
                ) {
                  return packCompileError("m18", token, "error", "danger");
                }
                auxTokenString = auxTokenString.substring(
                  auxTokenString.length -
                    2 * parseInt(architecture.directives[j].size),
                  auxTokenString.length,
                );
                token = hex2float(token);
              } else {
                var re = new RegExp("[+e0-9.-]{" + token.length + "}", "g");
                if (token.search(re) == -1) {
                  return packCompileError("m15", token, "error", "danger");
                }
                auxToken = parseFloat(token, 10);
                auxTokenString = bin2hex(float2bin(auxToken)).padStart(
                  2 * parseInt(architecture.directives[j].size),
                  "0",
                );
                if (
                  auxTokenString.length >
                  2 * parseInt(architecture.directives[j].size)
                ) {
                  return packCompileError("m18", token, "error", "danger");
                }
                auxTokenString = auxTokenString.substring(
                  auxTokenString.length -
                    2 * parseInt(architecture.directives[j].size),
                  auxTokenString.length,
                );
              }
              console_log(auxTokenString);
              var r = creator_memory_data_compiler(
                data_address,
                auxTokenString,
                parseInt(architecture.directives[j].size),
                label,
                token,
                "float",
              );
              if (r.msg != "") {
                return packCompileError(r.msg, "", "error", "danger");
              }
              data_address = r.data_address;
              label = null;
              console_log("float Terminado");
              next_token();
              token = get_token();
              console_log("token: " + token);
              for (var z = 0; z < architecture.directives.length; z++) {
                if (
                  token == architecture.directives[z].name ||
                  token == null ||
                  token.search(/\:$/) != -1
                ) {
                  isFloat = false;
                }
              }
              align = 1;
            }
            j = 0;
            break;
          case "double":
            var isDouble = true;
            next_token();
            while (isDouble) {
              console_log("double");
              token = get_token();
              if (token == null) {
                return packCompileError("m23", "", "error", "danger");
              }
              re = new RegExp("([0-9A-Fa-f-]),([0-9A-Fa-f-])");
              if (token.search(re) != -1) {
                return packCompileError("m24", token, "error", "danger");
              }
              re = new RegExp(",", "g");
              token = token.replace(re, "");
              console_log("token: " + token);
              var auxToken;
              var auxTokenString;
              if (
                token == "-Inf" ||
                token == "-inf" ||
                token == "-Infinity" ||
                token == "-infinity"
              ) {
                token = "-Infinity";
                auxTokenString = "FFF0000000000000";
              } else if (
                token == "Inf" ||
                token == "+Inf" ||
                token == "inf" ||
                token == "+inf" ||
                token == "Infinity" ||
                token == "+Infinity" ||
                token == "infinity" ||
                token == "+infinity"
              ) {
                token = "+Infinity";
                auxTokenString = "7FF0000000000000";
              } else if (token == "NaN" || token == "nan") {
                token = "NaN";
                auxTokenString = "7FF8000000000000";
              } else if (token.match(/^0x/)) {
                var value = token.split("x");
                re = new RegExp("[0-9A-Fa-f]{" + value[1].length + "}", "g");
                if (value[1].search(re) == -1) {
                  return packCompileError("m15", token, "error", "danger");
                }
                auxTokenString = value[1].padStart(
                  2 * parseInt(architecture.directives[j].size),
                  "0",
                );
                if (value[1].length == 0) {
                  return packCompileError("m19", token, "error", "danger");
                }
                if (
                  auxTokenString.length >
                  2 * parseInt(architecture.directives[j].size)
                ) {
                  return packCompileError("m18", token, "error", "danger");
                }
                auxTokenString = auxTokenString.substring(
                  auxTokenString.length -
                    2 * parseInt(architecture.directives[j].size),
                  auxTokenString.length,
                );
                token = hex2double(token);
              } else {
                var re = new RegExp("[+e0-9.-]{" + token.length + "}", "g");
                if (token.search(re) == -1) {
                  return packCompileError("m15", token, "error", "danger");
                }
                auxToken = parseFloat(token, 10);
                console_log(auxTokenString);
                auxTokenString = bin2hex(double2bin(auxToken)).padStart(
                  2 * parseInt(architecture.directives[j].size),
                  "0",
                );
                if (
                  auxTokenString.length >
                  2 * parseInt(architecture.directives[j].size)
                ) {
                  return packCompileError("m18", token, "error", "danger");
                }
                auxTokenString = auxTokenString.substring(
                  auxTokenString.length -
                    2 * parseInt(architecture.directives[j].size),
                  auxTokenString.length,
                );
              }
              console_log(auxTokenString);
              var r = creator_memory_data_compiler(
                data_address,
                auxTokenString,
                parseInt(architecture.directives[j].size),
                label,
                token,
                "double",
              );
              if (r.msg != "") {
                return packCompileError(r.msg, "", "error", "danger");
              }
              data_address = r.data_address;
              label = null;
              console_log("double Terminado");
              next_token();
              token = get_token();
              console_log("token: " + token);
              for (var z = 0; z < architecture.directives.length; z++) {
                if (
                  token == architecture.directives[z].name ||
                  token == null ||
                  token.search(/\:$/) != -1
                ) {
                  isDouble = false;
                }
              }
              align = 1;
            }
            j = 0;
            break;
          case "ascii_not_null_end":
            console_log("ascii_not_null_end");
            var isAscii = true;
            var nextToken = 1;
            next_token();
            while (isAscii) {
              token = get_token();
              console_log("token: " + token);
              string = token;
              re = new RegExp('^"');
              if (string.search(re) != -1) {
                string = string.replace(re, "");
                console_log(string);
              } else {
                return packCompileError("m16", "", "error", "danger");
              }
              re = new RegExp('"$');
              if (string.search(re) != -1) {
                string = string.replace(re, "");
                console_log(string);
              } else {
                return packCompileError("m17", "", "error", "danger");
              }
              if (token == null) {
                break;
              }
              data_address = creator_memory_storestring(
                string,
                string.length,
                data_address,
                label,
                "ascii",
                align,
              );
              console_log("ascii_not_null_end Terminado");
              if (nextToken === 1) {
                next_token();
                token = get_token();
                console_log("token: " + token);
              }
              nextToken = 1;
              for (var z = 0; z < architecture.directives.length; z++) {
                if (
                  token == architecture.directives[z].name ||
                  token == null ||
                  token.search(/\:$/) != -1
                ) {
                  isAscii = false;
                }
              }
              align = 1;
            }
            j = 0;
            break;
          case "ascii_null_end":
            console_log("ascii_null_end");
            var isAscii = true;
            var nextToken = 1;
            next_token();
            while (isAscii) {
              console_log("ascii_null_end");
              token = get_token();
              console_log("token: " + token);
              if (token == null) {
                break;
              }
              string = token;
              re = new RegExp('^"');
              if (string.search(re) != -1) {
                string = string.replace(re, "");
                console_log(string);
              } else {
                return packCompileError("m16", "", "error", "danger");
              }
              re = new RegExp('"$');
              if (string.search(re) != -1) {
                string = string.replace(re, "");
                console_log(string);
              } else {
                return packCompileError("m17", "", "error", "danger");
              }
              data_address =
                creator_memory_storestring(
                  string,
                  string.length,
                  data_address,
                  label,
                  "asciiz",
                  align,
                ) + 1;
              console_log("ascii_null_end Terminado");
              if (nextToken == 1) {
                next_token();
                token = get_token();
                console_log("token: " + token);
              }
              nextToken = 1;
              for (var z = 0; z < architecture.directives.length; z++) {
                if (
                  token == architecture.directives[z].name ||
                  token == null ||
                  token.search(/\:$/) != -1
                ) {
                  isAscii = false;
                }
              }
              align = 1;
            }
            j = 0;
            break;
          case "space":
            console_log("space");
            var string = "";
            next_token();
            token = get_token();
            console_log("token: " + token);
            if (token == null) {
              return packCompileError("m23", "", "error", "danger");
            }
            var re = new RegExp("[0-9-]{" + token.length + "}", "g");
            if (token.search(re) == -1) {
              return packCompileError("m15", token, "error", "danger");
            }
            if (parseInt(token) <= 0) {
              return packCompileError("m11", token, "error", "danger");
            }
            if (parseInt(token) > 50 * 1024 * 1024) {
              return packCompileError("m10", token, "error", "danger");
            }
            var size =
              parseInt(token) * parseInt(architecture.directives[j].size);
            data_address = creator_memory_storestring(
              size,
              size,
              data_address,
              label,
              "space",
              align,
            );
            next_token();
            token = get_token();
            console_log("token: " + token);
            align = 1;
            console_log("space Terminado");
            j = 0;
            break;
          case "align":
          case "balign":
            console_log("[b]align");
            let pow_mode = token == ".align";
            next_token();
            token = get_token();
            console_log("token: " + token);
            if (token == null) {
              return packCompileError("m23", "", "error", "danger");
            }
            var re = new RegExp("[0-9-]{" + token.length + "}", "g");
            if (token.search(re) == -1) {
              return packCompileError("m15", token, "error", "danger");
            }
            if (parseInt(token) < 0) {
              return packCompileError("m22", token, "error", "danger");
            }
            align = pow_mode ? Math.pow(2, parseInt(token)) : token;
            console_log(align);
            next_token();
            token = get_token();
            console_log("token: " + token);
            console_log("align Terminado");
            j = 0;
            break;
          default:
            console_log("Default");
            existsData = false;
            break;
        }
      } else if (
        j == architecture.directives.length - 1 &&
        token != architecture.directives[j].name &&
        token != null &&
        token.search(/\:$/) == -1
      ) {
        creator_memory_prereset();
        return ret;
      }
    }
  }
  creator_memory_prereset();
  return ret;
}
function code_segment_compiler() {
  var ret = { errorcode: "", token: "", type: "", update: "", status: "ok" };
  var existsInstruction = true;
  next_token();
  var instInit = tokenIndex;
  while (existsInstruction) {
    token = get_token();
    for (var i = 0; i < architecture.directives.length; i++) {
      if (
        token == architecture.directives[i].name &&
        architecture.directives[i].action == "global_symbol"
      ) {
        next_token();
        next_token();
        token = get_token();
      } else if (token == architecture.directives[i].name) {
        if (typeof app !== "undefined") app._data.instructions = instructions;
        console_log("token: " + token);
        for (var i = 0; i < instructions.length; i++) {
          if (instructions[i].Label != "") {
            instructions_tag.push({
              tag: instructions[i].Label,
              addr: parseInt(instructions[i].Address, 16),
            });
            tag_instructions[parseInt(instructions[i].Address, 16)] =
              instructions[i].Label;
          }
        }
        return ret;
      }
    }
    var label = "";
    var validTagPC = true;
    if (token == null) {
      break;
    }
    console_log("token: " + token);
    var found = false;
    var end = false;
    if (token.search(/\:$/) != -1) {
      if (token.length === 1) {
        return packCompileError("m0", "Empty label", "error", "danger");
      }
      var ret1 = creator_memory_findaddress_bytag(
        token.substring(0, token.length - 1),
      );
      if (ret1.exit == 1) {
        return packCompileError(
          "m1",
          token.substring(0, token.length - 1),
          "error",
          "danger",
        );
      }
      for (var i = 0; i < instructions.length; i++) {
        if (instructions[i].Label == token.substring(0, token.length - 1)) {
          return packCompileError(
            "m1",
            token.substring(0, token.length - 1),
            "error",
            "danger",
          );
        }
      }
      label = token.substring(0, token.length - 1);
      next_token();
      instInit = tokenIndex;
      token = get_token();
      if (token != null) {
        var re = new RegExp(",+$");
        token = token.replace(re, "");
      } else {
        var instIndex;
        for (var i = 0; i < architecture.instructions.length; i++) {
          if (architecture.instructions[i].name == "nop") {
            instIndex = i;
          }
        }
        instruction_compiler(
          "nop",
          "nop",
          label,
          tokenIndex,
          false,
          0,
          instInit,
          instIndex,
          false,
        );
        end = true;
        found = true;
      }
    }
    var re = new RegExp(",+$");
    if (token != null) {
      token = token.replace(re, "");
      console_log("token: " + token);
      var stopFor = false;
    }
    for (
      var i = 0;
      i < architecture.instructions.length &&
      stopFor === false &&
      end === false;
      i++
    ) {
      if (architecture.instructions[i].name != token) {
        continue;
      } else {
        var instruction = "";
        var userInstruction = "";
        var numFields = 0;
        found = true;
        for (var j = 0; j < architecture.instructions[i].fields.length; j++) {
          if (architecture.instructions[i].fields[j].type != "cop") {
            numFields++;
          }
        }
        console_log(numFields);
        instruction = instruction + token;
        userInstruction = userInstruction + token;
        for (var j = 0; j < numFields - 1; j++) {
          next_token();
          token = get_token();
          console_log("token: " + token);
          if (token != null) {
            var re = new RegExp(",+$");
            token = token.replace(re, "");
            instruction = instruction + " " + token;
            userInstruction = userInstruction + " " + token;
          }
        }
        console_log(instruction);
        console_log(label);
        ret = instruction_compiler(
          instruction,
          userInstruction,
          label,
          tokenIndex,
          false,
          0,
          instInit,
          i,
          false,
        );
        if (ret.status != "ok") {
          return ret;
        }
        next_token();
        instInit = tokenIndex;
        stopFor = true;
      }
    }
    if (!found) {
      var resultPseudo = -3;
      var instruction = "";
      var numToken = 0;
      var exists = false;
      var inst = token;
      console_log("token: " + token);
      for (
        var i = 0;
        i < architecture.pseudoinstructions.length && exists === false;
        i++
      ) {
        if (architecture.pseudoinstructions[i].name == token) {
          numToken = architecture.pseudoinstructions[i].fields.length;
          console_log(numToken);
          exists = true;
          instruction = instruction + token;
          for (var i = 0; i < numToken; i++) {
            next_token();
            token = get_token();
            if (token != null) {
              var re = new RegExp(",+$");
              token = token.replace(re, "");
            }
            instruction = instruction + " " + token;
          }
          resultPseudo = pseudoinstruction_compiler(
            instruction,
            label,
            tokenIndex,
          );
          console_log(resultPseudo);
          if (resultPseudo.status != "ok") {
            return resultPseudo;
          }
        }
      }
      if (resultPseudo == -3) {
        for (var i = 0; i < architecture.components.length; i++) {
          for (var j = 0; j < architecture.components[i].elements.length; j++) {
            var re = new RegExp(
              architecture.components[i].elements[j].name.join("|"),
            );
            if (token.search(re) != -1) {
              existsInstruction = false;
              instructions = [];
              pending_instructions = [];
              pending_tags = [];
              data_tag = [];
              instructions_binary = [];
              extern = [];
              creator_memory_clear();
              data = [];
              ret = packCompileError("m26", nEnters + 1, "error", "danger");
              return ret;
            }
          }
        }
        existsInstruction = false;
        instructions = [];
        pending_instructions = [];
        pending_tags = [];
        data_tag = [];
        instructions_binary = [];
        extern = [];
        creator_memory_clear();
        data = [];
        ret = packCompileError("m2", token, "error", "danger");
        return ret;
      }
      if (resultPseudo == -2) {
        existsInstruction = false;
        instructions = [];
        pending_instructions = [];
        pending_tags = [];
        data_tag = [];
        instructions_binary = [];
        extern = [];
        data = [];
        creator_memory_clear();
        ret = packCompileError("m2", token, "error", "danger");
        return ret;
      }
      if (resultPseudo == -1) {
        existsInstruction = false;
        instructions = [];
        pending_instructions = [];
        pending_tags = [];
        data_tag = [];
        instructions_binary = [];
        extern = [];
        data = [];
        creator_memory_clear();
        ret = packCompileError("m24", "", "error", "danger");
        return ret;
      }
      next_token();
      instInit = tokenIndex;
    }
  }
  token = get_token();
  console_log("token: " + token);
  if (typeof app !== "undefined") app._data.instructions = instructions;
  for (var i = 0; i < instructions.length; i++) {
    if (instructions[i].Label != "") {
      instructions_tag.push({
        tag: instructions[i].Label,
        addr: parseInt(instructions[i].Address, 16),
      });
      tag_instructions[parseInt(instructions[i].Address, 16)] =
        instructions[i].Label;
    }
  }
  return ret;
}
function instruction_compiler(
  instruction,
  userInstruction,
  label,
  line,
  pending,
  pendingAddress,
  instInit,
  instIndex,
  isPseudo,
) {
  var ret = { errorcode: "", token: "", type: "", update: "", status: "ok" };
  if (instIndex == null) {
    instIndex = 0;
  }
  console_log(instruction);
  console_log(instIndex);
  var re = new RegExp("^ +");
  var oriInstruction = instruction.replace(re, "");
  re = new RegExp(" +", "g");
  oriInstruction = oriInstruction.replace(re, " ");
  var instructionParts = oriInstruction.split(" ");
  var validTagPC = true;
  var startBit;
  var stopBit;
  var resultPseudo = -3;
  console_log(label);
  console_log(line);
  var stopFor = false;
  for (
    var i = instIndex;
    i < architecture.instructions.length && stopFor === false;
    i++
  ) {
    if (architecture.instructions[i].name != instructionParts[0]) {
      continue;
    } else {
      var auxSignature = architecture.instructions[i].signatureRaw;
      var tag = "";
      var binary = "";
      binary = binary.padStart(architecture.instructions[i].nwords * 32, "0");
      var instruction = architecture.instructions[i].signature_definition;
      var userInstruction = userInstruction;
      var signatureDef = architecture.instructions[i].signature_definition;
      signatureDef = signatureDef.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      re = new RegExp("[fF][0-9]+", "g");
      signatureDef = signatureDef.replace(re, "(.*?)");
      re = new RegExp(",", "g");
      var signature = architecture.instructions[i].signature.replace(re, " ");
      re = new RegExp(signatureDef + "$");
      var match = re.exec(signature);
      var signatureParts = [];
      for (var j = 1; j < match.length; j++) {
        signatureParts.push(match[j]);
      }
      match = re.exec(architecture.instructions[i].signatureRaw);
      var signatureRawParts = [];
      for (var j = 1; j < match.length; j++) {
        signatureRawParts.push(match[j]);
      }
      console_log(signatureParts);
      console_log(signatureRawParts);
      re = new RegExp(signatureDef + "$");
      console_log(re);
      if (oriInstruction.search(re) == -1) {
        if (isPseudo === false) {
          console_log(get_token());
          tokenIndex = instInit;
          token = get_token();
          console_log("token: " + token);
        } else {
          token = instructionParts[0];
        }
        var resultPseudo = null;
        var instruction = "";
        var numToken = 0;
        console_log("token: " + token);
        for (var i = i + 1; i < architecture.instructions.length; i++) {
          if (architecture.instructions[i].name == token) {
            var index = i;
            numToken = architecture.instructions[i].fields.length;
            instruction = instruction + token;
            for (var a = 1; a < numToken; a++) {
              if (architecture.instructions[i].fields[a].type != "cop") {
                if (isPseudo === false) {
                  next_token();
                  token = get_token();
                  if (token != null) {
                    var re = new RegExp(",+$");
                    token = token.replace(re, "");
                  }
                } else {
                  token = instructionParts[a];
                }
                instruction = instruction + " " + token;
                console_log(instruction);
              }
            }
            if (isPseudo === false) {
              ret = instruction_compiler(
                instruction,
                instruction,
                label,
                line,
                pending,
                pendingAddress,
                instInit,
                index,
                false,
              );
            } else {
              ret = instruction_compiler(
                instruction,
                userInstruction,
                label,
                line,
                pending,
                pendingAddress,
                instInit,
                index,
                false,
              );
            }
            return ret;
          }
        }
        for (var i = 0; i < architecture.pseudoinstructions.length; i++) {
          if (architecture.pseudoinstructions[i].name == token) {
            numToken = architecture.pseudoinstructions[i].fields.length;
            instruction = instruction + token;
            for (var i = 0; i < numToken; i++) {
              next_token();
              token = get_token();
              if (token != null) {
                var re = new RegExp(",+$");
                token = token.replace(re, "");
              }
              instruction = instruction + " " + token;
            }
            console_log(instruction);
            resultPseudo = pseudoinstruction_compiler(
              instruction,
              label,
              tokenIndex,
            );
            console_log(resultPseudo);
            if (resultPseudo.status == "ok") {
              return resultPseudo;
            }
            if (resultPseudo.errorcode === 3) {
              return resultPseudo;
            }
          }
        }
      }
      if (resultPseudo == null) {
        return packCompileError("m3", auxSignature, "error", "danger");
      }
      console_log(oriInstruction);
      console_log(re);
      match = re.exec(oriInstruction);
      instructionParts = [];
      if (match != null) {
        for (var j = 1; j < match.length; j++) {
          instructionParts.push(match[j]);
        }
      } else {
        return packCompileError("m3", auxSignature, "error", "danger");
      }
      console_log(instructionParts);
      re = new RegExp("[fF][0-9]+");
      while (instruction.search(re) != -1) {
        re = new RegExp("[fF]([0-9]+)");
        var match = re.exec(instruction);
        re = new RegExp("[fF][0-9]+");
        instruction = instruction.replace(re, "Field" + match[1]);
      }
      for (var j = 0; j < signatureParts.length; j++) {
        console_log(signatureParts[j]);
        switch (signatureParts[j]) {
          case "INT-Reg":
            token = instructionParts[j];
            console_log("token: " + token);
            var validReg = false;
            for (
              var a = 0;
              a < architecture.instructions[i].fields.length;
              a++
            ) {
              if (
                architecture.instructions[i].fields[a].name ==
                signatureRawParts[j]
              ) {
                for (var z = 0; z < architecture_hash.length; z++) {
                  for (
                    var w = 0;
                    w < architecture.components[z].elements.length;
                    w++
                  ) {
                    if (
                      architecture.components[z].elements[w].name.includes(
                        token,
                      ) !== false &&
                      architecture.components[z].type == "int_registers"
                    ) {
                      validReg = true;
                      fieldsLength =
                        architecture.instructions[i].fields[a].startbit -
                        architecture.instructions[i].fields[a].stopbit +
                        1;
                      var reg = w;
                      if (reg.toString(2).length > fieldsLength) {
                        return packCompileError(
                          "m12",
                          token,
                          "error",
                          "danger",
                        );
                      }
                      console_log(reg);
                      console_log(reg.toString(2).padStart(fieldsLength, "0"));
                      console_log(binary);
                      console_log(binary.length);
                      console_log(
                        architecture.instructions[i].fields[a].startbit + 1,
                      );
                      console_log(
                        binary.length -
                          (architecture.instructions[i].fields[a].startbit + 1),
                      );
                      binary =
                        binary.substring(
                          0,
                          binary.length -
                            (architecture.instructions[i].fields[a].startbit +
                              1),
                        ) +
                        reg.toString(2).padStart(fieldsLength, "0") +
                        binary.substring(
                          binary.length -
                            architecture.instructions[i].fields[a].stopbit,
                          binary.length,
                        );
                      console_log(binary);
                      re = RegExp("Field[0-9]+");
                      instruction = instruction.replace(re, token);
                    } else if (
                      z == architecture_hash.length - 1 &&
                      w == architecture.components[z].elements.length - 1 &&
                      validReg === false
                    ) {
                      return packCompileError("m4", token, "error", "danger");
                    }
                  }
                }
              }
            }
            break;
          case "SFP-Reg":
            token = instructionParts[j];
            console_log("token: " + token);
            var validReg = false;
            var regNum = 0;
            for (
              var a = 0;
              a < architecture.instructions[i].fields.length;
              a++
            ) {
              if (
                architecture.instructions[i].fields[a].name ==
                signatureRawParts[j]
              ) {
                for (var z = 0; z < architecture_hash.length; z++) {
                  if (
                    architecture.components[z].double_precision_type == "linked"
                  ) {
                    for (
                      var w = 0;
                      w < architecture.components[z].elements.length;
                      w++
                    ) {
                      if (
                        architecture.components[z].elements[w].name.includes(
                          token,
                        ) !== false &&
                        architecture.components[z].type == "fp_registers" &&
                        architecture.components[z].double_precision === false
                      ) {
                        validReg = true;
                        regNum++;
                        fieldsLength =
                          architecture.instructions[i].fields[a].startbit -
                          architecture.instructions[i].fields[a].stopbit +
                          1;
                        var reg = w;
                        if (reg.toString(2).length > fieldsLength) {
                          return packCompileError(
                            "m12",
                            token,
                            "error",
                            "danger",
                          );
                        }
                        binary =
                          binary.substring(
                            0,
                            binary.length -
                              (architecture.instructions[i].fields[a].startbit +
                                1),
                          ) +
                          reg.toString(2).padStart(fieldsLength, "0") +
                          binary.substring(
                            binary.length -
                              architecture.instructions[i].fields[a].stopbit,
                            binary.length,
                          );
                        re = RegExp("Field[0-9]+");
                        console_log(instruction);
                        instruction = instruction.replace(re, token);
                        console_log(instruction);
                      } else if (
                        z == architecture_hash.length - 1 &&
                        w == architecture.components[z].elements.length - 1 &&
                        validReg === false
                      ) {
                        return packCompileError("m4", token, "error", "danger");
                      }
                      if (
                        architecture.components[z].type == "fp_registers" &&
                        architecture.components[z].double_precision === false
                      ) {
                        regNum++;
                      }
                    }
                  } else {
                    for (
                      var w = 0;
                      w < architecture.components[z].elements.length;
                      w++
                    ) {
                      if (
                        architecture.components[z].elements[w].name.includes(
                          token,
                        ) !== false &&
                        architecture.components[z].type == "fp_registers"
                      ) {
                        validReg = true;
                        regNum++;
                        fieldsLength =
                          architecture.instructions[i].fields[a].startbit -
                          architecture.instructions[i].fields[a].stopbit +
                          1;
                        var reg = w;
                        if (reg.toString(2).length > fieldsLength) {
                          return packCompileError(
                            "m12",
                            token,
                            "error",
                            "danger",
                          );
                        }
                        binary =
                          binary.substring(
                            0,
                            binary.length -
                              (architecture.instructions[i].fields[a].startbit +
                                1),
                          ) +
                          reg.toString(2).padStart(fieldsLength, "0") +
                          binary.substring(
                            binary.length -
                              architecture.instructions[i].fields[a].stopbit,
                            binary.length,
                          );
                        re = RegExp("Field[0-9]+");
                        console_log(instruction);
                        instruction = instruction.replace(re, token);
                        console_log(instruction);
                      } else if (
                        z == architecture_hash.length - 1 &&
                        w == architecture.components[z].elements.length - 1 &&
                        validReg === false
                      ) {
                        return packCompileError("m4", token, "error", "danger");
                      }
                      if (
                        architecture.components[z].type == "fp_registers" &&
                        architecture.components[z].double_precision === false
                      ) {
                        regNum++;
                      }
                    }
                  }
                }
              }
            }
            break;
          case "DFP-Reg":
            token = instructionParts[j];
            console_log("token: " + token);
            var validReg = false;
            var regNum = 0;
            for (
              var a = 0;
              a < architecture.instructions[i].fields.length;
              a++
            ) {
              if (
                architecture.instructions[i].fields[a].name ==
                signatureRawParts[j]
              ) {
                for (var z = 0; z < architecture_hash.length; z++) {
                  if (
                    architecture.components[z].double_precision_type == "linked"
                  ) {
                    for (
                      var w = 0;
                      w < architecture.components[z].elements.length;
                      w++
                    ) {
                      if (
                        architecture.components[z].elements[w].name.includes(
                          token,
                        ) !== false &&
                        architecture.components[z].type == "fp_registers" &&
                        architecture.components[z].double_precision === true
                      ) {
                        validReg = true;
                        regNum++;
                        fieldsLength =
                          architecture.instructions[i].fields[a].startbit -
                          architecture.instructions[i].fields[a].stopbit +
                          1;
                        var reg = w;
                        if (reg.toString(2).length > fieldsLength) {
                          return packCompileError(
                            "m12",
                            token,
                            "error",
                            "danger",
                          );
                        }
                        binary =
                          binary.substring(
                            0,
                            binary.length -
                              (architecture.instructions[i].fields[a].startbit +
                                1),
                          ) +
                          reg.toString(2).padStart(fieldsLength, "0") +
                          binary.substring(
                            binary.length -
                              architecture.instructions[i].fields[a].stopbit,
                            binary.length,
                          );
                        re = RegExp("Field[0-9]+");
                        instruction = instruction.replace(re, token);
                      } else if (
                        z == architecture_hash.length - 1 &&
                        w == architecture.components[z].elements.length - 1 &&
                        validReg === false
                      ) {
                        return packCompileError("m4", token, "error", "danger");
                      }
                      if (
                        architecture.components[z].type == "fp_registers" &&
                        architecture.components[z].double_precision === true
                      ) {
                        regNum++;
                      }
                    }
                  } else {
                    for (
                      var w = 0;
                      w < architecture.components[z].elements.length;
                      w++
                    ) {
                      if (
                        architecture.components[z].elements[w].name.includes(
                          token,
                        ) !== false &&
                        architecture.components[z].type == "fp_registers"
                      ) {
                        validReg = true;
                        regNum++;
                        fieldsLength =
                          architecture.instructions[i].fields[a].startbit -
                          architecture.instructions[i].fields[a].stopbit +
                          1;
                        var reg = w;
                        if (reg.toString(2).length > fieldsLength) {
                          return packCompileError(
                            "m12",
                            token,
                            "error",
                            "danger",
                          );
                        }
                        binary =
                          binary.substring(
                            0,
                            binary.length -
                              (architecture.instructions[i].fields[a].startbit +
                                1),
                          ) +
                          reg.toString(2).padStart(fieldsLength, "0") +
                          binary.substring(
                            binary.length -
                              architecture.instructions[i].fields[a].stopbit,
                            binary.length,
                          );
                        re = RegExp("Field[0-9]+");
                        instruction = instruction.replace(re, token);
                      } else if (
                        z == architecture_hash.length - 1 &&
                        w == architecture.components[z].elements.length - 1 &&
                        validReg === false
                      ) {
                        return packCompileError("m4", token, "error", "danger");
                      }
                      if (
                        architecture.components[z].type == "fp_registers" &&
                        architecture.components[z].double_precision === true
                      ) {
                        regNum++;
                      }
                    }
                  }
                }
              }
            }
            break;
          case "Ctrl-Reg":
            token = instructionParts[j];
            console_log("token: " + token);
            var validReg = false;
            var regNum = 0;
            for (
              var a = 0;
              a < architecture.instructions[i].fields.length;
              a++
            ) {
              if (
                architecture.instructions[i].fields[a].name ==
                signatureRawParts[j]
              ) {
                for (var z = 0; z < architecture_hash.length; z++) {
                  for (
                    var w = 0;
                    w < architecture.components[z].elements.length;
                    w++
                  ) {
                    if (
                      architecture.components[z].elements[w].name.includes(
                        token,
                      ) !== false &&
                      architecture.components[z].type == "ctr_registers"
                    ) {
                      validReg = true;
                      regNum++;
                      fieldsLength =
                        architecture.instructions[i].fields[a].startbit -
                        architecture.instructions[i].fields[a].stopbit +
                        1;
                      var reg = w;
                      if (reg.toString(2).length > fieldsLength) {
                        return packCompileError(
                          "m12",
                          token,
                          "error",
                          "danger",
                        );
                      }
                      binary =
                        binary.substring(
                          0,
                          binary.length -
                            (architecture.instructions[i].fields[a].startbit +
                              1),
                        ) +
                        reg.toString(2).padStart(fieldsLength, "0") +
                        binary.substring(
                          binary.length -
                            architecture.instructions[i].fields[a].stopbit,
                          binary.length,
                        );
                      re = RegExp("Field[0-9]+");
                      instruction = instruction.replace(re, token);
                    } else if (
                      z == architecture_hash.length - 1 &&
                      w == architecture.components[z].elements.length - 1 &&
                      validReg === false
                    ) {
                      return packCompileError("m4", token, "error", "danger");
                    }
                    if (architecture.components[z].type == "ctr_registers") {
                      regNum++;
                    }
                  }
                }
              }
            }
            break;
          case "inm-signed":
            token = instructionParts[j];
            var token_user = "";
            console_log("token: " + token);
            for (
              var a = 0;
              a < architecture.instructions[i].fields.length;
              a++
            ) {
              if (
                architecture.instructions[i].fields[a].name ==
                signatureRawParts[j]
              ) {
                fieldsLength = getFieldLength(
                  architecture.instructions[i].separated,
                  architecture.instructions[i].fields[a].startbit,
                  architecture.instructions[i].fields[a].stopbit,
                  a,
                );
                var inm;
                if (token.match(/^0x/)) {
                  var value = token.split("x");
                  if (value[1].length * 4 > fieldsLength) {
                    resultPseudo = pseudoinstruction_compiler(
                      oriInstruction,
                      label,
                      line,
                    );
                    console_log(resultPseudo);
                    if (resultPseudo.status != "ok") {
                      return resultPseudo;
                    }
                  }
                  if (isNaN(parseInt(token, 16)) === true) {
                    return packCompileError("m6", token, "error", "danger");
                  }
                  inm = parseInt(token, 16).toString(2);
                } else if (token.match(/^(\d)+\.(\d)+/)) {
                  if (float2bin(parseFloat(token)).length > fieldsLength) {
                    resultPseudo = pseudoinstruction_compiler(
                      oriInstruction,
                      label,
                      line,
                    );
                    console_log(resultPseudo);
                    if (resultPseudo.status != "ok") {
                      return resultPseudo;
                    }
                  }
                  if (isNaN(parseFloat(token)) === true) {
                    return packCompileError("m6", token, "error", "danger");
                  }
                  inm = float2bin(parseFloat(token, 16));
                } else if (token.match(/^\'(.*?)\'$/)) {
                  var re = /^\'(.*?)\'$/;
                  console_log(re);
                  var match = re.exec(token);
                  console_log(match);
                  var asciiCode = match[1].charCodeAt(0);
                  console_log(asciiCode);
                  re = RegExp("Field[0-9]+");
                  instruction = instruction.replace(re, asciiCode);
                  inm = (asciiCode >>> 0).toString(2);
                } else if (isNaN(parseInt(token))) {
                  validTagPC = false;
                  startBit = architecture.instructions[i].fields[a].startbit;
                  stopBit = architecture.instructions[i].fields[a].stopbit;
                } else {
                  var comNumPos = Math.pow(2, fieldsLength - 1);
                  var comNumNeg = comNumPos * -1;
                  comNumPos = comNumPos - 1;
                  console_log(comNumPos);
                  console_log(comNumNeg);
                  if (
                    parseInt(token, 10) > comNumPos ||
                    parseInt(token, 10) < comNumNeg
                  ) {
                    console_log(oriInstruction);
                    console_log(label);
                    console_log(line);
                    resultPseudo = pseudoinstruction_compiler(
                      oriInstruction,
                      label,
                      line,
                    );
                    console_log(resultPseudo);
                    if (resultPseudo.status != "ok") {
                      return resultPseudo;
                    }
                  }
                  if (isNaN(parseInt(token)) === true && resultPseudo == -3) {
                    return packCompileError("m6", token, "error", "danger");
                  }
                  inm = (parseInt(token, 10) >>> 0).toString(2);
                  inm = inm.substring(inm.length - fieldsLength, inm.length);
                }
                if (validTagPC === true) {
                  console_log(inm.length);
                  if (
                    inm.length >
                    architecture.instructions[i].fields[a].startbit -
                      architecture.instructions[i].fields[a].stopbit +
                      1
                  ) {
                    return packCompileError("m12", token, "error", "danger");
                  }
                  binary = generateBinary(
                    architecture.instructions[i].separated,
                    architecture.instructions[i].fields[a].startbit,
                    architecture.instructions[i].fields[a].stopbit,
                    binary,
                    inm,
                    fieldsLength,
                    a,
                  );
                }
                re = RegExp("Field[0-9]+");
                instruction = instruction.replace(re, token);
              }
            }
            break;
          case "inm-unsigned":
            token = instructionParts[j];
            var token_user = "";
            console_log("token: " + token);
            for (
              var a = 0;
              a < architecture.instructions[i].fields.length;
              a++
            ) {
              if (
                architecture.instructions[i].fields[a].name ==
                signatureRawParts[j]
              ) {
                if (
                  !architecture.instructions[i].separated ||
                  !architecture.instructions[i].separated[a]
                )
                  fieldsLength =
                    architecture.instructions[i].fields[a].startbit -
                    architecture.instructions[i].fields[a].stopbit +
                    1;
                else {
                  fieldsLength = architecture.instructions[i].fields[a].startbit
                    .map(
                      (b, iii) =>
                        b -
                        architecture.instructions[i].fields[a].stopbit[iii] +
                        1,
                    )
                    .reduce((old, newV) => old + newV);
                }
                fieldsLength = getFieldLength(
                  architecture.instructions[i].separated,
                  architecture.instructions[i].fields[a].startbit,
                  architecture.instructions[i].fields[a].stopbit,
                  a,
                );
                var inm;
                if (token.match(/^0x/)) {
                  var value = token.split("x");
                  if (value[1].length * 4 > fieldsLength) {
                    resultPseudo = pseudoinstruction_compiler(
                      oriInstruction,
                      label,
                      line,
                    );
                    console_log(resultPseudo);
                    if (resultPseudo.status != "ok") {
                      return resultPseudo;
                    }
                  }
                  if (isNaN(parseInt(token, 16)) === true) {
                    return packCompileError("m6", token, "error", "danger");
                  }
                  inm = parseInt(token, 16).toString(2);
                } else if (token.match(/^(\d)+\.(\d)+/)) {
                  if (float2bin(parseFloat(token)).length > fieldsLength) {
                    resultPseudo = pseudoinstruction_compiler(
                      oriInstruction,
                      label,
                      line,
                    );
                    console_log(resultPseudo);
                    if (resultPseudo.status != "ok") {
                      return resultPseudo;
                    }
                  }
                  if (isNaN(parseFloat(token)) === true) {
                    return packCompileError("m6", token, "error", "danger");
                  }
                  inm = float2bin(parseFloat(token, 16));
                } else if (token.match(/^\'(.*?)\'$/)) {
                  var re = /^\'(.*?)\'$/;
                  console_log(re);
                  var match = re.exec(token);
                  console_log(match);
                  var asciiCode = match[1].charCodeAt(0);
                  console_log(asciiCode);
                  re = RegExp("Field[0-9]+");
                  instruction = instruction.replace(re, asciiCode);
                  inm = (asciiCode >>> 0).toString(2);
                } else if (isNaN(parseInt(token))) {
                  validTagPC = false;
                  startBit = architecture.instructions[i].fields[a].startbit;
                  stopBit = architecture.instructions[i].fields[a].stopbit;
                } else {
                  var comNumPos = Math.pow(2, fieldsLength);
                  console_log(comNumPos);
                  if (parseInt(token, 10) > comNumPos) {
                    console_log(oriInstruction);
                    console_log(label);
                    console_log(line);
                    resultPseudo = pseudoinstruction_compiler(
                      oriInstruction,
                      label,
                      line,
                    );
                    console_log(resultPseudo);
                    if (resultPseudo.status != "ok") {
                      return resultPseudo;
                    }
                  }
                  if (isNaN(parseInt(token)) === true && resultPseudo == -3) {
                    return packCompileError("m6", token, "error", "danger");
                  }
                  inm = (parseInt(token, 10) >>> 0).toString(2);
                  inm = inm.substring(inm.length - fieldsLength, inm.length);
                }
                if (validTagPC === true) {
                  console_log(inm.length);
                  if (
                    inm.length >
                    architecture.instructions[i].fields[a].startbit -
                      architecture.instructions[i].fields[a].stopbit +
                      1
                  ) {
                    return packCompileError("m12", token, "error", "danger");
                  }
                  binary = generateBinary(
                    architecture.instructions[i].separated,
                    architecture.instructions[i].fields[a].startbit,
                    architecture.instructions[i].fields[a].stopbit,
                    binary,
                    inm,
                    fieldsLength,
                    a,
                  );
                }
                re = RegExp("Field[0-9]+");
                instruction = instruction.replace(re, token);
              }
            }
            break;
          case "address":
            token = instructionParts[j];
            console_log("token: " + token);
            for (
              var a = 0;
              a < architecture.instructions[i].fields.length;
              a++
            ) {
              if (
                architecture.instructions[i].fields[a].name ==
                signatureRawParts[j]
              ) {
                fieldsLength = getFieldLength(
                  architecture.instructions[i].separated,
                  architecture.instructions[i].fields[a].startbit,
                  architecture.instructions[i].fields[a].stopbit,
                  a,
                );
                if (token.match(/^0x/)) {
                  var value = token.split("x");
                  if (value[1].length * 4 > fieldsLength) {
                    return packCompileError("m8", token, "error", "danger");
                  }
                  if (isNaN(parseInt(token, 16)) === true) {
                    return packCompileError("m9", token, "error", "danger");
                  }
                  addr = parseInt(token, 16).toString(2);
                  binary = generateBinary(
                    architecture.instructions[i].separated,
                    architecture.instructions[i].fields[a].startbit,
                    architecture.instructions[i].fields[a].stopbit,
                    binary,
                    inm,
                    fieldsLength,
                    a,
                  );
                  re = RegExp("Field[0-9]+");
                  instruction = instruction.replace(re, token);
                } else {
                  var validTag = false;
                  startBit = architecture.instructions[i].fields[a].startbit;
                  stopBit = architecture.instructions[i].fields[a].stopbit;
                }
              }
            }
            break;
          case "offset_bytes":
            token = instructionParts[j];
            var token_user = "";
            console_log("token: " + token);
            for (
              var a = 0;
              a < architecture.instructions[i].fields.length;
              a++
            ) {
              if (
                architecture.instructions[i].fields[a].name ==
                signatureRawParts[j]
              ) {
                fieldsLength = getFieldLength(
                  architecture.instructions[i].separated,
                  architecture.instructions[i].fields[a].startbit,
                  architecture.instructions[i].fields[a].stopbit,
                  a,
                );
                var inm;
                if (token.match(/^0x/)) {
                  var value = token.split("x");
                  if (value[1].length * 4 > fieldsLength) {
                    resultPseudo = pseudoinstruction_compiler(
                      oriInstruction,
                      label,
                      line,
                    );
                    console_log(resultPseudo);
                    if (resultPseudo.status != "ok") {
                      return resultPseudo;
                    }
                  }
                  if (isNaN(parseInt(token, 16)) === true) {
                    return packCompileError("m6", token, "error", "danger");
                  }
                  inm = parseInt(token, 16).toString(2);
                } else if (token.match(/^(\d)+\.(\d)+/)) {
                  if (float2bin(parseFloat(token)).length > fieldsLength) {
                    resultPseudo = pseudoinstruction_compiler(
                      oriInstruction,
                      label,
                      line,
                    );
                    console_log(resultPseudo);
                    if (resultPseudo.status != "ok") {
                      return resultPseudo;
                    }
                  }
                  if (isNaN(parseFloat(token)) === true) {
                    return packCompileError("m6", token, "error", "danger");
                  }
                  inm = float2bin(parseFloat(token, 16));
                } else if (isNaN(parseInt(token))) {
                  validTagPC = false;
                  startBit = architecture.instructions[i].fields[a].startbit;
                  stopBit = architecture.instructions[i].fields[a].stopbit;
                } else {
                  var comNumPos = Math.pow(2, fieldsLength - 1);
                  var comNumNeg = comNumPos * -1;
                  comNumPos = comNumPos - 1;
                  console_log(comNumPos);
                  console_log(comNumNeg);
                  if (
                    parseInt(token, 10) > comNumPos ||
                    parseInt(token, 10) < comNumNeg
                  ) {
                    console_log(oriInstruction);
                    console_log(label);
                    console_log(line);
                    resultPseudo = pseudoinstruction_compiler(
                      oriInstruction,
                      label,
                      line,
                    );
                    console_log(resultPseudo);
                    if (resultPseudo.status != "ok") {
                      return resultPseudo;
                    }
                  }
                  if (isNaN(parseInt(token)) === true && resultPseudo == -3) {
                    return packCompileError("m6", token, "error", "danger");
                  }
                  inm = (parseInt(token, 10) >>> 0).toString(2);
                  inm = inm.substring(inm.length - fieldsLength, inm.length);
                }
                if (validTagPC === true) {
                  if (
                    inm.length >
                    architecture.instructions[i].fields[a].startbit -
                      architecture.instructions[i].fields[a].stopbit +
                      1
                  ) {
                    return packCompileError("m12", token, "error", "danger");
                  }
                  binary = generateBinary(
                    architecture.instructions[i].separated,
                    architecture.instructions[i].fields[a].startbit,
                    architecture.instructions[i].fields[a].stopbit,
                    binary,
                    inm,
                    fieldsLength,
                    a,
                  );
                }
                re = RegExp("Field[0-9]+");
                console_log(instruction);
                instruction = instruction.replace(re, token);
                console_log(instruction);
              }
            }
            break;
          case "offset_words":
            token = instructionParts[j];
            var token_user = "";
            console_log("token: " + token);
            for (
              var a = 0;
              a < architecture.instructions[i].fields.length;
              a++
            ) {
              if (
                architecture.instructions[i].fields[a].name ==
                signatureRawParts[j]
              ) {
                fieldsLength = getFieldLength(
                  architecture.instructions[i].separated,
                  architecture.instructions[i].fields[a].startbit,
                  architecture.instructions[i].fields[a].stopbit,
                  a,
                );
                var inm;
                if (token.match(/^0x/)) {
                  var value = token.split("x");
                  if (value[1].length * 4 > fieldsLength) {
                    resultPseudo = pseudoinstruction_compiler(
                      oriInstruction,
                      label,
                      line,
                    );
                    console_log(resultPseudo);
                    if (resultPseudo.status != "ok") {
                      return resultPseudo;
                    }
                  }
                  if (isNaN(parseInt(token, 16)) === true) {
                    return packCompileError("m6", token, "error", "danger");
                  }
                  inm = parseInt(token, 16).toString(2);
                } else if (token.match(/^(\d)+\.(\d)+/)) {
                  if (float2bin(parseFloat(token)).length > fieldsLength) {
                    resultPseudo = pseudoinstruction_compiler(
                      oriInstruction,
                      label,
                      line,
                    );
                    console_log(resultPseudo);
                    if (resultPseudo.status != "ok") {
                      return resultPseudo;
                    }
                  }
                  if (isNaN(parseFloat(token)) === true) {
                    return packCompileError("m6", token, "error", "danger");
                  }
                  inm = float2bin(parseFloat(token, 16));
                } else if (isNaN(parseInt(token))) {
                  validTagPC = false;
                  startBit = architecture.instructions[i].fields[a].startbit;
                  stopBit = architecture.instructions[i].fields[a].stopbit;
                } else {
                  var comNumPos = Math.pow(2, fieldsLength - 1);
                  var comNumNeg = comNumPos * -1;
                  comNumPos = comNumPos - 1;
                  console_log(comNumPos);
                  console_log(comNumNeg);
                  if (
                    parseInt(token, 10) > comNumPos ||
                    parseInt(token, 10) < comNumNeg
                  ) {
                    console_log(oriInstruction);
                    console_log(label);
                    console_log(line);
                    resultPseudo = pseudoinstruction_compiler(
                      oriInstruction,
                      label,
                      line,
                    );
                    console_log(resultPseudo);
                    if (resultPseudo.status != "ok") {
                      return resultPseudo;
                    }
                  }
                  if (isNaN(parseInt(token)) === true && resultPseudo == -3) {
                    return packCompileError("m6", token, "error", "danger");
                  }
                  inm = (parseInt(token, 10) >>> 0).toString(2);
                  inm = inm.substring(inm.length - fieldsLength, inm.length);
                }
                if (validTagPC === true) {
                  if (
                    inm.length >
                    architecture.instructions[i].fields[a].startbit -
                      architecture.instructions[i].fields[a].stopbit +
                      1
                  ) {
                    return packCompileError("m12", token, "error", "danger");
                  }
                  binary = generateBinary(
                    architecture.instructions[i].separated,
                    architecture.instructions[i].fields[a].startbit,
                    architecture.instructions[i].fields[a].stopbit,
                    binary,
                    inm,
                    fieldsLength,
                    a,
                  );
                }
                re = RegExp("Field[0-9]+");
                console_log(instruction);
                instruction = instruction.replace(re, token);
                console_log(instruction);
              }
            }
            break;
          default:
            token = instructionParts[j];
            console_log("token: " + token);
            for (
              var a = 0;
              a < architecture.instructions[i].fields.length;
              a++
            ) {
              console_log(architecture.instructions[i].fields[a].name);
              if (
                architecture.instructions[i].fields[a].name ==
                signatureRawParts[j]
              ) {
                if (
                  typeof architecture.instructions[i].fields[a].startbit ==
                  "object"
                ) {
                  fieldsLength = architecture.instructions[i].fields[
                    a
                  ].startbit.reduce((t, cv, ind) => {
                    t = !ind ? 0 : t;
                    t +
                      (cv -
                        architecture.instructions[i].fields[a].stopbit[ind] +
                        1);
                  });
                  console_log(
                    architecture.instructions[i].co
                      .join("")
                      .padStart(fieldsLength, "0"),
                  );
                } else {
                  fieldsLength =
                    architecture.instructions[i].fields[a].startbit -
                    architecture.instructions[i].fields[a].stopbit +
                    1;
                  console_log(
                    architecture.instructions[i].co.padStart(fieldsLength, "0"),
                  );
                  binary =
                    binary.substring(
                      0,
                      binary.length -
                        (architecture.instructions[i].fields[a].startbit + 1),
                    ) +
                    architecture.instructions[i].co.padStart(
                      fieldsLength,
                      "0",
                    ) +
                    binary.substring(
                      binary.length -
                        architecture.instructions[i].fields[a].stopbit,
                      binary.length,
                    );
                }
                console_log(binary);
                re = RegExp("Field[0-9]+");
                console_log(instruction);
                instruction = instruction.replace(re, token);
                console_log(instruction);
              }
              if (architecture.instructions[i].fields[a].type == "cop") {
                fieldsLength =
                  architecture.instructions[i].fields[a].startbit -
                  architecture.instructions[i].fields[a].stopbit +
                  1;
                binary =
                  binary.substring(
                    0,
                    binary.length -
                      (architecture.instructions[i].fields[a].startbit + 1),
                  ) +
                  architecture.instructions[i].fields[a].valueField.padStart(
                    fieldsLength,
                    "0",
                  ) +
                  binary.substring(
                    binary.length -
                      architecture.instructions[i].fields[a].stopbit,
                    binary.length,
                  );
              }
            }
            break;
        }
      }
      if (validTagPC === false && resultPseudo == -3) {
        console_log("pendiente");
        pc = pc + architecture.instructions[i].nwords * 4;
        var padding = "";
        padding = padding.padStart(
          architecture.instructions[i].nwords * 32 - binary.length,
          "0",
        );
        binary = binary + padding;
        var hex = bin2hex(binary);
        var auxAddr = address;
        console_log(binary);
        console_log(bin2hex(binary));
        pending_instructions.push({
          address: address,
          instruction: instruction,
          signature: signatureParts,
          signatureRaw: signatureRawParts,
          Label: label,
          binary: binary,
          startBit: startBit,
          stopBit: stopBit,
          visible: true,
          line: nEnters,
        });
        if (pending === false) {
          instructions.push({
            Break: null,
            Address: "0x" + address.toString(16),
            Label: label,
            loaded: instruction,
            user: userInstruction,
            _rowVariant: "",
            visible: true,
            hide: false,
          });
          instructions_binary.push({
            Break: null,
            Address: "0x" + address.toString(16),
            Label: label,
            loaded: binary,
            user: null,
            _rowVariant: "",
            visible: false,
          });
          address = address + 4 * architecture.instructions[i].nwords;
        } else {
          for (var pos = 0; pos < instructions.length; pos++) {
            if (parseInt(instructions[pos].Address, 16) > pendingAddress) {
              instructions.splice(pos, 0, {
                Break: null,
                Address: "0x" + pendingAddress.toString(16),
                Label: label,
                loaded: instruction,
                user: userInstruction,
                _rowVariant: "",
                visible: true,
                hide: false,
              });
              instructions_binary.splice(pos, 0, {
                Break: null,
                Address: "0x" + pendingAddress.toString(16),
                Label: label,
                loaded: binary,
                user: null,
                _rowVariant: "",
                visible: false,
              });
              auxAddr = pendingAddress;
              break;
            }
          }
        }
        console_log(address.toString(16));
        console_log(instructions);
        stopFor = true;
        break;
      } else {
        if (resultPseudo == -3) {
          console_log("no pendiente");
          pc = pc + architecture.instructions[i].nwords * 4;
          var padding = "";
          padding = padding.padStart(
            architecture.instructions[i].nwords * 32 - binary.length,
            "0",
          );
          binary = binary + padding;
          var hex = bin2hex(binary);
          var auxAddr = address;
          console_log(binary);
          console_log(bin2hex(binary));
          if (pending === false) {
            instructions.push({
              Break: null,
              Address: "0x" + address.toString(16),
              Label: label,
              loaded: instruction,
              user: userInstruction,
              _rowVariant: "",
              visible: true,
              hide: false,
            });
            instructions_binary.push({
              Break: null,
              Address: "0x" + address.toString(16),
              Label: label,
              loaded: binary,
              user: null,
              _rowVariant: "",
              visible: false,
            });
            address = address + 4 * architecture.instructions[i].nwords;
          } else {
            for (var pos = 0; pos < instructions.length; pos++) {
              if (parseInt(instructions[pos].Address, 16) > pendingAddress) {
                instructions.splice(pos, 0, {
                  Break: null,
                  Address: "0x" + pendingAddress.toString(16),
                  Label: label,
                  loaded: instruction,
                  user: userInstruction,
                  _rowVariant: "",
                  visible: true,
                  hide: false,
                });
                instructions_binary.splice(pos, 0, {
                  Break: null,
                  Address: "0x" + pendingAddress.toString(16),
                  Label: label,
                  loaded: binary,
                  user: null,
                  _rowVariant: "",
                  visible: false,
                });
                auxAddr = pendingAddress;
                break;
              }
            }
          }
          stopFor = true;
          console_log(address.toString(16));
          console_log(instructions);
        }
      }
    }
  }
  return ret;
}
function pseudoinstruction_compiler(instruction, label, line) {
  var ret = { errorcode: "", token: "", type: "", update: "", status: "ok" };
  var re = /\' \'/;
  instruction = instruction.replace(re, "'\0'");
  var re = /\'\\n\'/;
  instruction = instruction.replace(re, "10");
  console_log(instruction);
  var re = /\'\\t\'/;
  instruction = instruction.replace(re, "9");
  console_log(instruction);
  var instructionParts = instruction.split(" ");
  var found = false;
  var re = /\'\0\'/;
  instruction = instruction.replace(re, "' '");
  console_log(instruction);
  for (var i = 0; i < instructionParts.length; i++) {
    instructionParts[i] = instructionParts[i].replace(re, "' '");
  }
  console_log(instructionParts);
  var auxSignature;
  for (var i = 0; i < architecture.pseudoinstructions.length; i++) {
    console_log(architecture.pseudoinstructions[i].name);
    if (architecture.pseudoinstructions[i].name != instructionParts[0]) {
      continue;
    } else {
      found = true;
      var signatureDef =
        architecture.pseudoinstructions[i].signature_definition;
      signatureDef = signatureDef.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      re = new RegExp("[fF][0-9]+", "g");
      signatureDef = signatureDef.replace(re, "(.*?)");
      var signatureParts =
        architecture.pseudoinstructions[i].signature.split(",");
      var signatureRawParts =
        architecture.pseudoinstructions[i].signatureRaw.split(" ");
      var definition = architecture.pseudoinstructions[i].definition;
      auxSignature = architecture.pseudoinstructions[i].signatureRaw;
      console_log(signatureDef);
      console_log(instruction);
      console_log(instructionParts);
      if (
        instructionParts.length <
        architecture.pseudoinstructions[i].fields.length + 1
      ) {
        for (
          var j = 0;
          j <
          architecture.pseudoinstructions[i].fields.length +
            1 -
            instructionParts.length;
          j++
        ) {
          next_token();
          token = get_token();
          console_log("token: " + token);
          if (token != null) {
            var re = new RegExp(",+$");
            token = token.replace(re, "");
          }
          instruction = instruction + " " + token;
        }
        instructionParts = instruction.split(" ");
      }
      console_log(instruction);
      re = new RegExp(signatureDef + "$");
      console_log(re);
      if (
        instruction.search(re) == -1 &&
        i == architecture.pseudoinstructions.length - 1
      ) {
        return packCompileError("m3", auxSignature, "error", "danger");
      }
      if (
        instruction.search(re) == -1 &&
        i < architecture.pseudoinstructions.length - 1
      ) {
        found = false;
      }
      if (found === true) {
        re = /aliasDouble\((.*)\)/;
        for (
          var a = 0;
          a < architecture.pseudoinstructions[i].fields.length &&
          definition.search(re) != -1;
          a++
        ) {
          re = new RegExp(
            architecture.pseudoinstructions[i].fields[a].name,
            "g",
          );
          console_log(instructionParts[a + 1]);
          instructionParts[a + 1] = instructionParts[a + 1].replace("$", "");
          definition = definition.replace(re, instructionParts[a + 1]);
        }
        re = /aliasDouble\((.*)\)/;
        console_log(re);
        while (definition.search(re) != -1) {
          var match = re.exec(definition);
          var args = match[1].split(";");
          var aux = "";
          for (var b = 0; b < architecture.components[3].elements.length; b++) {
            console_log(architecture.components[3].elements[b].name);
            if (
              architecture.components[3].elements[b].name.includes(args[0]) !==
              false
            ) {
              aux = architecture.components[3].elements[b].simple_reg[args[1]];
              console_log(aux);
              break;
            }
          }
          console_log(aux);
          definition = definition.replace(re, aux);
          console_log(definition);
        }
        for (var j = 1; j < signatureRawParts.length; j++) {
          var aux = signatureRawParts[j].replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
          re = new RegExp(aux, "g");
          definition = definition.replace(re, instructionParts[j]);
        }
        re = new RegExp("\n", "g");
        definition = definition.replace(re, "");
        console_log(definition);
        console_log(signatureParts);
        re = /Field.(\d).\((.*?)\).(.*?)[=<>;\s]/;
        while (definition.search(re) != -1) {
          var match = re.exec(definition);
          console_log(match);
          var code;
          if (instructionParts[match[1]].match(/^\'(.*?)\'$/)) {
            var re = /^\'(.*?)\'$/;
            console_log(re);
            var match2 = re.exec(instructionParts[match[1]]);
            console_log(match2);
            var asciiCode = match2[1].charCodeAt(0);
            console_log(asciiCode);
            console_log(
              "value = field('" +
                asciiCode +
                "', '(" +
                match[2] +
                ")', '" +
                match[3] +
                "')",
            );
            code =
              "value = field('" +
              asciiCode +
              "', '(" +
              match[2] +
              ")', '" +
              match[3] +
              "')";
          } else {
            console_log(
              "value = field('" +
                instructionParts[match[1]] +
                "', '(" +
                match[2] +
                ")', '" +
                match[3] +
                "')",
            );
            code =
              "value = field('" +
              instructionParts[match[1]] +
              "', '(" +
              match[2] +
              ")', '" +
              match[3] +
              "')";
          }
          var value;
          try {
            eval(code);
          } catch (e) {
            if (e instanceof SyntaxError) {
              return packCompileError("m5", token, "error", "danger");
            }
          }
          if (value == -1) {
            return packCompileError("m5", token, "error", "danger");
          }
          definition = definition.replace(
            "Field." + match[1] + ".(" + match[2] + ")." + match[3],
            value,
          );
          re = /Field.(\d).\((.*?)\).(.*?)[;\s]/;
        }
        re = /Field.(\d).SIZE[=<>;\s]/g;
        if (definition.search(re) != -1) {
          var match = re.exec(definition);
          console_log(match);
          var code;
          if (instructionParts[match[1]].match(/^\'(.*?)\'$/)) {
            var re = /^\'(.*?)\'$/;
            console_log(re);
            var match2 = re.exec(instructionParts[match[1]]);
            console_log(match2);
            var asciiCode = match2[1].charCodeAt(0);
            console_log(asciiCode);
            console_log("value = field('" + asciiCode + "', 'SIZE', null)");
            code = "value = field('" + asciiCode + "', 'SIZE', null)";
          } else {
            console_log(
              "value = field('" +
                instructionParts[match[1]] +
                "', 'SIZE', null)",
            );
            code =
              "value = field('" +
              instructionParts[match[1]] +
              "', 'SIZE', null)";
          }
          var value;
          try {
            eval(code);
          } catch (e) {
            if (e instanceof SyntaxError) {
              return packCompileError("m5", token, "error", "danger");
            }
          }
          if (value == -1) {
            return packCompileError("m5", token, "error", "danger");
          }
          console_log(value);
          console_log("Field." + match[1] + ".SIZE");
          definition = definition.replace("Field." + match[1] + ".SIZE", value);
        }
        console_log(definition);
        re = /reg\.pc/;
        console_log(re);
        while (definition.search(re) != -1) {
          definition = definition.replace(re, "pc");
          console_log(definition);
        }
        re = /no_ret_op\{([^}]*)\};/;
        console_log(re);
        while (definition.search(re) != -1) {
          var match2 = re.exec(definition);
          console_log(match2[1]);
          eval(match2[1]);
          definition = definition.replace(re, "");
          console_log(definition);
        }
        console_log(definition);
        re = /op\{([^}]*)\}/;
        console_log(re);
        while (definition.search(re) != -1) {
          var match2 = re.exec(definition);
          var result;
          console_log(match2[1]);
          eval("result=" + match2[1]);
          definition = definition.replace(re, result);
          console_log(definition);
        }
        console_log(definition);
        var stop_while = 0;
        while (definition.match(/\'(.*?)\'/) && stop_while === 0) {
          var re = /\'(.*?)\'/;
          if (typeof match !== "undefined") {
            var match2 = re.exec(instructionParts[match[1]]);
            console_log(match2);
            var asciiCode = match2[1].charCodeAt(0);
            console_log(asciiCode);
            definition = definition.replace(re, asciiCode);
          } else {
            stop_while = 1;
          }
        }
        console_log(definition);
        console_log(instruction);
        var re = new RegExp("'", "g");
        instruction = instruction.replace(re, '"');
        console_log(instruction);
        var re = /{([^}]*)}/g;
        var code = re.exec(definition);
        if (code != null) {
          while (code != null) {
            var instructions = code[1].split(";");
            console_log(instructions);
            for (var j = 0; j < instructions.length - 1; j++) {
              var aux;
              if (j === 0) {
                aux =
                  "ret=instruction_compiler('" +
                  instructions[j] +
                  "','" +
                  instruction +
                  "','" +
                  label +
                  "'," +
                  line +
                  ", false, 0, null, null, true)\nif(ret.status != 'ok'){error = true}";
              } else {
                aux =
                  "ret=instruction_compiler('" +
                  instructions[j] +
                  "','', ''," +
                  line +
                  ", false, 0, null, null, true)\nif(ret.status != 'ok'){error = true}";
              }
              definition = definition.replace(
                instructions[j] + ";",
                aux + ";\n",
              );
            }
            code = re.exec(definition);
          }
        } else {
          var instructions = definition.split(";");
          for (var j = 0; j < instructions.length - 1; j++) {
            var aux;
            if (j == 0) {
              aux =
                "ret=instruction_compiler('" +
                instructions[j] +
                "','" +
                instruction +
                "','" +
                label +
                "'," +
                line +
                ", false, 0, null, null, true)\nif(ret.status != 'ok'){error = true}";
            } else {
              aux =
                "ret=instruction_compiler('" +
                instructions[j] +
                "','', ''," +
                line +
                ", false, 0, null, null, true)\nif(ret.status != 'ok'){error = true}";
            }
            definition = definition.replace(instructions[j] + ";", aux + ";\n");
          }
        }
        try {
          var error = false;
          console_log(definition);
          eval(definition);
          if (error === true) {
            console_log("Error pseudo");
            return ret;
          }
          console_log("Fin pseudo");
          return ret;
        } catch (e) {
          if (e instanceof SyntaxError) {
            return packCompileError("m13", "", "error", "danger");
          }
        }
      }
    }
  }
  if (!found) {
    return packCompileError("m3", auxSignature, "error", "danger");
  }
  return ret;
}
function field(field, action, type) {
  console_log(field);
  console_log(action);
  console_log(type);
  if (action == "SIZE") {
    console_log("SIZE");
    if (field.match(/^0x/)) {
      var value = field.split("x");
      return value[1].length * 4;
    } else if (field.match(/^([\-\d])+\.(\d)+/)) {
      return float2bin(parseFloat(field)).length;
    } else if (field.match(/^([\-\d])+/)) {
      var numAux = parseInt(field, 10);
      return bi_intToBigInt(numAux, 10).toString(2).length;
    } else {
      var ret = creator_memory_findaddress_bytag(field);
      if (ret.exit === 1) {
        var numAux = ret.value;
        return numAux.toString(2).length;
      }
    }
  }
  re = /\((.*?)\)/;
  if (action.search(re) != -1) {
    var match = re.exec(action);
    var bits = match[1].split(",");
    var startBit = parseInt(bits[0]);
    var endBit = parseInt(bits[1]);
    if (field.match(/^0x/) && (type == "int" || type == "float")) {
      var binNum = parseInt(field, 16).toString(2);
      binNum = binNum.padStart(32, "0");
      binNum = binNum.substring(31 - startBit, 32 - endBit);
      var hexNum = "0x" + bin2hex(binNum);
      return hexNum;
    } else if (field.match(/^0x/) && type == "double") {
      var binNum = double2bin(hex2double(field));
      binNum = binNum.padStart(64, "0");
      binNum = binNum.substring(63 - startBit, 64 - endBit);
      var hexNum = "0x" + bin2hex(binNum);
      return hexNum;
    }
    if (isNaN(field) === true) {
      var ret = creator_memory_findaddress_bytag(field);
      if (ret.exit === 1) {
        field = ret.value;
      }
      if (ret.exit === 0) {
        return -1;
      }
    }
    if (type == "int") {
      var binNum = (parseInt(field, 10) >>> 0).toString(2);
      binNum = binNum.padStart(32, "0");
      binNum = binNum.substring(31 - startBit, 32 - endBit);
      var hexNum = "0x" + bin2hex(binNum);
      return hexNum;
    } else if (type == "float") {
      var binNum = float2bin(parseFloat(field));
      console_log(binNum);
      binNum = binNum.padStart(32, "0");
      binNum = binNum.substring(31 - startBit, 32 - endBit);
      var hexNum = "0x" + bin2hex(binNum);
      return hexNum;
    } else if (type == "double") {
      var binNum = double2bin(parseFloat(field));
      console_log(binNum);
      binNum = binNum.padStart(64, "0");
      binNum = binNum.substring(63 - startBit, 64 - endBit);
      var hexNum = "0x" + bin2hex(binNum);
      return hexNum;
    }
  }
  return -1;
}
function getFieldLength(separated, startbit, stopbit, a) {
  if (startbit == stopbit)
    console_log(
      "Warning: startbit equal to stopBit, please check the achitecture definitions",
    );
  let fieldsLength;
  if (!separated || !separated[a]) fieldsLength = startbit - stopbit + 1;
  else
    fieldsLength = startbit
      .map((b, i) => b - stopbit[i] + 1)
      .reduce((old, newV) => old + newV);
  return fieldsLength;
}
function generateBinary(
  separated,
  startbit,
  stopbit,
  binary,
  inm,
  fieldsLenght,
  a,
) {
  if (!separated || !separated[a]) {
    binary =
      binary.substring(0, binary.length - (startbit + 1)) +
      inm.padStart(fieldsLength, "0") +
      binary.substring(binary.length - stopbit, binary.length);
  } else {
    let myInm = inm;
    for (let i = startbit.length - 1; i >= 0; i--) {
      let sb = startbit[i],
        stb = stopbit[i],
        diff = sb - stb + 1;
      if (myInm.length <= diff) {
        binary =
          binary.substring(0, binary.length - (sb + 1)) +
          myInm.padStart(diff, "0") +
          binary.substring(binary.length - stb, binary.length);
        break;
      } else {
        let tmpinm = inm.substring(myInm.length - diff, myInm.length);
        binary =
          binary.substring(0, binary.length - (sb + 1)) +
          tmpinm.padStart(diff, "0") +
          binary.substring(binary.length - stb, binary.length);
        myInm = myInm.substring(0, myInm.length - diff);
      }
    }
  }
  return binary;
}
function binaryStringToInt(b) {
  return parseInt(b, 2);
}
var execution_index = 0;
var execution_mode = 0;
var run_program = 0;
var execution_init = 1;
var instructions_packed = 100;
function packExecute(error, err_msg, err_type, draw) {
  var ret = {};
  ret.error = error;
  ret.msg = err_msg;
  ret.type = err_type;
  ret.draw = draw;
  return ret;
}
function execute_instruction() {
  var draw = {
    space: [],
    info: [],
    success: [],
    warning: [],
    danger: [],
    flash: [],
  };
  var error = 0;
  var index;
  do {
    console_log(execution_index);
    console_log(readRegister(0, 0));
    if (instructions.length === 0) {
      return packExecute(true, "No instructions in memory", "danger", null);
    }
    if (execution_index < -1) {
      return packExecute(true, "The program has finished", "warning", null);
    }
    if (execution_index == -1) {
      return packExecute(
        true,
        "The program has finished with errors",
        "danger",
        null,
      );
    } else if (run_program === 3) {
      return packExecute(false, "", "info", null);
    }
    if (execution_init === 1) {
      for (var i = 0; i < instructions.length; i++) {
        if (instructions[i].Label == architecture.arch_conf[5].value) {
          writeRegister(bi_intToBigInt(instructions[i].Address, 10), 0, 0);
          execution_init = 0;
          break;
        } else if (i == instructions.length - 1) {
          execution_index = -1;
          return packExecute(
            true,
            'Label "' + architecture.arch_conf[5].value + '" not found',
            "danger",
            null,
          );
        }
      }
    }
    get_execution_index(draw);
    var i_reg = crex_findReg_bytag("event_cause");
    if (i_reg.match != 0) {
      var i_reg_value = readRegister(i_reg.indexComp, i_reg.indexElem);
      if (i_reg_value != 0) {
        console.log("Interruption detected");
        draw.warning.push(execution_index);
        var epc_reg = crex_findReg_bytag("exception_program_counter");
        var pc_reg = crex_findReg_bytag("program_counter");
        var pc_reg_value = readRegister(pc_reg.indexComp, pc_reg.indexElem);
        writeRegister(pc_reg_value, epc_reg.indexComp, epc_reg.indexElem);
        var handler_addres = 0;
        writeRegister(handler_addres, pc_reg.indexComp, pc_reg.indexElem);
        get_execution_index(draw);
        console.log(i_reg);
        writeRegister(0, i_reg.indexComp, i_reg.indexElem);
      }
    }
    var instructionExec = instructions[execution_index].loaded;
    var instructionExecParts = instructionExec.split(" ");
    var signatureDef;
    var signatureParts;
    var signatureRawParts;
    var binary;
    var nwords;
    var auxDef;
    var type;
    for (var i = 0; i < architecture.instructions.length; i++) {
      var auxSig = architecture.instructions[i].signatureRaw.split(" ");
      var coStartbit;
      var coStopbit;
      var numCop = 0;
      var numCopCorrect = 0;
      for (var y = 0; y < architecture.instructions[i].fields.length; y++) {
        if (architecture.instructions[i].fields[y].type == "co") {
          coStartbit =
            31 - parseInt(architecture.instructions[i].fields[y].startbit);
          coStopbit =
            32 - parseInt(architecture.instructions[i].fields[y].stopbit);
        }
      }
      if (
        architecture.instructions[i].co ==
        instructionExecParts[0].substring(coStartbit, coStopbit)
      ) {
        if (
          architecture.instructions[i].cop != null &&
          architecture.instructions[i].cop != ""
        ) {
          for (var j = 0; j < architecture.instructions[i].fields.length; j++) {
            if (architecture.instructions[i].fields[j].type == "cop") {
              numCop++;
              if (
                architecture.instructions[i].fields[j].valueField ==
                instructionExecParts[0].substring(
                  architecture.instructions[i].nwords * 31 -
                    architecture.instructions[i].fields[j].startbit,
                  architecture.instructions[i].nwords * 32 -
                    architecture.instructions[i].fields[j].stopbit,
                )
              ) {
                numCopCorrect++;
              }
            }
          }
          if (numCop != numCopCorrect) {
            continue;
          }
        }
        var instruction_loaded =
          architecture.instructions[i].signature_definition;
        var instruction_fields = architecture.instructions[i].fields;
        var instruction_nwords = architecture.instructions[i].nwords;
        for (var f = 0; f < instruction_fields.length; f++) {
          re = new RegExp("[Ff]" + f);
          var res = instruction_loaded.search(re);
          if (res != -1) {
            var value = null;
            re = new RegExp("[Ff]" + f, "g");
            switch (instruction_fields[f].type) {
              case "co":
                value = instruction_fields[f].name;
                break;
              case "INT-Reg":
                var bin = instructionExec.substring(
                  instruction_nwords * 31 - instruction_fields[f].startbit,
                  instruction_nwords * 32 - instruction_fields[f].stopbit,
                );
                value = get_register_binary("int_registers", bin);
                break;
              case "SFP-Reg":
                var bin = instructionExec.substring(
                  instruction_nwords * 31 - instruction_fields[f].startbit,
                  instruction_nwords * 32 - instruction_fields[f].stopbit,
                );
                value = get_register_binary("fp_registers", bin);
                break;
              case "DFP-Reg":
                var bin = instructionExec.substring(
                  instruction_nwords * 31 - instruction_fields[f].startbit,
                  instruction_nwords * 32 - instruction_fields[f].stopbit,
                );
                value = get_register_binary("fp_registers", bin);
                break;
              case "Ctrl-Reg":
                var bin = instructionExec.substring(
                  instruction_nwords * 31 - instruction_fields[f].startbit,
                  instruction_nwords * 32 - instruction_fields[f].stopbit,
                );
                value = get_register_binary("ctrl_registers", bin);
                break;
              case "inm-signed":
              case "inm-unsigned":
              case "address":
              case "offset_bytes":
              case "offset_words":
                var bin = "";
                if (
                  architecture.instructions[i].separated &&
                  architecture.instructions[i].separated[f] === true
                ) {
                  for (
                    var sep_index = 0;
                    sep_index <
                    architecture.instructions[i].fields[f].startbit.length;
                    sep_index++
                  ) {
                    bin =
                      bin +
                      instructionExec.substring(
                        instruction_nwords * 31 -
                          instruction_fields[f].startbit[sep_index],
                        instruction_nwords * 32 -
                          instruction_fields[f].stopbit[sep_index],
                      );
                  }
                } else {
                  bin = instructionExec.substring(
                    instruction_nwords * 31 - instruction_fields[f].startbit,
                    instruction_nwords * 32 - instruction_fields[f].stopbit,
                  );
                }
                value = parseInt(bin, 2).toString(16);
                value_len = Math.abs(
                  instruction_fields[f].startbit -
                    instruction_fields[f].stopbit,
                );
                value = "0x" + value.padStart(value_len / 4, "0");
                break;
              default:
                break;
            }
            instruction_loaded = instruction_loaded.replace(re, value);
          }
        }
        instructionExec = instruction_loaded;
        instructionExecParts = instructionExec.split(" ");
        binary = true;
      }
      if (
        architecture.instructions[i].name == instructionExecParts[0] &&
        instructionExecParts.length == auxSig.length
      ) {
        type = architecture.instructions[i].type;
        signatureDef = architecture.instructions[i].signature_definition;
        signatureDef = signatureDef.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        re = new RegExp("[fF][0-9]+", "g");
        signatureDef = signatureDef.replace(re, "(.*?)");
        re = new RegExp(",", "g");
        var signature = architecture.instructions[i].signature.replace(re, " ");
        re = new RegExp(signatureDef + "$");
        var match = re.exec(signature);
        var signatureParts = [];
        for (var j = 1; j < match.length; j++) {
          signatureParts.push(match[j]);
        }
        match = re.exec(architecture.instructions[i].signatureRaw);
        var signatureRawParts = [];
        for (var j = 1; j < match.length; j++) {
          signatureRawParts.push(match[j]);
        }
        console_log(signatureParts);
        console_log(signatureRawParts);
        auxDef = architecture.instructions[i].definition;
        nwords = architecture.instructions[i].nwords;
        binary = false;
        break;
      }
    }
    var pc_reg = crex_findReg_bytag("program_counter");
    word_size = parseInt(architecture.arch_conf[1].value) / 8;
    writeRegister(
      readRegister(pc_reg.indexComp, pc_reg.indexElem) + nwords * word_size,
      0,
      0,
    );
    console_log(auxDef);
    if (typeof instructions[execution_index].preload === "undefined") {
      var readings_description = "";
      var writings_description = "";
      re = new RegExp(signatureDef + "$");
      var match = re.exec(instructionExec);
      instructionExecParts = [];
      for (var j = 1; j < match.length; j++) {
        instructionExecParts.push(match[j]);
      }
      console_log(instructionExecParts);
      var var_readings_definitions = {};
      var var_readings_definitions_prev = {};
      var var_readings_definitions_name = {};
      var var_writings_definitions = {};
      for (var i = 1; i < signatureRawParts.length; i++) {
        if (
          signatureParts[i] == "INT-Reg" ||
          signatureParts[i] == "SFP-Reg" ||
          signatureParts[i] == "DFP-Reg" ||
          signatureParts[i] == "Ctrl-Reg"
        ) {
          for (var j = 0; j < architecture.components.length; j++) {
            for (
              var z = architecture.components[j].elements.length - 1;
              z >= 0;
              z--
            ) {
              if (
                architecture.components[j].elements[z].name.includes(
                  instructionExecParts[i],
                )
              ) {
                var_readings_definitions[signatureRawParts[i]] =
                  "var " +
                  signatureRawParts[i] +
                  "      = readRegister (" +
                  j +
                  " ," +
                  z +
                  ', "' +
                  signatureParts[i] +
                  '");\n';
                var_readings_definitions_prev[signatureRawParts[i]] =
                  "var " +
                  signatureRawParts[i] +
                  "_prev = readRegister (" +
                  j +
                  " ," +
                  z +
                  ', "' +
                  signatureParts[i] +
                  '");\n';
                var_readings_definitions_name[signatureRawParts[i]] =
                  "var " +
                  signatureRawParts[i] +
                  "_name = '" +
                  instructionExecParts[i] +
                  "';\n";
                re = new RegExp(
                  "(?:\\W|^)(((" + signatureRawParts[i] + ") *=)[^=])",
                  "g",
                );
                if (auxDef.search(re) != -1) {
                  var_writings_definitions[signatureRawParts[i]] =
                    "writeRegister(" +
                    signatureRawParts[i] +
                    ", " +
                    j +
                    ", " +
                    z +
                    ', "' +
                    signatureParts[i] +
                    '");\n';
                } else {
                  var_writings_definitions[signatureRawParts[i]] =
                    "if(" +
                    signatureRawParts[i] +
                    " != " +
                    signatureRawParts[i] +
                    "_prev)" +
                    " { writeRegister(" +
                    signatureRawParts[i] +
                    " ," +
                    j +
                    " ," +
                    z +
                    ', "' +
                    signatureParts[i] +
                    '"); }\n';
                }
              }
            }
          }
        } else {
          if (signatureParts[i] == "offset_words") {
            if (instructionExecParts[i].startsWith("0x")) {
              var value = parseInt(instructionExecParts[i]);
              var nbits = 4 * (instructionExecParts[i].length - 2);
              var value_bin = value.toString(2).padStart(nbits, "0");
              if (value_bin[0] == "1") {
                value_bin = "".padStart(32 - nbits, "1") + value_bin;
              } else {
                value_bin = "".padStart(32 - nbits, "0") + value_bin;
              }
              value = parseInt(value_bin, 2) >> 0;
              instructionExecParts[i] = value;
              console_log(instructionExecParts[i]);
            }
          }
          var_readings_definitions[signatureRawParts[i]] =
            "var " +
            signatureRawParts[i] +
            " = " +
            instructionExecParts[i] +
            ";\n";
        }
      }
      for (var elto in var_readings_definitions) {
        readings_description =
          readings_description + var_readings_definitions[elto];
      }
      for (var elto in var_readings_definitions_prev) {
        readings_description =
          readings_description + var_readings_definitions_prev[elto];
      }
      for (var elto in var_readings_definitions_name) {
        readings_description =
          readings_description + var_readings_definitions_name[elto];
      }
      for (var elto in var_writings_definitions) {
        writings_description =
          writings_description + var_writings_definitions[elto];
      }
      for (var i = 0; i < architecture.components.length; i++) {
        for (
          var j = architecture.components[i].elements.length - 1;
          j >= 0;
          j--
        ) {
          var clean_name = clean_string(
            architecture.components[i].elements[j].name[0],
            "reg_",
          );
          var clean_aliases = architecture.components[i].elements[j].name
            .map((x) => clean_string(x, "reg_"))
            .join("|");
          re = new RegExp("(?:\\W|^)(((" + clean_aliases + ") *=)[^=])", "g");
          if (auxDef.search(re) != -1) {
            re = new RegExp("(" + clean_aliases + ")");
            var reg_name = re.exec(auxDef)[0];
            clean_name = clean_string(reg_name, "reg_");
            writings_description =
              writings_description +
              "\nwriteRegister(" +
              clean_name +
              ", " +
              i +
              ", " +
              j +
              ', "' +
              signatureParts[i] +
              '");';
          }
          re = new RegExp("([^a-zA-Z0-9])(?:" + clean_aliases + ")");
          if (auxDef.search(re) != -1) {
            re = new RegExp("(" + clean_aliases + ")");
            var reg_name = re.exec(auxDef)[0];
            clean_name = clean_string(reg_name, "reg_");
            readings_description =
              readings_description +
              "var " +
              clean_name +
              "      = readRegister(" +
              i +
              " ," +
              j +
              ', "' +
              signatureParts[i] +
              '");\n';
            readings_description =
              readings_description +
              "var " +
              clean_name +
              "_name = '" +
              clean_name +
              "';\n";
          }
        }
      }
      auxDef =
        "\n/* Read all instruction fields */\n" +
        readings_description +
        "\n/* Original instruction definition */\n" +
        auxDef +
        "\n\n/* Modify values */\n" +
        writings_description;
      console_log(
        " ................................. " +
          "instructions[" +
          execution_index +
          "]:\n" +
          auxDef +
          "\n" +
          " ................................. ",
      );
      eval(
        "instructions[" +
          execution_index +
          "].preload = function(elto) { " +
          "   try {\n" +
          auxDef.replace(/this./g, "elto.") +
          "\n" +
          "   }\n" +
          "   catch(e){\n" +
          "     throw e;\n" +
          "   }\n" +
          "}; ",
      );
    }
    try {
      var result = instructions[execution_index].preload(this);
      if (typeof result != "undefined" && result.error) {
        return result;
      }
    } catch (e) {
      var msg = "";
      if (e instanceof SyntaxError)
        msg =
          "The definition of the instruction contains errors, please review it" +
          e.stack;
      else msg = e.msg;
      console_log("Error: " + e.stack);
      error = 1;
      draw.danger.push(execution_index);
      execution_index = -1;
      return packExecute(true, msg, "danger", draw);
    }
    stats_update(type);
    clk_cycles_update(type);
    if (execution_index == -1) {
      error = 1;
      return packExecute(false, "", "info", null);
    }
    if (error !== 1 && execution_index < instructions.length) {
      for (var i = 0; i < instructions.length; i++) {
        var pc_reg = crex_findReg_bytag("program_counter");
        var pc_reg_value = readRegister(pc_reg.indexComp, pc_reg.indexElem);
        if (parseInt(instructions[i].Address, 16) == pc_reg_value) {
          execution_index = i;
          draw.success.push(execution_index);
          break;
        } else if (i == instructions.length - 1 && run_program === 3) {
          execution_index = instructions.length + 1;
        } else if (i == instructions.length - 1) {
          draw.space.push(execution_index);
          execution_index = instructions.length + 1;
        }
      }
    }
    if (execution_index >= instructions.length && run_program === 3) {
      for (var i = 0; i < instructions.length; i++) {
        draw.space.push(i);
      }
      draw.info = [];
      return packExecute(
        false,
        "The execution of the program has finished",
        "success",
        draw,
      );
    } else if (execution_index >= instructions.length && run_program != 3) {
      for (var i = 0; i < instructions.length; i++) {
        draw.space.push(i);
      }
      draw.info = [];
      execution_index = -2;
      return packExecute(
        false,
        "The execution of the program has finished",
        "success",
        draw,
      );
    } else {
      if (error !== 1) {
        draw.success.push(execution_index);
      }
    }
    console_log(execution_index);
  } while (instructions[execution_index].hide === true);
  return packExecute(false, null, null, draw);
}
function executeProgramOneShot(limit_n_instructions) {
  var ret = null;
  creator_ga("execute", "execute.run");
  for (var i = 0; i < limit_n_instructions; i++) {
    ret = execute_instruction();
    if (ret.error === true) {
      return ret;
    }
    if (execution_index < -1) {
      return ret;
    }
  }
  return packExecute(
    true,
    '"ERROR:" number of instruction limit reached :-(',
    null,
    null,
  );
}
function reset() {
  creator_ga("execute", "execute.reset");
  execution_index = 0;
  execution_init = 1;
  run_program = 0;
  stats_reset();
  clk_cycles_reset();
  keyboard = "";
  display = "";
  for (var i = 0; i < architecture_hash.length; i++) {
    for (var j = 0; j < architecture.components[i].elements.length; j++) {
      if (
        architecture.components[i].double_precision === false ||
        (architecture.components[i].double_precision === true &&
          architecture.components[i].double_precision_type == "extended")
      ) {
        architecture.components[i].elements[j].value =
          architecture.components[i].elements[j].default_value;
      } else {
        var aux_value;
        var aux_sim1;
        var aux_sim2;
        for (var a = 0; a < architecture_hash.length; a++) {
          for (var b = 0; b < architecture.components[a].elements.length; b++) {
            if (
              architecture.components[a].elements[b].name.includes(
                architecture.components[i].elements[j].simple_reg[0],
              ) !== false
            ) {
              aux_sim1 = bin2hex(
                float2bin(
                  bi_BigIntTofloat(
                    architecture.components[a].elements[b].default_value,
                  ),
                ),
              );
            }
            if (
              architecture.components[a].elements[b].name.includes(
                architecture.components[i].elements[j].simple_reg[1],
              ) !== false
            ) {
              aux_sim2 = bin2hex(
                float2bin(
                  bi_BigIntTofloat(
                    architecture.components[a].elements[b].default_value,
                  ),
                ),
              );
            }
          }
        }
        aux_value = aux_sim1 + aux_sim2;
        architecture.components[i].elements[j].value = bi_floatToBigInt(
          hex2double("0x" + aux_value),
        );
      }
    }
  }
  architecture.memory_layout[4].value = backup_stack_address;
  architecture.memory_layout[3].value = backup_data_address;
  creator_memory_reset();
  creator_callstack_reset();
  track_stack_reset();
  return true;
}
function creator_executor_exit(error) {
  creator_ga("execute", "execute.exit");
  if (error) {
    execution_index = -1;
  } else {
    execution_index = instructions.length + 1;
  }
}
function get_execution_index(draw) {
  var pc_reg = crex_findReg_bytag("program_counter");
  var pc_reg_value = readRegister(pc_reg.indexComp, pc_reg.indexElem);
  for (var i = 0; i < instructions.length; i++) {
    if (parseInt(instructions[i].Address, 16) == pc_reg_value) {
      execution_index = i;
      console_log(instructions[execution_index].hide);
      console_log(execution_index);
      console_log(instructions[i].Address);
      if (instructions[execution_index].hide === false) {
        draw.info.push(execution_index);
      }
    } else {
      if (instructions[execution_index].hide === false) {
        draw.space.push(i);
      }
    }
  }
  return i;
}
function crex_show_notification(msg, level) {
  if (typeof window !== "undefined") show_notification(msg, level);
  else console.log(level.toUpperCase() + ": " + msg);
}
function writeStackLimit(stackLimit) {
  var draw = {
    space: [],
    info: [],
    success: [],
    warning: [],
    danger: [],
    flash: [],
  };
  if (stackLimit == null) {
    return;
  }
  if (
    stackLimit <= parseInt(architecture.memory_layout[3].value) &&
    stackLimit >= parseInt(parseInt(architecture.memory_layout[2].value))
  ) {
    draw.danger.push(execution_index);
    throw packExecute(
      true,
      "Stack pointer cannot be placed in the data segment",
      "danger",
      null,
    );
  } else if (
    stackLimit <= parseInt(architecture.memory_layout[1].value) &&
    stackLimit >= parseInt(architecture.memory_layout[0].value)
  ) {
    draw.danger.push(execution_index);
    throw packExecute(
      true,
      "Stack pointer cannot be placed in the text segment",
      "danger",
      null,
    );
  } else {
    var diff = parseInt(architecture.memory_layout[4].value) - stackLimit;
    if (diff > 0) {
      creator_memory_zerofill(stackLimit, diff);
    }
    track_stack_setsp(stackLimit);
    architecture.memory_layout[4].value =
      "0x" + stackLimit.toString(16).padStart(8, "0").toUpperCase();
  }
}
var totalStats = 0;
var stats_value = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
var stats = [
  { type: "Arithmetic floating point", number_instructions: 0, percentage: 0 },
  { type: "Arithmetic integer", number_instructions: 0, percentage: 0 },
  { type: "Comparison", number_instructions: 0, percentage: 0 },
  { type: "Conditional bifurcation", number_instructions: 0, percentage: 0 },
  { type: "Control", number_instructions: 0, percentage: 0 },
  { type: "Function call", number_instructions: 0, percentage: 0 },
  { type: "I/O", number_instructions: 0, percentage: 0 },
  { type: "Logic", number_instructions: 0, percentage: 0, abbreviation: "Log" },
  { type: "Memory access", number_instructions: 0, percentage: 0 },
  { type: "Other", number_instructions: 0, percentage: 0 },
  { type: "Syscall", number_instructions: 0, percentage: 0 },
  { type: "Transfer between registers", number_instructions: 0, percentage: 0 },
  { type: "Unconditional bifurcation", number_instructions: 0, percentage: 0 },
];
function stats_update(type) {
  for (var i = 0; i < stats.length; i++) {
    if (type == stats[i].type) {
      stats[i].number_instructions++;
      stats_value[i]++;
      totalStats++;
      if (typeof app !== "undefined") {
        app._data.totalStats++;
      }
    }
  }
  for (var i = 0; i < stats.length; i++) {
    stats[i].percentage = (
      (stats[i].number_instructions / totalStats) *
      100
    ).toFixed(2);
  }
}
function stats_reset() {
  totalStats = 0;
  if (typeof app !== "undefined") {
    app._data.totalStats = 0;
  }
  for (var i = 0; i < stats.length; i++) {
    stats[i].percentage = 0;
    stats[i].number_instructions = 0;
    stats_value[i] = 0;
  }
}
var total_clk_cycles = 0;
var clk_cycles_value = [{ data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] }];
var clk_cycles = [
  { type: "Arithmetic floating point", clk_cycles: 0, percentage: 0 },
  { type: "Arithmetic integer", clk_cycles: 0, percentage: 0 },
  { type: "Comparison", clk_cycles: 0, percentage: 0 },
  { type: "Conditional bifurcation", clk_cycles: 0, percentage: 0 },
  { type: "Control", clk_cycles: 0, percentage: 0 },
  { type: "Function call", clk_cycles: 0, percentage: 0 },
  { type: "I/O", clk_cycles: 0, percentage: 0 },
  { type: "Logic", clk_cycles: 0, percentage: 0, abbreviation: "Log" },
  { type: "Memory access", clk_cycles: 0, percentage: 0 },
  { type: "Other", clk_cycles: 0, percentage: 0 },
  { type: "Syscall", clk_cycles: 0, percentage: 0 },
  { type: "Transfer between registers", clk_cycles: 0, percentage: 0 },
  { type: "Unconditional bifurcation", clk_cycles: 0, percentage: 0 },
];
function clk_cycles_update(type) {
  for (var i = 0; i < clk_cycles.length; i++) {
    if (type == clk_cycles[i].type) {
      clk_cycles[i].clk_cycles++;
      clk_cycles_value[0].data[i]++;
      total_clk_cycles++;
      if (typeof app !== "undefined") {
        app._data.total_clk_cycles++;
      }
    }
  }
  for (var i = 0; i < stats.length; i++) {
    clk_cycles[i].percentage = (
      (clk_cycles[i].clk_cycles / total_clk_cycles) *
      100
    ).toFixed(2);
  }
}
function clk_cycles_reset() {
  total_clk_cycles = 0;
  if (typeof app !== "undefined") {
    app._data.total_clk_cycles = 0;
  }
  for (var i = 0; i < clk_cycles.length; i++) {
    clk_cycles[i].percentage = 0;
    clk_cycles_value[0].data[i] = 0;
  }
}
var keyboard = "";
var display = "";
function display_print(info) {
  if (typeof app !== "undefined") app._data.display += info;
  else process.stdout.write(info + "\n");
  display += info;
}
function kbd_read_char(keystroke, params) {
  var value = keystroke.charCodeAt(0);
  writeRegister(value, params.indexComp, params.indexElem);
  return value;
}
function kbd_read_int(keystroke, params) {
  var value = parseInt(keystroke);
  writeRegister(value, params.indexComp, params.indexElem);
  return value;
}
function kbd_read_float(keystroke, params) {
  var value = parseFloat(keystroke, 10);
  writeRegister(value, params.indexComp, params.indexElem, "SFP-Reg");
  return value;
}
function kbd_read_double(keystroke, params) {
  var value = parseFloat(keystroke, 10);
  writeRegister(value, params.indexComp, params.indexElem, "DFP-Reg");
  return value;
}
function kbd_read_string(keystroke, params) {
  var value = "";
  var neltos = readRegister(params.indexComp2, params.indexElem2);
  for (var i = 0; i < neltos && i < keystroke.length; i++) {
    value = value + keystroke.charAt(i);
  }
  var neltos = readRegister(params.indexComp, params.indexElem);
  writeMemory(value, parseInt(neltos), "string");
  return value;
}
function keyboard_read(fn_post_read, fn_post_params) {
  var draw = {
    space: [],
    info: [],
    success: [],
    warning: [],
    danger: [],
    flash: [],
  };
  if (typeof app === "undefined") {
    var readlineSync = require("readline-sync");
    var keystroke = readlineSync.question(" > ");
    var value = fn_post_read(keystroke, fn_post_params);
    keyboard = keyboard + " " + value;
    return packExecute(false, "The data has been uploaded", "danger", null);
  }
  app._data.enter = false;
  if (3 === run_program) {
    setTimeout(keyboard_read, 1e3, fn_post_read, fn_post_params);
    return;
  }
  fn_post_read(app._data.keyboard, fn_post_params);
  app._data.keyboard = "";
  app._data.enter = null;
  show_notification("The data has been uploaded", "info");
  if (execution_index >= instructions.length) {
    for (var i = 0; i < instructions.length; i++) {
      draw.space.push(i);
    }
    execution_index = -2;
    return packExecute(
      true,
      "The execution of the program has finished",
      "success",
      null,
    );
  }
  if (run_program === 1) {
    $("#playExecution").trigger("click");
  }
}
function get_register_binary(type, bin) {
  for (var i = 0; i < architecture.components.length; i++) {
    if (architecture.components[i].type == type) {
      for (var j = 0; j < architecture.components[i].elements.length; j++) {
        var len = bin.length;
        if (j.toString(2).padStart(len, "0") == bin) {
          return architecture.components[i].elements[j].name[0];
        }
      }
    }
  }
  return null;
}
function get_number_binary(bin) {
  return "0x" + bin2hex(bin);
}
var uielto_loading = {
  template:
    " <div>" +
    '   <div id="spinnerBack" class="spinnerBack" ref="spinnerBack"></div>' +
    "" +
    '   <div id="spinner" class="spinner">' +
    '     <div class="spinnerBox">' +
    '       <b-spinner variant="primary" class="spinnerIcon"></b-spinner>' +
    "     </div>" +
    "" +
    "     <div>" +
    '       <span class="text-primary">' +
    "         <strong>Loading...</strong>" +
    "       </span>" +
    "     </div>" +
    "   </div>" +
    "" +
    " </div>",
};
Vue.component("spinner-loading", uielto_loading);
var uielto_browser = {
  props: { id: { type: String, required: true } },
  data: function () {
    return {};
  },
  methods: {},
  template:
    '<b-modal  :id ="id" title="Browser not supported" hide-footer>' +
    '  <span class="h6">You are using an unsupported browser, please use one of the following:</span>' +
    "  <br>" +
    "  <b-list-group>" +
    "" +
    '    <b-list-group-item class="d-flex justify-content-between align-items-center">' +
    "      Google Chrome 70+" +
    '      <b-badge pill class="browserBadge">' +
    '        <b-img src="./images/chrome.png" ' +
    '               class="shadow broserIcon" ' +
    '               rounded="circle" ' +
    '               fluid alt="Responsive image">' +
    "        </b-img>" +
    "      </b-badge>" +
    "    </b-list-group-item>" +
    " " +
    '    <b-list-group-item class="d-flex justify-content-between align-items-center">' +
    "      Mozilla Firefox 60+" +
    '      <b-badge pill class="browserBadge">' +
    '        <b-img src="./images/firefox.png" ' +
    '               class="shadow broserIcon" ' +
    '               rounded="circle" ' +
    '               fluid alt="Responsive image">' +
    "        </b-img>" +
    "      </b-badge>" +
    "    </b-list-group-item>" +
    " " +
    '    <b-list-group-item class="d-flex justify-content-between align-items-center">' +
    "      Apple Safari 12+" +
    '      <b-badge pill class="browserBadge">' +
    '        <b-img src="./images/safari.png" ' +
    '               class="shadow broserIcon" ' +
    '               rounded="circle"' +
    '               fluid alt="Responsive image">' +
    "        </b-img>" +
    "      </b-badge>" +
    "    </b-list-group-item>" +
    "" +
    "  </b-list-group>" +
    "</b-modal>",
};
Vue.component("supported-browser", uielto_browser);
var uielto_navbar = {
  props: {
    version: { type: String, required: true },
    architecture_name: { type: String, required: true },
  },
  data: function () {
    return {};
  },
  methods: {
    load_num_version() {
      $.getJSON("package.json", function (cfg) {
        creator_information = cfg;
        app._data.version = cfg.version;
      });
    },
  },
  template:
    ' <b-navbar toggleable="sm" class="header my-0 mx-1 py-0 px-2">' +
    '   <b-navbar-brand class="p-0 m-0" href=".">' +
    "" +
    '       <b-container fluid align-h="center" class="mx-0 px-0">' +
    '         <b-row cols="2" align-h="center">' +
    '           <b-col class="headerText col-auto my-0 py-0 pr-1 text-uppercase">' +
    '             <h1>Creator <b-badge pill variant="secondary">{{version}}</b-badge></h1>' +
    "           </b-col>" +
    "" +
    '           <b-col class="headerText col-auto my-0 p-0 ml-2">' +
    "             {{architecture_name}}" +
    "           </b-col>" +
    "         </b-row>" +
    "       </b-container>" +
    "" +
    '       <b-container fluid align-h="center" class="mx-0 px-0">' +
    '         <b-row cols="1" align-h="center">' +
    '           <b-col class="headerName col-auto my-0 py-0 font-weight-bold mx-1">' +
    "             didaCtic and geneRic assEmbly progrAmming simulaTOR" +
    "           </b-col>" +
    "         </b-row>" +
    "       </b-container>" +
    "   </b-navbar-brand>" +
    " " +
    '   <b-navbar-toggle target="nav_collapse" aria-label="Open/Close more information"></b-navbar-toggle>' +
    '     <b-collapse is-nav id="nav_collapse">' +
    '       <b-navbar-nav class="ml-auto">' +
    '         <b-nav-item class="mb-0 pb-0 p-0">' +
    '           <b-button class="btn btn-outline-secondary btn-sm btn-block buttonBackground h-100"' +
    "                     v-b-modal.about>" +
    '             <span class="fas fa-address-card"></span> ' +
    "             About us" +
    "           </b-button>" +
    "         </b-nav-item>" +
    " " +
    "       </b-navbar-nav>" +
    "     </b-collapse>" +
    "   </b-navbar-toggle>" +
    " </b-navbar>",
};
Vue.component("navbar-creator", uielto_navbar);
var uielto_toolbar = {
  props: {
    id: { type: String, required: true },
    components: { type: String, required: true },
    browser: { type: String, required: true },
    arch_available: { type: Array, required: true },
  },
  computed: {
    components_array: function () {
      return this._props.components.split("|");
    },
  },
  methods: {},
  template:
    '<b-container :id="id" fluid align-h="center" class="menu my-3 mx-0 px-0">' +
    ' <b-row cols-xl="4" cols-lg="3" cols-md="3" cols-sm="2" cols-xs="1" cols="1">' +
    '   <b-cols class="px-2 py-1"' +
    '           v-for="(item, index) in components_array">' +
    "     <toolbar-btngroup :group=\"item.split(',')\"" +
    '                       :browser="browser"' +
    '                       :arch_available="arch_available">' +
    "     </toolbar-btngroup>" +
    " " +
    '     <div class="w-100 d-block d-sm-none"></div>' +
    "   </b-cols>" +
    " </b-row>" +
    "</b-container>",
};
Vue.component("uielto-toolbar", uielto_toolbar);
var this_compiling = null;
var uielto_toolbar_btngroup = {
  props: {
    group: { type: Array, required: true },
    browser: { type: String, required: true },
    arch_available: { type: Array, required: true },
  },
  data: function () {
    return {
      compiling: false,
      reset_disable: false,
      instruction_disable: false,
      run_disable: false,
      stop_disable: true,
    };
  },
  methods: {
    change_UI_mode(e) {
      if (app._data.creator_mode != e) {
        if (e == "architecture") {
          $(".loading").show();
          setTimeout(function () {
            app._data.creator_mode = e;
            app.$forceUpdate();
            $(".loading").hide();
          }, 50);
          return;
        }
        app._data.creator_mode = e;
        if (e == "assembly") {
          setTimeout(function () {
            assembly_codemirror_start();
            if (codemirrorHistory != null) {
              textarea_assembly_editor.setHistory(codemirrorHistory);
              textarea_assembly_editor.undo();
            }
            textarea_assembly_editor.setValue(code_assembly);
            if (update_binary != "") {
              $("#divAssembly").attr("class", "col-lg-10 col-sm-12");
              $("#divTags").attr("class", "col-lg-2 col-sm-12");
              $("#divTags").show();
            }
          }, 50);
        }
        if (textarea_assembly_editor != null && e != "assembly") {
          app._data.assembly_code = textarea_assembly_editor.getValue();
          code_assembly = textarea_assembly_editor.getValue();
          codemirrorHistory = textarea_assembly_editor.getHistory();
          textarea_assembly_editor.toTextArea();
        }
        app.$bvToast.hide();
      }
    },
    load_arch_select(arch) {
      uielto_preload_architecture.methods.load_arch_select(arch);
      app.$bvToast.hide();
    },
    new_assembly() {
      textarea_assembly_editor.setValue("");
    },
    assembly_compiler(code) {
      this_compiling = this;
      this_compiling.compiling = true;
      promise = new Promise((resolve, reject) => {
        setTimeout(function () {
          if (typeof code !== "undefined") {
            code_assembly = code;
          } else {
            code_assembly = textarea_assembly_editor.getValue();
          }
          var ret = assembly_compiler();
          app._data.totalStats = 0;
          app._data.instructions = instructions;
          tokenIndex = 0;
          uielto_toolbar_btngroup.methods.reset(true);
          if (typeof Storage !== "undefined") {
            var aux_object = jQuery.extend(true, {}, architecture);
            var aux_architecture = register_value_serialize(aux_object);
            var aux_arch = JSON.stringify(aux_architecture, null, 2);
            var date = new Date();
            var auxDate =
              date.getHours() +
              ":" +
              date.getMinutes() +
              ":" +
              date.getSeconds() +
              " - " +
              date.getDate() +
              "/" +
              (date.getMonth() + 1) +
              "/" +
              date.getFullYear();
            localStorage.setItem(
              "backup_arch_name",
              app._data.architecture_name,
            );
            localStorage.setItem("backup_arch", aux_arch);
            localStorage.setItem("backup_asm", code_assembly);
            localStorage.setItem("backup_date", auxDate);
          }
          this_compiling.compiling = false;
          switch (ret.type) {
            case "error":
              uielto_toolbar_btngroup.methods.compile_error(
                ret.msg,
                ret.token,
                ret.line,
              );
              break;
            case "warning":
              show_notification(ret.token, ret.bgcolor);
              break;
            default:
              show_notification(
                "Compilation completed successfully",
                "success",
              );
              break;
          }
          resolve("0");
        }, 25);
      });
      app.$bvToast.hide();
    },
    compile_error(msg, token, line) {
      var code_assembly_segment = code_assembly.split("\n");
      uielto_toolbar_btngroup.methods.change_UI_mode("assembly");
      setTimeout(function () {
        app.$root.$emit("bv::show::modal", "modalAssemblyError");
        app.modalAssemblyError.line1 = "";
        app.modalAssemblyError.code1 = "";
        if (line > 0) {
          app.modalAssemblyError.line1 = line;
          app.modalAssemblyError.code1 = code_assembly_segment[line - 1];
        }
        app.modalAssemblyError.line2 = line + 1;
        app.modalAssemblyError.code2 = code_assembly_segment[line];
        app.modalAssemblyError.line3 = "";
        app.modalAssemblyError.code3 = "";
        if (line < code_assembly_segment.length - 1) {
          app.modalAssemblyError.line3 = line + 2;
          app.modalAssemblyError.code3 = code_assembly_segment[line + 1];
        }
        app.modalAssemblyError.error = msg;
      }, 75);
    },
    remove_library() {
      update_binary = "";
      load_binary = false;
      $("#divAssembly").attr("class", "col-lg-12 col-sm-12");
      $("#divTags").attr("class", "col-lg-0 col-sm-0");
      $("#divTags").attr("class", "d-none");
    },
    execution_UI_update(ret) {
      if (typeof ret === "undefined") {
        return;
      }
      for (var i = 0; i < ret.draw.space.length; i++) {
        instructions[ret.draw.space[i]]._rowVariant = "";
      }
      for (var i = 0; i < ret.draw.success.length; i++) {
        instructions[ret.draw.success[i]]._rowVariant = "success";
      }
      for (var i = 0; i < ret.draw.info.length; i++) {
        instructions[ret.draw.info[i]]._rowVariant = "info";
      }
      for (var i = 0; i < ret.draw.warning.length; i++) {
        instructions[ret.draw.warning[i]]._rowVariant = "warning";
      }
      for (var i = 0; i < ret.draw.danger.length; i++) {
        instructions[ret.draw.danger[i]]._rowVariant = "danger";
      }
      if (app._data.autoscroll === true && run_program != 1) {
        if (execution_index >= 0 && execution_index + 4 < instructions.length) {
          var id =
            "#inst_table__row_" +
            instructions[
              execution_index + parseInt(architecture.arch_conf[1].value) / 8
            ].Address;
          var row_pos = $(id).position();
          if (row_pos) {
            var pos = row_pos.top - $(".instructions_table").height();
            $(".instructions_table").animate({ scrollTop: pos }, 200);
          }
        } else if (
          execution_index > 0 &&
          execution_index + 4 >= instructions.length
        ) {
          $(".instructions_table").animate(
            { scrollTop: $(".instructions_table").height() },
            300,
          );
        }
      }
      if (app._data.data_mode == "stats") {
        ApexCharts.exec("stat_plot", "updateSeries", stats_value);
      }
      if (app._data.data_mode == "clk_cycles") {
        ApexCharts.exec("clk_plot", "updateSeries", clk_cycles_value);
      }
    },
    reset(reset_graphic) {
      creator_ga("execute", "execute.reset", "execute.reset");
      var draw = {
        space: [],
        info: [],
        success: [],
        warning: [],
        danger: [],
        flash: [],
      };
      app._data.keyboard = "";
      app._data.display = "";
      app._data.enter = null;
      reset(reset_graphic);
      for (var i = 0; i < instructions.length; i++) {
        draw.space.push(i);
      }
      draw.success = [];
      draw.info = [];
      for (var i = 0; i < instructions.length; i++) {
        if (instructions[i].Label == "main") {
          draw.success.push(i);
        }
      }
      var ret = packExecute(false, null, null, draw);
      this.execution_UI_update(ret);
      app.$bvToast.hide();
    },
    execute_instruction() {
      creator_ga("execute", "execute.instruction", "execute.instruction");
      execution_mode = 0;
      var ret = execute_instruction();
      if (typeof ret === "undefined") {
        console.log("Something weird happened :-S");
      }
      if (ret.msg != null) {
        show_notification(ret.msg, ret.type);
      }
      if (ret.draw != null) {
        this.execution_UI_update(ret);
      }
    },
    execute_program() {
      var ret;
      creator_ga("execute", "execute.run", "execute.run");
      execution_mode = 1;
      loadSailFunction(enablefpd, enablevec);
      // if (run_program == 0) {
      //   run_program = 1;
      // }
      // if (instructions.length === 0) {
      //   show_notification("No instructions in memory", "danger");
      //   run_program = 0;
      //   return;
      // }
      // if (execution_index < -1) {
      //   show_notification("The program has finished", "warning");
      //   run_program = 0;
      //   return;
      // }
      // if (execution_index == -1) {
      //   show_notification("The program has finished with errors", "danger");
      //   run_program = 0;
      //   return;
      // }
      // this.reset_disable = true;
      // this.instruction_disable = true;
      // this.run_disable = true;
      // this.stop_disable = false;
      // app._data.main_memory_busy = true;
      // uielto_toolbar_btngroup.methods.execute_program_packed(ret, this);
    },
    execute_program_packed(ret, local_this) {
      for (var i = 0; i < instructions_packed && execution_index >= 0; i++) {
        if (
          run_program == 0 ||
          run_program == 3 ||
          (instructions[execution_index].Break === true && run_program != 2)
        ) {
          local_this.execution_UI_update(ret);
          local_this.reset_disable = false;
          local_this.instruction_disable = false;
          local_this.run_disable = false;
          local_this.stop_disable = true;
          app._data.main_memory_busy = false;
          if (instructions[execution_index].Break === true) {
            run_program = 2;
          }
          return;
        } else {
          if (run_program == 2) {
            run_program = 1;
          }
          ret = execute_instruction();
          if (typeof ret === "undefined") {
            console.log("Something weird happened :-S");
            run_program = 0;
            local_this.execution_UI_update(ret);
            local_this.reset_disable = false;
            local_this.instruction_disable = false;
            local_this.run_disable = false;
            local_this.stop_disable = true;
            app._data.main_memory_busy = false;
            return;
          }
          if (ret.msg != null) {
            show_notification(ret.msg, ret.type);
            local_this.execution_UI_update(ret);
            local_this.reset_disable = false;
            local_this.instruction_disable = false;
            local_this.run_disable = false;
            local_this.stop_disable = true;
            app._data.main_memory_busy = false;
          }
        }
      }
      if (execution_index >= 0) {
        setTimeout(
          uielto_toolbar_btngroup.methods.execute_program_packed,
          15,
          ret,
          local_this,
        );
      } else {
        local_this.execution_UI_update(ret);
        local_this.reset_disable = false;
        local_this.instruction_disable = false;
        local_this.run_disable = false;
        local_this.stop_disable = true;
        app._data.main_memory_busy = false;
      }
    },
    flash_program() {},
    stop_execution() {
      run_program = 0;
      this.reset_disable = false;
      this.instruction_disable = false;
      this.run_disable = false;
      this.stop_disable = true;
      app._data.main_memory_busy = false;
    },
  },
  template:
    "     <b-container fluid>" +
    "       <b-row>" +
    " " +
    '         <span class="col px-0 mr-1" v-for="(item, index) in group">' +
    button_architecture() +
    button_assembly() +
    button_simulator() +
    button_edit_architecture() +
    button_save_architecture() +
    dropdown_assembly_file() +
    button_compile() +
    dropdown_library() +
    button_reset() +
    button_instruction() +
    button_run() +
    button_flash() +
    button_stop() +
    button_examples() +
    button_calculator() +
    button_configuration() +
    button_information() +
    "         </span>" +
    " " +
    "       </b-row>" +
    "     </b-container>",
};
Vue.component("toolbar-btngroup", uielto_toolbar_btngroup);
function button_architecture() {
  return (
    '<b-dropdown class="btn btn-block menuGroup arch_btn h-100 mr-1 p-0"' +
    "            split" +
    "            v-if=\"item=='btn_architecture'\"" +
    "            right" +
    '            text="Architecture"' +
    '            size="sm"' +
    '            variant="outline-secondary"' +
    "            @click=\"change_UI_mode('architecture')\">" +
    '  <b-dropdown-item v-for="item in arch_available" v-if="item.available == 1" @click="load_arch_select(item)">{{item.name}}</b-dropdown-item>' +
    "</b-dropdown>"
  );
}
function button_assembly() {
  return (
    '<b-button v-if="item==\'btn_assembly\'" class="btn btn-block btn-outline-secondary menuGroup btn-sm assembly_btn h-100 text-truncate"' +
    '          id="assembly_btn_sim"' +
    "          @click=\"change_UI_mode('assembly')\">" +
    '  <span class="fas fa-hashtag"></span>' +
    "  Assembly" +
    "</b-button>"
  );
}
function button_simulator() {
  return (
    '<b-button v-if="item==\'btn_simulator\'" class="btn btn-block btn-outline-secondary menuGroup btn-sm simulator_btn btn_arch h-100"' +
    '          id="sim_btn_arch"' +
    "          @click=\"change_UI_mode('simulator')\">" +
    '  <span class="fas fa-cogs"></span>' +
    "  Simulator" +
    "</b-button>"
  );
}
function button_edit_architecture() {
  return (
    '<b-button v-if="item==\'btn_edit_architecture\'" class="btn btn-block btn-outline-secondary menuGroup btn-sm h-100" ' +
    '          id="edit_btn_arch" ' +
    "          v-b-modal.edit_architecture> " +
    '  <span class="fa-solid fa-pen-to-square"></span> ' +
    "  Edit Architecture" +
    "</b-button>"
  );
}
function button_save_architecture() {
  return (
    '<b-button v-if="item==\'btn_save_architecture\'" class="btn btn-block btn-outline-secondary menuGroup btn-sm h-100" ' +
    '          id="save_btn_arch" ' +
    "          v-b-modal.save_architecture> " +
    '  <span class="fas fa-download"></span> ' +
    "  Save Architecture" +
    "</b-button>"
  );
}
function dropdown_assembly_file() {
  return (
    "<b-dropdown v-if=\"item=='dropdown_assembly_file'\" right " +
    '            text="File" ' +
    '            size="sm" ' +
    '            class="btn btn-block  menuGroup btn-sm p-0" ' +
    '            variant="outline-secondary">' +
    '  <b-dropdown-item @click="new_assembly">' +
    '    <span class="fas fa-file"></span> ' +
    "    New" +
    "  </b-dropdown-item>" +
    "  <b-dropdown-item v-b-modal.load_assembly>" +
    '    <span class="fas fa-upload"></span>' +
    "    Load" +
    "  </b-dropdown-item>" +
    "  <b-dropdown-item v-b-modal.save_assembly>" +
    '    <span class="fas fa-download"></span>' +
    "    Save" +
    "  </b-dropdown-item>" +
    "  <b-dropdown-item v-b-modal.examples>" +
    '    <span class="far fa-file-alt"></span>' +
    "    Examples" +
    "  </b-dropdown-item>" +
    "  <b-dropdown-item v-b-modal.make_uri>" +
    '    <span class="fa fa-link"></span>' +
    "    Get code as URI" +
    "  </b-dropdown-item>" +
    "</b-dropdown>"
  );
}
function button_compile() {
  return (
    '<b-button v-if="item==\'btn_compile\'" class="btn btn-block btn-outline-secondary actionsGroup btn-sm h-100" ' +
    '          id="compile_assembly" ' +
    '          @click="assembly_compiler()">' +
    '  <span class="fas fa-sign-in-alt"></span>' +
    "  Compile/Linked" +
    ' <b-spinner small v-if="compiling" class="ml-3"></b-spinner>' +
    "</b-button>"
  );
}
function dropdown_library() {
  return (
    '<b-dropdown v-if="item==\'dropdown_library\'" right text="Library" size="sm" class="btn btn-block menuGroup btn-sm p-0" variant="outline-secondary">' +
    "  <b-dropdown-item v-b-modal.save_binary>" +
    '    <span class="fas fa-plus-square"></span>' +
    "    Create" +
    "  </b-dropdown-item>" +
    "  <b-dropdown-item v-b-modal.load_binary>" +
    '    <span class="fas fa-upload"></span>' +
    "    Load Library" +
    "  </b-dropdown-item>" +
    '  <b-dropdown-item @click="remove_library">' +
    '    <span class="far fa-trash-alt"></span>' +
    "    Remove" +
    "  </b-dropdown-item>" +
    "</b-dropdown>"
  );
}
function button_reset() {
  return (
    '<b-button v-if="item==\'btn_reset\'" @click="reset(true)" ' +
    '          :disabled="reset_disable"' +
    '          class="btn btn-block btn-outline-secondary actionsGroup btn-sm h-100 mr-1 text-truncate">' +
    '  <span class="fas fa-power-off"></span>' +
    "  Reset" +
    "</b-button>"
  );
}
function button_instruction() {
  return (
    '<b-button v-if="item==\'btn_instruction\'" accesskey="a" ' +
    '          :disabled="instruction_disable"' +
    '          class="btn btn-block btn-outline-secondary actionsGroup btn-sm h-100 mr-1 text-truncate" ' +
    '          @click="execute_instruction" id="inst">' +
    '  <span class="fas fa-fast-forward"></span>' +
    "  Inst." +
    "</b-button>" +
    '<b-tooltip v-if="item==\'btn_instruction\'" target="inst" title="Press [Alt] + A" v-if="browser==\'Chrome\'"></b-tooltip>' +
    '<b-tooltip v-if="item==\'btn_instruction\'" target="inst" title="Press [Alt] [Shift] + A" v-if="browser==\'Firefox\'"></b-tooltip>' +
    '<b-tooltip v-if="item==\'btn_instruction\'" target="inst" title="Press [Control] [Alt/Option] + A" v-if="browser==\'Mac\'"></b-tooltip>'
  );
}
function button_run() {
  return (
    '<b-button v-if="item==\'btn_run\'" class="btn btn-block btn-outline-secondary actionsGroup btn-sm h-100 mr-1" ' +
    '          @click="execute_program" ' +
    '          :disabled="run_disable"' +
    '          id="playExecution">' +
    '  <span class="fas fa-play"></span>' +
    "  Run" +
    "</b-button>"
  );
}
function button_flash() {
  return (
    '<b-button v-if="item==\'btn_flash\'" class="btn btn-block btn-outline-secondary actionsGroup btn-sm h-100 mr-1" ' +
    "          v-b-modal.flash " +
    '          :disabled="run_disable">' +
    '  <span class="fa-brands fa-usb"></span>' +
    "  Flash" +
    "</b-button>"
  );
}
function button_stop() {
  return (
    '<b-button v-if="item==\'btn_stop\'" class="btn btn-block btn-outline-secondary actionsGroup btn-sm h-100 text-truncate" ' +
    '          @click="stop_execution" ' +
    '          :disabled="stop_disable"' +
    '          id="stop_execution">' +
    '  <span class="fas fa-stop"></span>' +
    "  Stop" +
    "</b-button>"
  );
}
function button_examples() {
  return (
    '<b-button v-if="item==\'btn_examples\'" class="btn btn-block btn-outline-secondary menuGroup btn-sm h-100 mr-1 text-truncate"' +
    "          v-b-modal.examples2>" +
    '  <span class="fas fa-file-alt"></span>' +
    "  Examples" +
    "</b-button>"
  );
}
function button_calculator() {
  return (
    '<b-button v-if="item==\'btn_calculator\'" class="btn btn-block btn-outline-secondary menuGroup btn-sm h-100 text-truncate"' +
    "          v-b-modal.calculator>" +
    '  <span class="fas fa-calculator"></span>' +
    "  Calculator" +
    "</b-button>"
  );
}
function button_configuration() {
  return (
    '<b-button v-if="item==\'btn_configuration\'" class="btn btn-block btn-outline-secondary menuGroup btn-sm h-100 mr-1 text-truncate" ' +
    '          id="conf_btn_sim" ' +
    "          v-b-modal.configuration>" +
    '  <span class="fa fa-cogs"></span>' +
    "  Configuration" +
    "</b-button>"
  );
}
function button_information() {
  return (
    '<b-button v-if="item==\'btn_information\'" class="btn btn-block btn-outline-secondary btn-sm h-100 infoButton text-truncate"' +
    '          id="info">' +
    '  <span class="fas fa-info-circle"></span> ' +
    "  Info" +
    "</b-button>" +
    " " +
    "\x3c!-- Information popover --\x3e" +
    '<popover-info target="info" show_instruction_help="true"></popover-info>'
  );
}
var uielto_configuration = {
  props: {
    id: { type: String, required: true },
    default_architecture: { type: String, required: true },
    stack_total_list: { type: Number, required: true },
    autoscroll: { type: Boolean, required: true },
    notification_time: { type: Number, required: true },
    instruction_help_size: { type: Number, required: true },
    dark: { type: Boolean, required: true },
    c_debug: { type: Boolean, required: true },
  },
  data: function () {
    return {
      architectures: (architectures = [
        { text: "None", value: "none" },
        { text: "RISC-V (RV32IMFD)", value: "RISC-V (RV32IMFD)" },
        { text: "MIPS-32", value: "MIPS-32" },
      ]),
    };
  },
  methods: {
    get_configuration() {
      if (localStorage.getItem("conf_default_architecture") != null) {
        app._data.default_architecture = localStorage.getItem(
          "conf_default_architecture",
        );
      }
      if (localStorage.getItem("conf_stack_total_list") != null) {
        app._data.stack_total_list = parseInt(
          localStorage.getItem("conf_stack_total_list"),
        );
      }
      if (localStorage.getItem("conf_autoscroll") != null) {
        app._data.autoscroll =
          localStorage.getItem("conf_autoscroll") === "true";
      }
      if (localStorage.getItem("conf_notification_time") != null) {
        app._data.notification_time = parseInt(
          localStorage.getItem("conf_notification_time"),
        );
      }
      if (localStorage.getItem("conf_instruction_help_size") != null) {
        app._data.instruction_help_size = parseInt(
          localStorage.getItem("conf_instruction_help_size"),
        );
      }
    },
    change_default_architecture() {
      this._props.default_architecture = this.default_architecture;
      app._data.default_architecture = this._props.default_architecture;
      localStorage.setItem(
        "conf_default_architecture",
        this._props.default_architecture,
      );
      creator_ga(
        "configuration",
        "configuration.default_architecture",
        "configuration.default_architecture." +
          this._props.default_architecture,
      );
    },
    get_dark_mode() {
      if (localStorage.getItem("conf_dark_mode") != null) {
        document.getElementsByTagName("body")[0].style =
          localStorage.getItem("conf_dark_mode");
        if (localStorage.getItem("conf_dark_mode") == "") {
          app._data.dark = false;
        } else {
          app._data.dark = true;
        }
      } else {
        var default_style = window.matchMedia(
          "(prefers-color-scheme: dark)",
        ).matches;
        if (default_style === true) {
          document.getElementsByTagName("body")[0].style =
            "filter: invert(88%) hue-rotate(160deg) !important; background-color: #111 !important;";
          app._data.dark = true;
        } else {
          document.getElementsByTagName("body")[0].style = "";
          app._data.dark = false;
        }
      }
    },
    change_stack_max_list(value) {
      var prev_stack_total_list = this._props.stack_total_list;
      if (value) {
        this._props.stack_total_list = this._props.stack_total_list + value;
        if (this._props.stack_total_list < 1) {
          this._props.stack_total_list = 20;
        }
        if (this._props.stack_total_list > 500) {
          this._props.stack_total_list = 500;
        }
      } else {
        this._props.stack_total_list = parseInt(this._props.stack_total_list);
      }
      app._data.stack_total_list = this._props.stack_total_list;
      localStorage.setItem(
        "conf_stack_total_list",
        this._props.stack_total_list,
      );
      creator_ga(
        "configuration",
        "configuration.stack_total_list",
        "configuration.stack_total_list.speed_" +
          (prev_stack_total_list > this._props.stack_total_list).toString(),
      );
    },
    change_autoscroll() {
      this._props.autoscroll = !this._props.autoscroll;
      localStorage.setItem("conf_autoscroll", this._props.autoscroll);
      app._data.autoscroll = this._props.autoscroll;
      creator_ga(
        "configuration",
        "configuration.autoscroll",
        "configuration.autoscroll." + this._props.autoscroll,
      );
    },
    change_notification_time(value) {
      var prev_notification_time = this._props.notification_time;
      if (value) {
        this._props.notification_time = this._props.notification_time + value;
        if (this._props.notification_time < 1e3) {
          this._props.notification_time = 1e3;
        }
        if (this._props.notification_time > 3500) {
          this._props.notification_time = 3500;
        }
      } else {
        this._props.notification_time = parseInt(this._props.notification_time);
      }
      app._data.notification_time = this._props.notification_time;
      localStorage.setItem(
        "conf_notification_time",
        this._props.notification_time,
      );
      creator_ga(
        "configuration",
        "configuration.notification_time",
        "configuration.notification_time.time_" +
          (prev_notification_time > this._props.notification_time).toString(),
      );
    },
    change_instruction_help_size(value) {
      var prev_instruction_help_size = this._props.instruction_help_size;
      if (value) {
        this._props.instruction_help_size =
          this._props.instruction_help_size + value;
        if (this._props.instruction_help_size < 15) {
          this._props.instruction_help_size = 15;
        }
        if (this._props.instruction_help_size > 65) {
          this._props.instruction_help_size = 65;
        }
      } else {
        this._props.instruction_help_size = parseInt(
          this._props.instruction_help_size,
        );
      }
      app._data.instruction_help_size = this._props.instruction_help_size;
      localStorage.setItem(
        "conf_instruction_help_size",
        this._props.instruction_help_size,
      );
      creator_ga(
        "configuration",
        "configuration.instruction_help_size",
        "configuration.instruction_help_size.size_" +
          (
            prev_instruction_help_size > this._props.instruction_help_size
          ).toString(),
      );
    },
    change_dark_mode() {
      this._props.dark = !this._props.dark;
      if (this._props.dark) {
        document.getElementsByTagName("body")[0].style =
          "filter: invert(88%) hue-rotate(160deg) !important; background-color: #111 !important;";
        localStorage.setItem(
          "conf_dark_mode",
          "filter: invert(88%) hue-rotate(160deg) !important; background-color: #111 !important;",
        );
      } else {
        document.getElementsByTagName("body")[0].style = "";
        localStorage.setItem("conf_dark_mode", "");
      }
      app._data.dark = this._props.dark;
      creator_ga(
        "configuration",
        "configuration.dark_mode",
        "configuration.dark_mode." + this._props.dark,
      );
    },
    change_debug_mode() {
      this._props.c_debug = !this._props.c_debug;
      app._data.c_debug = this._props.c_debug;
      creator_ga(
        "configuration",
        "configuration.debug_mode",
        "configuration.debug_mode." + this._props.c_debug,
      );
    },
  },
  template:
    ' <b-modal  :id ="id" ' +
    '           title="Configuration" ' +
    "           hide-footer>" +
    " " +
    "   <b-list-group>" +
    '     <b-list-group-item class="justify-content-between align-items-center m-1">' +
    '       <label for="range-5">Default Architecture:</label>' +
    '         <b-form-select v-model="default_architecture" ' +
    '                        :options="architectures" ' +
    '                        size="sm"' +
    '                        @change="change_default_architecture" ' +
    '                        title="Default Architecture">' +
    "         </b-form-select>" +
    "     </b-list-group-item>" +
    " " +
    '     <b-list-group-item class="justify-content-between align-items-center m-1">' +
    '       <label for="range-1">Maximum stack values listed:</label>' +
    "       <b-input-group>" +
    "         <b-input-group-prepend>" +
    '           <b-btn variant="outline-secondary" @click="change_stack_max_list(-5)">-</b-btn>' +
    "         </b-input-group-prepend>" +
    '         <b-form-input id="range-1"' +
    '                       v-model="stack_total_list" ' +
    '                       @change="change_stack_max_list(0)" ' +
    '                       type="range" ' +
    '                       min="20" ' +
    '                       max="500" ' +
    '                       step="5" ' +
    '                       title="Stack max view">' +
    "         </b-form-input>" +
    "         <b-input-group-append>" +
    '           <b-btn variant="outline-secondary" @click="change_stack_max_list(5)">+</b-btn>' +
    "         </b-input-group-append>" +
    "       </b-input-group>" +
    "     </b-list-group-item>" +
    " " +
    '     <b-list-group-item class="justify-content-between align-items-center m-1">' +
    '       <label for="range-3">Notification Time:</label>' +
    "       <b-input-group>" +
    "         <b-input-group-prepend>" +
    '           <b-btn variant="outline-secondary" @click="change_notification_time(-20)">-</b-btn>' +
    "         </b-input-group-prepend>" +
    '         <b-form-input id="range-3"' +
    '                       v-model="notification_time" ' +
    '                       @change="change_notification_time(0)" ' +
    '                       type="range" ' +
    '                       min="1000" ' +
    '                       max="3500" ' +
    '                       step="10" ' +
    '                       title="Notification Time">' +
    "         </b-form-input>" +
    "         <b-input-group-append>" +
    '           <b-btn variant="outline-secondary" @click="change_notification_time(20)">+</b-btn>' +
    "         </b-input-group-append>" +
    "       </b-input-group>" +
    "     </b-list-group-item>" +
    " " +
    '     <b-list-group-item class="justify-content-between align-items-center m-1">' +
    '       <label for="range-3">Instruction Help Size:</label>' +
    "       <b-input-group>" +
    "         <b-input-group-prepend>" +
    '           <b-btn variant="outline-secondary" @click="change_instruction_help_size(-2)">-</b-btn>' +
    "         </b-input-group-prepend>" +
    '         <b-form-input id="range-3"' +
    '                       v-model="instruction_help_size" ' +
    '                       @change="change_instruction_help_size(0)" ' +
    '                       type="range" ' +
    '                       min="15" ' +
    '                       max="65" ' +
    '                       step="2" ' +
    '                       title="Instruction Help Size">' +
    "         </b-form-input>" +
    "         <b-input-group-append>" +
    '           <b-btn variant="outline-secondary" @click="change_instruction_help_size(2)">+</b-btn>' +
    "         </b-input-group-append>" +
    "       </b-input-group>" +
    "     </b-list-group-item>" +
    " " +
    '     <b-list-group-item class="justify-content-between align-items-center m-1">' +
    '       <label for="range-2">Execution Autoscroll:</label>' +
    '       <b-form-checkbox id="range-2"' +
    '                        v-model="autoscroll" ' +
    '                        name="check-button" ' +
    "                        switch " +
    '                        size="lg" ' +
    '                        @change="change_autoscroll">' +
    "       </b-form-checkbox>" +
    "     </b-list-group-item>" +
    " " +
    " " +
    '     <b-list-group-item class="justify-content-between align-items-center m-1">' +
    '       <label for="range-5">Dark Mode:</label>' +
    '       <b-form-checkbox id="range-5"' +
    '                        name="check-button"' +
    '                        switch size="lg"' +
    '                        v-model="dark" ' +
    '                        @change="change_dark_mode">' +
    "       </b-form-checkbox>" +
    "     </b-list-group-item>" +
    " " +
    '     <b-list-group-item class="justify-content-between align-items-center m-1">' +
    '       <label for="range-6">Debug:</label>' +
    '       <b-form-checkbox id="range-6"' +
    '                        v-model="c_debug"' +
    '                        name="check-button"' +
    '                        switch size="lg"' +
    '                        @change="change_debug_mode">' +
    "       </b-form-checkbox>" +
    "     </b-list-group-item>" +
    " " +
    " </b-modal>",
};
Vue.component("form-configuration", uielto_configuration);
var uielto_info = {
  props: {
    target: { type: String, required: true },
    show_instruction_help: { type: Boolean, required: true },
  },
  methods: {
    closePopover() {
      this.$root.$emit("bv::hide::popover");
    },
  },
  template:
    ' <b-popover :target="target" triggers="click blur">' +
    "   <template v-slot:title>" +
    '     <b-button @click="closePopover" class="close" aria-label="Close">' +
    '       <span class="d-inline-block" aria-hidden="true">&times;</span>' +
    "     </b-button>" +
    "     <br>" +
    "   </template>" +
    " " +
    '   <b-button class="btn btn-outline-secondary btn-sm btn-block infoButton" ' +
    "             href='https://creatorsim.github.io/' " +
    '             target="_blank" ' +
    "             onclick=\"creator_ga('send', 'event', 'help', 'help.general_help', 'help.general_help');\">" +
    '     <span class="fas fa-question-circle" ></span> ' +
    "     Help" +
    "   </b-button>" +
    " " +
    '   <b-button class="btn btn-outline-secondary btn-block btn-sm h-100 infoButton" v-if="show_instruction_help==\'true\'"' +
    '             id="inst_ass" v-b-toggle.sidebar_help' +
    "             onclick=\"creator_ga('send', 'event', 'help', 'help.instruction_help', 'help.instruction_help');\">" +
    '     <span class="fas fa-book"></span>' +
    "     Instruction Help" +
    "   </b-button>" +
    " " +
    '   <b-button class="btn btn-outline-secondary btn-sm btn-block buttonBackground h-100" ' +
    "             v-b-modal.notifications>" +
    '     <span class="fas fa-bell"></span> ' +
    "     Show Notifications" +
    "   </b-button>" +
    " </b-popover>",
};
Vue.component("popover-info", uielto_info);
var uielto_about = {
  props: { id: { type: String, required: true } },
  template:
    ' <b-modal  :id ="id" ' +
    '           title="About us" ' +
    "           scrollable" +
    "           hide-footer>" +
    " " +
    "   <b-card-group>" +
    "     <card-author " +
    '       author_img="/creator/images/author_dcamarmas.png" ' +
    '       author_alt="author_dcamarmas" ' +
    '       author_full_name="Diego Camarmas Alonso" ' +
    '       author_href_linked="https://www.linkedin.com/in/dcamarmas" ' +
    '       author_href_rgate="https://www.researchgate.net/profile/Diego-Camarmas-Alonso" ' +
    '       author_href_github="https://github.com/dcamarmas" ' +
    "     ></card-author>" +
    " " +
    "     <card-author " +
    '       author_img="/creator/images/author_fgarcia.png" ' +
    '       author_alt="author_fgarcia" ' +
    '       author_full_name="Félix García Carballeira" ' +
    '       author_href_linked="https://es.linkedin.com/in/f%C3%A9lix-garc%C3%ADa-carballeira-4ab48a14" ' +
    '       author_href_rgate="https://www.researchgate.net/profile/Felix_Garcia-Carballeira" ' +
    '       author_href_github="" ' +
    "     ></card-author>" +
    "" +
    "     <card-author " +
    '       author_img="/creator/images/author_acaldero.png" ' +
    '       author_alt="author_acaldero" ' +
    '       author_full_name="Alejandro Calderón Mateos" ' +
    '       author_href_linked="https://www.linkedin.com/in/alejandro-calderon-mateos/" ' +
    '       author_href_rgate="https://www.researchgate.net/profile/Alejandro_Calderon2" ' +
    '       author_href_github="https://github.com/acaldero" ' +
    "     ></card-author>" +
    "" +
    "     <card-author " +
    '       author_img="/creator/images/author_edelpozo.png" ' +
    '       author_alt="author_edelpozo" ' +
    '       author_full_name="Elías del Pozo Puñal" ' +
    '       author_href_linked="https://www.linkedin.com/in/edelpozop/" ' +
    '       author_href_rgate="https://www.researchgate.net/profile/Elias-Del-Pozo-Punal-2" ' +
    '       author_href_github="https://github.com/edelpozop" ' +
    "     ></card-author>" +
    "" +
    "   </b-card-group>" +
    " " +
    "   <b-list-group>" +
    '     <b-list-group-item style="text-align: center;">Contact us: <a href="mailto: creator.arcos.inf.uc3m.es@gmail.com">creator.arcos.inf.uc3m.es@gmail.com</a></b-list-group-item>' +
    "   </b-list-group>" +
    " " +
    "   <b-list-group>" +
    '     <b-list-group-item style="text-align: center;">' +
    '       <b-row align-h="center">' +
    '         <b-col cols="4">' +
    "           <a target=\"_blank\" href='https://www.arcos.inf.uc3m.es/'>" +
    '             <img alt="ARCOS" class="p-0 headerLogo" src="./images/arcos.svg">' +
    "           </a>" +
    "         </b-col>" +
    '         <b-col cols="8">' +
    "           <a target=\"_blank\" href='https://www.inf.uc3m.es/'>" +
    '             <img alt="Computer Science and Engineering Departament" class="p-0 headerLogo" src="./images/dptoinf.png" style="width: 90%; height: auto">' +
    "           </a>" +
    "         </b-col>" +
    "       </b-row>" +
    "     </b-list-group-item>" +
    "   </b-list-group>" +
    " " +
    " </b-modal>",
};
Vue.component("uielto-about", uielto_about);
var uielto_author = {
  props: {
    author_img: { type: String, required: true },
    author_alt: { type: String, required: true },
    author_full_name: { type: String, required: true },
    author_href_linked: { type: String, required: false },
    author_href_rgate: { type: String, required: false },
    author_href_github: { type: String, required: false },
  },
  template:
    '  <b-card :img-src="author_img" ' +
    '          :img-alt="author_alt" img-top>' +
    " " +
    "    <b-card-text>" +
    '      <div class="authorName"><span class="h6">{{ author_full_name }}</span></div>' +
    "      <hr>" +
    '      <a aria-label="linkedin" target="_blank" :href="author_href_linked">' +
    '        <span class="fab fa-linkedin"></span>' +
    " linkedin" +
    "      </a>" +
    "      <hr>" +
    '      <a aria-label="r-gate" target="_blank" :href="author_href_rgate">' +
    '        <span class="fab fa-researchgate"></span>' +
    " r-gate" +
    "      </a>" +
    "      <hr>" +
    '      <a aria-label="github" target="_blank" :href="author_href_github">' +
    '        <span class="fab fa-github"></span>' +
    " github" +
    "      </a>" +
    "    </b-card-text>" +
    " " +
    "  </b-card>",
};
Vue.component("card-author", uielto_author);
var uielto_notifications = {
  props: {
    id: { type: String, required: true },
    notifications: { type: Array, required: true },
  },
  template:
    ' <b-modal :id ="id" ' +
    '          title="Notifications" ' +
    "          scrollable" +
    "          hide-footer>" +
    " " +
    '   <span class="h6" v-if="notifications.length == 0">' +
    "     There's no notification at the moment" +
    "   </span>" +
    " " +
    '   <b-alert show :variant="item.color"' +
    '            v-for="item in notifications">' +
    '     <span class="h6">' +
    '       <span class="fas fa-info-circle" v-if="item.color!=\'danger\'"></span>' +
    '       <span class="fas fa-exclamation-triangle" v-if="item.color==\'danger\'"></span> ' +
    "         {{item.mess}}" +
    "     </span>" +
    '     <span class="h6">{{item.time}}   -   {{item.date}}</span>' +
    "   </b-alert>" +
    " " +
    " </b-modal>",
};
Vue.component("uielto-notifications", uielto_notifications);
var uielto_instruction_help = {
  props: {
    id: { type: String, required: true },
    architecture_name: { type: String, required: true },
    architecture: { type: Object, required: true },
    architecture_guide: { type: String, required: true },
    instruction_help_size: { type: Object, required: true },
  },
  data: function () {
    return { instHelpFilter: null, insHelpFields: ["name"] };
  },
  methods: {
    get_width() {
      return this._props.instruction_help_size + "vw";
    },
  },
  template:
    '<b-sidebar :id="id" sidebar-class="border-left border-info px-3 py-2" right shadow' +
    '           title="Instruction Help"' +
    '           :width="get_width()">' +
    " " +
    ' <b-form-input id="filter-input"' +
    '               v-model="instHelpFilter"' +
    '               type="search"' +
    '               placeholder="Search instruction"' +
    "               size=sm" +
    " ></b-form-input>" +
    " " +
    " <br>" +
    ' <a v-if="architecture_guide !=\'\'" target="_blank" :href="architecture_guide"><span class="fas fa-file-pdf"></span> {{architecture_name}} Guide</a>' +
    " <br>" +
    " " +
    ' <b-table small :items="architecture.instructions" ' +
    '                :fields="insHelpFields" ' +
    '                class="text-left help-scroll-y my-3"' +
    '                :filter="instHelpFilter"' +
    '                thead-class="d-none">' +
    " " +
    '   <template v-slot:cell(name)="row">' +
    "     <h4>{{row.item.name}}</h4>" +
    "     <em>{{row.item.signatureRaw}}</em>" +
    "     <br>" +
    "     {{row.item.help}}" +
    "   </template>" +
    " " +
    " </b-table>" +
    " " +
    "</b-sidebar",
};
Vue.component("sidebar-instruction-help", uielto_instruction_help);
var uielto_preload_architecture = {
  props: {
    arch_available: { type: Array, required: true },
    back_card: { type: Array, required: true },
    item: { type: Object, required: true },
    index: { type: Number, required: true },
  },
  data: function () {
    return { architecture_name: "", example_loaded: "" };
  },
  methods: {
    load_arch_available() {
      $.getJSON(
        "architecture/available_arch.json" + "?v=" + new Date().getTime(),
        function (cfg) {
          architecture_available = cfg;
          if (typeof Storage !== "undefined") {
            if (localStorage.getItem("load_architectures_available") != null) {
              var aux_arch = localStorage.getItem(
                "load_architectures_available",
              );
              var aux = JSON.parse(aux_arch);
              for (var i = 0; i < aux.length; i++) {
                architecture_available.push(aux[i]);
                load_architectures_available.push(aux[i]);
                var aux_arch_2 = localStorage.getItem("load_architectures");
                var aux2 = JSON.parse(aux_arch_2);
                load_architectures.push(aux2[i]);
              }
            }
          }
          app._data.arch_available = architecture_available;
          for (var i = 0; i < architecture_available.length; i++) {
            back_card.push({
              name: architecture_available[i].name,
              background: "default",
            });
          }
          uielto_preload_architecture.methods.load_default_architecture(
            architecture_available,
          );
        },
      );
    },
    load_default_architecture(architecture_available) {
      if (typeof Storage !== "undefined") {
        var e = null;
        if (
          localStorage.getItem("conf_default_architecture") != null &&
          localStorage.getItem("conf_default_architecture") != "none"
        ) {
          var default_architecture = localStorage.getItem(
            "conf_default_architecture",
          );
          for (var i = 0; i < architecture_available.length; i++) {
            if (architecture_available[i].name == default_architecture) {
              e = architecture_available[i];
            }
          }
          $.ajaxSetup({ async: false });
          $.getJSON(
            "architecture/" + e.file + ".json" + "?v=" + new Date().getTime(),
            function (cfg) {
              uielto_preload_architecture.methods.load_arch_select_aux(
                cfg,
                true,
                e,
              );
              hide_loading();
              show_notification(
                e.name + " architecture has been loaded correctly",
                "success",
              );
              creator_ga(
                "architecture",
                "architecture.loading",
                "architectures.loading.preload_cache",
              );
            },
          ).fail(function () {
            hide_loading();
            show_notification(
              e.name + " architecture is not currently available",
              "info",
            );
          });
        }
      }
    },
    load_arch_select(e) {
      show_loading();
      if (e == null) {
        hide_loading();
        show_notification(
          "The architecture is not currently available",
          "info",
        );
        return;
      }
      for (i = 0; i < load_architectures.length; i++) {
        if (e.name == load_architectures[i].id) {
          var aux_architecture = JSON.parse(load_architectures[i].architecture);
          uielto_preload_architecture.methods.load_arch_select_aux(
            aux_architecture,
            true,
            e,
          );
          hide_loading();
          show_notification(
            e.name + " architecture has been loaded correctly",
            "success",
          );
          creator_ga(
            "architecture",
            "architecture.loading",
            "architectures.loading.preload_" + e.name,
          );
          return;
        }
      }
      $.ajaxSetup({ async: false });
      $.getJSON(
        "architecture/" + e.file + ".json" + "?v=" + new Date().getTime(),
        function (cfg) {
          uielto_preload_architecture.methods.load_arch_select_aux(
            cfg,
            true,
            e,
          );
          hide_loading();
          show_notification(
            e.name + " architecture has been loaded correctly",
            "success",
          );
          creator_ga(
            "architecture",
            "architecture.loading",
            "architectures.loading.preload_cache",
          );
        },
      ).fail(function () {
        hide_loading();
        show_notification(
          e.name + " architecture is not currently available",
          "info",
        );
      });
    },
    load_arch_select_aux(cfg, load_associated_examples, e) {
      var aux_architecture = cfg;
      architecture = register_value_deserialize(aux_architecture);
      architecture_json = e.file;
      uielto_preload_architecture.data.architecture_name =
        architecture.arch_conf[0].value;
      app._data.architecture = architecture;
      app._data.architecture_name = architecture.arch_conf[0].value;
      app._data.architecture_guide = e.guide;
      app._data.arch_code = JSON.stringify(
        register_value_serialize(cfg),
        null,
        2,
      );
      architecture_hash = [];
      for (i = 0; i < architecture.components.length; i++) {
        architecture_hash.push({
          name: architecture.components[i].name,
          index: i,
        });
        app._data.architecture_hash = architecture_hash;
      }
      backup_stack_address = architecture.memory_layout[4].value;
      backup_data_address = architecture.memory_layout[3].value;
      if (load_associated_examples && typeof e.examples !== "undefined") {
        uielto_preload_architecture.methods.load_examples_available();
      }
      instructions = [];
      app._data.instructions = instructions;
      creator_memory_clear();
      uielto_toolbar_btngroup.methods.change_UI_mode("simulator");
      uielto_data_view_selector.methods.change_data_view("int_registers");
      app._data.render++;
      var aux_object = jQuery.extend(true, {}, architecture);
      var aux_architecture = register_value_serialize(aux_object);
      var aux_arch = JSON.stringify(aux_architecture, null, 2);
    },
    load_examples_available(set_name) {
      example_set_available = [];
      example_available = [];
      uielto_preload_architecture.data.example_loaded = new Promise(function (
        resolve,
        reject,
      ) {
        $.ajaxSetup({ async: false });
        $.getJSON(
          "examples/example_set.json" + "?v=" + new Date().getTime(),
          function (set) {
            if (
              typeof uielto_preload_architecture.data.architecture_name ===
              "undefined"
            ) {
              var current_architecture =
                architecture.arch_conf[0].value.toUpperCase();
            } else {
              var current_architecture =
                uielto_preload_architecture.data.architecture_name.toUpperCase();
            }
            for (var i = 0; i < set.length; i++) {
              if (
                current_architecture != "" &&
                set[i].architecture.toUpperCase() != current_architecture
              ) {
                continue;
              }
              if (typeof set_name !== "undefined" && set_name == set[i].id) {
                uielto_examples.methods.change_example_set(
                  example_set_available.length,
                );
              }
              example_set_available.push({
                text: set[i].id,
                value: example_set_available.length,
              });
              $.ajaxSetup({ async: false });
              if (current_architecture == "") {
                $.getJSON(
                  "architecture/" + set[i].architecture + ".json",
                  function (cfg) {
                    uielto_preload_architecture.methods.load_arch_select_aux(
                      cfg,
                      false,
                      null,
                    );
                  },
                );
              }
              $.getJSON(set[i].url, function (cfg) {
                example_available[example_available.length] = cfg;
                resolve("Example list loaded.");
              });
            }
            app._data.example_set_available = example_set_available;
            app._data.example_available = example_available;
            if (example_set_available.length === 0) {
              reject("Unavailable example list.");
            }
          },
        );
      });
    },
    change_background(name, type) {
      if (type === 1) {
        for (var i = 0; i < this._props.back_card.length; i++) {
          if (name == this._props.back_card[i].name) {
            this._props.back_card[i].background = "secondary";
          } else {
            this._props.back_card[i].background = "default";
          }
        }
      }
      if (type === 0) {
        for (var i = 0; i < back_card.length; i++) {
          this._props.back_card[i].background = "default";
        }
      }
    },
    modal_remove_cache_arch(index, elem, button) {
      app._data.modal_delete_arch_index = index;
      this.$root.$emit("bv::show::modal", "modalDeletArch", button);
    },
    default_arch(item) {
      for (var i = 0; i < load_architectures_available.length; i++) {
        if (load_architectures_available[i].name == item) {
          return true;
        }
      }
      return false;
    },
  },
  template:
    '<b-card no-body class="overflow-hidden arch_card architectureCard" ' +
    '                @mouseover="change_background(item.name, 1)"' +
    '                @mouseout="change_background(item.name, 0)" ' +
    "                :border-variant=back_card[index].background" +
    '                v-if="item.available == 1">' +
    "  <b-row no-gutters>" +
    '    <b-col sm="12" @click="load_arch_select(item)" class="w-100">' +
    '      <b-card-img class="rounded-0"' +
    "                  :src=item.img" +
    "                  :alt=item.alt" +
    "                  thumbnail" +
    "                  fluid>" +
    "      </b-card-img>" +
    "    </b-col>" +
    " " +
    '    <b-col sm="12" @click="load_arch_select(item)"' +
    '                   v-if="default_arch(item.name) == false">' +
    "      <b-card-body :title=item.name" +
    '                   title-tag="h2">' +
    '        <b-card-text class="justify">' +
    "          {{item.description}}" +
    "        </b-card-text>" +
    "      </b-card-body>" +
    "    </b-col>" +
    " " +
    '    <b-col sm="12" @click="load_arch_select(item)"' +
    '                   v-if="default_arch(item.name) == true">' +
    "      <b-card-body :title=item.name" +
    '                   title-tag="h2">' +
    '        <b-card-text class="justify">' +
    "          {{item.description}}" +
    "        </b-card-text>" +
    "      </b-card-body>" +
    "    </b-col>" +
    " " +
    '    <b-col sm="12" class="center" v-if="default_arch(item.name) == true">' +
    '      <b-button class="m-2 w-75 btn btn-outline-danger btn-sm buttonBackground arch_delete" ' +
    '                @click.stop="modal_remove_cache_arch(index, item.name, $event.target)"' +
    '                v-if="default_arch(item.name) == true" ' +
    "                :id=\"'delete_'+item.name\">" +
    '        <span class="far fa-trash-alt"></span>' +
    "        Delete" +
    "      </b-button>" +
    "    </b-col>" +
    "  </b-row>" +
    "</b-card>",
};
Vue.component("preload-architecture", uielto_preload_architecture);
var uielto_new_architecture = {
  props: {},
  data: function () {
    return {};
  },
  methods: {
    new_arch() {
      show_loading();
      $.getJSON(
        "architecture/new_arch.json" + "?v=" + new Date().getTime(),
        function (cfg) {
          uielto_new_architecture.methods.load_arch_select_aux(cfg);
          hide_loading();
          show_notification(
            "New Architecture has been loaded correctly",
            "success",
          );
          creator_ga(
            "architecture",
            "architecture.loading",
            "architectures.loading.new_architecture",
          );
        },
      ).fail(function () {
        hide_loading();
        show_notification(
          "New Architecture is not currently available",
          "info",
        );
      });
    },
    load_arch_select_aux(cfg) {
      var aux_architecture = cfg;
      architecture = register_value_deserialize(aux_architecture);
      architecture_json = "new_arch";
      uielto_preload_architecture.data.architecture_name =
        architecture.arch_conf[0].value;
      app._data.architecture = architecture;
      app._data.architecture_name = architecture.arch_conf[0].value;
      app._data.architecture_guide = "";
      architecture_hash = [];
      for (i = 0; i < architecture.components.length; i++) {
        architecture_hash.push({
          name: architecture.components[i].name,
          index: i,
        });
        app._data.architecture_hash = architecture_hash;
      }
      backup_stack_address = architecture.memory_layout[4].value;
      backup_data_address = architecture.memory_layout[3].value;
      instructions = [];
      app._data.instructions = instructions;
      creator_memory_clear();
      uielto_toolbar_btngroup.methods.change_UI_mode("simulator");
      uielto_data_view_selector.methods.change_data_view("int_registers");
      app._data.render++;
    },
  },
  template:
    '<b-card no-body class="overflow-hidden arch_card architectureCard">' +
    "  <b-row no-gutters" +
    '         @click="new_arch">' +
    '    <b-col sm="12" class="center w-100 my-2">' +
    '      <b-card-img src="./images/new_icon.png" ' +
    '                  alt="new icon" ' +
    "                  thumbnail fluid" +
    '                  class="w-75 rounded-0 architectureImg">' +
    "      </b-card-img>" +
    "    </b-col>" +
    "" +
    '    <b-col sm="12">' +
    '      <b-card-body title="New Architecture"' +
    '                   title-tag="h2" >' +
    '        <b-card-text class="justify">' +
    "          Allows you to define an architecture from scratch." +
    "        </b-card-text>" +
    "      </b-card-body>" +
    "    </b-col>" +
    "  </b-row>" +
    "</b-card>",
};
Vue.component("new-architecture", uielto_new_architecture);
var uielto_load_architecture = {
  props: {},
  data: function () {
    return {
      name_arch: "",
      description_arch: "",
      load_arch: "",
      show_modal: false,
    };
  },
  methods: {
    read_arch(e) {
      show_loading();
      e.preventDefault();
      if (!this.name_arch || !this.load_arch) {
        hide_loading();
        show_notification("Please complete all fields", "danger");
        return;
      }
      this.show_modal = false;
      var file;
      var reader;
      var files = document.getElementById("arch_file").files;
      for (var i = 0; i < files.length; i++) {
        file = files[i];
        reader = new FileReader();
        reader.onloadend = (function (name_arch, description_arch) {
          return function (e) {
            architecture_available.push({
              name: name_arch,
              img: "./images/personalized_logo.png",
              alt: name_arch + " logo",
              id: "select_conf" + name_arch,
              description: description_arch,
              available: 1,
            });
            load_architectures_available.push({
              name: name_arch,
              img: "./images/personalized_logo.png",
              alt: name_arch + " logo",
              id: "select_conf" + name_arch,
              description: description_arch,
              available: 1,
            });
            back_card.push({
              name: architecture_available[architecture_available.length - 1]
                .name,
              background: "default",
            });
            load_architectures.push({
              id: name_arch,
              architecture: event.currentTarget.result,
            });
            if (typeof Storage !== "undefined") {
              var auxArch = JSON.stringify(load_architectures, null, 2);
              localStorage.setItem("load_architectures", auxArch);
              auxArch = JSON.stringify(load_architectures_available, null, 2);
              localStorage.setItem("load_architectures_available", auxArch);
            }
            show_notification(
              "The selected architecture has been loaded correctly",
              "success",
            );
            hide_loading();
          };
        })(this.name_arch, this.description_arch);
        reader.readAsBinaryString(file);
      }
      this.name_arch = "";
      this.description_arch = "";
      this.load_arch = "";
    },
    valid(value) {
      if (parseInt(value) !== 0) {
        if (!value) {
          return false;
        } else {
          return true;
        }
      } else {
        return true;
      }
    },
  },
  template:
    '<b-card no-body class="overflow-hidden arch_card architectureCard" ' +
    "        v-b-modal.load_arch>" +
    "  <b-row no-gutters>" +
    '    <b-col sm="12" class="center w-100 my-2">' +
    '      <b-card-img src="./images/load_icon.png" ' +
    '                  alt="load icon"' +
    '                  class="w-75 rounded-0 architectureImg">' +
    "      </b-card-img>" +
    "    </b-col>" +
    " " +
    '    <b-col sm="12">' +
    '      <b-card-body title="Load Architecture"' +
    '                   title-tag="h2">' +
    '        <b-card-text class="justify">' +
    "          Allows to load the definition of an already created architecture." +
    "        </b-card-text>" +
    "      </b-card-body>" +
    "    </b-col>" +
    "  </b-row>" +
    " " +
    '  <b-modal id="load_arch"' +
    '           title="Load Architecture"' +
    '           v-model="show_modal"' +
    '           @ok="read_arch">' +
    "    <b-form>" +
    '      <b-form-input v-model="name_arch" ' +
    '                    placeholder="Enter the name of the architecture" ' +
    '                    :state="valid(name_arch)" ' +
    '                    title="Architecture Name">' +
    "      </b-form-input>" +
    "      <br>" +
    '      <b-form-textarea v-model="description_arch" ' +
    '                       placeholder="Enter a description of the architecture" ' +
    '                       rows="3" ' +
    '                       title="Architecture Description">' +
    "      </b-form-textarea>" +
    "      <br>" +
    '      <b-form-file v-model="load_arch" ' +
    '                   placeholder="Choose a file..." ' +
    '                   id="arch_file" ' +
    '                   accept=".json" ' +
    '                   :state="valid(load_arch)">' +
    "      </b-form-file>" +
    "    </b-form>" +
    "  </b-modal>" +
    " " +
    "</b-card>",
};
Vue.component("load-architecture", uielto_load_architecture);
var uielto_delete_architecture = {
  props: {
    id: { type: String, required: true },
    index: { type: Number, required: true },
  },
  data: function () {
    return {};
  },
  methods: {
    remove_cache_arch(index) {
      var id = architecture_available[index].name;
      for (var i = 0; i < load_architectures.length; i++) {
        if (load_architectures[i].id == id) {
          load_architectures.splice(i, 1);
        }
      }
      for (var i = 0; i < load_architectures_available.length; i++) {
        if (load_architectures_available[i].name == id) {
          load_architectures_available.splice(i, 1);
        }
      }
      architecture_available.splice(index, 1);
      var aux_arch = JSON.stringify(load_architectures, null, 2);
      localStorage.setItem("load_architectures", aux_arch);
      aux_arch = JSON.stringify(load_architectures_available, null, 2);
      localStorage.setItem("load_architectures_available", aux_arch);
      show_notification("Architecture deleted successfully", "success");
    },
  },
  template:
    ' <b-modal :id ="id" ' +
    '          title="Delete Architecture" ' +
    '          ok-variant="danger" ' +
    '          ok-title="Delete" ' +
    '          @ok="remove_cache_arch(index)">' +
    '   <span class="h6">' +
    "     Are you sure you want to delete the architecture?" +
    "   </span>" +
    " </b-modal >",
};
Vue.component("delete-architecture", uielto_delete_architecture);
var uielto_backup = {
  props: { id: { type: String, required: true } },
  data: function () {
    return {
      show_modal: false,
      backup_date: localStorage.getItem("backup_date"),
      backup_arch_name: localStorage.getItem("backup_arch_name"),
    };
  },
  methods: {
    backup_modal(env) {
      if (typeof Storage !== "undefined") {
        if (
          localStorage.getItem("backup_arch") != null &&
          localStorage.getItem("backup_asm") != null &&
          localStorage.getItem("backup_date") != null
        ) {
          env.$root.$emit("bv::show::modal", "copy");
        }
      }
    },
    load_copy() {
      var aux_architecture = JSON.parse(localStorage.getItem("backup_arch"));
      architecture = register_value_deserialize(aux_architecture);
      app._data.architecture_name = localStorage.getItem("backup_arch_name");
      Object.assign(app._data.architecture, architecture);
      architecture_hash = [];
      for (var i = 0; i < architecture.components.length; i++) {
        architecture_hash.push({
          name: architecture.components[i].name,
          index: i,
        });
        app._data.architecture_hash = architecture_hash;
      }
      backup_stack_address = architecture.memory_layout[4].value;
      backup_data_address = architecture.memory_layout[3].value;
      for (var i = 0; i < app._data.arch_available.length; i++) {
        if (app._data.arch_available[i].name === app._data.architecture_name) {
          app._data.architecture_guide = app._data.arch_available[i].guide;
          uielto_preload_architecture.methods.load_examples_available(
            app._data.arch_available[i].examples[0],
          );
        }
      }
      code_assembly = localStorage.getItem("backup_asm");
      uielto_toolbar_btngroup.methods.reset(false);
      uielto_toolbar_btngroup.methods.change_UI_mode("simulator");
      uielto_data_view_selector.methods.change_data_view("int_registers");
      show_notification("The backup has been loaded correctly", "success");
      this.show_modal = false;
    },
    remove_copy() {
      localStorage.removeItem("backup_arch_name");
      localStorage.removeItem("backup_arch");
      localStorage.removeItem("backup_asm");
      localStorage.removeItem("backup_date");
      this.show_modal = false;
    },
  },
  template:
    '<b-modal :id="id"' +
    '         v-model="show_modal"' +
    "         hide-footer " +
    "         hide-header" +
    '         size="sm" centered>' +
    '  <span class="h6">' +
    "    A {{backup_arch_name}} backup is available." +
    "  </span>" +
    "  <br>" +
    '  <span class="h6">' +
    "    Date: {{backup_date}}" +
    "  </span>" +
    " " +
    '  <b-container fluid align-h="center" class="mx-0 px-0">' +
    '    <b-row cols-xl="2" cols-lg="2" cols-md="2" cols-sm="1" cols-xs="1" cols="1" align-h="center">' +
    "      <b-col>" +
    '        <b-button class="btn btn-outline-danger btn-block btn-sm buttonBackground" ' +
    '                  @click="remove_copy">' +
    "          Discard" +
    "        </b-button>" +
    "      </b-col>" +
    " " +
    "      <b-col>" +
    '        <b-button class="btn btn-outline-primary btn-block btn-sm buttonBackground" ' +
    '                  @click="load_copy">' +
    "          Load" +
    "        </b-button>" +
    "      </b-col>" +
    "    </b-row>" +
    "  </b-container>" +
    "</b-modal>",
};
Vue.component("uielto-backup", uielto_backup);
var uielto_edit_architecture = {
  props: {
    id: { type: String, required: true },
    arch_code: { type: String, required: true },
  },
  data: function () {
    return {};
  },
  methods: {
    load_codemirror() {
      setTimeout(function () {
        architecture_codemirror_start();
        if (codemirrorHistory != null) {
          textarea_arch_editor.setHistory(codemirrorHistory);
          textarea_arch_editor.undo();
        }
        textarea_arch_editor.setValue(app._data.arch_code);
      }, 50);
    },
    arch_edit_codemirror_save() {
      app._data.arch_code = textarea_arch_editor.getValue();
      arch_code = textarea_arch_editor.getValue();
      codemirrorHistory = textarea_arch_editor.getHistory();
      textarea_arch_editor.toTextArea();
    },
    arch_edit_save() {
      app._data.arch_code = textarea_arch_editor.getValue();
      arch_code = textarea_arch_editor.getValue();
      try {
        var aux_architecture = JSON.parse(app._data.arch_code);
      } catch (e) {
        show_notification(
          "Architecture not edited. JSON format is incorrect",
          "danger",
        );
        return;
      }
      architecture = register_value_deserialize(aux_architecture);
      uielto_preload_architecture.data.architecture_name =
        architecture.arch_conf[0].value;
      app._data.architecture = architecture;
      app._data.architecture_name = architecture.arch_conf[0].value;
      architecture_hash = [];
      for (i = 0; i < architecture.components.length; i++) {
        architecture_hash.push({
          name: architecture.components[i].name,
          index: i,
        });
        app._data.architecture_hash = architecture_hash;
      }
      backup_stack_address = architecture.memory_layout[4].value;
      backup_data_address = architecture.memory_layout[3].value;
      instructions = [];
      app._data.instructions = instructions;
      creator_memory_clear();
      show_notification("Architecture edited correctly", "success");
    },
  },
  template:
    '<b-modal  :id ="id" ' +
    '          size="xl" ' +
    '          title = "Edit Architecture" ' +
    '          ok-title="Save" ' +
    '          @ok="arch_edit_save" ' +
    '          @show="load_codemirror" ' +
    '          @hidden="arch_edit_codemirror_save"> ' +
    '   <textarea id="textarea_architecture" rows="14" class="code-scroll-y d-none" title="Architecture Definition"></textarea> ' +
    "</b-modal>",
};
Vue.component("edit-architecture", uielto_edit_architecture);
var uielto_save_architecture = {
  props: { id: { type: String, required: true } },
  data: function () {
    return { name_arch_save: "" };
  },
  methods: {
    arch_save() {
      var aux_object = jQuery.extend(true, {}, architecture);
      var aux_architecture = register_value_serialize(aux_object);
      aux_architecture.components.forEach((c, i) => {
        c.elements.forEach((e, j) => {
          if (e.default_value) e.value = e.default_value;
          else e.value = 0;
        });
      });
      var text_2_write = JSON.stringify(aux_architecture, null, 2);
      var textFileAsBlob = new Blob([text_2_write], { type: "text/json" });
      var file_name;
      if (this.name_arch_save == "") {
        file_name = "architecture.json";
      } else {
        file_name = this.name_arch_save + ".json";
      }
      var download_link = document.createElement("a");
      download_link.download = file_name;
      download_link.innerHTML = "My Hidden Link";
      window.URL = window.URL || window.webkitURL;
      download_link.href = window.URL.createObjectURL(textFileAsBlob);
      download_link.onclick = destroyClickedElement;
      download_link.style.display = "none";
      document.body.appendChild(download_link);
      download_link.click();
      var name_arch = file_name.replace(".json", "");
      load_architectures_available.push({
        name: name_arch,
        img: "./images/personalized_logo.png",
        alt: name_arch + " logo",
        id: "select_conf" + name_arch,
        description: architecture.arch_conf[2].value,
        available: 1,
      });
      load_architectures.push({ id: name_arch, architecture: text_2_write });
      if (typeof Storage !== "undefined") {
        var auxArch = JSON.stringify(load_architectures, null, 2);
        localStorage.setItem("load_architectures", auxArch);
        auxArch = JSON.stringify(load_architectures_available, null, 2);
        localStorage.setItem("load_architectures_available", auxArch);
      }
      show_notification("Save architecture", "success");
    },
    clean_form() {
      this.name_arch_save = "";
    },
  },
  template:
    '<b-modal  :id ="id" ' +
    '          title = "Save Architecture" ' +
    '          ok-title="Save to File" ' +
    '          @ok="arch_save"' +
    '          @hidden="clean_form">' +
    '  <span class="h6">Enter the name of the architecture to save:</span>' +
    "  <br>" +
    '  <b-form-input v-model="name_arch_save" ' +
    '                type="text" ' +
    '                placeholder="Enter the name" ' +
    '                class="form-control form-control-sm fileForm" ' +
    '                title="Save Architecture">' +
    "  </b-form-input>" +
    "</b-modal>",
};
Vue.component("save-architecture", uielto_save_architecture);
var uielto_arch_conf = {
  props: { arch_conf: { type: Array, required: true } },
  data: function () {
    return { arch_fields: ["field", "value"] };
  },
  methods: {},
  template:
    '<div class="col-lg-12 col-sm-12 row memoryLayoutDiv mx-0 px-0">' +
    "" +
    '  <div class="col-lg-3 col-sm-12 "></div>' +
    "" +
    "  \x3c!-- Architecture configuration table --\x3e" +
    '  <div class="col-lg-12 col-sm-12 mt-3">' +
    '    <b-table small :items="arch_conf" ' +
    '             :fields="arch_fields" ' +
    '             class="text-center" ' +
    '             sticky-header="60vh"> ' +
    "" +
    "      \x3c!-- For each instruction --\x3e" +
    "" +
    '      <template v-slot:cell(field)="row">' +
    "        <span>{{row.item.name}}</span>" +
    "      </template>" +
    "" +
    '      <template v-slot:cell(value)="row">' +
    "        <span v-if=\"row.item.name == 'Name' || row.item.name == 'Bits' || row.item.name == 'Description' || row.item.name == 'Main Function'\">" +
    "          {{row.item.value}}" +
    "        </span>" +
    "        <span v-if=\"row.item.value == 'big_endian'\">" +
    "          Big Endian" +
    "        </span>" +
    "        <span v-if=\"row.item.value == 'little_endian'\">" +
    "          Little Endian" +
    "        </span>" +
    "        <span v-if=\"row.item.value == '0'\">" +
    "          Disabled" +
    "        </span>" +
    "        <span v-if=\"row.item.value == '1'\">" +
    "          Enabled" +
    "        </span>" +
    "      </template>" +
    "    </b-table>" +
    "  </div> " +
    "" +
    '  <div class="col-lg-3 col-sm-12 "></div>' +
    "" +
    "</div>",
};
Vue.component("arch-conf", uielto_arch_conf);
var uielto_memory_layout = {
  props: { memory_layout: { type: Array, required: true } },
  data: function () {
    return {};
  },
  methods: {},
  template:
    '<div class="col-lg-12 col-sm-12 row memoryLayoutDiv  mx-0 px-0">' +
    "" +
    '  <div class="col-lg-3 col-sm-12 "></div>' +
    "" +
    "  \x3c!-- Memory layout sketch --\x3e" +
    '  <div class="col-lg-6 col-sm-12 ">' +
    '    <b-list-group class="memoryLayout">' +
    "      <b-list-group horizontal>" +
    '        <b-list-group-item variant="info" class="memoryLayout">' +
    "          <br>" +
    "          .text" +
    "          <br>" +
    "          <br>" +
    "        </b-list-group-item>" +
    '        <b-list-group-item class="memoryLayout noBorder left">' +
    '          <span class="h6" v-if="memory_layout.length > 0">' +
    "            {{memory_layout[0].value}}" +
    "          </span>" +
    "          <br>" +
    "          <br>" +
    '          <span class="h6" v-if="memory_layout.length > 0">' +
    "            {{memory_layout[1].value}}" +
    "          </span>" +
    "        </b-list-group-item>" +
    "      </b-list-group>" +
    "" +
    "      <b-list-group horizontal>" +
    '        <b-list-group-item variant="warning" class="memoryLayout">' +
    "          <br>" +
    "          .data" +
    "          <br>" +
    "          <br>" +
    "        </b-list-group-item>" +
    '        <b-list-group-item class="memoryLayout noBorder left">' +
    '          <span class="h6" v-if="memory_layout.length > 0">' +
    "            {{memory_layout[2].value}}" +
    "          </span>" +
    "          <br>" +
    "          <br>" +
    '          <span class="h6" v-if="memory_layout.length > 0">' +
    "            {{memory_layout[3].value}}" +
    "          </span>" +
    "        </b-list-group-item>" +
    "      </b-list-group>" +
    "" +
    "      <b-list-group horizontal>" +
    '        <b-list-group-item variant="secondary" class="memoryLayout">' +
    "          <br>" +
    "          ..." +
    "          <br>" +
    "          <br>" +
    "        </b-list-group-item>" +
    '        <b-list-group-item class="memoryLayout noBorder">' +
    "          " +
    "        </b-list-group-item>" +
    "      </b-list-group>" +
    "" +
    "      <b-list-group horizontal>" +
    '        <b-list-group-item variant="success" class="memoryLayout">' +
    "          <br>" +
    "          stack" +
    "          <br>" +
    "          <br>" +
    "        </b-list-group-item>" +
    '        <b-list-group-item class="memoryLayout noBorder left">' +
    '          <span class="h6" v-if="memory_layout.length > 0">' +
    "            {{memory_layout[4].value}}" +
    "          </span>" +
    "          <br>" +
    "          <br>" +
    '          <span class="h6" v-if="memory_layout.length > 0">' +
    "            {{memory_layout[5].value}}" +
    "          </span>" +
    "        </b-list-group-item>" +
    "      </b-list-group>" +
    "    </b-list-group>" +
    "  </div>" +
    "" +
    '  <div class="col-lg-3 col-sm-12 "></div>' +
    "" +
    "</div>",
};
Vue.component("memory-layout", uielto_memory_layout);
var uielto_register_file = {
  props: { register_file: { type: Array, required: true } },
  data: function () {
    return {};
  },
  methods: {},
  template:
    "<div>" +
    "  \x3c!-- Register File table --\x3e" +
    '  <div class="col-lg-12 col-sm-12 p-0">' +
    "    <br>" +
    '    <div class="col-lg-12 col-sm-12 px-0" v-for="(item, index) in register_file">' +
    "" +
    "      \x3c!-- For each register file --\x3e" +
    '      <b-card no-body class="mb-1">' +
    '        <b-card-header header-tag="header" class="p-1" role="tab">' +
    '          <b-btn block href="#" ' +
    '                 v-b-toggle="index.toString()" ' +
    '                 class="btn btn-outline-secondary btn-sm buttonBackground">' +
    "            {{item.name}}" +
    "          </b-btn>" +
    "        </b-card-header>" +
    '        <b-collapse :id="index.toString()"' +
    '                    visible accordion="my-accordion" ' +
    '                    role="tabpanel" ' +
    '                    class="architecture-scroll-y">' +
    "          <b-card-body>" +
    "" +
    '            <registers  :registers="architecture.components[index].elements"' +
    '                        :register_file_index="index">' +
    "            </registers>" +
    "" +
    "          </b-card-body>" +
    "        </b-collapse>" +
    "      </b-card>" +
    "    </div>" +
    "  </div>" +
    "</div>",
};
Vue.component("register-file-arch", uielto_register_file);
var uielto_registers = {
  props: {
    registers: { type: Array, required: true },
    register_file_index: { type: Number, required: true },
  },
  data: function () {
    return {
      registers_fields: ["name", "ID", "nbits", "default_value", "properties"],
    };
  },
  methods: {
    element_id(name, type, double) {
      var id = 0;
      for (var i = 0; i < architecture.components.length; i++) {
        for (var j = 0; j < architecture.components[i].elements.length; j++) {
          if (architecture.components[i].elements[j].name == name) {
            return id;
          }
          if (
            architecture.components[i].type == type &&
            architecture.components[i].double_precision == double
          ) {
            id++;
          }
        }
      }
    },
  },
  template:
    '<b-table  :items="registers" ' +
    '          class="text-center" ' +
    '          :fields="registers_fields" ' +
    '          v-if="registers.length > 0" ' +
    "          sticky-header>" +
    "" +
    "  \x3c!-- For each register --\x3e" +
    "" +
    '  <template v-slot:cell(name)="row">' +
    "    {{registers[row.index].name.join(' | ')}}" +
    "  </template>" +
    "" +
    '  <template v-slot:cell(ID)="row">' +
    "    {{element_id(registers[row.index].name, architecture.components[register_file_index].type, architecture.components[register_file_index].double_precision)}}" +
    "  </template>" +
    "" +
    '  <template v-slot:cell(properties)="row">' +
    '    <b-badge class="m-1" v-for="propertie in registers[row.index].properties" pill variant="primary">{{propertie}}</b-badge>' +
    "  </template>" +
    "</b-table>",
};
Vue.component("registers", uielto_registers);
var uielto_instructions = {
  props: { instructions: { type: Array, required: true } },
  data: function () {
    return {
      instructions_fields: [
        "name",
        "co",
        "cop",
        "nwords",
        "signatureRaw",
        "properties",
        "clk_cycles",
        "fields",
        "definition",
      ],
    };
  },
  methods: {
    view_instructions_modal(name, index, button) {
      app._data.modal_field_instruction.title = "Fields of " + name;
      app._data.modal_field_instruction.index = index;
      app._data.modal_field_instruction.instruction = structuredClone(
        architecture.instructions[index],
      );
      this.$root.$emit("bv::show::modal", "fields_instructions", button);
    },
  },
  template:
    "<div>" +
    "  \x3c!-- Instruction set table --\x3e" +
    '  <div class="col-lg-12 col-sm-12 mt-3">' +
    '    <b-table small :items="instructions" ' +
    '             :fields="instructions_fields" ' +
    '             class="text-center" ' +
    '             sticky-header="60vh"> ' +
    "" +
    "      \x3c!-- Change the title of each column --\x3e" +
    '      <template v-slot:head(cop)="row">' +
    "        Extended CO" +
    "      </template>" +
    "" +
    '      <template v-slot:head(signatureRaw)="row">' +
    "        Instruction syntax" +
    "      </template>" +
    "" +
    "      \x3c!-- For each instruction --\x3e" +
    "" +
    '      <template v-slot:cell(properties)="row">' +
    '        <b-badge class="m-1" v-for="propertie in row.item.properties" pill variant="primary">{{propertie}}</b-badge>' +
    "      </template>" +
    "" +
    '      <template v-slot:cell(signatureRaw)="row">' +
    "          {{row.item.signatureRaw}}" +
    "          <br>" +
    "          {{row.item.signature}}" +
    "      </template>" +
    "" +
    '      <template v-slot:cell(fields)="row">' +
    '        <b-button @click.stop="view_instructions_modal(row.item.name, row.index, $event.target)" ' +
    '                  class="btn btn-outline-secondary btn-sm buttonBackground h-100">' +
    "          View Fields" +
    "        </b-button>" +
    "      </template>" +
    "" +
    '      <template v-slot:cell(definition)="row">' +
    '        <b-form-textarea v-model="row.item.definition" ' +
    "                         disabled " +
    "                         no-resize " +
    '                         rows="1" ' +
    '                         max-rows="4"' +
    '                         title="Instruction Definition">' +
    "        </b-form-textarea>" +
    "      </template>" +
    "    </b-table>" +
    "  </div> " +
    "</div>",
};
Vue.component("instructions", uielto_instructions);
var uielto_instructions_fields = {
  props: {
    id: { type: String, required: true },
    title: { type: String, required: true },
    index: { type: Number, required: true },
    instruction: { type: Object, required: true },
  },
  data: function () {
    return {
      fragmet_data: [
        "inm-signed",
        "inm-unsigned",
        "address",
        "offset_bytes",
        "offset_words",
      ],
    };
  },
  methods: {},
  template:
    '<b-modal :id ="id" ' +
    '         size="lg" ' +
    '         :title="title" ' +
    "         hide-footer>" +
    "  <b-form>" +
    '    <div id="viewFields" >' +
    '      <div class="col-lg-14 col-sm-14 row">' +
    '        <div class="col-lg-1 col-1 fields">' +
    "          " +
    "        </div>" +
    '        <div class="col-lg-2 col-2 fields">' +
    '          <span class="h6">Name:</span>' +
    "        </div>" +
    '        <div class="col-lg-2 col-2 fields">' +
    '          <span class="h6">Type</span>' +
    "        </div>" +
    '          <div class="col-lg-1 col-1 fields">' +
    '            <span class="h6">Break</span>' +
    "          </div>" +
    '        <div class="col-lg-2 col-2 fields">' +
    '          <span class="h6">Start Bit</span>' +
    "        </div>" +
    '        <div class="col-lg-2 col-2 fields">' +
    '          <span class="h6">End Bit</span>' +
    "        </div>" +
    '        <div class="col-lg-2 col-2 fields">' +
    '          <span class="h6">Value</span>' +
    "        </div>" +
    "      </div>" +
    "" +
    "      <div>" +
    '        <div v-for="(item, field_index) in instruction.fields">' +
    '          <div class="col-lg-14 col-sm-14 row">' +
    '            <div class="col-lg-1 col-1 fields">' +
    '              <span class="h6">Field {{field_index}}</span>' +
    "            </div>" +
    '            <div class="col-lg-2 col-2 fields">' +
    "              <b-form-group>" +
    '                <b-form-input type="text" ' +
    '                              v-model="instruction.fields[field_index].name" ' +
    "                              required " +
    '                              size="sm" ' +
    '                              v-if="(field_index) != 0" ' +
    "                              disabled " +
    '                              title="Field name">' +
    "                </b-form-input>" +
    '                <b-form-input type="text" ' +
    '                              v-model="instruction.fields[field_index].name = instruction.name" ' +
    "                              required " +
    '                              size="sm" ' +
    '                              v-if="(field_index) == 0"  ' +
    "                              disabled " +
    '                              title="Field name">' +
    "                </b-form-input>" +
    "              </b-form-group>" +
    "            </div>" +
    "" +
    '            <div class="col-lg-2 col-2 fields">' +
    "              <b-form-group>" +
    '                <b-form-input type="text" ' +
    '                              v-model="instruction.fields[field_index].type" ' +
    "                              required " +
    '                              size="sm" ' +
    "                              disabled " +
    '                              title="Field type">' +
    "                </b-form-input>" +
    "              </b-form-group>" +
    "            </div>" +
    '            <div class="col-lg-1 col-1 fields"' +
    "                 v-if=\"typeof(instruction.separated) !== 'undefined'\">" +
    "                <b-form-checkbox :id=\"'view-fragment-'+ i\"" +
    '                                 v-model="instruction.separated[field_index]"' +
    '                                 v-if="fragmet_data.indexOf(instruction.separated[field_index]) !== -1"' +
    '                                 class="ml-3"' +
    "                                 disabled>" +
    "            </div>" +
    "" +
    "            \x3c!-- start bit description --\x3e" +
    '            <div class="col-lg-2 col-2 fields">' +
    "              <b-form-group>" +
    '                <b-form-input v-model="true"' +
    '                              type="number"' +
    '                              min="0"' +
    '                              :max="32 * instruction.nwords - 1"' +
    '                              v-model="instruction.fields[field_index].startbit"' +
    "                              required " +
    '                              size="sm"' +
    "                              disabled" +
    "                              v-if=\"typeof(instruction.fields[field_index].startbit) !== 'object'\"" +
    '                              title="Field start bit">' +
    "                </b-form-input>" +
    "                <b-form-input v-else " +
    '                              v-for="(j, ind) in instruction.fields[field_index].startbit"' +
    '                              type="number" ' +
    '                              min="0" ' +
    '                              :max="32 * instruction.nwords - 1"' +
    '                              v-model="instruction.fields[field_index].startbit[ind]" ' +
    "                              required" +
    '                              class="mb-2"' +
    "                              disabled" +
    '                              title="Field start bit">' +
    "              </b-form-group>" +
    "            </div>" +
    "" +
    "            \x3c!-- stop bit description --\x3e" +
    '            <div class="col-lg-2 col-2 fields">' +
    "              <b-form-group>" +
    '                <b-form-input type="number"' +
    '                              min="0"' +
    '                              :max="32 * instruction.nwords - 1"' +
    '                              v-model="instruction.fields[field_index].stopbit"' +
    "                              required" +
    '                              size="sm"' +
    "                              disabled" +
    "                              v-if=\"typeof(instruction.fields[field_index].stopbit) !== 'object'\"" +
    '                              title="Field end bit">' +
    "                </b-form-input>" +
    '                <b-form-input v-else v-for="(j, ind) in instruction.fields[field_index].stopbit"' +
    '                              type="number" min="0" :max="32 * instruction.nwords - 1"' +
    '                              v-model="instruction.fields[field_index].stopbit[ind]"' +
    "                              required" +
    '                              class="mb-2"' +
    "                              disabled" +
    '                              title="Field end bit">' +
    "                </b-form-input>" +
    "                " +
    "              </b-form-group>" +
    "            </div>" +
    "" +
    '            <div class="col-lg-2 col-2 fields" v-if="instruction.fields[field_index].type == \'co\'">' +
    "              <b-form-group>" +
    '                <b-form-input type="text" ' +
    '                              v-model="instruction.co" ' +
    "                              required " +
    '                              size="sm" ' +
    "                              disabled " +
    '                              title="Instruction CO">' +
    "                </b-form-input>" +
    "              </b-form-group>" +
    "            </div>" +
    '            <div class="col-lg-2 col-2 fields" v-if="instruction.fields[field_index].type == \'cop\'">' +
    "              <b-form-group>" +
    '                <b-form-input type="text" ' +
    "                              v-on:input=\"debounce('instruction.fields[field_index].valueField', $event)\" " +
    '                              v-model="instruction.fields[field_index].valueField" ' +
    "                              required " +
    '                              size="sm" ' +
    "                              disabled " +
    '                              title="Field value">' +
    "                </b-form-input>" +
    "              </b-form-group>" +
    "            </div>" +
    "          </div>" +
    "        </div>" +
    "      </div>" +
    "    </div>" +
    "  </b-form>" +
    "</b-modal>",
};
Vue.component("instructions-fields", uielto_instructions_fields);
var uielto_pseudoinstructions = {
  props: { pseudoinstructions: { type: Array, required: true } },
  data: function () {
    return {
      pseudoinstructions_fields: [
        "name",
        "nwords",
        "signatureRaw",
        "fields",
        "definition",
      ],
    };
  },
  methods: {
    view_pseudoinstruction_modal(name, index, button) {
      app._data.modal_field_pseudoinstruction.title = "Fields of " + name;
      app._data.modal_field_pseudoinstruction.index = index;
      app._data.modal_field_pseudoinstruction.pseudoinstruction =
        structuredClone(architecture.pseudoinstructions[index]);
      this.$root.$emit("bv::show::modal", "fields_pseudoinstructions", button);
    },
  },
  template:
    "<div>" +
    "  \x3c!-- Pseudoinstruction set table --\x3e" +
    '  <div class="col-lg-12 col-sm-12 mt-3">' +
    "    <b-table small " +
    '             :items="pseudoinstructions" ' +
    '             :fields="pseudoinstructions_fields"' +
    '             class="text-center" ' +
    '             sticky-header="60vh">' +
    "" +
    "      \x3c!-- Change the title of each column --\x3e" +
    '      <template v-slot:head(signatureRaw)="row">' +
    "        Instruction syntax" +
    "      </template>" +
    "" +
    "      \x3c!-- For each pseudoinstruction --\x3e" +
    "" +
    '      <template v-slot:cell(signatureRaw)="row">' +
    "        {{row.item.signatureRaw}}" +
    "        <br>" +
    "        {{row.item.signature}}" +
    "      </template>" +
    "" +
    '      <template v-slot:cell(fields)="row">' +
    '        <b-button @click.stop="view_pseudoinstruction_modal(row.item.name, row.index, $event.target)" ' +
    '                  class="btn btn-outline-secondary btn-sm buttonBackground h-100">' +
    "          View Fields" +
    "        </b-button>" +
    "      </template>" +
    "" +
    '      <template v-slot:cell(definition)="row">' +
    '        <b-form-textarea v-model="row.item.definition" ' +
    "                         disabled " +
    "                         no-resize" +
    '                         rows="1" ' +
    '                         max-rows="4"' +
    '                         title="Pseudoinstruction Definition">' +
    "        </b-form-textarea>" +
    "      </template>" +
    "    </b-table>" +
    "  </div>" +
    "</div>",
};
Vue.component("pseudoinstructions", uielto_pseudoinstructions);
var uielto_pseudoinstructions_fields = {
  props: {
    id: { type: String, required: true },
    title: { type: String, required: true },
    index: { type: Number, required: true },
    pseudoinstruction: { type: Object, required: true },
  },
  data: function () {
    return {};
  },
  methods: {},
  template:
    '<b-modal :id ="id"' +
    '         size="lg"' +
    '         :title="title" ' +
    "         hide-footer>" +
    "  <b-form>" +
    '    <div id="viewFieldsPseudo">' +
    '      <div class="col-lg-12 col-sm-12 row">' +
    '        <div class="col-lg-4 col-4 fields">' +
    "" +
    "        </div>" +
    '        <div class="col-lg-4 col-4 fields">' +
    '          <span class="h6">Name:</span>' +
    "        </div>" +
    '        <div class="col-lg-4 col-4 fields">' +
    '          <span class="h6">Type</span>' +
    "        </div>" +
    "      </div>" +
    "" +
    "      <div>  " +
    '        <div v-for="(item, field_index) in pseudoinstruction.fields">' +
    '          <div class="col-lg-12 col-sm-12 row">' +
    '            <div class="col-lg-4 col-4 fields">' +
    '              <span class="h6">Field {{field_index}}</span>' +
    "            </div>" +
    '            <div class="col-lg-4 col-4 fields">' +
    "              <b-form-group>" +
    '                <b-form-input type="text" ' +
    '                              v-model="pseudoinstruction.fields[field_index].name" ' +
    "                              required " +
    '                              size="sm" ' +
    "                              disabled " +
    '                              title="Field name">' +
    "                </b-form-input>" +
    "              </b-form-group>" +
    "            </div>" +
    '            <div class="col-lg-4 col-4 fields">' +
    "              <b-form-group>" +
    '                <b-form-input v-model="pseudoinstruction.fields[field_index].type" ' +
    "                              required " +
    '                              type="text" ' +
    '                              size="sm" ' +
    "                              disabled " +
    '                              title="Field type">' +
    "                </b-form-input>" +
    "              </b-form-group>" +
    "            </div>" +
    "          </div>" +
    "        </div>" +
    "      </div>" +
    "    </div>" +
    "  </b-form>" +
    "</b-modal>",
};
Vue.component("pseudoinstructions-fields", uielto_pseudoinstructions_fields);
var uielto_directives = {
  props: { directives: { type: Array, required: true } },
  data: function () {
    return { directivesFields: ["name", "action", "size"] };
  },
  methods: {},
  template:
    "<div>" +
    '  <div class="col-lg-12 col-sm-12 mt-3">' +
    "    <b-table small " +
    '             :items="directives" ' +
    '             :fields="directivesFields" ' +
    '             class="text-center" ' +
    '             sticky-header="60vh">' +
    "    </b-table>" +
    "  </div>" +
    "</div>",
};
Vue.component("directives", uielto_directives);
var uielto_load_assembly = {
  props: { id: { type: String, required: true } },
  data: function () {
    return { load_assembly: "" };
  },
  methods: {
    assembly_update() {
      if (code_assembly != "") {
        textarea_assembly_editor.setValue(code_assembly);
        show_notification(
          " The selected program has been loaded correctly",
          "success",
        );
      } else {
        show_notification("Please select one program", "danger");
      }
    },
    read_assembly(e) {
      show_loading();
      var file;
      var reader;
      var files = document.getElementById("assembly_file").files;
      for (var i = 0; i < files.length; i++) {
        file = files[i];
        reader = new FileReader();
        reader.onloadend = onFileLoaded;
        reader.readAsBinaryString(file);
      }
      function onFileLoaded(event) {
        code_assembly = event.currentTarget.result;
      }
      hide_loading();
      creator_ga("assembly", "assembly.load", "assembly.load");
    },
  },
  template:
    ' <b-modal  :id = "id"' +
    '           title = "Load Assembly"' +
    '           ok-title="Load from this File"' +
    '           @ok="assembly_update">' +
    " " +
    "   <p> Please select the assembly file to be loaded </p> " +
    '   <b-form-file v-model="load_assembly"' +
    '                :state="Boolean(load_assembly)" ' +
    '                placeholder="Choose a file..." ' +
    '                accept=".s" ' +
    '                @change="read_assembly" ' +
    '                id="assembly_file">' +
    "   </b-form-file>" +
    " </b-modal>",
};
Vue.component("load-assembly", uielto_load_assembly);
var uielto_save_assembly = {
  props: { id: { type: String, required: true } },
  data: function () {
    return { save_assembly: "" };
  },
  methods: {
    assembly_save() {
      var textToWrite = textarea_assembly_editor.getValue();
      var textFileAsBlob = new Blob([textToWrite], { type: "text/plain" });
      var fileNameToSaveAs;
      if (this.save_assembly == "") {
        fileNameToSaveAs = "assembly.s";
      } else {
        fileNameToSaveAs = this.save_assembly + ".s";
      }
      var downloadLink = document.createElement("a");
      downloadLink.download = fileNameToSaveAs;
      downloadLink.innerHTML = "My Hidden Link";
      window.URL = window.URL || window.webkitURL;
      downloadLink.href = window.URL.createObjectURL(textFileAsBlob);
      downloadLink.onclick = destroyClickedElement;
      downloadLink.style.display = "none";
      document.body.appendChild(downloadLink);
      downloadLink.click();
      this.save_assembly = "";
      creator_ga("assembly", "assembly.save", "assembly.save");
    },
    debounce: _.debounce(function (param, e) {
      console_log(param);
      console_log(e);
      e.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      var re = new RegExp("'", "g");
      e = e.replace(re, '"');
      re = new RegExp("[\f]", "g");
      e = e.replace(re, "\\f");
      re = new RegExp("[\n]", "g");
      e = e.replace(re, "\\n");
      re = new RegExp("[\r]", "g");
      e = e.replace(re, "\\r");
      re = new RegExp("[\t]", "g");
      e = e.replace(re, "\\t");
      re = new RegExp("[\v]", "g");
      e = e.replace(re, "\\v");
      if (e == "") {
        this[param] = null;
        return;
      }
      console_log("this." + param + "= '" + e + "'");
      eval("this." + param + "= '" + e + "'");
      app.$forceUpdate();
    }, getDebounceTime()),
  },
  template:
    ' <b-modal  :id = "id"' +
    '           title = "Save Assembly" ' +
    '           ok-title="Save to File" ' +
    '           @ok="assembly_save">' +
    " " +
    "   <p> Please write the file name: </p> " +
    "   <b-form-input v-on:input=\"debounce('save_assembly', $event)\" " +
    '                 :value="save_assembly"' +
    '                 type="text"' +
    '                 placeholder="File name where assembly will be saved" ' +
    '                 title="File name">' +
    "   </b-form-input>" +
    " </b-modal>",
};
Vue.component("save-assembly", uielto_save_assembly);
function getDebounceTime() {
  if (screen.width > 768) {
    return 500;
  } else {
    return 1e3;
  }
}
var uielto_examples = {
  props: {
    id: { type: String, required: true },
    ref: { type: String, required: true },
    example_set_available: { type: Array, required: true },
    example_available: { type: Array, required: true },
    compile: { type: String, required: true },
    modal: { type: String, required: true },
  },
  data: function () {
    return { example_set: 0, example_set_name: "" };
  },
  methods: {
    get_example_set() {
      return this.example_set;
    },
    load_example(url, compile) {
      this.$root.$emit("bv::hide::modal", this._props.modal, "#closeExample");
      $.get(url, function (data) {
        code_assembly = data;
        if (compile == "false") {
          textarea_assembly_editor.setValue(code_assembly);
        } else {
          uielto_toolbar_btngroup.methods.assembly_compiler(code_assembly);
        }
        show_notification(
          " The selected example has been loaded correctly",
          "success",
        );
        creator_ga(
          "send",
          "event",
          "example",
          "example.loading",
          "example.loading." + url,
        );
      });
    },
    change_example_set(value) {
      this.example_set = value;
    },
  },
  template:
    ' <b-modal  :id="id"' +
    '           title="Examples"' +
    '           :ref="ref"' +
    "           hide-footer" +
    "           scrollable>" +
    " " +
    '   <b-form-group label="Examples set available:" v-if="example_set_available.length > 1" v-slot="{ ariaDescribedby }">' +
    "     <b-form-radio-group" +
    '       v-if="example_set_available.length <= 2"' +
    '       id="example_set"' +
    '       class="w-100"' +
    '       v-model="example_set"' +
    '       :options="example_set_available"' +
    '       button-variant="outline-secondary"' +
    '       size="sm"' +
    '       :aria-describedby="ariaDescribedby"' +
    '       name="radios-btn-default"' +
    "       buttons" +
    "     ></b-form-radio-group>" +
    "   </b-form-group>" +
    " " +
    '   <b-dropdown id="examples_dropdown"' +
    '               class="w-100 mb-3"' +
    '               size="sm"' +
    '               text="Examples set available"' +
    '               v-if="example_set_available.length > 2">' +
    '     <b-dropdown-item v-for="item in example_set_available"' +
    '                      @click="change_example_set(item.value)">' +
    "       {{item.text}}" +
    "     </b-dropdown-item>" +
    "   </b-dropdown>" +
    " " +
    '   <span class="h6" v-if="example_available.length == 0 || example_available[example_set].length == 0">' +
    "     There's no examples at the moment" +
    "   </span>" +
    " " +
    "   <b-list-group>" +
    "     <b-list-group-item button " +
    '                        v-for="item in example_available[example_set]" ' +
    '                        @click="load_example(item.url, compile)" ' +
    '                        ref="closeExample">' +
    "       {{item.name}}:" +
    '       <span v-html="item.description"></span>' +
    "     </b-list-group-item>" +
    "   </b-list-group>" +
    " </b-modal>",
};
Vue.component("examples", uielto_examples);
var uielto_uri = {
  props: { id: { type: String, required: true } },
  data: function () {
    return { uri: "" };
  },
  methods: {
    make_uri() {
      this.uri =
        window.location.href.split("?")[0].split("#")[0] +
        "?architecture=" +
        encodeURIComponent(app._data.architecture_name) +
        "&asm=" +
        encodeURIComponent(textarea_assembly_editor.getValue());
    },
    copy_uri() {
      navigator.clipboard.writeText(this.uri);
    },
  },
  template:
    '<b-modal  :id = "id"' +
    '          title = "URI" ' +
    "          hide-footer" +
    '          class="text-center"' +
    "          @shown=make_uri>" +
    " " +
    '  <div class="text-center">' +
    '    <b-form-textarea v-model="uri" :rows="5"></b-form-textarea> ' +
    "    <br> " +
    '    <b-button variant="info" @click="copy_uri()">' +
    '      <span class="fas fa-copy"></span> Copy' +
    "    </b-button>" +
    "  </div>" +
    "</b-modal>",
};
Vue.component("make-uri", uielto_uri);
var uielto_load_library = {
  props: { id: { type: String, required: true } },
  data: function () {
    return { name_binary_load: "" };
  },
  methods: {
    library_update() {
      if (code_binary.length !== 0) {
        update_binary = JSON.parse(code_binary);
        load_binary = true;
        $("#divAssembly").attr("class", "col-lg-10 col-sm-12");
        $("#divTags").attr("class", "col-lg-2 col-sm-12");
        $("#divTags").show();
        show_notification(
          "The selected library has been loaded correctly",
          "success",
        );
      } else {
        show_notification("Please select one library", "danger");
      }
    },
    library_load(e) {
      var file;
      var reader;
      var files = document.getElementById("binary_file").files;
      for (var i = 0; i < files.length; i++) {
        file = files[i];
        reader = new FileReader();
        reader.onloadend = onFileLoaded;
        reader.readAsBinaryString(file);
      }
      function onFileLoaded(event) {
        code_binary = event.currentTarget.result;
      }
    },
  },
  template:
    ' <b-modal  :id = "id"' +
    '           title = "Load Binary" ' +
    '           ok-title="Load from this File" ' +
    '           @ok="library_update">' +
    " " +
    "   <p> Please select the binary file to be loaded </p> " +
    '   <b-form-file v-model="name_binary_load" ' +
    '                :state="Boolean(name_binary_load)" ' +
    '                placeholder="Choose a file..." ' +
    '                accept=".o" ' +
    '                @change="library_load" ' +
    '                id="binary_file">' +
    "   </b-form-file>" +
    " </b-modal>",
};
Vue.component("load-library", uielto_load_library);
var uielto_save_library = {
  props: { id: { type: String, required: true } },
  data: function () {
    return { name_binary_save: "" };
  },
  methods: {
    library_save() {
      if (assembly_compiler() == -1) {
        return;
      }
      promise.then((message) => {
        if (message == "-1") {
          return;
        }
        if (creator_memory_is_segment_empty(memory_hash[0]) === false) {
          show_notification("You can not enter data in a library", "danger");
          return;
        }
        for (var i = 0; i < instructions_binary.length; i++) {
          console_log(instructions_binary[i].Label);
          if (instructions_binary[i].Label == "main_symbol") {
            show_notification(
              'You can not use the "main" tag in a library',
              "danger",
            );
            return;
          }
        }
        var aux = {
          instructions_binary: instructions_binary,
          instructions_tag: instructions_tag,
        };
        var textToWrite = JSON.stringify(aux, null, 2);
        var textFileAsBlob = new Blob([textToWrite], { type: "text/json" });
        var fileNameToSaveAs;
        if (this.name_binary_save == "") {
          fileNameToSaveAs = "binary.o";
        } else {
          fileNameToSaveAs = this.name_binary_save + ".o";
        }
        var downloadLink = document.createElement("a");
        downloadLink.download = fileNameToSaveAs;
        downloadLink.innerHTML = "My Hidden Link";
        window.URL = window.URL || window.webkitURL;
        downloadLink.href = window.URL.createObjectURL(textFileAsBlob);
        downloadLink.onclick = destroyClickedElement;
        downloadLink.style.display = "none";
        document.body.appendChild(downloadLink);
        downloadLink.click();
        this.name_binary_save = "";
        show_notification("Save binary", "success");
      });
    },
    debounce: _.debounce(function (param, e) {
      console_log(param);
      console_log(e);
      e.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      var re = new RegExp("'", "g");
      e = e.replace(re, '"');
      re = new RegExp("[\f]", "g");
      e = e.replace(re, "\\f");
      re = new RegExp("[\n]", "g");
      e = e.replace(re, "\\n");
      re = new RegExp("[\r]", "g");
      e = e.replace(re, "\\r");
      re = new RegExp("[\t]", "g");
      e = e.replace(re, "\\t");
      re = new RegExp("[\v]", "g");
      e = e.replace(re, "\\v");
      if (e == "") {
        this[param] = null;
        return;
      }
      console_log("this." + param + "= '" + e + "'");
      eval("this." + param + "= '" + e + "'");
      app.$forceUpdate();
    }, getDebounceTime()),
  },
  template:
    '<b-modal  :id = "id"' +
    '          title = "Save Binary" ' +
    '          ok-title="Save to File" ' +
    '          @ok="library_save">' +
    " " +
    "  <p> Please write the file name: </p> " +
    "  <b-form-input v-on:input=\"debounce('name_binary_save', $event)\" " +
    '                :value="name_binary_save"' +
    '                type="text"' +
    '                placeholder="File name where binary will be saved"' +
    '                title="File name">' +
    "  </b-form-input>" +
    "</b-modal>",
};
Vue.component("save-library", uielto_save_library);
function getDebounceTime() {
  if (screen.width > 768) {
    return 500;
  } else {
    return 1e3;
  }
}
var uielto_textarea_assembly = {
  props: { browser: { type: String, required: true } },
  template:
    " <div>" +
    '   <span id="assemblyInfo" class="fas fa-info-circle"></span> <span class="h5">Assembly:</span>' +
    " " +
    '   <popover-shortcuts target="assemblyInfo" :browser="browser"></popover-shortcuts>' +
    " " +
    '   <textarea id="textarea_assembly" rows="14" class="code-scroll-y d-none" title="Asembly Code"></textarea>' +
    " </div>",
};
Vue.component("textarea-assembly", uielto_textarea_assembly);
var uielto_shortcuts = {
  props: {
    target: { type: String, required: true },
    browser: { type: String, required: true },
  },
  template:
    ' <b-popover :target="target" title="Shortcuts" triggers="hover focus" placement="bottomright">' +
    "   <b-list-group>" +
    '     <b-list-group-item class="d-flex justify-content-between align-items-center">' +
    "       Copy &nbsp&nbsp" +
    '       <b-badge variant="primary" pill v-if="browser != \'Mac\'"> Ctrl + c</b-badge>' +
    '       <b-badge variant="primary" pill v-if="browser == \'Mac\'"> ⌘ + c</b-badge>' +
    "     </b-list-group-item>" +
    " " +
    '     <b-list-group-item class="d-flex justify-content-between align-items-center">' +
    "       Cut&nbsp &nbsp&nbsp" +
    '       <b-badge variant="primary" pill v-if="browser != \'Mac\'"> Ctrl + x</b-badge>' +
    '       <b-badge variant="primary" pill v-if="browser == \'Mac\'"> ⌘ + x</b-badge>' +
    "     </b-list-group-item>" +
    " " +
    '     <b-list-group-item class="d-flex justify-content-between align-items-center">' +
    "       Paste &nbsp&nbsp" +
    '       <b-badge variant="primary" pill v-if="browser != \'Mac\'"> Ctrl + v</b-badge>' +
    '       <b-badge variant="primary" pill v-if="browser == \'Mac\'"> ⌘ + v</b-badge>' +
    "     </b-list-group-item>" +
    " " +
    '     <b-list-group-item class="d-flex justify-content-between align-items-center">' +
    "       Select all &nbsp&nbsp" +
    '       <b-badge variant="primary" pill v-if="browser != \'Mac\'"> Ctrl + a</b-badge>' +
    '       <b-badge variant="primary" pill v-if="browser == \'Mac\'"> ⌘ + a</b-badge>' +
    "     </b-list-group-item>" +
    " " +
    '     <b-list-group-item class="d-flex justify-content-between align-items-center">' +
    "       Undo &nbsp&nbsp" +
    '       <b-badge variant="primary" pill v-if="browser != \'Mac\'"> Ctrl + z</b-badge>' +
    '       <b-badge variant="primary" pill v-if="browser == \'Mac\'"> ⌘ + z</b-badge>' +
    "     </b-list-group-item>" +
    " " +
    '     <b-list-group-item class="d-flex justify-content-between align-items-center">' +
    "       Redo &nbsp&nbsp" +
    '       <b-badge variant="primary" pill v-if="browser != \'Mac\'"> Ctrl + y</b-badge>' +
    '       <b-badge variant="primary" pill v-if="browser == \'Mac\'"> ⌘ + y</b-badge>' +
    "     </b-list-group-item>" +
    " " +
    '     <b-list-group-item class="d-flex justify-content-between align-items-center">' +
    "       Block code comment &nbsp&nbsp" +
    '       <b-badge variant="primary" pill> Ctrl + m</b-badge>' +
    "     </b-list-group-item>" +
    "   </b-list-group>" +
    " </b-popover>",
};
Vue.component("popover-shortcuts", uielto_shortcuts);
var uielto_assembly_error = {
  props: {
    id: { type: String, required: true },
    ref: { type: String, required: true },
    modal_assembly_error: { type: Object, required: true },
  },
  template:
    ' <b-modal :id="id"' +
    '          title="Assembly Code Error"' +
    '          :ref="ref"' +
    "          hide-footer" +
    '          size="lg">' +
    " " +
    '   <span class="h6 font-weight-light">Code fragment:</span>' +
    " " +
    '   <div class="errorAssembly">' +
    '     <span class="h6 text-monospace" label="Code fragment:">' +
    "       <b-container>" +
    "         <b-row>" +
    '           <b-col class="px-0"         >&nbsp;</b-col>' +
    '           <b-col class="px-2"         >...</b-col>' +
    '           <b-col class="pl-2" cols="10">&nbsp;</b-col>' +
    "         </b-row>" +
    " " +
    "         <b-row>" +
    '           <b-col class="px-0"         >&nbsp;</b-col>' +
    '           <b-col class="px-2"         >{{modal_assembly_error.line1}}</b-col>' +
    '           <b-col class="pl-2" cols="10">{{modal_assembly_error.code1}}</b-col>' +
    "         </b-row>" +
    " " +
    "         <b-row>" +
    '           <b-col class="px-0"         >*</b-col>' +
    '           <b-col class="px-2"         >{{modal_assembly_error.line2}}</b-col>' +
    '           <b-col class="pl-2" cols="10">{{modal_assembly_error.code2}}</b-col>' +
    "         </b-row>" +
    " " +
    "         <b-row>" +
    '           <b-col class="px-0"         >&nbsp;</b-col>' +
    '           <b-col class="px-2"         >{{modal_assembly_error.line3}}</b-col>' +
    '           <b-col class="pl-2" cols="10">{{modal_assembly_error.code3}}</b-col>' +
    "         </b-row>" +
    " " +
    "         <b-row>" +
    '           <b-col class="px-0"         >&nbsp;</b-col>' +
    '           <b-col class="px-2"         >...</b-col>' +
    '           <b-col class="pl-2" cols="10">&nbsp;</b-col>' +
    "         </b-row>" +
    "       </b-container>" +
    "     </span>" +
    "   </div>" +
    "   <br>" +
    " " +
    '   <span class="h6 font-weight-light">Error description:</span>' +
    "   <br>" +
    '   <span class="h6">{{modal_assembly_error.error}}</span>' +
    "   <br>" +
    " </b-modal>",
};
Vue.component("assembly-error", uielto_assembly_error);
var uielto_library_tags = {
  props: { instructions_tag: { type: Array, required: true } },
  template:
    " <div>" +
    '   <span class="h5">Library tags:</span>' +
    "   <b-list-group>" +
    '     <b-list-group-item v-for="item in instructions_tag" ' +
    '                        v-if="item.globl==true">' +
    '       <b-badge pill variant="primary">' +
    "         {{item.tag}}" +
    "       </b-badge>" +
    "     </b-list-group-item>" +
    "   </b-list-group>" +
    " </div>",
};
Vue.component("list-libray-tags", uielto_library_tags);
var this_env = null;
var uielto_flash = {
  props: {
    id: { type: String, required: true },
    lab_url: { type: String, required: true },
    result_email: { type: String, required: true },
    target_board: { type: String, required: true },
    target_port: { type: String, required: true },
    flash_url: { type: String, required: true },
  },
  data: function () {
    return {
      remote_target_boards: (remote_target_boards = [
        { text: "Please select an option", value: "", disabled: true },
        { text: "ESP32-C2 (RISC-V)", value: "esp32c2" },
        { text: "ESP32-C3 (RISC-V)", value: "esp32c3" },
        { text: "ESP32-H2 (RISC-V)", value: "esp32h2" },
      ]),
      request_id: (request_id = -1),
      position: (position = ""),
      boards: (boards = false),
      enqueue: (enqueue = false),
      status: (status = false),
      target_boards: (target_boards = [
        { text: "Please select an option", value: "", disabled: true },
        { text: "ESP32-C2 (RISC-V)", value: "esp32c2" },
        { text: "ESP32-C3 (RISC-V)", value: "esp32c3" },
        { text: "ESP32-H2 (RISC-V)", value: "esp32h2" },
      ]),
      flashing: (flashing = false),
      running: (running = false),
    };
  },
  methods: {
    get_boards() {
      if (this.lab_url != "") {
        this.save();
        this_env = this;
        remote_lab_get_boards(this.lab_url + "/target_boards").then(
          function (data) {
            if (data != "-1") {
              available_boards = JSON.parse(data);
              for (var i = 1; i < this_env.remote_target_boards.length; i++) {
                if (
                  !available_boards.includes(
                    this_env.remote_target_boards[i]["value"],
                  )
                ) {
                  this_env.remote_target_boards.splice(i, 1);
                  i--;
                }
              }
              this_env.boards = true;
            }
          },
        );
      } else {
        this.boards = false;
      }
    },
    do_enqueue() {
      this.save();
      if (instructions.length == 0) {
        show_notification("Compile a program first", "danger");
        return;
      }
      if (this.result_email == "") {
        show_notification("Please, enter your E-mail", "danger");
        return;
      }
      var earg = {
        target_board: this.target_board,
        result_email: this.result_email,
        assembly: code_assembly,
      };
      this_env = this;
      remote_lab_enqueue(this.lab_url + "/enqueue", earg).then(function (data) {
        if (data != "-1") {
          this_env.request_id = data;
          this_env.enqueue = true;
          this_env.status = true;
          this_env.position = "";
          this_env.check_status();
        }
      });
      creator_ga("simulator", "simulator.enqueue", "simulator.enqueue");
    },
    check_status() {
      if (this.position != "Completed" && this.position != "Error") {
        this.get_status();
        setTimeout(this.check_status, 2e4);
      }
    },
    get_status() {
      this.save();
      var parg = { req_id: this.request_id };
      this_env = this;
      remote_lab_status(this.lab_url + "/status", parg).then(function (data) {
        if (data == "Completed") {
          this_env.enqueue = false;
        }
        if (data != "-1") {
          if (data == "-2") {
            this_env.position = "Error";
            this_env.enqueue = false;
          } else if (!isNaN(data)) {
            this_env.position = "Queue position: " + data;
          } else {
            this_env.position = data;
          }
        }
      });
      creator_ga("simulator", "simulator.position", "simulator.position");
    },
    do_cancel() {
      this.save();
      var carg = { req_id: this.request_id };
      this_env = this;
      remote_lab_cancel(this.lab_url + "/delete", carg).then(function (data) {
        if (data != "-1") {
          this_env.enqueue = false;
          this_env.position = "Canceled";
        }
      });
      creator_ga("simulator", "simulator.cancel", "simulator.cancel");
    },
    download_driver() {
      var link = document.createElement("a");
      link.download = "driver.zip";
      link.href =
        window.location.href.split("?")[0].split("#")[0] +
        "/gateway/" +
        this.target_board +
        ".zip";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      delete link;
      creator_ga(
        "simulator",
        "simulator.download_driver",
        "simulator.download_driver",
      );
    },
    do_flash() {
      this.save();
      if (instructions.length == 0) {
        show_notification("Compile a program first", "danger");
        return;
      }
      this.flashing = true;
      var farg = {
        target_board: this.target_board,
        target_port: this.target_port,
        assembly: code_assembly,
      };
      this_env = this;
      gateway_remote_flash(this.flash_url + "/flash", farg).then(
        function (data) {
          this_env.flashing = false;
          show_notification(data, "danger");
        },
      );
      creator_ga("simulator", "simulator.flash", "simulator.flash");
    },
    do_monitor() {
      this.save();
      this.running = true;
      var farg = {
        target_board: this.target_board,
        target_port: this.target_port,
        assembly: code_assembly,
      };
      this_env = this;
      gateway_remote_monitor(this.flash_url + "/monitor", farg).then(
        function (data) {
          this_env.running = false;
        },
      );
      creator_ga("simulator", "simulator.monitor", "simulator.monitor");
    },
    save() {
      app._data.lab_url = this._props.lab_url;
      app._data.result_email = this._props.result_email;
      app._data.target_board = this._props.target_board;
      app._data.target_port = this._props.target_port;
      app._data.flash_url = this._props.flash_url;
    },
  },
  template:
    ' <b-modal :id="id"' +
    '          title="Target Board Flash"' +
    "          hide-footer" +
    '          @hidden="save">' +
    " " +
    '   <b-tabs content-class="mt-3">' +
    '     <b-tab title="Remote Device">' +
    " " +
    '       <b-container fluid align-h="center" class="mx-0 px-0">' +
    '         <b-row cols="1" align-h="center">' +
    '           <b-col class="pt-2">' +
    '             <label for="range-6">(1) Remote Device URL:</label>' +
    '             <b-form-input type="text" ' +
    '                           v-model="lab_url" ' +
    '                           placeholder="Enter remote device URL" ' +
    '                           size="sm" ' +
    '                           title="Remote remote device URL">' +
    "             </b-form-input>" +
    "           </b-col>" +
    "         </b-row>" +
    "       </b-container>" +
    "       <br>" +
    " " +
    '       <b-container fluid align-h="center" class="mx-0 px-0" v-if="!boards">' +
    '         <b-row cols="1" align-h="center">' +
    '           <b-col class="pt-2">' +
    '             <b-button class="btn btn-sm btn-block" variant="primary" @click="get_boards">' +
    '               <span class="fas fa-link"></span> Connect' +
    "             </b-button>" +
    "           </b-col>" +
    "         </b-row>" +
    "       </b-container>" +
    '       <br v-if="!boards">' +
    " " +
    '       <b-container fluid align-h="center" class="mx-0 px-0" v-if="boards">' +
    '         <b-row cols="1" align-h="center">' +
    '           <b-col class="pt-2">' +
    '             <label for="range-6">(2) Select Target Board:</label>' +
    '             <b-form-select v-model="target_board" ' +
    '                            :options="remote_target_boards" ' +
    '                            size="sm"' +
    '                            title="Target board">' +
    "             </b-form-select>" +
    "           </b-col>" +
    "         </b-row>" +
    "       </b-container>" +
    "       <br>" +
    " " +
    '       <b-container fluid align-h="center" class="mx-0 px-0" v-if="boards">' +
    '         <b-row cols="1" align-h="center">' +
    '           <b-col class="pt-2">' +
    '             <label for="range-6">(3) E-mail to receive the execution results:</label>' +
    '             <b-form-input type="text" ' +
    '                           v-model="result_email" ' +
    '                           placeholder="Enter E-mail" ' +
    '                           size="sm" ' +
    '                           title="Result E-mail">' +
    "             </b-form-input>" +
    "           </b-col>" +
    "         </b-row>" +
    "       </b-container>" +
    "       <br>" +
    " " +
    '       <b-container fluid align-h="center" class="mx-0 px-0" v-if="status">' +
    '         <b-row cols="1" align-h="center">' +
    '           <b-col class="pt-2">' +
    "             <span>Last program status: <b>{{position}}</b></span>" +
    "           </b-col>" +
    "         </b-row>" +
    "       </b-container>" +
    " " +
    '       <b-container fluid align-h="center" class="mx-0 px-0" v-if="target_board !=\'\' && enqueue">' +
    '         <b-row cols="1" align-h="center">' +
    '           <b-col class="pt-2">' +
    '             <b-button class="btn btn-sm btn-block" variant="danger" @click="do_cancel">' +
    '               <span class="fas fa-ban"></span> Cancel last program' +
    "             </b-button>" +
    "           </b-col>" +
    "         </b-row>" +
    "       </b-container>" +
    "       <br>" +
    " " +
    '       <b-container fluid align-h="center" class="mx-0 px-0" v-if="target_board !=\'\'">' +
    '         <b-row cols="1" align-h="center">' +
    '           <b-col class="pt-2">' +
    '             <b-button class="btn btn-sm btn-block" variant="primary" @click="do_enqueue">' +
    '               <span class="fas fa-paper-plane"></span> Send program' +
    "             </b-button>" +
    "           </b-col>" +
    "         </b-row>" +
    "       </b-container>" +
    "       <br>" +
    '       For Teachers, how to deploy a remote laboratory <a href="https://github.com/creatorsim/creator/blob/master/dockers/remote_lab/README.md">documentation</a>' +
    "     </b-tab>" +
    " " +
    " " +
    " " +
    " " +
    '     <b-tab title="Local Device">' +
    " " +
    '       <b-container fluid align-h="center" class="mx-0 px-0">' +
    '         <b-row cols="1" align-h="center">' +
    '           <b-col class="pt-2">' +
    '             <label for="range-6">(1) Select Target Board:</label>' +
    '             <b-form-select v-model="target_board" ' +
    '                            :options="target_boards" ' +
    '                            size="sm"' +
    '                            title="Target board">' +
    "             </b-form-select>" +
    "           </b-col>" +
    "         </b-row>" +
    "       </b-container>" +
    "       <br>" +
    " " +
    '       <b-tabs content-class="mt-3" v-if="target_board !=\'\'">' +
    '         <b-tab title="Prerequisites">' +
    " " +
    '           <b-tabs content-class="mt-3">' +
    '             <b-tab title="Docker Windows" active>' +
    '               <b-container fluid align-h="center" class="mx-0 px-0">' +
    '                 <b-row cols="1" align-h="center">' +
    '                   <b-col class="pt-2">' +
    '                     <label for="range-6">(2) Install Docker Desktop (only the first time):</label>' +
    '                     <b-card class="text-center">' +
    "                       <b-row no-gutters>" +
    '                         <b-col md="12">' +
    '                           <b-card-text style="text-align: left;margin:2%;">' +
    '                             <span>Follow the instructions from: <a href="https://docs.docker.com/desktop/install/windows-install/" target="_blank">https://docs.docker.com/desktop/install/windows-install/</a></span>' +
    "                           </b-card-text>" +
    "                         </b-col>" +
    "                       </b-row>" +
    "                     </b-card>" +
    "                   </b-col>" +
    "                 </b-row>" +
    "               </b-container>" +
    " " +
    '               <b-container fluid align-h="center" class="mx-0 px-0">' +
    '                 <b-row cols="1" align-h="center">' +
    '                   <b-col class="pt-2">' +
    '                     <label for="range-6">(3) Download esptool (only the first time):</label>' +
    '                     <b-card class="text-center">' +
    "                       <b-row no-gutters>" +
    '                         <b-col md="12">' +
    '                           <b-card-text style="text-align: left;margin:2%;">' +
    '                             <span>Download from: <a href="https://github.com/espressif/esptool/releases" target="_blank">https://github.com/espressif/esptool/releases</a></span>' +
    "                           </b-card-text>" +
    "                         </b-col>" +
    "                       </b-row>" +
    "                     </b-card>" +
    "                   </b-col>" +
    "                 </b-row>" +
    "               </b-container>" +
    " " +
    '               <b-container fluid align-h="center" class="mx-0 px-0">' +
    '                 <b-row cols="1" align-h="center">' +
    '                   <b-col class="pt-2">' +
    '                     <label for="range-6">(4) Pull creator_gateway image in Docker Desktop:</label>' +
    '                     <b-card class="text-center">' +
    "                       <b-row no-gutters>" +
    '                         <b-col md="12">' +
    '                           <b-card-text style="text-align: left;margin:2%;">' +
    '                             <ol style="margin:3%;">' +
    '                               <li>Search for "creatorsim/creator_gateway" in the Docker Desktop browser</li>' +
    '                               <li>Click the "Pull" button</li>' +
    "                             </ol>" +
    "                           </b-card-text>" +
    "                         </b-col>" +
    "                       </b-row>" +
    "                     </b-card>" +
    "                   </b-col>" +
    "                 </b-row>" +
    "               </b-container>" +
    " " +
    '               <b-container fluid align-h="center" class="mx-0 px-0">' +
    '                 <b-row cols="1" align-h="center">' +
    '                   <b-col class="pt-2">' +
    '                     <label for="range-6">(5) Run creator_gateway image:</label>' +
    '                     <b-card class="text-center">' +
    "                       <b-row no-gutters>" +
    '                         <b-col md="12">' +
    '                           <b-card-text style="text-align: left;margin:2%;">' +
    '                             <ol style="margin:3%;">' +
    '                               <li>Click the "Run" button</li>' +
    '                               <li>Click the "Optional settings" button</li>' +
    "                               <li>Set the Host port to 8080</li>" +
    '                               <li>Click the "Run" button</li>' +
    "                             </ol>" +
    "                           </b-card-text>" +
    "                         </b-col>" +
    "                       </b-row>" +
    "                     </b-card>" +
    "                   </b-col>" +
    "                 </b-row>" +
    "               </b-container>" +
    " " +
    '               <b-container fluid align-h="center" class="mx-0 px-0">' +
    '                 <b-row cols="1" align-h="center">' +
    '                   <b-col class="pt-2">' +
    '                     <label for="range-6">(6) Run start_gateway script in the container bash:</label>' +
    '                     <b-card class="text-center">' +
    "                       <b-row no-gutters>" +
    '                         <b-col md="12">' +
    '                           <b-card-text style="text-align: left;margin:2%;">' +
    '                             <ol style="margin:3%;">' +
    '                               <li>Click the "Exec" button</li>' +
    "                               <li>Execute <code>./start_gateway.sh</code>" +
    "                             </ol>" +
    "                           </b-card-text>" +
    "                         </b-col>" +
    "                       </b-row>" +
    "                     </b-card>" +
    "                   </b-col>" +
    "                 </b-row>" +
    "               </b-container>" +
    " " +
    '               <b-container fluid align-h="center" class="mx-0 px-0">' +
    '                 <b-row cols="1" align-h="center">' +
    '                   <b-col class="pt-2">' +
    '                     <label for="range-6">(7) Run esp_rfc2217_server in windows cmd:</label>' +
    '                     <b-card class="text-center">' +
    "                       <b-row no-gutters>" +
    '                         <b-col md="12">' +
    '                           <b-card-text style="text-align: left;margin:2%;">' +
    '                             <ol style="margin:3%;">' +
    "                               <li>Execute the windows cmd in the esptool path</li>" +
    "                               <li>Execute <code>esp_rfc2217_server -v -p 4000 &lt;target_port&gt;</code>" +
    "                             </ol>" +
    '                             <span>For more information: <a href="https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-guides/tools/idf-docker-image.html#using-remote-serial-port" target="_blank">https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-guides/tools/idf-docker-image.html#using-remote-serial-port</a></span>' +
    "                           </b-card-text>" +
    "                         </b-col>" +
    "                       </b-row>" +
    "                     </b-card>" +
    "                   </b-col>" +
    "                 </b-row>" +
    "               </b-container>" +
    "             </b-tab>" +
    " " +
    '             <b-tab title="Docker Linux/MacOS">' +
    '               <b-container fluid align-h="center" class="mx-0 px-0">' +
    '                 <b-row cols="1" align-h="center">' +
    '                   <b-col class="pt-2">' +
    '                     <label for="range-6">(2) Install Docker Engine (only the first time):</label>' +
    '                     <b-card class="text-center">' +
    "                       <b-row no-gutters>" +
    '                         <b-col md="12">' +
    '                           <b-card-text style="text-align: left;margin:2%;">' +
    '                             <span>Follow the instructions from: <a href="https://docs.docker.com/engine/install/" target="_blank">https://docs.docker.com/engine/install/</a></span>' +
    "                           </b-card-text>" +
    "                         </b-col>" +
    "                       </b-row>" +
    "                     </b-card>" +
    "                   </b-col>" +
    "                 </b-row>" +
    "               </b-container>" +
    " " +
    '               <b-container fluid align-h="center" class="mx-0 px-0">' +
    '                 <b-row cols="1" align-h="center">' +
    '                   <b-col class="pt-2">' +
    '                     <label for="range-6">(3) Pull creator_gateway image:</label>' +
    '                     <b-card class="text-center">' +
    "                       <b-row no-gutters>" +
    '                         <b-col md="12">' +
    '                           <b-card-text style="text-align: left;margin:2%;">' +
    "                             <code>docker pull creatorsim/creator_gateway</code>" +
    "                           </b-card-text>" +
    "                         </b-col>" +
    "                       </b-row>" +
    "                     </b-card>" +
    "                   </b-col>" +
    "                 </b-row>" +
    "               </b-container>" +
    " " +
    '               <b-container fluid align-h="center" class="mx-0 px-0">' +
    '                 <b-row cols="1" align-h="center">' +
    '                   <b-col class="pt-2">' +
    '                     <label for="range-6">(4) Run creator_gateway image:</label>' +
    '                     <b-card class="text-center">' +
    "                       <b-row no-gutters>" +
    '                         <b-col md="12">' +
    '                           <b-card-text style="text-align: left;margin:2%;">' +
    "                             <code>docker run --init -it --device=&lt;target_port&gt; -p 8080:8080 --name creator_gateway creatorsim/creator_gateway /bin/bash</code>" +
    "                           </b-card-text>" +
    "                         </b-col>" +
    "                       </b-row>" +
    "                     </b-card>" +
    "                   </b-col>" +
    "                 </b-row>" +
    "               </b-container>" +
    " " +
    '               <b-container fluid align-h="center" class="mx-0 px-0">' +
    '                 <b-row cols="1" align-h="center">' +
    '                   <b-col class="pt-2">' +
    '                     <label for="range-6">(5) Run start_gateway script in the container bash:</label>' +
    '                     <b-card class="text-center">' +
    "                       <b-row no-gutters>" +
    '                         <b-col md="12">' +
    '                           <b-card-text style="text-align: left;margin:2%;">' +
    "                             <code>./start_gateway.sh</code>" +
    "                           </b-card-text>" +
    "                         </b-col>" +
    "                       </b-row>" +
    "                     </b-card>" +
    "                   </b-col>" +
    "                 </b-row>" +
    "               </b-container>" +
    "             </b-tab>" +
    " " +
    '             <b-tab title="Native">' +
    '               <b-container fluid align-h="center" class="mx-0 px-0">' +
    '                 <b-row cols="1" align-h="center">' +
    '                   <b-col class="pt-2">' +
    '                     <label for="range-6">(2) Install the ESP32 Software (only the first time):</label>' +
    '                     <b-card class="text-center">' +
    "                       <b-row no-gutters>" +
    '                         <b-col md="12">' +
    '                           <b-card-text style="text-align: left;margin:2%;">' +
    '                             <span>Follow the instructions from: <a href="https://docs.espressif.com/projects/esp-idf/en/latest/esp32/" target="_blank">https://docs.espressif.com/projects/esp-idf/en/latest/esp32/</a></span>' +
    "                           </b-card-text>" +
    "                         </b-col>" +
    "                       </b-row>" +
    "                     </b-card>" +
    "                   </b-col>" +
    "                 </b-row>" +
    "               </b-container>" +
    " " +
    '               <b-container fluid align-h="center" class="mx-0 px-0">' +
    '                 <b-row cols="1" align-h="center">' +
    '                   <b-col class="pt-2">' +
    '                     <label for="range-6">(3) Install python3 packages:</label>' +
    '                     <b-card class="text-center">' +
    "                       <b-row no-gutters>" +
    '                         <b-col md="12">' +
    '                           <b-card-text style="text-align: left;margin:2%;">' +
    "                             <code>pip3 install flask flask_cors</code>" +
    "                           </b-card-text>" +
    "                         </b-col>" +
    "                       </b-row>" +
    "                     </b-card>" +
    "                   </b-col>" +
    "                 </b-row>" +
    "               </b-container>" +
    " " +
    '               <b-container fluid align-h="center" class="mx-0 px-0">' +
    '                 <b-row cols="1" align-h="center">' +
    '                   <b-col class="pt-2">' +
    '                     <label for="range-6">(4) Download the driver:</label>' +
    '                     <b-button class="btn btn-sm btn-block" variant="outline-primary" @click="download_driver"><span class="fas fa-download"></span> Download Driver</b-button>' +
    "                   </b-col>" +
    "                 </b-row>" +
    "               </b-container>" +
    " " +
    '               <b-container fluid align-h="center" class="mx-0 px-0">' +
    '                 <b-row cols="1" align-h="center">' +
    '                   <b-col class="pt-2">' +
    '                     <label for="range-6">(5) Run driver:</label>' +
    '                     <b-card class="text-center">' +
    "                       <b-row no-gutters>" +
    '                         <b-col md="12">' +
    '                           <b-card-text style="text-align: justify;margin:2%;">' +
    "                             <span>Load the environment variable for your board with:</span>" +
    "                             <br>" +
    "                             <code>. $HOME/esp/esp-idf/export.sh</code>" +
    "                             <br>" +
    "                             <br>" +
    '                             <span>Unzip the driver.zip file and change into the driver directory associated to your board with "cd &lt;board&gt;", for example:</span>' +
    "                             <br>" +
    "                             <code>unzip driver.zip</code>" +
    "                             <br>" +
    "                             <code>cd &lt;board&gt;</code>" +
    "                             <br>" +
    "                             <br>" +
    "                             <span>Execute the gateway web service:</span>" +
    "                             <br>" +
    "                             <code>python3 gateway.py</code>" +
    "                             <br>" +
    "                           </b-card-text>" +
    "                         </b-col>" +
    "                       </b-row>" +
    "                     </b-card>" +
    "                   </b-col>" +
    "                 </b-row>" +
    "               </b-container>" +
    "             </b-tab>" +
    "           </b-tabs>" +
    "         </b-tab>" +
    " " +
    '         <b-tab title="Run" active>' +
    '           <b-container fluid align-h="center" class="mx-0 px-0">' +
    '             <b-row cols="1" align-h="center">' +
    '               <b-col class="pt-2">' +
    '                 <label for="range-6">(2) Target Port: (please verify the port on your computer)</label>' +
    '                 <b-form-input type="text" ' +
    '                               v-model="target_port" ' +
    '                               placeholder="Enter target port" ' +
    '                               size="sm" ' +
    '                               title="Target port">' +
    "                 </b-form-input>" +
    "               </b-col>" +
    "             </b-row>" +
    "           </b-container>" +
    " " +
    '           <b-container fluid align-h="center" class="mx-0 px-0">' +
    '             <b-row cols="1" align-h="center">' +
    '               <b-col class="pt-2">' +
    '                 <label for="range-6">(3) Flash URL:</label>' +
    '                 <b-form-input type="text" ' +
    '                               v-model="flash_url" ' +
    '                               placeholder="Enter flash URL" ' +
    '                               size="sm" ' +
    '                               title="Flash URL">' +
    "                 </b-form-input>" +
    "               </b-col>" +
    "             </b-row>" +
    "           </b-container>" +
    " " +
    "           <br>" +
    " " +
    '           <b-container fluid align-h="center" class="mx-0 px-0">' +
    '             <b-row cols="2" align-h="center">' +
    '               <b-col class="pt-2">' +
    '                 <b-button class="btn btn-sm btn-block" variant="primary" @click="do_flash" :pressed="flashing" :disabled="flashing || running">' +
    '                   <span v-if="!flashing"><span class="fas fa-bolt-lightning"></span> Flash</span>' +
    '                   <span v-if="flashing"><span class="fas fa-bolt-lightning"></span>  Flashing...</span>' +
    '                   <b-spinner small v-if="flashing"></b-spinner>' +
    "                 </b-button>" +
    "               </b-col>" +
    '               <b-col class="pt-2">' +
    '                 <b-button class="btn btn-sm btn-block" variant="primary" @click="do_monitor" :pressed="running" :disabled="running || flashing">' +
    '                   <span v-if="!running"><span class="fas fa-play"></span> Monitor</span>' +
    '                   <span v-if="running"><span class="fas fa-play"></span>  Runing...</span>' +
    '                   <b-spinner small v-if="running"></b-spinner>' +
    "                 </b-button>" +
    "               </b-col>" +
    "             </b-row>" +
    "           </b-container>" +
    "         </b-tab>" +
    "       </b-tabs>" +
    " " +
    "     </b-tab>" +
    "   </b-tabs>" +
    " " +
    " </b-modal>",
};
Vue.component("flash", uielto_flash);
async function remote_lab_get_boards(lab_url) {
  var fetch_args = { method: "GET" };
  try {
    var res = await fetch(lab_url, fetch_args);
    return await res.text();
  } catch (err) {
    if (err.toString() == "TypeError: Failed to fetch") {
      show_notification(
        "Remote device not available at the moment. Please, try again later.",
        "danger",
      );
      return "-1";
    }
    return err.toString() + "\n";
  }
}
async function remote_lab_enqueue(lab_url, enqueue_args) {
  var fetch_args = {
    method: "POST",
    headers: { "Content-type": "application/json", Accept: "application/json" },
    body: JSON.stringify(enqueue_args),
  };
  try {
    var res = await fetch(lab_url, fetch_args);
    var jres = await res.json();
    return jres.status;
  } catch (err) {
    if (err.toString() == "TypeError: Failed to fetch") {
      show_notification(
        "Remote device not available at the moment. Please, try again later.",
        "danger",
      );
      return "-1";
    }
    return err.toString() + "\n";
  }
}
async function remote_lab_cancel(lab_url, cancel_args) {
  var fetch_args = {
    method: "POST",
    headers: { "Content-type": "application/json", Accept: "application/json" },
    body: JSON.stringify(cancel_args),
  };
  try {
    var res = await fetch(lab_url, fetch_args);
    var jres = await res.json();
    return jres.status;
  } catch (err) {
    if (err.toString() == "TypeError: Failed to fetch") {
      show_notification(
        "Remote device not available at the moment. Please, try again later.",
        "danger",
      );
      return "-1";
    }
    return err.toString() + "\n";
  }
}
async function remote_lab_position(lab_url, position_args) {
  var fetch_args = {
    method: "POST",
    headers: { "Content-type": "application/json", Accept: "application/json" },
    body: JSON.stringify(position_args),
  };
  try {
    var res = await fetch(lab_url, fetch_args);
    var jres = await res.json();
    return jres.status;
  } catch (err) {
    if (err.toString() == "TypeError: Failed to fetch") {
      show_notification(
        "Remote device not available at the moment. Please, try again later.",
        "danger",
      );
      return "-1";
    }
    return err.toString() + "\n";
  }
}
async function remote_lab_status(lab_url, status_args) {
  var fetch_args = {
    method: "POST",
    headers: { "Content-type": "application/json", Accept: "application/json" },
    body: JSON.stringify(status_args),
  };
  try {
    var res = await fetch(lab_url, fetch_args);
    var jres = await res.json();
    return jres.status;
  } catch (err) {
    if (err.toString() == "TypeError: Failed to fetch") {
      show_notification(
        "Remote device not available at the moment. Please, try again later.",
        "danger",
      );
      return "-2";
    }
    return err.toString() + "\n";
  }
}
async function gateway_remote_flash(flash_url, flash_args) {
  var fetch_args = {
    method: "POST",
    headers: { "Content-type": "application/json", Accept: "application/json" },
    body: JSON.stringify(flash_args),
  };
  try {
    var res = await fetch(flash_url, fetch_args);
    var jres = await res.json();
    return jres.status;
  } catch (err) {
    if (err.toString() == "TypeError: Failed to fetch") {
      return "Gateway not available at the moment. Please, execute 'python3 gateway.py' and connect your board first\n";
    }
    return err.toString() + "\n";
  }
}
async function gateway_remote_monitor(flash_url, flash_args) {
  var fetch_args = {
    method: "POST",
    headers: { "Content-type": "application/json", Accept: "application/json" },
    body: JSON.stringify(flash_args),
  };
  try {
    var res = await fetch(flash_url, fetch_args);
    var jres = await res.json();
    return jres.status;
  } catch (err) {
    if (err.toString() == "TypeError: Failed to fetch") {
      return "Gateway not available at the moment. Please, execute 'python3 gateway.py' and connect your board first\n";
    }
    return err.toString() + "\n";
  }
}
var uielto_calculator = {
  props: { id: { type: String, required: true } },
  data: function () {
    return {
      bits: 32,
      bits_options: [
        { text: "32 Bits", value: 32 },
        { text: "64 Bits", value: 64 },
      ],
      calculator: {
        bits: 32,
        hexadecimal: "",
        sign: "",
        exponent: "",
        mantissa: "",
        mantisaDec: 0,
        exponentDec: "",
        decimal: "",
        variant32: "primary",
        variant64: "outline-primary",
        lengthHexadecimal: 8,
        lengthSign: 1,
        lengthExponent: 8,
        lengthMantissa: 23,
      },
    };
  },
  methods: {
    changeBitsCalculator() {
      if (this.bits === 32) {
        this.calculator.bits = 32;
        this.calculator.variant32 = "primary";
        this.calculator.variant64 = "outline-primary";
        this.calculator.lengthHexadecimal = 8;
        this.calculator.lengthSign = 1;
        this.calculator.lengthExponent = 8;
        this.calculator.lengthMantissa = 23;
      }
      if (this.bits === 64) {
        this.calculator.bits = 64;
        this.calculator.variant64 = "primary";
        this.calculator.variant32 = "outline-primary";
        this.calculator.lengthHexadecimal = 16;
        this.calculator.lengthSign = 1;
        this.calculator.lengthExponent = 11;
        this.calculator.lengthMantissa = 52;
      }
      this.calculator.hexadecimal = "";
      this.calculator.sign = "";
      this.calculator.exponent = "";
      this.calculator.mantissa = "";
      this.calculator.decimal = "";
      this.calculator.sign = "";
      this.calculator.exponentDec = "";
      this.calculator.mantissaDec = "";
    },
    calculatorFunct(index) {
      switch (index) {
        case 0:
          console_log(
            this.calculator.hexadecimal.padStart(this.calculator.bits / 4, "0"),
          );
          var hex = this.calculator.hexadecimal.padStart(
            this.calculator.bits / 4,
            "0",
          );
          var float;
          var binary;
          if (this.calculator.bits === 32) {
            var re = /[0-9A-Fa-f]{8}/g;
            if (!re.test(hex)) {
              show_notification("Character not allowed", "danger");
              this.calculator.sign = "";
              this.calculator.exponent = "";
              this.calculator.mantissa = "";
              this.calculator.exponentDec = "";
              this.calculator.mantissaDec = 0;
              this.calculator.decimal = "";
              return;
            }
            float = hex2float("0x" + hex);
            console_log(hex2float("0x" + hex));
            binary = float2bin(float).padStart(this.calculator.bits, "0");
            this.calculator.decimal = float;
            this.calculator.sign = binary.substring(0, 1);
            this.calculator.exponent = binary.substring(1, 9);
            this.calculator.mantissa = binary.substring(9, 32);
            this.calculator.exponentDec = parseInt(
              bin2hex(this.calculator.exponent),
              16,
            );
            this.calculator.mantissaDec = 0;
            var j = 0;
            for (var i = 0; i < this.calculator.mantissa.length; i++) {
              j--;
              this.calculator.mantissaDec =
                this.calculator.mantissaDec +
                parseInt(this.calculator.mantissa.charAt(i)) * Math.pow(2, j);
            }
            creator_ga(
              "send",
              "event",
              "calculator",
              "calculator.32",
              "calculator.32.hex",
            );
            creator_ga(
              "send",
              "event",
              "calculator",
              "calculator.32",
              "calculator.32.0x" + hex,
            );
          }
          if (this.calculator.bits === 64) {
            var re = /[0-9A-Fa-f]{16}/g;
            if (!re.test(hex)) {
              show_notification("Character not allowed", "danger");
              this.calculator.sign = "";
              this.calculator.exponent = "";
              this.calculator.mantissa = "";
              this.calculator.exponentDec = "";
              this.calculator.mantissaDec = 0;
              this.calculator.decimal = "";
              return;
            }
            float = hex2double("0x" + hex);
            binary = double2bin(float);
            this.calculator.decimal = float;
            this.calculator.sign = binary.substring(0, 1);
            this.calculator.exponent = binary.substring(1, 12);
            this.calculator.mantissa = binary.substring(12, 64);
            this.calculator.exponentDec = parseInt(
              bin2hex(this.calculator.exponent),
              16,
            );
            this.calculator.mantissaDec = 0;
            var j = 0;
            for (var i = 0; i < this.calculator.mantissa.length; i++) {
              j--;
              this.calculator.mantissaDec =
                this.calculator.mantissaDec +
                parseInt(this.calculator.mantissa.charAt(i)) * Math.pow(2, j);
            }
            creator_ga(
              "send",
              "event",
              "calculator",
              "calculator.64",
              "calculator.64.hex",
            );
            creator_ga(
              "send",
              "event",
              "calculator",
              "calculator.64",
              "calculator.64.0x" + hex,
            );
          }
          break;
        case 1:
          if (this.calculator.bits === 32) {
            this.calculator.sign = this.calculator.sign.padStart(1, "0");
            this.calculator.exponent = this.calculator.exponent.padStart(
              8,
              "0",
            );
            this.calculator.mantissa = this.calculator.mantissa.padStart(
              23,
              "0",
            );
            var binary =
              this.calculator.sign +
              this.calculator.exponent +
              this.calculator.mantissa;
            console_log(binary);
            var re = /[0-1]{32}/g;
            if (!re.test(binary)) {
              show_notification("Character not allowed", "danger");
              this.calculator.hexadecimal = "";
              this.calculator.decimal = "";
              this.calculator.exponentDec = "";
              this.calculator.mantissaDec = 0;
              return;
            }
            float = hex2float("0x" + bin2hex(binary));
            hexadecimal = bin2hex(binary);
            this.calculator.decimal = float;
            this.calculator.hexadecimal = hexadecimal.padStart(
              this.calculator.bits / 4,
              "0",
            );
            this.calculator.exponentDec = parseInt(
              bin2hex(this.calculator.exponent),
              16,
            );
            this.calculator.mantissaDec = 0;
            var j = 0;
            for (var i = 0; i < this.calculator.mantissa.length; i++) {
              j--;
              this.calculator.mantissaDec =
                this.calculator.mantissaDec +
                parseInt(this.calculator.mantissa.charAt(i)) * Math.pow(2, j);
            }
            creator_ga(
              "send",
              "event",
              "calculator",
              "calculator.32",
              "calculator.32.bin",
            );
            creator_ga(
              "send",
              "event",
              "calculator",
              "calculator.32",
              "calculator.32." + binary,
            );
          }
          if (this.calculator.bits === 64) {
            this.calculator.sign = this.calculator.sign.padStart(1, "0");
            this.calculator.exponent = this.calculator.exponent.padStart(
              11,
              "0",
            );
            this.calculator.mantissa = this.calculator.mantissa.padStart(
              52,
              "0",
            );
            var binary =
              this.calculator.sign +
              this.calculator.exponent +
              this.calculator.mantissa;
            var re = /[0-1]{64}/g;
            if (!re.test(binary)) {
              show_notification("Character not allowed", "danger");
              this.calculator.hexadecimal = "";
              this.calculator.decimal = "";
              this.calculator.exponentDec = parseInt(
                bin2hex(this.calculator.exponent),
                16,
              );
              this.calculator.mantissaDec = 0;
              var j = 0;
              for (var i = 0; i < this.calculator.mantissa.length; i++) {
                j--;
                this.calculator.mantissaDec =
                  this.calculator.mantissaDec +
                  parseInt(this.calculator.mantissa.charAt(i)) * Math.pow(2, j);
              }
              return;
            }
            double = hex2double("0x" + bin2hex(binary));
            hexadecimal = bin2hex(binary);
            this.calculator.decimal = double;
            this.calculator.hexadecimal = hexadecimal.padStart(
              this.calculator.bits / 4,
              "0",
            );
            creator_ga(
              "send",
              "event",
              "calculator",
              "calculator.64",
              "calculator.64.bin",
            );
            creator_ga(
              "send",
              "event",
              "calculator",
              "calculator.64",
              "calculator.64." + binary,
            );
          }
          break;
        case 2:
          if (this.calculator.decimal.indexOf(",") != -1) {
            this.calculator.decimal = this.calculator.decimal.replace(",", ".");
          }
          var float = parseFloat(this.calculator.decimal, 10);
          var binary;
          var hexadecimal;
          if (this.calculator.bits === 32) {
            hexadecimal = bin2hex(float2bin(float));
            binary = float2bin(float);
            console_log(hexadecimal);
            this.calculator.hexadecimal = hexadecimal.padStart(
              this.calculator.bits / 4,
              "0",
            );
            this.calculator.sign = binary.substring(0, 1);
            this.calculator.exponent = binary.substring(1, 9);
            this.calculator.mantissa = binary.substring(9, 32);
            this.calculator.exponentDec = parseInt(
              bin2hex(this.calculator.exponent),
              16,
            );
            this.calculator.mantissaDec = 0;
            var j = 0;
            for (var i = 0; i < this.calculator.mantissa.length; i++) {
              j--;
              this.calculator.mantissaDec =
                this.calculator.mantissaDec +
                parseInt(this.calculator.mantissa.charAt(i)) * Math.pow(2, j);
            }
            creator_ga(
              "send",
              "event",
              "calculator",
              "calculator.32",
              "calculator.32.dec",
            );
            creator_ga(
              "send",
              "event",
              "calculator",
              "calculator.32",
              "calculator.32." + this.calculator.decimal,
            );
          }
          if (this.calculator.bits === 64) {
            hexadecimal = bin2hex(double2bin(float));
            binary = double2bin(float);
            this.calculator.hexadecimal = hexadecimal.padStart(
              this.calculator.bits / 4,
              "0",
            );
            this.calculator.sign = binary.substring(0, 1);
            this.calculator.exponent = binary.substring(1, 12);
            this.calculator.mantissa = binary.substring(12, 64);
            this.calculator.exponentDec = parseInt(
              bin2hex(this.calculator.exponent),
              16,
            );
            this.calculator.mantissaDec = 0;
            var j = 0;
            for (var i = 0; i < this.calculator.mantissa.length; i++) {
              j--;
              this.calculator.mantissaDec =
                this.calculator.mantissaDec +
                parseInt(this.calculator.mantissa.charAt(i)) * Math.pow(2, j);
            }
            creator_ga(
              "send",
              "event",
              "calculator",
              "calculator.64",
              "calculator.64.dec",
            );
            creator_ga(
              "send",
              "event",
              "calculator",
              "calculator.64",
              "calculator.64." + this.calculator.decimal,
            );
          }
          break;
      }
    },
    debounce: _.debounce(function (param, e) {
      console_log(param);
      console_log(e);
      e.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      var re = new RegExp("'", "g");
      e = e.replace(re, '"');
      re = new RegExp("[\f]", "g");
      e = e.replace(re, "\\f");
      re = new RegExp("[\n]", "g");
      e = e.replace(re, "\\n");
      re = new RegExp("[\r]", "g");
      e = e.replace(re, "\\r");
      re = new RegExp("[\t]", "g");
      e = e.replace(re, "\\t");
      re = new RegExp("[\v]", "g");
      e = e.replace(re, "\\v");
      if (e == "") {
        this[param] = null;
        return;
      }
      console_log("this." + param + "= '" + e + "'");
      eval("this." + param + "= '" + e + "'");
      app.$forceUpdate();
    }, getDebounceTime()),
  },
  template:
    ' <b-modal :id="id"' +
    '          title="Floating Point Calculator"' +
    "          hide-footer" +
    '          size="lg">' +
    " " +
    '   <b-container fluid align-h="center" class="mx-0 px-0">' +
    '     <b-row cols-xl="2" cols-lg="2" cols-md="1" cols-sm="1" cols-xs="1" cols="1" align-h="center">' +
    "       <b-col>" +
    '         <b-form-group v-slot="{ ariaDescribedby }">' +
    "           <b-form-radio-group" +
    '             class="w-100"' +
    '             v-model="bits"' +
    '             :options="bits_options"' +
    '             button-variant="outline-primary"' +
    '             size="sm"' +
    '             :aria-describedby="ariaDescribedby"' +
    '             name="radios-btn-default"' +
    "             buttons" +
    '             @input="changeBitsCalculator"' +
    "           ></b-form-radio-group>" +
    "         </b-form-group>" +
    "       </b-col>" +
    "     </b-row>" +
    "   </b-container>" +
    " " +
    '   <b-container fluid align-h="start" class="mx-0 px-0">' +
    '     <b-row cols="1" align-h="start">' +
    '       <b-col lg="6" offset-lg="2" class="pt-3">' +
    '         <b-form-input class="form-control form-control-sm" ' +
    "                       v-on:input=\"debounce('calculator.hexadecimal', $event)\" " +
    '                       :value="calculator.hexadecimal" ' +
    '                       @change="calculatorFunct(0)" ' +
    '                       placeholder="Enter hexadecimal number" ' +
    '                       :maxlength="calculator.lengthHexadecimal" ' +
    '                       title="Hexadecimal">' +
    "         </b-form-input>" +
    "       </b-col>" +
    "     </b-row>" +
    "   </b-container>" +
    " " +
    '   <b-container fluid align-h="start" class="mx-0 px-0">' +
    '     <b-row cols="1" align-h="start">' +
    '       <b-col lg="8" offset-lg="1" class="p-1">' +
    '         <b-img class="calculatorImg" src="./images/calculator.png" fluid alt="calculator"></b-img>' +
    "       </b-col>" +
    "     </b-row>" +
    "   </b-container>" +
    " " +
    '   <b-container fluid align-h="start" class="mx-0 px-0">' +
    '     <b-row cols="3" align-h="start">' +
    '       <b-col lg="1" cols="2" offset-lg="1" class="p-1">' +
    '         <b-form-input class="form-control form-control-sm" ' +
    "                       v-on:input=\"debounce('calculator.sign', $event)\" " +
    '                       :value="calculator.sign" ' +
    '                       @change="calculatorFunct(1)" ' +
    '                       placeholder="Enter sign" ' +
    '                       :maxlength="calculator.lengthSign" ' +
    '                       title="Sign">' +
    "         </b-form-input>" +
    "       </b-col>" +
    '       <b-col lg="3" cols="4" class="p-1">' +
    '         <b-form-input class="form-control form-control-sm" ' +
    "                       v-on:input=\"debounce('calculator.exponent', $event)\" " +
    '                       :value="calculator.exponent" ' +
    '                       @change="calculatorFunct(1)" ' +
    '                       placeholder="Enter exponent" ' +
    '                       :maxlength="calculator.lengthExponent" ' +
    '                       title="Exponent">' +
    "         </b-form-input>" +
    "       </b-col>" +
    '       <b-col lg="4" cols="6" class="p-1">' +
    '         <b-form-input class="form-control form-control-sm" ' +
    "                       v-on:input=\"debounce('calculator.mantissa', $event)\" " +
    '                       :value="calculator.mantissa" ' +
    '                       @change="calculatorFunct(1)" ' +
    '                       placeholder="Enter mantissa" ' +
    '                       :maxlength="calculator.lengthMantissa" ' +
    '                       title="Mantisa">' +
    "         </b-form-input>" +
    "       </b-col>" +
    "     </b-row>" +
    "   </b-container>" +
    " " +
    '   <b-container fluid align-h="start" class="mx-0 px-0 text-center">' +
    '     <b-row cols="4" align-h="start">' +
    '       <b-col lg="1" cols="2" offset-lg="1" class="p-1">' +
    '         <span class="fas fa-long-arrow-alt-down p-1"></span>' +
    "         <br>" +
    '         <span class="h5">' +
    "           -1<sup>{{calculator.sign}}</sup>   * " +
    "         </span>" +
    "       </b-col>" +
    '       <b-col lg="3" cols="4" class="p-1">' +
    '         <span class="fas fa-long-arrow-alt-down p-1"></span>' +
    "         <br>" +
    '         <span class="h5" v-if="calculator.bits == 32">' +
    "           2<sup v-if=\"calculator.exponent == '' || calculator.exponent != 0\">{{calculator.exponentDec}}-127</sup><sup v-if=\"calculator.exponent != '' && calculator.exponent == 0 && calculator.mantissa != 0\">{{calculator.exponentDec}}-126</sup>   * " +
    "         </span>" +
    '         <span class="h5" v-if="calculator.bits == 64">' +
    "           2<sup v-if=\"calculator.exponent == '' || calculator.exponent != 0\">{{calculator.exponentDec}}-1023</sup><sup v-if=\"calculator.exponent != '' && calculator.exponent == 0 && calculator.mantissa != 0\">{{calculator.exponentDec}}-1022</sup>   * " +
    "         </span>" +
    "       </b-col>" +
    '       <b-col lg="4" cols="6" class="p-1">' +
    '         <span class="fas fa-long-arrow-alt-down p-1"></span>' +
    "         <br>" +
    '         <span class="h5">' +
    "           {{calculator.mantissaDec}} = " +
    "         </span>" +
    "       </b-col>" +
    '       <b-col lg="3" cols="12" class="pt-3">' +
    '         <b-form-input class="form-control form-control-sm" ' +
    "                       v-on:input=\"debounce('calculator.decimal', $event)\" " +
    '                       :value="calculator.decimal" ' +
    '                       @change="calculatorFunct(2)" ' +
    '                       placeholder="Enter decimal number" ' +
    '                       title="Decimal">' +
    "         </b-form-input>" +
    "       </b-col>" +
    "     </b-row>" +
    "   </b-container>" +
    " " +
    '   <b-container fluid align-h="center" class="mx-0 px-0">' +
    '     <b-row cols="1" align-h="center">' +
    '       <b-col class="pt-2">' +
    '         <b-button class="btn btn-sm btn-block" variant="primary">Convert</b-button>' +
    "       </b-col>" +
    "     </b-row>" +
    "   </b-container>" +
    " </b-modal>",
};
Vue.component("calculator", uielto_calculator);
function getDebounceTime() {
  if (screen.width > 768) {
    return 500;
  } else {
    return 1e3;
  }
}
var uielto_execution = {
  props: {
    instructions: { type: Array, required: true },
    enter: { type: String, required: true },
  },
  data: function () {
    return {
      archInstructions: [
        "Break",
        "Address",
        "Label",
        "userInstructions",
        "loadedInstructions",
        "tag",
      ],
    };
  },
  methods: {
    filter(row, filter) {
      if (row.hide === true) {
        return false;
      } else {
        return true;
      }
    },
    breakPoint(record, index) {
      for (var i = 0; i < instructions.length; i++) {
        if (instructions[i].Address == record.Address) {
          index = i;
          break;
        }
      }
      if (instructions[index].Break == null) {
        instructions[index].Break = true;
        app._data.instructions[index].Break = true;
        creator_ga(
          "send",
          "event",
          "execute",
          "execute.breakpoint",
          "execute.breakpoint",
        );
      } else if (instructions[index].Break === true) {
        instructions[index].Break = null;
        app._data.instructions[index].Break = null;
      }
    },
  },
  template:
    ' <b-container fluid align-h="between" class="mx-0 px-1">' +
    '   <b-row cols="1" >' +
    '     <b-col align-h="center">' +
    " " +
    '       <b-table id="inst_table" ' +
    "                sticky-header " +
    "                striped " +
    "                small " +
    "                hover " +
    '                :items="instructions" ' +
    '                :fields="archInstructions" ' +
    '                class="instructions_table responsive" ' +
    '                @row-clicked="breakPoint" ' +
    "                :filter-function=filter " +
    '                filter=" " ' +
    '                primary-key="Address">' +
    " " +
    "         \x3c!-- Change the title of each column --\x3e" +
    '         <template v-slot:head(userInstructions)="row">' +
    "           User Instruction" +
    "         </template>" +
    " " +
    '         <template v-slot:head(loadedInstructions)="row">' +
    "           Loaded Instructions" +
    "         </template>" +
    " " +
    '         <template v-slot:head(tag)="row">' +
    "          &nbsp;" +
    "         </template>" +
    " " +
    "         \x3c!-- For each instruction --\x3e" +
    '         <template v-slot:cell(Break)="row">' +
    '           <div class="break" :id="row.index">' +
    '             <br v-if="row.item.Break == null">' +
    '             <b-img alt="Break" ' +
    '                    src="./images/stop_classic.gif" ' +
    '                    class="shadow breakPoint" ' +
    '                    rounded="circle" ' +
    '                    v-if="row.item.Break == true">' +
    "             </b-img>" +
    "           </div>" +
    "         </template>" +
    " " +
    '         <template v-slot:cell(Address)="row">' +
    '           <span class="h6">{{row.item.Address}}</span>' +
    "         </template>" +
    " " +
    '         <template v-slot:cell(Label)="row">' +
    '           <b-badge pill variant="info">{{row.item.Label}}</b-badge>' +
    "         </template>" +
    " " +
    '         <template v-slot:cell(userInstructions)="row">' +
    '           <span class="h6" v-if="row.item.visible == true">{{row.item.user}}</span>' +
    '           <span class="h6" v-if="row.item.visible == false">&lt;&lt;Hidden&gt;&gt;</span>' +
    "         </template>" +
    " " +
    '         <template v-slot:cell(loadedInstructions)="row">' +
    '           <span class="h6" v-if="row.item.visible == true">{{row.item.loaded}}</span>' +
    '           <span class="h6" v-if="row.item.visible == false">&lt;&lt;Hidden&gt;&gt;</span>' +
    "         </template> " +
    " " +
    '         <template v-slot:cell(tag)="row">' +
    '           <b-badge variant="warning" ' +
    '                    class="border border-warning shadow executionTag" ' +
    "                    v-if=\"row.item._rowVariant=='warning'\">" +
    "             Interrupted" +
    "           </b-badge>" +
    '           <b-badge variant="info" ' +
    '                    class="border border-info shadow executionTag" ' +
    "                    v-if=\"row.item._rowVariant=='info' && enter == false\">" +
    "             Current-Keyboard" +
    "           </b-badge>" +
    '           <b-badge variant="success" ' +
    '                    class="border border-success shadow executionTag" ' +
    "                    v-if=\"row.item._rowVariant=='success'\">" +
    "             Next" +
    "           </b-badge>" +
    '           <b-badge variant="info" class="border border-info shadow executionTag" ' +
    "                    v-if=\"row.item._rowVariant=='info' && enter == null\">" +
    "             Current" +
    "           </b-badge>" +
    " " +
    "         </template> " +
    " " +
    '         <template slot-scope="row">' +
    '           <span class="h6" v-if="row.item.visible == true">{{row.item.loaded}}</span>' +
    '           <span class="h6" v-if="row.item.visible == false">&lt;&lt;Hidden&gt;&gt;</span>' +
    "         </template> " +
    "       </b-table>" +
    "     </b-col>" +
    "   </b-row>" +
    " </b-container>",
};
Vue.component("table-execution", uielto_execution);
var uielto_data_view_selector = {
  props: {
    data_mode: { type: String, required: true },
    register_file_num: { type: Number, required: true },
  },
  data: function () {
    return {
      current_reg_type: "int_registers",
      current_reg_name: "INT Registers",
      reg_representation_options: [
        { text: "INT/Ctrl Registers", value: "int_registers" },
        { text: "FP Registers", value: "fp_registers" },
      ],
    };
  },
  methods: {
    change_data_view(e) {
      app._data.data_mode = e;
      if (e == "int_registers") {
        this.current_reg_type = "int_registers";
      } else if (e == "fp_registers") {
        this.current_reg_type = "fp_registers";
      }
      creator_ga(
        "send",
        "event",
        "data",
        "data.view",
        "data.view." + app._data.data_mode,
      );
    },
    get_pressed(button) {
      if (button == "registers") {
        if (
          app._data.data_mode == "int_registers" ||
          app._data.data_mode == "fp_registers"
        ) {
          return "secondary";
        } else {
          return "outline-secondary";
        }
      }
      return button == app._data.data_mode;
    },
    get_register_name() {
      if (app._data.data_mode == "int_registers") {
        current_reg_name = "INT/Ctrl Registers";
      }
      if (app._data.data_mode == "fp_registers") {
        current_reg_name = "FP Registers";
      }
      return current_reg_name;
    },
  },
  computed: {},
  template:
    '<b-container fluid align-h="center" class="mx-0 px-2">' +
    '  <b-row cols="1" >' +
    "" +
    '    <b-col class="px-1">' +
    '      <b-button-group class="w-100 pb-3">' +
    "" +
    '        <b-button v-if="register_file_num <= 4"' +
    '                  v-for="item in reg_representation_options"' +
    '                  :id="item.value"' +
    '                  size="sm"' +
    '                  :pressed="get_pressed(item.value)"' +
    '                  variant="outline-secondary"' +
    '                  @click="change_data_view(item.value)">' +
    "          {{item.text}}" +
    "        </b-button>" +
    "" +
    "        <b-dropdown split" +
    '                    v-if="register_file_num > 4"' +
    "                    right" +
    '                    :text="get_register_name()"' +
    '                    size="sm"' +
    "                    :variant=\"get_pressed('registers')\"" +
    '                    @click="change_data_view(current_reg_type)">' +
    "          <b-dropdown-item @click=\"change_data_view('int_registers')\">CPU-INT/Ctrl Registers</b-dropdown-item>" +
    "          <b-dropdown-item @click=\"change_data_view('fp_registers')\">CPU-FP Registers</b-dropdown-item>" +
    "        </b-dropdown>" +
    "" +
    '        <b-button id="memory_btn"' +
    '                  size="sm"' +
    "                  :pressed=\"get_pressed('memory')\"" +
    '                  variant="outline-secondary"' +
    "                  @click=\"change_data_view('memory')\">" +
    '          <span class="fas fa-memory"></span>' +
    "          Memory" +
    "        </b-button>" +
    "" +
    '        <b-button id="stats_btn"' +
    '                  size="sm"' +
    "                  :pressed=\"get_pressed('stats')\"" +
    '                  variant="outline-secondary"' +
    "                  @click=\"change_data_view('stats')\">" +
    '          <span class=" fas fa-chart-bar"></span>' +
    "          Stats" +
    "        </b-button>" +
    "" +
    '        <b-button id="stats_btn"' +
    '                  size="sm"' +
    "                  :pressed=\"get_pressed('clk_cycles')\"" +
    '                  variant="outline-secondary"' +
    "                  @click=\"change_data_view('clk_cycles')\">" +
    '          <span class="fa-regular fa-clock"></span>' +
    "          CLK Cyles" +
    "        </b-button>" +
    "        " +
    "      </b-button-group>" +
    "    </b-col>" +
    "" +
    "  </b-row>" +
    "</b-container>",
};
Vue.component("data-view-selector", uielto_data_view_selector);
var uielto_register_file = {
  props: {
    render: { type: Number, required: true },
    data_mode: { type: String, required: true },
  },
  data: function () {
    return {
      local_data_mode: "int_registers",
      reg_representation: "signed",
      reg_representation_options_int: [
        { text: "Signed", value: "signed" },
        { text: "Unsigned", value: "unsigned" },
        { text: "Hex", value: "hex" },
      ],
      reg_representation_options_fp: [
        { text: "IEEE 754 (32 bits)", value: "ieee32" },
        { text: "IEEE 754 (64 bits)", value: "ieee64" },
      ],
      reg_name_representation: "all",
      reg_name_representation_options: [
        { text: "Name", value: "logical" },
        { text: "Alias", value: "alias" },
        { text: "All", value: "all" },
      ],
    };
  },
  methods: {
    mk_reg_representation_options() {
      if (
        this._props.data_mode == "int_registers" ||
        this._props.data_mode == "ctrl_registers"
      ) {
        if (this._props.data_mode != this.local_data_mode) {
          this.reg_representation = "signed";
          this.local_data_mode = this._props.data_mode;
        }
        return this.reg_representation_options_int;
      } else {
        if (this._props.data_mode != this.local_data_mode) {
          this.reg_representation = "ieee32";
          this.local_data_mode = this._props.data_mode;
        }
        return this.reg_representation_options_fp;
      }
    },
  },
  template:
    " <div>" +
    '   <b-container fluid align-h="between" class="mx-0 my-3 px-2">' +
    '     <b-row cols-xl="2" cols-lg="1" cols-md="2" cols-sm="1" cols-xs="1" cols="1">' +
    '       <b-col cols="12" xl="6" md="6" align-h="start" class="px-2 col">' +
    '         <div class="border m-1 py-1 px-2">' +
    '           <b-badge variant="light" class="h6 groupLabelling border mx-2 my-0">Register value representation</b-badge>' +
    '           <b-form-group class="mb-2" v-slot="{ ariaDescribedby }">' +
    "             <b-form-radio-group" +
    '               id="btn-radios-1"' +
    '               class="w-100"' +
    '               v-model="reg_representation"' +
    '               :options="mk_reg_representation_options()"' +
    '               button-variant="outline-secondary"' +
    '               size="sm"' +
    '               :aria-describedby="ariaDescribedby"' +
    '               name="radios-btn-default"' +
    "               buttons" +
    "             ></b-form-radio-group>" +
    "           </b-form-group>" +
    "         </div >" +
    "       </b-col>" +
    " " +
    '       <b-col cols="12" xl="6" md="6" align-h="end" class="px-2 col">' +
    '         <div class="border m-1 py-1 px-2">' +
    '           <b-badge variant="light" class="h6 groupLabelling border mx-2 my-0">Register name representation</b-badge>' +
    '           <b-form-group class="mb-2" v-slot="{ ariaDescribedby }">' +
    "             <b-form-radio-group" +
    '               id="btn-radios-2"' +
    '               class="w-100"' +
    '               v-model="reg_name_representation"' +
    '               :options="reg_name_representation_options"' +
    '               button-variant="outline-secondary"' +
    '               size="sm"' +
    '               :aria-describedby="ariaDescribedby"' +
    '               name="radios-btn-default"' +
    "               buttons" +
    "             ></b-form-radio-group>" +
    "           </b-form-group>" +
    "         </div >" +
    "       </b-col>" +
    "     </b-row>" +
    "   </b-container>" +
    "   " +
    " " +
    '   <b-container fluid align-h="center" class="mx-0 px-3 my-2">' +
    '     <b-row align-h="center" cols="1">' +
    '       <b-col v-for="item in architecture_hash">' +
    '         <b-container fluid align-h="center" class="px-0 mx-0 mb-2" v-if="(data_mode == architecture.components[item.index].type) || (data_mode == \'int_registers\' && architecture.components[item.index].type == \'ctrl_registers\')">' +
    '           <b-row align-h="start" cols-xl="4" cols-lg="4" cols-md="4" cols-sm="3" cols-xs="3" cols="3">' +
    '             <b-col class="p-1 mx-0" v-for="(item2, index) in architecture.components[item.index].elements">' +
    " " +
    '               <register :render="render"' +
    '                         :component="item"' +
    '                         :register="item2"' +
    '                         :name_representation="reg_name_representation"' +
    '                         :value_representation="reg_representation">' +
    "               </register>" +
    " " +
    "            </b-col>" +
    "           </b-row>" +
    "         </b-container>" +
    "       </b-col>" +
    "     </b-row>" +
    "   </b-container>" +
    " </div>",
};
Vue.component("register-file", uielto_register_file);
var uielto_register = {
  props: {
    render: { type: Number, required: true },
    component: { type: Object, required: true },
    register: { type: Object, required: true },
    name_representation: { type: String, required: true },
    value_representation: { type: String, required: true },
  },
  methods: {
    popover_id(name) {
      return "popoverValueContent" + name[0];
    },
    show_value(register) {
      var ret = 0;
      switch (this.value_representation) {
        case "signed":
          if (
            architecture.components[this._props.component.index].type ==
              "ctrl_registers" ||
            architecture.components[this._props.component.index].type ==
              "int_registers"
          ) {
            if (
              register.value
                .toString(2)
                .padStart(register.nbits, "0")
                .charAt(0) == 1
            ) {
              ret = parseInt(register.value.toString(10)) - 4294967296;
            }
            if (
              register.value
                .toString(2)
                .padStart(register.nbits, "0")
                .charAt(0) == 0
            ) {
              ret = register.value.toString(10);
            }
          } else {
            if (
              architecture.components[this._props.component.index]
                .double_precision === false
            ) {
              ret = float2int_v2(bi_BigIntTofloat(register.value));
            } else {
              ret = double2int_v2(bi_BigIntTodouble(register.value));
            }
          }
          break;
        case "unsigned":
          if (
            architecture.components[this._props.component.index].type ==
              "ctrl_registers" ||
            architecture.components[this._props.component.index].type ==
              "int_registers"
          ) {
            ret = parseInt(register.value.toString(10)) >>> 0;
          } else {
            if (
              architecture.components[this._props.component.index]
                .double_precision === false
            ) {
              ret = float2int_v2(bi_BigIntTofloat(register.value)) >>> 0;
            } else {
              ret = double2int_v2(bi_BigIntTodouble(register.value)) >>> 0;
            }
          }
          break;
        case "ieee32":
          if (
            architecture.components[this._props.component.index].type ==
              "ctrl_registers" ||
            architecture.components[this._props.component.index].type ==
              "int_registers"
          ) {
            ret = hex2float(
              "0x" + register.value.toString(16).padStart(8, "0"),
            );
          } else {
            ret = bi_BigIntTofloat(register.value);
          }
          break;
        case "ieee64":
          if (
            architecture.components[this._props.component.index].type ==
              "ctrl_registers" ||
            architecture.components[this._props.component.index].type ==
              "int_registers"
          ) {
            ret = hex2double(
              "0x" + register.value.toString(16).padStart(16, "0"),
            );
          } else {
            ret = bi_BigIntTodouble(register.value);
          }
          break;
        case "hex":
          if (
            architecture.components[this._props.component.index].type ==
              "ctrl_registers" ||
            architecture.components[this._props.component.index].type ==
              "int_registers"
          ) {
            ret = register.value
              .toString(16)
              .padStart(register.nbits / 4, "0")
              .toUpperCase();
          } else {
            if (
              architecture.components[this._props.component.index]
                .double_precision === false
            ) {
              ret = bin2hex(float2bin(bi_BigIntTofloat(register.value)));
            } else {
              ret = bin2hex(double2bin(bi_BigIntTodouble(register.value)));
            }
          }
          break;
      }
      if (this._props.component.double_precision_type == "linked") {
        ret = ret.toString();
        if (ret.length > 10) {
          return ret.slice(0, 8) + "...";
        }
      }
      return ret;
    },
    show_value_truncate(register) {
      var ret = this.show_value(register).toString();
      if (ret.length > 8) {
        ret = ret.slice(0, 8) + "...";
      }
      return ret;
    },
    reg_name(register) {
      switch (this.name_representation) {
        case "logical":
          return register.name[0];
        case "alias":
          if (typeof register.name[1] === "undefined") {
            return register.name[0];
          }
          return register.name.slice(1, register.name.length).join(" | ");
        case "all":
          return register.name.join(" | ");
      }
    },
  },
  template:
    "<div>" +
    ' <b-button class="btn btn-outline-secondary btn-sm registers w-100 h-100" ' +
    '           :id="popover_id(register.name)" ' +
    "           onclick=\"creator_ga('data', 'data.view', 'data.view.registers_details');\">" +
    '   <span class="text-truncate">{{reg_name(register)}}</span> ' +
    '   <b-badge class="regValue registerValue"> ' +
    "     {{show_value_truncate(register)}}" +
    "   </b-badge>" +
    " </b-button>" +
    " " +
    ' <popover-register :target="popover_id(register.name)" ' +
    '                   :component="component"' +
    '                   :register="register">' +
    " </popover-register>" +
    "</div>",
};
Vue.component("register", uielto_register);
var uielto_register_popover = {
  props: {
    target: { type: String, required: true },
    component: { type: Object, required: true },
    register: { type: Object, required: true },
  },
  data: function () {
    return { newValue: "", precision: "true" };
  },
  methods: {
    closePopover() {
      this.$root.$emit("bv::hide::popover");
    },
    show_value(register, view) {
      var ret = 0;
      switch (view) {
        case "hex":
          if (
            architecture.components[this._props.component.index].type ==
              "ctrl_registers" ||
            architecture.components[this._props.component.index].type ==
              "int_registers"
          ) {
            ret = register.value
              .toString(16)
              .padStart(register.nbits / 4, "0")
              .toUpperCase();
          } else {
            if (
              architecture.components[this._props.component.index]
                .double_precision === false
            ) {
              ret = bin2hex(float2bin(bi_BigIntTofloat(register.value)));
            } else {
              ret = bin2hex(double2bin(bi_BigIntTodouble(register.value)));
            }
          }
          break;
        case "bin":
          if (
            architecture.components[this._props.component.index].type ==
              "ctrl_registers" ||
            architecture.components[this._props.component.index].type ==
              "int_registers"
          ) {
            ret = register.value.toString(2).padStart(register.nbits, "0");
          } else {
            if (
              architecture.components[this._props.component.index]
                .double_precision === false
            ) {
              ret = float2bin(bi_BigIntTofloat(register.value));
            } else {
              ret = double2bin(bi_BigIntTodouble(register.value));
            }
          }
          break;
        case "signed":
          if (
            architecture.components[this._props.component.index].type ==
              "ctrl_registers" ||
            architecture.components[this._props.component.index].type ==
              "int_registers"
          ) {
            if (
              register.value
                .toString(2)
                .padStart(register.nbits, "0")
                .charAt(0) == 1
            ) {
              ret = parseInt(register.value.toString(10)) - 4294967296;
            }
            if (
              register.value
                .toString(2)
                .padStart(register.nbits, "0")
                .charAt(0) == 0
            ) {
              ret = register.value.toString(10);
            }
          } else {
            if (
              architecture.components[this._props.component.index]
                .double_precision === false
            ) {
              ret = float2int_v2(bi_BigIntTofloat(register.value));
            } else {
              ret = double2int_v2(bi_BigIntTodouble(register.value));
            }
          }
          break;
        case "unsigned":
          if (
            architecture.components[this._props.component.index].type ==
              "ctrl_registers" ||
            architecture.components[this._props.component.index].type ==
              "int_registers"
          ) {
            ret = parseInt(register.value.toString(10)) >>> 0;
          } else {
            if (
              architecture.components[this._props.component.index]
                .double_precision === false
            ) {
              ret = float2int_v2(bi_BigIntTofloat(register.value)) >>> 0;
            } else {
              ret = double2int_v2(bi_BigIntTodouble(register.value)) >>> 0;
            }
          }
          break;
        case "char":
          if (
            architecture.components[this._props.component.index].type ==
              "ctrl_registers" ||
            architecture.components[this._props.component.index].type ==
              "int_registers"
          ) {
            ret = hex2char8(
              register.value.toString(16).padStart(register.nbits / 4, "0"),
            );
          } else {
            if (
              architecture.components[this._props.component.index]
                .double_precision === false
            ) {
              ret = hex2char8(
                bin2hex(float2bin(bi_BigIntTofloat(register.value))),
              );
            } else {
              ret = hex2char8(
                bin2hex(double2bin(bi_BigIntTodouble(register.value))),
              );
            }
          }
          break;
        case "ieee32":
          if (
            architecture.components[this._props.component.index].type ==
              "ctrl_registers" ||
            architecture.components[this._props.component.index].type ==
              "int_registers"
          ) {
            ret = hex2float(
              "0x" + register.value.toString(16).padStart(8, "0"),
            );
          } else {
            ret = bi_BigIntTofloat(register.value);
          }
          break;
        case "ieee64":
          if (
            architecture.components[this._props.component.index].type ==
              "ctrl_registers" ||
            architecture.components[this._props.component.index].type ==
              "int_registers"
          ) {
            ret = hex2double(
              "0x" + register.value.toString(16).padStart(16, "0"),
            );
          } else {
            ret = bi_BigIntTodouble(register.value);
          }
          break;
      }
      ret = ret.toString();
      return ret;
    },
    update_register(comp, elem, type, precision) {
      for (var i = 0; i < architecture.components[comp].elements.length; i++) {
        if (type == "int_registers" || type == "ctrl_registers") {
          if (
            architecture.components[comp].elements[i].name == elem &&
            this.newValue.match(/^0x/)
          ) {
            var value = this.newValue.split("x");
            if (
              value[1].length * 4 >
              architecture.components[comp].elements[i].nbits
            ) {
              value[1] = value[1].substring(
                (value[1].length * 4 -
                  architecture.components[comp].elements[i].nbits) /
                  4,
                value[1].length,
              );
            }
            writeRegister(parseInt(value[1], 16), comp, i, "int_registers");
          } else if (
            architecture.components[comp].elements[i].name == elem &&
            this.newValue.match(/^(\d)+/)
          ) {
            writeRegister(
              parseInt(this.newValue, 10),
              comp,
              i,
              "int_registers",
            );
          } else if (
            architecture.components[comp].elements[i].name == elem &&
            this.newValue.match(/^-/)
          ) {
            writeRegister(
              parseInt(this.newValue, 10),
              comp,
              i,
              "int_registers",
            );
          }
        } else if (type == "fp_registers") {
          if (precision === false) {
            if (
              architecture.components[comp].elements[i].name == elem &&
              this.newValue.match(/^0x/)
            ) {
              writeRegister(hex2float(this.newValue), comp, i, "SFP-Reg");
            } else if (
              architecture.components[comp].elements[i].name == elem &&
              this.newValue.match(/^(\d)+/)
            ) {
              writeRegister(parseFloat(this.newValue, 10), comp, i, "SFP-Reg");
            } else if (
              architecture.components[comp].elements[i].name == elem &&
              this.newValue.match(/^-/)
            ) {
              writeRegister(parseFloat(this.newValue, 10), comp, i, "SFP-Reg");
            }
          } else if (precision === true) {
            if (
              architecture.components[comp].elements[i].name == elem &&
              this.newValue.match(/^0x/)
            ) {
              writeRegister(hex2double(this.newValue), comp, i, "DFP-Reg");
            } else if (
              architecture.components[comp].elements[i].name == elem &&
              this.newValue.match(/^(\d)+/)
            ) {
              writeRegister(parseFloat(this.newValue, 10), comp, i, "DFP-Reg");
            } else if (
              architecture.components[comp].elements[i].name == elem &&
              this.newValue.match(/^-/)
            ) {
              writeRegister(parseFloat(this.newValue, 10), comp, i, "DFP-Reg");
            }
          }
        }
      }
      this.newValue = "";
      creator_ga("data", "data.change", "data.change.register_value");
      creator_ga("data", "data.change", "data.change.register_value_" + elem);
    },
    get_cols(index) {
      if (architecture.components[index].double_precision === true) {
        return 3;
      } else {
        return 2;
      }
    },
  },
  template:
    '<b-popover :target="target" ' +
    '           triggers="click blur" ' +
    '           class="popover">' +
    "  <template v-slot:title>" +
    '    <b-button @click="closePopover" class="close" aria-label="Close">' +
    '      <span class="d-inline-block" aria-hidden="true">&times;</span>' +
    "    </b-button>" +
    "    {{register.name.join(' | ')}}" +
    "  </template>" +
    "" +
    '  <table class="table table-bordered table-sm popoverText">' +
    "    <tbody>" +
    "      <tr>" +
    "        <td>Hex.</td>" +
    "        <td>" +
    '          <b-badge class="registerPopover">' +
    "            {{show_value(register, 'hex')}}" +
    "          </b-badge>" +
    "        </td>" +
    "      </tr>" +
    "      <tr>" +
    "        <td>Binary</td>" +
    "        <td>" +
    '          <b-badge class="registerPopover">' +
    "            {{show_value(register, 'bin')}}" +
    "          </b-badge>" +
    "        </td>" +
    "      </tr>" +
    "      <tr v-if=\"architecture.components[component.index].type != 'fp_registers'\">" +
    "        <td>Signed</td>" +
    "        <td>" +
    '          <b-badge class="registerPopover">' +
    "            {{show_value(register, 'signed')}}" +
    "          </b-badge>" +
    "        </td>" +
    "      </tr>" +
    "      <tr v-if=\"architecture.components[component.index].type != 'fp_registers'\">" +
    "        <td>Unsig.</td>" +
    "        <td>" +
    '          <b-badge class="registerPopover">' +
    "            {{show_value(register, 'unsigned')}}" +
    "          </b-badge>" +
    "        </td>" +
    "      </tr>" +
    "      <tr v-if=\"architecture.components[component.index].type != 'fp_registers'\">" +
    "        <td>Char</td>" +
    "        <td>" +
    '          <b-badge class="registerPopover">' +
    "            {{show_value(register, 'char')}}" +
    "          </b-badge>" +
    "        </td>" +
    "      </tr>" +
    "      <tr>" +
    "        <td>IEEE 754 (32 bits)</td>" +
    "        <td>" +
    '          <b-badge class="registerPopover">' +
    "            {{show_value(register, 'ieee32')}}" +
    "          </b-badge>" +
    "        </td>" +
    "      </tr>" +
    "      <tr>" +
    "        <td>IEEE 754 (64 bits)</td>" +
    "        <td>" +
    '          <b-badge class="registerPopover">' +
    "            {{show_value(register, 'ieee64')}}" +
    "          </b-badge>" +
    "        </td>" +
    "      </tr>" +
    "    </tbody>" +
    "  </table>" +
    "" +
    '   <b-container fluid align-h="center" class="mx-0">' +
    '     <b-row align-h="center" :cols="get_cols(component.index)">' +
    " " +
    '       <b-col class="popoverFooter">' +
    '         <b-form-input v-model="newValue" ' +
    '                       type="text" ' +
    '                       size="sm" ' +
    '                       title="New Register Value" ' +
    '                       placeholder="Enter new value">' +
    "         </b-form-input>" +
    "       </b-col>" +
    " " +
    '       <b-col v-if="architecture.components[component.index].double_precision == true">' +
    '         <b-form-select v-model="precision"' +
    '                        size="sm" block>' +
    '           <b-form-select-option value="false"       >Simple Precision</b-form-select-option>' +
    '           <b-form-select-option value="true" active>Double Precision</b-form-select-option>' +
    "         </b-form-select>" +
    "       </b-col>" +
    " " +
    "       <b-col>" +
    '         <b-button class="btn btn-primary btn-sm w-100" ' +
    "                   @click=\"update_register(component.index, register.name, architecture.components[component.index].type, precision=='true')\">" +
    "           Update" +
    "          </b-button>" +
    "       </b-col>" +
    " " +
    "     </b-row>" +
    "   </b-container>" +
    "</b-popover>",
};
Vue.component("popover-register", uielto_register_popover);
var uielto_memory = {
  props: {
    main_memory: { type: Array, required: true },
    memory_segment: { type: String, required: true },
    track_stack_names: { type: Array, required: true },
    callee_subrutine: { type: String, required: true },
    caller_subrutine: { type: String, required: true },
    stack_total_list: { type: Number, required: true },
    main_memory_busy: { type: Boolean, required: true },
  },
  data: function () {
    return {
      mem_representation: "data_memory",
      mem_representation_options: [
        { text: "Data", value: "data_memory" },
        { text: "Text", value: "instructions_memory" },
        { text: "Stack", value: "stack_memory" },
      ],
    };
  },
  methods: {},
  template:
    ' <b-container fluid align-h="center" class="mx-0 my-3 px-2">' +
    '   <b-row cols-xl="2" cols-lg="1" cols-md="2" cols-sm="1" cols-xs="1" cols="1">' +
    '     <b-col align-h="center" class="px-2">' +
    '       <div class="border m-1 py-1 px-2">' +
    '         <b-badge variant="light" class="h6 groupLabelling border mx-2 my-0">Main memory segment</b-badge>' +
    '         <b-form-group class="mb-2" v-slot="{ ariaDescribedby }" >' +
    "           <b-form-radio-group" +
    '             id="btn-radios-1"' +
    '             class="w-100"' +
    '             v-model="mem_representation"' +
    '             :options="mem_representation_options"' +
    '             button-variant="outline-secondary"' +
    '             size="sm"' +
    '             :aria-describedby="ariaDescribedby"' +
    '             name="radios-btn-default"' +
    "             buttons" +
    "           ></b-form-radio-group>" +
    "         </b-form-group>" +
    "       </div >" +
    "     </b-col>" +
    "" +
    "     <b-col></b-col>" +
    "   </b-row>" +
    "" +
    '   <b-row cols="1">' +
    '     <b-col align-h="center" class="px-2">' +
    '       <table-mem class="my-2"' +
    '                  :main_memory="main_memory"' +
    '                  :memory_segment="mem_representation"' +
    '                  :track_stack_names="track_stack_names" ' +
    '                  :callee_subrutine="callee_subrutine" ' +
    '                  :caller_subrutine="caller_subrutine"' +
    '                  :stack_total_list="stack_total_list"' +
    '                  :main_memory_busy="main_memory_busy">' +
    "       </table-mem>" +
    "     </b-col>" +
    "   </b-row>" +
    "" +
    " </b-container>",
};
Vue.component("memory", uielto_memory);
var uielto_memory = {
  props: {
    main_memory: { type: Array, required: true },
    memory_segment: { type: String, required: true },
    track_stack_names: { type: Array, required: true },
    callee_subrutine: { type: String, required: true },
    caller_subrutine: { type: String, required: true },
    stack_total_list: { type: Number, required: true },
    main_memory_busy: { type: Boolean, required: true },
  },
  data: function () {
    return {
      memFields: ["Tag", "Address", "Binary", "Value"],
      row_info: null,
      selected_space_view: null,
      selected_stack_view: null,
    };
  },
  methods: {
    filter(row, filter) {
      var addr = parseInt(row.addr_begin);
      if (
        this.memory_segment == "instructions_memory" &&
        addr >= parseInt(architecture.memory_layout[0].value) &&
        addr <= parseInt(architecture.memory_layout[1].value)
      ) {
        if (row.hide === true) {
          return false;
        } else {
          return true;
        }
      }
      if (
        this.memory_segment == "data_memory" &&
        addr >= parseInt(architecture.memory_layout[2].value) &&
        addr <= parseInt(architecture.memory_layout[3].value)
      ) {
        return true;
      }
      if (
        this.memory_segment == "stack_memory" &&
        addr >= parseInt(architecture.memory_layout[3].value)
      ) {
        return (
          Math.abs(addr - app._data.end_callee) <
          this._props.stack_total_list * 4
        );
      }
    },
    select_data_type(record, index) {
      this.row_info = {
        index: index,
        addr: record.addr - 3,
        size: record.size,
      };
      if (this.memory_segment == "instructions_memory") {
        return;
      }
      if (this.memory_segment == "data_memory") {
        if (this.check_tag_null(record.hex)) {
          this.$root.$emit("bv::show::modal", "space_modal");
        }
      }
      if (this.memory_segment == "stack_memory") {
        this.$root.$emit("bv::show::modal", "stack_modal");
      }
    },
    change_space_view() {
      creator_memory_update_space_view(
        this.selected_space_view,
        memory_hash[0],
        this.row_info,
      );
    },
    hide_space_modal() {
      this.selected_space_view = null;
    },
    change_stack_view() {
      creator_memory_update_row_view(
        this.selected_stack_view,
        memory_hash[2],
        this.row_info,
      );
    },
    hide_stack_modal() {
      this.selected_stack_view = null;
    },
    check_tag_null(record) {
      for (var i = 0; i < record.length; i++) {
        if (record[i].tag != null) {
          return true;
        }
      }
      return false;
    },
    get_classes(row) {
      return {
        "h6Sm                ":
          row.item.addr >= parseInt(architecture.memory_layout[0].value) &&
          row.item.addr <= architecture.memory_layout[3].value,
        "h6Sm text-secondary ":
          row.item.addr < app._data.end_callee &&
          Math.abs(row.item.addr - app._data.end_callee) <
            this._props.stack_total_list * 4,
        "h6Sm text-success   ":
          row.item.addr < app._data.begin_callee &&
          row.item.addr >= app._data.end_callee,
        "h6Sm text-blue-funny":
          row.item.addr < app._data.begin_caller &&
          row.item.addr >= app._data.end_caller,
        "h6Sm                ": row.item.addr >= app._data.begin_caller,
      };
    },
  },
  computed: {
    main_memory_items() {
      return Object.entries(this.main_memory)
        .sort((a, b) => a[0] - b[0])
        .map((a) => a[1]);
    },
  },
  template:
    " <div>" +
    " " +
    '   <b-container fluid align-h="between" class="mx-0 px-0">' +
    '     <b-row align-v="start" cols="1">' +
    '       <b-col class="mx-0 pl-0 pr-2" style="min-height:35vh !important;">' +
    " " +
    "         <b-table sticky-header " +
    '                 striped ref="table"' +
    "                 small " +
    "                 hover " +
    '                 :busy="main_memory_busy"' +
    '                 :items="main_memory_items" ' +
    '                 :fields="memFields" ' +
    "                 :filter-function=filter " +
    '                 filter=" " ' +
    '                 class="memory_table align-items-start" ' +
    '                 @row-clicked="select_data_type">' +
    " " +
    "           <template #table-busy>" +
    '             <div class="text-center text-primary my-2">' +
    '               <b-spinner class="align-middle"></b-spinner>' +
    "               <strong> Running...</strong>" +
    "             </div>" +
    "           </template>" +
    " " +
    '           <template v-slot:head(Tag)="row">' +
    "             &nbsp;" +
    "           </template>" +
    " " +
    '           <template v-slot:cell(Tag)="row">' +
    '             <div v-for="item in architecture_hash">' +
    '               <div v-for="item2 in architecture.components[item.index].elements">' +
    '               <b-badge variant="info" ' +
    '                        class="border border-info shadow memoryTag" ' +
    "                        v-if=\"item2.properties.includes('global_pointer') && ((parseInt(item2.value) & 0xFFFFFFFC) == (row.item.addr & 0xFFFFFFFC))\">" +
    "                 {{item2.name[0]}}" +
    "               </b-badge>" +
    '               <span class="fas fa-long-arrow-alt-right" ' +
    "                     v-if=\"item2.properties.includes('global_pointer') && ((parseInt(item2.value) & 0xFFFFFFFC) == (row.item.addr & 0xFFFFFFFC))\">" +
    "               </span>" +
    '               <b-badge variant="success" ' +
    '                        class="border border-success shadow memoryTag" ' +
    "                        v-if=\"item2.properties.includes('program_counter') && ((parseInt(item2.value) & 0xFFFFFFFC) == (row.item.addr & 0xFFFFFFFC))\">" +
    "                 {{item2.name[0]}}" +
    "               </b-badge>" +
    '               <span class="fas fa-long-arrow-alt-right" ' +
    "                     v-if=\"item2.properties.includes('program_counter') && ((parseInt(item2.value) & 0xFFFFFFFC) == (row.item.addr & 0xFFFFFFFC))\">" +
    "               </span>" +
    '               <b-badge variant="info" ' +
    '                        class="border border-info shadow memoryTag" ' +
    "                     v-if=\"(item2.properties.includes('stack_pointer') || item2.properties.includes('frame_pointer')) && ((parseInt(item2.value) & 0xFFFFFFFC) == (row.item.addr & 0xFFFFFFFC))\">" +
    "                 {{item2.name[0]}}" +
    "               </b-badge>" +
    '               <span class="fas fa-long-arrow-alt-right" ' +
    "                 v-if=\"(item2.properties.includes('stack_pointer') || item2.properties.includes('frame_pointer') ) && ((parseInt(item2.value) & 0xFFFFFFFC) == (row.item.addr & 0xFFFFFFFC))\">" +
    "               </span>  " +
    "             </div>" +
    "           </div>" +
    "         </template>" +
    "      " +
    '         <template v-slot:cell(Address)="row">' +
    '           <div class="pt-3">' +
    '             <span v-bind:class="get_classes(row)">' +
    "               {{row.item.addr_begin}} - {{row.item.addr_end}}" +
    "             </span>" +
    "           </div>" +
    "         </template>" +
    "      " +
    '         <template v-slot:cell(Binary)="row">' +
    '           <div class="pt-3">' +
    '             <span v-bind:class="get_classes(row)">' +
    '               <span v-for="item in row.item.hex">' +
    " " +
    '                 <span v-if="item.tag == null">' +
    "                   {{item.byte.toUpperCase()}}" +
    "                 </span> " +
    " " +
    '                 <b-badge pill variant="info" ' +
    '                          class="border border-info shadow binaryTag" ' +
    '                          style="top: -2vh !important;" ' +
    '                          v-if="item.tag != null">' +
    "                   {{item.tag}}" +
    "                 </b-badge>" +
    '                 <span v-if="item.tag != null" class="memoryBorder">' +
    "                   {{item.byte.toUpperCase()}}" +
    "                 </span> " +
    " " +
    "               </span>" +
    "             </span>" +
    "           </div>" +
    "         </template>" +
    "      " +
    '         <template v-slot:cell(Value)="row">' +
    '           <div class="pt-3">' +
    '             <span v-bind:class="get_classes(row)" style="white-space: pre-wrap;">' +
    "               {{row.item.value}}" +
    '               <span class="fas fa-eye memoryValue" ' +
    '                     v-if="row.item.eye && check_tag_null(row.item.hex)">' +
    "               </span>" +
    "             </span>" +
    "           </div>" +
    "         </template>" +
    "       </b-table>" +
    " " +
    "       </b-col>" +
    "     </b-row>" +
    " " +
    '     <b-row align-v="end">' +
    "       <b-col>" +
    " " +
    '         <div class="col-lg-12 col-sm-12 row mx-0 px-2 border" v-if="memory_segment == \'stack_memory\'">' +
    '           <span class="col-lg-12 col-sm-12 my-1">' +
    '             <span>Stack memory areas: </span> <span class="fas fa-search-plus" id="stack_funct_popover"></span>' +
    "           </span>" +
    " " +
    '           <span class="badge badge-white border border-secondary text-secondary mx-1 col">Free <br>stack</span>' +
    '           <span class="badge badge-white border border-secondary text-success mx-1">Callee: <br>{{callee_subrutine}}</span>' +
    '           <span class="badge badge-white border border-secondary text-info mx-1" v-if="track_stack_names.length > 1">Caller: <br>{{caller_subrutine}}</span>' +
    '           <span class="badge badge-white border border-secondary text-dark mx-1" v-if="track_stack_names.length > 2" align-v="center"><b>&bull;&bull;&bull;<br>{{track_stack_names.length - 2}}</b></span>' +
    '           <span class="badge badge-white border border-secondary text-dark mx-1">System <br>stack</span>' +
    " " +
    '           <b-popover target="stack_funct_popover" triggers="hover" placement="top"> ' +
    "             <span>0x000...</span>" +
    '             <b-list-group class="my-2">' +
    '               <b-list-group-item v-for="(item, index) in track_stack_names.slice().reverse()"> ' +
    '                 <span class="text-success" v-if="index == 0">{{item}}</span>' +
    '                 <span class="text-info" v-if="index == 1">{{item}}</span>' +
    '                 <span class="text-dark" v-if="index > 1">{{item}}</span>' +
    "               </b-list-group-item>" +
    "             </b-list-group>" +
    "             <span>0xFFF...</span>" +
    "           </b-popover>" +
    " " +
    "         </div>" +
    " " +
    "       </b-col>" +
    "     </b-row>" +
    "   </b-container>" +
    " " +
    '   <b-modal id="space_modal" ' +
    '            size="sm" ' +
    '            title="Select space view:" ' +
    '            @hidden="hide_space_modal" ' +
    '            @ok="change_space_view">' +
    '     <b-form-radio v-model="selected_space_view" value="sig_int">Signed Integer</b-form-radio>' +
    '     <b-form-radio v-model="selected_space_view" value="unsig_int">Unsigned Integer</b-form-radio>' +
    '     <b-form-radio v-model="selected_space_view" value="float">Float</b-form-radio>' +
    '     <b-form-radio v-model="selected_space_view" value="char">Char</b-form-radio>' +
    "   </b-modal>" +
    " " +
    '   <b-modal id="stack_modal" ' +
    '            size="sm" ' +
    '            title="Select stack word view:" ' +
    '            @hidden="hide_stack_modal" ' +
    '            @ok="change_stack_view">' +
    '     <b-form-radio v-model="selected_stack_view" value="sig_int">Signed Integer</b-form-radio>' +
    '     <b-form-radio v-model="selected_stack_view" value="unsig_int">Unsigned Integer</b-form-radio>' +
    '     <b-form-radio v-model="selected_stack_view" value="float">Float</b-form-radio>' +
    '     <b-form-radio v-model="selected_stack_view" value="char">Char</b-form-radio>' +
    "   </b-modal>" +
    " " +
    "  </div>",
};
Vue.component("table-mem", uielto_memory);
var uielto_stats = {
  props: {
    stats: { type: Array, required: true },
    stats_value: { type: Number, required: true },
  },
  data: function () {
    return {
      stat_representation: "graphic",
      stat_representation_options: [
        { text: "Graphic", value: "graphic" },
        { text: "Table", value: "table" },
      ],
    };
  },
  template:
    ' <b-container fluid align-h="center" class="mx-0 my-3 px-2">' +
    '   <b-row cols-xl="2" cols-lg="1" cols-md="2" cols-sm="1" cols-xs="1" cols="1">' +
    '     <b-col align-h="center" class="px-2">' +
    '       <div class="border m-1 py-1 px-2">' +
    '         <b-badge variant="light" class="h6 groupLabelling border mx-2 my-0">Stats view</b-badge>' +
    '         <b-form-group class="mb-2" v-slot="{ ariaDescribedby }">' +
    "           <b-form-radio-group" +
    '             id="btn-radios-1"' +
    '             class="w-100"' +
    '             v-model="stat_representation"' +
    '             :options="stat_representation_options"' +
    '             button-variant="outline-secondary"' +
    '             size="sm"' +
    '             :aria-describedby="ariaDescribedby"' +
    '             name="radios-btn-default"' +
    "             buttons" +
    "           ></b-form-radio-group>" +
    "         </b-form-group>" +
    "       </div >" +
    "     </b-col>" +
    "" +
    "     <b-col></b-col>" +
    "   </b-row>" +
    "" +
    '   <b-row cols="1">' +
    '     <b-col align-h="center" class="px-2 my-2">' +
    '       <plot-stats :stats_value="stats_value" v-if="stat_representation == \'graphic\'"></plot-stats>  ' +
    '       <table-stats :stats="stats" v-if="stat_representation == \'table\'"></table-stats> ' +
    "     </b-col>" +
    "   </b-row>" +
    " </b-container>",
};
Vue.component("stats", uielto_stats);
var uielto_stats_plot = {
  components: { apexchart: VueApexCharts },
  props: { stats_value: { type: Number, required: true } },
  data: function () {
    return {
      chartOptions: {
        colors: [
          "red",
          "blue",
          "yellow",
          "purple",
          "green",
          "orange",
          "gray",
          "pink",
          "teal",
          "black",
          "lime",
          "indigo",
          "cyan",
        ],
        chart: { id: "stat_plot", type: "donut" },
        labels: [
          "Arithmetic floating point",
          "Arithmetic integer",
          "Comparison",
          "Conditional bifurcation",
          "Control",
          "Function call",
          "I/O",
          "Logic",
          "Memory access",
          "Other",
          "Syscall",
          "Transfer between registers",
          "Unconditional bifurcation",
        ],
        dataLabels: { enabled: true },
        donut: {
          labels: {
            show: true,
            total: { show: true, showAlways: true, label: "Total" },
          },
        },
        fill: {
          type: "gradient",
          gradient: {
            shade: "dark",
            type: "horizontal",
            shadeIntensity: 0.5,
            gradientToColors: undefined,
            inverseColors: true,
            opacityFrom: 1,
            opacityTo: 1,
            stops: [0, 50, 100],
            colorStops: [],
          },
          colors: [
            "red",
            "blue",
            "yellow",
            "purple",
            "green",
            "orange",
            "gray",
            "pink",
            "teal",
            "black",
            "lime",
            "indigo",
            "cyan",
          ],
        },
        legend: {
          formatter: function (val, opts) {
            return val + " - " + opts.w.globals.series[opts.seriesIndex];
          },
        },
        plotOptions: {
          pie: {
            donut: {
              labels: {
                show: true,
                total: {
                  show: true,
                  showAlways: true,
                  color: "black",
                  formatter: function (w) {
                    return w.globals.seriesTotals.reduce((a, b) => a + b, 0);
                  },
                },
              },
            },
          },
        },
      },
    };
  },
  template:
    ' <div class="stats px-0">' +
    '   <apexchart type="donut" ' +
    '              :options="chartOptions" ' +
    '              :series="stats_value" ' +
    '              height="150%" >' +
    "   </apexchart>" +
    " </div>",
};
Vue.component("plot-stats", uielto_stats_plot);
var uielto_stats_table = {
  props: { stats: { type: Array, required: true } },
  data: function () {
    return {
      statsFields: {
        type: { label: "Type", sortable: true },
        number_instructions: {
          label: "Number of instructions",
          sortable: true,
        },
        percentage: { label: "Percentage", sortable: true },
      },
    };
  },
  template:
    " <b-table striped " +
    "  small " +
    "  hover " +
    '  :items="stats" ' +
    '  :fields="statsFields" ' +
    '  class="stats text-center px-0">' +
    " <b-table>",
};
Vue.component("table-stats", uielto_stats_table);
var uielto_clk_cycles = {
  props: {
    clk_cycles: { type: Array, required: true },
    clk_cycles_value: { type: Number, required: true },
    total_clk_cycles: { type: Number, required: true },
  },
  data: function () {
    return {
      clk_cycles_representation: "graphic",
      clk_cycles_representation_options: [
        { text: "Graphic", value: "graphic" },
        { text: "Table", value: "table" },
      ],
    };
  },
  template:
    ' <b-container fluid align-h="center" class="mx-0 my-3 px-2">' +
    '   <b-row cols-xl="2" cols-lg="1" cols-md="2" cols-sm="1" cols-xs="1" cols="1">' +
    '     <b-col align-h="center" class="px-2">' +
    '       <div class="border m-1 py-1 px-2">' +
    '         <b-badge variant="light" class="h6 groupLabelling border mx-2 my-0">CLK Cycles view</b-badge>' +
    '         <b-form-group class="mb-2" v-slot="{ ariaDescribedby }">' +
    "           <b-form-radio-group" +
    '             id="btn-radios-1"' +
    '             class="w-100"' +
    '             v-model="clk_cycles_representation"' +
    '             :options="clk_cycles_representation_options"' +
    '             button-variant="outline-secondary"' +
    '             size="sm"' +
    '             :aria-describedby="ariaDescribedby"' +
    '             name="radios-btn-default"' +
    "             buttons" +
    "           ></b-form-radio-group>" +
    "         </b-form-group>" +
    "       </div >" +
    "     </b-col>" +
    "" +
    "     <b-col>" +
    '       <b-list-group class="align-items-center py-2 px-4">' +
    "         <b-list-group-item>Total CLK Cycles: {{total_clk_cycles}}</b-list-group-item>" +
    "       </b-list-group>" +
    "     </b-col>" +
    "" +
    "   </b-row>" +
    "" +
    '   <b-row cols="1">' +
    '     <b-col align-h="center" class="px-2 my-2">' +
    '       <plot-clk-cycles  :clk_cycles_value="clk_cycles_value" v-if="clk_cycles_representation == \'graphic\'"></plot-clk-cycles>  ' +
    '       <table-clk-cycles :clk_cycles="clk_cycles" v-if="clk_cycles_representation == \'table\'"></table-clk-cycles> ' +
    "     </b-col>" +
    "   </b-row>" +
    " </b-container>",
};
Vue.component("clk-cycles", uielto_clk_cycles);
var uielto_clk_cycles_plot = {
  components: { apexchart: VueApexCharts },
  props: { clk_cycles_value: { type: Number, required: true } },
  data: function () {
    return {
      chartOptions: {
        chart: { id: "clk_plot", type: "bar" },
        labels: [
          "Arithmetic floating point",
          "Arithmetic integer",
          "Comparison",
          "Conditional bifurcation",
          "Control",
          "Function call",
          "I/O",
          "Logic",
          "Memory access",
          "Other",
          "Syscall",
          "Transfer between registers",
          "Unconditional bifurcation",
        ],
        dataLabels: { enabled: true },
        plotOptions: {
          bar: {
            horizontal: false,
            columnWidth: "55%",
            endingShape: "rounded",
            distributed: true,
          },
        },
        fill: { opacity: 1 },
        legend: { show: false },
        stroke: { show: true, width: 2, colors: ["transparent"] },
        xaxis: {
          categories: [
            "Arithmetic floating point",
            "Arithmetic integer",
            "Comparison",
            "Conditional bifurcation",
            "Control",
            "Function call",
            "I/O",
            "Logic",
            "Memory access",
            "Other",
            "Syscall",
            "Transfer between registers",
            "Unconditional bifurcation",
          ],
        },
        yaxis: { title: { text: "CLK Cycles" } },
        tooltip: {
          y: {
            formatter: function (val) {
              return "CLK Cycles: " + val;
            },
          },
        },
      },
    };
  },
  template:
    ' <div class="stats px-0">' +
    '  <apexchart ref="clk_cycles_plot"' +
    '             type="bar" ' +
    '             :options="chartOptions" ' +
    '             :series="clk_cycles_value" ' +
    '             height="150%" >' +
    "   </apexchart>" +
    " </div>",
};
Vue.component("plot-clk-cycles", uielto_clk_cycles_plot);
var uielto_clk_cycles_table = {
  props: {
    render: { type: Number, required: true },
    clk_cycles: { type: Array, required: true },
  },
  data: function () {
    return {
      clk_cycles_fields: {
        type: { label: "Type", sortable: true },
        clk_cycles: { label: "CLK Cycles", sortable: true },
        percentage: { label: "Percentage", sortable: true },
      },
    };
  },
  template:
    " <b-table  striped " +
    "           small " +
    "           hover " +
    '           :items="clk_cycles" ' +
    '           :fields="clk_cycles_fields" ' +
    '           class="stats text-center px-0">' +
    " <b-table>",
};
Vue.component("table-clk-cycles", uielto_clk_cycles_table);
var uielto_monitor = {
  props: { display: { type: String, required: true } },
  template:
    ' <b-container fluid align-h="start" class="mx-0 px-0">' +
    '   <b-row cols="2" align-h="start">' +
    '     <b-col cols="1">' +
    '       <span class="fas fa-desktop fa-2x mb-2 consoleIcon"></span>' +
    "     </b-col>" +
    '     <b-col lg="11" cols="12">' +
    '       <b-form-textarea id="textarea_display" ' +
    '                        v-model="display" ' +
    '                        rows="5" ' +
    "                        disabled " +
    "                        no-resize " +
    '                        title="Display">' +
    "       </b-form-textarea>" +
    "     </b-col>" +
    "   </b-row>" +
    " </b-container>",
};
Vue.component("monitor", uielto_monitor);
var uielto_keyboard = {
  props: {
    keyboard: { type: String, required: true },
    enter: { type: String, required: true },
  },
  data: function () {
    return { local_keyboard: keyboard };
  },
  methods: {
    consoleClear() {
      this.local_keyboard = "";
      app._data.keyboard = "";
      app._data.display = "";
    },
    consoleEnter() {
      if (this.local_keyboard != "") {
        app._data.keyboard = this.local_keyboard;
        run_program = execution_mode;
        this.local_keyboard = "";
      }
    },
    debounce: _.debounce(function (param, e) {
      console_log(param);
      console_log(e);
      e.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      var re = new RegExp("'", "g");
      e = e.replace(re, '"');
      re = new RegExp("[\f]", "g");
      e = e.replace(re, "\\f");
      re = new RegExp("[\n]", "g");
      e = e.replace(re, "\\n");
      re = new RegExp("[\r]", "g");
      e = e.replace(re, "\\r");
      re = new RegExp("[\t]", "g");
      e = e.replace(re, "\\t");
      re = new RegExp("[\v]", "g");
      e = e.replace(re, "\\v");
      if (e == "") {
        this[param] = null;
        return;
      }
      console_log("this." + param + "= '" + e + "'");
      eval("this." + param + "= '" + e + "'");
      app.$forceUpdate();
    }, getDebounceTime()),
  },
  template:
    " <div>" +
    '   <b-container fluid align-h="start" class="mx-0 px-0">' +
    '     <b-row cols="2" align-h="start">' +
    '       <b-col cols="1">' +
    '         <span class="fa fa-keyboard fa-2x mb-2 consoleIcon"></span>' +
    "       </b-col>" +
    '       <b-col lg="11" cols="12">' +
    '         <b-form-textarea id="textarea_keyboard" ' +
    "                          v-on:input=\"debounce('local_keyboard', $event)\" " +
    '                          :value="local_keyboard" rows="5" ' +
    '                          no-resize :state = "enter" ' +
    '                          title="Keyboard">' +
    "         </b-form-textarea>" +
    "       </b-col>" +
    "     </b-row>" +
    "   </b-container>" +
    " " +
    '   <b-container fluid align-h="end" class="mx-0 px-0">' +
    '     <b-row cols="3" align-h="end">' +
    "       <b-col>" +
    '         <b-button class="btn btn-outline-secondary btn-block menuGroup btn-sm keyboardButton"' +
    '                   @click="consoleClear">' +
    '           <span class="fas fa-broom"></span> ' +
    "           Clear" +
    "         </b-button>" +
    "       </b-col>" +
    "       <b-col>" +
    '         <b-button id="enter_keyboard" ' +
    '                   class="btn btn-outline-secondary btn-block menuGroup btn-sm keyboardButton"' +
    '                   @click="consoleEnter">' +
    '           <span class="fas fa-level-down-alt enterIcon"></span> ' +
    "           Enter" +
    "         </b-button>" +
    "       </b-col>" +
    "     </b-row>" +
    "   </b-container>" +
    " </div>",
};
Vue.component("keyboard", uielto_keyboard);
function getDebounceTime() {
  if (screen.width > 768) {
    return 500;
  } else {
    return 1e3;
  }
}
function show_notification(msg, type) {
  var alertMessage = msg;
  var type = type;
  app.$bvToast.toast(alertMessage, {
    variant: type,
    solid: true,
    toaster: "b-toaster-top-center",
    autoHideDelay: app._data.notificationTime,
    noAutoHide: type == "danger",
  });
  var date = new Date();
  notifications.push({
    mess: alertMessage,
    color: type,
    time: date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds(),
    date:
      date.getDate() + "/" + (date.getMonth() + 1) + "/" + date.getFullYear(),
  });
  return true;
}
var loading_handler = null;
function show_loading() {
  if (loading_handler != null) {
    return;
  }
  loading_handler = setTimeout(function () {
    $("#loading").show();
    loading_handler = null;
  }, 500);
}
function hide_loading() {
  if (loading_handler != null) {
    clearTimeout(loading_handler);
    loading_handler = null;
  }
  $("#loading").hide();
}
function btn_glow(btn_name, post_label) {
  if (0 == run_program) {
    var buttonDec = "#popoverValueContent" + btn_name + post_label;
    var buttonHex = "#popoverValueContent" + btn_name;
    $(buttonDec).attr("style", "background-color:#c2c2c2;");
    $(buttonHex).attr("style", "background-color:#c2c2c2;");
    setTimeout(function () {
      $(buttonDec).attr("style", "");
      $(buttonHex).attr("style", "");
    }, 500);
  }
}
try {
  window.app = new Vue({
    el: "#app",
    data: {
      render: 0,
      version: "",
      architecture_name: "",
      architecture_guide: "",
      os: "",
      browser: "",
      notifications: notifications,
      creator_mode: "load_architecture",
      default_architecture: "none",
      stack_total_list: 40,
      notification_time: 1500,
      instruction_help_size: 33,
      autoscroll: true,
      font_size: 15,
      c_debug: false,
      dark: false,
      arch_available: architecture_available,
      back_card: back_card,
      modal_delete_arch_index: 0,
      architecture: architecture,
      architecture_hash: architecture_hash,
      modal_field_instruction: { title: "", index: null, instruction: {} },
      modal_field_pseudoinstruction: {
        title: "",
        index: null,
        pseudoinstruction: {},
      },
      arch_code: "",
      example_set_available: example_set_available,
      example_available: example_available,
      modalAssemblyError: { code1: "", code2: "", code3: "", error: "" },
      assembly_code: "",
      instructions: instructions,
      data_mode: "int_registers",
      main_memory: {},
      main_memory_busy: false,
      track_stack_names: track_stack_names,
      callee_subrutine: "",
      caller_subrutine: "",
      stack_pointer: 0,
      begin_caller: 0,
      end_caller: 0,
      begin_callee: 0,
      end_callee: 0,
      totalStats: totalStats,
      stats: stats,
      stats_value: stats_value,
      total_clk_cycles: total_clk_cycles,
      clk_cycles: clk_cycles,
      clk_cycles_value: clk_cycles_value,
      display: "",
      keyboard: "",
      enter: null,
      lab_url: "",
      result_email: "",
      target_ports: {
        Win: "rfc2217://host.docker.internal:4000?ign_set_control",
        Mac: "/dev/cu.usbserial-210",
        Linux: "/dev/ttyUSB0",
      },
      target_board: "",
      target_port: "",
      flash_url: "http://localhost:8080",
    },
    created() {
      uielto_navbar.methods.load_num_version();
      uielto_preload_architecture.methods.load_arch_available();
      this.detect_os();
      this.detect_browser();
      this.get_target_port();
    },
    mounted() {
      this.validate_browser();
      uielto_backup.methods.backup_modal(this);
      var url_hash = creator_preload_get2hash(window.location);
      creator_preload_fromHash(this, url_hash);
    },
    beforeUpdate() {
      uielto_configuration.methods.get_configuration();
      uielto_configuration.methods.get_dark_mode();
    },
    methods: {
      detect_os() {
        if (navigator.appVersion.indexOf("Win") != -1) {
          this.os = "Win";
        } else if (navigator.appVersion.indexOf("Mac") != -1) {
          this.os = "Mac";
        } else if (navigator.appVersion.indexOf("X11") != -1) {
          this.os = "Linux";
        } else if (navigator.appVersion.indexOf("Linux") != -1) {
          this.os = "Linux";
        }
      },
      detect_browser() {
        if (navigator.appVersion.indexOf("Mac") != -1) {
          this.browser = "Mac";
          return;
        }
        if (navigator.userAgent.search("Chrome") >= 0) {
          this.browser = "Chrome";
        } else if (navigator.userAgent.search("Firefox") >= 0) {
          this.browser = "Firefox";
        } else if (
          navigator.userAgent.search("Safari") >= 0 &&
          navigator.userAgent.search("Chrome") < 0
        ) {
          this.browser = "Chrome";
        }
      },
      validate_browser() {
        if (navigator.userAgent.indexOf("OPR") > -1) {
          this.$root.$emit("bv::show::modal", "modalBrowser");
        } else if (navigator.userAgent.indexOf("MIE") > -1) {
          this.$root.$emit("bv::show::modal", "modalBrowser");
        } else if (navigator.userAgent.indexOf("Edge") > -1) {
          this.$root.$emit("bv::show::modal", "modalBrowser");
        } else if (navigator.userAgent.indexOf("Chrome") > -1) {
          return;
        } else if (navigator.userAgent.indexOf("Safari") > -1) {
          return;
        } else if (navigator.userAgent.indexOf("Firefox") > -1) {
          return;
        } else {
          this.$root.$emit("bv::show::modal", "modalBrowser");
        }
      },
      exception(error) {
        show_notification(
          "There has been an exception. Error description: '" + error,
          "danger",
        );
        if (execution_index != -1) {
          instructions[execution_index]._rowVariant = "danger";
          app._data.instructions[execution_index]._rowVariant = "danger";
        }
        creator_ga(
          "execute",
          "execute.exception",
          "execute.exception." + error,
        );
        return;
      },
      get_target_port() {
        this.target_port = this.target_ports[this.os];
      },
    },
  });
  Vue.config.errorHandler = function (err, vm, info) {
    show_notification(
      "An error has ocurred, the simulator is going to restart.  \n Error: " +
        err,
      "danger",
    );
    setTimeout(function () {
      location.reload(true);
    }, 3e3);
  };
  window.onbeforeunload = confirmExit;
  function confirmExit() {
    return "He's tried to get off this page. Changes may not be saved.";
  }
  function destroyClickedElement(event) {
    document.body.removeChild(event.target);
  }
  function console_log(m) {
    if (app._data.c_debug) {
      console.log(m);
    }
  }
  function assembly_codemirror_start() {
    var editor_cfg = { lineNumbers: true, autoRefresh: true };
    var textarea_assembly_obj = document.getElementById("textarea_assembly");
    if (textarea_assembly_obj != null) {
      textarea_assembly_editor = CodeMirror.fromTextArea(
        textarea_assembly_obj,
        editor_cfg,
      );
      textarea_assembly_editor.setOption("keyMap", "sublime");
      textarea_assembly_editor.setValue(app._data.assembly_code);
      textarea_assembly_editor.setSize("auto", "70vh");
      var map = {
        "Ctrl-M": function (cm) {
          cm.execCommand("toggleComment");
        },
      };
      textarea_assembly_editor.addKeyMap(map);
    }
  }
  function architecture_codemirror_start() {
    var editor_cfg = { lineNumbers: true, autoRefresh: true };
    var textarea_arch_obj = document.getElementById("textarea_architecture");
    if (textarea_arch_obj != null) {
      textarea_arch_editor = CodeMirror.fromTextArea(
        textarea_arch_obj,
        editor_cfg,
      );
      textarea_arch_editor.setOption("keyMap", "sublime");
      textarea_arch_editor.setValue(app._data.arch_code);
      textarea_arch_editor.setSize("auto", "70vh");
    }
  }
  function binaryStringToInt(b) {
    return parseInt(b, 2);
  }
} catch (e) {
  show_notification(
    "An error has ocurred, the simulator is going to restart.  \n Error: " + e,
    "danger",
  );
  creator_ga("creator", "creator.exception", "creator.exception." + e);
  setTimeout(function () {
    location.reload(true);
  }, 3e3);
}
