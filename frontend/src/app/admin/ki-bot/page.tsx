import { AdminAiAssistant } from '@/components/admin/AdminAiAssistant'

export const metadata = { title: 'KI Assistent · MMOS' }

export default function Page() {
  const apiBase = (process.env.NEXT_PUBLIC_BACKEND_URL || '').replace(/\/+$/, '')
  return <AdminAiAssistant apiBase={apiBase} />
}
