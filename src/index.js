const auth = require('../../auth')
const TelegramBot = require('node-telegram-bot-api')
const chokidar = require('chokidar')

const debug = require('debug')('tapa-bot')

const FuzzySearch = require('./search')
const utils = require('./utils')

const {FILES, GROUP_MAX_ENTRIES, API_RATE_LIMIT} = require('./config')

class TapaBot {

  constructor() {
    this.handlers = {
      'zones': this.doGetZones.bind(this),
      'countries': this.doGetCountries.bind(this),
      'start': this.doStart.bind(this),
      'getCountry': this.doGetAllForCountry.bind(this),
      'getNewspaper': this.doGet10Days.bind(this),
      'search': this.doSearch.bind(this)
    }

    let reduceOnAllProviders = (methodName) =>
      (arg) => (Object.values(this.providers).reduce((a, p) => (
        Object.assign(a, p[methodName](arg))
      ), {}))

    this.run = ['get', 'load', 'get10Days', 'filterToday'].reduce((a, methodName) => (
      Object.assign(a, {
        [methodName]: reduceOnAllProviders(methodName)
      })
    ), {})
  }
  init() {
    this.watcher = chokidar.watch(Object.values(FILES), {
      persistent: true
    })

    // replace the value below with the Telegram token you receive from @BotFather
    this.token = auth.API_KEY

    this.zones = require(FILES.ZONES)
    this.zonesFuzzy = new FuzzySearch('zones', this.zones)

    this.countries = require(FILES.COUNTRIES)
    this.countriesFuzzy = new FuzzySearch('countries', this.countries)

    let newspapers = require(FILES.NEWSPAPERS)
    this.newspapersFuzzy = new FuzzySearch('newspapers', newspapers, {maxDistance: 0.0001})
    this.run.load(newspapers)

    this.watcher.on('change', utils.throttle(this.reload.bind(this)))
  }

  getProviderForNewsPaper(newspaper) {
    return this.providers[newspaper].provider
  }

  reload(path) {
    debug(`reloading everything because ${path} changed`)

    this.zones = require(FILES.ZONES)
    this.zonesFuzzy.load(this.zones)

    this.countries = require(FILES.COUNTRIES)
    this.countriesFuzzy.load(this.countries)

    let newspapers = require(FILES.NEWSPAPERS)
    this.newspapersFuzzy.load(newspapers)
    this.run.load(newspapers)
  }

  start() {
    return utils.getProviders()
      .then((providers) => {
        this.providers = providers
      })
      .then(this.init.bind(this))
      .then(this.startBot.bind(this))
  }

  startBot() {
    // Create a bot that uses 'polling' to fetch new updates
    this.bot = new TelegramBot(this.token, {polling: true})

    let rl = new utils.RateLimit(API_RATE_LIMIT)
    this.bot._sendMessage = (id, msg, keyboard) => {
      rl.schedule(() => (
        this.bot.sendMessage(id, msg, keyboard).catch((e, a) => debug(e, a))
      ))
    }
    this.bot._sendMediaGroup = (id, media) => {
      rl.schedule(() => (
        this.bot.sendMediaGroup(id, media).catch((e, a) => debug(e, a))
      ))
    }

    this.bot.on('callback_query', (cbq) => {
      const [, action, args] = cbq.data.match(/(\w+) ?(.*)/)
      const msg = cbq.message
      const opts = {
        chat_id: msg.chat.id,
        message_id: msg.message_id
      }

      this.handlers[action](msg, [null, args])
      this.bot.editMessageText(`${action} → ${args}`, opts)
    })

    this.bot.getMe().then(({first_name, username}) => {
      let handlers = this.handlers
      let meRegExps = [
        new RegExp(`${first_name} (\w+) ?(.*)`),
        new RegExp(`${username} (\w+) ?(.*)`)
      ]

      this.bot.on('message', (msg) => {
        const chatId = msg.chat.id

        meRegExps.forEach(r => {
          if (msg.text.match(r)) {
            this.bot._sendMessage(chatId, 'yes please')
          }
        })

        debug('got', msg)
      })

      Object.keys(handlers).forEach(k => {
        debug('instaling handler for:', k)

        this.bot.onText(new RegExp(`^\/${k}$`), handlers[k])
        this.bot.onText(new RegExp(`^\/${k} (.*)`), handlers[k])

        this.bot.onText(new RegExp(`^\/${k}@${username}$`), handlers[k])
        this.bot.onText(new RegExp(`^\/${k}@${username} (.*)`), handlers[k])

        this.bot.onText(new RegExp(`^\/@?${first_name} ${k} ?(.*)`), handlers[k])
        this.bot.onText(new RegExp(`^\/@?${username} ${k} ?(.*)`), handlers[k])
      })
    })
  }

