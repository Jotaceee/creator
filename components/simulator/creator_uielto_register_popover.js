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

  var uielto_register_popover = {

  props:      {
                target:           { type: String, required: true },
                component:        { type: Object, required: true },
                register:         { type: Object, required: true }
              },

  data:       function () {
                return {
                  /*Register form*/
                  newValue: ''
                }
              },

  methods:    {
                closePopover(){
                  this.$root.$emit('bv::hide::popover')
                },

                //Write the register value in the specified format
                show_value (register, view){
                  var ret = 0;

                  switch(view){
                    case "hex":
                      if (this.component.name == "Control registers" || this.component.name == "Integer registers") {
                        ret = "0x" + (((register.value).toString(16)).padStart(register.nbits/4, "0")).toUpperCase();
                      }
                      else {
                        if (this.component.name == "Simple floating point registers") {
                          ret = "0x" + bin2hex(float2bin(register.value));
                        }
                        else {
                          ret = "0x" + bin2hex(double2bin(register.value));
                        }
                      }         
                      break;

                    case "bin":
                      if (this.component.name == "Control registers" || this.component.name == "Integer registers") {
                        ret = (((register.value).toString(2)).padStart(register.nbits, "0"));
                      }
                      else {
                        if (this.component.name == "Simple floating point registers") {
                          ret = float2bin(register.value);
                        }
                        else {
                          ret = double2bin(register.value);
                        }
                      }         
                      break;

                    case "signed":
                      if (this.component.name == "Control registers" || this.component.name == "Integer registers") {
                        if ((((register.value).toString(2)).padStart(register.nbits, '0')).charAt(0) == 1)
                          ret = parseInt(register.value.toString(10))-0x100000000;
                        if ((((register.value).toString(2)).padStart(register.nbits, '0')).charAt(0) == 0)
                          ret = (register.value).toString(10);
                      }
                      else {
                        ret = parseInt(register.value.toString(), 10) >> 0;
                      }
                      break;

                    case "unsigned":
                      ret = parseInt(register.value.toString(10)) >>> 0;
                      break;

                    case "char":
                      if (this.component.name == "Control registers" || this.component.name == "Integer registers") {
                        ret = hex2char8((((register.value).toString(16)).padStart(register.nbits/4, "0")));
                      }
                      else {
                        if (this.component.name == "Simple floating point registers") {
                          ret = hex2char8(bin2hex(float2bin(register.value)));
                        }
                        else {
                          ret = hex2char8(bin2hex(double2bin(register.value)));
                        }
                      } 
                      break;

                    case "decimal":
                      if (this.component.name == "Control registers" || this.component.name == "Integer registers") {
                        ret = hex2float("0x"+(((register.value).toString(16)).padStart(register.nbits/4, "0")));
                      }
                      else {
                        ret = register.value;
                      }
                      break;
                  }

                  ret = ret.toString();

                  return ret
                  
                },

                //Update a new register value
                updateReg(comp, elem, type, precision){
                  for (var i = 0; i < architecture.components[comp].elements.length; i++) {
                    if(type == "integer" || type == "control"){
                      if(architecture.components[comp].elements[i].name == elem && this.newValue.match(/^0x/)){
                        var value = this.newValue.split("x");
                        if(value[1].length * 4 > architecture.components[comp].elements[i].nbits){
                          value[1] = value[1].substring(((value[1].length * 4) - architecture.components[comp].elements[i].nbits)/4, value[1].length)
                        }
                        architecture.components[comp].elements[i].value = bi_intToBigInt(value[1], 16);
                      }
                      else if(architecture.components[comp].elements[i].name == elem && this.newValue.match(/^(\d)+/)){
                        architecture.components[comp].elements[i].value = bi_intToBigInt(this.newValue,10);
                      }
                      else if(architecture.components[comp].elements[i].name == elem && this.newValue.match(/^-/)){
                        architecture.components[comp].elements[i].value = bi_intToBigInt(this.newValue,10);
                      }
                    }
                    else if(type =="floating point"){
                      if(precision == false){
                        if(architecture.components[comp].elements[i].name == elem && this.newValue.match(/^0x/)){
                          architecture.components[comp].elements[i].value = hex2float(this.newValue);
                          updateDouble(comp, i);
                        }
                        else if(architecture.components[comp].elements[i].name == elem && this.newValue.match(/^(\d)+/)){
                          architecture.components[comp].elements[i].value = parseFloat(this.newValue, 10);
                          updateDouble(comp, i);
                        }
                        else if(architecture.components[comp].elements[i].name == elem && this.newValue.match(/^-/)){
                          architecture.components[comp].elements[i].value = parseFloat(this.newValue, 10);
                          updateDouble(comp, i);
                        }
                      }

                      else if(precision == true){
                        if(architecture.components[comp].elements[i].name == elem && this.newValue.match(/^0x/)){
                          architecture.components[comp].elements[i].value = hex2double(this.newValue);
                          updateSimple(comp, i);
                        }
                        else if(architecture.components[comp].elements[i].name == elem && this.newValue.match(/^(\d)+/)){
                          architecture.components[comp].elements[i].value = parseFloat(this.newValue, 10);
                          updateSimple(comp, i);
                        }
                        else if(architecture.components[comp].elements[i].name == elem && this.newValue.match(/^-/)){
                          architecture.components[comp].elements[i].value = parseFloat(this.newValue, 10);
                          updateSimple(comp, i)
                        }
                      }
                    }
                  }
                  this.newValue = '';

                  // Google Analytics
                  creator_ga('data', 'data.change', 'data.change.register_value');
                  creator_ga('data', 'data.change', 'data.change.register_value_' + elem);
                },

                //Stop user interface refresh
                debounce: _.debounce(function (param, e) {
                  console_log(param);
                  console_log(e);

                  e.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                  var re = new RegExp("'","g");
                  e = e.replace(re, '"');
                  re = new RegExp("[\f]","g");
                  e = e.replace(re, '\\f');
                  re = new RegExp("[\n\]","g");
                  e = e.replace(re, '\\n');
                  re = new RegExp("[\r]","g");
                  e = e.replace(re, '\\r');
                  re = new RegExp("[\t]","g");
                  e = e.replace(re, '\\t');
                  re = new RegExp("[\v]","g");
                  e = e.replace(re, '\\v');

                  if(e == ""){
                    this[param] = null;
                    return;
                  }

                  console_log("this." + param + "= '" + e + "'");

                  eval("this." + param + "= '" + e + "'");

                  app.$forceUpdate();
                }, getDebounceTime())

              },

template:     '<b-popover :target="target" ' +
              '           triggers="click blur" ' +
              '           class="popover">' +
              '  <template v-slot:title>' +
              '    <b-button @click="closePopover" class="close" aria-label="Close">' +
              '      <span class="d-inline-block" aria-hidden="true">&times;</span>' +
              '    </b-button>' +
              '    {{register.name.join(\' | \')}}' +
              '  </template>' +
              '' +
              '  <table class="table table-bordered table-sm popoverText">' +
              '    <tbody>' +
              '      <tr>' +
              '        <td>Hex.</td>' +
              '        <td>' +
              '          <b-badge class="registerPopover">' +
              '            {{show_value(register, \'hex\')}}' +
              '          </b-badge>' +
              '        </td>' +
              '      </tr>' +
              '      <tr>' +
              '        <td>Binary</td>' +
              '        <td>' +
              '          <b-badge class="registerPopover">' +
              '            {{show_value(register, \'bin\')}}' +
              '          </b-badge>' +
              '        </td>' +
              '      </tr>' +
              '      <tr>' +
              '        <td>Signed</td>' +
              '        <td>' +
              '          <b-badge class="registerPopover">' +
              '            {{show_value(register, \'signed\')}}' +
              '          </b-badge>' +
              '        </td>' +
              '      </tr>' +
              '      <tr>' +
              '        <td>Unsig.</td>' +
              '        <td>' +
              '          <b-badge class="registerPopover">' +
              '            {{show_value(register, \'unsigned\')}}' +
              '          </b-badge>' +
              '        </td>' +
              '      </tr>' +
              '      <tr>' +
              '        <td>Char</td>' +
              '        <td>' +
              '          <b-badge class="registerPopover">' +
              '            {{show_value(register, \'char\')}}' +
              '          </b-badge>' +
              '        </td>' +
              '      </tr>' +
              '      <tr>' +
              '        <td>IEEE 754</td>' +
              '        <td>' +
              '          <b-badge class="registerPopover">' +
              '            {{show_value(register, \'decimal\')}}' +
              '          </b-badge>' +
              '        </td>' +
              '      </tr>' +
              '    </tbody>' +
              '  </table>' +
              '' +
              '   <b-container fluid align-h="center" class="mx-0">' +
              '     <b-row align-h="center" cols="2">' +
              ' ' +
              '       <b-col class="popoverFooter">' +
              '         <b-form-input v-on:input="debounce(\'newValue\', $event)" ' +
              '                       :value="newValue" ' +
              '                       type="text" ' +
              '                       size="sm" ' +
              '                       title="New Register Value" ' +
              '                       placeholder="Enter new value">' +
              '         </b-form-input>' +
              '       </b-col>' +
              ' ' +
              '       <b-col>' +
              '         <b-button class="btn btn-primary btn-sm w-100" ' +
              '                   @click="updateReg(component.index, register.name, architecture.components[component.index].type, architecture.components[component.index].double_precision)">' +
              '           Update' +
              '          </b-button>' +
              '       </b-col>' +
              ' ' +
              '     </b-row>' +
              '   </b-container>' +
              '</b-popover>'

  }

  Vue.component('popover-register', uielto_register_popover)

  /*Determines the refresh timeout depending on the device being used*/
  function getDebounceTime(){
    if(screen.width > 768){
      return 500;
    }
    else{
      return 1000;
    }
  }