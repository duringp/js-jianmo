import * as THREE from "three";
export function createWorld(container) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#edf0ec");
  scene.fog = new THREE.Fog("#edf0ec", 250, 610);
  const camera = new THREE.PerspectiveCamera(
    39,
    innerWidth / innerHeight,
    0.2,
    900,
  );
  camera.position.set(166, 143, 181);
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: "high-performance",
  });
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.7));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  container.appendChild(renderer.domElement);
  scene.add(new THREE.HemisphereLight("#fcfffa", "#9aa5a4", 2.3));
  const sun = new THREE.DirectionalLight("#fff4df", 3.1);
  sun.position.set(-65, 140, 65);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, {
    left: -140,
    right: 140,
    top: 110,
    bottom: -110,
    near: 1,
    far: 340,
  });
  sun.shadow.normalBias = 0.035;
  sun.shadow.bias = -0.00015;
  sun.shadow.camera.updateProjectionMatrix();
  scene.add(sun);
  const fill = new THREE.DirectionalLight("#d8ecff", 0.8);
  fill.position.set(70, 50, -90);
  scene.add(fill);
  const resize = () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  };
  addEventListener("resize", resize);
  return { scene, camera, renderer };
}
