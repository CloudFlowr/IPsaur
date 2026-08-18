import { assertEquals } from "std/assert";
import { delay } from "std/async/delay";
import { isRateLimited } from "./rate_limiter.ts";

Deno.test("Should accept a single attempt", () => {
  assertEquals(isRateLimited("aaa"), false);
});

Deno.test("Should fail on the second immediate attempt", () => {
  assertEquals(isRateLimited("bbb"), false);
  assertEquals(isRateLimited("bbb"), true);
});

Deno.test("Should not fail on the second attempt after the default threshold (1000ms)", async () => {
  assertEquals(isRateLimited("ccc"), false);
  await delay(1001);
  assertEquals(isRateLimited("ccc"), false);
});

Deno.test("Should not fail on the second attempt if threshold is set to 0", () => {
  assertEquals(isRateLimited("ddd"), false);
  assertEquals(isRateLimited("ddd", 0), false);
});