  usage() {
    return `
/search
/zones
/countries Zone
/newspapers Zone/Country
    `
  }

  doGetZones(msg) {
    const chatId = msg.chat.id
    let user = msg.from.first_name

    let keyboard = utils.inlineRowsKeyboard(Object.keys(this.zones), (z) => (`countries ${z}`))

    this.bot._sendMessage(chatId, `Ok ${user}, choose a zone`, keyboard)
  }

  doGetCountries(msg, match) {
    this.zonesFuzzy.search(match[1])
      .then(search => {
        const chatId = msg.chat.id
        let user = msg.from.first_name

        debug(search)
        let keyboard = utils.inlineRowsKeyboard(
          search.result.countries, (c) => (`getCountry ${c}`))

        return this.bot._sendMessage(
          chatId, `Ok ${user}, choose a country`, keyboard)
      })
  }

  doStart(msg) {
    this.doGetZones(msg)
  }

  sendNewsPapers(chatId, newspapers) {
    let values = Object.values(newspapers).map(v => {
      let date = v.date ? ` (${v.date})` : ''

      return {
        type: 'photo',
        media: v.high,
        caption: `${v.country}: ${v.name}${date}`
      }
    })

    return utils.splitCall(values, GROUP_MAX_ENTRIES, (i) => (
      this.bot._sendMediaGroup(chatId, i)
    ))
  }

  doGetAllForCountry(msg, match) {
    let [, term] = match
    let userName = msg.from.first_name

    const chatId = msg.chat.id

    if (!term) {
      return this.bot._sendMessage(chatId, `hey ${userName}, i need a term`)
    }

    this.countriesFuzzy.search(term)
    // .then(utils.debugPromise('countryFuzzy'))
      .then(search => {
        let today = this.run.filterToday(search.result.newspapers)
        debug(today)
        return this.sendNewsPapers(chatId, today)
      })
      .catch(e => {
        debug(e)
        return this.bot._sendMessage(chatId, 'wrong country, try again')
      })
  }

  doGet10Days(msg, match) {
    let [newspaperKey] = match[1].split('/')
    const chatId = msg.chat.id

    return this.sendNewsPapers(chatId, this.run.get10Days(newspaperKey))
  }

  doSearch(msg, match) {
    const [, term] = match

    const chatId = msg.chat.id

    let searchActions = {
      newspapers: (n) => (this.sendNewsPapers(chatId, this.run.get10Days(n.name))),
      countries: (c) => (this.sendNewsPapers(chatId, this.run.filterToday(c.newspapers))),
      zones: (z) => (this.doGetCountries(msg, z.name)),
      notFound: (e) => {
        let msg = `couldn't find \`${term}\` in newspapers, countries or zones`
        debug(msg, e)
        return this.bot._sendMessage(chatId, msg)
      }
    }

    let promises = [
      this.newspapersFuzzy.search(term).catch(e => ({ distance: 1000 })),
      this.countriesFuzzy.search(term).catch(e => ({ distance: 1000 }))
      // FIXME: i don't have any idea why zonesFuzzy doesn't work
      //      this.zonesFuzzy.search(term).catch(e => {distance: 1000}),
    ]

    Promise.all(promises)
      .then((results) => (
        results.reduce((a, c) => (
          c.distance < a.distance ? c : a
        ), {name: 'notFound', distance: 100})
      )).then(r => searchActions[r.name](r.result))
  }

}

module.exports = TapaBot
