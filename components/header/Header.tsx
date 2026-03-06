'use client'

import XeuronLogoLong from '@/images/XeuronLogoLong.png'
import XeuronLogoOnly from '@/images/XeuronLogoOnly.png'
import { useUser } from '@/lib/supabase/auth-context'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { ChevronLeftIcon, MenuIcon, UserCircle2 } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useSidebar } from '../ui/sidebar'
import { Button } from '../ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar'
import { toPublicImageUrl } from '@/lib/image'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '../ui/popover'

function Header() {
  const { toggleSidebar, open, isMobile } = useSidebar()
  const { user, isLoading } = useUser()
  const router = useRouter()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <header className="flex items-center justify-between border-b border-gray-200 p-4">
      <div className="flex items-center gap-2">
        {open && !isMobile ? (
          <ChevronLeftIcon onClick={toggleSidebar} />
        ) : (
          <div className="flex items-center gap-2">
            <MenuIcon
              className="h-6 w-6"
              onClick={toggleSidebar}
            />
            <Image
              src={XeuronLogoLong}
              alt="Xeuron"
              width={140}
              height={140}
              className="hidden md:block"
            />
            <Image
              src={XeuronLogoOnly}
              alt="Xeuron"
              width={40}
              height={40}
              className="block md:hidden"
            />
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        {!isLoading && user && (
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-2 rounded-full px-1 ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage
                    src={user.imageUrl ? toPublicImageUrl(user.imageUrl) : undefined}
                    alt={user.username}
                  />
                  <AvatarFallback>
                    <UserCircle2 className="h-6 w-6 text-muted-foreground" />
                  </AvatarFallback>
                </Avatar>
                <span className="hidden text-sm font-medium sm:block">
                  {user.username?.slice(0, 1).toUpperCase()}
                </span>
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-52 p-2" align="end">
              <div className="mb-2 px-2 py-1 text-sm font-medium">{user.username}</div>
              <Link
                href="/settings/profile"
                className="flex w-full items-center rounded-sm px-2 py-1.5 text-sm hover:bg-muted"
              >
                Edit Profile
              </Link>
              <div className="my-1 border-t border-border" />
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start"
                onClick={handleSignOut}
              >
                Sign out
              </Button>
            </PopoverContent>
          </Popover>
        )}
        {!isLoading && !user && (
          <div className="rounded-sm border border-red-500 bg-red-500 p-1 text-white">
            <Link href="/login" className="text-md **:text-white">
              Sign in
            </Link>
          </div>
        )}
      </div>
    </header>
  )
}

export default Header
