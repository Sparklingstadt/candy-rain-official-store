import type { User } from "@/repositories/entities/User"

export function hasShippingAddress(user: User | null): user is User & { postalCode: string, prefecture: string, addressLine1: string } {
  return Boolean(user?.postalCode && user.prefecture && user.addressLine1)
}

export default function ShippingAddress({ user }: { user: User | null }) {
  if (!hasShippingAddress(user)) {
    return <p className="text-muted-foreground">お届け先はまだ登録されていません。</p>
  }
  return (
    <address className="space-y-1 not-italic leading-6">
      <p className="font-medium">{user.firstName} {user.lastName}</p>
      <p className="text-muted-foreground">〒{user.postalCode}</p>
      <p className="text-muted-foreground">{user.prefecture} {user.addressLine1}</p>
      {user.addressLine2 && <p className="text-muted-foreground">{user.addressLine2}</p>}
    </address>
  )
}
