import * as THREE from "three";
import {
  box,
  cyl,
  beam,
  mat,
  geo,
  instances,
  selectable,
} from "./primitives.js";
import {
  rounded,
  pipe,
  ring,
  bolts,
  pallet,
  cabinet,
  person,
} from "./details.js";
import { batchStatic } from "../scene/batching.js";
const signCache = new Map();
export function sign(parent, title, subtitle, pos, w = 5, h = 1.25, angle = 0) {
  if (typeof document === "undefined") return null;
  const key = title + "|" + subtitle;
  let material = signCache.get(key);
  if (!material) {
    const c = document.createElement("canvas");
    c.width = 768;
    c.height = 192;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#35484b";
    ctx.fillRect(0, 0, 768, 192);
    ctx.fillStyle = "#ee803c";
    ctx.fillRect(0, 0, 14, 192);
    ctx.fillStyle = "#f0f3e9";
    ctx.font = "600 56px Arial, sans-serif";
    ctx.fillText(title, 39, 83);
    ctx.fillStyle = "#aebfc0";
    ctx.font = "24px Arial, sans-serif";
    ctx.fillText(subtitle, 42, 140);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    material = new THREE.MeshBasicMaterial({ map: tex });
    signCache.set(key, material);
  }
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), material);
  m.position.set(...pos);
  m.rotation.y = angle;
  parent.add(m);
  return m;
}
export function forklift(parent, x, z, rotation = 0) {
  const g = new THREE.Group();
  g.position.set(x, 0.01, z);
  g.rotation.y = rotation;
  parent.add(g);
  rounded(g, [2.1, 1, 2.5], [0, 1.1, -0.3], "orange");
  box(g, [1.8, 0.22, 2.8], [0, 0.65, 0], "dark");
  for (const xx of [-1, 1])
    for (const zz of [-1.05, 1.1]) {
      const tire = cyl(g, 0.48, 0.28, [xx, 0.63, zz], "black");
      tire.rotation.z = Math.PI / 2;
      const hub = cyl(g, 0.25, 0.3, [xx, 0.63, zz], "steel");
      hub.rotation.z = Math.PI / 2;
    }
  for (const xx of [-0.8, 0.8]) {
    box(g, [0.12, 2.6, 0.12], [xx, 2.15, -0.9], "dark");
    box(g, [0.12, 2.6, 0.12], [xx, 2.15, 0.6], "dark");
    box(g, [0.14, 3.4, 0.22], [xx, 2.1, 1.5], "steel");
    box(g, [0.12, 0.11, 2], [xx, 0.5, 2.25], "steel");
  }
  box(g, [1.95, 0.16, 2.2], [0, 3.45, -0.2], "orange");
  box(g, [1.85, 0.22, 0.22], [0, 1.1, 1.57], "dark");
  rounded(g, [0.7, 0.3, 0.7], [0, 1.65, -0.4], "black");
  rounded(g, [0.7, 0.85, 0.18], [0, 2, -0.7], "black");
  const wheel = ring(g, 0.23, [0, 2.13, 0.43], "dark");
  wheel.rotation.x = -0.5;
  beam(g, [0, 1.2, 0.3], [0, 2.1, 0.44], 0.06, "steel");
  cyl(g, 0.12, 0.22, [0.6, 3.62, -0.6], "orangeLight");
  sign(g, "FL-02", "ELECTRIC / 2.5 T", [0, 1.1, -1.565], 1.4, 0.4, Math.PI);
  pipe(
    g,
    [
      [-0.65, 0.7, 1.3],
      [-0.65, 2, 1.23],
      [-0.5, 3.3, 1.3],
    ],
    0.045,
    "black",
  );
  batchStatic(g);
  selectable(
    g,
    `forklift-${x}`,
    "电动叉车 · 装卸待命",
    "forklift",
    [x, 1.5, z],
    [x + 8, 7, z + 11],
  );
  return g;
}
export function preprocessing(g) {
  const fanRotors = [];
  for (let x = -14; x <= 14; x += 14) {
    rounded(g, [9, 3.6, 7], [x, 2.6, 0], "white");
    for (const dx of [-3.8, 3.8])
      for (const z of [-2.8, 2.8]) cyl(g, 0.2, 0.2, [x + dx, 0.7, z], "steel");
    box(g, [8.5, 0.2, 7.3], [x, 4.5, 0], "orange");
    for (const dx of [-2.3, 2.3]) {
      box(g, [3.9, 2.5, 0.1], [x + dx, 2.65, 3.55], "dark");
      box(g, [3.45, 2.08, 0.06], [x + dx, 2.8, 3.62], "glass");
      box(g, [0.07, 0.75, 0.12], [x + dx + 1.35, 2.3, 3.69], "steel");
    }
    sign(
      g,
      "CELL CONDITIONING",
      "DRY ROOM / LINE " + String(x + 15).padStart(2, "0"),
      [x, 4.16, 3.68],
      6,
      0.65,
    );
    for (const z of [-1.5, 1.5]) {
      cyl(g, 0.95, 0.2, [x, 4.72, z], "dark");
      ring(g, 0.92, [x, 4.85, z], "steel", "y");
      const rotor = new THREE.Group();
      rotor.position.set(x, 4.85, z);
      g.add(rotor);
      for (let i = 0; i < 3; i++) {
        const blade = box(rotor, [1.35, 0.05, 0.2], [0, 0, 0], "steel", false);
        blade.rotation.y = (i * Math.PI) / 3;
      }
      batchStatic(rotor);
      fanRotors.push(rotor);
    }
    cabinet(g, x + 5, 0.65, -2.7, 1.2, 2.6);
  }
  for (const z of [-6.8, 6.8])
    box(g, [38, 0.025, 0.12], [0, 0.64, z], "orange", false);
  person(g, -17, 7.5, 0.3).position.y = 0.575;
  batchStatic(g);
  return fanRotors;
}
export const EXTRA_OBSTACLES = [
  [-56, -12.5, 6.8, 2.7],
  [-82.5, 34, 6.6, 6.8],
  [-83, -24, 4, 14],
];
export function serviceFacilities(base, pickables) {
  const lift = forklift(base, -56, -12.5, Math.PI / 2);
  pickables.push(lift);
  // Gatehouse and utility cabinets are in the western service strip, away from the loop.
  const gate = new THREE.Group();
  gate.position.set(-83, 0.2, 34);
  base.add(gate);
  rounded(gate, [5, 3.6, 6.3], [0, 2, 0], "white");
  box(gate, [5.4, 0.25, 6.8], [0, 3.95, 0], "dark");
  for (const x of [-2.52, 2.52])
    box(gate, [0.04, 1.3, 4.6], [x, 2.5, 0], "glass");
  box(gate, [3.8, 1.3, 0.05], [0, 2.5, 3.17], "glass");
  for (const z of [-1.8, 0, 1.8])
    box(gate, [0.08, 1.5, 0.07], [2.55, 2.5, z], "white");
  sign(gate, "GATE 01", "SECURITY / CELLPORT", [0, 3.55, 3.18], 4, 0.6);
  box(gate, [1.1, 0.05, 3.5], [3.15, 1.1, 0], "steel");
  for (let z = -1.4; z < 2; z += 0.7)
    box(gate, [0.08, 0.25, 0.2], [3.15, 1.25, z], "orange", false);
  batchStatic(gate);
  selectable(
    gate,
    "gatehouse",
    "园区门岗与访客入口",
    "gatehouse",
    [-83, 2, 34],
    [-65, 17, 51],
  );
  pickables.push(gate);
  for (const z of [-29, -24, -19]) {
    cabinet(base, -83, 0.3, z, 3.4, 3.5);
    for (let y = 0.7; y < 2.7; y += 0.25)
      box(base, [3, 0.06, 0.06], [-83, y, z + 0.39], "dark", false);
    box(base, [3.8, 0.16, 1], [-83, 3.95, z], "orange");
  }
  for (const [x, z] of [
    [-63, -15],
    [53, 18],
    [-65, 37],
  ]) {
    cyl(base, 0.18, 0.9, [x, 0.67, z], "red");
    cyl(base, 0.25, 0.16, [x, 1.17, z], "red");
    const outlet = cyl(base, 0.1, 0.6, [x, 0.93, z], "steel");
    outlet.rotation.z = Math.PI / 2;
    box(base, [1.3, 0.04, 1.3], [x, 0.21, z], "white", false);
  }
  const fence = [];
  for (let z = -52; z < 51; z += 3) {
    fence.push({ s: [0.09, 2, 0.09], p: [-87, 1.2, z] });
    for (const y of [0.5, 1.1, 1.8])
      fence.push({ s: [0.04, 0.045, 3], p: [-87, y, z + 1.5] });
  }
  instances(base, fence, "steel").castShadow = false;
  for (const x of [-68, 58])
    for (const z of [-51, 50]) {
      const pole = new THREE.Group();
      pole.position.set(x, 0, z);
      base.add(pole);
      cyl(pole, 0.09, 4.8, [0, 2.6, 0], "steel");
      beam(pole, [0, 5, 0], [1.2, 5, 0], 0.08, "steel");
      rounded(pole, [0.6, 0.3, 0.4], [1.15, 4.85, 0], "white");
      box(pole, [0.08, 0.15, 0.18], [1.49, 4.85, 0], "black");
      batchStatic(pole);
    }
}
export function shapedHull(ship) {
  const points = [
    [-6.3, 25],
    [-6.3, -20],
    [-5, -25],
    [0, -31],
    [5, -25],
    [6.3, -20],
    [6.3, 25],
  ];
  const outline = new THREE.Shape();
  outline.moveTo(...points[0]);
  points.slice(1).forEach((p) => outline.lineTo(...p));
  outline.closePath();
  const hullGeo = new THREE.ExtrudeGeometry(outline, {
    depth: 2.2,
    bevelEnabled: true,
    bevelSegments: 1,
    steps: 1,
    bevelSize: 0.3,
    bevelThickness: 0.2,
  });
  hullGeo.rotateX(Math.PI / 2);
  const hull = new THREE.Mesh(hullGeo, mat.dark);
  hull.position.y = 1.28;
  hull.castShadow = true;
  hull.receiveShadow = true;
  ship.add(hull);
  const deckGeo = new THREE.ShapeGeometry(outline);
  deckGeo.rotateX(Math.PI / 2);
  const deck = new THREE.Mesh(
    deckGeo,
    new THREE.MeshStandardMaterial({
      color: "#c7cfc9",
      side: THREE.DoubleSide,
      roughness: 0.8,
    }),
  );
  deck.position.y = 1.52;
  deck.receiveShadow = true;
  ship.add(deck);
  for (const x of [-2, 2]) {
    cyl(ship, 0.48, 0.2, [x, 1.68, -25], "steel");
    cyl(ship, 0.18, 0.5, [x, 1.93, -25], "dark");
  }
  pipe(
    ship,
    [
      [-5.8, 2.3, -20],
      [-4.8, 2.3, -25],
      [0, 2.3, -30],
      [4.8, 2.3, -25],
      [5.8, 2.3, -20],
    ],
    0.05,
    "white",
  );
  for (const x of [-2, 2])
    pipe(
      ship,
      [
        [x, 1.95, -25],
        [x, 1.72, -26.5],
        [0, 1.65, -28],
      ],
      0.065,
      "dark",
    );
  sign(
    ship,
    "CELLPORT 07",
    "ELECTRIC LOGISTICS",
    [-6.66, 0.5, 13],
    9,
    1,
    -Math.PI / 2,
  );
}
export function waterDetails(base) {
  const ripples = [];
  for (let i = 0; i < 46; i++) {
    const x = 98 + ((i * 13) % 30),
      z = -58 + ((i * 17) % 117);
    if (x > 105 && x < 121 && z > -46 && z < 12) continue;
    ripples.push({
      s: [1.4 + (i % 4), 0.012, 0.05],
      p: [x, -0.107, z],
      r: 0.08,
    });
  }
  instances(base, ripples, "foam").castShadow = false;
  for (const z of [-48, 47]) {
    cyl(base, 0.55, 0.45, [120, 0.05, z], "orange");
    cyl(base, 0.08, 2, [120, 1, z], "steel");
    cyl(base, 0.18, 0.35, [120, 2.1, z], "green");
  }
}
