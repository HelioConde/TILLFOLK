"use strict";
const assert = require("node:assert/strict");
const { test } = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const Autotile = require("../src/terrain-autotile.js");
const Catalog = require("../src/terrain-catalog.js");

const relative = (...parts) => path.join(__dirname, "..", ...parts);
const json = (...parts) => JSON.parse(fs.readFileSync(relative(...parts), "utf8"));
const originalContract = json(
  "public", "assets", "Sprout Lands - Sprites - premium pack",
  "Sprout Lands - Sprites - premium pack", "Tilesets", "ground tiles",
  "New tiles", "Grass_Tile_Layers_terrain.json"
);
const godotContract = json("godot-port", "data", "terrain_contract.json");
const godotCatalog = json("godot-port", "data", "terrain_catalog.json");
const cases = json("godot-port", "tests", "terrain_cases.json");

test("Godot mantém JSON do contrato imutável idêntico ao oficial", () => {
  assert.deepEqual(godotContract, originalContract);
  assert.deepEqual(godotContract.roles, Catalog.ROLES);
  assert.equal(godotContract.schema, "tillfolk-terrain-autotile/v1");
  assert.equal(godotContract.tileSize, 16);
  assert.equal(godotContract.neighbors, 8);
});

test("nove atlas e seis biomas coincidem com catálogo HTML5", () => {
  assert.deepEqual(
    godotCatalog.terrainAtlases,
    Object.fromEntries(Catalog.TERRAIN_KEYS.map((key) => [key, Catalog.ATLAS[key].file]))
  );
  assert.deepEqual(godotCatalog.biomeAtlas, Catalog.BIOME_ATLAS);
  assert.equal(Object.keys(godotCatalog.terrainAtlases).length, 9);
  assert.equal(Object.keys(godotCatalog.biomeAtlas).length, 6);
});

test("fixtures compartilhadas correspondem ao motor autotile HTML5", () => {
  assert.equal(cases.length, 21);
  for (const scenario of cases) {
    const mask = scenario.rows.map((line) => [...line].map((bit) => bit === "1"));
    const result = Autotile.resolve(mask, 1, 1, Catalog.ROLES);
    assert.equal(result.role, scenario.role, scenario.name);
    assert.deepEqual(result.inner || [], scenario.inner, scenario.name);
    assert.equal(result.usedFallback, scenario.fallback, scenario.name);
    const missing = scenario.fallback ? [scenario.role] : [];
    assert.deepEqual(result.missing, missing, scenario.name);
    const primary = scenario.role === null
      ? null : (Catalog.ROLES[scenario.role] || (scenario.fallback ? Catalog.ROLES.centro : null));
    assert.equal(result.primary, primary, scenario.name);
    assert.deepEqual(result.overlays, scenario.inner.map((role) => Catalog.ROLES[role]), scenario.name);
  }
});
