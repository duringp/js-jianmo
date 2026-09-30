import "@fontsource/dm-sans/latin-400.css";
import "@fontsource/dm-sans/latin-500.css";
import "@fontsource/dm-sans/latin-600.css";
import "@fontsource/dm-sans/latin-700.css";
import "@fontsource/barlow-condensed/latin-500.css";
import "./style.css";
import * as THREE from "three";
import {
  createIcons,
  Factory,
  Boxes,
  Anchor,
  ScanLine,
  Bot,
  Play,
  Pause,
  RotateCcw,
  Route,
  Layers3,
  Sun,
  CircleHelp,
  ChevronRight,
  Maximize2,
  BatteryCharging,
  Activity,
  ArrowUpRight,
  TriangleAlert,
  X,
  Eye,
  EyeOff,
  MousePointer2,
  Box as BoxIcon,
  Gauge,
  Navigation,
  Check,
} from "lucide";
import { createDetailCulling } from "./scene/detail-culling.js";
import { createWorld } from "./scene/world.js";
import { createBase } from "./models/base.js";
import { Simulation } from "./simulation/engine.js";
import { createController } from "./interaction/controller.js";
import { STATIONS } from "./simulation/production-line.js";
import { ROBOT_PHASES } from "./simulation/process.js";
const icon = (n) => `<i data-lucide="${n}"></i>`;
document.querySelector("#app").innerHTML = `
<div id="viewport" aria-label="可交互三维电池模组装配基地"></div>
<header class="topbar"><a class="brand" href="/" aria-label="CELLPORT 首页"><span class="brand-symbol">${icon("battery-charging")}</span><span>CELL<span class="brand-light">PORT</span><small>INDUSTRIAL DIGITAL TWIN</small></span></a><span class="header-divider"></span><div class="project-title">电池模组装配基地 <span class="version">一期</span><small>BATTERY MODULE ASSEMBLY CAMPUS</small></div><nav><button class="nav-item active" data-view="overview">基地总览</button><button class="nav-item" data-view="workshop">生产车间</button><button class="nav-item" data-view="port">仓储港口</button></nav><div class="system-state"><span class="live-dot"></span><span id="system-text">系统运行正常</span><span class="sim-tag">模拟数据</span></div><time id="clock"></time></header>
<div class="view-heading"><span class="eyebrow">CAMPUS / DIGITAL OPERATIONS</span><h1 id="view-title">全域，一目了然<span>.</span></h1><div class="view-subtitle"><span class="live-dot"></span> 实时场景 <span class="slash">/</span> <span id="view-name">基地总览</span><span class="view-count">01 — 06</span></div></div>
<aside class="left-panels"><section class="panel metrics"><div class="panel-heading"><h2>生产概况</h2><span class="tiny-tag">THIS RUN</span></div><div class="primary-metric"><span class="muted">本轮合格下线</span><div><strong id="output">0</strong><span class="unit">组</span></div><span class="trend">${icon("arrow-up-right")} <b id="target-percent">0.0%</b> <span>模拟批次完成率</span></span></div><div class="target-bar"><span id="target-bar"></span></div><div class="target-caption"><span>计划产量</span><b>100 组</b></div><div class="metric-grid"><div><span>在制数量</span><strong id="availability">0<em>组</em></strong></div><div><span>检测通过率</span><strong id="yield">100<em>%</em></strong></div></div><div class="line-summary"><span>合格出库 <b id="shipped">0</b></span><span>不良隔离 <b id="rejected">0</b></span></div></section>
<section class="panel zones"><div class="panel-heading"><h2>基地分区</h2><span class="mono muted">04 ZONES</span></div>${[
  ["01", "模组装配车间", "ASSEMBLY", "workshop"],
  ["02", "智能仓储", "WAREHOUSE", "warehouse"],
  ["03", "电芯预处理", "PRE-PROCESS", "preprocess"],
  ["04", "智慧港口", "SMART PORT", "port"],
]
  .map(
    ([n, name, en, key]) =>
      `<button class="zone" data-zone="${key}"><span class="zone-num">${n}</span><span>${name}<small>${en}</small></span><span class="zone-dot"></span>${icon("chevron-right")}</button>`,
  )
  .join("")}</section></aside>
<aside class="right-panels"><section class="panel process"><div class="panel-heading"><h2>${icon("activity")} 工序监控</h2><span class="running-pill" id="run-pill">运行中</span></div><button class="equipment-title" data-view="robot"><span class="equipment-icon">${icon("bot")}</span><span><b id="equipment-name">机械臂 A-01</b><small id="equipment-id">MODULE TRANSFER UNIT</small></span>${icon("arrow-up-right")}</button><div class="state-line"><span>当前工序</span><b id="robot-state">等待</b></div><div class="steps">${ROBOT_PHASES.map(([n], i) => `<div class="step" data-step="${i}"><span>${i + 1}</span><small>${n}</small></div>`).join("")}</div><div class="cycle-line"><span>工序进度</span><b id="cycle-time">0.0 / 8.8 s</b></div><div class="process-track"><span id="cycle-bar"></span></div><div class="status-row"><span><i class="small-dot"></i><span id="grip-label">夹爪状态</span></span><b id="grip-state">张开 · 待料</b></div><button class="inspection-link" data-view="inspection"><span>${icon("scan-line")} EOL 检测站</span><b id="inspection-state">夹紧</b>${icon("chevron-right")}</button></section>
<section class="panel logistics"><div class="panel-heading"><h2>物流调度</h2><span class="mono muted">AGV FLEET</span></div><div class="fleet-numbers"><div><strong id="moving-count">8</strong><span>运行车辆</span></div><div><strong id="waiting-count">0</strong><span>等候车辆</span></div><div><strong class="orange" id="fault-count">0</strong><span>故障车辆</span></div></div><div class="traffic-info"><span class="live-dot"></span><span id="traffic-state">路口预约控制已启用</span></div><button id="fault-button" class="fault-button">${icon("triangle-alert")} 注入车辆故障 <span>AGV-01</span></button></section>
<section id="module-panel" class="panel module-panel" hidden><div class="panel-heading"><h2>模组结构</h2><span class="tiny-tag">4 LAYERS</span></div><label class="range-label">分层拆解 <output id="explode-value">0%</output></label><input id="explode" type="range" min="0" max="100" value="0" aria-label="模组分层拆解"/><div class="layer-toggles">${["托盘", "电芯", "母排", "上盖"].map((x, i) => `<label><input type="checkbox" data-layer="${i}" checked/>${x}</label>`).join("")}</div></section>
<section id="selection-panel" class="panel selection-panel" hidden><div class="panel-heading"><h2>已选中对象</h2><button id="close-selection" class="bare" aria-label="关闭对象信息">${icon("x")}</button></div><b id="selected-name"></b><p id="selected-info"></p></section></aside>
<section class="flow-panel panel" id="flow-panel" hidden><div class="flow-heading"><span><b>装配线 A</b><small> SINGLE PIECE FLOW</small></span><span id="buffer-state">合格缓存 0 / 3 · 隔离 0 / 2</span><button id="dispatch-button">暂停出库</button></div><div class="flow-stations">${STATIONS.map((s, i) => `<button data-station="${i}" title="聚焦${s.name}"><span class="flow-number">0${i + 1}</span><b>${s.name}</b><small>待料</small></button>`).join("")}</div><div class="trace-line"><span class="live-dot"></span><span id="line-event">上料等待</span><span id="line-state">工位联锁已启用</span></div></section>
<div id="scene-labels"></div><div class="scene-tools"><button id="roof-button" class="tool" title="切换厂房屋顶" aria-label="切换厂房屋顶">${icon("layers-3")}</button><button id="route-button" class="tool" title="显示车辆路线" aria-label="显示车辆路线">${icon("route")}</button><button id="shadow-button" class="tool active" title="切换阴影" aria-label="切换阴影">${icon("sun")}</button><span></span><button id="reset-button" class="tool" title="重置视角" aria-label="重置视角">${icon("rotate-ccw")}</button><button id="help-button" class="tool" title="操作说明" aria-label="操作说明">${icon("circle-help")}</button></div>
<div class="bottom-left"><div class="compass"><span>N</span><svg viewBox="0 0 48 48"><path d="M24 6L31 34L24 29L17 34Z" fill="#f17b3c"/><path d="M24 6V29L17 34Z" fill="#c6ceca"/></svg></div><div class="scale"><span>20 m</span><i></i></div><span class="coordinate mono">CAMPUS 01<br/>31°12′ N / 121°36′ E</span></div>
<section class="camera-dock"><div class="dock-label"><span>场景导航</span><small>EXPLORE CAMPUS</small></div><div class="camera-buttons">${[
  ["overview", "layout-grid", "基地总览", "01"],
  ["workshop", "factory", "装配车间", "02"],
  ["robot", "bot", "机械臂", "03"],
  ["inspection", "scan-line", "质量检测", "04"],
  ["port", "anchor", "智慧港口", "05"],
  ["module", "boxes", "模组拆解", "06"],
]
  .map(
    ([key, ic, name, n]) =>
      `<button class="camera-button ${key === "overview" ? "active" : ""}" data-view="${key}"><span class="camera-num">${n}</span>${icon(ic === "layout-grid" ? "box" : ic)}<span>${name}</span></button>`,
  )
  .join("")}</div></section>
<div class="playback"><button id="pause-button" class="play-button" aria-label="暂停仿真">${icon("pause")}</button><div><b id="play-state">仿真运行中</b><small class="mono" id="sim-time">00:00:00</small></div><span class="play-divider"></span><select id="speed" aria-label="仿真速度"><option value=".5">0.5×</option><option value="1" selected>1.0×</option><option value="2">2.0×</option></select><button id="cruise-button">${icon("navigation")} 自动巡游</button></div>
<footer><span>${icon("mouse-pointer-2")} 左键旋转 <i>·</i> 滚轮缩放 <i>·</i> 右键平移 <i>·</i> 点击设施聚焦</span><span><i class="live-dot"></i> THREE.JS ENGINE <b id="fps">60 FPS</b><span id="render-stats"></span></span></footer>
<div id="toast" role="status"></div><dialog id="help-dialog"><button id="close-help" class="bare" aria-label="关闭说明">${icon("x")}</button><span class="eyebrow">EXPLORE YOUR CAMPUS</span><h2>从全局，深入每个工序。</h2><p>左键拖动旋转，滚轮缩放，右键拖动平移。点击设施可选中并聚焦，底部导航可进入设备细节。</p><ul><li><b>产线：</b>点击工序卡片聚焦设备；暂停出库可观察缓存满位后逐级等待，恢复后有序继续。</li><li><b>机械臂：</b>观察等待、抓取、搬运、落位、回位，工件跟随夹爪。</li><li><b>模组：</b>拖动拆解滑块，切换托盘、电芯、母排和上盖显隐。</li><li><b>物流：</b>注入 AGV-01 故障可观察停车、跟车等待和警报；再次点击恢复。</li><li><b>巡游：</b>每 9 秒切换镜头，鼠标操作立即接管。</li><li><b>暂停：</b>所有工序和车辆保留当前状态，恢复后连续运行。</li></ul><p class="muted">当前为程序化模型和模拟数据演示，尚未连接真实设备。</p></dialog>`;
const refreshIcons = () =>
  createIcons({
    icons: {
      Factory,
      Boxes,
      Anchor,
      ScanLine,
      Bot,
      Play,
      Pause,
      RotateCcw,
      Route,
      Layers3,
      Sun,
      CircleHelp,
      ChevronRight,
      Maximize2,
      BatteryCharging,
      Activity,
      ArrowUpRight,
      TriangleAlert,
      X,
      Eye,
      EyeOff,
      MousePointer2,
      Box: BoxIcon,
      Gauge,
      Navigation,
      Check,
    },
    attrs: { "stroke-width": 1.7 },
  });
