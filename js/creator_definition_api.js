/*
 *  Copyright 2018-2021 Felix Garcia Carballeira, Diego Camarmas Alonso, Alejandro Calderon Mateos
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


/*
 *  CREATOR instruction description API 
 */

//
// Internal auxiliar functions
//

function aux_showmsg ( msg, level )
{
    if (typeof window !== "undefined")
         show_notification(msg, level);
    else console.log(level.toUpperCase() + ": " + msg);
}

function aux_type2size ( type )
{
    var size = 4;

    switch (type)
    {
        case 'b':
        case 'bu':
        case 'byte':
             size = 1;
             break

        case 'h':
        case 'hu':
        case 'half':
             size = 2;
             break

        case 'w':
        case 'wu':
        case 'word':
             size = 4;
             break
    }

    return size ;
}

function syscall_one_argument ( action, value1 )
{
    var compIndex, elemIndex;
    var match = 0;

    for (var i = 0; i < architecture.components.length; i++)
    {
         for (var j = 0; j < architecture.components[i].elements.length; j++)
         {
              if (architecture.components[i].elements[j].name.includes(value1) != false) {
                  compIndex = i;
                  elemIndex = j;
                  match = 1;
              }
         }
    }

    if (match == 0) {
        throw packExecute(true, "capi_syscall: register " + value1 + " not found", 'danger', null); //TODO: not found
        return;
    }

    // syscall(action, indexComp, indexElem, indexComp2, indexElem2, first_time)
    syscall(action, compIndex, elemIndex, null, null, true) ;
}

function syscall_two_arguments ( action, value1, value2 )
{
    var compIndex, elemIndex, compIndex2, elemIndex2;
    var match = 0;

    for (var i = 0; i < architecture.components.length; i++) {
         for (var j = 0; j < architecture.components[i].elements.length; j++) {
              if (architecture.components[i].elements[j].name.includes(value1) != false) {
                  compIndex = i;
                  elemIndex = j;
                  match++;
              }
         }
    }

    for (var i = 0; i < architecture.components.length; i++) {
         for (var j = 0; j < architecture.components[i].elements.length; j++) {
              if (architecture.components[i].elements[j].name.includes(value2) != false) {
                  compIndex2 = i;
                  elemIndex2 = j;
                  match++;
              }
         }
    }

    if (match < 2) {
        throw packExecute(true, "capi_syscall: register " + value1 + " or " + value2 + " not found", 'danger', null);
        return;
    }

    syscall(action, compIndex, elemIndex, compIndex2, elemIndex2, true);
}


//
// Memory access
//

/*
 * Name:        mp_write - Write value into a memory address
 * Sypnosis:    mp_write (destination_address, value2store, byte_or_half_or_word)
 * Description: similar to memmove/memcpy, store a value into an address
 */
function capi_mem_write ( addr, value, type )
{
    var size = 1 ;
    var msg  = "The memory must be align";

    // 1) check address is aligned
    //    FUTURE: if (architecture.properties.memory_align == false) return;
    size = aux_type2size(type) ;
    if (addr % size != 0)
    {
        if (typeof app !== "undefined")
             app.exception(msg);
        else console.log(msg);

        return;
    }

    // 2) write into memory
    writeMemory(value, addr, type);
}

/*
 * Name:        mp_read - Read value from a memory address
 * Sypnosis:    mp_read (source_address, byte_or_half_or_word)
 * Description: read a value from an address
 */
function capi_mem_read ( addr, type )
{
    var size = 1 ;
    var msg = "The memory must be align";

    // 1) check address is aligned
    //    FUTURE: if (architecture.properties.memory_align == false) return;
    size = aux_type2size(type) ;
    if (addr % size != 0)
    {
        if (typeof app !== "undefined")
             app.exception(msg);
        else console.log(msg);

        return;
    }

    // 2) read from memory
    return readMemory(addr, type);
}


//
// Syscall
//

/*
 * Name:        capi_syscall - request system call
 * Sypnosis:    capi_syscall (action, value1 [, value2])
 * Description: request a system call
 */

var arr_pr1 = [ "print_int", "print_float", "print_double", "print_char", "print_string", 
                "read_int" , "read_float" , "read_double",  "read_char" ];
var arr_pr2 = [ "read_string", "sbrk" ];

