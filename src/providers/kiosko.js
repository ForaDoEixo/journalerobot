const axios = require('axios')
const $ = require('cheerio')
const moment = require('moment')
const debug = require('debug')('tapa-bot:plugin:kiosko')

const Provider = require('../provider')

const {debugPromise, objectify} = require('../utils')

let newspaperCache = {}
let countryCache = {}

let nameHack = (name) => (name.replace('Brasil', 'Brazil'))

module.exports = class KioskoProvider extends Provider {

  constructor(config) {
    super(config)

    this.config = Object.assign({
      BASE_URL: 'http://en.kiosko.net',
      IMG_BASE_URL: 'http://img.kiosko.net',
      IMG_DATE_REGEXP: '([0-9]+)/([0-9]+)/([0-9]+)'
    }, config)
    this.name = 'Kiosko'
    this.description = 'kiosko.net provider for TapaBot'
  }

  parseImgURL(url) {
    return url.match(new RegExp(`${this.config.IMG_BASE_URL}/${this.config.IMG_DATE_REGEXP}/(.*)`))
  }

  imgURLisToday(url, yesterday = false) {
    let [, y, m, d] = this.parseImgURL(url)

    debug(url, yesterday)

    let nm = moment(`${y}${m}${d}`)
    if (yesterday) {
      nm.add(1, 'days')
    }
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

            if (!selector || !selector[0]) {
              return
            }

            const zoneName = selector[0].children[0].data

            if (zoneName === 'Home') {
              return
            }

            let countries = {}
            let countryPromises = $(e).find('ul li a').map((i, e) => {
              const countryName = nameHack(e.children[0].data)
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
                      country: countryName,
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

  filterToday(newspapers, yesterday) {
    debug('filterToday', newspapers)

    let filtred = newspapers.map(n => this.newspapers[n])
      .filter(n => n && this.imgURLisToday(n.high, yesterday))

    if (!yesterday && filtred.length === 0) { // HACK: probably too early
      debug('retry')
      return this.filterToday(newspapers, true)
    }

    return objectify(filtred)
  }

  get10Days(newspaperName) {
    let newspaper = this.get(newspaperName)
    let [, y, m, d, highUrl] = this.parseImgURL(newspaper.high)

    let ret = {}
    let nm = moment(`${y}${m}${d}`)

    for (let i = 0; i < 10; i += 1) {
      let dt = nm.format('YYYY/MM/DD')
      ret[`${newspaper.name} (${dt})`] = {
        country: newspaper.country,
        high: `${this.config.IMG_BASE_URL}/${dt}/${highUrl}`
      }
      nm.subtract(1, 'days')
    }

    return ret
  }

}
