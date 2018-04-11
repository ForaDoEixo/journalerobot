const auth = require('../../auth');
const TelegramBot = require('node-telegram-bot-api');
const chokidar = require('chokidar');

const debug = require('debug')('tapa-bot')

const FuzzySearch = require('./search');
const {inlineRowsKeyboard, getProviders} = require('./utils')

const {FILES, GROUP_MAX_ENTRIES} = require('./config')

Array.prototype.reduceIn = (a, h) => (
    a.reduce((a, k) => (
        Object.assign(a, h[k])
    ), {})
)

class TapaBot {
    constructor () {
        this.handlers = {
            'zones':     this.doGetZones.bind(this),
            'countries': this.doGetCountries.bind(this),
            'start':     this.doStart.bind(this),
            'getCountry':this.doGetAllForCountry.bind(this),
            'getNewspaper':       this.doGet10Days.bind(this),
            'search':    this.doSearch.bind(this)
        }

        let runOnAllProviders = (methodName) => (
            (arg) => (Object.values(this.providers).reduce((a, p) => (
                Object.assign(a, p[methodName](arg))
            ), {}))
        )

        this.run = ['get', 'load', 'get10Days', 'filterToday'].reduce((a, methodName) => (
            Object.assign(a, {
                [methodName] : runOnAllProviders(methodName)
            })
        ), {})
    }
    init() {
        this.watcher = chokidar.watch(Object.values(FILES), {
            persistent: true
        });

        // replace the value below with the Telegram token you receive from @BotFather
        this.token = auth.API_KEY;

        this.zones = require(FILES.ZONES)
        this.zonesFuzzy = new FuzzySearch(this.zones)

        this.countries = require(FILES.COUNTRIES)
        this.countriesFuzzy = new FuzzySearch(this.countries)

        let newspapers = require(FILES.NEWSPAPERS)
        this.newspapersFuzzy = new FuzzySearch(newspapers, {maxDistance: 0.0001})
        this.run.load(newspapers)

        this.watcher.on('change', this.reload.bind(this))
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
        return getProviders()
            .then((providers) => {
                this.providers = providers
            })
            .then(this.init.bind(this))
            .then(this.startBot.bind(this))
    }

    startBot() {
        // Create a bot that uses 'polling' to fetch new updates
        this.bot = new TelegramBot(this.token, {polling: true});

        this.bot.on('callback_query', (cbq) => {
            const [, action, args] = cbq.data.match(/(\w+) ?(.*)/)
            const msg = cbq.message;
            const opts = {
                chat_id: msg.chat.id,
                message_id: msg.message_id
            };

            this.handlers[action](msg, [null, args])
            this.bot.editMessageText(`${action} → ${args}`, opts);
        })


        this.bot.getMe().then(({first_name, username}) => {
            let handlers = this.handlers
            let meRegExps = [
                new RegExp(`${first_name} (\w+) ?(.*)`),
                new RegExp(`${username} (\w+) ?(.*)`)
            ]

            this.bot.on('message', (msg) => {
                const chatId = msg.chat.id;

                meRegExps.forEach(r => {
                    if (msg.text.match(r)) {
                        this.bot.sendMessage(chatId, 'yes please')
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
        const chatId = msg.chat.id;
        let user = msg.from.first_name

        let keyboard = inlineRowsKeyboard(Object.keys(this.zones), (z) => (`countries ${z}`))

        this.bot.sendMessage(chatId, `Ok ${user}, choose a zone`, keyboard);
    }

    doGetCountries(msg, match) {
        this.zonesFuzzy.search(match[1])
            .then(zone => {
                const chatId = msg.chat.id;
                let user = msg.from.first_name

                debug (zone)
                let keyboard = inlineRowsKeyboard(
                    zone.countries, (c) => (`getCountry ${c}`))

                return this.bot.sendMessage(
                    chatId, `Ok ${user}, choose a country`, keyboard);
            })
    }

    doStart(msg) {
        this.doGetZones(msg)
    }

    sendNewsPapers(chatId, country, newspapers)  {
        debug('here', newspapers)
        let values = Object.values(newspapers)
        let i = 0
        do {
            debug('entries', values)
            this.bot.sendMediaGroup(chatId, values.splice(i, i + GROUP_MAX_ENTRIES).map((v) => {
                return {
                    type: 'photo',
                    media: v.high,
                    caption: `${country}: ${v.name}`
                }
            }))
            i += GROUP_MAX_ENTRIES
        } while (i < values.length);
    }

    doGetAllForCountry(msg, match) {
        let [,term] = match
        let userName = msg.from.first_name

        const chatId = msg.chat.id;

        if (! term) {
            this.bot.sendMessage(chatId,  `hey ${userName}, i need a term`)
            return this.bot.sendMessage(chatId, this.usage())
        }

        this.countriesFuzzy.search(term)
            //.then(debugPromise('countryFuzzy'))
            .then(country => (
                this.sendNewsPapers(chatId, country.name,
                                    this.run.filterToday(country.newspapers))
            ))
            .catch(e => {
                debug(e)
                this.bot.sendMessage(chatId, 'wrong country, try again')
                return this.bot.sendMessage(chatId, this.usage())
            })
    }

    doGet10Days(msg, match) {
        let [newspaperKey] = match[1].split('/')
        let userName = msg.from.first_name

        const chatId = msg.chat.id;

        return this.sendNewsPapers(chatId, country, this.run.get10Days(newspaperKey))
    }

    doSearch (msg, match) {
        const [, term] = match

        const chatId = msg.chat.id

        debug('search', term)
        this.newspapersFuzzy.search(term)
                          .then((z) => (
                              getCountries(msg, z.name)
                          ))
                          .catch(e => (
                              this.countriesFuzzy
                                  .search(term)
                                  .then((c) => (
                                      this.sendNewsPapers(chatId, c.name,
                                                          this.run.filterToday(c.newspapers))))
                                  .catch(e => (
                                      this.zonesFuzzy
                                          .search(term)
                                          .then((n) => (
                                              this.sendNewsPapers(chatId, 'UNSUPPORTED',
                                                                  this.run.get10Days(n))))
                                          .catch(e => {
                                              let msg = `couldn't find \`${term}\` in newspapers, countries or zones`
                                              debug(msg, e)
                                              return this.bot.sendMessage(chatId, msg)
                                          })
                                  ))
                          )).then(debugPromise('search'))
    }
}

module.exports = TapaBot
