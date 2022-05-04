import socket
import select
import time
from Task import *


class HttpServer():
    subscribers = []
    def __init__(s, host, port, wwwDir = None):
        s._host = host
        s._port = port
        s._wwwDir = wwwDir
        s._listenedSock = None
        s._connections = []

        s._task = Task('http_server_%s:%d' % (host, port))
        s._task.setCb(s.taskDo)
        s._task.start()


    def taskDo(s):
        s._listenedSock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s._listenedSock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        s._listenedSock.bind((s._host, s._port))
        s._listenedSock.settimeout(1.0)
        s._listenedSock.listen(50)
        while 1:
            Task.sleep(0)
            while 1:
                Task.sleep(0)
                try:
                    conn, addr = s._listenedSock.accept()
                except socket.error:
                    continue
                break

            if not s._listenedSock:
                return
            httpConn = HttpConnection(s, conn, addr, s._wwwDir)
            s._connections.append(httpConn)


    def setReqCb(s, method, page, cb):
        HttpServer.subscribers.append((method, page, cb))


    def destroy(s):
        s._task.remove()
        s._listenedSock.close()
        s._listenedSock = None
        for conn in s._connections:
            conn.close()


    def task(s):
        return s._task


    def wwwDir(s):
        return s._wwwDir





class HttpConnection():
    def __init__(s, server, conn, remoteAddr, wwwDir = None):
        s._server = server
        s._conn = conn
        s._wwwDir = wwwDir
        s._name = "%s:%d" % (remoteAddr[0], remoteAddr[1])
        s.log = Syslog("http_connection_%s:%d" % (remoteAddr[0], remoteAddr[1]))
        s._task = Task("http_connection_%s:%d" % (remoteAddr[0], remoteAddr[1]))
        s._task.setCb(s.taskDo)
        s._task.start()
        s._keep_alive = False


    def taskDo(s):
        with s._conn:
            poll = select.poll()
            poll.register(s._conn.fileno(), select.POLLIN)
            while 1:
                Task.sleep(0)

                poll_list = poll.poll(100)
                if not len(poll_list):
                    continue

                try:
                    data = s._conn.recv(65535)
                except:
                    pass

                if not s._conn:
                    return

                if (not data) or (not len(data)):
                    s.close()
                    return

                try:
                    req = data.decode()
                except:
                    s.close()
                    return

                parts = s.parseHttpReq(req)
                if not parts:
                    s.close()
                    return

                method, url, version, attrs, body = parts
                s.log.info("%s %s" % (method, url))

                page, args = s.parseUrl(url)
                if ('Content-Type' in attrs and
                        attrs['Content-Type'] == 'application/x-www-form-urlencoded'):
                    postArgs = s.parseParamsString(body)
                    args.update(postArgs)

                found = False
                for (sMethod, sPage, sCb) in HttpServer.subscribers:
                    if sMethod == method and sPage == page:
                        found = True
                        content = sCb(args, body, attrs, s)
                        break

                if found:
                    s.log.info('response 200 OK')
                    s.respOk(content)
                else:
                    if not s._wwwDir:
                        s.log.info('response 404 ERROR')
                        s.resp404()

                    if url == '/':
                        url = 'index.html'

                    fileName = "%s/%s" % (s._wwwDir, url)
                    if not os.path.exists(fileName):
                        s.log.info('response 404 ERROR')
                        s.resp404()
                    else:
                        content = fileGetContent(fileName)
                        s.log.info('response 200 OK, file "%s" is exist' % fileName)
                        mimeType = s.mimeTypeByFileName(fileName)
                        s.respOk(content, mimeType)

                if s._keep_alive:
                    continue

                s.close()
                return

    def close(s):
        s._conn.close()
        s._conn = None
        s._task.remove()
        s._server._connections.remove(s)


    def name(s):
        return s._name


    def mimeTypeByFileName(s, fileName):
        types = {"jpeg": "image/jpeg",
                 "jpg": "image/jpeg",
                 "png": "image/png",
                 "html": "text/html",
                 "htm": "text/html",
                 "js": "text/javascript",
                 "css": "text/css",
                 "txt": "text/plain",
                 };

        for type, mime in types.items():
            if fileName[-len(type):] == type:
                return mime

        return "text/plain";



    def parseHttpReq(s, req):
        parts = req.split("\r\n\r\n")
        if not len(parts):
            return

        header = parts[0]
        body = None
        if len(parts) > 1:
            body = parts[1]

        lines = header.split("\n")
        if not len(lines):
            return None

        if not len(lines):
            return None

        parts = lines[0].split()
        if len(parts) < 2:
            return None

        method, url, version = parts

        attrs = {}
        for line in lines[1:]:
            if not line.strip():
                continue

            row = line.split(":")
            name = row[0].strip()
            val = row[1].strip()
            attrs[name] = val
            if name == 'Connection' and val == 'keep-alive':
                s._keep_alive = True

        return (method, url, version, attrs, body)


    def parseParamsString(s, line):
        argsText = line.split("&")
        args = {}
        for keyVal in argsText:
            row = keyVal.split("=")
            if len(row) < 2:
                continue
            key, val = keyVal.split("=")
            args[key] = val
        return args


    def parseUrl(s, url):
        parts = url.split("?")
        if not parts:
            return None

        if len(parts) == 1:
            return (url, None)

        page = parts[0]
        args = s.parseParamsString(parts[1])
        return (page, args)


    def respOk(s, data = "", type = "text/plain"):
        if not s._conn:
            return
        str = "HTTP/1.1 200 OK\n"
        str += "Content-Type: %s\n" % type
        str += "Content-Length: %d\n" % len(data.encode('utf-8'))
        str += "\n"
        str += data
        s._conn.send(str.encode('utf-8'))


    def respBadRequest(s, data = ""):
        if not s._conn:
            return
        str = "HTTP/1.1 400 Bad Request\n"
        str += "Content-Type: text/plain\n"
        str += "Content-Length: %d\n" % len(data.encode('utf-8'))
        str += "\n"
        str += data
        s._conn.send(str.encode('utf-8'))


    def resp404(s):
        if not s._conn:
            return
        content = "404 Page not found"
        str = "HTTP/1.1 404 Page Not Found\n"
        str += "Content-Type: text/plain\n"
        str += "Content-Length: %d\n" % len(content.encode('utf-8'))
        str += "\n"
        str += content
        s._conn.send(str.encode('utf-8'))

