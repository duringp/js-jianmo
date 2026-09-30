import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import {
  ProductionLine,
  STATIONS,
  robotMotion,
} from "../src/simulation/production-line.js";
import { robot, inspection, battery } from "../src/models/equipment.js";
import { poseLineRobot, updateInspection } from "../src/simulation/process.js";
import { Simulation } from "../src/simulation/engine.js";

function tick(line, seconds) {
  for (let n = 0; n < seconds * 60; n++) line.step(1 / 60);
}
test("30-minute line preserves material, order, capacity and clearance through a dispatch blockage", () => {
  const line = new ProductionLine();
  let peak = 0;
  for (let n = 0; n < 1800 * 60; n++) {
    line.outputPaused = n >= 120 * 60 && n < 600 * 60;
    line.step(1 / 60);
    const active = line.active;
    peak = Math.max(peak, active.length);
    assert.equal(line.issued, active.length + line.shipped + line.sentToRework);
    assert.equal(line.good, line.shipped + line.bins.good.length);
    assert.equal(line.rejected, line.sentToRework + line.bins.reject.length);
    assert.ok(line.bins.good.length + line.reservations.good.size <= 3);
    assert.ok(line.bins.reject.length + line.reservations.reject.size <= 2);
    for (let i = 0; i < active.length; i++)
      for (let k = i + 1; k < active.length; k++) {
        const p = active[i].position,
          q = active[k].position;
        assert.ok(
          Math.abs(p[0] - q[0]) >= 3.5 ||
            Math.abs(p[1] - q[1]) >= 1.4 ||
            Math.abs(p[2] - q[2]) >= 2.3,
          `tray collision ${active[i].id}/${active[k].id} at ${line.time}`,
        );
      }
  }
  assert.ok(peak <= 16);
  assert.ok(line.good > 80);
  assert.ok(line.rejected > 10);
  for (const job of line.history) {
    const processNames = job.trace
      .filter((e) => STATIONS.some((s) => s.name === e.message))
      .map((e) => e.message);
    assert.deepEqual(
      processNames,
      STATIONS.map((s) => s.name),
    );
    assert.equal(job.kind, job.id % 7 === 0 ? "reject" : "good");
    assert.ok(job.bus && job.lid);
  }
  console.log(
    `line: ${line.good} good, ${line.rejected} NG, peak ${peak} active trays; no overlapping tray envelopes`,
  );
});
test("full output blocks every upstream station without consuming new material; recovery drains it", () => {
  const line = new ProductionLine();
  line.outputPaused = true;
  tick(line, 300);
  assert.equal(line.bins.good.length, 3);
  assert.equal(line.blocked, 7);
  const serial = line.serial,
    poses = JSON.stringify(line.active.map((j) => j.position));
  tick(line, 40);
  assert.equal(line.serial, serial);
  assert.equal(JSON.stringify(line.active.map((j) => j.position)), poses);
  line.outputPaused = false;
  tick(line, 120);
  assert.ok(line.shipped >= 8);
  assert.ok(line.serial > serial);
});
test("two robot handovers are reachable and continuous, including actual wrist transforms", () => {
  for (const index of [1, 4]) {
    const s = STATIONS[index],
      r = robot((s.x + s.end) / 2, 20, 0, { tables: false });
    let prev = null;
    for (let t = 0; t < s.duration; t += 1 / 240) {
      const motion = robotMotion(t, s);
      poseLineRobot(r, motion.tool, motion.closed);
      r.group.updateMatrixWorld(true);
      assert.ok(
        r.tool
          .getWorldPosition(new THREE.Vector3())
          .distanceTo(new THREE.Vector3(...motion.tool)) < 1e-8,
      );
      if (motion.held)
        assert.ok(
          r.tool
            .localToWorld(new THREE.Vector3(0, -1.5, 0))
            .distanceTo(new THREE.Vector3(...motion.part)) < 1e-8,
        );
      const p = new THREE.Vector3(...motion.part);
      if (prev) assert.ok(p.distanceTo(prev) < 0.04, `handover jump at ${t}`);
      prev = p;
    }
  }
});
function models() {
  const base = new THREE.Group(),
    robots = [
      robot(-49, 20, 0, { tables: false }),
      robot(-21, 20, 1, { tables: false }),
    ],
    inspect = inspection(-9, 25);
  inspect.group.position.y = 0.75;
  inspect.group.rotation.y = Math.PI / 2;
  inspect.clampTravel = 1.2;
  robots.forEach((r) => base.add(r.group));
  base.add(inspect.group);
  const actors = Array.from({ length: 16 }, () => {
    const p = battery();
    p.jobId = null;
    p.tag = { visible: false, material: new THREE.MeshStandardMaterial() };
    p.group.userData.selectable = {};
    base.add(p.group);
    return p;
  });
  return {
    base,
    robots,
    inspect,
    production: {
      actors,
      heads: {},
      stationNodes: [],
      slotLights: { good: [], reject: [] },
    },
    module: { setExplode() {} },
    vehicles: Array.from({ length: 8 }, () => ({
      group: new THREE.Group(),
      beacon: { material: new THREE.MeshStandardMaterial() },
    })),
    signals: [],
    cranes: [],
    ship: new THREE.Group(),
  };
}
test("rendered serial ownership, jaw attachment, inspection height and paused state stay synchronized", () => {
  const m = models(),
    sim = new Simulation(m);
  let heldFrames = 0;
  for (let n = 0; n < 120 * 60; n++) {
    sim.update(1 / 60);
    m.base.updateMatrixWorld(true);
    const active = sim.line.active;
    assert.equal(
      m.production.actors.filter((a) => a.group.visible).length,
      active.length,
    );
    for (const j of active) {
      const a = m.production.actors.find((a) => a.jobId === j.id);
      assert.ok(
        a.group
          .getWorldPosition(new THREE.Vector3())
          .distanceTo(new THREE.Vector3(...j.position)) < 1e-7,
      );
      if (j.motion?.held) {
        assert.equal(a.group.parent, m.robots[j.station === 1 ? 0 : 1].tool);
        heldFrames++;
      }
    }
  }
  assert.ok(heldFrames > 100);
  sim.paused = true;
  const state = JSON.stringify(sim.line.snapshot()),
    time = sim.time,
    poses = m.production.actors.map((a) => a.group.position.toArray());
  for (let i = 0; i < 100; i++) sim.update(0.1);
  assert.equal(JSON.stringify(sim.line.snapshot()), state);
  assert.equal(sim.time, time);
  assert.deepEqual(
    m.production.actors.map((a) => a.group.position.toArray()),
    poses,
  );
  sim.paused = false;
  sim.update(1 / 60);
  assert.ok(sim.time > time);
});

test("inspection approach clears transverse open jaws and probes contact the completed module", () => {
  const m = models(),
    s = m.inspect;
  updateInspection(s, 0);
  m.base.updateMatrixWorld(true);
  for (let x = -15; x <= -3; x += 0.1) {
    const tray = new THREE.Box3(
      new THREE.Vector3(x - 1.7, 2.25, 23.9),
      new THREE.Vector3(x + 1.7, 3.625, 26.1),
    );
    for (const clamp of s.clamps)
      assert.ok(
        !tray.intersectsBox(new THREE.Box3().setFromObject(clamp)),
        `infeed strikes clamp at ${x}`,
      );
  }
  updateInspection(s, 3);
  m.base.updateMatrixWorld(true);
  assert.ok(
    Math.abs(s.probe.getWorldPosition(new THREE.Vector3()).y - 0.78 - 3.625) <
      0.02,
  );
  assert.equal(s.clamps[0].position.x, -1.3);
});
