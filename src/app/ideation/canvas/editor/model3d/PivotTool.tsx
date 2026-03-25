"use client";

import { useCallback } from 'react';
import { useThree } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import * as THREE from 'three';
import { useModel3DEditor } from './Model3DEditorContext';

function PivotIndicator() {
  const { state } = useModel3DEditor();
  const p = state.pivotOffset;
  const len = 0.15;

  return (
    <group position={[p.x, p.y, p.z]}>
      <Line points={[[-len, 0, 0], [len, 0, 0]]} color="#f44336" lineWidth={2} />
      <Line points={[[0, -len, 0], [0, len, 0]]} color="#4caf50" lineWidth={2} />
      <Line points={[[0, 0, -len], [0, 0, len]]} color="#2196f3" lineWidth={2} />
      <mesh>
        <sphereGeometry args={[0.03, 8, 8]} />
        <meshBasicMaterial color="#ffeb3b" />
      </mesh>
    </group>
  );
}

function PivotSnapHandler() {
  const { state, actions } = useModel3DEditor();
  const { raycaster, pointer, camera } = useThree();

  const handleClick = useCallback((e: THREE.Event & { stopPropagation: () => void }) => {
    if (!state.pivotSnapMode || !state.modelRef.current) return;
    e.stopPropagation();

    raycaster.setFromCamera(pointer, camera);
    const meshes: THREE.Mesh[] = [];
    state.modelRef.current.traverse((c) => { if (c instanceof THREE.Mesh) meshes.push(c); });
    const hits = raycaster.intersectObjects(meshes);
    if (hits.length > 0) {
      actions.setPivotOffset(hits[0].point.clone());
      actions.setPivotSnapMode(false);
    }
  }, [state.pivotSnapMode, state.modelRef, raycaster, pointer, camera, actions]);

  if (!state.pivotSnapMode || !state.modelRef.current) return null;

  return (
    <mesh
      visible={false}
      onClick={handleClick}
      position={[0, 0, 0]}
    >
      <boxGeometry args={[100, 100, 100]} />
      <meshBasicMaterial transparent opacity={0} />
    </mesh>
  );
}

export { PivotIndicator, PivotSnapHandler };
