
const QRCode = require('qrcode')

class QrService {
  async toDataUrl(payload) {
    return QRCode.toDataURL(payload, { margin: 2, width: 900 })
  }

  buildReviewUrl({ baseUrl, campaignId }) {
    const appUrl = process.env.PUBLIC_APP_URL || baseUrl || 'https://example.com'
    return `${appUrl.replace(/\/$/,'')}/review/${campaignId}`
  }
}

module.exports = QrService
