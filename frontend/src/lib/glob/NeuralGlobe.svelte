<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import * as THREE from 'three';
  import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
  import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
  import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

  // New architecture imports
  import { createNodes, updateNodes, type NodeSystem } from './nodes';
  import { createConnections, updateConnectionActivities, type ConnectionSystem } from './connections';
  import {
    createSimulation,
    updateSignals,
    updateNodeActivities,
    updateSimulationTimer,
    pulseCoreNodes,
    type NeuralSimulation
  } from './neuralActivity';
  import { createSparkSystem, updateSparks, type SparkSystem } from './sparks';
  import { createAmbientParticles, updateAmbient, type AmbientSystem } from './ambient';

  let { isSpeaking = false }: { isSpeaking?: boolean } = $props();

  let container: HTMLDivElement;
  let animationId: number;

  // Three.js globals
  let renderer: THREE.WebGLRenderer;
  let scene: THREE.Scene;
  let camera: THREE.PerspectiveCamera;
  let composer: EffectComposer;
  let clock: THREE.Clock;

  // Systems
  let nodeSystem: NodeSystem;
  let nodePoints: THREE.Points;
  let nodeMaterial: THREE.ShaderMaterial;
  let connectionSystem: ConnectionSystem;
  let sparkSystem: SparkSystem;
  let ambientSystem: AmbientSystem;
  let simulation: NeuralSimulation;

  // Globe group for unified rotation
  let globeGroup: THREE.Group;

  // Color palette (idle state)
  const COLORS = {
    node: new THREE.Color(0x4488ff),        // Electric blue
    connection: new THREE.Color(0x4499ee),   // Bright blue
    sparkCore: new THREE.Color(0xffffff),    // White
    sparkHalo: new THREE.Color(0x88ccff),    // Light blue
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
    renderer.toneMappingExposure = 0.8; // Dim overall — only active elements should glow
    container.appendChild(renderer.domElement);

    // Post-processing
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));

    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.2,   // strength — very low. Only firing neurons bloom.
      0.15,  // radius — tight
      0.6    // threshold — high. Only the brightest elements bloom.
    );
    composer.addPass(bloomPass);

    // Globe group
    globeGroup = new THREE.Group();
    scene.add(globeGroup);

    // === NEW ARCHITECTURE ===

    // 1. Create nodes with clustering (includes core nodes)
    const nodeResult = createNodes(COLORS.node);
    nodeSystem = nodeResult.system;
    nodePoints = nodeResult.points;
    nodeMaterial = nodeResult.material;
    globeGroup.add(nodePoints);

    // 2. Build persistent connection graph
    connectionSystem = createConnections(nodeSystem.nodes, COLORS.connection);
    globeGroup.add(connectionSystem.lineSegments);

    // 3. Create spark system (signals follow graph paths)
    sparkSystem = createSparkSystem(COLORS.sparkCore, COLORS.sparkHalo);
    globeGroup.add(sparkSystem.points);

    // 4. Create neural simulation (drives everything)
    simulation = createSimulation();

    // 5. Create ambient particles (very sparse)
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

    // === NEURAL SIMULATION (drives everything) ===

    // 1. Update simulation timer — triggers events
    updateSimulationTimer(simulation, nodeSystem.nodes, connectionSystem, deltaTime);

    // 2. Update signals — move along paths, activate nodes/connections
    updateSignals(simulation, nodeSystem.nodes, connectionSystem, deltaTime);

    // 3. Update node activities — decay, core pulse
    updateNodeActivities(nodeSystem.nodes, deltaTime);
    pulseCoreNodes(nodeSystem.nodes, elapsed);

    // 4. Update connection activities — decay
    updateConnectionActivities(connectionSystem);

    // === RENDER (reads activity values) ===

    // Update node positions and activities from simulation
    updateNodes(nodeSystem, elapsed);
    const posAttr = nodePoints.geometry.getAttribute('position') as THREE.BufferAttribute;
    posAttr.array.set(nodeSystem.positions);
    posAttr.needsUpdate = true;

    const actAttr = nodePoints.geometry.getAttribute('aActivity') as THREE.BufferAttribute;
    actAttr.array.set(nodeSystem.activities);
    actAttr.needsUpdate = true;

    // Update node shader time
    nodeMaterial.uniforms.uTime.value = elapsed;

    // Speaking state: shift node color to warm amber
    const targetColor = isSpeaking
      ? new THREE.Color(0xddaa44) // Warm amber when speaking
      : COLORS.node; // Electric blue when idle
    nodeMaterial.uniforms.uColor.value.lerp(targetColor, 0.05);

    // Update connection shader
    connectionSystem.material.uniforms.uTime.value = elapsed;

    // Update sparks from signals
    updateSparks(
      sparkSystem,
      simulation.signals,
      nodeSystem.positions,
      nodeSystem.nodes,
      deltaTime
    );
    sparkSystem.material.uniforms.uTime.value = elapsed;

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
