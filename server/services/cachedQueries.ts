/**
 * Cached Queries Service
 * 
 * Wraps frequently accessed database queries with caching layer
 * to reduce database load and improve response times.
 */

import { queryCache } from './queryCacheService';
import { getDb } from '../db';
import {
  products,
  machines,
  workstations,
  productionLines,
  fixtures,
  machineTypes,
  productSpecifications,
} from '../../drizzle/schema';
import { eq, and, desc, asc, like, sql } from 'drizzle-orm';

// Cache key prefixes
const CACHE_KEYS = {
  PRODUCTS: 'products',
  PRODUCTS_ALL: 'products_all',
  PRODUCTS_BY_ID: 'products_by_id',
  MACHINES: 'machines',
  MACHINES_ALL: 'machines_all',
  MACHINES_BY_WORKSTATION: 'machines_by_workstation',
  MACHINES_BY_TYPE: 'machines_by_type',
  WORKSTATIONS: 'workstations',
  WORKSTATIONS_ALL: 'workstations_all',
  WORKSTATIONS_BY_LINE: 'workstations_by_line',
  PRODUCTION_LINES: 'production_lines',
  PRODUCTION_LINES_ALL: 'production_lines_all',
  PRODUCTION_LINES_BY_ID: 'production_lines_by_id',
  FIXTURES: 'fixtures',
  FIXTURES_ALL: 'fixtures_all',
  FIXTURES_BY_MACHINE: 'fixtures_by_machine',
  MACHINE_TYPES: 'machine_types',
  MACHINE_TYPES_ALL: 'machine_types_all',
  PRODUCT_SPECS: 'product_specs',
  PRODUCT_SPECS_BY_PRODUCT: 'product_specs_by_product',
};

// TTL configurations (in milliseconds)
const TTL = {
  SHORT: 60 * 1000,        // 1 minute - for frequently changing data
  MEDIUM: 5 * 60 * 1000,   // 5 minutes - for moderately changing data
  LONG: 15 * 60 * 1000,    // 15 minutes - for rarely changing data
  VERY_LONG: 30 * 60 * 1000, // 30 minutes - for static data
};

// ==================== PRODUCTS ====================

export async function getCachedProducts() {
  return queryCache.getOrSet(
    CACHE_KEYS.PRODUCTS_ALL,
    undefined,
    async () => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(products).orderBy(asc(products.code));
    },
    TTL.MEDIUM
  );
}

export async function getCachedProductById(id: number) {
  return queryCache.getOrSet(
    CACHE_KEYS.PRODUCTS_BY_ID,
    { id },
    async () => {
      const db = await getDb();
      if (!db) return null;
      const result = await db.select().from(products).where(eq(products.id, id)).limit(1);
      return result[0] || null;
    },
    TTL.MEDIUM
  );
}

export async function getCachedProductByCode(code: string) {
  return queryCache.getOrSet(
    CACHE_KEYS.PRODUCTS,
    { code },
    async () => {
      const db = await getDb();
      if (!db) return null;
      const result = await db.select().from(products).where(eq(products.code, code)).limit(1);
      return result[0] || null;
    },
    TTL.MEDIUM
  );
}

// ==================== MACHINES ====================

export async function getCachedMachines() {
  return queryCache.getOrSet(
    CACHE_KEYS.MACHINES_ALL,
    undefined,
    async () => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(machines).orderBy(asc(machines.name));
    },
    TTL.MEDIUM
  );
}

export async function getCachedMachinesByWorkstation(workstationId: number) {
  return queryCache.getOrSet(
    CACHE_KEYS.MACHINES_BY_WORKSTATION,
    { workstationId },
    async () => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(machines).where(eq(machines.workstationId, workstationId)).orderBy(asc(machines.name));
    },
    TTL.MEDIUM
  );
}

export async function getCachedMachinesByType(machineTypeId: number) {
  return queryCache.getOrSet(
    CACHE_KEYS.MACHINES_BY_TYPE,
    { machineTypeId },
    async () => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(machines).where(eq(machines.machineTypeId, machineTypeId)).orderBy(asc(machines.name));
    },
    TTL.MEDIUM
  );
}

export async function getCachedMachineById(id: number) {
  return queryCache.getOrSet(
    CACHE_KEYS.MACHINES,
    { id },
    async () => {
      const db = await getDb();
      if (!db) return null;
      const result = await db.select().from(machines).where(eq(machines.id, id)).limit(1);
      return result[0] || null;
    },
    TTL.MEDIUM
  );
}

// ==================== WORKSTATIONS ====================

export async function getCachedWorkstations() {
  return queryCache.getOrSet(
    CACHE_KEYS.WORKSTATIONS_ALL,
    undefined,
    async () => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(workstations).orderBy(asc(workstations.name));
    },
    TTL.MEDIUM
  );
}

export async function getCachedWorkstationsByLine(productionLineId: number) {
  return queryCache.getOrSet(
    CACHE_KEYS.WORKSTATIONS_BY_LINE,
    { productionLineId },
    async () => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(workstations).where(eq(workstations.productionLineId, productionLineId)).orderBy(asc(workstations.id));
    },
    TTL.MEDIUM
  );
}

export async function getCachedWorkstationById(id: number) {
  return queryCache.getOrSet(
    CACHE_KEYS.WORKSTATIONS,
    { id },
    async () => {
      const db = await getDb();
      if (!db) return null;
      const result = await db.select().from(workstations).where(eq(workstations.id, id)).limit(1);
      return result[0] || null;
    },
    TTL.MEDIUM
  );
}

// ==================== PRODUCTION LINES ====================

