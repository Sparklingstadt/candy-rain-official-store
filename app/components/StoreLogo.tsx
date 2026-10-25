// compact hides the wordmark below the sm breakpoint so the mark alone fits in narrow headers.
export default function StoreLogo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="flex items-center gap-2.5 font-semibold tracking-tight">
      <span aria-hidden="true" className="relative size-9 bg-primary">
        <span className="absolute left-[10px] top-[11px] size-2 bg-primary-foreground" />
        <span className="absolute left-5 top-[9px] size-1.5 bg-candy-pink" />
        <span className="absolute left-[17px] top-[19px] size-[7px] bg-candy-lemon" />
      </span>
      <span className={compact ? "sr-only sm:not-sr-only" : undefined}>Candy Rain Store</span>
    </span>
  )
}
