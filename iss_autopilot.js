(function () {
    const updateFrequency = 200 / 1000
    let controls = getControls();
    const statusElements = getStatusElements();
    const messages = Object.fromEntries(['fail', 'success', 'instructions', 'intro'].map(x => [x, document.getElementById(x)]))

    function assert(b) {
        if (!b) {
            throw 'failed assertion'
        }
    }

    function clip(x, lower, upper) {
        if (x < lower)
            return lower
        if (x > upper)
            return upper
        return x
    }
    function sign(i) {
        if (i < 0)
            return -1
        if (i == 0)
            return 0
        return 1
    }
    function parseNum(value) {
        let rx = /[-\d\.]+/g;
        let arr = rx.exec(value.textContent);
        if (!arr || !arr[0]) {
            return null
        }
        return parseFloat(arr[0]);
    }

    function getControls() {
        let controlMapping = {
            x: ['translate-forward', 'translate-backward'],
            y: ['translate-left', 'translate-right'],
            z: ['translate-down', 'translate-up'],
            roll: ['roll-right', 'roll-left'],
            yaw: ['yaw-right', 'yaw-left'],
            pitch: ['pitch-down', 'pitch-up'],
        }

        for ([key, value] of Object.entries(controlMapping)) {
            value[0] = document.getElementById(value[0] + '-button');
            value[1] = document.getElementById(value[1] + '-button');
        }
        return controlMapping
    }

    function getStatusElements() {
        let statuses = new Object()
        let els = document.getElementsByClassName('distance')
        statuses.x = els[0];
        statuses.y = els[1];
        statuses.z = els[2];
        els = document.getElementsByClassName('error')
        statuses.pitch = els[0];
        statuses.roll = els[1];
        statuses.yaw = els[2];
        els = document.getElementsByClassName('rate')
        statuses.pitch_rate = els[0]
        statuses.roll_rate = els[1]
        statuses.yaw_rate = els[2]
        statuses.range = els[3]
        statuses.rate = els[4]
        return statuses;
    }

    let clickCounts = {}
    function reset() {
        for (let key of Object.keys(controls)) {
            clickCounts[key] = 0
        }
    }


    function getMoveDirection(key, x) {
        if (x === 0) {
            return -clickCounts[key]
        }
        const increment = 0.1
        let multiplier
        if (['x', 'y', 'z'].includes(key)) {
            if (x < 1)
                multiplier = 2
            else
                multiplier = 4
        } else {
            multiplier = 0.30
        }
        const targetV = -x * multiplier
        return targetV / increment - clickCounts[key];
    }

    function doClick(key, i) {
        // Round away from zero
        i = sign(i) * Math.round(Math.abs(i))
        if (i == 0) {
            return
        }
        i = clip(i, -100, 100)
        clickCounts[key] += i
        let button = controls[key][1]
        if (i < 0) {
            button = controls[key][0]
            i *= -1
        }
        // console.log(button.id, i)
        for (; i > 0; i--) {
            button.click()
        }
    }
    let started = false
    let startTime = null
    // let socket = new WebSocket('ws://localhost:8765')

    function controlLoop() {
        const elapsedSecs = (new Date() - startTime) / 1000

        // Handle visible messages (start, error, success)
        if (Object.values(messages).some(m => m.style.visibility != 'hidden')) {
            if (messages.intro.style.visibility == 'inherit') {
                const button = document.getElementById('begin-button')
                button.click()
            } else if (started && messages.success.style.visibility === 'inherit') {
                // Success
                console.log('successfully docked in', elapsedSecs)
            } else if (started && messages.fail.style.visibility === 'inherit') {
                console.log('failed to dock in', elapsedSecs)
            }
            started = false
            window.setTimeout(controlLoop, updateFrequency);
            return;
        }

        const statuses = Object.fromEntries(Object.entries(statusElements).map(([k, v]) => [k, parseNum(v)]))
        statuses.t = new Date()
        // socket.send(JSON.stringify(statuses))

        // Wait until we have control
        if (!started) {
            if (statuses.roll === 15 && statuses.pitch === -20 && statuses.yaw === -10 && statuses.rate < 0.01) {
                started = true
                reset()
                startTime = new Date()
                console.log('controls unlocked')
            } else {
                window.setTimeout(controlLoop, updateFrequency);
                return
            }
        }

        for (let key of ['roll', 'pitch', 'yaw']) {
            doClick(key, getMoveDirection(key, statuses[key]))
        }

        if (statuses.roll == 0 && statuses.pitch == 0 && statuses.yaw == 0) {
            for (let key of ['x', 'y', 'z']) {
                doClick(key, getMoveDirection(key, statuses[key]))
            }
        }

        window.setTimeout(controlLoop, updateFrequency);
    }
    console.log("Starting control loop")
    controlLoop()

})()