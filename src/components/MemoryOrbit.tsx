import { useEffect, useRef } from 'react'
import { imageUrl } from '@/lib/client'

const FRAME_COUNT = 10

// World-space lift for the whole 3D scene. Raises the orbit (and core/rings)
// above the hero's text block so the photos no longer cross the "CRN SOCIETY"
// heading. Tune this single value to move the ring up or down.
const SCENE_LIFT = 2.4

/** Canvas texture used when there are fewer pictures than frames. */
function placeholderCanvas(i: number) {
  const c = document.createElement('canvas')
  c.width = 256
  c.height = 320
  const g = c.getContext('2d')!
  const grad = g.createLinearGradient(0, 0, 256, 320)
  grad.addColorStop(0, i % 2 ? '#1b1b22' : '#2a1410')
  grad.addColorStop(1, i % 2 ? '#2a1410' : '#121217')
  g.fillStyle = grad
  g.fillRect(0, 0, 256, 320)
  g.strokeStyle = 'rgba(255,91,55,0.55)'
  g.lineWidth = 2
  g.strokeRect(18, 18, 220, 284)
  g.fillStyle = 'rgba(243,239,232,0.75)'
  g.font = '600 26px Unbounded, sans-serif'
  g.textAlign = 'center'
  g.fillText('CRN', 128, 172)
  return c
}

