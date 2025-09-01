
var uielto_select_extension = {
  props: {

  },
  data: function(){
    return {
            local_extensions: set_extensions,
    };
    
  },
  computed: {
    selectAll: {
      get() {
        return this._data.local_extensions.length > 0 && this._data.local_extensions.every(ext => ext.activated);
      },
      set(value){
        this._data.local_extensions.forEach(ext => {
          ext.activated = value;
        });
        set_extensions = this._data.local_extensions;
      }
    }
  },
  template:
  '<div>'+
  ' <b-row>'+
  '<b-col>'+
  '   <b-form-checkbox style="margin-bottom:2%;" v-model="selectAll">Select all</b-form-checkbox>'+
  '</b-col>'+
  ' </b-row>'+
  ' <b-row v-for="i in Math.ceil(local_extensions.length / 2)" :key="i">'+
  '   <b-col>'+
  '     <b-form-checkbox v-model="local_extensions[ (i - 1) * 2].activated"'+
  '      name="local_extensions[ (i - 1) * 2].name">'+
  '     {{local_extensions[(i - 1) * 2].name + " " + local_extensions[(i - 1) * 2].description}}'+
  '     </b-form-checkbox>'+
  '   </b-col>'+
  ''+
  '   <b-col>'+
  '     <b-form-checkbox v-model="local_extensions[ (i - 1) * 2 + 1].activated"'+
  '      name="local_extensions[ (i - 1) * 2 + 1].name"'+
  '      v-if="(i - 1) * 2 + 1 < local_extensions.length">'+
  '     {{local_extensions[(i - 1) * 2 + 1].name + " " + local_extensions[(i - 1) * 2 + 1].description}}'+
  '     </b-form-checkbox>'+
  '   </b-col>'+
  ''+
  ' </b-row>'+
  '</div>'
   

};
Vue.component("select-extension", uielto_select_extension);
