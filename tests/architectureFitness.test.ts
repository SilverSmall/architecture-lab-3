import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { checkArchitecture } from "../scripts/check-architecture.mjs";

const checkerPath = path.resolve("scripts/check-architecture.mjs");

async function withSourceTree(files: Record<string, string>, run: (root: string) => Promise<void>) {
  const root = await mkdtemp(path.join(os.tmpdir(), "architecture-check-"));
  try {
    for (const [relative, contents] of Object.entries(files)) {
      const destination = path.join(root, relative);
      await mkdir(path.dirname(destination), { recursive: true });
      await writeFile(destination, contents, "utf8");
    }
    await run(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

test("architecture check accepts a clean multi-module source tree", async () => {
  await withSourceTree({
    "src/payments/contracts.ts": "export type Status = string;\n",
    "src/payments/internal/adapter.ts": "export const adapter = true;\n",
    "src/payments/index.ts": 'import "./internal/adapter.ts";\nimport "./contracts.ts";\n',
    "src/orders/service.ts": 'import "../payments/contracts.ts";\n',
  }, async (root) => {
    assert.deepEqual(await checkArchitecture(root), []);
  });
});

test("architecture check detects a cross-module internal import", async () => {
  await withSourceTree({
    "src/payments/internal/secret.ts": "export const secret = true;\n",
    "src/orders/service.ts": 'import "../payments/internal/secret.ts";\n',
  }, async (root) => {
    const errors = await checkArchitecture(root);
    assert.ok(errors.some((error) => error.includes("internal file")));
  });
});

test("architecture check detects direct stock writes in Orders and Checkout", async () => {
  await withSourceTree({
    "src/orders/service.ts": 'database.stock.set("book", row);\n',
    "src/checkout/controller.ts": 'database.stock.delete("book");\n',
  }, async (root) => {
    const errors = await checkArchitecture(root);
    assert.equal(errors.filter((error) => error.includes("writes Inventory storage")).length, 2);
  });
});

test("architecture check detects local import cycles across modules", async () => {
  await withSourceTree({
    "src/orders/service.ts": 'import "../payments/handler.ts";\n',
    "src/payments/handler.ts": 'import "../orders/service.ts";\n',
  }, async (root) => {
    const errors = await checkArchitecture(root);
    assert.ok(errors.some((error) => error.includes("Local import cycle")));
  });
});

test("architecture CLI exits nonzero and explains an injected violation", async () => {
  await withSourceTree({
    "src/orders/service.ts": 'database.stock.set("book", row);\n',
  }, async (root) => {
    const result = spawnSync(process.execPath, [checkerPath], {
      cwd: root,
      encoding: "utf8",
    });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Orders\/Checkout writes Inventory storage directly/);
  });
});
