import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { Traffic, routes } from "../src/simulation/traffic.js";
import { robot, inspection, vehicle } from "../src/models/equipment.js";
import {
  updateRobot,
  updateInspection,
  phaseAt,
  ROBOT_PHASES,
  INSPECTION_PHASES,
} from "../src/simulation/process.js";
import { Simulation } from "../src/simulation/engine.js";
import { DETAIL_OBSTACLES } from "../src/models/site-details.js";
import { EXTRA_OBSTACLES } from "../src/models/industrial-assets.js";
const footprints = [
  ...EXTRA_OBSTACLES,
  ...DETAIL_OBSTACLES,
  [-34, -29, 64, 23],
  [35, -29, 42, 23],
  [-23, 29, 82, 24],
  [40, 30, 27, 20],
];
for (let z = -41; z < 35; z += 11)
  for (let x = 0; x < 2; x++) footprints.push([86 + x * 6, z, 5, 8]);
test("both planned routes clear every building, with a 3m vehicle envelope", () => {
  for (const route of routes)
    for (let s = 0; s < route.length; s += 0.25) {
      const p = route.sample(s);
      for (const [x, z, w, d] of footprints)
        assert.ok(
          !(Math.abs(p.x - x) < w / 2 + 3 && Math.abs(p.z - z) < d / 2 + 3),
          `route intersects building at ${p.x}, ${p.z}`,
        );
    }
});
test("30-minute fleet simulation: no collisions and all vehicles make progress", () => {
  const t = new Traffic();
  const distances = t.cars.map(() => 0);
  const recent = t.cars.map(() => 0);
  for (let step = 0; step < 30 * 60 * 60; step++) {
    const prev = t.cars.map((c) => c.s);
    t.step(1 / 60);
    t.cars.forEach((c, i) => {
      const moved =
        (c.s - prev[i] + routes[c.route].length) % routes[c.route].length;
      distances[i] += moved;
      if (step > 29 * 60 * 60) recent[i] += moved;
    });
  }
  assert.ok(t.minObservedGap >= 6.6);
  for (const d of recent)
    assert.ok(
      d > 20,
      `vehicle stuck in last minute, moved only ${d.toFixed(1)}m`,
    );
  console.log(
    "30 min minimum center spacing:",
    t.minObservedGap.toFixed(3),
    "m; travel:",
    distances.map((d) => Math.round(d)),
  );
});
test("fault vehicle stops, safe followers wait, recovery releases fleet", () => {
  const t = new Traffic();
  for (let i = 0; i < 1200; i++) t.step(1 / 60);
  t.setFault(0, true);
  const stopped = t.cars[0].s;
  for (let i = 0; i < 12000; i++) t.step(1 / 60);
  assert.equal(t.cars[0].s, stopped);
  assert.ok(t.cars.some((c) => c.id !== 0 && c.speed === 0));
  assert.ok(t.minObservedGap >= 6.6);
  t.setFault(0, false);
  for (let i = 0; i < 600; i++) t.step(1 / 60);
  assert.notEqual(t.cars[0].s, stopped);
});
test("gripper attachment, pickup and release stay spatially continuous", () => {
  const r = robot(0, 0);
  const prev = new THREE.Vector3();
  let initialized = false,
    maxHeldError = 0;
  for (let t = 0; t < 30.6; t += 1 / 240) {
    updateRobot(r, t);
    r.group.updateMatrixWorld(true);
    const p = r.part.group.getWorldPosition(new THREE.Vector3());
    if (r.held) {
      assert.equal(r.part.group.parent, r.tool);
      const expected = r.tool.localToWorld(new THREE.Vector3(0, -1.5, 0));
      maxHeldError = Math.max(maxHeldError, p.distanceTo(expected));
    }
    if (initialized && r.phase.name !== "等待")
      assert.ok(
        p.distanceTo(prev) < 0.12,
        `workpiece jumped ${p.distanceTo(prev)}m at ${t}`,
      );
    prev.copy(p);
    initialized = true;
  }
  assert.equal(maxHeldError, 0);
});
test("inspection probes contact lid while clamps are closed, and results include failures", () => {
  const s = inspection(0, 0);
  updateInspection(s, 3);
  assert.equal(s.phase.name, "电性能检测");
  for (const clamp of s.clamps)
    assert.equal(
      clamp.parent,
      s.group,
      "moving clamps must survive static batching",
    );
  assert.equal(s.screen.parent, s.group);
  assert.ok(Math.abs(s.probe.position.y - 0.78 - 2.875) < 0.02);
  assert.equal(s.clamps[0].position.x, -1.85);
  updateInspection(s, 12 * 8 + 6);
  assert.equal(s.result, "NG · 绝缘异常");
});
test("pause retains time, positions and process state; resume remains continuous", () => {
  const v = () => ({
    group: new THREE.Group(),
    beacon: { material: new THREE.MeshStandardMaterial() },
  });
  const m = {
    robots: [robot(0, 0)],
    inspect: inspection(0, 0),
    module: { setExplode() {} },
    vehicles: Array.from({ length: 8 }, v),
    signals: [],
    cranes: [],
    ship: new THREE.Group(),
  };
  const sim = new Simulation(m);
  for (let i = 0; i < 230; i++) sim.update(1 / 60);
  sim.paused = true;
  const time = sim.time,
    pose = m.robots[0].tool.position.clone(),
    cars = JSON.stringify(sim.traffic.cars);
  for (let i = 0; i < 600; i++) sim.update(1 / 60);
  assert.equal(sim.time, time);
  assert.ok(m.robots[0].tool.position.equals(pose));
  assert.equal(JSON.stringify(sim.traffic.cars), cars);
  sim.paused = false;
  sim.update(1 / 60);
  assert.ok(sim.time > time);
  assert.ok(m.robots[0].tool.position.distanceTo(pose) < 0.2);
});

// The varied vehicle models must fit the unchanged controller safety envelope.
test("all three vehicle silhouettes fit a 3m horizontal safety radius", () => {
  for (let i = 0; i < 3; i++) {
    const v = vehicle(i);
    v.group.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(v.group);
    const x = Math.max(Math.abs(bounds.min.x), Math.abs(bounds.max.x));
    const z = Math.max(Math.abs(bounds.min.z), Math.abs(bounds.max.z));
    assert.ok(
      Math.hypot(x, z) < 3,
      `variant ${i} exceeds the traffic envelope`,
    );
    assert.equal(v.wheels.length, 4);
    v.group.position.y = 0.09;
    v.group.updateMatrixWorld(true);
    const wheelBounds = new THREE.Box3().setFromObject(v.wheels[0]);
    assert.ok(
      Math.abs(wheelBounds.min.y - 0.26) < 0.002,
      "wheel must contact the road surface",
    );
  }
});
