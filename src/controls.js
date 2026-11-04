import { Pane } from "tweakpane";

// Tweakpane bound straight onto the params object in main.js. Most values are
// read every frame; the callbacks cover the ones that need work on change.
export function createControls(params, schemeNames, cb) {
  const pane = new Pane({ title: "프리즘 커런츠", expanded: false });

  if (cb.presetNames.length) {
    pane
      .addBinding(params, "preset", {
        label: "프리셋",
        options: Object.fromEntries([["—", ""], ...cb.presetNames.map((n) => [n, n])]),
      })
      .on("change", (ev) => ev.value && cb.onPreset(ev.value));
  }
  pane.addButton({ title: "이미지 저장" }).on("click", () => cb.onSaveImage());
  // const copy = pane.addButton({ title: "copy preset" });
  // copy.on("click", async () => {
  //   copy.title = (await cb.onCopyPreset()) ? "copied!" : "logged to console";
  //   setTimeout(() => (copy.title = "copy preset"), 1500);
  // });

  // frame rate, smoothed in main.js; monitors poll it on their own
  const perf = pane.addFolder({ title: "성능", expanded: false });
  perf.addBinding(cb.stats, "fps", { readonly: true, view: "graph", min: 0, max: 144, label: "fps" });
  perf.addBinding(cb.stats, "fps", { readonly: true, label: "", format: (v) => v.toFixed(0) });
  perf.addBinding(cb.stats, "ms", { readonly: true, label: "프레임 (ms)", format: (v) => v.toFixed(1) });

  // tiles showing the simulation buffers and render targets
  const debug = pane.addFolder({ title: "디버그 버퍼", expanded: false });
  cb.debugTiles.forEach((t, i) => {
    if (i > 0 && t.sim !== cb.debugTiles[i - 1].sim) debug.addBlade({ view: "separator" });
    debug.addBinding(cb.debug, t.key, { label: t.label });
  });

  // everything else
  const controls = pane.addFolder({ title: "컨트롤", expanded: false });

  // scheme, seed and re-roll for palette `which` (0 = first, 1 = second)
  const paletteBindings = (folder, which, schemeKey, seedKey) => {
    folder
      .addBinding(params, schemeKey, {
        label: "스킴",
        options: Object.fromEntries(schemeNames.map((n, i) => [n, i])),
      })
      .on("change", (ev) => cb.onScheme(which, ev.value));
    folder
      .addBinding(params, seedKey, { label: "팔레트 시드", step: 1, min: 0 })
      .on("change", (ev) => cb.onSeed(which, ev.value));
    folder.addButton({ title: "팔레트 다시 굴리기" }).on("click", () => cb.onReroll(which));
  };

  paletteBindings(controls, 0, "scheme", "seed");
  controls.addBinding(params, "paletteScale", { label: "팔레트 스케일", min: 0, max: 4 });
  controls.addBinding(params, "paletteOffset", { label: "팔레트 오프셋", min: -1, max: 1 });
  controls.addBinding(params, "unify", { label: "팔레트 통합", min: 0, max: 1 });
  controls.addBinding(params, "playing", { label: "재생" });
  controls.addBinding(params, "dark", { label: "다크 모드" });

  const second = controls.addFolder({ title: "두 번째 팔레트", expanded: false });
  second.addBinding(params, "secondPalette", { label: "번갈아 표시" });
  second.addBinding(params, "switchTime", { label: "전환 주기 (초)", min: 2, max: 120, step: 1 });
  paletteBindings(second, 1, "scheme2", "seed2");
  second.addButton({ title: "지금 전환" }).on("click", () => cb.onSwitch());

  const flow = controls.addFolder({ title: "흐름", expanded: false });
  flow.addBinding(params, "speed", { label: "속도", min: 0, max: 3 });
  flow.addBinding(params, "flowScale", { label: "소용돌이 스케일", min: 0.02, max: 0.3 });
  flow.addBinding(params, "flowSpeed", { label: "흐름 속도", min: 0, max: 10 });
  flow.addBinding(params, "evolve", { label: "진화", min: 0, max: 0.3 });
  flow.addBinding(params, "drift", { label: "표류", min: -3, max: 3 });
  flow.addBinding(params, "steer", { label: "조향", min: 0.2, max: 10 });
  flow.addBinding(params, "spawnRadius", { label: "리본 폭", min: 0.1, max: 4 });
  flow.addBinding(params, "lifeMin", { label: "최소 수명 (초)", min: 1, max: 30 });
  flow.addBinding(params, "lifeMax", { label: "최대 수명 (초)", min: 1, max: 30 });

  const container = controls.addFolder({ title: "형상", expanded: false });
  container.addBinding(params, "shape", {
    options: { "슬라브": "slab", "구": "sphere", "토러스": "torus", "캡슐": "capsule", "파도 시트": "wave" },
  });
  container.addBinding(params, "shapeSize", { label: "크기", min: 4, max: 48 });
  container.addBinding(params, "cling", { label: "밀착", min: 0, max: 1 });

  const prisms = controls.addFolder({ title: "프리즘", expanded: false });
  prisms
    .addBinding(params, "count", { label: "개수", min: 1000, max: params.count, step: 1000 })
    .on("change", () => cb.onCount());
  prisms.addBinding(params, "size", { label: "크기", min: 0.05, max: 1.2 });
  prisms.addBinding(params, "stretch", { label: "늘이기", min: 0, max: 4 });
  prisms.addBinding(params, "spread", { label: "색상 퍼짐", min: 0, max: 4 });
  prisms.addBinding(params, "shimmer", { label: "색상 변화", min: 0, max: 0.2 });
  prisms.addBinding(params, "gloss", { label: "광택", min: 0, max: 2 });
  prisms.addBinding(params, "uniformity", { label: "균일도", min: 0, max: 1 });

  const view = controls.addFolder({ title: "카메라", expanded: false });
  view.addBinding(params, "fov", { label: "시야각 (°)", min: 10, max: 90 });
  view.addBinding(params, "dof", { label: "피사계 심도" });
  view.addBinding(params, "focus", { label: "초점 (± 기준점)", min: -40, max: 60 });
  view.addBinding(params, "aperture", { label: "조리개", min: 0, max: 12 });
  view.addBinding(params, "maxBlur", { label: "최대 흐림 (px)", min: 1, max: 30 });

  const look = controls.addFolder({ title: "분위기", expanded: false });
  look.addBinding(params, "lines", { label: "외곽선", min: 0, max: 1 });
  look.addBinding(params, "ao", { label: "주변 가림", min: 0, max: 1.5 });
  look.addBinding(params, "aoRadius", { label: "가림 반경", min: 0.1, max: 3 });
  look.addBinding(params, "fog", { label: "안개 거리", min: 20, max: 400 });
  look.addBinding(params, "nearFade", { label: "근거리 페이드", min: 0, max: 40 });

  return pane;
}

