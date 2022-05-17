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


        s.uiServerHost = '0.0.0.0'
        if 'ui_server_host' in s.conf and s.conf['ui_server_host']:
            s.uiServerHost = s.conf['ui_server_host']

        s.uiServerPort = 8890
        if 'ui_server_port' in s.conf and s.conf['ui_server_port']:
            s.uiServerPort = s.conf['ui_server_port']

        s.uiServerDir = "%s/www" % os.getcwd()
        if 'ui_server_dir' in s.conf and s.conf['ui_server_dir']:
            s.uiServerDir = s.conf['ui_server_dir']

        s.boilerServerHost = '127.0.0.1'
        if 'boiler_server_host' in s.conf and s.conf['boiler_server_host']:
            s.boilerServerHost = s.conf['boiler_server_host']

        s.boilerServerPort = '8891'
        if 'boiler_server_port' in s.conf and s.conf['boiler_server_port']:
            s.boilerServerPort = s.conf['boiler_server_port']

        s.sr90ServerHost = '127.0.0.1'
        if 'sr90_server_host' in s.conf and s.conf['sr90_server_host']:
            s.sr90ServerHost = s.conf['sr90_server_host']

        s.sr90ServerPort = '400'
        if 'sr90_server_port' in s.conf and s.conf['sr90_server_port']:
            s.sr90ServerPort = s.conf['sr90_server_port']
