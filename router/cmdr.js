const { verifyAndRefreshJwt } = require('../lib/jwt')

const { FRONTIER_API_BASE_URL } = require('../lib/consts')

module.exports = (router) => {
  // The root endpoint lists all the other endpoints supported by Frontier's API
  router.get('/auth/cmdr', async (ctx, next) => {
    try {
      const jwtPayload = await verifyAndRefreshJwt(ctx)
      const response = await fetch(FRONTIER_API_BASE_URL, {
        headers: { Authorization: `${jwtPayload.tokenType} ${jwtPayload.accessToken}` }
      })
      ctx.body = await response.json()
    } catch (e) {
      ctx.status = 500
      ctx.body = {
        error: 'Frontier API request failed',
        message: e?.toString()
      }
    }
  })

  // TODO May explicitly list supported endpoints allowed in future, but
  // for now will allow requests with any valid token to be passed
  router.get('/auth/cmdr/:endpoint', async (ctx, next) => {
    try {
      const jwtPayload = await verifyAndRefreshJwt(ctx)
      const { endpoint } = ctx.params
      const response = await fetch(`${FRONTIER_API_BASE_URL}/${endpoint}`, {
        headers: { Authorization: `${jwtPayload.tokenType} ${jwtPayload.accessToken}` }
      })
      if (endpoint === 'journal') {
        ctx.body = await response.text()
      } else if (endpoint === 'visitedstars') {
        ctx.body = await response.blob()
      } else {
        ctx.body = await response.json()
      }
    } catch (e) {
      ctx.status = 500
      ctx.body = {
        error: 'Frontier API request failed',
        message: e?.toString()
      }
    }
  })

  router.get('/auth/cmdr/journal/:year/:month/:day', async (ctx, next) => {
    try {
      const jwtPayload = await verifyAndRefreshJwt(ctx)
      const { year, month, day } = ctx.params
      const response = await fetch(`${FRONTIER_API_BASE_URL}/journal/${year}/${month}/${day}`, {
        headers: { Authorization: `${jwtPayload.tokenType} ${jwtPayload.accessToken}` }
      })
      ctx.body = await response.text()
    } catch (e) {
      ctx.status = 500
      ctx.body = {
        error: 'Frontier API request failed',
        message: e?.toString()
      }
    }
  })
}
