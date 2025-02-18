"use client"

import { useRef, useMemo, useCallback } from "react"
import { Canvas, useFrame, useThree } from "@react-three/fiber"
import { OrbitControls, Instances } from "@react-three/drei"
import * as THREE from "three"

const SPHERE_COUNT = 1000000
const VISIBLE_SPHERES = 100000

function Spheres() {
  const meshRef = useRef<THREE.InstancedMesh>(null!)
  const { camera, raycaster, mouse } = useThree()
  const tempObject = useMemo(() => new THREE.Object3D(), [])
  const tempColor = useMemo(() => new THREE.Color(), [])
  const visibleIndicesRef = useRef<number[]>([])

  const spheres = useMemo(() => {
    const temp = []
    for (let i = 0; i < SPHERE_COUNT; i++) {
      const position = new THREE.Vector3(
        (Math.random() - 0.5) * 100,
        (Math.random() - 0.5) * 100,
        (Math.random() - 0.5) * 100,
      )
      const color = new THREE.Color(`hsl(${Math.random() * 360}, 50%, 50%)`)
      temp.push({ position, color })
    }
    return temp
  }, [])

  const frustum = useMemo(() => new THREE.Frustum(), [])
  const projScreenMatrix = useMemo(() => new THREE.Matrix4(), [])

  const updateInstancedMesh = useCallback(() => {
    visibleIndicesRef.current = []
    let visibleCount = 0

    frustum.setFromProjectionMatrix(
      projScreenMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse)
    )

    for (let i = 0; i < SPHERE_COUNT && visibleCount < VISIBLE_SPHERES; i++) {
      if (frustum.containsPoint(spheres[i].position)) {
        tempObject.position.copy(spheres[i].position)
        tempObject.updateMatrix()
        meshRef.current.setMatrixAt(visibleCount, tempObject.matrix)
        meshRef.current.setColorAt(visibleCount, spheres[i].color)
        visibleIndicesRef.current[visibleCount] = i
        visibleCount++
      }
    }

    meshRef.current.count = visibleCount
    meshRef.current.instanceMatrix.needsUpdate = true
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true
    }
  }, [spheres, frustum, projScreenMatrix, camera, tempObject])

  useFrame(() => {
    updateInstancedMesh()
  })

  const handleClick = useCallback(() => {
    if (meshRef.current) {
      raycaster.setFromCamera(mouse, camera)
      const intersects = raycaster.intersectObject(meshRef.current)

      if (intersects.length > 0 && intersects[0].instanceId !== undefined) {
        const instanceId = intersects[0].instanceId
        const originalIndex = visibleIndicesRef.current[instanceId]

        if (originalIndex !== undefined) {
          // Update original sphere color
          spheres[originalIndex].color.setHSL(Math.random(), 0.75, 0.5)
          // Update instance color immediately
          meshRef.current.setColorAt(instanceId, spheres[originalIndex].color)
          meshRef.current.instanceColor!.needsUpdate = true
        }
      }
    }
  }, [raycaster, mouse, camera, spheres])

  return (
    <Instances>
      <sphereGeometry args={[0.15, 8, 6]} />
      <meshPhongMaterial />
      <instancedMesh
        ref={meshRef}
        args={[undefined as any, undefined as any, VISIBLE_SPHERES]}
        onClick={handleClick}
      >
        <sphereGeometry args={[0.15, 8, 6]} />
        <meshPhongMaterial />
      </instancedMesh>
    </Instances>
  )
}

export default function Scene() {
  return (
    <div style={{ height: "100vh" }}>
      <Canvas camera={{ position: [0, 0, 50] }}>
        <color attach="background" args={["#000"]} />
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} />
        <Spheres />
        <OrbitControls />
      </Canvas>
    </div>
  )
}