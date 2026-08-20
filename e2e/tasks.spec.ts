import { expect, test } from "@playwright/test";

import { login, serviceRoleClient } from "./helpers";

test("criar projeto e mover tarefa entre colunas do Kanban", async ({ page }) => {
  const projectName = `Projeto E2E ${Date.now()}`;
  const taskTitle = `Tarefa E2E ${Date.now()}`;

  await login(page);
  await page.goto("/projetos");

  await page.getByRole("button", { name: "Novo projeto" }).click();
  await page.getByLabel("Nome").fill(projectName);
  await page.getByRole("button", { name: "Salvar" }).click();

  await page.waitForURL(/\/projetos\/[0-9a-f-]+$/);
  await expect(page.getByRole("heading", { name: projectName })).toBeVisible();

  const sourceColumn = page.locator("div.w-72", { hasText: "A Fazer" }).first();
  const targetColumn = page.locator("div.w-72", { hasText: "Em Andamento" }).first();

  await sourceColumn.getByRole("button", { name: "Nova tarefa" }).click();
  await sourceColumn.getByPlaceholder("Título da tarefa").fill(taskTitle);
  await sourceColumn.getByRole("button", { name: "Criar" }).click();

  const card = page.getByText(taskTitle, { exact: true });
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
  await page.mouse.move(startX + 15, startY, { steps: 5 });
  await page.mouse.move(endX, endY, { steps: 15 });
  await page.mouse.move(endX, endY, { steps: 2 });
  await page.mouse.up();

  await expect(targetColumn.getByText(taskTitle, { exact: true })).toBeVisible();
  await expect(sourceColumn.getByText(taskTitle, { exact: true })).not.toBeVisible();

  // Abre o dialog de detalhe e confirma que os dados carregam corretamente após o move.
  await targetColumn.getByText(taskTitle, { exact: true }).click();
  await expect(page.getByRole("tab", { name: "Detalhes" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Checklist" })).toBeVisible();
  await page.keyboard.press("Escape");

  const supabase = serviceRoleClient();
  const { error } = await supabase.from("projects").delete().eq("name", projectName);
  if (error) throw error;
});
