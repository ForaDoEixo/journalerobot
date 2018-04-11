const fs = require('fs')
const glob = require('glob')
const deepAssign = require('deep-assign')
const debug = require('debug')('tapa-bot:update')

const {debugPromise} = require('./utils')

const config = require('./config')
const {FILES} = config

let promiseWriteFile = (file, data) => (
    new Promise((accept, reject) => (
        fs.writeFile(file, JSON.stringify(data), (err) => (
            err ? reject(err) : accept(file)
        ))
    ))
)

glob(`${__dirname}/providers/*.js`, (err, files) => {
    let promises = files.map(f => {
        let p = require(require.resolve(f))
        let P = new p(config)

        debug(f, P.name, P.description)

        return P.fetch()
    })

    Promise.all(promises)
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

