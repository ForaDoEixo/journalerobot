const axios = require('axios')
const fs = require('fs')
const $ = require('cheerio')
const debug = require('debug')('tapa-bot-get-zones')

const {debugPromise} = require('../utils')

let newspaperCache = {}
let countryCache = {}

function parseImgURL(url) {
    return url.match(new RegExp(`${IMG_BASE_URL}/${IMG_DATE_REGEXP}/(.*)`))
}

function imgURLisToday(url) {
    let [, y, m, d] = parseImgURL(url)

    let nm = moment(`${y}${m}${d}`)
    return nm.format('YYYY/MM/DD') === moment().format('YYYY/MM/DD')
}

module.exports = class KioskoProvider {
    constructor(config) {
        this.config = Object.assign({
            BASE_URL: 'http://kiosko.net',
            IMG_BASE_URL: 'http://img.kiosko.net',
            IMG_DATE_REGEXP: '([0-9]+)/([0-9]+)/([0-9]+)'
        }, config)
        this.name = 'Kiosko'
        this.description = 'kiosko.net provider for TapaBot'

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
                                                        url: countryURL,
                                                        name: countryName,
                                                        newspapers: newspapers
                                                    }
                                                })))
                                })


                                return Promise.all(countryPromises.get())
                                              .then(() => {
                                                  countryCache = Object.assign(countryCache, countries)

                                                  return Object.assign(zones, {
                                                      [`${zoneName}`]: {
                                                          url: zone,
                                                          name: zoneName,
                                                          countries: countries
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
    }
}

