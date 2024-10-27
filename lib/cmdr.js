const { updateDb, insertOrReplaceIntoDb } = require('./utils/sql')
const { secondsSinceEpoch } = require('./utils/auth')
const { authDb } = require('./db')
const { AUTH_CLIENT_ID } = require('./consts')
const formData = require('./form-data')

const selectCmdrById = authDb.prepare('SELECT * FROM cmdrs WHERE cmdrId = @cmdrId')

function getAccessToken (cmdrId) {
  const cmdr = selectCmdrById.get({ cmdrId })
  return cmdr?.accessToken
}

async function rotateTokens (cmdrId) {
  const cmdr = selectCmdrById.get({ cmdrId })
  if (!cmdr) throw new Error('Could not find Access Token or Refresh token for account')

  const response = await fetch('https://auth.frontierstore.net/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: formData({
      client_id: AUTH_CLIENT_ID,
      grant_type: 'refresh_token',
      refresh_token: cmdr.refreshToken
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
      throw new Error(`Error response returned by Frontier API while refreshing Access Token: ${responsePayload?.error} :: ${responsePayload?.error_description}`)
    }
  } else if (!responsePayload.token_type) {
    console.error('Unexpected response returned by Frontier API while refreshing Access Token', responsePayload)
    throw new Error('Unexpected response returned by Frontier API while refreshing Access Token')
  }

  const accessToken = responsePayload.access_token
  const refreshToken = responsePayload.refresh_token
  const expiresAt = new Date((secondsSinceEpoch() + responsePayload.expires_in) * 1000).toISOString()

  saveTokens(cmdr.cmdrId, accessToken, refreshToken, expiresAt)

  return true
}

function saveTokens (cmdrId, accessToken, refreshToken, expiresAt) {
  const timestamp = new Date().toISOString()
  const cmdrData = {
    cmdrId,
    accessToken,
    refreshToken,
    expiresAt,
    updatedAt: timestamp
  }
  if (selectCmdrById.get({ cmdrId })) {
    // Update existing token, preserving any existing data (e.g. createdAt)
    updateDb(authDb, 'cmdrs', cmdrData, 'cmdrId = @cmdrId')
  } else {
    // Insert new row (or overwrite, in case of race condition)
    cmdrData.createdAt = timestamp
    insertOrReplaceIntoDb(authDb, 'cmdrs', cmdrData)
  }
}

module.exports = {
  getAccessToken,
  rotateTokens,
  saveTokens
}
