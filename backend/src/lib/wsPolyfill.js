// WebSocket-Polyfill fuer Node < 22.
//
// @supabase/supabase-js (>=2.106) initialisiert beim createClient() einen
// Realtime-Client, der ein globales WebSocket erwartet. Node hat natives
// WebSocket erst ab v22 — auf Node 20 wirft createClient sonst:
//   "Node.js 20 detected without native WebSocket support."
// Dieses Modul stellt globalThis.WebSocket aus dem 'ws'-Paket bereit, falls
// es fehlt. MUSS vor dem ersten createClient geladen werden.
if (typeof globalThis.WebSocket === 'undefined') {
  try {
    globalThis.WebSocket = require('ws')
  } catch (_) {
    // 'ws' nicht installiert -> auf nativem WebSocket (Node 22+) verlassen.
  }
}

module.exports = {}
