const axios = require('axios')
const $ = require('cheerio')
const querystring = require('querystring')
const debug = require('debug')('tapa-bot:plugin:newseum')

const Provider = require('../provider')

const {debugPromise, objectify} = require('../utils')

module.exports = class NewseumProvider extends Provider {

  constructor(config) {
    super(config)

    this.config = Object.assign({
      BASE_URL: 'http://www.newseum.org/todaysfrontpages/?tfp_display=gallery&tfp_show=all',
      IMG_HIGH_BASE_URL: 'http://cdn.newseum.org/dfp/jpg11/lg/',
      IMG_LOW_BASE_URL: `http://www.newseum.org/todaysfrontpages/Today’s Front Pages _ Newseum_files/`,
      IMG_DATE_REGEXP: '([0-9]+)/([0-9]+)/([0-9]+)',
      IMG_COMPONENT_REGEXP: '[^/]+.jpg'
    }, config)
    this.name = 'Newseum'
    this.description = 'http://www.newseum.org/todaysfrontpages/ provider for TapaBot'
  }

  fetch() {
    let {BASE_URL} = this.config
    let zones = {}
    let countries = {}
    let newspapers = {}

    return axios.get(BASE_URL)
      .then((res) => {
        $(res.data).find('.thumbnail-group-item').map((i, t) => {
          let image = querystring.escape($('h4 a', t).attr('name'))
          let name = $('h4 a', t).attr('title')
          let [city, country] = $('.thumbnail-group-body p', t).attr('title').split(',  ')

          newspapers[name] = {
            name: name,
            country: country,
            high: `${this.config.IMG_HIGH_BASE_URL}${image}.jpg`,
            low: `${this.config.IMG_LOW_BASE_URL}${image}.jpg`
          }

          if (!countries[country]) {
            countries[country] = {
              name: country,
              newspapers: []
            }

            countries[country].newspapers.push(name)
          }
        })

        return {zones, countries, newspapers}
      })
  }
  filterToday(newspapers) {
    debug('filterToday', newspapers)

    let filtred = newspapers.map(n => this.newspapers[n])
      .filter(n => n)

    debug('filtred', filtred)
    return objectify(filtred)
  }

}
