import * as THREE from 'three'

/**
 * A sculpted 3D portrait head ("bust") that carries the uploaded photo on its
 * front. Fully offline: no ML, no model weights. The photo is planar-projected
 * onto the front hemisphere of a head-shaped mesh, and blended onto the sculpt
 * only where the surface faces forward (a normal-based mask), so the sides and
 * back read as a carved marble/onyx head lit by the scene. The result is a real
 * 3D object you can orbit around — a lightweight "head reconstruction".
 */

const HEAD_R = 0.17
const SCALE: [number, number, number] = [0.92, 1.12, 0.96]

/** Head geometry with a custom `faceUv` attribute (frontal planar projection). */
export function buildHeadGeometry(): THREE.BufferGeometry {
  const geo = new THREE.SphereGeometry(HEAD_R, 64, 64)
  geo.scale(SCALE[0], SCALE[1], SCALE[2])

  const pos = geo.attributes.position
  const halfW = HEAD_R * SCALE[0] * 0.96
  const halfH = HEAD_R * SCALE[1] * 1.02
  const uv = new Float32Array(pos.count * 2)
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i)
    const y = pos.getY(i)
    uv[i * 2] = 0.5 + x / (2 * halfW)
    uv[i * 2 + 1] = 0.5 + y / (2 * halfH)
  }
  geo.setAttribute('faceUv', new THREE.BufferAttribute(uv, 2))
  return geo
}

/** Neck + shoulders base so the head reads as a portrait bust. */
export function buildBustBaseGeometry(): THREE.BufferGeometry {
  return new THREE.CylinderGeometry(0.06, 0.19, 0.17, 40, 1, true)
}

/**
 * MeshStandardMaterial that blends the photo onto the front of the head. Uses
 * onBeforeCompile so the sculpt still gets full PBR lighting; the face texel is
 * converted from sRGB to linear before lighting for correct tone.
 */
export function makeFaceMaterial(texture: THREE.Texture, baseColor: string): THREE.MeshStandardMaterial {
  const mat = new THREE.MeshStandardMaterial({ color: baseColor, roughness: 0.45, metalness: 0.05 })

  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uFaceTex = { value: texture }

    shader.vertexShader =
      'attribute vec2 faceUv;\nvarying vec2 vFaceUv;\nvarying float vFront;\n' +
      shader.vertexShader.replace(
        '#include <begin_vertex>',
        '#include <begin_vertex>\n  vFaceUv = faceUv;\n  vFront = normalize(normal).z;',
      )

    shader.fragmentShader =
      'uniform sampler2D uFaceTex;\nvarying vec2 vFaceUv;\nvarying float vFront;\n' +
      shader.fragmentShader.replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        {
          float frontMask = smoothstep(0.05, 0.55, vFront);
          float inside =
            step(0.02, vFaceUv.x) * step(vFaceUv.x, 0.98) *
            step(0.02, vFaceUv.y) * step(vFaceUv.y, 0.98);
          vec4 faceTexel = texture2D(uFaceTex, vFaceUv);
          vec3 faceLinear = pow(faceTexel.rgb, vec3(2.2)); // sRGB -> linear
          diffuseColor.rgb = mix(diffuseColor.rgb, faceLinear, frontMask * inside * faceTexel.a);
        }`,
      )
  }
  // Distinguish this program variant in three's shader cache.
  mat.customProgramCacheKey = () => 'bust-face-v1'
  return mat
}
