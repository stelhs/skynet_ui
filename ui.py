from math import *
import rlcompleter, readline
readline.parse_and_bind('tab:complete')
import atexit
from Ui import *

ui = Ui()

def exitCb():
    print("call exitCb")
    ui.destroy()

atexit.register(exitCb)
