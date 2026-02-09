/**
 * Schema Barrel Export
 * 
 * This file re-exports all domain schemas from the schema/ directory.
 * The original monolithic schema (7,940 lines, 346 tables) has been split
 * into 32 domain-based modules for better maintainability.
 * 
 * Domain modules:
 * - ai (30 tables), alert (12), aoi-vision (14), capacity (2), core (72)
 * - custom (3), dashboard (3), edge (4), erp (1), escalation (8)
 * - firebase (7), floor-plan (2), iot (42), kpi (3), maintenance (5)
 * - mms (2), mobile (2), notification (9), oee (9), predictive (3)
 * - process (4), product (4), production (25), quality (8), realtime (4)
 * - reporting (4), serial-number (1), spc (16), supply-chain (3)
 * - system (13), user (24), workflow (7)
 */

export * from "./schema/index";
