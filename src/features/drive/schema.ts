import { z } from "zod";

export const folderNameSchema = z
  .string()
  .trim()
  .min(1, "Informe um nome.")
  .max(200);

// Mesma lista do bucket "files" (migration 0007) — mudar aqui sem migrar o
// bucket faz o Storage rejeitar o upload com um erro confuso.
export const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/png",
  "image/jpeg",
];

export const MAX_FILE_SIZE = 25 * 1024 * 1024;
