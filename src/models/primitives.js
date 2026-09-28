import * as THREE from "three";
export const geo = {
  box: new THREE.BoxGeometry(1, 1, 1),
  cylinder: new THREE.CylinderGeometry(1, 1, 1, 16),
  sphere: new THREE.SphereGeometry(1, 12, 8),
};
export const mat = {};
for (const [key, color] of Object.entries({
  white: "#e8eceb",
  roof: "#f9fbfa",
  concrete: "#bac3c3",
  floor: "#cdd4d2",
  dark: "#354347",
  road: "#697779",
  orange: "#f27735",
  orangeLight: "#ffb66d",
  glass: "#60878d",
  green: "#688776",
  grass: "#adbc9c",
  water: "#85b3bf",
  steel: "#90a3a8",
  black: "#243438",
  blue: "#4c7485",
  red: "#e74c38",
  light: "#fff3ce",
  wood: "#b99a72",
  copper: "#b97943",
  solar: "#334e62",
  skin: "#d1ad91",
  reflector: "#dce8bd",
  foam: "#b0ced3",
}))
  mat[key] = new THREE.MeshStandardMaterial({
    color,
    roughness: key === "steel" ? 0.35 : 0.78,
    metalness: key === "steel" ? 0.55 : 0.05,
  });
export function box(parent, size, pos, material = "white", shadow = true) {
  const m = new THREE.Mesh(
    geo.box,
    typeof material === "string" ? mat[material] : material,
  );
  m.scale.set(...size);
  m.position.set(...pos);
  m.castShadow = shadow;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}
export function cyl(parent, r, h, pos, material = "steel") {
  const m = new THREE.Mesh(geo.cylinder, mat[material]);
  m.scale.set(r, h, r);
  m.position.set(...pos);
  m.castShadow = true;
  parent.add(m);
  return m;
}
export function beam(parent, a, b, width, material = "orange") {
  const start = new THREE.Vector3(...a),
    end = new THREE.Vector3(...b);
  const m = box(
    parent,
    [width, start.distanceTo(end), width],
    start.clone().add(end).multiplyScalar(0.5).toArray(),
    material,
  );
  m.quaternion.setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    end.sub(start).normalize(),
  );
  return m;
}
export function instances(parent, items, material = "white") {
  const m = new THREE.InstancedMesh(geo.box, mat[material], items.length);
  const d = new THREE.Object3D();
  items.forEach((v, i) => {
    d.position.set(...v.p);
    d.scale.set(...v.s);
    d.rotation.set(0, v.r || 0, 0);
    d.updateMatrix();
    m.setMatrixAt(i, d.matrix);
  });
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}
export function label(parent, text, pos, width = 13, color = "#435456") {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 96;
  const ctx = c.getContext("2d");
  ctx.fillStyle = color;
  ctx.font = "600 38px Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(text, 256, 60);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(width, (width * 96) / 512),
    new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
    }),
  );
  m.rotation.x = -Math.PI / 2;
  m.position.set(...pos);
  parent.add(m);
  return m;
}
export function selectable(group, id, name, kind, target, position) {
  group.userData.selectable = { id, name, kind, target, position };
  return group;
}
