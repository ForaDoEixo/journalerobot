let DATA_PATH = `${__dirname}/..`

module.exports = {
  GROUP_MAX_ENTRIES: 10,
  API_RATE_LIMIT: 500,
  DATA_PATH,
  FILES: {
    ZONES: `${DATA_PATH}/zones.json`,
    NEWSPAPERS: `${DATA_PATH}/newspapers.json`,
    COUNTRIES: `${DATA_PATH}/countries.json`
  }
}
