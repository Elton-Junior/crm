import { expect, test } from "@playwright/test";

import { login, serviceRoleClient } from "./helpers";

test("cadastrar cliente", async ({ page }) => {
  const name = `Cliente E2E ${Date.now()}`;

  await login(page);
  await page.goto("/clientes/novo");

  await page.getByLabel("Razão social *").fill(name);
  await page.getByRole("button", { name: "Cadastrar cliente" }).click();

  await page.waitForURL("**/clientes");
  await expect(page.getByText(name)).toBeVisible();

  const supabase = serviceRoleClient();
  const { error } = await supabase.from("clients").delete().eq("name", name);
  if (error) throw error;
});
