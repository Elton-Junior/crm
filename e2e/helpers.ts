import { expect, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

export async function login(page: Page) {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Bem-vindo de volta" })).toBeVisible();
  await page.getByLabel("E-mail").fill(process.env.E2E_EMAIL!);
  await page.getByLabel("Senha", { exact: true }).fill(process.env.E2E_PASSWORD!);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await page.waitForURL("**/dashboard");
}

export function serviceRoleClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}
