// Symbols Repository - Trading symbols/currencies
import { eq, and, like, sql } from 'drizzle-orm';
import { db } from '../index';
import { symbols, type Symbol, type NewSymbol } from '../schema/symbols';

export class SymbolsRepository {
  async findById(id: string): Promise<Symbol | undefined> {
    return db.query.symbols.findFirst({
      where: eq(symbols.id, id),
    });
  }

  async findByName(name: string): Promise<Symbol | undefined> {
    return db.query.symbols.findFirst({
      where: eq(symbols.name, name),
    });
  }

  async findAll(options: {
    category?: string;
    isActive?: boolean;
    search?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<Symbol[]> {
    const conditions = [];

    if (options.category) {
      conditions.push(eq(symbols.category, options.category));
    }
    if (options.isActive !== undefined) {
      conditions.push(eq(symbols.isActive, options.isActive));
    }
    if (options.search) {
      conditions.push(
        like(symbols.name, `%${options.search}%`)
      );
    }

    return db.query.symbols.findMany({
      where: conditions.length > 0 ? and(...conditions) : undefined,
      limit: options.limit,
      offset: options.offset,
      orderBy: (symbols, { asc }) => [asc(symbols.name)],
    });
  }

  async findByCategory(category: string): Promise<Symbol[]> {
    return db.query.symbols.findMany({
      where: eq(symbols.category, category),
      orderBy: (symbols, { asc }) => [asc(symbols.name)],
    });
  }

  async findActive(): Promise<Symbol[]> {
    return db.query.symbols.findMany({
      where: eq(symbols.isActive, true),
      orderBy: (symbols, { asc }) => [asc(symbols.name)],
    });
  }

  async create(data: NewSymbol): Promise<Symbol> {
    const [symbol] = await db.insert(symbols).values(data).returning();
    return symbol;
  }

  async createMany(data: NewSymbol[]): Promise<number> {
    const result = await db.insert(symbols).values(data).returning();
    return result.length;
  }

  async update(id: string, data: Partial<NewSymbol>): Promise<Symbol | undefined> {
    const [symbol] = await db
      .update(symbols)
      .set(data)
      .where(eq(symbols.id, id))
      .returning();
    return symbol;
  }

  async delete(id: string): Promise<boolean> {
    const result = await db.delete(symbols).where(eq(symbols.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async getCategories(): Promise<string[]> {
    const result = await db
      .select({ category: symbols.category })
      .from(symbols)
      .groupBy(symbols.category);
    return result.map(r => r.category);
  }

  async count(options: { category?: string; isActive?: boolean } = {}): Promise<number> {
    const conditions = [];
    if (options.category) {
      conditions.push(eq(symbols.category, options.category));
    }
    if (options.isActive !== undefined) {
      conditions.push(eq(symbols.isActive, options.isActive));
    }

    const result = conditions.length
      ? await db.select({ count: sql<number>`count(*)` }).from(symbols).where(and(...conditions))
      : await db.select({ count: sql<number>`count(*)` }).from(symbols);

    return Number(result[0]?.count ?? 0);
  }
}

export const symbolsRepository = new SymbolsRepository();
