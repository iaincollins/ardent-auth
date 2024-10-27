const path = require('path')
const SqlLiteDatabase = require('better-sqlite3')
const { ARDENT_AUTH_DB } = require('../consts')

let database = null

function getDatabase (options = {}) {
  if (!database) database = new SqlLiteDatabase(ARDENT_AUTH_DB, options)
  return database
}

function getDatabaseName () {
  return path.basename(ARDENT_AUTH_DB)
}

function ensureTables () {
  // The 'cmdrs' table maps Commander ID's which are returned by Frontier.
  // It stores a single Access Token and Refresh Token per player and
  // handles both updating / replace them when a user signs in from a
  // new device and rotating Access Tokens before they expire.
  getDatabase().exec(`
    CREATE TABLE IF NOT EXISTS cmdrs (
      cmdrId TEXT PRIMARY KEY,
      accessToken TEXT,
      refreshToken TEXT,
      expiresAt TEXT,
      createdAt TEXT,
      updatedAt TEXT
    )
  `)
}

function ensureIndexes () {
  // The only field that needs to be indexed is the primary key
}

module.exports = {
  getDatabase,
  getDatabaseName,
  ensureTables,
  ensureIndexes
}
