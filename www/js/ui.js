
function $$(id)
{
    return document.getElementById(id);
}

/*function domObjSetClass(obj, className) {
    obj.classList.remove(className);
    obj.classList.add(className);
}*/


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

        var c = syncAjaxReq('subscribe');
        var resp = JSON.parse(c)
        this.subscriberId = resp.subscriber_id;
        this.eventReceiver();
    }

    eventHandler(sender, type, data) {
        this.noSleep.run()
//        alert(data.room_t);
    }

    eventReceiver() {
        var success = function(responceText) {
            var resp = JSON.parse(responceText)
            if (resp.status != 'ok') {
                //TODO
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

        var error = function() {
            alert('error');
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
}



function init() {
    ui = new Ui();

    var modules = {'boiler': 'Котёл',
                   'guard': 'Охрана',
                   'modules_io': 'Модули IO'};
    ui.registerModule(modules)
}

