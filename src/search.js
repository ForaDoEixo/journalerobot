const {StringMap} = require('fast-n-fuzzy')
const DebugFactory = require('debug')

class fuzzySearch {

  constructor(
    name,
    items,
    opts = {}
  ) {
    this.opts = Object.assign({}, {
      maxSearchResults: 3, // used for debug only
      maxDistance: 0.001 // this is set by trial and error
    }, opts)

    if (!name) {
      throw new Error('Need to provide a name')
    }

    if (!items) {
      throw new Error('Need to instanciate with items to load')
    }

    this.name = name
    this.debug = DebugFactory(`tapa-bot:search:${this.name}  \t`)
    this.load(items)
  }

  load(items) {
    this.debug('new stringMap', this.opts)
    this.stringMap = new StringMap(this.opts)
    this.items = items
    Object.keys(items).map(k => this.stringMap.add(k.replace(/\s+/g, '_'), k.replace(/\s+/g, '_')))
    return this.stringMap
  }

  search(term) {
    term = term.replace(/\s+/g, '_')
    let res = this.stringMap.search(term)
    if (!res || !res[0] || res[0].distance > this.opts.maxDistance) {
      return Promise.reject(new Error(`${this.name}: not found`))
    }

    let k = res[0].value.replace(/_/g, ' ')
    this.debug('search', term, res, this.items[k])
    return Promise.resolve({
      name: this.name,
      result: this.items[k],
      distance: res[0].distance
    })
  }

}

module.exports = fuzzySearch
