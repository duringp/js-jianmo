import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { box, cyl, beam, mat, geo, instances, label } from "./primitives.js";
import { batchStatic } from "../scene/batching.js";

const roundedGeometry = new RoundedBoxGeometry(1, 1, 1, 2, 0.075);
const ringGeometry = new THREE.TorusGeometry(1, 0.09, 6, 24);
export function rounded(parent, size, pos, material = "white") {
  const m = new THREE.Mesh(roundedGeometry, mat[material]);
  m.scale.set(...size);
  m.position.set(...pos);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}
export function pipe(parent, points, radius = 0.06, material = "dark") {
  const curve = new THREE.CatmullRomCurve3(
    points.map((p) => new THREE.Vector3(...p)),
  );
  const mesh = new THREE.Mesh(
    new THREE.TubeGeometry(curve, 20, radius, 6, false),
    mat[material],
  );
  mesh.userData.detailRange = 90;
  parent.add(mesh);
  return mesh;
}
export function ring(parent, r, pos, material = "steel", axis = "z") {
  const m = new THREE.Mesh(ringGeometry, mat[material]);
  m.scale.setScalar(r);
  m.position.set(...pos);
  if (axis === "y") m.rotation.x = Math.PI / 2;
  m.userData.detailRange = 100;
  parent.add(m);
  return m;
}
export function bolts(parent, positions, r = 0.065) {
  const mesh = new THREE.InstancedMesh(
      geo.cylinder,
      mat.steel,
      positions.length,
    ),
    o = new THREE.Object3D();
  positions.forEach((p, i) => {
    o.position.set(...p);
    o.scale.set(r, 0.05, r);
    o.updateMatrix();
    mesh.setMatrixAt(i, o.matrix);
  });
  mesh.userData.detailRange = 65;
  parent.add(mesh);
  return mesh;
}
export function safetyEdge(parent, x, z, w, d, y = 0.97) {
  const bars = [];
  for (let xx = -w / 2; xx < w / 2; xx += 0.9)
    for (const zz of [-d / 2, d / 2])
      bars.push({ s: [0.4, 0.018, 0.35], p: [x + xx, y, z + zz], r: -0.5 });
  const mesh = instances(parent, bars, "orange");
  mesh.castShadow = false;
}
export function pallet(parent, x, y, z, w = 2.1, d = 1.5) {
  for (const dx of [-w * 0.37, 0, w * 0.37])
    box(parent, [0.17, 0.22, d], [x + dx, y + 0.11, z], "wood", false);
  for (let i = 0; i < 5; i++)
    box(
      parent,
      [w, 0.09, d / 6],
      [x, y + 0.27, z - d * 0.4 + i * d * 0.2],
      "wood",
      false,
    );
}
export function person(parent, x, z, rotation = 0, vest = "orange") {
  const g = new THREE.Group();
  g.position.set(x, 0.925, z);
  g.rotation.y = rotation;
  parent.add(g);
  rounded(g, [0.5, 0.65, 0.3], [0, 1.04, 0], vest);
  box(g, [0.52, 0.06, 0.32], [0, 0.94, 0], "reflector", false);
  for (const dx of [-0.14, 0.14]) {
    box(g, [0.17, 0.63, 0.2], [dx, 0.43, 0], "blue");
    rounded(g, [0.22, 0.15, 0.35], [dx, 0.1, 0.05], "dark");
    beam(g, [dx * 2, 1.24, 0], [dx * 2.4, 0.73, 0.06], 0.13, "blue");
  }
  const head = new THREE.Mesh(geo.sphere, mat.skin);
  head.scale.set(0.18, 0.21, 0.18);
  head.position.y = 1.56;
  g.add(head);
  const helmet = new THREE.Mesh(geo.sphere, mat.light);
  helmet.scale.set(0.23, 0.14, 0.23);
  helmet.position.y = 1.72;
  g.add(helmet);
  cyl(g, 0.25, 0.045, [0, 1.65, 0], "light");
  batchStatic(g);
  return g;
}
export function cabinet(parent, x, y, z, w = 1.2, h = 2) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  parent.add(g);
  rounded(g, [w, h, 0.7], [0, h / 2, 0], "white");
  box(g, [w - 0.15, h - 0.2, 0.03], [0, h / 2, 0.366], "concrete");
  box(g, [0.06, 0.28, 0.06], [w * 0.3, h * 0.53, 0.4], "dark");
  for (let i = 0; i < 5; i++)
    box(g, [w * 0.6, 0.025, 0.04], [0, 0.25 + i * 0.075, 0.39], "dark", false);
  box(g, [0.2, 0.18, 0.04], [-w * 0.25, h * 0.78, 0.4], "orange");
  batchStatic(g);
  return g;
}
export function detailBuilding(g, roof, w, d, open) {
  const ribs = [];
  for (let x = -w / 2 + 0.8; x < w / 2; x += 1.25)
    ribs.push({ s: [0.055, 6.3, 0.055], p: [x, 4, -d / 2 - 0.26] });
  for (let z = -d / 2 + 0.8; z < d / 2; z += 1.25)
    ribs.push({ s: [0.055, 6.3, 0.055], p: [-w / 2 - 0.26, 4, z] });
  instances(g, ribs, "concrete").castShadow = false;
  for (const x of [-w / 2 + 0.35, w / 2 - 0.35]) {
    cyl(g, 0.12, 7, [x, 3.8, -d / 2 - 0.4], "steel");
    box(g, [0.5, 0.4, 0.5], [x, 0.8, -d / 2 - 0.4], "dark");
  }
  if (!open) {
    for (let x = -w / 2 + 7; x < w / 2 - 4; x += 12) {
      box(g, [5, 4.1, 0.15], [x, 2.7, d / 2 + 0.35], "dark");
      box(g, [4.3, 3.4, 0.12], [x, 2.5, d / 2 + 0.46], "steel");
      for (let y = 1; y < 4.1; y += 0.3)
        box(g, [4.2, 0.04, 0.045], [x, y, d / 2 + 0.54], "concrete", false);
      for (const dx of [-2.45, 2.45])
        box(g, [0.18, 4.3, 0.2], [x + dx, 2.65, d / 2 + 0.5], "orange");
      box(g, [5.8, 0.15, 2.5], [x, 4.85, d / 2 + 1.2], "dark");
      box(g, [4.8, 0.4, 2.5], [x, 0.8, d / 2 + 1.5], "concrete");
      safetyEdge(g, x, d / 2 + 2.7, 4.8, 0.2, 1.01);
    }
  } else {
    // Independently hide overhead steelwork in equipment inspection shots.
    const upper = new THREE.Group();
    g.add(upper);
    g.userData.upperStructure = upper;
    for (let x = -w / 2 + 8; x < w / 2; x += 16) {
      beam(upper, [x, 7.4, -d / 2], [x, 8.5, 0], 0.14, "steel");
      beam(upper, [x, 8.5, 0], [x, 7.4, d / 2], 0.14, "steel");
      beam(upper, [x, 7.35, -d / 2], [x, 7.35, d / 2], 0.1, "steel");
    }
    const trays = [];
    for (let x = -w / 2 + 2; x < w / 2 - 1; x += 2)
      trays.push({ s: [1.8, 0.12, 0.7], p: [x, 6.7, -d / 2 + 1.2] });
    instances(upper, trays, "dark");
    batchStatic(upper);
  }
  const solar = [];
  const lines = [];
  for (let x = -w / 2 + 3; x < w / 2 - 2; x += 3)
    for (const z of [-7, -4]) {
      solar.push({ s: [2.5, 0.14, 2.2], p: [x, 8.28, z] });
      for (let k = -1; k <= 1; k++)
        lines.push({ s: [0.025, 0.018, 2.12], p: [x + k * 0.76, 8.36, z] });
      lines.push({ s: [2.45, 0.018, 0.03], p: [x, 8.36, z] });
    }
  instances(roof, solar, "solar");
  instances(roof, lines, "steel").castShadow = false;
  for (let x = -w / 2 + 6; x < w / 2; x += 13) {
    for (const dx of [-1.15, 1.15]) {
      cyl(roof, 0.75, 0.12, [x + dx, 8.95, 0], "black");
      ring(roof, 0.69, [x + dx, 9.03, 0], "steel", "y");
      for (let a = 0; a < 3; a++) {
        const blade = box(
          roof,
          [1.1, 0.04, 0.12],
          [x + dx, 9.035, 0],
          "steel",
          false,
        );
        blade.rotation.y = (a * Math.PI) / 3;
      }
    }
  }
  // Fire service cabinets and facade signage are outside the swept vehicle lanes.
  cabinet(g, -w / 2 + 1.4, 0.7, d / 2 + 0.7, 1, 1.7);
}
export function detailedContainer(
  parent,
  size,
  pos,
  color = "orange",
  code = "CP 2048",
) {
  const [w, h, d] = size,
    [x, y, z] = pos;
  rounded(parent, size, pos, color);
  const ribs = [];
  for (let dz = -d / 2 + 0.4; dz < d / 2 - 0.2; dz += 0.52)
    for (const dx of [-w / 2 - 0.025, w / 2 + 0.025])
      ribs.push({ s: [0.065, h - 0.3, 0.075], p: [x + dx, y, z + dz] });
  instances(parent, ribs, color).castShadow = false;
  for (const dx of [-w / 2 + 0.1, w / 2 - 0.1])
    for (const dz of [-d / 2 + 0.08, d / 2 - 0.08])
      box(parent, [0.14, h + 0.05, 0.14], [x + dx, y, z + dz], "steel", false);
  for (const dx of [-w * 0.24, w * 0.24]) {
    box(
      parent,
      [w * 0.45, h - 0.17, 0.075],
      [x + dx, y, z + d / 2 + 0.06],
      color,
    );
    box(
      parent,
      [0.05, h - 0.35, 0.07],
      [x + dx, y, z + d / 2 + 0.115],
      "steel",
      false,
    );
    box(
      parent,
      [0.3, 0.05, 0.07],
      [x + dx, y - 0.25, z + d / 2 + 0.16],
      "steel",
      false,
    );
  }
  if (typeof document !== "undefined") {
    const text = label(
      parent,
      code,
      [x, y + h / 2 + 0.05, z],
      w * 0.75,
      "#e6eee9",
    );
    return text;
  }
}
export function detailCrane(g) {
  // Lattice bracing, access ladder, walkways and a glazed operator cabin.
  for (const z of [-5, 5])
    for (let x = -8; x < 19; x += 3) {
      beam(g, [x, 20.6, z], [x + 3, 22, z], 0.15, "orangeLight");
      beam(g, [x, 22, z], [x + 3, 20.6, z], 0.15, "orangeLight");
    }
  for (const z of [-5, 5]) box(g, [30, 0.18, 0.2], [6, 22.05, z], "orange");
  box(g, [28, 0.12, 0.8], [6, 20.6, -6], "steel");
  for (let x = -7; x < 20; x += 2)
    box(g, [0.06, 1.1, 0.06], [x, 21.2, -6.3], "steel", false);
  box(g, [28, 0.06, 0.06], [6, 21.75, -6.3], "steel", false);
  for (const z of [-5.35, -4.65])
    box(g, [0.08, 18, 0.08], [-5.6, 10, z], "steel");
  for (let y = 2; y < 19; y += 0.5)
    box(g, [0.1, 0.07, 0.8], [-5.6, y, -5], "steel", false);
  rounded(g, [2.5, 2.3, 2.5], [-2, 18, -6], "white");
  box(g, [2.2, 1.3, 0.06], [-2, 18.3, -7.28], "glass");
  box(g, [0.06, 1.3, 2.2], [-0.72, 18.3, -6], "glass");
  for (const z of [-5, 5])
    for (const x of [-7, 7]) {
      const wheel = cyl(g, 0.5, 1, [x, 0.6, z], "black");
      wheel.rotation.z = Math.PI / 2;
    }
  batchStatic(g);
}
export function detailShip(ship) {
  const rails = [];
  for (const x of [-5.85, 5.85]) {
    for (let z = -19; z <= 25; z += 2)
      rails.push({ s: [0.06, 0.9, 0.06], p: [x, 2, z] });
    rails.push({ s: [0.06, 0.06, 44], p: [x, 2.45, 3] });
  }
  instances(ship, rails, "white").castShadow = false;
  for (const x of [-4, 4]) {
    rounded(ship, [1.8, 1.1, 4], [x, 2.3, 15], "orange");
    for (let z = 13.5; z < 17; z += 1)
      box(ship, [1.85, 0.07, 0.1], [x, 2.9, z], "white", false);
  }
  cyl(ship, 0.13, 6, [0, 9, 21], "steel");
  beam(ship, [-2, 10, 21], [2, 10, 21], 0.08, "steel");
  box(ship, [3.8, 0.35, 0.8], [0, 11, 21], "white");
  cyl(ship, 0.6, 2, [2.8, 7.5, 23], "dark");
  cyl(ship, 0.62, 0.15, [2.8, 8.5, 23], "orange");
  for (let x = -4; x <= 4; x += 1.3)
    box(ship, [0.07, 1, 0.08], [x, 5.2, 25.1], "white", false);
  for (let z = -24; z < 17; z += 8) {
    cyl(ship, 0.2, 0.4, [-5.2, 1.8, z], "dark");
    cyl(ship, 0.2, 0.4, [5.2, 1.8, z], "dark");
  }
}
