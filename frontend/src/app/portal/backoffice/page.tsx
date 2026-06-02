import { redirect } from 'next/navigation'

export default function PortalBackofficeRedirectPage() {
  redirect('/?app=1&view=dashboard')
}
