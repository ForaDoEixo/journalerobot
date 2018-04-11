const debug = require('debug')('tapa-bot:provider')

module.exports = class NewspaperProvier {
    constructor () {
        this.name = 'Generic'
    }

    get (newspaper) {
        return this.newspapers[newspapers]
    }

    load(newspapers) {
        this.newspapers = Object.values(newspapers).reduce((a, n) => {
            if (n.provider === this.name) return Object.assign(a, {
                [n.name]: n
            })
            return a
        })
    }

    fetch() {
        throw "NOT IMPLEMENTED"
    }

    get10Days() {
        throw "NOT IMPLEMENTED"
    }
}
