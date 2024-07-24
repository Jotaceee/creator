/*
 *  Copyright 2015-2024 Saul Alonso Monsalve, Javier Prieto Cepeda, Felix Garcia Carballeira, Alejandro Calderon Mateos, Juan Banga Pardo, Diego Camarmas Alonso
 *
 *  This file is part of CREATOR.
 *
 *  CREATOR is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU Lesser General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  CREATOR is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU Lesser General Public License for more details.
 *
 *  You should have received a copy of the GNU Lesser General Public License
 *  along with CREATOR.  If not, see <http://www.gnu.org/licenses/>.
 *
 */


/* jshint esversion: 9 */


function crasm_src2mem ( datosCU, asm_source, options )
{
     var context = null ;
     var ret = {
                  error: 'UNKNOWN 2'
               } ;

     try
     {
         context = crasm_prepare_context(datosCU, options) ;
	 if (context.error != null) {
	     return context;
	 }

         context = wsasm_prepare_source(context, asm_source) ;
	 if (context.error != null) {
	     return context;
	 }

         ret = wsasm_src2obj(context) ;
	 if (ret.error != null) {
	     return ret;
	 }

         ret = crasm_obj2mem(ret) ;
	 if (ret.error != null) {
	     return ret;
	 }
     }
     catch (e)
     {
         console.log("ERROR on 'crasm_src2mem' function :-(") ;
         console.log("Details:\n " + e) ;
         console.log("Stack:\n"    + e.stack) ;

	 ret.error = "Compilation error found !<br>" +
                     "Please review your assembly code and try another way to write your algorithm.<br>" +
                     "<br>" +
                     e.toString() ;
     }

     return ret ;
}


//
// TODO: next functions is for debugging at the javascript console
//

function crasm_compile ( )
{
     var ret = {
                  error: ''
               } ;

     // get assembly code from textarea...
     code_assembly = '' ;
     if (typeof textarea_assembly_editor != "undefined") {
         code_assembly = textarea_assembly_editor.getValue();
     }

     // clear main_memory...
     creator_memory_clear() ;

     // compile and load into main_memory...
     ret = crasm_src2mem(architecture, code_assembly, {}) ;
     if (ret.error != null) {
         return packCompileError("m0", ret.error, 'error', "danger") ;
     }

     // print memory elements at the javascript console
     main_memory.forEach((element) => console.log(element)) ;

     return ret ;
}


function crasm_compile_ui ( )
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
       
     instructions = [];
     instructions_tag = [];
     tag_instructions = {};
     pending_instructions = [];
     pending_tags = [];
     data_tag = [];
     instructions_binary =[];
     creator_memory_clear() ;
     extern = [];
     data = [];
     i = 0;

     /* Allocation of memory addresses */
     architecture.memory_layout[4].value = backup_stack_address;
     architecture.memory_layout[3].value = backup_data_address;
     data_address  = parseInt(architecture.memory_layout[2].value);
     stack_address = parseInt(architecture.memory_layout[4].value);

     for (i = 0; i < architecture.components.length; i++)
     {
          for (var j = 0; j < architecture.components[i].elements.length; j++)
          {
            if (architecture.components[i].elements[j].properties.includes("program_counter"))
            {
              architecture.components[i].elements[j].value          = bi_intToBigInt(address,10) ;
              architecture.components[i].elements[j].default_value  = bi_intToBigInt(address,10) ;
            }
            if (architecture.components[i].elements[j].properties.includes("stack_pointer"))
            {
              architecture.components[i].elements[j].value         = bi_intToBigInt(stack_address,10) ;
              architecture.components[i].elements[j].default_value = bi_intToBigInt(stack_address,10) ;
            }
          }
     }

     /*
     architecture.components[1].elements[29].value = bi_intToBigInt(stack_address,10) ;
     architecture.components[0].elements[0].value  = bi_intToBigInt(address,10) ;
     architecture.components[1].elements[29].default_value = bi_intToBigInt(stack_address,10) ;
     architecture.components[0].elements[0].default_value  = bi_intToBigInt(address,10) ;
     */

     /* Reset stats */
     totalStats = 0;
     for (i = 0; i < stats.length; i++){
          stats[i].percentage = 0;
          stats[i].number_instructions = 0;
          stats_value[i] = 0;
     }


     /* Enter the compilated instructions in the text segment */
     code_assembly = '' ;
     if (typeof textarea_assembly_editor != "undefined") {
         code_assembly = textarea_assembly_editor.getValue();
     }

     creator_memory_clear() ;

     ret = crasm_src2mem(architecture, code_assembly, {}) ;
     if (ret.error != null) {
         return packCompileError("m0", ret.error, 'error', "danger") ;
     }


     /* Save binary */
     for (var i=0; i<ret.obj.length; i++)
     {
          if (ret.obj[i].datatype != "instruction") {
              continue ;
          }

          instructions.push({ Break:       null,
                              Address:     "0x" + ret.obj[i].elto_ptr.toString(16),
                              Label:       ret.obj[i].labels.join(' '),
                              loaded:      ret.obj[i].source,                 // TODO: pseudo vs instruction...
                              user:        ret.obj[i].track_source.join(' '), // TODO: pseudo vs instruction...
                              _rowVariant: '',
                              visible:     true,
                              hide:        false});

          instructions_binary.push({ Break:       null,
                                     Address:     "0x" + ret.obj[i].elto_ptr.toString(16),
                                     Label:       ret.obj[i].labels.join(' '),
                                     loaded:      ret.obj[i].binary,
                                     user:        null,
                                     _rowVariant: '',
                                     visible:     false});
     }

     /* Save tags */
     for (let key in ret.labels_asm)
     {
          instructions_tag.push({
                                   tag:  key,
                                   addr: parseInt(ret.labels_asm[key], 16)
                                });
     }

     if (typeof app != "undefined") {
         app._data.instructions = instructions;
     }

     /* Initialize stack */
     writeMemory("00", parseInt(stack_address), "word") ;

     address       = parseInt(architecture.memory_layout[0].value);
     data_address  = parseInt(architecture.memory_layout[2].value);
     stack_address = parseInt(architecture.memory_layout[4].value);

     // save current value as default values for reset()...
     creator_memory_prereset() ;

     return ret;
}


