import { expect, test } from "@playwright/test";

import { login, serviceRoleClient } from "./helpers";

test("cadastrar cliente", async ({ page }) => {
  const name = `Cliente E2E ${Date.now()}`;

  await login(page);
  await page.goto("/clientes/novo");

  await page.getByLabel("Razão social *").fill(name);
  await page.getByRole("button", { name: "Cadastrar cliente" }).click();

  await page.waitForURL("**/clientes");
  // Duas visões (cards mobile + tabela desktop) ficam no DOM ao mesmo tempo,
  // alternadas por CSS (item 21) — pega o primeiro link em vez de ambíguo.
  await expect(page.getByRole("link", { name }).first()).toBeVisible();

  const supabase = serviceRoleClient();
  const { error } = await supabase.from("clients").delete().eq("name", name);
  if (error) throw error;
});
