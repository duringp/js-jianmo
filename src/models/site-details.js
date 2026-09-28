import * as THREE from "three";
import { box, cyl, beam, instances, label, mat, geo } from "./primitives.js";
import {
  cabinet,
  person,
  pallet,
  rounded,
  ring,
  safetyEdge,
  pipe,
} from "./details.js";
import { batchStatic } from "../scene/batching.js";
// Static objects exposed as collision footprints for the road-clearance regression.
export const DETAIL_OBSTACLES = [
  [-49, -12.9, 8, 2.6],
  [49, -12.9, 8, 2.6],
  [-68, 22, 3, 9],
  [58, -27, 3, 13],
  [25, 30, 3, 7],
  [93.6, -2, 20.8, 111],
];
export function warehouseInterior(g) {
  const posts = [],
    beams = [],
    loads = [],
    wood = [];
  for (let x = -26; x < 30; x += 8)
    for (const z of [-6, 3]) {
      for (const dx of [-2.7, 2.7])
        for (const dz of [-2, 2])
          posts.push({ s: [0.14, 6.1, 0.14], p: [x + dx, 3.7, z + dz] });
      for (const y of [1, 3, 5]) {
        for (const dz of [-2, 2])
          beams.push({ s: [5.6, 0.18, 0.12], p: [x, y, z + dz] });
        for (const dx of [-1.45, 1.45]) {
          wood.push({ s: [2.5, 0.15, 3.6], p: [x + dx, y + 0.18, z] });
          loads.push({ s: [2.15, 1.35, 3.2], p: [x + dx, y + 0.94, z] });
        }
      }
    }
  instances(g, posts, "blue");
  instances(g, beams, "orange");
  instances(g, wood, "wood");
  instances(
    g,
    loads.filter((_, i) => i % 3 === 0),
    "white",
  );
  instances(
    g,
    loads.filter((_, i) => i % 3 === 1),
    "orangeLight",
  );
  instances(
    g,
    loads.filter((_, i) => i % 3 === 2),
    "steel",
  );
  for (const z of [-1.4, 7.6]) {
    box(g, [58, 0.022, 0.09], [0, 0.63, z], "orange", false);
  }
  label(g, "RACK A  /  AUTOMATED STORAGE", [0, 0.65, -1.5], 32);
}
export function workshopDetails(base, hall) {
  const supports = [];
  for (let x = -58; x < 14; x += 4)
    for (const z of [27.2, 28.8])
      supports.push({ s: [0.12, 0.7, 0.12], p: [x, 0.65, z] });
  instances(base, supports, "dark");
  for (let x = -59; x < 14; x += 1.5) {
    const roller = cyl(base, 0.12, 1.65, [x, 1.14, 28], "steel");
    roller.rotation.x = Math.PI / 2;
  }
  for (const z of [27, 29])
    box(base, [74, 0.18, 0.13], [-23, 1.12, z], "orange");
  for (const x of [-59, -39, -19, 2]) {
    cabinet(base, x, 0.96, 34, 1.4, 2.2);
    safetyEdge(base, x, 34, 3.1, 3.2, 0.975);
  }
  person(base, -43, 33, 0.5);
  person(base, -14, 34, -0.4, "reflector");
  person(base, 12, 36, -1.5);
  for (const x of [-61, -41, -21]) {
    const frame = new THREE.Group();
    frame.position.set(x, 0.96, 19);
    base.add(frame);
    for (const xx of [-2.5, 2.5])
      box(frame, [0.1, 2.3, 0.1], [xx, 1.15, 0], "orange");
    for (const y of [0.6, 1.5, 2.2])
      box(frame, [5, 0.06, 0.06], [0, y, 0], "steel");
    for (let xx = -2.3; xx < 2.5; xx += 0.35)
      box(frame, [0.025, 2, 0.025], [xx, 1.1, 0], "steel", false);
    batchStatic(frame);
  }
  // QA benches, toolboards and reusable transport crates at the aisle edge.
  for (const x of [-53, -33]) {
    box(base, [5, 0.2, 2.1], [x, 1.95, 35], "white");
    for (const dx of [-2, 2])
      box(base, [0.14, 1, 0.14], [x + dx, 1.45, 35], "steel");
    box(base, [4.8, 1.4, 0.08], [x, 2.6, 34], "blue");
    for (let i = 0; i < 6; i++)
      box(
        base,
        [0.15, 0.5, 0.12],
        [x - 1.7 + i * 0.65, 2.65, 34.1],
        "steel",
        false,
      );
  }
  const parts = [];
  for (let i = 0; i < 7; i++) {
    const g = new THREE.Group();
    g.position.set(-57 + i * 10, 1.28, 28);
    base.add(g);
    rounded(g, [1.8, 0.48, 1.15], [0, 0.24, 0], "dark");
    for (let x = -0.65; x < 0.8; x += 0.3)
      box(g, [0.2, 0.08, 1], [x, 0.52, 0], "steel");
    batchStatic(g);
    parts.push(g);
  }
  return parts;
}
export function campusDetails(base, office) {
  for (const [x, z, w, d] of DETAIL_OBSTACLES) {
    box(base, [w, 0.12, d], [x, 0.26, z], "concrete");
  }
  for (const x of [-51, -48, -45, 47, 50, 53]) {
    pallet(base, x, 0.33, -13, 2.1, 1.5);
    rounded(base, [1.9, 1.2, 1.35], [x, 1.2, -13], x < 0 ? "wood" : "white");
    for (const dx of [-0.55, 0.55])
      box(base, [0.07, 1.26, 1.4], [x + dx, 1.2, -13], "dark", false);
  }
  // Charging bays on the inner shoulder, outside the road's swept envelope.
  for (const z of [19, 22, 25]) {
    cabinet(base, -68, 0.33, z, 1.2, 1.8);
    pipe(
      base,
      [
        [-67.6, 1.8, z + 0.3],
        [-66.9, 1.3, z + 0.5],
        [-67, 0.5, z + 0.7],
      ],
      0.06,
      "black",
    );
  }
  for (const z of [-31, -27, -23]) {
    cyl(base, 1.15, 3.3, [58, 2, z], "white");
    ring(base, 1.17, [58, 2.8, z], "steel", "y");
    cyl(base, 0.18, 1, [58, 4, z], "steel");
    pipe(
      base,
      [
        [58, 4, z],
        [57, 4.3, z],
        [56.8, 1.4, z],
      ],
      0.12,
      "steel",
    );
  }
  // Office glazing mullions, entrance canopy and rooftop ventilation.
  for (let x = -12; x < 14; x += 3)
    for (const z of [-10.08, 10.08])
      box(office, [0.12, 5, 0.08], [x, 3, z], "white", false);
  for (const x of [-13.58, 13.58])
    for (let z = -9; z < 10; z += 3)
      box(office, [0.08, 5, 0.12], [x, 3, z], "white", false);
  box(office, [3, 0.2, 7], [-14.5, 3.2, 0], "steel");
  for (const z of [-3, 3]) cyl(office, 0.1, 2.7, [-15.6, 1.8, z], "steel");
  for (let x = -9; x < 11; x += 6)
    rounded(office, [3.5, 1.1, 2.7], [x, 7.1, -5], "white");
  const shrubs = [];
  for (let x = -62; x < 59; x += 7)
    for (const z of [-57.7, 57.5]) {
      const m = new THREE.Mesh(geo.sphere, mat.green);
      m.position.set(x, 1, z);
      m.scale.set(1.5, 0.7, 0.8);
      base.add(m);
    }
  for (const x of [-67, 60])
    for (let z = -39; z < 40; z += 8) {
      if (x === 60 && z > -10 && z < 15) continue;
      box(base, [0.3, 0.8, 0.3], [x, 0.6, z], "orange");
      box(base, [0.33, 0.12, 0.33], [x, 0.93, z], "white", false);
    }
  person(base, -47, -11, 0.5).position.y = 0.135;
  person(base, 42, 40.7, 2, "reflector").position.y = 0.135;
  // Railings and quay fenders stop short of crane wheel tracks.
  for (let z = -49; z < 50; z += 6) {
    cyl(base, 0.28, 0.6, [103.5, 0.8, z], "dark");
    box(base, [0.5, 1.6, 2], [104.2, 0, z], "black");
  }
  for (const x of [86, 100])
    box(base, [0.17, 0.055, 104], [x, 0.725, -2], "steel", false);
  for (const z of [-52, 50]) {
    box(base, [10, 0.08, 0.15], [88, 1.6, z], "steel");
    for (let x = 84; x < 94; x += 2)
      box(base, [0.07, 1, 0.07], [x, 1.1, z], "steel");
  }
  for (const z of [-40, -17, 29]) {
    const cone = new THREE.Mesh(
      new THREE.ConeGeometry(0.3, 0.8, 12),
      mat.orange,
    );
    cone.position.set(76, 0.68, z);
    base.add(cone);
    box(base, [0.7, 0.1, 0.7], [76, 0.28, z], "black");
  }
  label(base, "CHARGE / 03", [-68, 0.38, 29], 5);
  label(base, "INBOUND", [-47, 0.32, -10.5], 9);
  label(base, "OUTBOUND", [49, 0.32, -10.5], 10);
}
