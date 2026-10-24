import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

type ControlProps = { id: string, name: string, "aria-invalid"?: true, "aria-describedby"?: string }

// Label + control + error message; the control receives the ids that tie them together.
export default function FormField({ name, label, error, optional, className, children }: {
  name: string
  label: string
  error?: string
  optional?: boolean
  className?: string
  children: (props: ControlProps) => React.ReactNode
}) {
  const id = `field-${name}`
  const errorId = `${id}-error`
  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={id}>{label}{optional && <span className="text-xs font-normal text-muted-foreground">任意</span>}</Label>
      {children({ id, name, "aria-invalid": error ? true : undefined, "aria-describedby": error ? errorId : undefined })}
      {error && <p id={errorId} className="text-sm text-destructive">{error}</p>}
    </div>
  )
}
