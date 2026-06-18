// MCP Client Service — Model Context Protocol über HTTP-Transport
//
// Verbindet den MMOS-Agent mit externen MCP-Servern (Claude Skills, Community-Tools, etc.)
//
// Konfiguration via Umgebungsvariable:
//   MCP_SERVERS=name1:http://host1:3000,name2:http://host2:3001
//
// Bekannte nutzbare MCP-Server:
//   - @modelcontextprotocol/server-filesystem  → lokales Dateisystem
//   - @modelcontextprotocol/server-github       → GitHub API
//   - Anthropic MCP-kompatible Server
//   - Jeder MCP 2024-11-05 kompatible HTTP-Server

const MCP_TIMEOUT_MS = 15_000
const MCP_PROTOCOL_VERSION = '2024-11-05'

// Parst MCP_SERVERS=name1:url1,name2:http://host:port
function parseServers() {
  const raw = process.env.MCP_SERVERS || ''
  if (!raw.trim()) return []

  return raw.split(',').map(entry => {
    const firstColon = entry.trim().indexOf(':')
    if (firstColon < 1) return null
    const name = entry.slice(0, firstColon).trim()
    const url  = entry.slice(firstColon + 1).trim()
    if (!name || !url.startsWith('http')) return null
    return { name, url }
  }).filter(Boolean)
}

// JSON-RPC 2.0 POST an MCP-Server (HTTP oder SSE-Transport)
async function sendRpc(serverUrl, method, params = {}) {
  const body = { jsonrpc: '2.0', id: String(Date.now()), method, params }

  let res
  try {
    res = await fetch(serverUrl, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json, text/event-stream' },
      body:    JSON.stringify(body),
      signal:  AbortSignal.timeout(MCP_TIMEOUT_MS)
    })
  } catch (e) {
    throw new Error(`MCP Verbindungsfehler (${serverUrl}): ${e.message}`)
  }

  if (!res.ok) throw new Error(`MCP HTTP ${res.status} bei ${method}`)

  const ct = res.headers.get('content-type') || ''

  // SSE-Transport: der Server streamt Events
  if (ct.includes('text/event-stream')) {
    const text = await res.text()
    for (const line of text.split('\n')) {
      if (!line.startsWith('data: ')) continue
      try {
        const d = JSON.parse(line.slice(6))
        if (d.result !== undefined) return d.result
        if (d.error)  throw new Error(d.error.message || JSON.stringify(d.error))
      } catch (e) {
        if (e.message !== 'Unexpected token') throw e
      }
    }
    throw new Error(`Kein Ergebnis in SSE-Antwort (${method})`)
  }

  // Standard HTTP-Transport
  const data = await res.json()
  if (data.error) throw new Error(data.error.message || JSON.stringify(data.error))
  return data.result
}

// MCP Handshake — muss vor tools/list aufgerufen werden
async function initServer(serverUrl) {
  return sendRpc(serverUrl, 'initialize', {
    protocolVersion: MCP_PROTOCOL_VERSION,
    capabilities:    {},
    clientInfo:      { name: 'mmos-agent', version: '1.0.0' }
  })
}

// Tool-Liste eines MCP-Servers laden
async function listServerTools(serverUrl) {
  const result = await sendRpc(serverUrl, 'tools/list', {})
  return result?.tools || []
}

// Tool auf MCP-Server aufrufen
async function callTool(serverUrl, toolName, args) {
  const result = await sendRpc(serverUrl, 'tools/call', {
    name:      toolName,
    arguments: args || {}
  })

  // MCP liefert content-Array zurück
  const content = result?.content || []
  if (!content.length) return '(kein Ergebnis vom MCP-Server)'

  return content.map(c => {
    if (c.type === 'text')  return c.text
    if (c.type === 'image') return `[Bild: ${c.mimeType || 'image'}]`
    return JSON.stringify(c)
  }).join('\n')
}

// Alle konfigurierten MCP-Server entdecken und Tool-Liste aufbauen
// Gibt zurück: { tools: [...], endpointMap: Map<toolId, { serverUrl, mcpName }> }
async function discoverTools() {
  const servers = parseServers()
  if (!servers.length) return { tools: [], endpointMap: new Map() }

  const allTools    = []
  const endpointMap = new Map()

  await Promise.all(servers.map(async (server) => {
    try {
      await initServer(server.url)
      const tools = await listServerTools(server.url)

      for (const t of tools) {
        // Tool-ID: mcp__servername__toolname (Doppelunterstrich als Trennzeichen)
        const toolId = `mcp__${server.name}__${t.name}`
        allTools.push({
          name:        toolId,
          description: `[${server.name}] ${t.description || t.name}`,
          input_schema: t.inputSchema || { type: 'object', properties: {}, required: [] }
        })
        endpointMap.set(toolId, { serverUrl: server.url, mcpName: t.name })
      }

      console.log(`MCP: ${server.name} — ${tools.length} Tools geladen`)
    } catch (e) {
      console.warn(`MCP: Server "${server.name}" (${server.url}) nicht erreichbar: ${e.message}`)
    }
  }))

  return { tools: allTools, endpointMap }
}

// Verfügbare Server-Infos (für Admin-UI)
async function getServerStatus() {
  const servers = parseServers()
  return Promise.all(servers.map(async (server) => {
    try {
      const info = await initServer(server.url)
      const tools = await listServerTools(server.url)
      return {
        name:     server.name,
        url:      server.url,
        status:   'connected',
        version:  info?.serverInfo?.version || '?',
        toolCount: tools.length,
        tools:    tools.map(t => ({ name: t.name, description: t.description }))
      }
    } catch (e) {
      return { name: server.name, url: server.url, status: 'error', error: e.message, toolCount: 0, tools: [] }
    }
  }))
}

module.exports = { discoverTools, callTool, getServerStatus }
