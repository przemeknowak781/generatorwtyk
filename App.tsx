
import React, { useState, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, Grid, ContactShadows } from '@react-three/drei';
import * as THREE_CORE from 'three';
import { FrameConfig, MoldConfig, MultiSocketConfig, SocketConfig, DEFAULT_CONFIG, DEFAULT_MOLD_CONFIG, DEFAULT_MULTI_SOCKET_CONFIG, DEFAULT_SOCKET_CONFIG } from './types';
import { SocketFrame } from './components/SocketFrame';
import { MultiSocketFrame } from './components/MultiSocketFrame';
import { MoldPreview } from './components/MoldPreview';
import { SchukoSocket } from './components/SchukoSocket';
import { Controls } from './components/Controls';
import { CadExportPanel } from './components/CadExportPanel'; // [NOWY]
import { Login } from './components/Login';
import { downloadSTL, downloadMultipleSTL } from './utils/exportUtils';
import { generateFrameGeometry, generateSolidHalfCone } from './utils/geometry';
import { generateMultiSocketGeometry } from './utils/multiSocketGeometry';
import { buildMoldQuadrantGroup } from './utils/moldGeometry';

const THREE_NS = THREE_CORE;

const App: React.FC = () => {
  const [authed, setAuthed] = useState<boolean>(() => {
    try { return sessionStorage.getItem('auth') === '1'; } catch { return false; }
  });
  const [config, setConfig] = useState<FrameConfig>(DEFAULT_CONFIG);
  const [moldConfig, setMoldConfig] = useState<MoldConfig>(DEFAULT_MOLD_CONFIG);
  const [multiConfig, setMultiConfig] = useState<MultiSocketConfig>(DEFAULT_MULTI_SOCKET_CONFIG);
  const [socketConfig, setSocketConfig] = useState<SocketConfig>(DEFAULT_SOCKET_CONFIG);
  const [isExporting, setIsExporting] = useState(false);
  const [isCadOpen, setIsCadOpen] = useState(false); // [NOWY]
  const objectRef = useRef<THREE_CORE.Object3D | null>(null);

  const handleMeshReady = (obj: THREE_CORE.Object3D) => {
    objectRef.current = obj;
  };

  const handleExport = () => {
    setIsExporting(true);

    const exportQuality = 3.0;
    const exportGroup = new THREE_NS.Group();

    // 1. Main Frame
    const highPolyGeom = generateFrameGeometry(config, exportQuality);
    const mainMesh = new THREE_NS.Mesh(highPolyGeom, new THREE_NS.MeshBasicMaterial());
    exportGroup.add(mainMesh);

    const comp = 1 / (1 - (config.shrinkagePercent / 100));

    // 2. Balls
    if (config.showBalls) {
      const rBase = (config.outerDiameter / 2) * comp;
      const rPos = rBase + (config.ballRadialOffset * comp);
      const zPos = config.ballZOffset * comp;
      const radius = config.ballSize * comp;

      const ratio = Math.max(-1, Math.min(1, zPos / radius));
      const thetaLength = Math.acos(-ratio);

      const points: THREE_CORE.Vector2[] = [];
      const segments = Math.floor(48 * exportQuality);
      const radialSegs = Math.floor(64 * exportQuality);

      points.push(new THREE_NS.Vector2(0, radius * Math.cos(thetaLength)));
      for (let i = segments; i >= 0; i--) {
        const phi = (i / segments) * thetaLength;
        points.push(new THREE_NS.Vector2(radius * Math.sin(phi), radius * Math.cos(phi)));
      }

      const ballGeom = new THREE_NS.LatheGeometry(points, radialSegs);

      for (let i = 0; i < config.petals; i++) {
        const theta = (i / config.petals) * Math.PI * 2;
        const ballMesh = new THREE_NS.Mesh(ballGeom, new THREE_NS.MeshBasicMaterial());
        ballMesh.position.set(rPos * Math.cos(theta), rPos * Math.sin(theta), zPos);
        ballMesh.rotation.set(Math.PI / 2, 0, 0);
        exportGroup.add(ballMesh);
      }
    }

    // 3. Cones
    if (config.showCones) {
      const rBase = (config.outerDiameter / 2) * comp;
      const rPos = rBase + (config.coneRadialOffset * comp);
      const zPos = config.coneZOffset * comp;
      const radius = config.coneSize * comp;
      const height = config.coneHeight * comp;

      const radialSegs = Math.floor(64 * exportQuality);
      // High-poly solid half-cone
      const coneGeom = generateSolidHalfCone(radius, height, radialSegs);

      for (let i = 0; i < config.petals; i++) {
        const theta = (i / config.petals) * Math.PI * 2;
        const coneMesh = new THREE_NS.Mesh(coneGeom, new THREE_NS.MeshBasicMaterial());

        const matrix = new THREE_NS.Matrix4();
        const up = new THREE_NS.Vector3(0, 0, 1);
        const forward = new THREE_NS.Vector3(Math.cos(theta), Math.sin(theta), 0);
        const right = new THREE_NS.Vector3().crossVectors(forward, up);
        matrix.makeBasis(right, forward, up);
        const quaternion = new THREE_NS.Quaternion().setFromRotationMatrix(matrix);

        coneMesh.position.set(rPos * Math.cos(theta), rPos * Math.sin(theta), zPos);
        coneMesh.quaternion.copy(quaternion);
        exportGroup.add(coneMesh);
      }
    }

    exportGroup.scale.set(1, config.flipY ? -1 : 1, 1);
    exportGroup.updateMatrixWorld(true);

    setTimeout(() => {
      downloadSTL(exportGroup, `ramka_PRO_DETAIL_${config.petals}_platkow.stl`);
      setIsExporting(false);
    }, 100);
  };

  const handleMoldExport = () => {
    setIsExporting(true);
    const exportQuality = 3.0;

    setTimeout(() => {
      const groups: THREE_CORE.Group[] = [];
      const filenames: string[] = [];

      for (let q = 0; q < 4; q++) {
        const group = buildMoldQuadrantGroup(
          q as 0 | 1 | 2 | 3,
          config,
          moldConfig,
          exportQuality,
        );
        group.updateMatrixWorld(true);
        groups.push(group);
        filenames.push(`ramka_mold_Q${q + 1}.stl`);
      }

      downloadMultipleSTL(groups, filenames);
      setTimeout(() => setIsExporting(false), 2000);
    }, 100);
  };

  const handleMultiExport = () => {
    setIsExporting(true);
    const exportQuality = 3.0;

    setTimeout(() => {
      const geom = generateMultiSocketGeometry(config, multiConfig, exportQuality);
      const group = new THREE_NS.Group();
      group.add(new THREE_NS.Mesh(geom, new THREE_NS.MeshBasicMaterial()));
      group.scale.set(1, config.flipY ? -1 : 1, 1);
      group.updateMatrixWorld(true);

      downloadSTL(group, `ramka_MULTI_${multiConfig.socketCount}x.stl`);
      setIsExporting(false);
    }, 100);
  };

  const radius = config.outerDiameter / 2;

  if (!authed) {
    return <Login onSuccess={() => setAuthed(true)} />;
  }

  return (
    <div className="relative w-full h-screen">
      <div className="absolute inset-0 z-0 bg-neutral-100">
        <Canvas shadows camera={{ position: [0, 60, 160], fov: 40 }}>
          <Environment preset="studio" intensity={0.4} />
          <ambientLight intensity={0.3} />
          <pointLight position={[100, 100, 100]} intensity={0.5} />
          <directionalLight
            position={[50, 100, 50]}
            intensity={0.6}
            castShadow
            shadow-mapSize={[1024, 1024]}
          />

          <group position={[0, radius, 0]}>
            {moldConfig.enabled ? (
              <MoldPreview frameConfig={config} moldConfig={moldConfig} />
            ) : multiConfig.enabled ? (
              <MultiSocketFrame config={config} multiConfig={multiConfig} onMeshReady={handleMeshReady} />
            ) : (
              <>
                <SocketFrame config={config} onMeshReady={handleMeshReady} />
                <SchukoSocket frameConfig={config} socketConfig={socketConfig} />
              </>
            )}
          </group>

          <ContactShadows
            position={[0, 0, 0]}
            opacity={0.3}
            scale={120}
            blur={2.5}
            far={10}
            color="#000000"
          />

          <Grid
            position={[0, 0, 0]}
            args={[400, 400]}
            cellSize={10}
            cellThickness={0.5}
            cellColor="#d1d5db"
            sectionSize={50}
            sectionThickness={1}
            sectionColor="#9ca3af"
            fadeDistance={500}
            fadeStrength={1}
          />

          <OrbitControls
            makeDefault
            minPolarAngle={0}
            maxPolarAngle={Math.PI / 2 - 0.1}
            target={[0, radius, 0]}
          />
        </Canvas>
      </div>

      <Controls
        config={config}
        setConfig={setConfig}
        moldConfig={moldConfig}
        setMoldConfig={setMoldConfig}
        multiConfig={multiConfig}
        setMultiConfig={setMultiConfig}
        socketConfig={socketConfig}
        setSocketConfig={setSocketConfig}
        onExport={moldConfig.enabled ? handleMoldExport : multiConfig.enabled ? handleMultiExport : handleExport}
      />

      {/* CAD Export Trigger Button (Floating) */}
      <button
        onClick={() => setIsCadOpen(true)}
        className="absolute top-6 right-6 z-20 bg-white/90 backdrop-blur-md px-6 py-4 rounded-2xl shadow-xl flex items-center gap-3 border border-indigo-100 hover:bg-indigo-600 hover:text-white transition-all group active:scale-95 pointer-events-auto"
      >
        <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center group-hover:bg-indigo-500 group-hover:text-white transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <div className="flex flex-col items-start leading-tight">
          <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Dokumentacja</span>
          <span className="text-sm font-black">EKSPORT CAD</span>
        </div>
      </button>

      {isCadOpen && (
        <CadExportPanel config={config} onClose={() => setIsCadOpen(false)} />
      )}

      {isExporting && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/60 backdrop-blur-sm">
          <div className="bg-white p-8 rounded-3xl shadow-2xl text-center border border-indigo-100 animate-in zoom-in duration-300">
            <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
            <h3 className="text-xl font-black text-indigo-900 mb-2">
              {moldConfig.enabled ? 'Generowanie Moldów STL' : 'Generowanie High-Poly STL'}
            </h3>
            <p className="text-gray-500 text-sm">
              {moldConfig.enabled
                ? 'Tworzenie 4 ćwiartek moldu...'
                : 'Zwiększanie gęstości siatki dla idealnego druku...'}
            </p>
          </div>
        </div>
      )}

      <div className="absolute bottom-6 right-6 pointer-events-none z-10 hidden md:block">
        <div className="bg-white/90 backdrop-blur-sm px-5 py-3 rounded-2xl shadow-xl text-[10px] text-gray-400 font-mono border border-gray-100">
          <span className="text-indigo-500 font-bold">Status:</span> Gotowy do druku<br />
          <span className="text-indigo-500 font-bold">Skala:</span> 1:1 (mm)<br />
          <span className="text-indigo-500 font-bold">Tryb:</span> {moldConfig.enabled ? 'Mold Slipcast (4×)' : multiConfig.enabled ? `Multi ${multiConfig.socketCount}×` : 'Ramka'}
        </div>
      </div>
    </div>
  );
};

export default App;
