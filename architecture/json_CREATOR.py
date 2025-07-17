import csv
import json
arguments = []
instructions = []
pseudoinstructions = []

load_store_dict = ["lb", "lh", "lw", "lbu", "lhu","sb", "sh","sw", "ld", "sd", "flw", "fsw", "flt.s", 
                   "fle.s", "fld", "fsd", "flt.d","fle.d", "flh", "fsh", "flt.h", "fle.h", "vlm.v", 
                   "vsm.v","vle8.v", "vle16.v", "vle32.v", "vle64.v", "vse8.v", "vse16.v", "vse32.v", 
                   "vse64.v", "vl1re8.v", "vl1re16.v", "vl1re32.v", "vl1re64.v", "vl2re8.v", "vl2re16.v", 
                   "vl2re32.v", "vl2re64.v", "vl4re8.v", "vl4re16.v", "vl4re32.v", "vl4re64.v", "vl8re8.v", 
                   "vl8re16.v", "vl8re32.v", "vl8re64.v", "vs1r.v", "vs2r.v", "vs4r.v", "vs8r.v", "jal", 
                   "jalr", "c.lw", "c.sw", "c.fld", "c.fsd"]

# primero leemos los argumentos del arg_lut.csv y lo almacenamos en una lista de estructuras auxiliar


def read_args():
    global arguments
    file = 'arg_lut.csv'
    with open(file, newline='', encoding='utf-8') as args:
        lector = csv.reader(args)
        for row in lector:
            fila = [campo.strip().strip('"') for campo in row]
            
            fila[1] = int(fila[1])
            fila[2] = int(fila[2])
            
            arguments.append((fila[0], [fila[1], fila[2]]))
            # print(fila)
    arguments = dict(arguments)
    # print(arguments)
    # para buscar en el diccionario valor = arguments.get('clave') devuelve el valor o None

# read_args()

