// ==UserScript==
// @name         Highlight Dangerous Posts
// @description  Este script destaca los hilos que sean +18, +16, +14, +nsfw, +serio
// @author       comandantexd
// @version      1.0
// @namespace    http://tampermonkey.net/
// @match        https://www.forocoches.com/*
// @require      https://code.jquery.com/jquery-3.3.1.min.js
// @require      https://cdn.jsdelivr.net/npm/sweetalert2/dist/sweetalert2.all.min.js
// @require      file:///C:/Users/AlumnoM/Desktop/fc/libs.js
// ==/UserScript==

const _MODULES = true;

const INPUT_CONFIG = [{
    eventName: 'filters',
    dispatcher: 'KeyF'
},{
    eventName: 'main',
    dispatcher: 'ESCAPE'
}];

var inputui = new InputUI(INPUT_CONFIG);

//--------------------------------------MODULES LIST DECLARATION--------------------------------
const MODULELIST = [{
    //------------------------------------DANGER POSTS--------------------------------------
    name: 'Danger Posts',
    url: '/',
    exec: () => {
        'use strict';

        const PATH = location.pathname;

        let rowsSelected;
        let regularSel;

        const flags = ['+18', '+16', '+14', '+nsfw', 'nsfw', '+serio', 'tema serio', 'temaserio'];

        if (PATH == "/foro/forumdisplay.php") {
            regularSel = flags.map(f => `a:icontains('${f}')`).join(', ');
            rowsSelected = $(regularSel).parent().parent();
        } else {
            regularSel = flags.map(f => `a[title*='${f}' i]`).join(', ');
            rowsSelected = $(regularSel).parent();
        }

        rowsSelected.css({
            backgroundColor: '#FFD7D1',
            textDecoration: 'underline'
        });
    },
    enabled: true
},{
    //--------------------------------------FAST QUOTE MSG-----------------------------------------
    name: 'Fast Quote Msg',
    url: '/foro/showthread.php',
    exec: () => {
        'use strict';

        const MODAL_ID = "fastquoteform";

        let cssStr;

        cssStr = '<style>' +
            `#${MODAL_ID} *::selection {` +
                'background-color: blue;' +
                'color: white;' +
            '}' +
        '</style>';

        setCustomCSS(cssStr);

        $('img[title="Responder Con Cita"]').parent().click(function (event) {
            event.preventDefault();

            let quoteBttn = $(this);
            let msgBody = quoteBttn.parent().parent().parent();

            let mentionedUser = msgBody.find('a.bigusername').text();

            let urlToFetch = quoteBttn[0].href;

            fetch(urlToFetch)
            .then(Utils.responseToHtml)
            .then(f => {
                let template = $(f).find('form[name="vbform"]')[0].outerHTML;

                swal({
                    customClass: 'modalreply',
                    width: '100%',
                    title: `Citar mensaje de ${mentionedUser}`,
                    html: template,
                    showConfirmButton: false,
                    onOpen: (dialog) => {
                        $(dialog)[0].id = MODAL_ID;
                        //$(dialog).find('table.tborder')[1].remove(); will remove the options under the quote form
                        cursorToEnd($(dialog).find('textarea[name="message"]'));
                        $(dialog).find('input[type="submit"]').click(function () {
                            swal.close();
                        });
                    }
                });
            });

            event.stopPropagation();
        });
    },
    enabled: true
},{
    //--------------------------------------FILTER KEY WORDS----------------------------------------
    name: 'Filter Key Words',
    url: '/',
    exec: () => {
        'use strict';

        const IN_ROOT_PATH = location.pathname === '/';
        const SPLIT_CHAR = "\n";

        const MODAL_ID = 'filterThreads';

        let cssStr;
        let dialogIsOpen = false;

        // Get flags text. if not exists, use ''
        let filterText = localStorage.getItem('tm_ft_flags') || '';
        // Get filters enabled option. ifnot exists, use 'true'
        let filtersEnabled = localStorage.getItem('tm_ft_is_enabled') === 'true';

        // if in root path ? use this : else use this other
        let threadLinks = $(IN_ROOT_PATH ?
            'a.texto[href*="/foro/showthread.php?t="][title]' :
            'a[href*="showthread.php?t="][id]'
        );


        // Define a string method
        String.prototype.removeTildes = function() {
            return this.normalize('NFD') // char to unicode: 'á' -> 'a\u0301'
            .replace(/[\u0300-\u036f]/g, ""); // remove \u0300 - \u036f
        };

        function filterThreads() {
            // show every thread rows
            threadLinks.closest('tr').show();

            if (filtersEnabled) {
                let flags = filterText.split(SPLIT_CHAR)
                .map(f => f.trim()
                    .toLowerCase()
                    .removeTildes()
                )
                // remove empty flags
                .filter(f => f !== "");

                // For each thread link
                threadLinks.each((i, el) => {
                    el = $(el);
                    let title = (IN_ROOT_PATH ? el.attr('title') : el.text())
                    .toLowerCase()
                    .removeTildes();

                    let includesFilteredPhrase = !flags.every(f => !title.includes(f))

                    if (includesFilteredPhrase)
                        el.closest('tr').hide();

                });
            }
        }

        function showPopPup() {
            let popupElement;
            return swal({
                title: 'Modificar filtros',
                html: `<textarea id="swal-input1" class="swal2-textarea" ` +
                `placeholder="Separar las palabras con comas" spellcheck="false"></textarea>` +
                `<input type="checkbox" class="swal2-checkbox" ${filtersEnabled ? 'checked' : ''}>` +
                '<span class="swal2-label">Activar filtros</span>',

                showCancelButton: true,
                reverseButtons: true,
                cancelButtonColor: '#E03A3A',
                focusConfirm: false,

                onOpen: (tempPopupElement) => {
                    dialogIsOpen = true;
                    popupElement = tempPopupElement;

                    popupElement.id = MODAL_ID;

                    let textarea = $(popupElement).find('textarea')[0];
                    $(textarea).val(filterText);

                    // Put cursor at the end
                    textarea.setSelectionRange(filterText.length, filterText.length);

                    //scroll to bottom
                    textarea.scrollTop = textarea.scrollHeight;
                },

                preConfirm: () => ({
                    text: $(popupElement).find('textarea').val(),
                    enabled: $(popupElement).find('[type="checkbox"]')[0].checked
                }),

                onClose: () => {
                    dialogIsOpen = false;
                }
            });
        }

        window.addEventListener('filters', function(event) {
            // if key is pressed and dialog is not open
            if (!dialogIsOpen) {
                // prevent writing on inputs

                if (!['INPUT', 'TEXTAREA'].includes(event.target.nodeName)) {
                    event.preventDefault();

                    let selectedRows = $([]);

                    showPopPup()
                    .then(({
                        value: response
                    }) => {
                        filterText = response.text.trim();
                        filtersEnabled = response.enabled;

                        // Save flags on localStorage
                        localStorage.setItem('tm_ft_flags', filterText);
                        localStorage.setItem('tm_ft_is_enabled', filtersEnabled);

                        filterThreads();

                        // Add a new line
                        filterText += '\n';
                    })
                    .catch((error) => console.error(error));
                }
            }
        });

        // Add custom css
        cssStr = '<style>' +
            `#${MODAL_ID} .swal2-textarea {` +
                'font-size: 100% !important;' +
                'resize: vertical !important;'+
            '}' +
            `#${MODAL_ID} .swal2-checkbox {` +
                'margin-right: 5px !important;' +
            '}' +
            `#${MODAL_ID} .swal2-textarea, .swal2-checkbox, .swal2-label {` +
                'font-family: sans-serif !important;' +
            '}' +
        '</style>';

        setCustomCSS(cssStr);

        // Filter threads ASAP
        filterThreads();
    },
    enabled: true,
},{
    //--------------------------------------CONTINUOUS SCROLL--------------------------------------
    name: 'Continuous Scroll',
    url: '/foro/showthread.php',
    exec: () => {
        'use strict';

        const $ = jQuery;

        let html = window.document.documentElement;
        let currentScrollPos = window.scrollY;
        let pageHeight = html.scrollHeight - html.clientHeight;

        window.addEventListener('scroll', function (e) {
            currentScrollPos = window.scrollY;
            pageHeight = html.scrollHeight - html.clientHeight;
        });

        window.addEventListener('keydown', function (e) {
            if (e.code == 'KeyQ' && !e.shiftKey && !e.altKey && !e.metaKey && e.ctrlKey) {

                e.preventDefault();

                if (currentScrollPos == 0) {
                    let prev = $('[rel="prev"]');
                    if (prev.length > 0) prev[0].click();

                } else if (currentScrollPos == pageHeight) {
                    let next = $('[rel="next"]');
                    if (next.length > 0) next[0].click();
                }
            }
        });
    },
    enabled: true
},{
    //--------------------------------------IMAGE POP UP-------------------------------------------
    name: 'Image Pop Up',
    url: '/foro/showthread.php',
    exec: () => {
        'use strict';

        const MODAL_ID = 'impopup';

        let cssStr;

        let images = [];
        let imageIndex = 0;
        let src = '';
        let dialogIsOpen = false;

        function next() {
            imageIndex = ++imageIndex % images.length;
            src = images[imageIndex].attributes.href.value;
            $('#modal-thumb').attr('src', src);
            $('#modal-thumb').parent().attr('href', src);
            $('#img-index').text(imageIndex + 1);
        }

        function prev() {
            imageIndex = (imageIndex + images.length - 1) % images.length;
            src = images[imageIndex].attributes.href.value;
            $('#modal-thumb').attr('src', src);
            $('#modal-thumb').parent().attr('href', src);
            $('#img-index').text(imageIndex + 1);
        }

        $('img.thumbnail').click(function(event) {
            event.preventDefault();
            event.stopPropagation();

            //stores all the images
            images = $(this).closest('div').children().toArray();

            imageIndex = $(this).parent().index();
            src = images[imageIndex].attributes.href.value;

            swal({
                title: 'Archivos adjuntos',
                html: `<a href="${src}" target="_blank">` +
                `<img id="modal-thumb" class="swal2-image" src="${src}"></a>` +
                '<div id="modal-opt"><strong id="prev-arrow"><</strong>' +
                '<span id="img-index">0</span>' +
                '<strong id="next-arrow">></strong></div>',

                onOpen: (dialog) => {

                    $(dialog)[0].id = MODAL_ID;

                    dialogIsOpen = true;

                    if (images.length == 1) {
                        $('#modal-opt').css({
                            display: 'none'
                        });
                    } else {
                        $('#img-index').text(imageIndex + 1);
                        $('#next-arrow').click(next);
                        $('#prev-arrow').click(prev);
                    }
                },

                onClose: () => {
                    dialogIsOpen = false;
                }

            });
        });

        cssStr = '<style>' +
            '#next-arrow, #prev-arrow {' +
                'cursor: pointer;' +
                'padding: 0px 20px 0px 20px;' +
            '}' +
            `#${MODAL_ID} *::selection {` +
                'background-color: inherit;' +
                'color: inherit;' +
            '}' +
            `#${MODAL_ID}{` +
                'max-height: 100%;' +
            '}' +
        '</style>';

        setCustomCSS(cssStr);

        window.addEventListener('keydown', function(ev) {
            if (dialogIsOpen) {
                if (ev.code == "ArrowRight") next();
                if (ev.code == "ArrowLeft") prev();
            }
        }, true);
    },
    enabled: true
}//,{
    //--------------------------------------ICON AUTOCOMPLETE--------------------------------------
//     name: 'Icon Autocomplete',
//     url: '/foro/showthread.php /foro/newreply.php /foro/private.php',
//     exec: () => {
// //         'use strict';
// //
// //         let cssStr = `<style>
// //             /*#vB_Editor_QR_textarea, #vB_Editor_001_textarea {
// //                 background-color: transparent;
// //             }*/
// //
// //             .tm_backdrop {
// //                 position: absolute;
// //                 background-color: white;
// //                 margin: 0px;
// //                 box-sizing: border-box;
// //                 border: 1px solid gray;
// //                 border-radius: 3px;
// //                 text-align: left;
// //             }
// //
// //             .tm_backdrop > span.row:first {
// //                 padding-top: 2px;
// //             }
// //
// //             .tm_backdrop > span.row {
// //                 width: 100%;
// //                 display: inline-block;
// //                 padding: 3px 5px;
// //                 box-sizing: border-box;
// //             }
// //
// //             .tm_backdrop > span.row:hover {
// //                 color: red;
// //                 background-color: rgba(0, 0, 0, 0.05);
// //                 text-decoration: underline;
// //                 cursor: pointer;
// //             }
// //
// //             .tm_img {
// //                 /* max-width: 16px;*/
// //                 max-height: 20px;
// //                 display: inline;
// //                 float: right;
// //             }
// //         </style>`
// //         setCustomCSS(cssStr);
// //
// //         let bdata = {
// //             line: null,
// //             cursor: null,
// //             localCursor: null,
// //             textWidth: null,
// //             textHeight: null,
// //             maxRows: 10,
// //             display: false,
// //             selectedIndex: -1,
// //             lineNumber: 0
// //         };
// //
// //         const backdrop = $('<div class="tm_backdrop" style="display: none">');
// //
// //         backdrop.on('click', 'span.row', function () {
// //             bdata.display = false;
// //             backdrop.hide();
// //
// //             let text = editor.val();
// //             let cursor = editor.prop("selectionStart");
// //             let lastIndex = text.lastIndexOf(':', cursor);
// //
// //
// //             let iconText = $(this).text().trim();
// //
// //             // Add space padding if necessary
// //             let newText = text.substr(0, lastIndex);
// //             let padding = text[cursor] !== ' ' ? ' ' : '';
// //
// //             newText += iconText;
// //             newText += padding + text.substr(cursor);
// //
// //             editor.val(newText);
// //             editor.focus();
// //
// //             let newCursor = cursor + (newText.length - text.length) + (padding == ' ' ? 0 : 1);
// //             editor[0].setSelectionRange(newCursor, newCursor);
// //         });
// //
// //         let editor = null;
// //
// //         let icons = (() => {
// //             // Lets keep this just in case ;)
// //             /*
// //             // check if in cache
// //             let lsItem = localStorage.getItem('tm_icons_json');
// //             let jsonIcons = false;
// //
// //             if(lsItem !== null) {
// //                 let iconsParsed = false;
// //                 try {
// //                     jsonIcons = JSON.parse(lsItem);
// //                 } catch(e) {}
// //             }
// //
// //             if(jsonIcons !== false) {
// //                 return jsonIcons;
// //             }
// //
// //             let ajax = new XMLHttpRequest();
// //             ajax.open('GET', 'https://www.forocoches.com/foro/misc.php?do=getsmilies', false);
// //             ajax.send();
// //
// //
// //             let html = (new DOMParser()).parseFromString(ajax.responseText, "text/html");
// //
// //             let alt1 = html.querySelectorAll('.alt1');
// //             let alt2 = html.querySelectorAll('.alt2');
// //
// //             let iconTable = Array.from(alt1).concat(Array.from(alt2));
// //
// //             let tempIcons = [];
// //
// //             for(let i = 0; i < iconTable.length; i += 2) {
// //                 let text = iconTable[i + 1].innerText.trim();
// //                 let ic = iconTable[i].firstChild.src.split('/').slice(-1)[0];
// //
// //                 if(text[0] == ':' && text.substr(-1) == ':')
// //                     tempIcons.push([text, ic]);
// //             }
// //             tempIcons.sort();
// //             localStorage.setItem('tm_icons_json', JSON.stringify(tempIcons));
// //             */
// //
// //             let jsonIcons = GM_getResourceText('iconsJson');
// //             let tempIcons = JSON.parse(jsonIcons);
// //             tempIcons.sort();
// //
// //             return tempIcons;
// //         })();
// //
// //         function getTextWidth(text, font) {
// //             let canvas = getTextWidth.canvas || (getTextWidth.canvas = $("<canvas>")[0]);
// //
// //             let context = canvas.getContext("2d");
// //             context.font = font;
// //
// //             return context.measureText(text).width;
// //         }
// //
// //         const computeValues = () => {
// //
// //
// //             let text = editor.val();
// //             let cursor = editor.prop("selectionStart");
// //
// //             // first find, second find
// //             let ff = text.lastIndexOf('\n', cursor - 1);
// //             let sf = text.indexOf('\n', cursor);
// //
// //             let line = text.slice(
// //                 ff > -1 ? ff + 1 : 0,
// //                 sf > -1 ? sf : text.length
// //             );
// //
// //             let linesBefore = text.substr(0, ff).split('\n');
// //             let lineNumber = linesBefore.length == 1 && linesBefore[0] === '' ? 0 : linesBefore.length;
// //
// //             let localCursor = cursor - ff - 1;
// //             line = line.substr(0, localCursor) + ' ';
// //
// //             bdata.line = line;
// //             bdata.cursor = cursor;
// //             bdata.localCursor = localCursor;
// //             bdata.lineNumber = lineNumber;
// //         };
// //
// //         const updateBackdropRows = () => {
// //
// //             let patt = bdata.line.substr(0, bdata.localCursor);
// //
// //             if (patt.indexOf(':') === -1) {
// //                 bdata.display = false;
// //                 return;
// //             } else {
// //                 bdata.display = true;
// //             }
// //
// //             patt = patt.slice(patt.lastIndexOf(':'));
// //
// //             let filteredIcons = icons.filter(icon => {
// //                 return patt === icon[0].substr(0, patt.length);
// //             });
// //
// //             filteredIcons.sort();
// //
// //             let html = '';
// //
// //             filteredIcons = filteredIcons.slice(0, bdata.maxRows);
// //
// //             filteredIcons.slice(0, bdata.maxRows).forEach((el, i) => {
// //                 html += `<span class="row"><span>${el[0]}</span> <img src="//st.forocoches.com/foro/images/smilies/${el[1]}" class="tm_img"></span>`;
// //                 html += i != filteredIcons.length - 1 ? '<br>' : '';
// //             });
// //
// //             if (filteredIcons.length === 0 ||
// //                 (filteredIcons.length === 1 && filteredIcons[0] === patt)) {
// //                 bdata.display = false;
// //             }
// //
// //             backdrop.html(html);
// //         };
// //
// //         const updateBackdropPosition = e => {
// //             if (bdata.display) {
// //                 backdrop.show();
// //             } else {
// //                 backdrop.hide();
// //                 return;
// //             }
// //
// //             let editorPos = editor.position();
// //             let line = bdata.line;
// //             let lineNumber = bdata.lineNumber;
// //
// //             let editorStyle = window.getComputedStyle(editor[0]);
// //
// //             let font = `${editorStyle.fontSize} ${editorStyle.fontFamily}`;
// //             // let padding = parseFloat(editorStyle.padding.slice(0, -2))
// //
// //             let fontSize = parseFloat(editorStyle.fontSize.slice(0, -2));
// //
// //             let editorTextWidth = Math.ceil(getTextWidth(line + ' ', font));
// //             let editorTextHeight = ((lineNumber + 1) * fontSize);
// //
// //             // bdata.left = editorPos.left + editorTextWidth + padding;
// //             // bdata.top = editorPos.top + editorTextHeight;
// //
// //             let bdims = backdrop[0].getBoundingClientRect();
// //             let lastspan = backdrop.children().slice(-1)[0];
// //             lastspan = $(lastspan).children()[0];
// //
// //
// //             let lsdims = lastspan.getBoundingClientRect();
// //
// //             let leftMargin = editorPos.left + editorTextWidth;
// //             let topMargin = (editorPos.top + editorTextHeight) - (bdims.height - lsdims.height) - 1.5;
// //             console.log(editorPos.top, editorTextWidth, editorTextHeight, lineNumber, fontSize, bdims.height, lsdims.height);
// //
// //             backdrop[0].style.left = `${leftMargin}px`;
// //             backdrop[0].style.top = `${topMargin}px`;
// //
// //         };
// //
// //         // TODO: change name
// //         function operate(e) {
// //             computeValues();
// //             updateBackdropRows();
// //             updateBackdropPosition();
// //         }
// //
// //         function setup(e) {
// //             editor = $(e.currentTarget);
// //             editor.parents('form').submit(() => {
// //                 bdata.display = false;
// //                 backdrop.hide();
// //             });
// //             backdrop.appendTo(editor.parent());
// //         }
// //
// //         $('html').on('mousedown', 'textarea', setup);
// //         $('html').on('focus', 'textarea', setup);
// //         $('html').on('submit', 'textarea', () => {
// //             bdata.display = false;
// //             backdrop.hide();
// //         });
// //
// //         $('html').on('keydown', 'textarea', operate);
// //         $('html').on('keypress', 'textarea', operate);
// //         $('html').on('keyup', 'textarea', operate);
// //         $('html').on('mousedown', 'textarea', operate);
// //         $('html').on('mouseup', 'textarea', operate);
// //         $('html').on('focus', 'textarea', operate);
// //     },
//     enabled: true
/*}*/];
