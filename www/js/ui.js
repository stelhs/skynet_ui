
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
        this.defMarks = {'img_dir': '/img/'};
    }

    byName(name) {
        if (name in this.tplList)
            return this.tplList[name];
        return NaN;
    }

    openTpl(name) {
        var tpl = new StrontiumTpl(this.defMarks);
        var c = this.byName(name);
        if (!c)
            return NaN;
        tpl.openTpl(c);
        return tpl;
    }
}


class Ui {
    constructor(modules) {
        this.teamplates = new Teamplates();
        this.logBox = new LogBox(this.teamplates);
        this.modules = [new Boiler(this.teamplates)];

        this.noSleep = new NoSleep('no_sleep_video');
        this.errorBoxDiv = $$('errorBox');
        this.hidingPageDiv = $$('hidingPage');
        this.noSleep.run();
        this.register();
        this.eventReceiver();


        var menuTpl = this.teamplates.openTpl('menu')
        var modulesTpl = this.teamplates.openTpl('modules')
        for (var i in this.modules) {
            var mod = this.modules[i];

            modulesTpl.assign('module',
                          {'name': mod.name(),
                           'module_content': mod.html()});

            menuTpl.assign('menu_item',
                       {'name': mod.name(),
                        'title': mod.title()});
        }
        $$('menu_panel').innerHTML = menuTpl.result();
        $$('modules').innerHTML = modulesTpl.result();

        for (var i in this.modules) {
            var mod = this.modules[i];
            mod.init()
        }

        this.switchModule('boiler');
    }

    register() {
        var c = syncAjaxReq('subscribe');
        var resp = JSON.parse(c)
        this.subscriberId = resp.subscriber_id;
    }

    moduleByName(name) {
        for (var i in this.modules) {
            var mod = this.modules[i];
            if (mod.name() == name)
                return mod;
        }
        return NaN;
    }

    eventHandler(sender, type, data) {
        var mod = this.moduleByName(sender)
        if (!mod) {
            this.logErr("eventHandler(): incorrect sender")
            return;
        }

        mod.eventHandler(type, data);
    }

    eventReceiver() {
        var success = function(responceText) {
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
                                 event.type,
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

    switchModule(name) {
        this.noSleep.run()
        for (var i in this.modules) {
            var mod = this.modules[i];
            var menuDiv = $$('menu_item_' + mod.name());
            var moduleDiv = $$('module_' + mod.name());
            menuDiv.className = 'menu_item';
            moduleDiv.style.display = 'none';
            if (mod.name() != name)
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

    logErr(msg) {
        this.logBox.insert('err', msg);
        this.logBox.redraw();
    }

    logInfo(msg) {
        this.logBox.insert('info', msg);
        this.logBox.redraw();
    }

}

class LogBox {
    constructor(teamplates) {
        this.teamplates = teamplates
        this.logs = [];
        this.div = $$('log_box');
    }

    insert(type, message) {
        var now = new Date();
        this.logs.unshift([now, type, message]);
        if (this.logs.length > 30)
            this.logs.pop();
    }

    redraw() {
        var tpl = this.teamplates.openTpl('log_box')

        for (var i in this.logs) {
            var row = this.logs[i];
            var date = row[0];
            var type = row[1];
            var msg = row[2];

            var t = {'day': date.getDate().pad(),
                     'month': (date.getMonth() + 1).pad(),
                     'hour': date.getHours().pad(),
                     'min': date.getMinutes().pad(),
                     'sec': date.getSeconds().pad()};

            tpl.assign('row', t);
            if (type == 'err')
                tpl.assign('row_error', {'message': msg});
            else
                tpl.assign('row_info', {'message': msg});
        }

        this.div.innerHTML = tpl.result();
    }
}

function init() {
    Number.prototype.pad = function(size) {
        var s = String(this);
        while (s.length < (size || 2)) {s = "0" + s;}
        return s;
    }

    ui = new Ui();
}