export function MemoryOrbit({ imageKeys }: { imageKeys: string[] }) {
  const mountRef = useRef<HTMLDivElement>(null)
  const keysSig = imageKeys.slice(0, FRAME_COUNT).join(',')

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return
    let disposed = false
    let cleanup = () => {}

    import('three').then((THREE) => {
      if (disposed) return
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
      renderer.outputColorSpace = THREE.SRGBColorSpace
      mount.appendChild(renderer.domElement)

      const scene = new THREE.Scene()
      scene.fog = new THREE.Fog(0x0a0a0d, 9, 18)
      const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100)
      camera.position.set(0, 0.6, 11)

      // Everything lives in one group so the whole composition can be lifted
      // above the hero copy without disturbing the camera/parallax behaviour.
      const root = new THREE.Group()
      root.position.y = SCENE_LIFT
      scene.add(root)

      // Glowing wireframe core.
      const core = new THREE.Group()
      const coreGeo = new THREE.IcosahedronGeometry(1.35, 1)
      const coreWire = new THREE.LineSegments(
        new THREE.WireframeGeometry(coreGeo),
        new THREE.LineBasicMaterial({ color: 0xff5b37, transparent: true, opacity: 0.85 }),
      )
      const coreSolid = new THREE.Mesh(
        coreGeo,
        new THREE.MeshBasicMaterial({ color: 0xff5b37, transparent: true, opacity: 0.08 }),
      )
      const innerGeo = new THREE.IcosahedronGeometry(0.55, 0)
      const inner = new THREE.Mesh(
        innerGeo,
        new THREE.MeshBasicMaterial({ color: 0xf3efe8, wireframe: true }),
      )
      core.add(coreWire, coreSolid, inner)
      root.add(core)

      // Thin orbit rings.
      const ringMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.12 })
      const ringGeo = new THREE.TorusGeometry(4.6, 0.006, 8, 160)
      const ring1 = new THREE.Mesh(ringGeo, ringMat)
      ring1.rotation.x = Math.PI / 2
      const ring2 = new THREE.Mesh(new THREE.TorusGeometry(2.4, 0.005, 8, 120), ringMat)
      ring2.rotation.set(Math.PI / 2.6, 0.4, 0)
      root.add(ring1, ring2)

      // Ring of polaroid-style memory frames.
      const orbit = new THREE.Group()
      orbit.rotation.x = 0.18
      root.add(orbit)
      const loader = new THREE.TextureLoader()
      const frameGeo = new THREE.PlaneGeometry(1.5, 1.85)
      const photoGeo = new THREE.PlaneGeometry(1.34, 1.5)
      const frameMat = new THREE.MeshBasicMaterial({ color: 0xf3efe8, side: THREE.DoubleSide })
      const disposables: { dispose: () => void }[] = [
        coreGeo, innerGeo, ringGeo, frameGeo, photoGeo, frameMat, ringMat,
      ]
      const keys = keysSig ? keysSig.split(',') : []

      for (let i = 0; i < FRAME_COUNT; i++) {
        const angle = (i / FRAME_COUNT) * Math.PI * 2
        const holder = new THREE.Group()
        holder.position.set(Math.sin(angle) * 4.6, Math.sin(i * 1.7) * 0.35, Math.cos(angle) * 4.6)
        holder.rotation.y = angle
        holder.rotation.z = Math.sin(i * 2.3) * 0.08

        const frame = new THREE.Mesh(frameGeo, frameMat)
        const key = keys.length ? keys[i % keys.length] : null
        const tex = key
          ? loader.load(imageUrl(key, 400))
          : new THREE.CanvasTexture(placeholderCanvas(i))
        tex.colorSpace = THREE.SRGBColorSpace
        const photoMat = new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide })
        const photo = new THREE.Mesh(photoGeo, photoMat)
        photo.position.set(0, 0.1, 0.002)
        holder.add(frame, photo)
        orbit.add(holder)
        disposables.push(tex, photoMat)
      }

      // Drifting dust.
      const dustGeo = new THREE.BufferGeometry()
      const pts = new Float32Array(600 * 3)
      for (let i = 0; i < pts.length; i++) pts[i] = (Math.random() - 0.5) * 22
      dustGeo.setAttribute('position', new THREE.BufferAttribute(pts, 3))
      const dustMat = new THREE.PointsMaterial({ color: 0xf3efe8, size: 0.025, transparent: true, opacity: 0.5 })
      const dust = new THREE.Points(dustGeo, dustMat)
      root.add(dust)
      disposables.push(dustGeo, dustMat)

      const pointer = { x: 0, y: 0 }
      const onPointer = (e: PointerEvent) => {
        pointer.x = (e.clientX / window.innerWidth - 0.5) * 2
        pointer.y = (e.clientY / window.innerHeight - 0.5) * 2
      }
      window.addEventListener('pointermove', onPointer)

      const resize = () => {
        const w = mount.clientWidth
        const h = mount.clientHeight
        renderer.setSize(w, h)
        camera.aspect = w / h
        // Pull the camera back on narrow screens so the ring fits.
        camera.position.z = w < 640 ? 15 : 11
        camera.updateProjectionMatrix()
      }
      const ro = new ResizeObserver(resize)
      ro.observe(mount)
      resize()

      const startedAt = performance.now()
      let frameId = 0
      const tick = () => {
        const t = (performance.now() - startedAt) / 1000
        const speed = reduceMotion ? 0 : 1
        orbit.rotation.y = t * 0.12 * speed
        core.rotation.y = t * 0.3 * speed
        core.rotation.x = t * 0.17 * speed
        inner.rotation.y = -t * 0.6 * speed
        dust.rotation.y = t * 0.02 * speed
        camera.position.x += (pointer.x * 1.2 - camera.position.x) * 0.04
        camera.position.y += (0.6 - pointer.y * 0.8 - camera.position.y) * 0.04
        camera.lookAt(0, 0, 0)
        renderer.render(scene, camera)
        frameId = requestAnimationFrame(tick)
      }
      tick()

      cleanup = () => {
        cancelAnimationFrame(frameId)
        ro.disconnect()
        window.removeEventListener('pointermove', onPointer)
        disposables.forEach((d) => d.dispose())
        renderer.dispose()
        renderer.domElement.remove()
      }
    })

    return () => {
      disposed = true
      cleanup()
    }
  }, [keysSig])

  return <div ref={mountRef} className="absolute inset-0" aria-hidden />
}
