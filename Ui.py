import threading
from Task import *
from Syslog import *
from HttpServer import *
from Settings import *
from BoilerHandlers import *
from sr90Handlers import *
import json
import os, re
import requests
import uuid
import time


class Ui():
    class Ex(Exception):
        pass

    def __init__(s):
        s.log = Syslog("ui")
        s.conf = Settings()

        s.eventManager = UiEventManager()

        s.httpServer = HttpServer(s.conf.uiServerHost,
                                  s.conf.uiServerPort,
                                  s.conf.uiServerDir)
        s.httpServer.setReqCb("POST", "/send_event", s.sendEventHandler)
        s.uiHandlers = UiHandlers(s)
        s.boilerHandlers = BoilerHandlers(s)
        s.sr90Handlers = sr90Handlers(s)


    def sendEventHandler(s, args, body, attrs, conn):
        try:
            dt = json.loads(body)
        except:
            return json.dumps({'status': 'error',
                               'error_code': '7',
                               'reason': "can't parse JSON from POST request"})

        if not 'type' in dt:
            return json.dumps({'status': 'error',
                               'error_code': '6',
                               'reason': "'type' field not specified in JSON"})
        evType = dt['type']

        if not 'subsytem' in dt:
            return json.dumps({'status': 'error',
                               'error_code': '5',
                               'reason': "'subsytem' field not specified in JSON"})
        subsytem = dt['subsytem']

        if not 'data' in dt:
            return json.dumps({'status': 'error',
                               'error_code': '4',
                               'reason': "'data' field not specified in JSON"})
        data = dt['data']
        s.eventManager.send(subsytem, evType, data)
        return json.dumps({'status': 'ok'})



    def destroy(s):
        s.httpServer.destroy()



class UiEventManager():
    class Subsriber():
        def __init__(s):
            s.lock = threading.Lock()
            s._events = []
            s.id = str(uuid.uuid4().hex)
            s.update()


        def update(s):
            with s.lock:
                s.time = time.time()


        def isAlive(s):
            return (time.time() - s.time) < 5 * 60


        def pushEvent(s, event):
            with s.lock:
                s._events.append(event)


        def pullEvents(s):
            with s.lock:
                events = s._events
                s._events = []
                return events



    def __init__(s):
        s.lock = threading.Lock()
        s.awaitingTaskList = []
        s.subscribers = []


    def send(s, subsytem, type, evData):
        s.removeOldSubscribers()

        ev = {'subsytem': subsytem, 'type': type, 'data': evData}
        for subscriber in s.subscribers:
            subscriber.pushEvent(ev)

        with s.lock:
            for task in s.awaitingTaskList:
                task.sendMessage('event')


    def events(s, task, subsriberId):
        subscriber = s.subscriberById(subsriberId)
        if not subscriber:
            return None

        subscriber.update()
        events = subscriber.pullEvents()
        if len(events):
            return events

        with s.lock:
            s.awaitingTaskList.append(task)

        task.waitMessage(60)

        with s.lock:
            s.awaitingTaskList.remove(task)
        return subscriber.pullEvents()


    def subscribe(s):
        subscriber = UiEventManager.Subsriber()
        with s.lock:
            s.subscribers.append(subscriber)
        return subscriber


    def subscriberById(s, id):
        with s.lock:
            for subscriber in s.subscribers:
                if subscriber.id == id:
                    return subscriber
        return None


    def removeOldSubscribers(s):
        with s.lock:
            for subscriber in s.subscribers:
                if not subscriber.isAlive():
                    s.subscribers.remove(subscriber)



class UiHandlers():
    def __init__(s, ui):
        ui.httpServer.setReqCb("GET", "/ui/get_teamplates", s.teamplates)
        ui.httpServer.setReqCb("GET", "/ui/get_events", s.events)
        ui.httpServer.setReqCb("GET", "/ui/subscribe", s.subscribe)
        s.ui = ui


    def teamplates(s, args, body, attrs, conn):
        tplDir = "%s/tpl" % s.ui.httpServer.wwwDir()
        files = os.listdir(tplDir)
        list = {}
        for file in files:
            c = fileGetContent("%s/%s" % (tplDir, file))
            tplName = file.split('.')[0]
            list[tplName] = c

        return json.dumps(list)


    def subscribe(s, args, body, attrs, conn):
        subscriber = s.ui.eventManager.subscribe()
        return json.dumps({'status': 'ok',
                           'subscriber_id': subscriber.id})


    def events(s, args, body, attrs, conn):
        if not 'subscriber_id' in args:
            return json.dumps({'status': 'error',
                               'error_code': '1',
                               'reason': "'subscriber_id' is absent"})

        subscriberId = args['subscriber_id']
        events = s.ui.eventManager.events(conn.task(), subscriberId)
#        print('subscriberId = %s' % subscriberId)
 #       print(events)
        if events == None:
            return json.dumps({'status': 'error',
                               'error_code': '2',
                               'reason': ("'subscriberId' %s is not registred" % subscriberId)})

        return json.dumps({'status': 'ok',
                           'events': events})






