const debug = require('debug')('tapa-bot:utils')
const glob = require('glob')

function makeRowsKeyboard(keys, transform, rows = 3) {
    let keyboard = []
    while (keys.length) {
        keyboard.push(keys.splice(0, rows).map((k) => ({
            text: k,
            callback_data: transform(k)
        })))
    }

    return keyboard
}

function inlineRowsKeyboard(keys, transform, rows) {
    return {
        "reply_markup": {
            "inline_keyboard": makeRowsKeyboard(keys, transform, rows)
        }
    }
}

let debugPromise = (name) => ((args) =>{
    debug('DEBUG:', name,  args)
    return args
})

function getProviders(config) {
    return new Promise((accept, reject) => {
        glob(`${__dirname}/providers/*.js`, (err, files) => {
            if (err) {
                return reject(err)
            }

            return accept(
                files.map(f => {
                    let p = require(require.resolve(f))
                    let P = new p(config)

                    debug(f, P.name, P.description)

                    return {[P.name]: P}
                }).reduce((a, c) => (
                    Object.assign(a, c)
                ), {})
            )
        })
    })
}

module.exports = {
    inlineRowsKeyboard,
    debugPromise,
    getProviders
}
