import '@/app/globals.css'
import Header from '@/components/header/Header'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/app-sidebar'
import { AuthProvider } from '@/lib/supabase/auth-context'

export default function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <AuthProvider>
      <SidebarProvider>
        <AppSidebar />

        <SidebarInset>
          <Header />
          <div className="flex flex-col"> {children}</div>
        </SidebarInset>
          </SidebarProvider>
        </AuthProvider>
  )
}
