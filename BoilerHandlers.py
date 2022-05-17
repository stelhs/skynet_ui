import requests
from Ui import *

class BoilerHandlers():
    def __init__(s, ui):
        ui.httpServer.setReqCb("GET", "/boiler/set_target_t", s.setTarget_t)
        ui.httpServer.setReqCb("GET", "/boiler/boiler_enable", s.boilerEnable)
        ui.httpServer.setReqCb("GET", "/boiler/heater_enable", s.heaterEnable)
        ui.httpServer.setReqCb("GET", "/boiler/heater_disable", s.heaterDisable)
        s.ui = ui
        s.log = Syslog("ui_http_handler_boiler")


    def sendRequest(s, url, args = None):
        url = "http://%s:%s/%s" % (s.ui.conf.boilerServerHost,
                                   s.ui.conf.boilerServerPort, url)
        #print("url = %s, args = %s" % (url, args))
        try:
            r = requests.get(url = url, params = args)
            d = r.json()
        except Exception as e:
            return {'status': 'error',
                    'reason': "Request to boiler error: '%s'" % r.content}


        if 'status' not in d:
            return {'status': 'error',
                    'reason': "can't send request to boiler: " \
                              "Incorrect JSON responce: 'status' field does absent"}

        if d['status'] != 'ok':
            return {'status': 'error',
                    'reason': "received from boiler error: %s" % d['reason']}
        return d


    def setTarget_t(s, args, body, attrs, conn):
        if not 't' in args:
            return json.dumps({'status': 'error',
                               'reason': "argument 't' is absent"})

        ret = s.sendRequest('boiler/set_target_t', {'t': args['t']})
        return json.dumps(ret)


    def boilerEnable(s, args, body, attrs, conn):
        s.log.info("Request to enable boiler")
        ret = s.sendRequest('boiler/enable')
        return json.dumps(ret)


    def heaterEnable(s, args, body, attrs, conn):
        s.log.info("Request to enable heater")
        ret = s.sendRequest('boiler/fun_heater_enable')
        return json.dumps(ret)


    def heaterDisable(s, args, body, attrs, conn):
        s.log.info("Request to disable heater")
        ret = s.sendRequest('boiler/fun_heater_disable')
        return json.dumps(ret)


