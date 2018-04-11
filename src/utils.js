const debug = require('debug')('tapa-bot:utils')

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
module.exports = {
    inlineRowsKeyboard,
    debugPromise
}
