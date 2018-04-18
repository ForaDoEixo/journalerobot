const glob = require('glob')
const DeepAssign = require('deep-assign')
const debug = require('debug')('tapa-bot:utils')
const Q = require('d3-queue')

const config = require('./config')

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

function _getProviders(path = `${__dirname}/providers/*.js`) {
  debug('path:', path)

  return new Promise((resolve, reject) => {
    glob(path, (err, files) => {
      if (err) {
        return reject(err)
      }

      debug('providers', files)

      return resolve(files.map(f => (require(f))))
    })
  })
}

function getProviders(config) {
  return _getProviders.apply(this, Array.prototype.slice.call(arguments, 1))
    .then(debugPromise('getProviders'))
    .then(providers => (providers.map(P => (new P(config)))))
    .then(objectify)
}

function throttle(fn, timeout = 1000) {
  let willRun = null

  return function () {
    if (willRun) {
      clearTimeout(willRun)
    }

    willRun = setTimeout(() => {
      fn.apply(this, arguments)
      willRun = null
    }, timeout)
  }
}

class RateLimit {
  constructor(delay) {
    this.delay = delay
    this.q = Q.queue(1)

    debug ("starting, delay", delay)
  }

  schedule(work) {
    this.q.defer((cb) => {
      work()
      setTimeout(() => {
        cb(null)
      }, this.delay)
    })
  }
}


module.exports = {
  inlineRowsKeyboard,
  debugPromise,
  getProviders,
  objectify,
  throttle,
  RateLimit,
  _getProviders // exported for testing only
}