refreshIcons();
const $ = (s) => document.querySelector(s);
const world = createWorld($("#viewport"));
const models = createBase(world.scene);
const sim = new Simulation(models);
const detailCulling = createDetailCulling(world.scene, world.camera);
let monitoredRobot = 0;
let currentView = "overview",
  toastTimer;
function toast(message) {
  $("#toast").textContent = message;
  $("#toast").classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $("#toast").classList.remove("show"), 3400);
}
const controller = createController(
  world,
  models,
  (data) => {
    const panel = $("#selection-panel");
    panel.hidden = !data;
    if (!data) monitoredRobot = 0;
    if (data) {
      monitoredRobot = ["robot-1", "station-robot2"].includes(data.id) ? 1 : 0;
      $("#selected-name").textContent = data.name;
      $("#selected-info").textContent =
        data.kind === "vehicle"
          ? "规划路网行驶 · 安全跟车 · 路口预约"
          : data.kind === "robot"
            ? "状态机驱动 · 同步夹持工件"
            : "点击底部镜头导航，查看设施与工序细节";
    }
  },
  (key, name) => {
    currentView = key;
    document.body.dataset.scene = key;
    $("#flow-panel").hidden = ![
      "workshop",
      "robot",
      "inspection",
      "line",
      "workpiece",
    ].includes(key);
    models.upperStructures.forEach(
      (g) =>
        (g.visible = ![
          "robot",
          "inspection",
          "module",
          "line",
          "workpiece",
          "workshop",
        ].includes(key)),
    );
    $("#view-name").textContent = name;
    $("#view-title").innerHTML =
      key === "overview"
        ? "全域，一目了然<span>.</span>"
        : `${name}<span>.</span>`;
    document
      .querySelectorAll("[data-view]")
      .forEach((b) => b.classList.toggle("active", b.dataset.view === key));
    $("#module-panel").hidden = key !== "module";
    if (key === "warehouse") models.roofs[0].visible = false;
    if (key === "preprocess") models.roofs[1].visible = false;
    if (
      [
        "workshop",
        "robot",
        "inspection",
        "module",
        "line",
        "workpiece",
      ].includes(key)
    ) {
      models.roofs[2].visible = false;
    }
  },
  (active) => {
    $("#cruise-button").classList.toggle("active", active);
    if (!active) toast("自动巡游已退出 · 手动控制");
  },
);
for (const b of document.querySelectorAll("[data-view]"))
  b.onclick = () => controller.go(b.dataset.view);
