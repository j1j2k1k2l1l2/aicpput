export class MemoryStore {
  private readonly map = new Map<string, string[]>();

  public append(sessionId: string, chunk: string): void {
    const list = this.map.get(sessionId) ?? [];
    list.push(chunk);
    this.map.set(sessionId, list);
  }

  public read(sessionId: string): string {
    return (this.map.get(sessionId) ?? []).join('');
  }

  public clear(sessionId: string): void {
    this.map.delete(sessionId);
  }
}
