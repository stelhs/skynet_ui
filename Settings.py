import os
import json


class Settings():
    def __init__(s):
        s.conf = {}
        try:
            with open('/etc/skynet_ui.conf') as f:
                c = f.read()
                s.conf = json.loads(c)
        except Exception as e:
            pass


        s.serverHost = '0.0.0.0'
        if 'server_host' in s.conf and s.conf['server_host']:
            s.serverHost = s.conf['server_host']

        s.serverPort = 8890
        if 'server_port' in s.conf and s.conf['server_port']:
            s.serverPort = s.conf['server_port']

        s.serverDir = "%s/www" % os.getcwd()
        if 'server_dir' in s.conf and s.conf['server_dir']:
            s.serverDir = s.conf['server_dir']



