const debug = require('debug')('tapa-bot:provider')

module.exports = class NewspaperProvier {

  constructor() {
    this.name = 'Generic'
    this.newspapers = {}
  }

  get(newspaper) {
    return this.newspapers[newspaper]
  }

  load(newspapers) {
    this.newspapers = Object.values(newspapers).reduce((a, n) => {
      if (n.provider === this.name || n.historyProvider === this.name) {
        return Object.assign(a, {
          [n.name]: n
        })
      }
      return a
    }, {})

    return this.newspapers
  }

  fetch() {
    throw new Error('NOT IMPLEMENTED')
  }

  get10Days() {
    return []
  }

  filterToday(newspapers) {
    return newspapers.map(n => this.newspapers[n])
      .filter(n => n)
  }

  // for debug purposes only
  _keys() {
    return this.newspapers ? Object.keys(this.newspapers) : []
  }

}
