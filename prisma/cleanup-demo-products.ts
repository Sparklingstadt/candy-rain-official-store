import { prisma } from "@/lib/prisma"
import { deleteUnorderedProducts, findDemoProducts } from "@/services/admin/demoProductCleanup"

// Lists (default) or deletes (--apply) products registered through the admin screens that were never ordered,
// so the public demo can register products again once it reaches the product limit.
const apply = process.argv.includes("--apply")

// Shows where the script points without printing credentials.
function describeDatabase(url: string | undefined) {
  if (!url) return "(DATABASE_URL が未設定です)"
  try {
    const parsed = new URL(url)
    return `${parsed.hostname}:${parsed.port || "5432"}${parsed.pathname}`
  } catch {
    return "(DATABASE_URL を解析できません)"
  }
}

async function main() {
  console.log(`接続先: ${describeDatabase(process.env.DATABASE_URL)}`)
  const products = await findDemoProducts()
  const deletable = products.filter(product => !product.hasOrders)
  const kept = products.filter(product => product.hasOrders)

  console.log(`削除対象（注文のない登録商品）: ${deletable.length} 件`)
  for (const product of deletable) console.log(`  #${product.id} ${product.name}`)
  console.log(`残す商品（注文履歴があるため）: ${kept.length} 件`)

  if (!apply) {
    console.log("確認のみです。削除するには --apply を付けて実行してください。")
    return
  }
  const deleted = await deleteUnorderedProducts(deletable.map(product => product.id))
  console.log(`${deleted.length} 件の商品を削除しました。`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => prisma.$disconnect())
