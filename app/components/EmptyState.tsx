import { candyToneClasses, type CandyTone } from "@/lib/candy"
import { cn } from "@/lib/utils"

export default function EmptyState({ icon, title, description, tone = "mint", children }: {
  icon: React.ReactNode
  title: string
  description?: string
  tone?: CandyTone
  children?: React.ReactNode
}) {
  const classes = candyToneClasses[tone]
  return (
    <div className="flex flex-col items-center gap-4 border bg-card px-6 py-14 text-center">
      <div aria-hidden="true" className="relative mb-2">
        <span className={cn("flex size-20 items-center justify-center [&>svg]:size-8", classes.surface, classes.text)}>{icon}</span>
        <span className="absolute -left-3 top-1 size-3 bg-candy-pink-strong" />
        <span className="absolute -right-2 -top-1 size-2.5 bg-candy-lemon-strong" />
        <span className="absolute -right-3 bottom-1 size-3 bg-candy-lavender-strong" />
      </div>
      <p className="text-xl font-semibold">{title}</p>
      {description && <p className="max-w-md text-sm leading-6 text-muted-foreground">{description}</p>}
      {children && <div className="mt-2 flex flex-wrap justify-center gap-3">{children}</div>}
    </div>
  )
}