export async function getCachedProductionLines() {
  return queryCache.getOrSet(
    CACHE_KEYS.PRODUCTION_LINES_ALL,
    undefined,
    async () => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(productionLines).orderBy(asc(productionLines.name));
    },
    TTL.MEDIUM
  );
}

export async function getCachedProductionLineById(id: number) {
  return queryCache.getOrSet(
    CACHE_KEYS.PRODUCTION_LINES_BY_ID,
    { id },
    async () => {
      const db = await getDb();
      if (!db) return null;
      const result = await db.select().from(productionLines).where(eq(productionLines.id, id)).limit(1);
      return result[0] || null;
    },
    TTL.MEDIUM
  );
}

// ==================== FIXTURES ====================

export async function getCachedFixtures() {
  return queryCache.getOrSet(
    CACHE_KEYS.FIXTURES_ALL,
    undefined,
    async () => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(fixtures).orderBy(asc(fixtures.name));
    },
    TTL.MEDIUM
  );
}

export async function getCachedFixturesByMachine(machineId: number) {
  return queryCache.getOrSet(
    CACHE_KEYS.FIXTURES_BY_MACHINE,
    { machineId },
    async () => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(fixtures).where(eq(fixtures.machineId, machineId)).orderBy(asc(fixtures.name));
    },
    TTL.MEDIUM
  );
}

export async function getCachedFixtureById(id: number) {
  return queryCache.getOrSet(
    CACHE_KEYS.FIXTURES,
    { id },
    async () => {
      const db = await getDb();
      if (!db) return null;
      const result = await db.select().from(fixtures).where(eq(fixtures.id, id)).limit(1);
      return result[0] || null;
    },
    TTL.MEDIUM
  );
}

// ==================== MACHINE TYPES ====================

export async function getCachedMachineTypes() {
  return queryCache.getOrSet(
    CACHE_KEYS.MACHINE_TYPES_ALL,
    undefined,
    async () => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(machineTypes).orderBy(asc(machineTypes.name));
    },
    TTL.LONG
  );
}

export async function getCachedMachineTypeById(id: number) {
  return queryCache.getOrSet(
    CACHE_KEYS.MACHINE_TYPES,
    { id },
    async () => {
      const db = await getDb();
      if (!db) return null;
      const result = await db.select().from(machineTypes).where(eq(machineTypes.id, id)).limit(1);
      return result[0] || null;
    },
    TTL.LONG
  );
}

// ==================== PRODUCT SPECIFICATIONS ====================

export async function getCachedProductSpecsByProduct(productId: number) {
  return queryCache.getOrSet(
    CACHE_KEYS.PRODUCT_SPECS_BY_PRODUCT,
    { productId },
    async () => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(productSpecifications).where(eq(productSpecifications.productId, productId));
    },
    TTL.MEDIUM
  );
}

// ==================== CACHE INVALIDATION ====================

/**
 * Invalidate all product-related caches
 */
export function invalidateProductCache() {
  queryCache.invalidateQuery(CACHE_KEYS.PRODUCTS);
  queryCache.invalidateQuery(CACHE_KEYS.PRODUCTS_ALL);
  queryCache.invalidateQuery(CACHE_KEYS.PRODUCTS_BY_ID);
}

/**
 * Invalidate all machine-related caches
 */
export function invalidateMachineCache() {
  queryCache.invalidateQuery(CACHE_KEYS.MACHINES);
  queryCache.invalidateQuery(CACHE_KEYS.MACHINES_ALL);
  queryCache.invalidateQuery(CACHE_KEYS.MACHINES_BY_WORKSTATION);
  queryCache.invalidateQuery(CACHE_KEYS.MACHINES_BY_TYPE);
}

/**
 * Invalidate all workstation-related caches
 */
export function invalidateWorkstationCache() {
  queryCache.invalidateQuery(CACHE_KEYS.WORKSTATIONS);
  queryCache.invalidateQuery(CACHE_KEYS.WORKSTATIONS_ALL);
  queryCache.invalidateQuery(CACHE_KEYS.WORKSTATIONS_BY_LINE);
}

/**
 * Invalidate all production line-related caches
 */
export function invalidateProductionLineCache() {
  queryCache.invalidateQuery(CACHE_KEYS.PRODUCTION_LINES);
  queryCache.invalidateQuery(CACHE_KEYS.PRODUCTION_LINES_ALL);
  queryCache.invalidateQuery(CACHE_KEYS.PRODUCTION_LINES_BY_ID);
}

/**
 * Invalidate all fixture-related caches
 */
export function invalidateFixtureCache() {
  queryCache.invalidateQuery(CACHE_KEYS.FIXTURES);
  queryCache.invalidateQuery(CACHE_KEYS.FIXTURES_ALL);
  queryCache.invalidateQuery(CACHE_KEYS.FIXTURES_BY_MACHINE);
}

/**
 * Invalidate all machine type-related caches
 */
export function invalidateMachineTypeCache() {
  queryCache.invalidateQuery(CACHE_KEYS.MACHINE_TYPES);
  queryCache.invalidateQuery(CACHE_KEYS.MACHINE_TYPES_ALL);
}

/**
 * Invalidate all product specification-related caches
 */
export function invalidateProductSpecCache() {
  queryCache.invalidateQuery(CACHE_KEYS.PRODUCT_SPECS);
  queryCache.invalidateQuery(CACHE_KEYS.PRODUCT_SPECS_BY_PRODUCT);
}

/**
 * Invalidate all caches (use sparingly)
 */
export function invalidateAllCaches() {
  queryCache.clear();
}

// Export cache keys for external use
export { CACHE_KEYS, TTL };
