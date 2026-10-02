// From satnaing/shadcn-admin@e16c87f (MIT). See app/web/THIRD-PARTY-NOTICES.md.
import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
