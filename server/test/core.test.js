import test from "node:test";
import assert from "node:assert/strict";
import { sanitizeProfile } from "../src/privacy.js";
import { rankCandidates } from "../src/matching.js";
import { bucketPoints, scoreFromCount, zoneCenters } from "../src/zones.js";
import { matchingDemoSnapshot } from "../src/demoSnapshot.js";

test("private profile never forwards city, budget or business description", () => {
  const safe = sanitizeProfile({
    visibility: "private", category: "cafeteria", location: { country: "Mexico", city: "Ciudad de México" },
    budgetRange: "$100k", businessType: "Cafetería", nextStepId: "sat-rfc",
  });
  assert.deepEqual(safe, { visibility: "private", category: "cafeteria", location: { country: "Mexico" }, nextStepId: "sat-rfc", nextStepTitle: undefined, completedStepIds: [] });
});

test("ranking prioritizes a provider that handles the next step in the same city", () => {
  const result = rankCandidates(
    { nextStepId: "sat-rfc", location: { city: "Ciudad de México" } },
    [
      { id: "local", rating: 4, city: "Ciudad de México", helpsWith: ["sat-rfc"] },
      { id: "remote", rating: 5, city: "Guadalajara", helpsWith: [] },
    ],
    [{ id: "sat-rfc", title: "Obtén tu RFC", status: "available" }]
  );
  assert.equal(result[0].providerId, "local");
});

test("CDMX cafe snapshot is only available for the intended demo area", () => {
  assert.ok(matchingDemoSnapshot([19.34, -99.2, 19.47, -99.12], "cafeteria")?.points.length);
  assert.equal(matchingDemoSnapshot([20, -100, 20.1, -99.9], "cafeteria"), null);
});

test("density grid counts nearby points and caps scores", () => {
  const zones = zoneCenters(19.4326, -99.1332);
  const counts = bucketPoints(zones, [{ lat: 19.4326, lng: -99.1332 }]);
  assert.equal(Object.values(counts).reduce((total, value) => total + value, 0), 1);
  assert.equal(scoreFromCount(100), 100);
});
