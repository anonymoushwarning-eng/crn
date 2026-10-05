import { useEffect, useRef } from 'react'
import type * as ThreeTypes from 'three'

/**
 * Living particle swarm used as a page background.
 *
 * Adapted from the `ParticlesSwarm` sketch: instanced tumbling tetrahedra that
 * spiral through a foggy field with an ember palette. It is mounted fixed behind
 * all content, screen-blended into the ink backdrop so the black canvas
 * disappears and only the glow lands on the page. The field also drifts with the
 * scroll position for a parallax feel.
 */
export function ParticleField({ count }: { count?: number }) {
  const mountRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return
    // Respect users who ask for less motion (and save their GPU).
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    let disposed = false
    let cleanup = () => {}

    void (async () => {
      const THREE = await import('three')
      if (disposed) return

      const width = window.innerWidth
      const height = window.innerHeight
      const small = width < 768
      const COUNT = count ?? (small ? 8000 : 16000)

      // Tuning from the original sketch.
      const SCALE = 46
      const FLOW = 0.7
      const CHAOS = 0.65
      const TWIST = 1.4

      const renderer = new THREE.WebGLRenderer({
        antialias: !small,
        powerPreference: 'high-performance',
      })
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
      renderer.setSize(width, height)
      renderer.setClearColor(0x000000, 1)
      mount.appendChild(renderer.domElement)

      const scene = new THREE.Scene()
      // Very light fog: keeps distant particles a touch dimmer without erasing them.
      scene.fog = new THREE.FogExp2(0x000000, 0.0035)
      const camera = new THREE.PerspectiveCamera(62, width / height, 0.1, 2000)
      camera.position.set(0, 0, 70)

      // The whole swarm lives in a group so scroll can drift it.
      const group = new THREE.Group()
      scene.add(group)

      const geometry = new THREE.TetrahedronGeometry(0.42)
      const material = new THREE.MeshBasicMaterial({ color: 0xffffff })
      const mesh = new THREE.InstancedMesh(geometry, material, COUNT)
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
      mesh.frustumCulled = false
      group.add(mesh)

      const dummy = new THREE.Object3D()
      const color = new THREE.Color()
      const target = new THREE.Vector3()
      const positions: ThreeTypes.Vector3[] = []
      for (let i = 0; i < COUNT; i++) {
        positions.push(
          new THREE.Vector3((Math.random() - 0.5) * 100, (Math.random() - 0.5) * 100, (Math.random() - 0.5) * 100),
        )
        mesh.setColorAt(i, color.setHex(0xff5b37))
      }
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true

      let elapsed = 0
      let last = performance.now()
      let scrollY = window.scrollY
      let smoothScroll = scrollY
      let raf = 0
      let running = true

      const frame = () => {
        if (!running) return
        const now = performance.now()
        // Clamp big gaps (e.g. after the tab was hidden) so motion doesn't jump.
        elapsed += Math.min((now - last) / 1000, 0.1)
        last = now
        const time = elapsed
        const distortion = CHAOS * SCALE * 0.18

        for (let i = 0; i < COUNT; i++) {
          const u = i / (COUNT > 1 ? COUNT - 1 : 1)
          const band = Math.floor(u * 120)
          const local = u * 120 - band
          const angle = local * Math.PI * 2 + band * 0.618 + time * FLOW

          const waveA = Math.sin(angle * 3 + band * 0.13 + time * FLOW)
          const waveB = Math.cos(angle * 2 - band * 0.09 + time * FLOW * 0.7)
          const waveC = Math.sin(band * 0.21 + time * FLOW * 0.5)

          const radius = SCALE * (0.35 + 0.28 * Math.sin(band * 0.17 + time * FLOW) + 0.22 * waveA)
          const spiral = band * 0.055 + time * FLOW * 0.2

          target.set(
            Math.cos(angle + spiral) * radius + Math.sin(band * 0.31 + time * FLOW) * distortion,
            (band - 60) * SCALE * 0.028 + waveA * SCALE * 0.22 + waveB * distortion,
            Math.sin(angle * TWIST + spiral) * radius + waveC * SCALE * 0.35,
          )

          positions[i].lerp(target, 0.1)
          dummy.position.copy(positions[i])
          dummy.updateMatrix()
          mesh.setMatrixAt(i, dummy.matrix)

          // Ember → orange palette, brighter toward the core of each band.
          const hue = 0.015 + 0.055 * (0.5 + 0.5 * Math.sin(angle + time * FLOW * 0.4))
          const light = 0.34 + 0.5 * (0.5 + 0.5 * Math.sin(band * 0.12 + angle * 2))
          color.setHSL(hue, 1, light)
          mesh.setColorAt(i, color)
        }

        mesh.instanceMatrix.needsUpdate = true
        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true

        // Scroll parallax: ease the swarm up as the page moves, plus a slow float.
        smoothScroll += (scrollY - smoothScroll) * 0.06
        group.position.y = smoothScroll * 0.012 + Math.sin(time * 0.3) * 1.5
        group.rotation.z = smoothScroll * 0.00006

        renderer.render(scene, camera)
        raf = requestAnimationFrame(frame)
      }

      const onScroll = () => {
        scrollY = window.scrollY
      }

      const onVisibility = () => {
        if (document.hidden) {
          running = false
          cancelAnimationFrame(raf)
        } else if (!running) {
          running = true
          last = performance.now() // swallow the pause so motion doesn't jump
          raf = requestAnimationFrame(frame)
        }
      }

      const resize = () => {
        const w = window.innerWidth
        const h = window.innerHeight
        camera.aspect = w / h
        camera.updateProjectionMatrix()
        renderer.setSize(w, h)
      }

      window.addEventListener('scroll', onScroll, { passive: true })
      window.addEventListener('resize', resize)
      document.addEventListener('visibilitychange', onVisibility)

      frame()

      cleanup = () => {
        running = false
        cancelAnimationFrame(raf)
        window.removeEventListener('scroll', onScroll)
        window.removeEventListener('resize', resize)
        document.removeEventListener('visibilitychange', onVisibility)
        geometry.dispose()
        material.dispose()
        mesh.dispose()
        renderer.dispose()
        renderer.domElement.remove()
      }
    })()

    return () => {
      disposed = true
      cleanup()
    }
  }, [count])

  return (
    <div
      ref={mountRef}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 opacity-70 [mix-blend-mode:screen]"
    />
  )
}
