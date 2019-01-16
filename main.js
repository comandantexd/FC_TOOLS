(function () {
    if (typeof(_MODULES) != "undefined" && typeof(_LIB) != "undefined") {
        const URL = location.pathname.replace("/", ID_CHAR);

        let i;

        let regex; //for creating the regular expression on line 81
        let panel; //will be assigned to an object "Panel"
        let notification; //will be assigned to an object "Notification"









        //opciones














        let main_options = saver.load(STORAGE_KEY);
        if (!main_options) {
            main_options = {
                notification: true,
                disabledModules: ''
            };
            saver.save(STORAGE_KEY, main_options);
        }

        let loadedModules = []; //only for notification
        let modules = MODULELIST;
        modules.forEach(f => { //here the main_options are loaded into the modules object array
            if (main_options.disabledModules.search(titleTransform(f.name)) != -1) {
                f.enabled = false;
            }
        });

        class ConfigPanel {
            constructor(params) {
                this.params = params;
            }

            showPanel() {
                swal({
                    title: 'Configuration',
                    html: `<input type="text" id="hotkey-filters" readonly value="${inputui.getDispatcher('filters')}">`,
                    preConfirm: () => {

                    },
                    onOpen: () => {
                        $('#hotkey-filters').keydown(function(ev) {
                            //console.log(ev);
                            $(this).val(ev.originalEvent.code);
                            inputui.changeDispatcher('filters', ev.originalEvent.code);
                        });
                    }
                });
            }
        }
        let configpanel = new ConfigPanel('param');

        class Panel {
            constructor(title, body){
                this.title = title;
                this.body = body;
            }

            showPanel() {
                swal({
                    title: this.title,
                    html: this.body,
                    preConfirm: () => {
                        let mod; //modules which will be getted from html in form of [object_html]
                        let n = modules.length;
                        let htmlMODULES = [];
                        let str = "";

                        if (document.getElementById(NOTIFICATION_ENABLER_ID).checked != main_options.notification) { //checks the checkbox
                            main_options.notification = document.getElementById(NOTIFICATION_ENABLER_ID).checked;
                            saver.save(STORAGE_KEY, main_options);
                        }

                        for (i = 0; i < n; i++) {
                            mod = document.getElementById(titleTransform(modules[i].name));
                            htmlMODULES[i] = {
                                name: mod.id,
                                enabled: document.getElementById(titleTransform(modules[i].name)).checked
                            }
                        }

                        htmlMODULES.map(module => {
                            if (!module.enabled) {
                                str += ` - ${module.name}`;
                            }
                        });

                        if (main_options.disabledModules != str) { //Makes sure that there is any change to apply
                            main_options.disabledModules = str;
                            saver.save(STORAGE_KEY, main_options);
                            needToApply = true;
                        }
                    },
                    onOpen: () => {
                        $('#configBttn').click(function() {
                            configpanel.showPanel();
                        });
                    }
                });
            }
        };

        //LOAD DE MODULES and EXECUTE the needed ones
        i = 0;
        regex = new RegExp('\\b' + URL + '\\b');
        modules.forEach(module => {
            if (module.url.replace('/', ID_CHAR).search(regex) == 0){
                if (module.enabled) {
                    module.exec();
                    loadedModules[i++] = module.name;
                }
            }
        });

        notification = new Notification(NOTIFICATION_TITLE, loadedModules);
        window.addEventListener('load', function () {
            if (main_options.notification) {
                notification.showNotification();
            }
        });

        window.addEventListener('main', function (ev) {
            panel = new Panel(PANEL_TITLE, panelBodyBuilder(modules, main_options, loadedModules));
            panel.showPanel();
        });
    } else {
        if (typeof(_MODULES) == "undefined" && typeof(_LIB) == "undefined") {
            console.error("ERROR EXECUTING MAIN.js! REQUIRED:\n- MODULES.js\n- LIB.js");
        } else if (typeof(_MODULES) == "undefined") {
            console.error("ERROR EXECUTING MAIN.js! REQUIRED:\n- MODULES.js");
        } else {
            console.error("ERROR EXECUTING MAIN.js! REQUIRED:\n- LIB.js");
        }
    }
})();
