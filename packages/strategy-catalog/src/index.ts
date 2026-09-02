export type StrategyCatalogEntry = {
  key: string;
  name: string;
  description: string;
  risk: 'LOW' | 'MEDIUM' | 'HIGH';
  markets: string[];
  metrics: Record<string, number>;
  drawdown: number;
  version: string;
  parameters: Record<string, unknown>;
  compatibility: { paper: boolean; live: boolean };
  status: 'ACTIVE' | 'INACTIVE' | 'DRAFT';
};
export class StrategyCatalog {
  private readonly entries = new Map<string, StrategyCatalogEntry>();
  register(entry: StrategyCatalogEntry): void {
    if (
      !/^[a-z][a-z0-9-]{1,50}$/.test(entry.key) ||
      !/^\d+\.\d+\.\d+$/.test(entry.version) ||
      entry.drawdown < 0 ||
      entry.drawdown > 100 ||
      entry.markets.length === 0
    )
      throw new Error('Invalid strategy catalog entry');
    const id = `${entry.key}@${entry.version}`;
    if (this.entries.has(id)) throw new Error('Strategy version already cataloged');
    this.entries.set(id, {
      ...entry,
      markets: [...entry.markets],
      parameters: structuredClone(entry.parameters),
      metrics: { ...entry.metrics },
      compatibility: { ...entry.compatibility },
    });
  }
  get(key: string, version: string): StrategyCatalogEntry {
    const entry = this.entries.get(`${key}@${version}`);
    if (!entry) throw new Error('Strategy not found');
    return structuredClone(entry);
  }
  list(status?: StrategyCatalogEntry['status']): StrategyCatalogEntry[] {
    return [...this.entries.values()]
      .filter((entry) => status === undefined || entry.status === status)
      .map((entry) => structuredClone(entry));
  }
}
