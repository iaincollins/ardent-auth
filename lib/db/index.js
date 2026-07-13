const AuthDatabase = require('./auth-db')

const BUSY_TIMEOUT_IN_MS = 5000

const [
  authDb
] = [
  AuthDatabase
].map(database => {
  const databaseName = database.getDatabaseName()

  console.log(`[${databaseName}] Initalizing database`)
  const db = database.getDatabase({
    // verbose: console.log
  })

  // Set default DB journal mode and truncate at startup
  console.log(`[${databaseName}] Enabling Write Ahead Log`)
  db.pragma('journal_mode = WAL')
  db.pragma('synchronous = FULL')
  db.pragma('wal_autocheckpoint = 1000')
  db.pragma(`busy_timeout = ${BUSY_TIMEOUT_IN_MS}`)

  console.log(`[${databaseName}] Ensuring tables exist and indexes present`)
  database.ensureTables()
  database.ensureIndexes()

  console.log(`[${databaseName}] Database initalized`)
  return db
})

module.exports = {
  authDb
}
