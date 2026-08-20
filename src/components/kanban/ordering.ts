import { generateKeyBetween } from "fractional-indexing";

/**
 * Calcula a nova position de um item movido para o índice `toIndex` de uma
 * lista `items` (já ordenada) da coluna de destino. O próprio item movido
 * deve ser removido da lista antes de chamar.
 */
export function positionForIndex(
  items: Array<{ id: string; position: string }>,
  toIndex: number,
): string {
  const prev = items[toIndex - 1]?.position ?? null;
  const next = items[toIndex]?.position ?? null;
  return generateKeyBetween(prev, next);
}
