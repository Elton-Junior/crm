import { expect, test } from "@playwright/test";

import { login, serviceRoleClient } from "./helpers";

test("mover card entre colunas do Kanban", async ({ page }) => {
  const title = `Proposta E2E ${Date.now()}`;

  await login(page);
  await page.goto("/propostas");

  const sourceColumn = page.locator("div.w-72", { hasText: "Cliente entrou em contato" }).first();
  const targetColumn = page.locator("div.w-72", { hasText: "Reunião agendada" }).first();

  await sourceColumn.getByRole("button", { name: "Nova proposta" }).click();
  await sourceColumn.getByPlaceholder("Título da proposta").fill(title);
  await sourceColumn.getByRole("button", { name: "Criar" }).click();

  const card = page.getByText(title, { exact: true });
  await expect(card).toBeVisible();

  const sourceBox = await card.boundingBox();
  const targetBox = await targetColumn.boundingBox();
  if (!sourceBox || !targetBox) throw new Error("Não foi possível medir os elementos do drag.");

  const startX = sourceBox.x + sourceBox.width / 2;
  const startY = sourceBox.y + sourceBox.height / 2;
  const endX = targetBox.x + targetBox.width / 2;
  const endY = targetBox.y + 150;

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  // Passa do limiar de 8px de ativação do dnd-kit antes de seguir pro alvo.
  await page.mouse.move(startX + 15, startY, { steps: 5 });
  await page.mouse.move(endX, endY, { steps: 15 });
  await page.mouse.move(endX, endY, { steps: 2 });
  await page.mouse.up();

  await expect(targetColumn.getByText(title, { exact: true })).toBeVisible();
  await expect(sourceColumn.getByText(title, { exact: true })).not.toBeVisible();

  const supabase = serviceRoleClient();
  const { error } = await supabase.from("deals").delete().eq("title", title);
  if (error) throw error;
});
