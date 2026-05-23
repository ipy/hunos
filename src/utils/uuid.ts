let counter = 0;

export function generateId(): string {
  const now = Date.now();
  const random = Math.random().toString(36).substring(2, 10);
  counter = (counter + 1) % 1000;
  return `${now.toString(36)}-${counter.toString(36).padStart(3, '0')}-${random}`;
}
