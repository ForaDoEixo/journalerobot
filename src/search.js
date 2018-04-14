const {StringMap} = require('fast-n-fuzzy')
const DebugFactory = require('debug')

class fuzzySearch {

  constructor(
    name,
    items,
    opts,
    resolve = (e) => (e)
  ) {
    this.opts = Object.assign({}, {
      maxSearchResults: 3, // used for debug only
      maxDistance: 0.001 // this is set by trial and error
    }, opts)
    this.name = name
    this.debug = DebugFactory(`tapa-bot:search:${this.name}  \t`)

    this.resolve = resolve
    this.stringMap = this.load(items, opts)
  }

  load(items) {
    this.debug('new stringMap', this.opts)
    let stringMap = new StringMap(this.opts)
    this.items = items
    Object.keys(items).map(k => stringMap.add(k.replace(/\s+/g, '_'), k.replace(/\s+/g, '_')))
    return stringMap
  }

  search(term) {
    term = term.replace(/\s+/g, '_')
    let res = this.stringMap.search(term)
    if (!res) {
      return Promise.reject(new Error('not found'))
    }

    if (res[0].distance > this.opts.maxDistance) {
      return Promise.reject(new Error(`${this.name}: found with bad distance`))
    }

    let k = res[0].value.replace(/_/g, ' ')
    this.debug('search', term, res, this.items[k])
    return Promise.resolve(this.items[k])
  }

}

module.exports = fuzzySearch
