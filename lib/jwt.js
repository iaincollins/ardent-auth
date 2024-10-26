const jsonWebToken = require('jsonwebtoken')
const formData = require('./form-data')
const { secondsSinceEpoch } = require('./auth-utils')

const {
  AUTH_JWT_SECRET,
  AUTH_CLIENT_ID,
  AUTH_COOKIE_DOMAIN
} = require('./consts')

const ACCESS_TOKEN_EXPIRES_GRACE_SECONDS = 60 * 5 // How long before a token is due to expire do we treat it as expired
const MAX_JWT_AGE_SECONDS = 86400 * 25 // Fdev sessions valid for 25 days max
const COOKIE_DEFAULT_OPTIONS = { httpOnly: true, domain: AUTH_COOKIE_DOMAIN, signed: true }
const JWT_COOKIE_OPTIONS = { ...COOKIE_DEFAULT_OPTIONS, maxAge: MAX_JWT_AGE_SECONDS * 1000 }

function createJwt (payload) {
  return jsonWebToken.sign(payload, AUTH_JWT_SECRET, {
    expiresIn: MAX_JWT_AGE_SECONDS
  })
}

function verifyJwt (jwt) {
  return jsonWebToken.verify(jwt, AUTH_JWT_SECRET)
}

async function verifyAndRefreshJwt (ctx) {
  const { forceRefresh = false } = ctx.query
  const jwt = ctx.cookies.get('auth.jwt')
  if (!jwt) throw new Error('No JWT found. Not signed in.')

  // Conditionally update token if the current access token has expired
  // (or will soon expire, before it is used).
  let jwtPayload = verifyJwt(jwt) // Call verify to check is valid and get payload
  if (forceRefresh === 'true' || (jwtPayload?.accessTokenExpires < new Date((secondsSinceEpoch() + ACCESS_TOKEN_EXPIRES_GRACE_SECONDS) * 1000).toISOString())) {
    const newJwt = await refreshJwt(jwtPayload) // Use Refresh Token to get new Access Token (will also be given a new Refresh Token)
    ctx.cookies.set('auth.jwt', newJwt, JWT_COOKIE_OPTIONS)
    jwtPayload = verifyJwt(newJwt) // Call verify again to get payload
  }

  return jwtPayload
}

async function refreshJwt (jwtPayload) {
  // Request new tokens from Frontier using a Refresh Token
  const response = await fetch('https://auth.frontierstore.net/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: formData({
      client_id: AUTH_CLIENT_ID,
      grant_type: 'refresh_token',
      refresh_token: jwtPayload.refreshToken
    })
  })
  const responsePayload = await response.json()

  if (responsePayload?.error) {
    if (responsePayload?.error === 'invalid_token') {
      // The Access Token is valid for 4 hours, you can get a new one using a
      // Refresh Token. When the Refresh Token itself has expired the Frontier
      // API returns an invalid_token error.
      throw new Error('Frontier API Refresh Token has expired')
    } else {
      console.error('Error response returned by Frontier API while refreshing Access Token', responsePayload)
      throw new Error(`Error response returned by Frontier API while refreshing Access Token: ${responsePayload?.error}, ${responsePayload?.error_description}`)
    }
  } else if (!responsePayload.token_type) {
    console.error('Unexpected response returned by Frontier API while refreshing Access Token', responsePayload)
    throw new Error('Unexpected response returned by Frontier API while refreshing Access Token')
  }

  // Preserve any data in the old token (except properties below)
  const oldJwtPayload = { ...jwtPayload }
  delete oldJwtPayload.iat
  delete oldJwtPayload.exp

  // Create new JWT with updated tokens
  const newJwt = createJwt({
    ...oldJwtPayload,
    tokenType: responsePayload.token_type,
    accessToken: responsePayload.access_token,
    accessTokenExpires: new Date((secondsSinceEpoch() + responsePayload.expires_in) * 1000).toISOString(),
    refreshToken: responsePayload.refresh_token
  })

  return newJwt
}

module.exports = {
  createJwt,
  verifyAndRefreshJwt
}