function capi_syscall ( action, value1, value2 )
{
    if (arr_pr1.includes(action)) {
        syscall_one_argument(action, value1) ;
        return ;
    }

    if (action == "exit") {
        syscall('exit', null, null, null, null);
        return ;
    }

    if (arr_pr2.includes(action)) {
        syscall_two_arguments(action, value1, value2) ;
    }
}


//
// Check stack
//

function capi_callconv_begin ( addr )
{
    var function_name = "" ;

    // 1.- get function name
    if (typeof architecture.components[0] !== "undefined")
    {
        if (typeof tag_instructions[addr] == "undefined")
             function_name = "0x" + parseInt(addr).toString(16) ;
        else function_name = tag_instructions[addr] ;
    }

    // 2.- callstack_enter
    creator_callstack_enter(function_name) ;
}

function capi_callconv_end ()
{
    // 1.- callstack_leave
    var ret = creator_callstack_leave();

    // 2) If everything is ok, just return 
    if (ret.ok) {
        return;
    }

    // 3) Othewise report some warning...
    // Google Analytics
    creator_ga('execute', 'execute.exception', 'execute.exception.protection_jrra' + ret.msg);

    // User notification
    aux_showmsg(ret.msg, 'danger') ;
}

function capi_callconv_memAction ( action, addr, reg_name, type )
{
    // 1) move the associated finite state machine...
    if (reg_name == '') {
        return;
    }

    // 2) search for reg_name...
    var i = 0;
    var j = 0;
    var found = 0;
    for (i = 0; i < architecture.components.length; i++) {
        for (j = 0; j < architecture.components[i].elements.length; j++) {
            if (architecture.components[i].elements[j].name == reg_name) {
                found = 1;
                break;
            }
        }
    }
    if (found == 0) {
        return;
    }

    // 3) switch action...
    switch (action) 
    {
        case 'write': creator_callstack_newWrite(i, j, addr, type);
                      break;
        case 'read':  creator_callstack_newRead(i, j, addr, type);
                      break;
        default:      aux_showmsg(" Unknown action '" + action + "' at ...sing_convention_memory.\n", 'danger') ;
                      break;
    }
}

/*
function capi_callconv_writeMem ( addr, reg_name, type )
{
    // 1) move the associated finite state machine...
    if (reg_name == '') {
        return;
    }

    for (var i = 0; i < architecture.components.length; i++) {
        for (var j = 0; j < architecture.components[i].elements.length; j++) {
            if (architecture.components[i].elements[j].name == reg_name) {
                creator_callstack_newWrite(i, j, addr, type);
            }
        }
    }
}

function capi_callconv_readMem ( addr, reg_name, type )
{
    // 1) move the associated finite state machine...
    if (reg_name == '') {
        return;
    }

    for (var i = 0; i < architecture.components.length; i++) {
        for (var j = 0; j < architecture.components[i].elements.length; j++) {
            if (architecture.components[i].elements[j].name == reg_name) {
                creator_callstack_newRead(i, j, addr, type);
            }
        }
    }
}
*/


//
// Draw stack
//

function capi_drawstack_begin ( addr )
{
    var function_name = "" ;

    // 1.- get function name
    if (typeof architecture.components[0] !== "undefined")
    {
        if (typeof tag_instructions[addr] == "undefined")
             function_name = "0x" + parseInt(addr).toString(16) ;
        else function_name = tag_instructions[addr] ;
    }

    // 2.- callstack_enter
    track_stack_enter(function_name) ;
}

function capi_drawstack_end ()
{
    // track leave
    var ret = track_stack_leave() ;

    // 2) If everything is ok, just return 
    if (ret.ok) {
        return;
    }

    // User notification
    aux_showmsg(ret.msg, 'warning') ;
}


//
// Auxiliar functions
//

/*
 * Name:        capi_split_double
 * Sypnosis:    capi_split_double (reg, index)
 * Description: split the double register in highter part and lower part
 */
function capi_split_double ( reg, index )
{
    var value = bin2hex(double2bin(reg));
    console_log(value);
    if(index == 0){
        return value.substring(0,8);
    }
    if(index == 1) {
        return value.substring(8,16);
    }
}

function capi_uint2float32 ( value )
{
    var buf = new ArrayBuffer(4) ;
    (new Uint32Array(buf))[0] = value ;
    return (new Float32Array(buf))[0] ;
}

function capi_float322uint ( value )
{
    var buf = new ArrayBuffer(4) ;
    (new Float32Array(buf))[0] = value ;
    return (new Uint32Array(buf))[0];
}

