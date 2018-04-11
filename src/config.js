let DATA_PATH=`${__dirname}/..`

module.exports = {
    BASE_URL: 'http://kiosko.net',
    IMG_BASE_URL: 'http://img.kiosko.net',
    IMG_DATE_REGEXP: '([0-9]+)/([0-9]+)/([0-9]+)',
    DATA_PATH,
    FILES: {
        ZONES: `${DATA_PATH}/zones.json`,
        NEWSPAPERS: `${DATA_PATH}/newspapers.json`,
        COUNTRIES: `${DATA_PATH}/countries.json`
    }
}
