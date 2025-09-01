var uielto_csr_register = {
  props: {
      register: {type: Object, required: true}
  },
  methods:{
    show_csr_value(register){ 
        return "0x"+register.value;
    },
    update_csr_value(register){
    }
  },
  template: 
  '<div>'+
  '   <b-col>'+
  '     <div class="d-flex align-items-center justify-content-between">'+
  '       <div class="d-flex align-items-center">'+
  '         <span :id="register.name[0]" class="csr-register-icon fas fa-info-circle"></span>'+
  '         <csr-info :target="register.name[0]" :register="register"></csr-info>'+
  '         <span class="h5 csr-register-name">{{register.name[0]}}</span>'+
  '       </div>'+
  '       <span class="register-csr">{{show_csr_value(register)}}</span>'+
  '     </div>'+
  '   </b-col>'+
  '</div>'
}
Vue.component("csr-register", uielto_csr_register);
