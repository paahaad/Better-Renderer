// @ts-nocheck
"use client"

import { useRef, useMemo, useState } from "react"
import { Canvas, useFrame, useThree } from "@react-three/fiber"
import { OrbitControls, Instance, Instances } from "@react-three/drei"
import * as THREE from "three"
import { createNoise4D } from "simplex-noise"

const noise4D = createNoise4D()

// Spatial grid implementation remains the same
class SpatialGrid {
  constructor(cellSize = 1) {
    this.cellSize = cellSize
    this.grid = new Map()
  }

  key(x, y, z) {
    const ix = Math.floor(x / this.cellSize)
    const iy = Math.floor(y / this.cellSize)
    const iz = Math.floor(z / this.cellSize)
    return `${ix},${iy},${iz}`
  }

  add(position, index) {
    const key = this.key(position.x, position.y, position.z)
    if (!this.grid.has(key)) {
      this.grid.set(key, new Set())
    }
    this.grid.get(key).add(index)
  }

  clear() {
    this.grid.clear()
  }

  getNearby(position, radius = 1) {
    const nearby = new Set()
    const cellRadius = Math.ceil(radius / this.cellSize)
    const baseKey = this.key(position.x, position.y, position.z)
    const [bx, by, bz] = baseKey.split(",").map(Number)

    for (let x = -cellRadius; x <= cellRadius; x++) {
      for (let y = -cellRadius; y <= cellRadius; y++) {
        for (let z = -cellRadius; z <= cellRadius; z++) {
          const key = `${bx + x},${by + y},${bz + z}`
          const cell = this.grid.get(key)
          if (cell) {
            cell.forEach(index => nearby.add(index))
          }
        }
      }
    }
    return nearby
  }
}

function AnimatedSpheres({ count = 100 }) {
  const meshRef = useRef()
  const [selectedSphere, setSelectedSphere] = useState(null)
  const tempObject = useMemo(() => new THREE.Object3D(), [])
  const tempColor = useMemo(() => new THREE.Color(), [])
  const raycaster = new THREE.Raycaster()
  const { camera, pointer } = useThree()

  // Create spatial grid
  const spatialGrid = useMemo(() => new SpatialGrid(1), [])
  const mouseWorldPos = useMemo(() => new THREE.Vector3(), [])

  // Create color array for all instances
  const colors = useMemo(() => new Float32Array(count * 3), [count])

  const particles = useMemo(() => {
    const temp = []
    for (let i = 0; i < count; i++) {
      const position = new THREE.Vector3(
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 10
      )
      const speed = 0.01 + Math.random() / 200
      const offset = Math.random() * 4000
      temp.push({ position, speed, offset })
    }
    return temp
  }, [count])

  const handleClick = (event) => {
    // Get mouse position in world space
    mouseWorldPos.set(
      (pointer.x * 2) - 1,
      -(pointer.y * 2) + 1,
      0.5
    )
    mouseWorldPos.unproject(camera)

    // Update raycaster
    raycaster.setFromCamera(pointer, camera)

    // Get nearby particles only
    spatialGrid.clear()
    particles.forEach((particle, index) => {
      spatialGrid.add(particle.position, index)
    })

    const nearbyIndices = spatialGrid.getNearby(mouseWorldPos, 2)

    if (nearbyIndices.size > 0) {
      const intersects = raycaster.intersectObject(meshRef.current)
      if (intersects.length > 0) {
        const instanceId = intersects[0].instanceId
        setSelectedSphere(instanceId === selectedSphere ? null : instanceId)
      }
    } else {
      setSelectedSphere(null)
    }
  }

  useFrame((state, delta) => {
    const time = state.clock.elapsedTime

    particles.forEach((particle, i) => {
      const { position, speed, offset } = particle

      // Update position
      const noiseX = noise4D(position.x * 0.1, position.y * 0.1, position.z * 0.1, time * 0.1 + offset) * 2
      const noiseY = noise4D(position.x * 0.1 + 100, position.y * 0.1 + 100, position.z * 0.1 + 100, time * 0.1 + offset) * 2
      const noiseZ = noise4D(position.x * 0.1 + 200, position.y * 0.1 + 200, position.z * 0.1 + 200, time * 0.1 + offset) * 2

      position.x += noiseX * speed * delta * 60
      position.y += noiseY * speed * delta * 60
      position.z += noiseZ * speed * delta * 60

      // Wrap around boundaries
      position.x = ((position.x + 5) % 10) - 5
      position.y = ((position.y + 5) % 10) - 5
      position.z = ((position.z + 5) % 10) - 5

      // Update instance position
      tempObject.position.copy(position)
      tempObject.updateMatrix()
      meshRef.current.setMatrixAt(i, tempObject.matrix)

      // Set color based on selection
      if (i === selectedSphere) {
        // Selected sphere color (bright red)
        tempColor.setRGB(1, 0, 0)
      } else {
        // Normal animation color
        const hue = (noise4D(position.x * 0.1, position.y * 0.1, position.z * 0.1, time * 0.1) + 1) * 0.5
        tempColor.setHSL(hue, 0.6, 0.6)
      }

      // Update color in the instancedMesh
      meshRef.current.setColorAt(i, tempColor)
    })

    meshRef.current.instanceMatrix.needsUpdate = true
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true
  })

  return (
    <Instances ref={meshRef} limit={count} onClick={handleClick}>
      <sphereGeometry args={[0.1, 32, 32]} />
      <meshPhongMaterial vertexColors={true} />
      {particles.map((_, i) => (
        <Instance key={i} />
      ))}
    </Instances>
  )
}

export default function Scene() {
  return (
    <div style={{ height: "100vh" }}>
      <Canvas camera={{ position: [0, 0, 15] }}>
        <color attach="background" args={["#000"]} />
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} />
        <AnimatedSpheres />
        <OrbitControls />
      </Canvas>
    </div>
  )
}