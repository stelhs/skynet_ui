
class Boiler {
    constructor(teamplates) {
        this.teamplates = teamplates;
        this.watcherTimeoutHandler = NaN;
    }

    name() {
        return 'boiler';
    }

    title() {
        return 'Котёл';
    }

    html() {
        var modTpl = this.teamplates.openTpl('mod_boiler');
        modTpl.assign();
        return modTpl.result();
    }

    init() {
        this.boilerStateDiv = $$('bolier_state');

        this.leds = {'led_power': $$('led_power'),
                     'led_air_fun': $$('led_air_fun'),
                     'led_fuel_pump': $$('led_fuel_pump'),
                     'led_ignition': $$('led_ignition'),
                     'led_water_pump': $$('led_water_pump'),
                     'led_flame': $$('led_flame'),
                     'led_heater': $$('led_heater'),
                     'led_no_pressure': $$('led_no_pressure'),
                     'led_overheat': $$('led_overheat')};

        this.sevenSegs = {
                     'ss_target_t': [$("#ss_target_t"), 3, "lime"],
                     'ss_room_t': [$("#ss_room_t"), 3, "lime"],
                     'ss_boiler_box_t': [$("#ss_boiler_box_t"), 3, "red"],
                     'ss_boiler_t': [$("#ss_boiler_t"), 3, "red"],
                     'ss_return_t': [$("#ss_return_t"), 3, "red"],
                     'ss_ignition_counter': [$("#ss_ignition_counter"), 3, "orange"],
                     'ss_fuel_consumption': [$("#ss_fuel_consumption"), 3, "orange"],
                     'ss_fuel_consumption_month': [$("#ss_fuel_consumption_month"), 4, "orange"],
                     'ss_fuel_consumption_year': [$("#ss_fuel_consumption_year"), 4, "orange"]};

        this.reset();

        for (var name in this.sevenSegs)
            this.setSevenSegVal(name);

        this.restartEventTimeoutWatcher();
    }

    setBoilerState(state) {
        this.boilerStateDiv.innerHTML = state;
    }

    setSevenSegVal(name, val) {
        var parts = this.sevenSegs[name];
        var div = parts[0];
        var digits = parts[1];
        var color = parts[2];

        div.sevenSeg({
            value: val,
            digits:digits,
            colorOff: "#003500",
            colorOn: color,
            slant: 10
        });
    }


    reset() {
        this.setBoilerState('-');

        for (var ledName in this.leds)
            this.ledSet(ledName, 'undefined');

        for (var name in this.sevenSegs)
            this.setSevenSegVal(name, "XXXXX");
    }

    logErr(msg) {
        ui.logErr("Boiler: " + msg)
    }

    logInfo(msg) {
        ui.logInfo("Boiler: " + msg)
    }

    eventTimeoutHandler() {
        this.reset();
        this.logErr('UI does not receive a signal from boiler more then 3 second');
    }

    restartEventTimeoutWatcher() {
        if (this.watcherTimeoutHandler) {
            clearTimeout(this.watcherTimeoutHandler);
            this.watcherTimeoutHandler = NaN;
        }
        this.watcherTimeoutHandler = setTimeout(this.eventTimeoutHandler.bind(this), 3000);
    }

    ledByName(name) {
        for (var itemName in this.leds) {
            if (itemName == name)
                return this.leds[itemName];
        }
        return NaN;
    }

    ledSet(ledName, mode) {
        var led = this.ledByName(ledName);
        led.className = 'led-' + mode;
    }

    eventHandler(type, data) {
        switch (type) {
        case 'status':
            this.restartEventTimeoutWatcher();
            this.update_status(data);
            return;

        case 'error':
            this.logErr(data)
            return

        case 'info':
            this.logInfo(data)
            return

        default:
            this.logErr("Incorrect event type: " + type)
        }
    }

    actualizeLed(ledName, data, field, value, ledTrueMode) {
        if (field in data) {
            if (data[field] == value)
                this.ledSet(ledName, ledTrueMode);
            else
                this.ledSet(ledName, 'off');
        }
    }


    actualizeSevenSeg(segName, data, field) {
        if (field in data)
            this.setSevenSegVal(segName, data[field]);
    }


    update_status(data) {
        if (typeof data !== 'object') {
            this.logErr("Incorrect event status")
            return;
        }

        if ('state' in data)
            this.setBoilerState(data['state']);

        this.actualizeLed('led_power', data, 'power', 'True', 'green');
        this.actualizeLed('led_air_fun', data, 'air_fun', 'True', 'green');
        this.actualizeLed('led_fuel_pump', data, 'fuel_pump', 'True', 'green');
        this.actualizeLed('led_ignition', data, 'ignition', 'True', 'red');
        this.actualizeLed('led_water_pump', data, 'water_pump', 'True', 'green');
        this.actualizeLed('led_flame', data, 'flame', 'True', 'red');
        this.actualizeLed('led_heater', data, 'heater', 'True', 'red');
        this.actualizeLed('led_no_pressure', data, 'no_pressure', 'True', 'red');
        this.actualizeLed('led_overheat', data, 'overheat', 'True', 'red');

        this.actualizeSevenSeg('ss_target_t', data, 'target_t');
        this.actualizeSevenSeg('ss_room_t', data, 'room_t');
        this.actualizeSevenSeg('ss_boiler_box_t', data, 'boiler_box_t');
        this.actualizeSevenSeg('ss_boiler_t', data, 'boiler_t');
        this.actualizeSevenSeg('ss_return_t', data, 'return_t');
        this.actualizeSevenSeg('ss_ignition_counter', data, 'ignition_counter');
        this.actualizeSevenSeg('ss_fuel_consumption', data, 'fuel_consumption');
        this.actualizeSevenSeg('ss_fuel_consumption_month', data, 'fuel_consumption_month');
        this.actualizeSevenSeg('ss_fuel_consumption_year', data, 'fuel_consumption_year');
    }

}




