import { candyToneClasses, type CandyTone } from "@/lib/candy"
import { cn } from "@/lib/utils"

export default function CandyPill({ tone = "pink", className, children }: {
  tone?: CandyTone
  className?: string
  children: React.ReactNode
}) {
  const classes = candyToneClasses[tone]
  return (
    <span className={cn("inline-flex w-fit items-center gap-1.5 px-2.5 py-1 text-xs font-medium", classes.surface, classes.text, className)}>
      <span aria-hidden="true" className={cn("size-1.5", classes.strong)} />
      {children}
    </span>
  )
}
