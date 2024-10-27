const { secondsSinceEpoch } = require('./utils/auth')
const { authDb } = require('./db')
const { rotateTokens } = require('./cmdr')

// Frontier OAuth Access Tokens are actually valid for 4 hours at a time
// but we refresh them pre-expire, before they actually expire, to avoid
// ever making API calls with an already expired token.
const TOKEN_MAX_EXPIRY_BEFORE_REFRESH_SECONDS = 60 * 60 // Update tokens that expire within the next hour

const selectTokensByExpiry = authDb.prepare('SELECT cmdrId,expiresAt FROM cmdrs WHERE expiresAt < @expiresAt ORDER BY expiresAt')
const deleteInvalidTokens = authDb.prepare('DELETE FROM cmdrs WHERE cmdrId = @cmdrId')

// Rotating tokens in this way allows users to sign to the site in from multiple devices
// (something the FDev API doesn't seem to allow) and supports mechanics like sending
// opt-in alerts to users in response to system status changes or market trades.
async function rotateAccessTokens (cmdrId) {
  const expiresAt = new Date((secondsSinceEpoch() + TOKEN_MAX_EXPIRY_BEFORE_REFRESH_SECONDS) * 1000).toISOString()
  const tokens = selectTokensByExpiry.all({ expiresAt })
  for (const { cmdrId } of tokens) {
    try {
      await rotateTokens(cmdrId)
    } catch (e) {
      deleteInvalidTokens.run({ cmdrId })
      console.error(`Unable to rotate tokens for cmdrId '${cmdrId}', tokens deleted`)
    }
  }
}

module.exports = {
  rotateAccessTokens
}
