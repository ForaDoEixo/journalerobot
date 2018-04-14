const glob = require('glob')
const DeepAssign = require('deep-assign')
const debug = require('debug')('tapa-bot:utils')

function makeRowsKeyboard(keys, transform = (k) => (k), rows = 3) {
  if (!keys.length) {
    throw new Error('asked to generate a keyboard with no keys')
  }

  let keyboard = []

  for (let i = 0; i < keys.length; i += rows) {
    keyboard.push(keys.slice(i, i + rows).map((k) => ({
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

function objectify(a, assign = DeepAssign) {
  return a.reduce((a, c) => (
    assign(a, {[`${c.name}`]: c})
  ), {})
}

function _getProviders(config) {
  return new Promise((resolve, reject) => {
    glob(`${__dirname}/providers/*.js`, (err, files) => {
      if (err) {
        return reject(err)
      }

      debug('providers', files)

      return resolve(files.map(f => (require(f))))
    })
  })
}

function getProviders(config) {
  return _getProviders(config)
    .then(debugPromise('getProviders'))
    .then(providers => (providers.map(P => (new P(config)))))
    .then(objectify)
}

module.exports = {
  inlineRowsKeyboard,
  debugPromise,
  getProviders,
  objectify,
   _getProviders // exported for testing only
}
