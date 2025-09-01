
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

function changeEntry(value){
  console.log("Inicio: ", entry_elf);
  if (execution_mode_run !== -1) {
    // show error
    show_notification("You cannot change the entry binary value during the execution. Please stop or reset the simulation environment", "danger");
  } else {
    for (let i = 0; i < instructions.length; i++) {
      if (i !== value)
        instructions[i]._rowVariant = '';
      else 
        instructions[i]._rowVariant = "success";
    }
    entry_elf = instructions[value].Address;
    if (!entry_elf.startsWith("0x"))
      entry_elf = "0x" + entry_elf;
  }
  console.log("Cambia el entry: ", entry_elf);
}


  var uielto_execution = {

  props:      {
                instructions:   { type: Array, required: true },
                enter:          { type: String, required: true }
              },

  data:       function () {
                return {
                  /*Instrutions table fields*/
                  archInstructions: ['Break', 'Address', 'Label', 'userInstructions', 'loadedInstructions', 'tag'],
                }
              },

  methods:    {
                /*Filter table instructions*/
                filter(row, filter){
                  if(row.hide === true){
                    return false;
                  }
                  else{
                    return true;
                  }
                },

                /*Enter a breakpoint*/
                breakPoint(record, index){
                  for (var i = 0; i < instructions.length; i++) {
                    if(instructions[i].Address == record.Address){
                      index = i;
                      break;
                    }
                  }

                  if(instructions[index].Break == null){
                    instructions[index].Break = true;
                    app._data.instructions[index].Break = true; //TODO: vue bidirectional updates

                    /* Google Analytics */
                    creator_ga('send', 'event', 'execute', 'execute.breakpoint', 'execute.breakpoint');

                  }
                  else if(instructions[index].Break === true){
                    instructions[index].Break = null;
                    app._data.instructions[index].Break = null; //TODO: vue bidirectional updates
                  }
                },
                hideEntryPoint(){
                  if (document.getElementById("entryMenu") !== null){
                    document.getElementById("entryMenu").style.display = "none";
                    this.selectedItem = null;
                  }
                },
                handleRowEntry(item, index, event){
                  
                  event.preventDefault();
                  // selectedFile = event.target.textContent;

                  // let menu = document.getElementById("entryMenu");
                  
                  let menu = this.$refs.entryMenu;
                  console.log(document);
                  console.log(menu);
                  console.log(event);
                  console.log(item);
                  console.log(index); 
                  this.selectedItem = index;
                  

                  this.$nextTick(() => {
                  const menu = this.$refs.entryMenu;
                  if (!menu) return;
                  

                  let x = event.pageX / 2.5;
                  let y = event.pageY / 2.5;
                  const menuWidth = menu.offsetWidth;
                  const menuHeight = menu.offsetHeight;
                  const windowWidth = window.innerWidth;
                  const windowHeight = window.innerHeight;

                  if (x + menuWidth > windowWidth) x = windowWidth - menuWidth - 5;
                  if (y + menuHeight > windowHeight) y = windowHeight - menuHeight - 5;

                  menu.style.left = `${x}px`;
                  menu.style.top = `${y}px`;
                  menu.style.display = "block";
                });
                }                
              },
    mounted() {
                document.addEventListener("click", () => {
                  const menu = this.$refs.entryMenu;
                  if (menu) menu.style.display = "none";
                });
              },

  template:   
              '<div>'+
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
              '                @row-contextmenu="handleRowEntry"' +
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
              " </b-container>"+
              ' <div ref="entryMenu" class="context-menu">'+ 
              '   <ul>'+ 
              '     <li @click="changeEntry(selectedItem)">Select as new entry program</li>'+ 
              '   </ul>'+ 
              ' </div>'+
              '</div>'

  }

  Vue.component('table-execution', uielto_execution) ;