def getSignature(field):
    signature = ""
    match field:
        case "rd" :
            signature = "INT-Reg"
        case "rt" :
            signature = "INT-Reg"
        case "rs1" :
            signature = "INT-Reg"
        case "rs2" :
            signature = "INT-Reg"
        case "rs3" :
            signature = "INT-Reg"
        case "aqrl" :
            signature = "aqrl"
        case "aq" :
            signature = "aq"
        case "rl" :
            signature = "rl"
        case "fm" :
            signature = "fm"
        case "pred" :
            signature = "pred"
        case "succ" :
            signature = "succ"
        case "rm" :
            signature = "rm"
        case "funct3" :
            signature = "funct3"
        case "funct2" :
            signature = "funct2"
        case "imm20" :
            signature = "inm-unsigned"
        case "jimm20" :
            signature = "inm-signed"
        case "imm12" :
            signature = "inm-unsigned"
        case "csr" :
            signature = "CSR-Reg"
        case "imm12hi" :
            signature = "inm-unsigned"
        case "bimm12hi" :
            signature = "inm-unsigned"
        case "imm12lo" :
            signature = "inm-unsigned"
        case "bimm12lo" :
            signature = "inm-unsigned"
        case "shamtq" :
            signature = "Shift-Ammount"
        case "shamtw" :
            signature = "Shift-Ammount"
        case "shamtw4" :
            signature = "Shift-Ammount"
        case "shamtd" :
            signature = "Shift-Ammount"
        case "bs" :
            signature = "Byte-Select"
        case "rnum" :
            signature = "Number-Registers"
        case "rc" :
            signature = "Rounding-Control"
        case "imm2" :
            signature = "inm-signed"
        case "imm3" :
            signature = "inm-signed"
        case "imm4" :
            signature = "inm-signed"
        case "imm5" :
            signature = "inm-signed"
        case "imm6" :
            signature = "inm-signed"
        case "zimm" :
            signature = "inm-unsigned"
        case "opcode" :
            signature = "opcode"
        case "vs3" :
            signature = "VEC-Reg"
        case "vs1" :
            signature = "VEC-Reg"
        case "vs2" :
            signature = "VEC-Reg"
        case "vm" :
            signature = "VEC-Mask"
        case "wd" :
            signature = "VEC-Reg"
        case "amoop" :
            signature = "Atomic-op"
        case "nf" :
            signature = "inm-signed"
        case "simm5" :
            signature = "inm-signed"
        case "zimm5" :
            signature = "zero-inm"
        case "zimm10" :
            signature = "zero-inm"
        case "zimm11" :
            signature = "zero-inm"
        case "zimm6hi" :
            signature = "zero-inm"
        case "zimm6lo" :
            signature = "zero-inm"
        case "c_nzuimm10" :
            signature = "compressed-inm-unsigned"
        case "c_uimm7lo" :
            signature = "compressed-inm-unsigned"
        case "c_uimm7hi" :
            signature = "compressed-inm-unsigned"
        case "c_uimm8lo" :
            signature = "compressed-inm-unsigned"
        case "c_uimm8hi" :
            signature = "compressed-inm-unsigned"
        case "c_uimm9lo" :
            signature = "compressed-inm-unsigned"
        case "c_uimm9hi" :
            signature = "compressed-inm-unsigned"
        case "c_nzimm6lo" :
            signature = "compressed-inm-unsigned"
        case "c_nzimm6hi" :
            signature = "compressed-inm-unsigned"
        case "c_imm6lo" :
            signature = "compressed-inm-signed"
        case "c_imm6hi" :
            signature = "compressed-inm-signed"
        case "c_nzimm10hi" :
            signature = "compressed-inm-unsigned"
        case "c_nzimm10lo" :
            signature = "compressed-inm-unsigned"
        case "c_nzimm18hi" :
            signature = "compressed-inm-unsigned"
        case "c_nzimm18lo" :
            signature = "compressed-inm-unsigned"
        case "c_imm12" :
            signature = "compressed-inm-unsigned"
        case "c_bimm9lo" :
            signature = "compressed-inm-unsigned"
        case "c_bimm9hi" :
            signature = "compressed-inm-unsigned"
        case "c_nzuimm5" :
            signature = "compressed-inm-unsigned"
        case "c_nzuimm6lo" :
            signature = "compressed-inm-unsigned"
        case "c_nzuimm6hi" :
            signature = "compressed-inm-unsigned"
        case "c_uimm8splo" :
            signature = "compressed-inm-unsigned"
        case "c_uimm8sphi" :
            signature = "compressed-inm-unsigned"
        case "c_uimm8sp_s" :
            signature = "compressed-inm-unsigned"
        case "c_uimm10splo" :
            signature = "compressed-inm-unsigned"
        case "c_uimm10sphi" :
            signature = "compressed-inm-unsigned"
        case "c_uimm9splo" :
            signature = "compressed-inm-unsigned"
        case "c_uimm9sphi" :
            signature = "compressed-inm-unsigned"
        case "c_uimm10sp_s" :
            signature = "compressed-inm-unsigned"
        case "c_uimm9sp_s" :
            signature = "compressed-inm-unsigned"
        case "c_uimm2" :
            signature = "compressed-inm-unsigned"
        case "c_uimm1" :
            signature = "compressed-inm-unsigned"
        case "c_rlist" :
            signature = "compressed-Reg-List"
        case "c_spimm" :
            signature = "Inm-sp"
        case "c_index" :
            signature = "compressed-index"
        case "rs1_p" :
            signature = "compressed-REG"
        case "rs2_p" :
            signature = "compressed-REG"
        case "rd_p" :
            signature = "compressed-REG"
        case "rd_rs1_n0" :
            signature = "compressed-REG"
        case "rd_rs1_p" :
            signature = "compressed-REG"
        case "rd_rs1" :
            signature = "INT-REG-SOURCE-DEST"
        case "rd_n2" :
            signature = "INT-REG"
        case "rd_n0" :
            signature = "INT-REG"
        case "rs1_n0" :
            signature = "INT-REG"
        case "c_rs2_n0" :
            signature = "compressed-INT-REG"
        case "c_rs1_n0" :
            signature = "compressed-INT-REG"
        case "c_rs2" :
            signature = "compressed-INT-REG"
        case "c_sreg1" :
            signature = "compressed-INT-REG"
        case "c_sreg2" :
            signature = "compressed-INT-REG"
        case "fm" :
            signature = "Mode-Field"
        case "pred" :
            signature = "Prediction"
        case "succ" :
            signature = "Succession"
        case "imm":
            signature = "inm-signed-inm-unsigned"
    return signature


