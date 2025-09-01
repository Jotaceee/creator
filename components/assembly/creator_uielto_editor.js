var uielto_multifile_editor = {
  data : function(){
    return {current_editor_tabs: app.tabs,
            currentTabIndex: activeTabIndex,
            tabskey: 0
    };

  },
  methods: {
    removeTab(index) {
      let tabind = app.tabs.find(tab => tab.id === index);
      if (tabind === undefined) return;
      let tabid = tabind.id;
      closeFile(app.tabs[tabid].title);
      app.tabs.splice(tabid, 1);
      for (let i = 0; i < app.tabs.length; i++){
        if (app.tabs[i].id > tabid)
          app.tabs[i].id = app.tabs[i].id - 1;
      }

      if (app.tabs.length > 0) {
        // let edited_f = assembly_files.find(f => f.editing_now === true);
        // let open_f = app.tabs.find(f => f.title === edited_f.filename);
        let open_f = app.tabs[app.tabs.length - 1];
        if (open_f !== undefined) {
          activeTabIndex = open_f.id;
          showFile(open_f.title);
        } else {
          let changed = false;
          for(var i = 0; i < app.tabs.length; i++){
            if(app.tabs[i].id !== activeTabIndex && !changed){
              activeTabIndex = app.tabs[i].id;
              changed = true;
              showFile(app.tabs[i].title);
            }
          }
        }
        
      } else {
        activeTabIndex = -1;
      }
      
    },

  },
  watch: {
    activeTabIndex(val) {
      if (this.currentTabIndex !== val) {
        this.currentTabIndex = val;
      }
    },
    current_editor_tabs(newTabs, oldTabs) {
        const lastTab = newTabs[newTabs.length - 1];
        if (lastTab !== undefined){
          activeTabIndex = lastTab.id;
          this.$nextTick(() => {
            this.currentTabIndex = lastTab.id;
            this.tabskey++;
          });
        }else 
        activeTabIndex = -1;
    }
  },

  computed: {
    currentTab: {
      get() {
        return this.currentTabIndex;
      },
      set(val) {
        if (val !== this.currentTabIndex) {
          this.currentTabIndex = val;
          const tab = app.tabs.find(t => t.id === val);
          if (tab) showFile(tab.title);
          else { // limpiar el code mirror  
          
          }
        }
      }
    }
  },
  template: 
  "<b-tabs :key=\"tabskey\" content-class=\"mt-3\" v-model=\"currentTab\" >"+ // style=\"max-width: auto;\"
  "  <b-tab v-for=\"tab in current_editor_tabs\" :value=\"tab.id\" :id=\"tab.title\" @click=\"showFile(tab.title)\" :title=\"tab.title\">" +
  "    <template #title> "+
  "    <span class=\"tab-title\">"+
  "     {{ tab.title }}"+
  "     <b-button variant=\"outline-danger\" size=\"sm\" class=\"close-btn\" @click.stop=\"removeTab(tab.id)\">X</b-button>"+
  "    </span>"+
  "    </template>"+
  "  </b-tab>"+
  "</b-tabs>"
}
Vue.component("multifile-editor", uielto_multifile_editor);

var uielto_applied_libs = {
  // variable de control update_binary
  data: function (){
    return {
      fields: [
          {key: "Name", label: "Name"},
          {key: "Apply", label: "Apply"}
      ]
    }
  },
  methods: {
    modifyToApply(filename){
      let lib_index = this.libs_to_list.findIndex(file => file.name === filename);
      let binary_index = app.update_binary.findIndex(binary => binary.name === filename);

      console.log(binary_index);
      app.update_binary[binary_index].apply = !app.update_binary[binary_index].apply;
      this.libs_to_list[lib_index].apply = !this.libs_to_list[lib_index].apply;
      console.log(app.update_binary);
    }

  },
  computed : {
    libs_to_list() {
      return app.update_binary;
    }
    
  }, 
  template:
  "<div style=\"overflow-x: auto; max-width: 100%;\">"+
  " <b-table stripped hover :items=\"libs_to_list\" :fields=\"fields\" thead-class=\"theadg\" style=\"width: 100%; table-layout:auto;\">"+
  "   <template #cell(Name)=\"data\">"+
  "     <div style=\"margin:2%;\">{{ data.item.name }}</div>"+
  "   </template>"+
  "   <template #cell(Apply)=\"data\">"+
  "      <b-form-checkbox switch v-model=\"data.item.apply\" @change=\"modifyToApply(data.item.name)\"></b-form-checkbox>"+
  "   </template>"+
  " </b-table>"+
  "</div>"
}
Vue.component("applied-libs", uielto_applied_libs);

