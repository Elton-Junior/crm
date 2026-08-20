import path from "node:path";

import { expect, test } from "@playwright/test";

import { login, serviceRoleClient } from "./helpers";

test("criar pasta, enviar arquivo, renomear, excluir e restaurar da lixeira", async ({ page }) => {
  const folderName = `Pasta E2E ${Date.now()}`;
  const renamedName = `Arquivo E2E ${Date.now()}.png`;

  await login(page);
  await page.goto("/drive");

  const grid = page.getByTestId("drive-grid");

  await page.getByRole("button", { name: "Nova pasta" }).click();
  await page.locator("#new-folder-name").fill(folderName);
  await page.getByRole("button", { name: "Criar" }).click();

  await expect(grid.getByText(folderName, { exact: true })).toBeVisible();
  await grid.getByText(folderName, { exact: true }).click();
  await page.waitForURL(/\/drive\/[0-9a-f-]+$/);

  await page.getByRole("button", { name: "Upload" }).click();
  await page
    .locator('input[type="file"]')
    .first()
    .setInputFiles(path.resolve(__dirname, "fixtures/test-image.png"));

  const fileCard = grid.getByText("test-image.png", { exact: true });
  await expect(fileCard).toBeVisible({ timeout: 15000 });

  await fileCard.click();
  await expect(page.getByRole("button", { name: "Renomear" })).toBeVisible();
  await page.getByRole("button", { name: "Renomear" }).click();
  await page.locator("#rename-input").fill(renamedName);
  await page.getByRole("button", { name: "Salvar" }).click();
  await expect(grid.getByText(renamedName, { exact: true })).toBeVisible();

  // O FilePreviewDialog continua aberto após o rename — exclui direto dele,
  // sem precisar fechar e reabrir clicando no card por trás do overlay.
  await page.getByRole("button", { name: "Excluir" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Excluir" }).click();
  await expect(grid.getByText(renamedName, { exact: true })).not.toBeVisible();

  await page.getByRole("button", { name: "Lixeira" }).click();
  await expect(page.getByText(renamedName, { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Restaurar" }).click();
  await expect(grid.getByText(renamedName, { exact: true })).toBeVisible();

  const supabase = serviceRoleClient();
  const { error: fileErr } = await supabase.from("files").delete().ilike("name", "Arquivo E2E%");
  if (fileErr) throw fileErr;
  const { error: folderErr } = await supabase.from("folders").delete().eq("name", folderName);
  if (folderErr) throw folderErr;
});
