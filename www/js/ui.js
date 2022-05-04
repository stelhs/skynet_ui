
function $$(id)
{
    return document.getElementById(id);
}

function asyncAjaxReq(method, args = {}, successCb = NaN, errCb = NaN)
{
    args['method'] = method;
    return $.ajax({
          type: "GET",
          url: "/ui",
          data: args,
          success: successCb,
          error: errCb,
          async: true,
          timeout: 70000,
              }).responseText;
}


function syncAjaxReq(method, args = {})
{
    args['method'] = method;
    return $.ajax({
          type: "GET",
          url: "/ui",
          data: args,
          async: false
              }).responseText;
}

class Teamplates {
    constructor() {
        this.tplList = NaN;
        var d = syncAjaxReq('get_teamplates');
        eval('this.tplList = ' + d);
    }

    byName(name) {
        return this.tplList[name];
    }

    openTpl(name) {
        var tpl = new StrontiumTpl();
        var c = this.byName(name);
        tpl.openTpl(c);
        return tpl;
    }
}


class Module {
    constructor(name, title) {
        this.name = name;
        this.title = title;
    }
}

class Ui {
    constructor() {
        this.teamplates = new Teamplates();
        this.noSleep = new NoSleep('no_sleep_video');
        this.modules = [];

        this.errorBoxDiv = $$('errorBox');
        this.hidingPageDiv = $$('hidingPage');
        this.noSleep.run();
        this.register();
        this.eventReceiver();
    }

    register() {
        var c = syncAjaxReq('subscribe');
        var resp = JSON.parse(c)
        this.subscriberId = resp.subscriber_id;
    }

    eventHandler(sender, type, data) {
//        alert(data.room_t);
    }

    eventReceiver() {
        var success = function(responceText) {
            console.log("call success")
            this.errorBoxHide();
            var resp = JSON.parse(responceText)
            if (resp.status == 'error') {
                if (resp.error_code == 2) { // if not registred
                    this.register();
                    this.eventReceiver();
                    return;
                }

                this.errorBoxShow('Ошибка',
                                  'Ошибка сервера: status: ' + resp.status + '<br>' +
                                  'Причина: ' + resp.reason);
                var retry = function () {
                    this.eventReceiver();
                }
                setTimeout(retry.bind(this), 3000);
                return;
            }

            var events = resp.events;
            if (events.length) {
                for (var i in events) {
                    event = events[i];
                    this.eventHandler(event.sender,
                                 event.event_type,
                                 event.data);
                }
            }

            this.eventReceiver();
        }

        var error = function(jqXHR, exception) {
            console.log("call error")
            var reason = '';
            if (jqXHR.status === 0) {
                reason = 'Not connect.\n Verify Network.';
            } else if (jqXHR.status == 404) {
                reason = 'Requested page not found. [404]';
            } else if (jqXHR.status == 500) {
                reason = 'Internal Server Error [500].';
            } else if (exception === 'parsererror') {
                reason = 'Requested JSON parse failed.';
            } else if (exception === 'timeout') {
                reason = 'Time out error.';
            } else if (exception === 'abort') {
                reason = 'Ajax request aborted.';
            } else {
                reason = 'Uncaught Error.\n' + jqXHR.responseText;
            }

            this.errorBoxShow('Гавнище', 'Ошибшка связи с сервером: ' + reason);
            var retry = function () {
                this.eventReceiver();
            }
            setTimeout(retry.bind(this), 3000);
        }

        asyncAjaxReq('get_events',
                     {'subscriber_id': this.subscriberId},
                      success.bind(this), error.bind(this))
    }

    registerModule(list) {
        var menuTpl = this.teamplates.openTpl('menu')
        var modTpl = this.teamplates.openTpl('modules')
        for (var name in list) {
            var title = list[name];
            var mod = new Module(name, title);
            this.modules.push(mod);

            modTpl.assign('module',
                          {'name': name,
                           'module_content': this.teamplates.byName('mod_' + name)});

            menuTpl.assign('menu_item',
                       {'name': name,
                        'title': title});
        }
        $$('menu_panel').innerHTML = menuTpl.result();
        $$('modules').innerHTML = modTpl.result();
    }

    swithToModule(name) {
        this.noSleep.run()
        for (var i in this.modules) {
            var mod = this.modules[i];
            var menuDiv = $$('menu_item_' + mod.name);
            var moduleDiv = $$('module_' + mod.name);
            menuDiv.className = 'menu_item';
            moduleDiv.style.display = 'none';
            if (mod.name != name)
                continue;
            menuDiv.className = 'menu_item_active';
            moduleDiv.style.display = 'block';
        }
    }

    errorBoxShow(header, msg, timeout = 0) {
        var tpl = this.teamplates.openTpl('message_box');
        tpl.assign(NaN, {'header': header,
                         'msg': msg});
        this.errorBoxDiv.innerHTML = tpl.result();
        this.errorBoxDiv.style.display = 'block';
        this.hidingPageDiv.style.display = 'block';
        if (!timeout)
            return;

        var autohide = function () {
            this.errorBoxHide();
        }
        setTimeout(autohide.bind(this), timeout);
    }

    errorBoxHide() {
        console.log("call errorBoxHide")
        this.errorBoxDiv.style.display = 'none';
        this.hidingPageDiv.style.display = 'none';
    }
}



function init() {
    ui = new Ui();

    var modules = {'boiler': 'Котёл',
                   'guard': 'Охрана',
                   'modules_io': 'Модули IO'};
    ui.registerModule(modules)
}

