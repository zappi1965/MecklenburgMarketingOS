import { redirect } from 'next/navigation'

export default function AdminRedirectPage() {
  redirect('/?app=1&view=dashboard')
}
