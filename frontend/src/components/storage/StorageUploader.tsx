
'use client'

import { useEffect, useRef, useState } from 'react'
import { API_BASE } from '@/lib/supabase'

export default function StorageUploader({
  customerId,
  fileType = 'documents',
  refTable,
  refId,
  title = 'Datei hochladen'
}: any) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [drag, setDrag] = useState(false)
  const [busy, setBusy] = useState(false)
  const [preview, setPreview] = useState<any>(null)
  const [message, setMessage] = useState('')
  const [files, setFiles] = useState<any[]>([])

  async function loadFiles() {
    if (!customerId) return
    const res = await fetch(`${API_BASE}/api/storage/customer/${customerId}`)
    const json = await res.json()
    if (json.ok) setFiles(json.data || [])
  }

  useEffect(() => {
    loadFiles()
  }, [customerId])

  async function upload(file: File) {
    if (!file) return

    setPreview({
      name: file.name,
      type: file.type,
      size: file.size,
      localUrl: URL.createObjectURL(file)
    })

    const fd = new FormData()
    fd.append('file', file)
    fd.append('customer_id', customerId)
    fd.append('file_type', fileType)
    if (refTable) fd.append('ref_table', refTable)
    if (refId) fd.append('ref_id', refId)

    setBusy(true)
    try {
      const res = await fetch(`${API_BASE}/api/storage/upload`, {
        method: 'POST',
        body: fd
      })

      const json = await res.json()
      if (!json.ok) throw new Error(json.error || 'Upload fehlgeschlagen')

      await loadFiles()
    } catch (error: any) {
      setMessage(error.message || 'Upload fehlgeschlagen')
    } finally {
      setBusy(false)
    }
  }

  async function openSigned(file: any) {
    const res = await fetch(`${API_BASE}/api/storage/signed-url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bucket: file.bucket, storage_path: file.storage_path, expires_in: 3600 })
    })
    const json = await res.json()
    if (json.ok) window.open(json.data.signedUrl, '_blank')
  }

  return (
    <div className="storageGrid">
      <div
        className={`card ${drag ? 'activeDrop' : ''}`}
        style={{ borderStyle: 'dashed' }}
        onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDrag(false)
          const file = e.dataTransfer.files?.[0]
          if (file) upload(file)
        }}
      >
        <h2>{title}</h2>
        <p className="sub">
          Drag & Drop für PDFs, Verträge, Rechnungen, Bilder, Word/Keynote und Media Assets.
        </p>

        <input
          ref={inputRef}
          type="file"
          style={{ display: 'none' }}
          onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
        />

        <button className="btn" disabled={busy} onClick={() => inputRef.current?.click()}>
          {busy ? 'Lädt hoch...' : 'Datei auswählen'}
        </button>

        {message && <div className="sub" role="status">{message}</div>}
        {preview && (
          <div className="previewBox">
            <b>{preview.name}</b>
            <div className="sub">{preview.type || 'Datei'} · {Math.round(preview.size / 1024)} KB</div>

            {preview.type === 'application/pdf' && (
              <iframe src={preview.localUrl} className="filePreview" />
            )}

            {preview.type?.startsWith('image/') && (
              <img src={preview.localUrl} className="imagePreview" />
            )}
          </div>
        )}
      </div>

      <div className="card">
        <h2>Gespeicherte Dateien</h2>
        {files.length === 0 && <div className="sub">Noch keine Dateien gespeichert.</div>}
        {files.map((file) => (
          <div className="item" key={file.id}>
            <div>
              <b>{file.name}</b>
              <div className="sub">
                {file.file_type} · Version {file.version || 1} · {file.mime_type || 'Datei'}
              </div>
              <div className="sub">{file.storage_path}</div>
            </div>
            <button className="btn secondary" onClick={() => openSigned(file)}>
              Öffnen
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
