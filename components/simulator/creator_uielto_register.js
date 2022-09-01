/*
 *  Copyright 2018-2022 Felix Garcia Carballeira, Diego Camarmas Alonso, Alejandro Calderon Mateos
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


        /* jshint esversion: 6 */

        var uielto_register = {

        props:      {
                      render:                 { type: Number, required: true },
                      component:              { type: Object, required: true },
                      register:               { type: Object, required: true },
                      name_representation:    { type: String, required: true },
                      value_representation:   { type: String, required: true }
                    },

        methods:    {
                    /*Popover functions*/
                    popover_id(name){
                      return 'popoverValueContent' + name[0];
                    },

                    show_value (register){
                      var ret = 0;

                      switch(this.value_representation){
                        case "unsigned":
                          if (architecture.components[this._props.component.index].type == "control" || architecture.components[this._props.component.index].type == "integer") {
                            ret = parseInt(register.value.toString(10)) >>> 0;
                          }
                          else {
                            //ret = parseInt(register.value.toString(), 10) >>> 0;
                            ret = float2int_v2 (register.value) >>> 0;
                          }
                          break;

                        case "signed":
                          if (architecture.components[this._props.component.index].type == "control" || architecture.components[this._props.component.index].type == "integer") {
                            if ((((register.value).toString(2)).padStart(register.nbits, '0')).charAt(0) == 1)
                              ret = parseInt(register.value.toString(10))-0x100000000;
                            if ((((register.value).toString(2)).padStart(register.nbits, '0')).charAt(0) == 0)
                              ret = (register.value).toString(10);
                          }
                          else {
                            // ret = parseInt(register.value.toString(), 10) >> 0;
                            ret = float2int_v2 (register.value);
                          }
                          break;

                        case "decimal":
                          if (architecture.components[this._props.component.index].type == "control" || architecture.components[this._props.component.index].type == "integer") {
                            ret = hex2float("0x"+(((register.value).toString(16)).padStart(register.nbits/4, "0")));
                          }
                          else {
                            ret = register.value;
                          }
                          break;

                        case "hex":
                          if (architecture.components[this._props.component.index].type == "control" || architecture.components[this._props.component.index].type == "integer") {
                            ret = (((register.value).toString(16)).padStart(register.nbits/4, "0")).toUpperCase();
                          }
                          else {
                            if (architecture.components[this._props.component.index].type == "floating point") {
                              ret = bin2hex(float2bin(register.value));
                            }
                            else {
                              ret = bin2hex(double2bin(register.value));
                            }
                          }         
                          break;
                      }

                      ret = ret.toString();

                      if (ret.length > 10) {
                        return ret.slice(0, 8) + "...";
                      }

                      return ret
                      
                    },

                    reg_name (register){
                      switch(this.name_representation){
                        case "logical":
                          return register.name[0];
                        case "alias":
                          if (typeof register.name[1] === "undefined"){
                            return register.name[0];
                          }
                          
                          return register.name[1];
                        case "all":
                          return register.name.join(' | ');
                      }
                    }

        },

        template:   '<div>' +
                    ' <b-button class="btn btn-outline-secondary btn-sm registers w-100 h-100" ' +
                    '           :id="popover_id(register.name)" ' +
                    '           onclick="creator_ga(\'data\', \'data.view\', \'data.view.registers_details\');">' +
                    '   <span class="text-truncate">{{reg_name(register)}}</span> ' +
                    '   <b-badge class="regValue registerValue"> ' +
                    '     {{show_value(register)}}' +
                    '   </b-badge>' +
                    ' </b-button>' +
                    ' ' +
                    ' <popover-register :target="popover_id(register.name)" ' +
                    '                   :component="component"' +
                    '                   :register="register">' +
                    ' </popover-register>' +
                    '</div>'
      
        }

        Vue.component('register', uielto_register) ;

