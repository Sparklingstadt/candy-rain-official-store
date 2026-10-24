import assert from "node:assert/strict"
import { after, test } from "node:test"
import { prisma } from "../../lib/prisma"
import { UserRepository } from "../../repositories/implementations/userRepository"
import { updateProfile, updateShippingAddress } from "../../services/accountService"

const fields = { firstName: true, lastName: true, postalCode: true, prefecture: true, addressLine1: true, addressLine2: true } as const
const original = await prisma.user.findMany({ where: { id: { in: [0, 1] } }, select: { id: true, ...fields } })

after(async () => {
  await prisma.$transaction(original.map(({ id, ...data }) => prisma.user.update({ where: { id }, data })))
  await prisma.$disconnect()
})

test("氏名とお届け先はサインイン中のユーザーだけを更新する", async () => {
  const repo = new UserRepository()
  const other = await prisma.user.findUniqueOrThrow({ where: { id: 1 }, select: fields })

  await updateProfile(repo, 0, { firstName: "Hanako", lastName: "Sato" })
  await updateShippingAddress(repo, 0, { postalCode: "123-4567", prefecture: "大阪府", addressLine1: "キャンディ市1-2-3", addressLine2: null })

  const user = await repo.findByUserId(0)
  assert.equal(user?.firstName, "Hanako")
  assert.equal(user?.lastName, "Sato")
  assert.equal(user?.postalCode, "123-4567")
  assert.equal(user?.prefecture, "大阪府")
  assert.equal(user?.addressLine1, "キャンディ市1-2-3")
  assert.equal(user?.addressLine2, null)
  assert.deepEqual(await prisma.user.findUniqueOrThrow({ where: { id: 1 }, select: fields }), other)
})

test("ユーザー取得はパスワードハッシュを返さない", async () => {
  const user = await new UserRepository().findByUserId(0)
  assert.ok(user)
  assert.equal("passwordHash" in user, false)
})
