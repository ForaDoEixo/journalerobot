'use strict'

/* eslint-disable no-unused-expressions */
const { expect } = require('chai')
const Provider = require('../src/provider')
const utils = require('../src/utils')
const path = require('path')

const cachedNewspapers = require(`${__dirname}/data/newspapers.json`)
const cachedCountries = require(`${__dirname}/data/countries.json`)
const cachedZones = require(`${__dirname}/data/zones.json`)

const TIMEOUT = 8000
const FAKE_NAME = 'The Fake News Daily'
const FAKE_NEWS_SIZE = 20

describe('Testing all in-source providers', function () {
  it('should load providers from directory', function (done) {
    utils._getProviders().then(providers => {
      Object.values(providers).map(ProviderClass => {
        let p = new ProviderClass()

        let fakeNews = {}
        let fakeNewsForein = {}

        for (let i = 0; i < FAKE_NEWS_SIZE; i++) {
          fakeNews[`${FAKE_NAME}${i}`] = {
            name: `${FAKE_NAME}${i}`,
            provider: p.name,
            high: `http://thefakenewsdaily.cc/${i}-high.jpg`,
            low: `http://thefakenewsdaily.cc/${i}-low.jpg`
          }
          fakeNewsForein[`${FAKE_NAME}${i}`] = {
            name: `${FAKE_NAME}${i}`,
            provider: 'FOREIN_PROVIDER',
            high: `http://thefakenewsdaily.cc/${i}-high.jpg`,
            low: `http://thefakenewsdaily.cc/${i}-low.jpg`
          }
        }

        describe(`test provider ${p.name}`, function () {
          describe('load()', function () {
            let p = new ProviderClass()

            it('should load newspapers from data file', function () {
              p.load(cachedNewspapers)

              let n = p.newspapers
              let k = p._keys()[0]

              expect(n).to.be.an('object')
              expect(n[k]).to.be.an('object')
              expect(n[k].name).to.equal(k)
              expect(n[k].provider).to.equal(p.name)
              expect(n[k].high).to.be.a('string')
            })

            it('should load newspapers from fakeNews', function () {
              p.load(fakeNews)

              let n = p.newspapers
              let k = p._keys()[0]

              expect(n).to.be.an('object')
              expect(n[k]).to.be.an('object')
              expect(n[k].name).to.equal(k)
              expect(n[k].provider).to.equal(p.name)
              expect(n[k].high).to.be.a('string')
            })

            it('should NOT load newspapers from fakeNewsForein', function () {
              p.load(fakeNewsForein)

              let n = p.newspapers

              expect(n).to.deep.equal({})
              expect(p._keys().length).to.equal(0)
            })
          })

          describe('get()', function () {
            let p = new ProviderClass()

            it('should return newspapers from data file', function () {
              p.load(cachedNewspapers)

              let k = p._keys()[0]
              let n = p.newspapers[k]

              expect(p.get(k)).to.deep.equal(n)
            })
          })

          describe('fetch()', function () {
            let p = new ProviderClass()

            this.timeout(TIMEOUT)

            it('should fetch newspapers from the network', function (done) {
              p.fetch().then(({newspapers}) => {
                let k = Object.keys(newspapers)[0]
                let n = newspapers[k]

                expect(n).to.be.an('object')
                expect(n.provider).to.be.equal(p.provider)
                expect(n.name).to.be.equal(k)
                expect(n.high).to.be.a('string')

                done()
              })
            })

            it('should not load fetched newspapers', function (done) {
              p.fetch().then((ret) => {
                expect(p._keys()).to.deep.equal([])

                done()
              })
            })
          })

          describe('get10Days()', function () {
            let p = new ProviderClass()

            this.timeout(TIMEOUT)
            it('should get latest 10 newspapers for a name', function (done) {
              p.load(cachedNewspapers)

              let k = p._keys()[0]
              let g10 = p.get10Days(k)
              let keys = Object.keys(g10)
              let values = Object.values(g10)

              expect(g10).to.be.an('object')
              expect(keys.length).to.be.equal(10)
              expect(values[0]).to.be.an('object')
              expect(values[0].high).to.be.a('string')

              done()
            })
          })

          describe('filterToday()', function () {
            let p = new ProviderClass()

            this.timeout(TIMEOUT)
            it('should only list today\'s newspaper', function (done) {
              p.fetch().then(({newspapers}) => {
                let keys = Object.keys(newspapers).splice(10)
                let today = p.filterToday(keys)

                done()
              })
            })
          })
        })
      })
    })

    done()
  })
})
