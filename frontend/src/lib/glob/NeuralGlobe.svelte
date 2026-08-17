<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import * as THREE from 'three';
  import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
  import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
  import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

  import { createNodes, type NodeData } from './nodes';
  import { createConnections, refreshConnections, type ConnectionSystem } from './connections';
  import { createSparkSystem, updateSparks, type SparkSystem } from './sparks';
  import { createCoreGlow, type CoreGlow } from './core';
  import { createAmbientParticles, updateAmbient, type AmbientSystem } from './ambient';

  let container: HTMLDivElement;
  let animationId: number;

  // Three.js globals
  let renderer: THREE.WebGLRenderer;
  let scene: THREE.Scene;
  let camera: THREE.PerspectiveCamera;
  let composer: EffectComposer;
  let clock: THREE.Clock;

  // Systems
  let nodeSystem: { points: THREE.Points; material: THREE.ShaderMaterial; data: NodeData };
  let connectionSystem: ConnectionSystem;
  let sparkSystem: SparkSystem;
  let coreGlow: CoreGlow;
  let ambientSystem: AmbientSystem;

  // Globe group for unified rotation
  let globeGroup: THREE.Group;

  // Connection refresh timer
  let connectionRefreshTimer = 0;
  const CONNECTION_REFRESH_INTERVAL = 4; // seconds

  // Color palette (idle state)
  const COLORS = {
    node: new THREE.Color(0x4488ff),        // Electric blue
    connection: new THREE.Color(0x4499ee),   // Bright blue — visible electric tendrils
    sparkCore: new THREE.Color(0xffffff),    // White
    sparkHalo: new THREE.Color(0x88ccff),    // Light blue
    core: new THREE.Color(0x6699ff),         // Soft blue
    ambient: new THREE.Color(0x335588),      // Very dim blue
    background: 0x000000                    // Pure black
  };

  onMount(() => {
    init();
    animate();
  });

  onDestroy(() => {
    if (animationId) cancelAnimationFrame(animationId);
    if (renderer) {
      renderer.dispose();
      renderer.domElement.remove();
    }
    if (composer) composer.dispose();
    window.removeEventListener('resize', onResize);
  });

  function init() {
    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(COLORS.background);

    // Camera
    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.z = 3;

    // Renderer
    renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ReinhardToneMapping;
    renderer.toneMappingExposure = 1.2; // Balanced — not too bright, not too dim
    container.appendChild(renderer.domElement);

    // Post-processing
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));

    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.3,   // strength — VERY low. Structure first, glow later.
      0.2,   // radius — tight
      0.5    // threshold — only the VERY brightest elements bloom
    );
    composer.addPass(bloomPass);

    // Globe group
    globeGroup = new THREE.Group();
    scene.add(globeGroup);

    // Create all systems
    nodeSystem = createNodes(300, COLORS.node);
    globeGroup.add(nodeSystem.points);

    connectionSystem = createConnections(
      nodeSystem.data.positions,
      nodeSystem.data.count,
      COLORS.connection
    );
    globeGroup.add(connectionSystem.lineSegments);

    sparkSystem = createSparkSystem(COLORS.sparkCore, COLORS.sparkHalo);
    globeGroup.add(sparkSystem.points);

    coreGlow = createCoreGlow(COLORS.core);
    globeGroup.add(coreGlow.mesh);

    ambientSystem = createAmbientParticles(COLORS.ambient);
    globeGroup.add(ambientSystem.points);

    // Clock
    clock = new THREE.Clock();

    // Resize handler
    window.addEventListener('resize', onResize);
  }

  function onResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;

    camera.aspect = w / h;
    camera.updateProjectionMatrix();

    renderer.setSize(w, h);
    composer.setSize(w, h);
  }

  function animate() {
    animationId = requestAnimationFrame(animate);

    const deltaTime = clock.getDelta();
    const elapsed = clock.getElapsedTime();

    // Update node shader time
    nodeSystem.material.uniforms.uTime.value = elapsed;

    // Update connection shader time
    connectionSystem.material.uniforms.uTime.value = elapsed;

    // Update core shader time
    coreGlow.material.uniforms.uTime.value = elapsed;

    // Update spark system
    updateSparks(
      sparkSystem,
      connectionSystem.connections,
      nodeSystem.data.positions,
      deltaTime,
      0.3 // spawn interval — faster for more electric activity
    );
    sparkSystem.material.uniforms.uTime.value = elapsed;

    // Refresh connections periodically
    connectionRefreshTimer += deltaTime;
    if (connectionRefreshTimer > CONNECTION_REFRESH_INTERVAL) {
      connectionRefreshTimer = 0;
      refreshConnections(connectionSystem);
    }

    // Update ambient particles
    updateAmbient(ambientSystem, deltaTime);

    // Slow rotation of entire globe
    globeGroup.rotation.y += 0.1 * deltaTime;

    // Render with post-processing
    composer.render();
  }
</script>

<div bind:this={container} class="globe-container"></div>

<style>
  .globe-container {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    margin: 0;
    padding: 0;
    overflow: hidden;
  }
</style>
