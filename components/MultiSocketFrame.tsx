import React, { useMemo, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { FrameConfig, MultiSocketConfig } from '../types';
import { generateMultiSocketGeometry } from '../utils/multiSocketGeometry';

interface MultiSocketFrameProps {
    config: FrameConfig;
    multiConfig: MultiSocketConfig;
    qualityMultiplier?: number;
    onMeshReady?: (object: THREE.Object3D) => void;
}

export const MultiSocketFrame: React.FC<MultiSocketFrameProps> = ({
    config,
    multiConfig,
    qualityMultiplier = 1,
    onMeshReady,
}) => {
    const groupRef = useRef<THREE.Group>(null);

    const geometry = useMemo(() => {
        return generateMultiSocketGeometry(config, multiConfig, qualityMultiplier);
    }, [config, multiConfig, qualityMultiplier]);

    useEffect(() => {
        if (groupRef.current && onMeshReady) {
            onMeshReady(groupRef.current);
        }
    }, [geometry, onMeshReady]);

    const masterScale: [number, number, number] = [1, config.flipY ? -1 : 1, 1];

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
        </group>
    );
};
