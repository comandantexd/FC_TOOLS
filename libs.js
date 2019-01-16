const _LIB = true;

const $ = jQuery;
$.expr[':'].icontains = function (a, i, m) {
    return jQuery(a).text().toUpperCase()
    .indexOf(m[3].toUpperCase()) >= 0;
};

const NOTIFICATION_ENABLER_ID = 'modules_notification_enabler';
const STORAGE_KEY = 'FC_FULL_MAIN_OPT';
const STORAGE_OPT_KEY = 'FC_FULL_MOD_OPT';
const ID_CHAR = '_';
const PANEL_TITLE =  'Aviable modules';
const NOTIFICATION_TITLE = 'Loaded modules';

const Utils = {
    utf8ToIso: (arrayBuffer) => {
        let encoder = new TextDecoder("ISO-8859-1");
        arrayBuffer = new Uint8Array(arrayBuffer);
        return encoder.decode(arrayBuffer);
    },

    parseHTML: (text) => {
        return (new DOMParser()).parseFromString(text, "text/html");
    },

    responseToHtml: (response) => {
        return response.arrayBuffer()
        .then(Utils.utf8ToIso)
        .then(Utils.parseHTML);
    }
};

// ----------------------------------------CONTROLING EVENTS-------------------------------------
// example configuration
// const INPUT_CONFIG = [{
//     eventName: 'run',
//     dispatcher: 'KeyL',
//     action: 'keydown'
// },{
//     eventName: 'jump',
//     dispatcher: 'KeyT',
//     action: 'keydown'
// }];

//the keys that dispatch the event can be changed dinamicly
class InputUI { //needs a configuration array of objects like the above
    constructor(config) {
        this.name = [];
        this.event = [];
        this.dispatcher = [];

        for (let i = 0; i < config.length; i++) {
            this.event[i] = new Event(config[i].eventName);
            this.dispatcher[i] = config[i].dispatcher;
            this.name[i] = config[i].eventName;

            window.addEventListener('keydown', ev => {
                ev.code == this.dispatcher[i] && window.dispatchEvent(this.event[i]);
            });
        }
    }

    changeDispatcher(eventName, key) {
        this.dispatcher[this.name.indexOf(eventName)] = key;
    }

    getDispatcher(eventName) {
        return this.dispatcher[this.name.indexOf(eventName)];
    }
}
//-------------------------------------------------------------------------------------------------------

//-----------------------------------------------------------------------------------USED IN MAIN.JS------------------------------------------------------------------------------------
let needToApply = false;

class Notification {
    constructor(title, modules){ //the modules input must be an array of module names
        this.title = title;
        this.modules = modules;
    }

    showNotification() {
        Swal({
            position: 'top-end',
            type: 'success',
            title: `${this.title}\n\n`+
                    `${this.modules.join('\n')}`,
            showConfirmButton: false,
            timer: 2500,
            toast: true,
        });
    }
}

class Saver { //for saving objects only
    save(key, val) {
        localStorage.setItem(key, JSON.stringify(val));
    }

    load(key) {
        return JSON.parse(localStorage.getItem(key));
    }
};
let saver = new Saver();

function titleTransform(input) {
    return input.replace(' ', ID_CHAR);
}

function searchDisabledModules(mod) { //to use on .map() or something like that
    let buffOpts = saver.load(STORAGE_KEY);
    return buffOpts.disabledModules.search(titleTransform(mod.name)) != -1 ? false : true;
}

function panelBodyBuilder(mods, opts, currentMods) {
    let str = `<hr><table width="100%">`;
    mods.map(f => {
        f.allowConfig ? console.log(f.name, true) : '';
        str += `<tr>`+
        `<td>${f.name}</td>` +
        `<td><input type="checkbox" id="${titleTransform(f.name)}" ${searchDisabledModules(f) ? 'checked' : ''}></td>` + //THE ID IS modules.name.replace(' ', ID_CHAR)
        `</tr>`;
    });
    str += `</table><hr><table width="100%"><tr>` +
    `<td colspan="2">Mostrar notificación? <input type="checkbox" id="${NOTIFICATION_ENABLER_ID}" ${opts.notification ? 'checked' : ''}></td>` +
    `</tr>` +
    `<tr><td><span style="cursor: pointer" id="configBttn">config</span></td></td>` +
    `${needToApply ? "<tr>THERE ARE UNAPPLIED CHANGES</tr>" : ""} </table><hr>` +
    `<table width="100%">` +
    `<tr><td colspan="2">` +
    `<strong>Active modules:</strong>` +
    `</tr></td>`;
    currentMods.map(f => {
        str += `<tr><td colspan="2">${f}</tr></td>`;
    });
    `</table>`;
    return str;
}
//-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

function setCustomCSS(cssStr) { //function  for append a custom CSS into the head for the modals
    $('head').append(cssStr);
}

function cursorToEnd(obj) {
    let val = obj.val();
    obj.focus().val('').val(val);
    obj.scrollTop(obj[0].scrollHeight);
}
