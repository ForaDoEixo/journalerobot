if (process.argv < 2) return

const P = require(require.resolve(`${process.env.PWD}/${process.argv[2]}`))
const p = new P()
p.fetch()
 .then(console.error.bind(console))
 .catch(console.error.bind(console))
