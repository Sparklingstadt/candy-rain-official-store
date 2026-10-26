import assert from "node:assert/strict"
import { test } from "node:test"
import { tokyoPeriodStarts } from "./tokyoTime"

test("日本時間の日中は、その日の 0:00 とその月の 1 日 0:00 を返す", () => {
  assert.deepEqual(tokyoPeriodStarts(new Date("2026-10-26T03:00:00Z")), {
    dayStart: new Date("2026-10-25T15:00:00Z"),
    monthStart: new Date("2026-09-30T15:00:00Z"),
  })
})

test("UTC ではまだ前日でも、日本時間の翌日として扱う", () => {
  assert.deepEqual(tokyoPeriodStarts(new Date("2026-10-31T15:30:00Z")), {
    dayStart: new Date("2026-10-31T15:00:00Z"),
    monthStart: new Date("2026-10-31T15:00:00Z"),
  })
})

test("年末から年始への切り替わり", () => {
  assert.deepEqual(tokyoPeriodStarts(new Date("2026-12-31T15:00:00Z")), {
    dayStart: new Date("2026-12-31T15:00:00Z"),
    monthStart: new Date("2026-12-31T15:00:00Z"),
  })
})

test("日本時間の 0:00 ちょうどの直前は前日", () => {
  assert.deepEqual(tokyoPeriodStarts(new Date("2026-10-25T14:59:59Z")).dayStart, new Date("2026-10-24T15:00:00Z"))
})
