const fs = require('fs')
const deepAssign = require('deep-assign')
const debug = require('debug')('tapa-bot:update')

const {debugPromise, getProviders} = require('./utils')

const config = require('./config')
const {FILES} = config

let promiseWriteFile = (file, data) => (
    new Promise((accept, reject) => (
        fs.writeFile(file, JSON.stringify(data), (err) => (
            err ? reject(err) : accept(file)
        ))
    ))
)

getProviders(config)
    .then(providers => {
        promises = Object.values(providers).map(p => p.fetch())

        return Promise
            .all(promises)
            .then(debugPromise('before'))
            .then(results => (
                results.reduce((a, c) => (
                    deepAssign(a, c)
                ), {})
            )).then(debugPromise('after'))
            .then(({zones, countries, newspapers}) => (
                Promise.all([
                    promiseWriteFile(FILES.ZONES, zones),
                    promiseWriteFile(FILES.COUNTRIES, countries),
                    promiseWriteFile(FILES.NEWSPAPERS, newspapers)
                ])))
            .catch(err => debug('GOT ERROR', err))
            .then(debugPromise('all done'))
    })


