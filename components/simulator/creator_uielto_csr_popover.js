var uielto_csr_popover_info = {
  props: {
    target: {type: String, required: true},
    register: {type: Object, required: true}
  },
  template:
  "<b-popover :target=\"target\""  +
  "triggers=\"hover focus\" placement=\"bottom\" html>"+
  "  <template #title>"+
  "   <strong>{{ register.name[0] }}</strong>"+
  "  </template>"+
  "  <span :style=\"{ whiteSpace: 'pre-line' }\">{{register.info}}</span>"    +
  "</b-popover>"

};
Vue.component('csr-info', uielto_csr_popover_info);
