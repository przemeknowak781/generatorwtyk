import React, { useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { FrameConfig, SocketConfig } from '../types';
import { generateSchukoSocketGeometry } from '../utils/socketGeometry';

interface Props {
  frameConfig: FrameConfig;
  socketConfig: SocketConfig;
  qualityMultiplier?: number;
}

export const SchukoSocket: React.FC<Props> = ({
  frameConfig,
  socketConfig,
  qualityMultiplier = 1,
}) => {
  const { body, layout } = useMemo(
    () => generateSchukoSocketGeometry(frameConfig, socketConfig, qualityMultiplier),
    [
      frameConfig.innerHoleDiameter,
      frameConfig.stepDiameter,
      frameConfig.seatingRingDepth,
      frameConfig.shrinkagePercent,
      socketConfig.flangeHeight,
      socketConfig.faceplateClearance,
      qualityMultiplier,
    ],
  );

  useEffect(() => {
    return () => {
      body.dispose();
    };
  }, [body]);

  if (!socketConfig.visible) return null;

  const flipY = frameConfig.flipY ? -1 : 1;
  const displayColor = socketConfig.matchFrameColor ? frameConfig.color : socketConfig.color;

  return (
    <group position={[0, 0, layout.stepZ]} scale={[1, flipY, 1]}>
      <mesh geometry={body} castShadow receiveShadow>
        <meshPhysicalMaterial
          color={displayColor}
          roughness={socketConfig.roughness}
          metalness={socketConfig.metalness}
          clearcoat={0.35}
          clearcoatRoughness={0.3}
          side={THREE.FrontSide}
        />
      </mesh>
    </group>
  );
};
