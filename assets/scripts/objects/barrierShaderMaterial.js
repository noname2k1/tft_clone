import * as THREE from "https://esm.sh/three";

const BarrierShaderMaterial = new THREE.ShaderMaterial({
  uniforms: {
    u_time: { value: 0 },
    u_color: { value: new THREE.Color(0x33ccff) },
    u_opacity: { value: 0.4 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
    }
  `,
  fragmentShader: `
    uniform float u_time;
    uniform vec3 u_color;
    uniform float u_opacity;
    varying vec2 vUv;

    void main() {
      float stripe = sin((vUv.y + u_time * 0.5) * 20.0) * 0.4 + 0.6;
      gl_FragColor = vec4(u_color * stripe, u_opacity);
    }
  `,
  transparent: true,
  side: THREE.DoubleSide,
  depthWrite: false,
});

export default BarrierShaderMaterial;