def insn_fields(instruction, type):
    global instructions
    insn_name = instruction[0]
    cop = ""
    Extended = ""
    args = []
    for fields in instruction:
        aux_args = {}
        if insn_name not in fields:
            f = arguments.get(fields)
            if f is not None:
                aux_args["name"] = fields
                aux_args["bitstart"] = f[0]
                aux_args["bitstop"] = f[1]
                args.append(aux_args)
            else:
                aux = fields.split("=")
                # Convertimos el valor del campo a binario
                if  aux[1].startswith("0x") or aux[1].startswith("0X"):
                    aux[1] = bin(int(aux[1], 16))[2:]
                elif aux[1].startswith("0b") or aux[1].startswith("0B"): 
                    aux[1] = aux[1][2:]
                else:
                    aux[1] = bin(int(aux[1]))[2:]
                interval = aux[0].split("..")
                if len(interval) > 1:
                    if int(interval[0]) == 6:
                        cop = aux[1].zfill((int(interval[0]) - int(interval[1]) + 1)) + cop
                    elif int(interval[0]) == 1:
                        cop = cop + aux[1].zfill((int(interval[0]) - int(interval[1]) + 1))
                    elif int(interval[0]) == 14:
                        Extended = Extended + aux[1].zfill((int(interval[0]) - int(interval[1]) + 1))
                        args.append({"name":"Extended_cop", "bitstart": int(interval[0]), "bitstop": int(interval[1]), "value": Extended})
                    elif int(interval[0]) == 31 and int(interval[1] == 25):
                        args.append({"name": "funct7", "bitstart": int(interval[0]), "bitstop": int(interval[1]), "value": aux[1].zfill((int(interval[0]) - int(interval[1]) + 1))})
                    else:
                        args.append({"name": "pad", "bitstart": int(interval[0]), "bitstop": int(interval[1]), "value": aux[1].zfill((int(interval[0]) - int(interval[1]) + 1))})
                else:
                    args.append({"name": "pad", "bitstart": int(interval[0]), "bitstop": int(interval[0]), "value":aux[1]})
    args.append({"name": "cop", "bitstart" : len(cop) - 1, "bitstop": 0, "value": cop})
    
                
    # print(args)
    nwords = 1
    tipo = ""
    match type:
        case 1:
            tipo = "Arithmetic Integer"
        case 2:
            tipo = "Arithmetic floating point"
        case 3: 
            tipo = "Arithmetic vectorial insn"
        case 4:
            tipo = "Compressed insn"
            nwords = 0.5
        case 5:
            tipo = "Compressed floating point insn"
            nwords = 0.5
        case 0:
            tipo = ""
    sep = []
    for vals in args:
        sep.append(False)
    args = sorted(args, key=lambda x: x["bitstart"], reverse=True)

    #Construimos el signature

    signatureRaw = ""
    signature = ""

    for fields in instruction:
        if "=" not in fields:
            if "imm" not in fields:
                signatureRaw += fields + " "
            else:
                if "imm" not in signatureRaw:
                    signatureRaw += "imm "
    signatureRaw = signatureRaw.rstrip()

    if insn_name in load_store_dict and "imm" in signatureRaw:
        aux = signatureRaw.split(" ")
        aux.remove("imm")
        aux.append("imm")
        index = aux.index("imm")
        print(aux)
        newsig = ""
        for i in range(len(aux)):
            if aux[i] == insn_name:
                newsig += aux[i] + " "
                signature += aux[i] + ","
            else :
                if i != index:
                    if i == (len(aux) - 2):
                        signature += "inm-unsigned,(" + getSignature(aux[i]) + ")"
                        newsig += "imm("+aux[i]+")"
                    else: 
                        signature += getSignature(aux[i]) + ","
                        newsig += aux[i] + " " 
        signatureRaw = newsig
    else:
        aux = signatureRaw.split(" ")
        for i in range(len(aux)):
            if aux[i] == insn_name:
                signature += aux[i] + ","
            else :
                if i == (len(aux) -1):
                    signature += getSignature(aux[i])
                else: 
                    signature += getSignature(aux[i]) + ","


        

    
    # queda checkear si es una instruccion en la que el inmediato se usa como añadido al contenido del registro
    
                


    data = {
        "name" :  insn_name,
        "cop" : cop,
        "Extended": Extended,
        "type" : tipo, 
        "signature" : signature,
        "signatureRaw": signatureRaw,
        "clk_cycles": 1,
        "nwords": nwords,
        "fields": args,
        "Definition": "",
        "separated": sep,
        "help": ""
    }
    instructions.append(data)
                    
    return

