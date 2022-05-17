from datetime import date
import requests
from Ui import *

class sr90Handlers():
    def __init__(s, ui):
        ui.httpServer.setReqCb("GET",
                               "/sr90/boiler/request_fuel_compsumption_stat",
                               s.requestFuelCompsumptionStat)

        ui.httpServer.setReqCb("GET",
                               "/sr90/io/request_mbio_ui_update",
                               s.requestBoardIoUiUpdate)

        ui.httpServer.setReqCb("GET",
                               "/sr90/io/port/toggle_lock_unlock",
                               s.toggleLockUnlockPort)

        ui.httpServer.setReqCb("GET",
                               "/sr90/io/port/toggle_blocked_state",
                               s.toggleBlockedPortState)

        ui.httpServer.setReqCb("GET",
                               "/sr90/io/port/toggle_state",
                               s.togglePortState)

        ui.httpServer.setReqCb("GET",
                               "/sr90/io/port/blink",
                               s.blinkPortState)

        s.ui = ui
        s.log = Syslog("ui_http_handler_boiler")


    def sendRequest(s, url, args = None):
        url = "http://%s:%s/%s" % (s.ui.conf.sr90ServerHost,
                                   s.ui.conf.sr90ServerPort, url)
        #print("url = %s, args = %s" % (url, args))
        try:
            r = requests.get(url = url, params = args)
            d = r.json()
        except Exception as e:
            return {'status': 'error',
                    'reason': "Request to sr90 '%s' Error: %s" % (url, e)}


        if 'status' not in d:
            return {'status': 'error',
                    'reason': "can't send request to boiler: " \
                              "Incorrect JSON responce: 'status' field does absent"}

        if d['status'] != 'ok':
            return {'status': 'error',
                    'reason': "received from boiler error: %s" % d['reason']}
        return d


    def uiErr(s, sybsystem, msg):
        s.ui.eventManager.send(sybsystem, 'error', msg)


    def requestFuelCompsumptionStat(s, args, body, attrs, conn):
        def report():
            endYear = date.today().year;
            startYear = endYear - 5;

            list = [];
            for year in range(startYear, endYear + 1):
                ret = s.sendRequest('ui/boiler/get_fuel_consumption_stat',
                                   {'year': year})
                if ret['status'] != 'ok':
                    s.uiErr('boiler', "Can't get fuel consumption " \
                            "for %d year: " % (year, ret['reason']))

                if not 'data' in ret:
                    s.uiErr('boiler', "Can't get fuel consumption " \
                            "for %d year: field 'data' is absent in sr90 responce" % year)

                if not ret['data']['total']:
                    continue;

                list.append(ret['data']);
            s.ui.eventManager.send('boiler', 'boilerFuelConsumption', list)

        Task.asyncRunSingle("requestFuelConsumption", report)
        return json.dumps({'status': 'ok'})


    def requestBoardIoUiUpdate(s, args, body, attrs, conn):
        def doReuest():
            ret = s.sendRequest('io/config')
            if not 'boards' in ret:
                s.uiErr('io', "Can't get io/config: Field 'boards' is absent in responce")
                return;
            s.ui.eventManager.send('io', 'boardsInfo', ret['boards'])
            s.sendRequest('io/ui_update')

        Task.asyncRunSingle("requestMbioUiUpdate", doReuest)
        return json.dumps({'status': 'ok'})


    def toggleLockUnlockPort(s, args, body, attrs, conn):
        def doReuest():
            if not 'port_name' in args:
                s.uiErr('io', "Can't toggle lock/unlock: Field 'port_name' is absent in request")
                return;

            portName = args['port_name']

            ret = s.sendRequest('io/blocked_ports')
            if not 'list' in ret:
                s.uiErr('io', "Can't get io/blocked_ports: Field 'list' is absent in responce")
                return;
            blockedPorts = ret['list'];

            currState = 'unlocked';
            for _, row in blockedPorts.items():
                if row['port_name'] == portName:
                    currState = 'locked'
                    break

            if currState == 'locked':
                ret = s.sendRequest('io/port/unlock', {'port_name': portName})
                if ret['status'] != 'ok':
                    s.uiErr('io', "Can't unlock port %s: %s" % (portName, ret['reason']))
                    return;
            else:
                ret = s.sendRequest('io/port/lock', {'port_name': portName})
                if ret['status'] != 'ok':
                    s.uiErr('io', "Can't lock port %s: %s" % (portName, ret['reason']))
                    return;


        Task.asyncRunSingle("toggleLockUnlockPort", doReuest)
        return json.dumps({'status': 'ok'})


    def toggleBlockedPortState(s, args, body, attrs, conn):
        def doReuest():
            if not 'port_name' in args:
                s.uiErr('io', "Can't toggle blocked port state: Field 'port_name' is absent in request")
                return;

            portName = args['port_name']

            ret = s.sendRequest('io/blocked_ports')
            if not 'list' in ret:
                s.uiErr('io', "Can't get io/blocked_ports: Field 'list' is absent in responce")
                return;
            blockedPorts = ret['list'];

            currState = 0;
            for _, row in blockedPorts.items():
                if row['port_name'] == portName:
                    currState = int(row['state'])
                    break
            state = int(not currState)

            ret = s.sendRequest('io/port/set_blocked_state',
                                {'port_name': portName,
                                 'state': state})

            if ret['status'] != 'ok':
                s.uiErr('io', "Can't set blocked state to '%d' for port %s: %s" % (
                         state, portName, ret['reason']))
                return;

        Task.asyncRunSingle("toggleBlockedPortState", doReuest)
        return json.dumps({'status': 'ok'})


    def togglePortState(s, args, body, attrs, conn):
        if not 'port_name' in args:
            s.uiErr('io', "Can't toggle port state: Field 'port_name' is absent in request")
            return;

        portName = args['port_name']
        ret = s.sendRequest('io/port/toggle_state', {'port_name': portName})
        return json.dumps(ret)


    def blinkPortState(s, args, body, attrs, conn):
        if not 'port_name' in args:
            s.uiErr('io', "Can't blink port: Field 'port_name' is absent in request")
            return;

        if not 'd1' in args:
            s.uiErr('io', "Can't blink port: Field 'port_name' is absent in request")
            return;

        if not 'd2' in args:
            s.uiErr('io', "Can't blink port: Field 'port_name' is absent in request")
            return;

        if not 'number' in args:
            s.uiErr('io', "Can't blink port: Field 'port_name' is absent in request")
            return;

        portName = args['port_name']
        d1 = args['d1']
        d2 = args['d2']
        number = args['number']
        ret = s.sendRequest('io/port/blink',
                            {'port_name': portName,
                             'd1': d1,
                             'd2': d2,
                             'number': number})
        return json.dumps(ret)


