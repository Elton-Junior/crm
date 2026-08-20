export interface KanbanColumnData {
  id: string;
  name: string;
  color: string;
  position: string;
}

/**
 * Ponte entre o domínio (deals, tasks, ...) e o board genérico —
 * ARQUITETURA-EXPANSAO.md §2. `renderCard` fica fora do adapter (é uma
 * função de apresentação, não de dados) e vai direto como prop do board.
 */
export interface KanbanAdapter<T> {
  getId: (item: T) => string;
  getColumnId: (item: T) => string;
  getPosition: (item: T) => string;
}
