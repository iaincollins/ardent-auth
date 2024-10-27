const jsonWebToken = require('jsonwebtoken')

const {
  AUTH_JWT_SECRET,
  AUTH_COOKIE_DOMAIN
} = require('./consts')

// const MIN_JWT_REFRESH_AGE = 60 * 60 * 24 // Refresh JWT if it's more than 24 hours hold
const MAX_JWT_AGE_SECONDS = 60 * 60 * 24 * 30 // JWT valid for up to 30 days if no activity
const COOKIE_DEFAULT_OPTIONS = { httpOnly: true, domain: AUTH_COOKIE_DOMAIN, signed: true }
const JWT_COOKIE_OPTIONS = { ...COOKIE_DEFAULT_OPTIONS, maxAge: MAX_JWT_AGE_SECONDS * 1000 }

function createJwt (payload) {
  return jsonWebToken.sign(payload, AUTH_JWT_SECRET, {
    expiresIn: MAX_JWT_AGE_SECONDS
  })
}

async function verifyJwt (ctx) {
  const jwt = ctx.cookies.get('auth.jwt')
  if (!jwt) throw new Error('No JWT found. Not signed in.')
  const payload = jsonWebToken.verify(jwt, AUTH_JWT_SECRET)

  // TODO Optimise by only updating JWT if older than MIN_JWT_REFRESH_AGE

  // Preserve existing JWT (except iat and exp)
  const newPayload = { ...payload }
  delete newPayload.iat
  delete newPayload.exp
  const newJwt = await createJwt(newPayload)

  // Save new JWT
  ctx.cookies.set('auth.jwt', newJwt, JWT_COOKIE_OPTIONS)

  // Return new JWT
  return jsonWebToken.verify(newJwt, AUTH_JWT_SECRET)
}

module.exports = {
  createJwt,
  verifyJwt
}
