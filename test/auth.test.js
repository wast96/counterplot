import test from "node:test";
import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";

if (!globalThis.crypto) globalThis.crypto = webcrypto;

const { hashPassword, normalizeEmail, validatePassword, verifyPassword } = await import("../functions/_lib/auth.js");

test("email addresses are normalized and invalid addresses are rejected", () => {
  assert.equal(normalizeEmail("  Writer@Example.COM "), "writer@example.com");
  assert.equal(normalizeEmail("not-an-email"), "");
  assert.equal(normalizeEmail("two words@example.com"), "");
});

test("password validation requires a substantial passphrase", () => {
  assert.match(validatePassword("too-short"), /12/);
  assert.equal(validatePassword("a useful long passphrase"), "");
});

test("password verification accepts only the original password and pepper", async () => {
  const derived = await hashPassword("correct horse battery staple", undefined, 1_000, "test-pepper");
  const user = {
    password_hash: derived.hash,
    password_salt: derived.salt,
    password_iterations: derived.iterations
  };
  assert.equal(await verifyPassword("correct horse battery staple", user, "test-pepper"), true);
  assert.equal(await verifyPassword("incorrect horse battery staple", user, "test-pepper"), false);
  assert.equal(await verifyPassword("correct horse battery staple", user, "wrong-pepper"), false);
});


test("production password derivation fits Cloudflare's native iteration limit", async () => {
  const result = await hashPassword("a strong production passphrase", undefined, undefined, "separate-server-pepper");
  assert.equal(result.iterations, 100_000);
  assert.equal(await verifyPassword("a strong production passphrase", {
    password_hash: result.hash, password_salt: result.salt, password_iterations: result.iterations
  }, "separate-server-pepper"), true);
});