for (const b of document.querySelectorAll("[data-zone]"))
  b.onclick = () => {
    const key = b.dataset.zone;
    if (key === "warehouse" || key === "preprocess") {
      const index = key === "warehouse" ? 0 : 1;
      const object = models.pickables[index];
      controller.select(object.userData.selectable, object);
    } else controller.go(key);
  };
for (const button of document.querySelectorAll("[data-station]")) {
  button.onclick = () => {
    const node = models.production.stationNodes[Number(button.dataset.station)];
    controller.select(node.userData.selectable, node);
  };
}
$("#dispatch-button").onclick = () => {
  sim.line.outputPaused = !sim.line.outputPaused;
  $("#dispatch-button").textContent = sim.line.outputPaused
    ? "恢复出库"
    : "暂停出库";
  $("#dispatch-button").classList.toggle("active", sim.line.outputPaused);
  toast(
    sim.line.outputPaused
      ? "出库已暂停 · 缓存满位后上游将逐级等待"
      : "出库已恢复 · 工位按空位继续交接",
  );
};
$("#pause-button").onclick = () => {
  sim.paused = !sim.paused;
  $("#pause-button").innerHTML = icon(sim.paused ? "play" : "pause");
  $("#pause-button").setAttribute(
    "aria-label",
    sim.paused ? "恢复仿真" : "暂停仿真",
  );
  $("#play-state").textContent = sim.paused ? "仿真已暂停" : "仿真运行中";
  $("#run-pill").textContent = sim.paused ? "已暂停" : "运行中";
  $("#run-pill").classList.toggle("paused", sim.paused);
  refreshIcons();
};
$("#speed").onchange = (e) => (sim.speed = Number(e.target.value));
$("#cruise-button").onclick = () => controller.toggleCruise();
$("#reset-button").onclick = () => controller.go("overview");
$("#fault-button").onclick = () => {
  const fault = sim.toggleFault();
  $("#fault-button").classList.toggle("faulted", fault);
  $("#fault-button").innerHTML =
    `${icon(fault ? "check" : "triangle-alert")} ${fault ? "恢复故障车辆" : "注入车辆故障"} <span>AGV-01</span>`;
  toast(
    fault
      ? "AGV-01 驱动故障 · 已停车并联动物流警报"
      : "AGV-01 故障解除 · 车辆恢复调度",
  );
  refreshIcons();
};
let cutaway = false;
$("#roof-button").onclick = () => {
  cutaway = !cutaway;
  models.roofs.forEach((r) => (r.visible = !cutaway));
  $("#roof-button").classList.toggle("active", cutaway);
  toast(cutaway ? "厂房剖视已开启" : "厂房屋顶已显示");
};
const paths = new THREE.Group();
paths.visible = false;
world.scene.add(paths);
import { routes } from "./simulation/traffic.js";
routes.forEach((route, i) => {
  const points = [];
  for (let s = 0; s < route.length; s += 1) {
    const p = route.sample(s);
    points.push(new THREE.Vector3(p.x, 0.37, p.z));
  }
  points.push(points[0]);
  paths.add(
    new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(points),
      new THREE.LineBasicMaterial({ color: i ? "#d2edc7" : "#ffb15d" }),
    ),
  );
});
$("#route-button").onclick = () => {
  paths.visible = !paths.visible;
  $("#route-button").classList.toggle("active", paths.visible);
};
$("#shadow-button").onclick = () => {
  world.renderer.shadowMap.enabled = !world.renderer.shadowMap.enabled;
  world.scene.traverse((o) => {
    if (o.material) {
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      mats.forEach((m) => (m.needsUpdate = true));
    }
  });
  $("#shadow-button").classList.toggle(
    "active",
    world.renderer.shadowMap.enabled,
  );
};
$("#help-button").onclick = () => $("#help-dialog").showModal();
$("#close-help").onclick = () => $("#help-dialog").close();
$("#close-selection").onclick = () => ($("#selection-panel").hidden = true);
$("#explode").oninput = (e) => {
  sim.explodeTarget = Number(e.target.value) / 100;
  $("#explode-value").textContent = `${e.target.value}%`;
  if (sim.paused) {
    sim.explode = sim.explodeTarget;
    models.module.setExplode(sim.explode);
  }
};
document
  .querySelectorAll("[data-layer]")
  .forEach(
    (el) =>
      (el.onchange = () =>
        (models.module.layers[Number(el.dataset.layer)].visible = el.checked)),
  );
