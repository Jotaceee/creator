
/*
 *  Copyright 2018-2024 Felix Garcia Carballeira, Diego Camarmas Alonso, Alejandro Calderon Mateos
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
                          case "signed":
                            if (architecture.components[this._props.component.index].type == "ctrl_registers" || architecture.components[this._props.component.index].type == "int_registers") {
                              if ((((register.value).toString(2)).padStart(register.nbits, '0')).charAt(0) == 1){
                                ret = parseInt(register.value.toString(10))-0x100000000;
                              }
                              if ((((register.value).toString(2)).padStart(register.nbits, '0')).charAt(0) == 0){
                                ret = (register.value).toString(10);
                              }
                            }
                            else {
                              // ret = parseInt(register.value.toString(), 10) >> 0;
                              if (architecture.components[this._props.component.index].double_precision === false) {
                                ret = float2int_v2 (bi_BigIntTofloat(register.value));
                              }
                              else{
                                ret = double2int_v2 (bi_BigIntTodouble(register.value));
                              }
                            }
                            break;

                          case "unsigned":
                            if (architecture.components[this._props.component.index].type == "ctrl_registers" || architecture.components[this._props.component.index].type == "int_registers") {
                              ret = parseInt(register.value.toString(10)) >>> 0;
                            }
                            else {
                              //ret = parseInt(register.value.toString(), 10) >>> 0;
                              if (architecture.components[this._props.component.index].double_precision === false) {
                                ret = float2int_v2 (bi_BigIntTofloat(register.value)) >>> 0;
                              }
                              else{
                                ret = double2int_v2 (bi_BigIntTodouble(register.value)) >>> 0;
                              }
                            }
                            break;

                          case "ieee32":
                            if (architecture.components[this._props.component.index].type == "ctrl_registers" || architecture.components[this._props.component.index].type == "int_registers") {
                              ret = hex2float("0x"+(((register.value).toString(16)).padStart(8, "0")));
                            }
                            else {
                              ret = bi_BigIntTofloat(register.value);
                            }
                            break;

                          case "ieee64":
                            if (architecture.components[this._props.component.index].type == "ctrl_registers" || architecture.components[this._props.component.index].type == "int_registers") {
                              ret = hex2double("0x"+(((register.value).toString(16)).padStart(16, "0")));
                            }
                            else {
                              ret = bi_BigIntTodouble(register.value);
                            }
                            break;

                          case "hex":
                            if (architecture.components[this._props.component.index].type == "ctrl_registers" || architecture.components[this._props.component.index].type == "int_registers") {
                              ret = (((register.value).toString(16)).padStart(register.nbits/4, "0")).toUpperCase();
                            }
                            else {
                              if (architecture.components[this._props.component.index].double_precision === false) {
                                ret = bin2hex(float2bin(bi_BigIntTofloat(register.value)));
                              }
                              else {
                                ret = bin2hex(double2bin(bi_BigIntTodouble(register.value)));
                              }
                            }         
                            break;
                        }

                        if (this._props.component.double_precision_type == "linked")
                        {
                          ret = ret.toString();

                          if (ret.length > 10) {
                            return ret.slice(0, 8) + "...";
                          }
                        }

                        return ret
                        
                      },

                      show_value_truncate ( register ) {
                        var ret = this.show_value(register).toString();
                        if (ret.length > 8){
                          ret = ret.slice(0,8) + "...";
                        }
                        return ret;
                      },

                      reg_name (register){
                        switch(this.name_representation){
                          case "logical":
                            return register.name[0];
                          case "alias":
                            if (typeof register.name[1] === "undefined"){
                              return register.name[0];
                            }

                            return register.name.slice(1,register.name.length).join(' | ');
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
                      '     {{show_value_truncate(register)}}' +
                      '   </b-badge>' +
                      ' </b-button>' +
                      ' ' +
                      ' <popover-register :target="popover_id(register.name)" ' +
                      '                   :component="component"' +
                      '                   :register="register">' +
                      ' </popover-register>' +
                      '</div>'

        };
        Vue.component('register', uielto_register) ;

        var uielto_register_vec = {
          props: {
            render: { type: Number, required: true },
            component: { type: Object, required: true },
            register: { type: Object, required: true },
            name_representation: { type: String, required: true },
            value_representation: { type: String, required: true },
          },
          methods: {
            popover_id(name) {
              return "popoverValueContentvec" + name[0];
            },
            show_value_vec(register) {
              var ret;
              switch (this.value_representation) {
                case "hex":
                  var ret_val = (512 / length_vext) - 1;
                  ret = "0x" + register.value.slice(ret_val * length_vext / 4, (ret_val + 1) * length_vext / 4 );
                  break;
                case "unsigned":
                  var ret_val = (512 / length_vext) - 1;
                  ret = register.value.slice(ret_val * length_vext / 4, (ret_val + 1) * length_vext / 4 );
                  ret = (parseInt(ret.toString(10) >>> 0));
                  break;
                case "signed":    
                default:
                  var ret_val = (512 / length_vext) - 1;
                    ret = register.value.slice(ret_val * length_vext / 4, (ret_val + 1) * length_vext / 4 );
          
                    if (ret.charAt(0) === 1){
                      if (length_vext === 8){
                        ret = (parseInt(ret, 16) - 256);
          
                      } else if (length_vext === 16){
                        ret = (parseInt(ret, 16) - 65536);
          
                      } else if (length_vext === 32){
                        ret = (parseInt(ret, 16) - 4294967296);
          
                      } else {
                        ret = (parseInt(ret, 16) - 18446744073709551616n);
                      }
                    }
                    else
                      ret = (parseInt(ret, 16));  
                  break;
              }
              return ret;
            },
            show_value_truncate_vec(register) {
              var ret = this.show_value_vec(register).toString();
              if (ret.length > 8) {
                ret = ret.slice(0,8) + "...";
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
            "     {{show_value_truncate_vec(register)}}" +
            "   </b-badge>" +
            " </b-button>" +
            " " +
            ' <popover-register-vec :target="popover_id(register.name)" ' +
            '                   :component="component"' +
            '                   :register="register">' +
            " </popover-register-vec>" +
            "</div>",
        };
        Vue.component("register-vec", uielto_register_vec);

