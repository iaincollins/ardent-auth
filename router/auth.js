const { createJwt, verifyAndRefreshJwt } = require('../lib/jwt')
const {
  generateCodeVerifierAndChallenge,
  generateUrlSafeBase64ByteString,
  secondsSinceEpoch
} = require('../lib/auth-utils')
const formData = require('../lib/form-data')

const {
  AUTH_CLIENT_ID,
  AUTH_CALLBACK_URL,
  AUTH_COOKIE_DOMAIN,
  AUTH_SIGNED_IN_URL,
  AUTH_SIGNED_OUT_URL,
  AUTH_ERROR_URL
} = require('../lib/consts')

const MAX_JWT_AGE_SECONDS = 86400 * 25 // Fdev sessions valid for 25 days max
const COOKIE_DEFAULT_OPTIONS = { httpOnly: true, domain: AUTH_COOKIE_DOMAIN, signed: true }
const JWT_COOKIE_OPTIONS = { ...COOKIE_DEFAULT_OPTIONS, maxAge: MAX_JWT_AGE_SECONDS * 1000 }

module.exports = (router) => {
  router.get('/auth/signin', async (ctx, next) => {
    const state = generateUrlSafeBase64ByteString()
    const { codeVerifier, codeChallenge } = generateCodeVerifierAndChallenge()

    // These are re-geneated for every sign in attempt to avoid possibility of
    // reuse of stale tokens after a failed / previous login attempt
    ctx.cookies.set('auth.state', state, COOKIE_DEFAULT_OPTIONS)
    ctx.cookies.set('auth.codeVerifier', codeVerifier, COOKIE_DEFAULT_OPTIONS)

    const url = 'https://auth.frontierstore.net/auth?audience=frontier&scope=auth%20capi' +
      '&response_type=code' +
      `&client_id=${AUTH_CLIENT_ID}` +
      `&code_challenge=${codeChallenge}` +
      '&code_challenge_method=S256' +
      `&state=${state}` +
      `&redirect_uri=${AUTH_CALLBACK_URL}`

    ctx.redirect(url)
  })

  router.get('/auth/callback', async (ctx, next) => {
    const { code, state } = ctx.query
    const stateFromCookie = ctx.cookies.get('auth.state')
    const codeVerifier = ctx.cookies.get('auth.codeVerifier')

    try {
      if (stateFromCookie !== state) throw new Error('Callback state check failed')

      // Request tokens from fdev
      const response = await fetch('https://auth.frontierstore.net/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData({
          client_id: AUTH_CLIENT_ID,
          redirect_uri: AUTH_CALLBACK_URL,
          grant_type: 'authorization_code',
          code,
          code_verifier: codeVerifier
        })
      })
      const responsePayload = await response.json()

      if (!responsePayload?.token_type ||
        !responsePayload?.access_token ||
        !responsePayload?.expires_in ||
        !responsePayload?.refresh_token) {
        console.error('Frontier API returned unexpected response to Sign In request', responsePayload)
        throw new Error('Frontier API returned unexpected response to Sign In request')
      }

      // Create JWT to store tokens
      const jwt = createJwt({
        tokenType: responsePayload.token_type,
        accessToken: responsePayload.access_token,
        accessTokenExpires: new Date((secondsSinceEpoch() + responsePayload.expires_in) * 1000).toISOString(),
        refreshToken: responsePayload.refresh_token
      })

      ctx.cookies.set('auth.jwt', jwt, JWT_COOKIE_OPTIONS)

      ctx.redirect(AUTH_SIGNED_IN_URL)
    } catch (e) {
      ctx.redirect(`${AUTH_ERROR_URL}?error=${encodeURIComponent(e?.toString())}`)
    }
  })

  router.get('/auth/token', async (ctx, next) => {
    try {
      const jwtPayload = await verifyAndRefreshJwt(ctx)
      ctx.body = {
        accessToken: jwtPayload.accessToken,
        expires: jwtPayload.accessTokenExpires
      }
    } catch (e) {
      ctx.status = 400
      ctx.body = {
        error: 'Failed to get Frontier API Access Token',
        message: e?.toString()
      }
    }
  })

  // This is a really simple CSRF implementation, but this is very low stakes as
  // both the Ardent REST API and the Frontier REST API are read only and the
  // JWT is stored in an HTTP only cookie; this is only intended as simple
  // protection against being forceably signed out.
  router.get('/auth/csrftoken', async (ctx, next) => {
    let csrfToken = ctx.cookies.get('auth.csrfToken')
    if (!csrfToken) {
      csrfToken = generateUrlSafeBase64ByteString()
      ctx.cookies.set('auth.csrfToken', csrfToken, COOKIE_DEFAULT_OPTIONS)
    }
    ctx.body = { csrfToken }
  })

  router.post('/auth/signout', async (ctx, next) => {
    const { csrfToken } = ctx.request.body
    try {
      const csrfTokenFromCookie = ctx.cookies.get('auth.csrfToken')
      if (csrfToken !== csrfTokenFromCookie) throw new Error('CSRF token validation failed')
      // Matching options (other than expiry) are required for cookies to be unset
      ctx.cookies.set('auth.jwt', null, COOKIE_DEFAULT_OPTIONS)
      ctx.cookies.set('auth.state', null, COOKIE_DEFAULT_OPTIONS)
      ctx.cookies.set('auth.codeVerifier', null, COOKIE_DEFAULT_OPTIONS)
      ctx.cookies.set('auth.csrfToken', null, COOKIE_DEFAULT_OPTIONS)
      ctx.redirect(AUTH_SIGNED_OUT_URL)
    } catch (e) {
      ctx.redirect(`${AUTH_ERROR_URL}?error=${encodeURIComponent(e?.toString())}`)
    }
  })
}
