function calcCheckDigit(base: string, weights: number[]): number {
  const total = base
    .split("")
    .reduce((sum, digit, i) => sum + Number(digit) * weights[i], 0);
  const remainder = total % 11;
  return remainder < 2 ? 0 : 11 - remainder;
}

/** Valida CPF (11 dígitos) por dígito verificador. Aceita string com ou sem máscara. */
export function validarCPF(cpf: string): boolean {
  const digits = cpf.replace(/\D/g, "");
  if (digits.length !== 11 || /^(\d)\1{10}$/.test(digits)) return false;

  const d1 = calcCheckDigit(digits.slice(0, 9), [10, 9, 8, 7, 6, 5, 4, 3, 2]);
  const d2 = calcCheckDigit(
    digits.slice(0, 9) + d1,
    [11, 10, 9, 8, 7, 6, 5, 4, 3, 2],
  );

  return digits === digits.slice(0, 9) + String(d1) + String(d2);
}

/** Valida CNPJ (14 dígitos) por dígito verificador. Aceita string com ou sem máscara. */
export function validarCNPJ(cnpj: string): boolean {
  const digits = cnpj.replace(/\D/g, "");
  if (digits.length !== 14 || /^(\d)\1{13}$/.test(digits)) return false;

  const d1 = calcCheckDigit(
    digits.slice(0, 12),
    [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2],
  );
  const d2 = calcCheckDigit(
    digits.slice(0, 12) + d1,
    [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2],
  );

  return digits === digits.slice(0, 12) + String(d1) + String(d2);
}

/** Valida CPF ou CNPJ dependendo do número de dígitos. */
export function validarDocumento(document: string): boolean {
  const digits = document.replace(/\D/g, "");
  if (digits.length === 11) return validarCPF(digits);
  if (digits.length === 14) return validarCNPJ(digits);
  return false;
}
