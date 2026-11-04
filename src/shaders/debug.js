// Debug views of the buffers, drawn as tiles over the frame (see
// TRANSFORM-FEEDBACK.md). The simulation's transform feedback output can't be
// sampled directly, so a points pass first copies it into float textures, one
// particle per texel; the tile pass then colour-maps those and the render
// targets.

// one point per particle, at texel (i % width, i / width) of the debug target
export const debugPointsVert = /* glsl */ `#version 300 es
precision highp float;

in vec4 a_position; // xyz, age
in vec4 a_velocity; // xyz, lifespan
in vec4 a_meta;     // palette slot, generation
in vec4 a_seed;

uniform vec2 u_grid; // debug target size, in texels

flat out vec4 v_position;
flat out vec4 v_velocity;
flat out vec4 v_meta;
flat out vec4 v_seed;

void main() {
  float i = float(gl_VertexID);
  vec2 cell = vec2(mod(i, u_grid.x), floor(i / u_grid.x));
  gl_Position = vec4((cell + .5) / u_grid * 2. - 1., 0., 1.);
  gl_PointSize = 1.;
  v_position = a_position;
  v_velocity = a_velocity;
  v_meta = a_meta;
  v_seed = a_seed;
}
`;

export const debugPointsFrag = /* glsl */ `#version 300 es
precision highp float;

flat in vec4 v_position;
flat in vec4 v_velocity;
flat in vec4 v_meta;
flat in vec4 v_seed;

layout(location = 0) out vec4 outPosition;
layout(location = 1) out vec4 outVelocity;
layout(location = 2) out vec4 outMeta;
layout(location = 3) out vec4 outSeed;

void main() {
  outPosition = v_position;
  outVelocity = v_velocity;
  outMeta = v_meta;
  outSeed = v_seed;
}
`;

// the fullscreen triangle squeezed so its [0, 1] square lands on u_rect
export const debugTileVert = /* glsl */ `#version 300 es
in vec3 position;

uniform vec4 u_rect; // x0, y0, x1, y1 in clip space

out vec2 v_uv;

void main() {
  v_uv = position.xy * .5 + .5;
  gl_Position = vec4(mix(u_rect.xy, u_rect.zw, v_uv), 0., 1.);
}
`;

export const debugTileFrag = /* glsl */ `#version 300 es
precision highp float;
precision highp sampler2D;

in vec2 v_uv;

uniform float u_mode; // index into DEBUG_TILES in main.js
uniform vec2 u_grid;
uniform float u_total; // particles simulated
uniform float u_count; // particles drawn
uniform vec3 u_bounds;
uniform float u_speedRange;
uniform float u_fog;

uniform sampler2D b_dbgPosition;
uniform sampler2D b_dbgVelocity;
uniform sampler2D b_dbgMeta;
uniform sampler2D b_dbgSeed;
uniform sampler2D b_scene;
uniform sampler2D b_normal;
uniform sampler2D b_composite;

out vec4 colour;

vec4 fetch(sampler2D t) {
  return texelFetch(t, ivec2(v_uv * vec2(textureSize(t, 0))), 0);
}

vec3 checker() {
  vec2 c = floor(gl_FragCoord.xy / 6.);
  return vec3(mod(c.x + c.y, 2.) * .06 + .1);
}

void main() {
  if (any(greaterThan(v_uv, vec2(1.)))) discard;
  int mode = int(u_mode + .5);
  vec3 col;

  if (mode <= 4) {
    // simulation buffers: texel i is particle i
    ivec2 cell = ivec2(v_uv * u_grid);
    float index = float(cell.y) * u_grid.x + float(cell.x);
    if (index >= u_total) {
      colour = vec4(checker(), 1.);
      return;
    }
    vec4 p = texelFetch(b_dbgPosition, cell, 0);
    vec4 v = texelFetch(b_dbgVelocity, cell, 0);
    float age = p.w;
    float life = v.w;
    if (mode == 0) {
      col = age < 0. ? vec3(.3) : clamp(p.xyz / u_bounds * .5 + .5, 0., 1.);
    } else if (mode == 1) {
      col = age < 0. ? vec3(.15, .3, .85)
        : age > life ? vec3(.9, .15, .1)
        : vec3(age / max(life, 1e-3));
    } else if (mode == 2) {
      float speed = length(v.xyz);
      vec3 dir = speed > 1e-4 ? v.xyz / speed : vec3(0.);
      col = (dir * .5 + .5) * mix(.2, 1., clamp(speed / u_speedRange, 0., 1.));
    } else if (mode == 3) {
      vec4 m = texelFetch(b_dbgMeta, cell, 0);
      bool second = m.x > .5;
      col = vec3(second ? .1 : .9, fract(m.y * .618034), second ? .9 : .1);
    } else {
      col = texelFetch(b_dbgSeed, cell, 0).xyz;
    }
    // past the prism count: simulated, but not drawn
    if (index >= u_count) col *= .3;
  } else if (mode == 5) {
    vec4 s = fetch(b_scene);
    col = s.a > 0. ? s.rgb : checker();
  } else if (mode == 6) {
    // linear view depth: white near, dark at the fog distance
    float d = fetch(b_scene).a;
    col = d > 0. ? vec3(1. - .9 * clamp(d / u_fog, 0., 1.)) : vec3(.05, .05, .15);
  } else if (mode == 7) {
    vec4 s = fetch(b_scene);
    col = s.a > 0. ? fetch(b_normal).xyz * .5 + .5 : vec3(0.);
  } else {
    col = fetch(b_composite).rgb;
  }
  colour = vec4(col, 1.);
}
`;

