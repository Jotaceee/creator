var uielto_csr_register_file = {
  props: {
  },
  data: function (){
      return {
              openedSections : { user: false, supervisor: false, machine: false, common: false},
              userRegs: this.getRegs("user"),
              // userElems :   (architecture.components[4].elements.user.length % 2 === 0)       ? architecture.components[4].elements.user.length / 2       : (architecture.components[4].elements.user.length / 2) + 1,
              superRegs: this.getRegs("supervisor"),
              // superElems:   (architecture.components[4].elements.supervisor.length % 2 === 0) ? architecture.components[4].elements.supervisor.length / 2 : (architecture.components[4].elements.supervisor.length / 2) + 1,
              machineRegs: this.getRegs("machine"),
              // machineElems: (architecture.components[4].elements.machine.length % 2 === 0)    ? architecture.components[4].elements.machine.length / 2    : (architecture.components[4].elements.machine.length / 2) + 1, 
              commonRegs: this.getRegs("common"),
              // commonElems:  (architecture.components[4].elements.common.length % 2 === 0)     ? architecture.components[4].elements.common.length / 2     : (architecture.components[4].elements.common.length / 2) + 1
            }
  },
  methods: {
    toggleSeccion(name){
      this._data.openedSections[name] = !this._data.openedSections[name];
      if(this._data.openedSections[name]){
        this.getRegs(name);
      }
    },
    getRegs(type){
      var ret = [];
      for(var i = 0; i < architecture.components[4].elements.length; i++){
      
        if (architecture.components[4].elements[i].type === type && type === "user"){
          ret.push(architecture.components[4].elements[i]);
        } else if (architecture.components[4].elements[i].type === type && type === "supervisor"){
          ret.push(architecture.components[4].elements[i]);
        } else if (architecture.components[4].elements[i].type === type && type === "machine"){
          ret.push(architecture.components[4].elements[i]);
        } else if(architecture.components[4].elements[i].type === type && type === "common"){
          ret.push(architecture.components[4].elements[i]);
        }
      }
      return ret;
    
    }
  },
  template:           
  
  '<div>'+
  '<b-container v-b-toggle.user fluid align-h="between" class="mx-0 my-3 px-2">' +
  '       <b-row style="margin-left:0.001vh; max-width:99.95%; align-items:center; border-bottom:2px solid #6C757D;" @click="toggleSeccion(\'user\')">' +
  '         <b-col cols="1">' +
  '           <img '+
  '             src="./images/csr_menu.png" '+
  '             alt="toggle_user" ' +
  '             :class="{ rotated: openedSections.user }" ' +
  '             class="toggle-icon">' +
  '         </b-col>' +
  '       <b-col>' +
  '     <div>USER MODE REGISTERS</div>' +
  '   </b-col>' +
  ' </b-row>' +
  '</b-container>'+

  '<b-collapse id="user"> '+
  ' <b-container fluid>'+
  '   <b-row style="margin-top:1.5%; margin-bottom:1.5%;" v-for="i in Math.ceil(userRegs.length / 2)" :key="i" cols-xl="2" cols-lg="2" cols-md="2" cols-sm="1" cols-xs="1">'+
  
  '     <csr-register :id="(i-1)*2"'+
  '                   :register="userRegs[(i-1)*2]"'+
  '                   ></csr-register>'+

  '     <csr-register :id="(i - 1) * 2 + 1"'+
  '                   v-if="(i - 1) * 2 + 1 < userRegs.length"'+
  '                   :register="userRegs[(i - 1) * 2 + 1]"'+
  '                   ></csr-register>'+
  '   </b-row>' +
  ' </b-container>'+
  '</b-collapse>'+

  '<b-container v-b-toggle.super fluid align-h="between" class="mx-0 my-3 px-2">' +
  '       <b-row style="margin-left:0.001vh; max-width:99.95%; align-items:center; border-bottom:2px solid #6C757D;" @click="toggleSeccion(\'supervisor\')">' +
  '           <b-col cols="1">' +
  '           <img '+
  '             src="./images/csr_menu.png" '+
  '             alt="toggle_super" ' +
  '             :class="{ rotated: openedSections.supervisor }" ' +
  '             class="toggle-icon">' +
  '           </b-col>' +
  '           <b-col>' +
  '               <div>SUPERVISOR MODE REGISTERS</div>' +
  '           </b-col>' +
  '       </b-row>' +
  '</b-container>'+

  '<b-collapse id="super">'+
  '<b-container fluid>'+
  ' <b-row style="margin-top:1.5%; margin-bottom:1.5%;" v-for="i in Math.ceil(superRegs.length / 2)" :key="i" cols-xl="2" cols-lg="2" cols-md="2" cols-sm="1" cols-xs="1">'+
  
  '   <csr-register :id="(i-1)*2"'+
  '                 :register="superRegs[(i-1)*2]"'+
  '                 ></csr-register>'+

  '   <csr-register :id="(i - 1) * 2 + 1"'+
  '                 v-if="(i - 1) * 2 + 1 < superRegs.length"'+
  '                 :register="superRegs[(i - 1) * 2 + 1]"'+
  '                 ></csr-register>'+
  ' </b-row>' +
  '</b-container>'+
  '</b-collapse>'+

  '<b-container v-b-toggle.machine fluid align-h="between" class="mx-0 my-3 px-2">' +
  '       <b-row style="margin-left:0.001vh; max-width:99.95%; align-items:center; border-bottom:2px solid #6C757D;" @click="toggleSeccion(\'machine\')">' +
  '           <b-col cols="1">' +
  '           <img '+
  '             src="./images/csr_menu.png" '+
  '             alt="toggle_machine" ' +
  '             :class="{ rotated: openedSections.machine }" ' +
  '             class="toggle-icon">' +
  '           </b-col>' +
  '           <b-col>' +
  '               <div>MACHINE MODE REGISTERS</div>' +
  '           </b-col>' +
  '       </b-row>' +
  '</b-container>'+

  '<b-collapse id="machine">'+
  '<b-container fluid>'+
  ' <b-row style="margin-top:1.5%; margin-bottom:1.5%;" v-for="i in Math.ceil(machineRegs.length / 2)" :key="i" cols-xl="2" cols-lg="2" cols-md="2" cols-sm="1" cols-xs="1">'+
  
  '   <csr-register :id="(i-1)*2"'+
  '                 :register="machineRegs[(i-1)*2]"'+
  '                 ></csr-register>'+

  '   <csr-register :id="(i - 1) * 2 + 1"'+
  '                 v-if="(i - 1) * 2 + 1 < machineRegs.length"'+
  '                 :register="machineRegs[(i - 1) * 2 + 1]"'+
  '                 ></csr-register>'+
  ' </b-row>' +
  '</b-container>'+
  '</b-collapse>'+

  '<b-container v-b-toggle.common fluid align-h="between" class="mx-0 my-3 px-2">' +
  '       <b-row style="margin-left:0.001vh; max-width:99.95%; align-items:center; border-bottom:2px solid #6C757D;" @click="toggleSeccion(\'common\')">' +
  '           <b-col cols="1">' +
  '           <img '+
  '             src="./images/csr_menu.png" '+
  '             alt="toggle_common" ' +
  '             :class="{ rotated: openedSections.common }" ' +
  '             class="toggle-icon">' +
  '           </b-col>' +
  '           <b-col>' +
  '               <div>COMMON REGISTERS</div>' +
  '           </b-col>' +
  '       </b-row>' +
  ' </b-container>'+

  '<b-collapse id="common">'+
  '<b-container fluid>'+
  ' <b-row style="margin-top:1.5%; margin-bottom:1.5%;" v-for="i in Math.ceil(commonRegs.length / 2)" :key="i" cols-xl="2" cols-lg="2" cols-md="2" cols-sm="1" cols-xs="1">'+
  
  '   <csr-register :id="(i-1)*2"'+
  '                 :register="commonRegs[(i-1)*2]"'+
  '                 ></csr-register>'+

  '   <csr-register :id="(i - 1) * 2 + 1"'+
  '                 v-if="(i - 1) * 2 + 1 < commonRegs.length"'+
  '                 :register="commonRegs[(i - 1) * 2 + 1]"'+
  '                 ></csr-register>'+
  ' </b-row>' +
  '</b-container>'+
  '</b-collapse>'+
  '</div>'



};
Vue.component('csr-register-file', uielto_csr_register_file);
