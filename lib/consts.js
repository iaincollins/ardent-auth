const path = require('path')
const fs = require('fs')
const { randomBytes } = require('crypto')

// Valid config file locations
const ARDENT_CONFIG_LOCATIONS = [
  '/etc/ardent.config',
  path.join(__dirname, '../../ardent.config'),
  path.join(__dirname, '../ardent.config')
]

for (const path of ARDENT_CONFIG_LOCATIONS.reverse()) {
  if (fs.existsSync(path)) require('dotenv').config({ path })
}

const ARDENT_AUTH_HOSTNAME = process.env?.ARDENT_API_HOSTNAME ?? 'auth.ardent-industry.com'
const ARDENT_WEBSITE_HOSTNAME = process.env?.ARDENT_WEBSITE_HOSTNAME ?? 'www.ardent-industry.com'
const ARDENT_AUTH_LOCAL_PORT = 3003

if (!process.env?.ARDENT_SESSION_SECRET) {
  console.warn('WARNING: ARDENT_SESSION_SECRET was not set, generating temporary secret (will change when server restarts)')
  process.env.ARDENT_SESSION_SECRET = randomBytes(64).toString('hex')
}
const SESSION_SECRET = process.env.ARDENT_SESSION_SECRET

if (!process.env?.ARDENT_AUTH_JWT_SECRET) {
  console.warn('WARNING: AUTH_JWT_SECRET was not set, generating temporary secret (will change when server restarts)')
  process.env.ARDENT_AUTH_JWT_SECRET = randomBytes(64).toString('hex')
}

const AUTH_JWT_SECRET = process.env.ARDENT_AUTH_JWT_SECRET
const AUTH_CLIENT_ID = process.env?.ARDENT_AUTH_CLIENT_ID ?? 'ff8a7f4a-ae23-401d-97b7-048a23c0fdb6'
const AUTH_COOKIE_DOMAIN = process.env?.ARDENT_AUTH_COOKIE_DOMAIN ?? '.ardent-industry.com'
const AUTH_CALLBACK_URL = `https://${ARDENT_AUTH_HOSTNAME}/callback`
const AUTH_SIGNED_IN_URL = `https://${ARDENT_WEBSITE_HOSTNAME}/auth/signed-in`
const AUTH_SIGNED_OUT_URL = `https://${ARDENT_WEBSITE_HOSTNAME}/auth/signed-out`
const AUTH_ERROR_URL = `https://${ARDENT_WEBSITE_HOSTNAME}/auth/error`

const FRONTIER_API_BASE_URL = 'https://companion.orerve.net'

module.exports = {
  ARDENT_AUTH_LOCAL_PORT,
  SESSION_SECRET,
  AUTH_JWT_SECRET,
  AUTH_CLIENT_ID,
  AUTH_CALLBACK_URL,
  AUTH_COOKIE_DOMAIN,
  AUTH_SIGNED_IN_URL,
  AUTH_SIGNED_OUT_URL,
  AUTH_ERROR_URL,
  FRONTIER_API_BASE_URL
}