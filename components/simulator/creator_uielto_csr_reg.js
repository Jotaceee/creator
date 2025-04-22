var uielto_csr_register = {
    props: {
        register: {type: Object, required: true}
    },
    methods:{
        show_csr_value(register){
            var ret = "0x"+register.value;
        },
        update_csr_value(register){
            console.log("actulizar valor");
        }
    },
    template: 
    '<div>'+
    // '   <b-col cols="2">'+
    '   <div class="fas fa-ifo-circle"></div>'+
    '   <div>{{register.name}}</div>'+
    // '   </b-col>'+
    // '   <b-col cols="2">'+
    '   <div>{{show_value(register)}}</div>'+
    // '   <b-col>'+
    '</div>'
}
Vue.component("csr-register", uielto_csr_register);