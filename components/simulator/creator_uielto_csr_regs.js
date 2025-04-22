var uielto_csr_register_file = {
    props: {
        render: { type: Number, required: true},
        data_mode: {type: String, required: true} 
    },
    data: function (){
        return {}
    },
    methods: {


    },

    template:           
    
    '<div>'+
    
    // USER MODE REGISTERS
    '   <b-container v-b-toggle href="#hola" fluid align-h="between" class="mx-0 my-3 px-2">'+
    '       <b-row>' +
    '           <b-col cols="1">' +
    // '               <img src="/images/csr_menu.png" alt="open_close_menu_user">'+
    '           </b-col>' +
    '           <b-col>' +
    '               <div>USER MODE REGISTERS</div>' +
    '           </b-col>' +
    '       </b-row>' +
    '   </b-container>'+

    // SUPERVISOR MODE REGISTERS
    '   <b-container v-b-toggle href="#hola2" fluid align-h="between" class="mx-0 my-3 px-2">'+
    '       <b-row>' +
    '           <b-col cols="1">' +
    // '               <img src="/images/csr_menu.png" alt="open_close_menu_supervisor">'+
    '           </b-col>' +
    '           <b-col>' +
    '               <div>SUPERVISOR MODE REGISTERS</div>' +
    '           </b-col>' +
    '       </b-row>' +
    '   </b-container>'+


    // MACHINE MODE REGISTERS
    '   <b-container v-b-toggle href="#hola3" fluid align-h="between" class="mx-0 my-3 px-2">'+
    '       <b-row>' +
    '           <b-col cols="1">' +
    // '               <img src="/images/csr_menu.png" alt="open_close_menu_machine">'+
    '           </b-col>' +
    '           <b-col>' +
    '               <div>MACHINE MODE REGISTERS</div>' +
    '           </b-col>' +
    '       </b-row>' +
    '   </b-container>'+

    // COMMON REGISTERS
    '   <b-container v-b-toggle href="#hola4" fluid align-h="between" class="mx-0 my-3 px-2">'+
    '       <b-row>' +
    '           <b-col cols="1">' +
    // '               <img src="/images/csr_menu.png" alt="open_close_menu_common">'+
    '           </b-col>' +
    '           <b-col>' +
    '               <div>COMMON REGISTERS</div>' +
    '           </b-col>' +
    '       </b-row>' +
    '   </b-container>'+


    '<b-collapse id="hola">'+
    '   <b-row v-for="(csreg, index) in architecture.components[3].elements.user" :key="\'csreguser-\'index" v-if="index % 2 === 0">'+
    '       <b-col cols="1" class="fas fa-info-circle">' + // Boton hover de info
    '       </b-col>' +
    '       <b-col cols="2">' + // Nombre del registro
    '           {{csreg.name}}'+
    '       </b-col>' +
    '       <b-col cols="3">' + // Valor del registro
    '       {{csreg.value}}' +
    '       </b-col>' +
    '' +
    '       <b-col cols="1" class="fas fa-info-circle" v-if="architecture.components[3].elements.user[index + 1] !== undefined">' + // Boton hover de info
    '       </b-col>' +
    '       <b-col cols="2" v-if="architecture.components[3].elements.user[index + 1] !== undefined">' + // Nombre del registro
    '           {{csreg[index + 1].name}}' + 
    '       </b-col>' +
    '       <b-col cols="3" v-if="architecture.components[3].elements.user[index + 1] !== undefined">' + // Valor del registro
    '           {{csreg[index + 1].value}}' + 
    '       </b-col>' +
    '   </b-row>' +
    '</b-collapse>'+

    '<b-collapse id="hola2">'+
    '   <b-row v-for="(csreg, index) in architecture.components[3].elements.supervisor" :key="\'csregsuper-\'index" v-if="index % 2 === 0">'+
    '       <b-col cols="1" class="fas fa-info-circle">' + // Hover de informacion del registro
    '       </b-col>' +
    '       <b-col cols="2">' + // Nombre del registro
    '           {{csreg.name}}' +
    '       </b-col>' +
    '       <b-col cols="3">' + // Valor del registro
    '           {{csreg.value}}' +
    '       </b-col>' +
    '       <b-col cols="1" class="fas fa-info-circle" v-if="architecture.components[3].elements.supervisor[index + 1] !== undefined">' +
    '       </b-col>' +
    '       <b-col cols="2" v-if="architecture.components[3].elements.supervisor[index + 1] !== undefined">' +
    '           {{csreg[index + 1].name}}' +
    '       </b-col>' +
    '       <b-col cols="3" v-if="architecture.components[3].elements.supervisor[index + 1] !== undefined">' +
    '           {{csreg[index + 1].value}}' +
    '       </b-col>' +
    '   </b-row>' +
    '</b-collapse>'+

    '<b-collapse id="hola3">'+
    '   <b-row v-for="(csreg, index) in architecture.components[3].elements.machine" :key="\'csregmach-\'index" v-if="index % 2 === 0">'+
    '       <b-col cols="1" class="fas fa-info-circle">' + // Hover de informacion
    '       </b-col>' +
    '       <b-col cols="2">' + // Nombre del registro
    '       {{csreg.name}}'+
    '       <b-col cols="3">' + // Valor del registro
    '       {{csreg.value}}' +
    '       </b-col>'+

    '       <b-col cols="1" class="fas fa-info-circle" v-if="architecture.components[3].elements.machine[index + 1] !== undefined">' + // Hover de informacion impar
    '       </b-col>' +
    '       <b-col cols="2" v-if="architecture.components[3].elements.machine[index + 1] !== undefined">' + // Nombre del registro impar
    '           {{csreg[index + 1].name}}' +
    '       </b-col>' +
    '       <b-col cols="3" v-if="architecture.components[3].elements.machine[index + 1] !== undefined">' + // Valor del registro impar
    '           {{csreg[index + 1].value}}' +
    '       </b-col>' +
    '   </b-row>' +
    '</b-collapse>'+

    '<b-collapse id="hola4">'+
    '   <b-row v-for="(csreg, index) in architecture.components[3].elements.common" :key="\'csregcommon-\'index" v-if="index % 2 === 0">'+
    '       <b-col cols="1" class="fas fa-info-circle">' +
    '       </b-col>' +
    '       <b-col cols="2">' +
    '           {{csreg.name}}' +
    '       </b-col>' +
    '       <b-col cols="3">' +
    '           {{csreg.value}}' +
    '       </b-col>' +
    '       <b-col cols="1" class="fas fa-info-circle" v-if="architecture.components[3].elements.common[index + 1] !== undefined">' +
    '       </b-col>' +
    '       <b-col cols="2" v-if="architecture.components[3].elements.common[index + 1] !== undefined">' +
    '           {{csreg[index + 1].name}}' +
    '       </b-col>'+
    '       <b-col cols="3" v-if="architecture.components[3].elements.common[index + 1] !== undefined">' +
    '           {{csreg[index + 1].value}}' +
    '       </b-col>' +
    '   </b-row>' +
    '</b-collapse>'+



    
    '</div>'



};

Vue.component('csr-register-file', uielto_csr_register_file);