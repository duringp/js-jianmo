import { poseLineRobot, updateInspection } from "./process.js";
import { robotMotion, ease, STATIONS, LINE_Y } from "./production-line.js";
export function renderProduction(models, line) {
  const production = models.production;
  for (let i = 0; i < 2; i++) {
    const s = line.stations[i === 0 ? 1 : 4],
      r = models.robots[i],
      j = s.job;
    const motion =
      j && j.mode !== "transfer"
        ? robotMotion(j.elapsed, s)
        : robotMotion(0, s);
    poseLineRobot(r, motion.tool, motion.closed);
    r.held = motion.held;
    r.phase = {
      ...motion,
      name: j
        ? j.mode === "transfer"
          ? "等待来料"
          : j.mode === "blocked"
            ? "等待下游"
            : motion.name
        : "待料",
    };
    r.jobId = j?.serial || null;
  }
  const inspected = line.stations[5].job,
    processing = inspected && inspected.mode !== "transfer";
  if (processing) {
    updateInspection(models.inspect, Math.min(inspected.elapsed, 7.999));
    models.inspect.result =
      inspected.qa === "NG"
        ? "NG · 绝缘异常"
        : inspected.qa === "PASS"
          ? "PASS · 检测通过"
          : "检测中";
    if (inspected.qa)
      models.inspect.screen.material.color.set(
        inspected.qa === "PASS" ? "#4abe86" : "#e34e36",
      );
  } else {
    updateInspection(models.inspect, 0);
    models.inspect.phase = {
      index: -1,
      name: inspected ? "等待来料" : "待料",
      progress: 0,
    };
    models.inspect.result = "待料";
    models.inspect.screen.material.color.set("#628d96");
  }
  models.inspect.jobId = inspected?.serial || null;
  for (const [id, head] of Object.entries(production.heads)) {
    const s = line.stations.find((s) => s.id === id),
      j = s.job;
    let y = 4.8;
    if (j && j.mode !== "transfer") {
      if (id === "press") {
        const t = j.elapsed;
        y -= 1.36 * ease(t < 1.4 ? t / 1.4 : t < 3.2 ? 1 : (4.8 - t) / 1.6);
      }
      if (id === "connect") {
        const t = j.elapsed;
        y -=
          0.78 *
          ease(t < 4.6 ? 0 : t < 5.3 ? (t - 4.6) / 0.7 : (6.2 - t) / 0.9);
      }
    }
    head.position.y = y;
  }
  for (let i = 0; i < production.stationNodes.length; i++) {
    const j = line.stations[i].job;
    production.stationNodes[i].userData.signal.material.color.set(
      !j
        ? "#6b8188"
        : j.mode === "blocked"
          ? "#f6a43e"
          : j.qa === "NG"
            ? "#e4523e"
            : "#65b896",
    );
  }
  const activeIds = new Set(line.active.map((j) => j.id));
  for (const actor of production.actors)
    if (!activeIds.has(actor.jobId)) {
      actor.group.visible = false;
      actor.jobId = null;
    }
  for (const j of line.active) {
    let actor = production.actors.find((a) => a.jobId === j.id);
    if (!actor) {
      actor = production.actors.find((a) => a.jobId === null);
      if (!actor) throw new Error("Workpiece pool capacity exceeded");
      actor.jobId = j.id;
    }
    const r =
      j.motion?.held && j.mode !== "transfer"
        ? models.robots[j.station === 1 ? 0 : 1]
        : null;
    if (r) {
      if (actor.group.parent !== r.tool) r.tool.add(actor.group);
      actor.group.position.set(0, -1.5, 0);
    } else {
      if (actor.group.parent !== models.base) models.base.add(actor.group);
      actor.group.position.set(...j.position);
    }
    actor.group.rotation.set(0, 0, 0);
    actor.group.visible = true;
    actor.layers[0].visible = actor.layers[1].visible = true;
    actor.layers[2].visible = j.bus;
    actor.layers[3].visible = j.lid;
    for (const layer of actor.layers) layer.position.set(0, 0, 0);
    if (j.station === 3 && j.mode !== "transfer") {
      const bus = 1 - ease((j.elapsed - 1.1) / 1.2),
        lid = 1 - ease((j.elapsed - 3.4) / 1.2);
      actor.layers[2].position.set(3 * bus, 1.6 * bus, 0);
      actor.layers[3].position.set(-3 * lid, 1.8 * lid, 0);
    }
    actor.tag.visible = !!j.qa;
    actor.tag.material.color.set(j.qa === "NG" ? "#e4523e" : "#4abe86");
    const data = actor.group.userData.selectable;
    data.name = `${j.serial} · ${j.qa || "在制"}`;
    data.id = `workpiece-${j.id}`;
    data.target = [j.position[0], 3, j.position[2]];
    data.position = [j.position[0] + 9, 11, j.position[2] + 13];
  }
  for (const kind of ["good", "reject"])
    production.slotLights[kind].forEach((light, i) => {
      const occupied = line.bins[kind].some((j) => j.slot === i);
      light.material.color.set(
        occupied ? (kind === "good" ? "#4abe86" : "#e4523e") : "#586a6d",
      );
    });
}
