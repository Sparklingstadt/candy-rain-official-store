export type ProductView = "card" | "list"

// The admin product list shows cards unless ?view=list is given; the choice is not remembered.
export function parseProductView(value: string | string[] | undefined): ProductView {
  return value === "list" ? "list" : "card"
}
