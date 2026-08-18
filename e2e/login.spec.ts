import { expect, test } from "@playwright/test";

test("login com e-mail e senha", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Bem-vindo de volta" })).toBeVisible();

  await page.getByLabel("E-mail").fill(process.env.E2E_EMAIL!);
  await page.getByLabel("Senha", { exact: true }).fill(process.env.E2E_PASSWORD!);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();

  await page.waitForURL("**/dashboard");
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
});

test("login com senha incorreta mostra erro", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Bem-vindo de volta" })).toBeVisible();
  await page.getByLabel("E-mail").fill(process.env.E2E_EMAIL!);
  await page.getByLabel("Senha", { exact: true }).fill("senha-errada-123");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();

  await expect(page.getByText("E-mail ou senha incorretos.")).toBeVisible();
  await expect(page).toHaveURL(/\/login/);
});
