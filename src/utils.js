const glob = require('glob')
const DeepAssign = require('deep-assign')
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
    'reply_markup': {
      'inline_keyboard': makeRowsKeyboard(keys, transform, rows)
    }
  }
}

let debugPromise = (name) => (args) => {
  debug('DEBUG:', name, args)
  return args
}

function _getProviders(config) {
  return new Promise((resolve, reject) => {
    glob(`${__dirname}/providers/*.js`, (err, files) => {
      if (err) {
        return reject(err)
      }

      debug('providers', files)

      return resolve(files.map(f => (require(require.resolve(f)))))
    })
  })
}

function getProviders(config) {
  return _getProviders(config)
    .then(providers => (providers.map(P => {
      let p = new P(config)

      debug(p.name, p.description)

      return {[p.name]: p}
    }).reduce((a, c) => (
      Object.assign(a, c)
    ), {})))
}

function objectify(a) {
  return a.reduce((a, c) => (
    DeepAssign(a, {[`${c.name}`]: c})
  ), {})
}

module.exports = {
  inlineRowsKeyboard,
  debugPromise,
  getProviders,
  objectify,
  _getProviders // exported for testing only
}
