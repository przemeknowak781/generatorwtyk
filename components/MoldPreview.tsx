import React, { useMemo } from 'react';
import * as THREE from 'three';
import { FrameConfig, MoldConfig } from '../types';
import {
    getMoldQuadrantParts,
    generateKeyHemisphere,
    MoldQuadrantParts,
    KeyInfo,
} from '../utils/moldGeometry';

interface MoldPreviewProps {
    frameConfig: FrameConfig;
    moldConfig: MoldConfig;
}

const QUADRANTS = [0, 1, 2, 3] as const;

/** Direction vectors for exploded view offset per quadrant */
const EXPLODE_DIRS: [number, number][] = [
    [1, 1],    // Q1: +X +Y
    [-1, 1],   // Q2: -X +Y
    [-1, -1],  // Q3: -X -Y
    [1, -1],   // Q4: +X -Y
];

const QuadrantMold: React.FC<{
    parts: MoldQuadrantParts;
    frameColor: string;
    roughness: number;
    metalness: number;
    moldConfig: MoldConfig;
}> = ({ parts, frameColor, roughness, metalness, moldConfig }) => {
    const keyGeom = useMemo(() => generateKeyHemisphere(moldConfig.keyRadius, 12), [moldConfig.keyRadius]);

    return (
        <group>
            {/* Frame quarter – solid, colored like the main frame */}
            <mesh geometry={parts.frameQuarter} castShadow>
                <meshPhysicalMaterial
                    color={frameColor}
                    roughness={roughness}
                    metalness={metalness}
                    clearcoat={1.0}
                    clearcoatRoughness={0.05}
                    side={THREE.DoubleSide}
                />
            </mesh>

            {/* Base plate */}
            {moldConfig.showBase && (
                <mesh geometry={parts.base}>
                    <meshPhysicalMaterial
                        color="#b0b0b0"
                        transparent
                        opacity={moldConfig.moldOpacity}
                        roughness={0.6}
                        side={THREE.DoubleSide}
                    />
                </mesh>
            )}

            {/* Outer curved wall */}
            <mesh geometry={parts.outerWall}>
                <meshPhysicalMaterial
                    color="#a0a0a0"
                    transparent
                    opacity={moldConfig.moldOpacity}
                    roughness={0.6}
                    side={THREE.DoubleSide}
                />
            </mesh>

            {/* Dividing wall A */}
            <mesh geometry={parts.wallA}>
                <meshPhysicalMaterial
                    color="#909090"
                    transparent
                    opacity={moldConfig.moldOpacity}
                    roughness={0.6}
                    side={THREE.DoubleSide}
                />
            </mesh>

            {/* Dividing wall B */}
            <mesh geometry={parts.wallB}>
                <meshPhysicalMaterial
                    color="#909090"
                    transparent
                    opacity={moldConfig.moldOpacity}
                    roughness={0.6}
                    side={THREE.DoubleSide}
                />
            </mesh>

            {/* Registration keys */}
            {moldConfig.showKeys && parts.keys.map((k: KeyInfo, i: number) => (
                <mesh
                    key={i}
                    geometry={keyGeom}
                    position={k.position}
                    rotation={[-Math.PI / 2, 0, k.wallAngle]}
                >
                    <meshStandardMaterial
                        color={k.isPositive ? '#4ade80' : '#f87171'}
                        roughness={0.4}
                    />
                </mesh>
            ))}
        </group>
    );
};

export const MoldPreview: React.FC<MoldPreviewProps> = ({
    frameConfig,
    moldConfig,
}) => {
    const allParts = useMemo(() => {
        return QUADRANTS.map((q) =>
            getMoldQuadrantParts(q, frameConfig, moldConfig, 0.5),
        );
    }, [frameConfig, moldConfig]);

    const dist = moldConfig.explodeDistance;
    const norm = 1 / Math.SQRT2;

    return (
        <group>
            {QUADRANTS.map((q) => {
                const [dx, dy] = EXPLODE_DIRS[q];
                return (
                    <group
                        key={q}
                        position={[dx * dist * norm, dy * dist * norm, 0]}
                    >
                        <QuadrantMold
                            parts={allParts[q]}
                            frameColor={frameConfig.color}
                            roughness={frameConfig.roughness}
                            metalness={frameConfig.metalness}
                            moldConfig={moldConfig}
                        />
                    </group>
                );
            })}
        </group>
    );
};
