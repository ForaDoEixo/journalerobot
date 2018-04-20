'use strict'

/* eslint-disable no-unused-expressions */
const { expect } = require('chai')
const FuzzySearch = require('../src/search')

const path = require('path')

const cachedNewspapers = require(`${__dirname}/data/newspapers.json`)
const cachedCountries = require(`${__dirname}/data/countries.json`)
const cachedZones = require(`${__dirname}/data/zones.json`)

let keys = Array.from('abcdefghijklmnopqrstuvwxyz')

function itemify(keys) {
  return keys.reduce((a, c) => (
    Object.assign(a, {[c + c + c + c]: c})
  ), {})
}

describe('search', function () {
  describe('main object', function () {
    it('should throw if no name provided', function () {
      expect(() => (new FuzzySearch())).to.throw()
      expect(() => (new FuzzySearch(null, []))).to.throw()
      expect(() => (new FuzzySearch(undefined, []))).to.throw()
    })
    it('should throw if no items provided', function () {
      expect(() => (new FuzzySearch('test'))).to.throw()
      expect(() => (new FuzzySearch('test', null))).to.throw()
      expect(() => (new FuzzySearch('test', undefined))).to.throw()
    })
  })
  describe('load', function () {
    it('should load new objects')
    let f = new FuzzySearch('test', itemify(keys.slice(0, 10)))

    f.load(itemify(keys.slice(10)))

    let s = 'xxxx'
    return f.search(s)
      .then(r => {
        expect(r).to.be.an('object')
        expect(r.result).to.equal('x')
        expect(r.distance).to.equal(0)
      })
  })
  describe('search', function () {
    let f = new FuzzySearch('test', itemify(keys.slice(0, 10)))

    it('should return exact match with 0 distance', function () {
      let s = 'cccc'

      return f.search(s)
        .then(r => {
          expect(r).to.be.an('object')
          expect(r.result).to.equal('c')
          expect(r.distance).to.equal(0)
        })
    })
    it('should return match', function () {
      let s = 'ccc'

      return f.search(s)
        .then(r => {
          expect(r).to.be.an('object')
          expect(r.result).to.equal('c')
          expect(r.distance).is.below(0.01)
        })
    })

    it('should throw if no match', function (done) {
      let s = 'xxx'

      f.search(s)
        .catch(e => done())
    })
  })
})
