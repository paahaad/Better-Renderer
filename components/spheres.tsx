"use client"

import { useState, useRef } from "react"
import { Canvas, useFrame, type ThreeElements } from "@react-three/fiber"
import { OrbitControls } from "@react-three/drei"
import type * as THREE from "three"

function Sphere({ position, color, ...props }: ThreeElements["mesh"] & { color: THREE.ColorRepresentation }) {
  const mesh = useRef<THREE.Mesh>(null!)
  const [hovered, setHover] = useState(false)
  const [clicked, setClick] = useState(false)

  useFrame((state, delta) => {
    mesh.current.rotation.x += delta * 0.2
    mesh.current.rotation.y += delta * 0.2
  })

  return (
    <mesh
      position={position}
      ref={mesh}
      scale={clicked ? 1.5 : 1}
      onClick={() => setClick(!clicked)}
      onPointerOver={() => setHover(true)}
      onPointerOut={() => setHover(false)}
      {...props}
    >
      <sphereGeometry args={[0.2, 32, 32]} />
      <meshStandardMaterial color={hovered ? "hotpink" : color} />
    </mesh>
  )
}

function Spheres() {
  const spheres = new Array(100).fill(null).map((_, index) => ({
    position: [Math.random() * 10 - 5, Math.random() * 10 - 5, Math.random() * 10 - 5] as [number, number, number],
    color: `hsl(${Math.random() * 360}, 50%, 50%)`,
  }))

  return (
    <>
      {spheres.map((props, index) => (
        <Sphere key={index} {...props} />
      ))}
    </>
  )
}

export default function Scene() {
  return (
    <div className="w-full h-screen">
      <Canvas camera={{ position: [0, 0, 15] }}>
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} />
        <Spheres />
        <OrbitControls />
      </Canvas>
    </div>
  )
}

