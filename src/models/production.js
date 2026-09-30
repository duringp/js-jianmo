import * as THREE from "three";
import { box, cyl, instances, label, selectable, mat } from "./primitives.js";
import { battery } from "./equipment.js";
import { rounded, cabinet, person, safetyEdge } from "./details.js";
import { sign } from "./industrial-assets.js";
import { batchStatic } from "../scene/batching.js";
import {
  STATIONS,
  OUTPUT_SLOTS,
  LINE_Y,
} from "../simulation/production-line.js";
export function buildProduction(base, pickables) {
  const structure = new THREE.Group();
  base.add(structure);
  function conveyor(x0, x1, z, width = 3.1) {
    const center = (x0 + x1) / 2,
      length = x1 - x0;
    box(structure, [length, 0.15, width], [center, LINE_Y - 0.32, z], "dark");
    for (let x = x0 + 0.25; x < x1; x += 0.52) {
      const r = cyl(
        structure,
        0.12,
        width - 0.16,
        [x, LINE_Y - 0.12, z],
        "steel",
      );
      r.rotation.x = Math.PI / 2;
    }
    for (const zz of [z - width / 2, z + width / 2]) {
      box(
        structure,
        [length, 0.13, 0.12],
        [center, LINE_Y - 0.12, zz],
        "orange",
      );
      for (let x = x0 + 0.5; x < x1; x += 3)
        box(structure, [0.15, 1.08, 0.15], [x, 1.49, zz], "steel");
    }
  }
  // Two robot transfer cells interrupt the conveyor: no duplicate belt under the swept arm.
  for (const [a, b] of [
    [-62, -51],
    [-47, -23],
    [-19, -11.1],
    [-6.9, 14],
  ])
    conveyor(a, b, 25);
  function spur(x, z0, z1, w = 3.7) {
    box(
      structure,
      [w, 0.15, z1 - z0],
      [x, LINE_Y - 0.25, (z0 + z1) / 2],
      "dark",
    );
    for (let z = z0; z < z1; z += 0.55) {
      const r = cyl(structure, 0.12, w - 0.2, [x, LINE_Y - 0.12, z], "steel");
      r.rotation.z = Math.PI / 2;
    }
    for (const xx of [x - w / 2, x + w / 2]) {
      box(
        structure,
        [0.12, 0.15, z1 - z0],
        [xx, LINE_Y - 0.15, (z0 + z1) / 2],
        "steel",
      );
      for (const z of [z0 + 0.4, z1 - 0.4])
        box(structure, [0.14, 1.1, 0.14], [xx, 1.5, z], "steel");
    }
  }
  spur(8, 26.65, 33.5);
  conveyor(6.2, 14, 29);
  conveyor(6.2, 14, 33);
  spur(2, 26.65, 33.5);
  spur(-2, 28, 33.5);
  conveyor(-4, 3.8, 28);
  // Scanner, compression and joining fixtures have open forward access.
  const stationNodes = [];
  const heads = {};
  for (const [index, s] of STATIONS.entries()) {
    const node = new THREE.Group();
    base.add(node);
    const kind = s.id.startsWith("robot")
      ? "robot"
      : s.id === "inspection"
        ? "inspection"
        : "line";
    selectable(
      node,
      `station-${s.id}`,
      `${String(index + 1).padStart(2, "0")} · ${s.name}`,
      kind,
      [s.x, 3, 25],
      [s.x + 10, 12, 40],
    );
    pickables.push(node);
    stationNodes.push(node);
    sign(
      node,
      `${String(index + 1).padStart(2, "0")}  ${s.name}`,
      s.id === "sort"
        ? "PASS → OUTBOUND / NG → ISOLATION"
        : "MODULE LINE A / INTERLOCKED",
      [s.x, 1.65, 27],
      s.id.startsWith("robot") ? 5.5 : 5.8,
      0.65,
    );
    if (["load", "press", "connect"].includes(s.id)) {
      for (const dx of [-2.2, 2.2])
        box(node, [0.22, 4.25, 0.22], [s.x + dx, 3.08, 23], "steel");
      box(node, [4.8, 0.35, 0.5], [s.x, 5.2, 23], "orange");
      for (const dx of [-1.35, 1.35])
        box(node, [0.24, 0.25, 2.6], [s.x + dx, 5.4, 24], "steel");
      box(node, [3.1, 0.2, 0.45], [s.x, 5.4, 25], "orange");
      const head = new THREE.Group();
      head.position.set(s.x, 4.8, 25);
      node.add(head);
      heads[s.id] = head;
      if (s.id === "load") {
        rounded(head, [1.7, 0.36, 0.6], [0, 0, 0], "dark");
        box(head, [1.3, 0.025, 0.03], [0, -0.19, 0], "green", false);
      } else {
        rounded(head, [3.45, 0.24, 2.3], [0, 0, 0], "white");
        for (const x of [-1.35, 1.35])
          cyl(head, 0.11, 1, [x, 0.62, -0.8], "steel");
        if (s.id === "connect")
          for (const x of [-1.4, 1.4])
            for (const z of [-0.85, 0.85])
              cyl(head, 0.065, 0.3, [x, -0.25, z], "dark");
      }
      batchStatic(head);
      if (s.id !== "load") {
        cabinet(node, s.x + 3.4, 0.96, 31, 1.15, 2);
        safetyEdge(node, s.x, 24, 6.3, 8, 0.975);
      }
    }
    const light = cyl(node, 0.12, 0.26, [s.x + 2.5, 3.1, 27], "green");
    light.material = mat.green.clone();
    light.userData.dynamic = true;
    node.userData.signal = light;
    batchStatic(node);
  }
  // Component magazines beside the joining station, outside the material route.
  for (const [x, kind] of [
    [-34, "steel"],
    [-28, "white"],
  ]) {
    box(structure, [3.4, 0.22, 2.2], [x, 1.8, 20.7], "dark");
    for (let i = 0; i < 4; i++)
      box(structure, [3.2, 0.13, 2], [x, 2 + i * 0.17, 20.7], kind);
  }
  // Guard the swept robot cells, retain a pedestrian service aisle at z=37.
  for (const x of [-49, -21])
    for (const dx of [-7.4, 7.4]) {
      box(structure, [0.12, 2.2, 5], [x + dx, 2.1, 20.7], "orange");
      for (let z = 18.5; z < 23.1; z += 0.4)
        box(structure, [0.04, 1.9, 0.025], [x + dx, 2.1, z], "steel", false);
    }
  for (const z of [35.2, 39.7])
    box(structure, [60, 0.018, 0.1], [-31, 0.971, z], "green", false);
  label(
    structure,
    "SERVICE AISLE  /  KEEP CLEAR",
    [-29, 0.98, 38.5],
    24,
    "#65816d",
  );
  for (const x of [-56, -44, -32, -20, -8]) {
    const a = box(
      structure,
      [1.1, 0.018, 0.13],
      [x, 0.978, 30],
      "orange",
      false,
    );
    a.rotation.y = -0.5;
    const b = box(
      structure,
      [1.1, 0.018, 0.13],
      [x, 0.978, 30.55],
      "orange",
      false,
    );
    b.rotation.y = 0.5;
  }
  for (const x of [-57, -36, -15]) {
    cabinet(structure, x, 0.96, 34, 1.25, 2);
    person(structure, x + 2, 37, Math.PI);
  }
  sign(
    structure,
    "PASS / 合格缓存",
    "CAPACITY 03 / DISPATCH",
    [12, 3.8, 34.8],
    5.2,
    0.85,
  );
  sign(
    structure,
    "NG / 隔离待返修",
    "CAPACITY 02 / DO NOT MIX",
    [0, 3.7, 33.4],
    5.4,
    0.85,
  );
  const slotLights = { good: [], reject: [] };
  for (const [kind, slots] of Object.entries(OUTPUT_SLOTS))
    for (const [x, z] of slots) {
      safetyEdge(structure, x, z, 4, 2.8, 0.976);
      const m = box(
        structure,
        [0.3, 0.16, 0.3],
        [x + 1.85, LINE_Y, z + 1.2],
        kind === "good" ? "green" : "red",
      );
      m.material = m.material.clone();
      m.userData.dynamic = true;
      slotLights[kind].push(m);
    }
  batchStatic(structure);
  // Pool real workpieces. Objects change ownership; no cyclic teleport or
  // duplicate workpiece is generated by an equipment renderer.
  const actors = Array.from({ length: 16 }, () => {
    const part = battery();
    part.group.visible = false;
    base.add(part.group);
    const tag = box(
      part.layers[3],
      [0.33, 0.03, 0.26],
      [0.95, 1.395, 0.55],
      "green",
      false,
    );
    tag.material = mat.green.clone();
    tag.userData.dynamic = true;
    part.tag = tag;
    part.jobId = null;
    selectable(part.group, "workpiece", "在制模组", "workpiece", null, null);
    pickables.push(part.group);
    return part;
  });
  return { structure, stationNodes, heads, actors, slotLights };
}
