import type { CandyTone } from "@/lib/candy"

// Mirrors the SalesType enum in prisma/schema.prisma. Kept free of Prisma imports so client components can use it.
export const salesTypes = ["PRE_SALE", "MADE_TO_ORDER", "POST_EVENT", "PERMANENT"] as const
export type SalesType = (typeof salesTypes)[number]

export const salesTypeMeta: Record<SalesType, { label: string; slug: string; tone: CandyTone }> = {
  PRE_SALE: { label: "事前販売", slug: "pre-sale", tone: "pink" },
  MADE_TO_ORDER: { label: "受注販売", slug: "made-to-order", tone: "mint" },
  POST_EVENT: { label: "事後通販", slug: "post-event", tone: "lemon" },
  PERMANENT: { label: "常設", slug: "permanent", tone: "lavender" },
}

// Resolves the ?type= query value; anything unknown means "no filter".
export function parseSalesTypeSlug(slug: string | string[] | undefined): SalesType | null {
  if (typeof slug !== "string") return null
  return salesTypes.find(type => salesTypeMeta[type].slug === slug) ?? null
}