def pseudo_fields(instruction, type):
    global pseudoinstructions
    insn_name = instruction[1]
    cop = ""
    Extended = ""
    args = []
    instruction = instruction[2:]

    for fields in instruction:
        if insn_name not in fields:
            f = arguments.get(fields)
            if f is not None:
                args.append({("name", fields), ("startbit", f[0]), ("stopbit", f[1])})
            else:
                aux = fields.split("=")
                # Convertimos el valor del campo a binario
                f2 = arguments.get(aux[0])
                if f2 is not None:
                    args.append({("name", aux[0]), ("startbit", f2[0]), ("stopbit", f2[1]), ("value", aux[1])})
                else : 
                    if  aux[1].startswith("0x") or aux[1].startswith("0X"):
                        aux[1] = bin(int(aux[1], 16))[2:]
                    else : 
                        aux[1] = bin(int(aux[1]))[2:]

                    interval = aux[0].split("..")
                    if int(interval[0]) == 6:
                        cop = aux[1].zfill((int(interval[0]) - int(interval[1]) + 1)) + cop
                    elif int(interval[0]) == 1:
                        cop = cop + aux[1].zfill((int(interval[0]) - int(interval[1]) + 1))
                    elif int(interval[0]) == 14:
                        Extended = Extended + aux[1].zfill((int(interval[0]) - int(interval[1]) + 1))
                        args.append({("name", "Extended_cop"), ("bitstart", interval[0]), ("bitstop", interval[1]), ("value", Extended)})
                    elif int(interval[0]) == 31 and int(interval[1] == 25):
                        args.append({("name", "funct7"), ("bitstart", interval[0]), ("bitstop", interval[1]), ("value", aux[1].zfill((int(interval[0]) - int(interval[1]) + 1)))})
                    else:
                        args.append({("name", "pad"), ("bitstart", interval[0]), ("bitstop", interval[1]), ("value", aux[1].zfill((int(interval[0]) - int(interval[1]) + 1)))})
    args.append({("name", "cop"), ("bitstart", 6), ("bitstop", 0), ("value", cop)})
    
    # print(args)
    pseudoinstructions.append(args)
    return

def read_insn(name_file, type):
    insn_file=name_file
    with open(insn_file, 'r', encoding='utf-8') as insns:
        for row in insns:
            insn = row.split()
            if len(insn) > 0:
                if '$pseudo_op' not in insn[0] and '#' not in insn[0]:
                    # ahora tenemos que crear los campos para la codificación
                    # print("-----------------------------------------------------------")
                    insn_fields(insn, type)
                    # print(insn)
                    # print("-----------------------------------------------------------")
                elif '$pseudo_op' in insn[0]:
                    # print("-----------------------------------------------------------")
                    insn = insn[1:]
                    insn[0] = insn[0].split("::")[1]
                    pseudo_fields(insn, type)
                    # print(insn)
                    
                    
if __name__ == "__main__":
    read_args()
    read_insn("rv_i", 1)
    read_insn("rv_c", 4)
    read_insn("rv_c_d", 5)
    read_insn("rv_d", 2)
    read_insn("rv_f", 2)
    read_insn("rv_m", 0)
    read_insn("rv_v", 3)

    with open("instructions.json", "w", encoding='utf-8') as outfile:
        json.dump(instructions, outfile, indent=4, ensure_ascii=False)
    print(len(instructions))
    # for pseudo in pseudoinstructions:
    #     print("----------------------------------------------------------------------")
    #     print(pseudo)
