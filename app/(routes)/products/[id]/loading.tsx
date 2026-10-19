import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div className="grid gap-10 lg:grid-cols-[1.2fr_.8fr] lg:gap-12">
      <Skeleton className="aspect-square rounded-[1.75rem]" />
      <div className="space-y-4 rounded-[1.75rem] border bg-card p-6 sm:p-8"><Skeleton className="h-6 w-24" /><Skeleton className="h-12 w-3/4" /><Skeleton className="h-8 w-32" /><Skeleton className="h-28 w-full" /></div>
    </div>
  )
}
