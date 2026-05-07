import { createId as createCuid } from "@paralleldrive/cuid2";

export function createId(): string {
  return createCuid();
}