const anchors = [
  { name: "智能仓储", p: [-37, 9, -29], key: "warehouse", type: "02" },
  { name: "电芯预处理", p: [36, 9, -29], key: "preprocess", type: "03" },
  { name: "模组装配车间", p: [-26, 8, 31], key: "workshop", type: "01" },
  { name: "智慧港口", p: [96, 23, -11], key: "port", type: "04" },
];
for (const a of anchors) {
  a.el = document.createElement("button");
  a.el.className = "scene-label";
  a.el.innerHTML = `<span>${a.type}</span>${a.name}<i></i>`;
  a.el.onclick = () => {
    if (a.key === "warehouse" || a.key === "preprocess") {
      const o = models.pickables[a.key === "warehouse" ? 0 : 1];
      controller.select(o.userData.selectable, o);
    } else controller.go(a.key);
  };
  $("#scene-labels").appendChild(a.el);
}
let last = performance.now(),
  frames = 0,
  lastHud = 0,
  fpsTime = last;
const projected = new THREE.Vector3();
function animate(now) {
  const dt = (now - last) / 1000;
  last = now;
  sim.update(dt);
  controller.update(Math.min(dt, 0.1));
  detailCulling.update(dt);
  world.renderer.render(world.scene, world.camera);
  anchors.forEach((a) => {
    projected.set(...a.p).project(world.camera);
    a.el.style.transform = `translate(-50%,-100%) translate(${(projected.x * 0.5 + 0.5) * innerWidth}px,${(-projected.y * 0.5 + 0.5) * innerHeight}px)`;
    a.el.hidden = currentView !== "overview" || projected.z > 1;
  });
  frames++;
  if (now - lastHud > 150) {
    updateHud();
    lastHud = now;
  }
  if (now - fpsTime > 1000) {
    $("#fps").textContent =
      `${Math.round((frames * 1000) / (now - fpsTime))} FPS`;
    $("#render-stats").textContent = `${world.renderer.info.render.calls} DRAW`;
    frames = 0;
    fpsTime = now;
  }
  requestAnimationFrame(animate);
}
function updateHud() {
  const isInspection = currentView === "inspection";
  $(".equipment-title").dataset.view = isInspection ? "inspection" : "robot";
  const line = sim.line;
  const r = models.robots[monitoredRobot],
    p = isInspection ? models.inspect.phase : r.phase;
  $("#equipment-name").textContent = isInspection
    ? "EOL 检测站"
    : `机械臂 A-0${monitoredRobot + 1}`;
  $("#equipment-id").textContent =
    (isInspection ? models.inspect.jobId : r.jobId) || "等待上游供料";
  $("#grip-label").textContent = isInspection ? "夹具状态" : "夹爪状态";
  const stepNames = isInspection
    ? ["夹紧", "接触", "检测", "反馈", "释放"]
    : ROBOT_PHASES.map((x) => x[0]);
  document
    .querySelectorAll("[data-step] small")
    .forEach((el, i) => (el.textContent = stepNames[i]));
  $("#robot-state").textContent = p.name;
  document.querySelectorAll("[data-step]").forEach((el) => {
    el.classList.toggle("current", Number(el.dataset.step) === p.index);
    el.classList.toggle("done", Number(el.dataset.step) < p.index);
  });
  const station =
    line.stations[isInspection ? 5 : monitoredRobot === 0 ? 1 : 4];
  const duration = station.duration;
  const cycle =
    station.job && station.job.mode !== "transfer" ? station.job.elapsed : 0;
  $("#cycle-time").textContent =
    `${cycle.toFixed(1)} / ${duration.toFixed(1)} s`;
  $("#cycle-bar").style.width = `${(cycle / duration) * 100}%`;
  $("#grip-state").textContent = isInspection
    ? p.index >= 1 && p.index <= 3
      ? "夹紧 · 工件定位"
      : "松开 · 工件释放"
    : r.held
      ? "闭合 · 夹持工件"
      : "张开 · 已释放";
  const insp = models.inspect;
  $("#inspection-state").textContent =
    insp.phase.index === 3 ? insp.result : insp.phase.name;
  $("#inspection-state").classList.toggle(
    "failed",
    insp.phase.index === 3 && insp.result.startsWith("NG"),
  );
  $("#output").textContent = sim.total.toLocaleString();
  const ratio = Math.min(100, sim.total);
  $("#target-percent").textContent = `${ratio.toFixed(1)}%`;
  $("#target-bar").style.width = `${ratio}%`;
  $("#availability").innerHTML = `${line.wip}<em>组</em>`;
  $("#yield").innerHTML =
    `${line.tested ? ((100 * line.passed) / line.tested).toFixed(1) : "—"}<em>%</em>`;
  $("#shipped").textContent = line.shipped;
  $("#rejected").textContent = line.rejected;
  $("#buffer-state").textContent =
    `合格缓存 ${line.bins.good.length} / 3 · 隔离 ${line.bins.reject.length} / 2`;
  $("#line-state").textContent = line.outputPaused
    ? `出库暂停 · ${line.blocked} 站等待`
    : line.blocked
      ? `${line.blocked} 站等待下游`
      : "工位联锁已启用";
  const event = line.events[0];
  if (event)
    $("#line-event").textContent =
      `BM-${String(event.id).padStart(5, "0")} · ${event.message}`;
  document.querySelectorAll("[data-station]").forEach((button, i) => {
    const j = line.stations[i].job;
    button.dataset.state = !j
      ? "idle"
      : j.mode === "blocked"
        ? "blocked"
        : j.qa === "NG"
          ? "reject"
          : "working";
    let state = "作业中";
    if (j) {
      if (j.mode === "blocked") state = "等待下游";
      else if (j.mode === "transfer") state = "来料中";
      else if (i === 1 || i === 4)
        state = models.robots[i === 1 ? 0 : 1].phase.name;
      else if (i === 5) state = j.qa || models.inspect.phase.name;
      else if (i === 2)
        state =
          j.elapsed < 1.4
            ? "压头下降"
            : j.elapsed < 3.2
              ? "压合保持"
              : "压头抬升";
      else if (i === 3)
        state =
          j.elapsed < 3.4 ? "母排装配" : j.elapsed < 4.6 ? "上盖落位" : "锁付";
    }
    button.querySelector("small").textContent = !j
      ? "待料"
      : `${String(j.id).padStart(3, "0")} · ${state}`;
  });
  const cars = sim.traffic.cars;
  $("#moving-count").textContent = cars.filter((c) => c.speed > 0.1).length;
  $("#waiting-count").textContent = cars.filter(
    (c) => !c.fault && c.speed <= 0.1,
  ).length;
  $("#fault-count").textContent = sim.faults;
  $("#traffic-state").textContent = sim.faults
    ? "AGV-01 故障 · 后车自动避让等待"
    : sim.traffic.owner !== null
      ? `路口通行：AGV-${String(sim.traffic.owner + 1).padStart(2, "0")}`
      : "路口空闲 · 预约控制已启用";
  $("#system-text").textContent = sim.faults
    ? "1 项设备警报"
    : sim.paused
      ? "仿真已暂停"
      : line.outputPaused
        ? "出库暂停 · 产线联锁"
        : "系统运行正常";
  $(".system-state").classList.toggle("alarm", sim.faults > 0);
  $("#clock").textContent = new Date().toLocaleTimeString("zh-CN", {
    hour12: false,
  });
  $("#sim-time").textContent = new Date(sim.time * 1000)
    .toISOString()
    .slice(11, 19);
}
window.__twin = {
  world,
  models,
  sim,
  controller,
  snapshot: () => ({
    time: sim.time,
    paused: sim.paused,
    faults: sim.faults,
    robot: models.robots[0].phase.name,
    held: models.robots[0].held,
    cars: sim.traffic.cars.map((c) => ({ ...c })),
    minGap: sim.traffic.minObservedGap,
    drawCalls: world.renderer.info.render.calls,
    production: sim.line.snapshot(),
  }),
};
requestAnimationFrame(animate);
