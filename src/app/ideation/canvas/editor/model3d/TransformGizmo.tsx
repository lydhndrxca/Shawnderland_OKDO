"use client";

import { useEffect, useRef, useMemo } from 'react';
import { TransformControls } from '@react-three/drei';
import * as THREE from 'three';
import { useModel3DEditor } from './Model3DEditorContext';

function FFDPointGizmo() {
  const { state, actions } = useModel3DEditor();
  const controlsRef = useRef<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any
  const groupRef = useRef<THREE.Group>(null);
  const draggingRef = useRef(false);
  const startCentroidRef = useRef(new THREE.Vector3());

  const { selectedPointIndices, latticePoints } = state.ffd;

  const centroid = useMemo(() => {
    if (selectedPointIndices.length === 0 || latticePoints.length === 0) return null;
    const c = new THREE.Vector3();
    for (const idx of selectedPointIndices) {
      if (latticePoints[idx]) c.add(latticePoints[idx]);
    }
    c.divideScalar(selectedPointIndices.length);
    return c;
  }, [selectedPointIndices, latticePoints]);

  useEffect(() => {
    if (centroid && groupRef.current && !draggingRef.current) {
      groupRef.current.position.copy(centroid);
    }
  }, [centroid]);

  useEffect(() => {
    if (!controlsRef.current) return;
    const c = controlsRef.current;

    const handleDragChange = (e: { value: boolean }) => {
      if (e.value) {
        draggingRef.current = true;
        if (centroid) startCentroidRef.current.copy(centroid);
        actions.pushUndo('FFD gizmo move');
      } else {
        if (draggingRef.current && groupRef.current) {
          const delta = new THREE.Vector3().subVectors(groupRef.current.position, startCentroidRef.current);
          if (delta.length() > 0.0001) {
            const newPoints = latticePoints.map((p, i) => {
              if (selectedPointIndices.includes(i)) {
                return p.clone().add(delta);
              }
              return p.clone();
            });
            actions.setFFDLatticePoints(newPoints);
            actions.markDirty();
          }
          draggingRef.current = false;
        }
      }
    };

    c.addEventListener('dragging-changed', handleDragChange);
    return () => c.removeEventListener('dragging-changed', handleDragChange);
  }, [actions, centroid, latticePoints, selectedPointIndices]);

  if (!centroid || selectedPointIndices.length === 0) return null;

  const translationSnap = state.gridSnap.enabled ? state.gridSnap.value / 100 : undefined;

  return (
    <>
      <group ref={groupRef} />
      {groupRef.current && (
        <TransformControls
          ref={controlsRef}
          object={groupRef.current}
          mode="translate"
          translationSnap={translationSnap}
          size={0.8}
        />
      )}
    </>
  );
}

function ModelGizmo() {
  const { state, actions } = useModel3DEditor();
  const controlsRef = useRef<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any

  const showGizmo = state.activeTool === 'move' || state.activeTool === 'rotate' || state.activeTool === 'scale';

  useEffect(() => {
    if (!controlsRef.current) return;
    const c = controlsRef.current;

    const onChange = () => {
      const obj = c.object as THREE.Object3D | undefined;
      if (!obj) return;
      actions.setPosition(obj.position.clone());
      actions.setRotation(obj.rotation.clone());
      actions.setScale(obj.scale.clone());
    };

    c.addEventListener('change', onChange);
    return () => c.removeEventListener('change', onChange);
  }, [actions]);

  useEffect(() => {
    if (!controlsRef.current) return;
    const c = controlsRef.current;
    const handler = (e: { value: boolean }) => {
      if (e.value) actions.pushUndo('Transform model');
    };
    c.addEventListener('dragging-changed', handler);
    return () => c.removeEventListener('dragging-changed', handler);
  }, [actions]);

  if (!showGizmo || !state.modelRef.current) return null;

  const translationSnap = state.gridSnap.enabled ? state.gridSnap.value / 100 : undefined;
  const rotationSnap = state.rotateSnap.enabled ? (state.rotateSnap.value * Math.PI) / 180 : undefined;
  const scaleSnap = state.scaleSnap.enabled ? state.scaleSnap.value / 100 : undefined;

  return (
    <TransformControls
      ref={controlsRef}
      object={state.modelRef.current}
      mode={state.transformMode}
      translationSnap={translationSnap}
      rotationSnap={rotationSnap}
      scaleSnap={scaleSnap}
      size={1}
    />
  );
}

export default function TransformGizmo() {
  const { state } = useModel3DEditor();
  const showFFDGizmo = state.ffd.enabled && state.ffd.selectedPointIndices.length > 0;

  return (
    <>
      {showFFDGizmo ? <FFDPointGizmo /> : <ModelGizmo />}
    </>
  );
}
