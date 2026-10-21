import { Minus, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type StepButtonProps = Omit<React.ComponentProps<typeof Button>, "children" | "variant" | "size">

// Shared -/value/+ control; callers decide whether the buttons submit a form or update local state.
export default function QuantityStepper({ value, decrementProps, incrementProps, className, ...props }: React.ComponentProps<"div"> & {
  value: number
  decrementProps: StepButtonProps
  incrementProps: StepButtonProps
}) {
  return (
    <div className={cn("flex w-fit items-center border bg-background p-0.5", className)} {...props}>
      <Button variant="ghost" size="icon-sm" {...decrementProps}>
        <Minus />
        <span className="sr-only">数量を減らす</span>
      </Button>
      <p aria-live="polite" className="flex h-7 w-9 items-center justify-center text-sm font-medium">{value}</p>
      <Button variant="ghost" size="icon-sm" {...incrementProps}>
        <Plus />
        <span className="sr-only">数量を増やす</span>
      </Button>
    </div>
  )
}