var uielto_file_menu = {  // En cada entrada habra un objeto: {filename (string), assembly_code (string), to_compile (bool)}
  props : {
    files_to_list: {type: Array, required: true}
  },
  data: function () {
    return {
      fields : [
        { key: 'Name', label: 'Name'},
        { key: 'To_compile', label: 'To compile'}
      ],
    };
  },
  methods: {
    modifyToCompile(filename){
      
      let file_index = this._props.files_to_list.findIndex(file => file.filename === filename);
      
      let assembly_index = assembly_files.findIndex(asmfile => asmfile.filename === filename);
      
      assembly_files[assembly_index].to_compile = !assembly_files[assembly_index].to_compile;
      this._props.files_to_list[file_index].to_compile = !this._props.files_to_list[file_index].to_compile;
    },
    hideContextMenu(){
      if (document.getElementById("contextMenu") !== null){
        document.getElementById("contextMenu").style.display = "none";
        selectedFile = null;
      }
    },
    showContextMenu(event, filename){
      
      event.preventDefault();
      selectedFile = event.target.textContent;

      let menu = document.getElementById("contextMenu");

      let x = event.pageX;
      let y = event.pageY;
      let menuWidth = menu.offsetWidth;
      let menuHeight = menu.offsetHeight;
      let windowWidth = window.innerWidth;
      let windowHeight = window.innerHeight;

      if (x + menuWidth > windowWidth) x = windowWidth - menuWidth - 5;
      if (y + menuHeight > windowHeight) y = windowHeight - menuHeight - 5;


      menu.style.left = x + "px";
      menu.style.top = y + "px";
      menu.style.display = "block";
    }
  },
  computed: {
    files: {
      get() {
        return this._props.files_to_list.map(file => ({Name :  file.filename, Selected: file.to_compile}));
      },
      set(newFile) {
        newFile.forEach((newFile, i) => {
          this._props.files_to_list.push({filename: newFile.filename, filename: newFile.to_compile});
        })
      }
    }
  },
  mounted() {
    document.addEventListener("click", this.hideContextMenu);
  },
  template: 

  "<div style=\"overflow-x: auto; max-width: 100%;\">"+
  " <b-table stripped hover :items=\"files\" :fields=\"fields\" thead-class=\"theadg\" style=\"width: 100%; table-layout:auto;\">"+
  "   <template #cell(Name)=\"data\">"+
  "     <div style=\"margin:2%;\" @contextmenu.prevent=\"(event) => showContextMenu(event, data.item.Name)\">{{ data.item.Name }}</div>"+
  "   </template>"+
  "   <template #cell(To_compile)=\"data\">"+
  "      <b-form-checkbox switch v-model=\"data.item.Selected\" @change=\"modifyToCompile(data.item.Name)\"></b-form-checkbox>"+
  "   </template>"+
  " </b-table>"+
  ' <div id="contextMenu" class="context-menu">'+
  '   <ul>'+
  '     <li onclick="openFile()">Abrir Fichero</li>'+
  '     <li onclick="renameFile()">Renombrar Fichero</li>'+
  '     <li onclick="deleteFile()">Eliminar Fichero</li>'+
  '   </ul>'+
  ' </div>'+
  ""+
  ""+
  ""+
  ""+
  "</div>"

}
Vue.component("file-menu", uielto_file_menu);
