
import React, { useMemo, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { FrameConfig } from '../types';
import { generateFrameGeometry, generateSolidHalfCone } from '../utils/geometry';

interface SocketFrameProps {
  config: FrameConfig;
  qualityMultiplier?: number;
  onMeshReady?: (object: THREE.Object3D) => void;
}

export const SocketFrame: React.FC<SocketFrameProps> = ({ config, qualityMultiplier = 1, onMeshReady }) => {
  const groupRef = useRef<THREE.Group>(null);

  const geometry = useMemo(() => {
    return generateFrameGeometry(config, qualityMultiplier);
  }, [config, qualityMultiplier]);

  const comp = 1 / (1 - (config.shrinkagePercent / 100));
  const masterScale: [number, number, number] = [1, config.flipY ? -1 : 1, 1];

  useEffect(() => {
    if (groupRef.current && onMeshReady) {
      onMeshReady(groupRef.current);
    }
  }, [geometry, config.showBalls, config.showCones, config.ballSize, config.coneHeight, onMeshReady]);

  const balls = useMemo(() => {
    if (!config.showBalls) return [];

    const ballItems = [];
    const rBase = (config.outerDiameter / 2) * comp;
    const rPos = rBase + (config.ballRadialOffset * comp);
    const zPos = config.ballZOffset * comp;
    const radius = config.ballSize * comp;

    const ratio = Math.max(-1, Math.min(1, zPos / radius));
    const thetaLength = Math.acos(-ratio);

    const points: THREE.Vector2[] = [];
    const segments = Math.floor(48 * qualityMultiplier);
    const radialSegs = Math.floor(64 * qualityMultiplier);

    points.push(new THREE.Vector2(0, radius * Math.cos(thetaLength)));
    for (let i = segments; i >= 0; i--) {
      const phi = (i / segments) * thetaLength;
      points.push(new THREE.Vector2(radius * Math.sin(phi), radius * Math.cos(phi)));
    }

    const ballGeom = new THREE.LatheGeometry(points, radialSegs);

    for (let i = 0; i < config.petals; i++) {
      const theta = (i / config.petals) * Math.PI * 2;
      ballItems.push({
        position: [rPos * Math.cos(theta), rPos * Math.sin(theta), zPos] as [number, number, number],
        geometry: ballGeom
      });
    }
    return ballItems;
  }, [config.showBalls, config.petals, config.outerDiameter, config.shrinkagePercent, config.ballSize, config.ballRadialOffset, config.ballZOffset, qualityMultiplier]);

  const cones = useMemo(() => {
    if (!config.showCones) return [];

    const coneItems = [];
    const rBase = (config.outerDiameter / 2) * comp;
    const rPos = rBase + (config.coneRadialOffset * comp);
    const zPos = config.coneZOffset * comp;
    const radius = config.coneSize * comp;
    const height = config.coneHeight * comp;

    const radialSegs = Math.floor(64 * qualityMultiplier);
    // Custom solid half-cone geometry
    const coneGeom = generateSolidHalfCone(radius, height, radialSegs);

    for (let i = 0; i < config.petals; i++) {
      const theta = (i / config.petals) * Math.PI * 2;

      const matrix = new THREE.Matrix4();
      const up = new THREE.Vector3(0, 0, 1);
      const forward = new THREE.Vector3(Math.cos(theta), Math.sin(theta), 0);
      const right = new THREE.Vector3().crossVectors(forward, up);

      // Local Y points outward (forward vector).
      // Local Z points up (up vector).
      // This ensures the half-cone cut (which is at local Z=0) sits on the frame's horizontal surface.
      matrix.makeBasis(right, forward, up);
      const quaternion = new THREE.Quaternion().setFromRotationMatrix(matrix);

      coneItems.push({
        position: [rPos * Math.cos(theta), rPos * Math.sin(theta), zPos] as [number, number, number],
        quaternion: quaternion,
        geometry: coneGeom
      });
    }
    return coneItems;
  }, [config.showCones, config.petals, config.outerDiameter, config.shrinkagePercent, config.coneSize, config.coneHeight, config.coneRadialOffset, config.coneZOffset, qualityMultiplier]);

  const sharedMaterial = (
    <meshPhysicalMaterial
      color={config.color}
      roughness={config.roughness}
      metalness={config.metalness}
      clearcoat={1.0}
      clearcoatRoughness={0.05}
    />
  );

  return (
    <group ref={groupRef} scale={masterScale}>
      <mesh geometry={geometry} castShadow receiveShadow>
        <meshPhysicalMaterial
          color={config.color}
          roughness={config.roughness}
          metalness={config.metalness}
          clearcoat={1.0}
          clearcoatRoughness={0.05}
          side={THREE.DoubleSide}
          wireframe={config.wireframeMode}
        />
      </mesh>

      {config.showBalls && balls.map((ball, idx) => (
        <mesh
          key={`ball-${idx}`}
          position={ball.position}
          geometry={ball.geometry}
          rotation={[Math.PI / 2, 0, 0]}
          castShadow
        >
          {sharedMaterial}
        </mesh>
      ))}

      {config.showCones && cones.map((cone, idx) => (
        <mesh
          key={`cone-${idx}`}
          position={cone.position}
          geometry={cone.geometry}
          quaternion={cone.quaternion}
          castShadow
        >
          {sharedMaterial}
        </mesh>
      ))}
    </group>
  );
};
