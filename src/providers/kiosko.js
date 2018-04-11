const axios = require('axios')
const $ = require('cheerio')
const moment = require('moment')
const debug = require('debug')('tapa-bot:plugin:kiosko')

const Provider = require('../provider')

const {debugPromise} = require('../utils')

let newspaperCache = {}
let countryCache = {}

module.exports = class KioskoProvider extends Provider{
    constructor(config) {
        super(config)

        debug("im live")

        this.config = Object.assign({
            BASE_URL: 'http://kiosko.net',
            IMG_BASE_URL: 'http://img.kiosko.net',
            IMG_DATE_REGEXP: '([0-9]+)/([0-9]+)/([0-9]+)'
        }, config)
        this.name = 'Kiosko'
        this.description = 'kiosko.net provider for TapaBot'
    }

    parseImgURL(url) {
        return url.match(new RegExp(`${this.config.IMG_BASE_URL}/${this.config.IMG_DATE_REGEXP}/(.*)`))
    }

    imgURLisToday(url) {
        let [, y, m, d] = this.parseImgURL(url)

        let nm = moment(`${y}${m}${d}`)
        return nm.format('YYYY/MM/DD') === moment().format('YYYY/MM/DD')
    }


    fetch() {
        let {BASE_URL} = this.config
        return axios.get(BASE_URL)
                    .then((res) => {
                        let zones = {}
                        let zonePromises = $('#cabecera .barraMenu', res.data)
                            .find('#menu > li').map((i, e) => {
                                let selector = $('a', e)

                                if (! selector || ! selector[0]) {
                                    return;
                                }

                                const zone = selector.attr('href')
                                const zoneName = selector[0].children[0].data

                                if (zoneName === 'Inicio') {
                                    return
                                }

                                let countries = {}
                                let countryPromises = $(e).find('ul li a').map((i, e) => {
                                    const countryName = e.children[0].data
                                    const countryURL = $(e).attr('href')

                                    const generalURL = countryURL.match('.html') ? '' : 'general.html'

                                    debug('getting', zoneName, countryName)
                                    return axios.get(`${BASE_URL}${countryURL}${generalURL}`)
                                                .then((res) => {
                                                    const newspapers = {}

                                                    $(res.data).find('.thcover img').map((i, e) => {
                                                        const name = $(e).attr('alt')
                                                        newspapers[name] = {
                                                            name: name,
                                                            low: $(e).attr('src'),
                                                            high: $(e).attr('src').replace('200', '750')
                                                        }
                                                    })

                                                    newspaperCache = Object.assign(newspaperCache, newspapers)
                                                    return newspapers
                                                })
                                                .then(newspapers => (Object.assign(countries, {
                                                    [`${countryName}`]: {
                                                        name: countryName,
                                                        newspapers: Object.keys(newspapers)
                                                    }
                                                })))
                                })


                                return Promise.all(countryPromises.get())
                                              .then(() => {
                                                  countryCache = Object.assign(countryCache, countries)

                                                  return Object.assign(zones, {
                                                      [`${zoneName}`]: {
                                                          name: zoneName,
                                                          countries: Object.keys(countries)
                                                      }
                                                  })
                                              })
                            })

                        debug(zonePromises.get())
                        return Promise.all(zonePromises.get())
                                      .then(debugPromise('zonePromises'))
                                      .then(() => zones)
                    })
                    .then((data) => ({
                        zones: data,
                        countries: countryCache,
                        newspapers: newspaperCache
                    }))
                    .then(debugPromise('done'))
    }

    filterToday(newspapers) {
        debug('filterToday', newspapers, this.newspapers)

        let filtred = newspapers.map(n => this.newspapers[n])
                                .filter(n => n && this.imgURLisToday(n.high))
                                .map(n => ({[n.name]: n}))

        debug ('filtred', filtred, Object.assign.apply(this, filtred))

        return Object.assign.apply(this, filtred)
    }

    get10Days(newspaper) {
        let [, y, m, d, highUrl] = parseImgURL(newspaper.high)

        let ret = {}
        let nm = moment(`${y}${m}${d}`)

        for (let i = 0; i < 10; i += 1) {
            let dt = nm.format('YYYY/MM/DD')
            ret[`${newspaper.name} (${dt})`] = {high: `${IMG_BASE_URL}/${dt}/${highUrl}`}
            nm.subtract(1, 'days')
        }

        return ret
    }
}

