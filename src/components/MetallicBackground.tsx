import { useEffect, useRef } from 'react'

/**
 * Liquid-metal WebGL shader used as the page's base background layer. It sits
 * fixed behind the particle field (which screen-blends over it) and every UI
 * element. The GLSL is a direct port of the supplied "dark metallic" shader:
 * fbm-driven titanium shading with a specular sheen, warped by mouse movement.
 */

const VERTEX_SHADER = `attribute vec2 a_position;
varying vec2 v_texCoord;
void main() {
  v_texCoord = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}`

const FRAGMENT_SHADER = `precision highp float;

uniform float u_time;
uniform vec2 u_resolution;
uniform vec2 u_mouse;
varying vec2 v_texCoord;

// Simplex noise / Hash utility
float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
}

float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(
        mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
        mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
        u.y
    );
}

float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.52;
    mat2 rot = mat2(cos(0.55), sin(0.55), -sin(0.55), cos(0.55));
    for (int i = 0; i < 5; i++) {
        v += a * noise(p);
        p = rot * p * 2.08 + vec2(12.0, 8.0);
        a *= 0.48;
    }
    return v;
}

void main() {
    vec2 st = gl_FragCoord.xy / u_resolution.xy;
    vec2 p = (gl_FragCoord.xy * 2.0 - u_resolution.xy) / min(u_resolution.x, u_resolution.y);

    // Normalized mouse and scroll interaction (u_mouse)
    vec2 m = u_mouse.xy / u_resolution.xy;
    if (length(u_mouse) < 1.0) {
        m = vec2(0.5, 0.5);
    }

    // Time evolution
    float t = u_time * 0.28;

    // Dynamic coordinate distortion for liquid metallic flow
    vec2 q = vec2(fbm(p + vec2(0.0, t * 0.18)), fbm(p + vec2(5.2, 1.3 - t * 0.12)));
    vec2 r = vec2(
        fbm(p + 3.2 * q + vec2(1.7, 9.2) + 0.12 * t),
        fbm(p + 3.2 * q + vec2(8.3, 2.8) + 0.10 * t)
    );

    // Scroll / mouse interactive warp offset
    r += (m - 0.5) * 0.45;

    float f = fbm(p + 4.2 * r);

    // Deep dark metallic palette: ultra-deep pitch obsidian, gunmetal, cold brushed dark steel
    vec3 colDeepPitch    = vec3(0.012, 0.014, 0.018); // pitch dark base
    vec3 colDarkGunmetal = vec3(0.035, 0.038, 0.045); // dark charcoal/gunmetal
    vec3 colDarkSteel    = vec3(0.085, 0.095, 0.115); // dark cold titanium/steel
    vec3 colSpecularEdge = vec3(0.65, 0.70, 0.80);    // sharp chrome specular highlight

    // Dark metallic shading layers
    vec3 color = mix(colDeepPitch, colDarkGunmetal, clamp(f * f * 2.0, 0.0, 1.0));
    color = mix(color, colDarkSteel, clamp(pow(f, 4.0) * 2.2, 0.0, 1.0));

    // Highly focused, sharp specular liquid metal highlight / caustic sheen
    float sheen = pow(clamp(dot(normalize(vec3(q, 0.75)), normalize(vec3(r, 0.95))), 0.0, 1.0), 18.0);
    color += colSpecularEdge * sheen * 0.42;

    // Heavy edge vignette to deepen darkness across the perimeter
    float vignette = 1.0 - smoothstep(0.3, 1.6, length(p * 0.82));
    color *= vignette;

    // Very subtle, moody dark silver ambient sheen
    float ambientDarkSheen = pow(fbm(p * 1.8 + vec2(0.0, t * 0.08)), 5.0) * 0.18;
    color += vec3(0.4, 0.45, 0.55) * ambientDarkSheen;

    gl_FragColor = vec4(color, 1.0);
}`

export function MetallicBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const gl = (canvas.getContext('webgl', {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      powerPreference: 'high-performance',
    }) ?? canvas.getContext('experimental-webgl')) as WebGLRenderingContext | null
    if (!gl) return

    const compile = (type: number, source: string) => {
      const shader = gl.createShader(type)
      if (!shader) return null
      gl.shaderSource(shader, source)
      gl.compileShader(shader)
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.warn('[crn] metallic shader failed to compile:', gl.getShaderInfoLog(shader))
        gl.deleteShader(shader)
        return null
      }
      return shader
    }

    const vertexShader = compile(gl.VERTEX_SHADER, VERTEX_SHADER)
    const fragmentShader = compile(gl.FRAGMENT_SHADER, FRAGMENT_SHADER)
    if (!vertexShader || !fragmentShader) return

    const program = gl.createProgram()
    if (!program) return
    gl.attachShader(program, vertexShader)
    gl.attachShader(program, fragmentShader)
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.warn('[crn] metallic shader failed to link:', gl.getProgramInfoLog(program))
      return
    }
    gl.useProgram(program)

    const buffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)
    const position = gl.getAttribLocation(program, 'a_position')
    gl.enableVertexAttribArray(position)
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0)

    const uTime = gl.getUniformLocation(program, 'u_time')
    const uResolution = gl.getUniformLocation(program, 'u_resolution')
    const uMouse = gl.getUniformLocation(program, 'u_mouse')

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const mouse = { x: 0, y: 0 }

    // Render below native resolution: the field is soft, so upscaling is nearly
    // invisible and it keeps the fill-rate affordable alongside the particles.
    let quality = Math.min(window.devicePixelRatio || 1, 1.5) * 0.6
    let running = true
    let raf = 0
    let elapsed = 0
    let last = performance.now()
    let frames = 0
    let accumulated = 0

    const size = () => {
      const w = Math.max(1, Math.round(canvas.clientWidth * quality))
      const h = Math.max(1, Math.round(canvas.clientHeight * quality))
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w
        canvas.height = h
      }
    }
    size()

    const onPointerMove = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect()
      if (!rect.width || !rect.height) return
      mouse.x = ((event.clientX - rect.left) / rect.width) * canvas.width
      mouse.y = (1 - (event.clientY - rect.top) / rect.height) * canvas.height
    }

    const draw = (time: number) => {
      gl.viewport(0, 0, canvas.width, canvas.height)
      if (uTime) gl.uniform1f(uTime, time)
      if (uResolution) gl.uniform2f(uResolution, canvas.width, canvas.height)
      if (uMouse) {
        gl.uniform2f(uMouse, mouse.x || canvas.width / 2, mouse.y || canvas.height / 2)
      }
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    }

    const frame = (now: number) => {
      if (!running) return
      const dt = Math.min((now - last) / 1000, 0.1)
      last = now
      elapsed += dt
      draw(elapsed)

      // If the GPU can't keep up, step the internal resolution down a notch.
      accumulated += dt
      frames++
      if (frames >= 90) {
        if (accumulated / frames > 0.03 && quality > 0.4) {
          quality = Math.max(0.4, quality * 0.8)
          size()
        }
        frames = 0
        accumulated = 0
      }

      raf = requestAnimationFrame(frame)
    }

    const resize = () => size()
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null
    observer?.observe(canvas)

    // Subtle scroll parallax, matching the reference snippet.
    let ticking = false
    const onScroll = () => {
      if (ticking) return
      ticking = true
      requestAnimationFrame(() => {
        const shift = Math.min(window.scrollY * 0.02, canvas.clientHeight * 0.06)
        canvas.style.transform = `translateY(${shift}px) scale(1.15)`
        ticking = false
      })
    }
    canvas.style.transform = 'translateY(0px) scale(1.15)'

    if (reduceMotion) {
      // One static frame — no animation loop and no input listeners.
      draw(0)
    } else {
      window.addEventListener('pointermove', onPointerMove, { passive: true })
      window.addEventListener('scroll', onScroll, { passive: true })
      raf = requestAnimationFrame(frame)
    }

    const onVisibility = () => {
      if (document.hidden) {
        running = false
        cancelAnimationFrame(raf)
      } else if (!reduceMotion && !running) {
        running = true
        last = performance.now() // swallow the pause so the flow doesn't jump
        raf = requestAnimationFrame(frame)
      }
    }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      running = false
      cancelAnimationFrame(raf)
      observer?.disconnect()
      window.removeEventListener('resize', resize)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('scroll', onScroll)
      document.removeEventListener('visibilitychange', onVisibility)
      gl.deleteBuffer(buffer)
      gl.deleteProgram(program)
      gl.deleteShader(vertexShader)
      gl.deleteShader(fragmentShader)
    }
  }, [])

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-[#030406]"
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full transition-transform duration-700 ease-out"
      />
      {/* Darkening overlays from the reference, layered over the metal field. */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: 'linear-gradient(to bottom, rgba(0,0,0,0.4), transparent, rgba(0,0,0,0.85))',
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: 'radial-gradient(ellipse at top, rgba(255,255,255,0.03), transparent 70%)',
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            'radial-gradient(circle at center, transparent 40%, rgba(3,4,6,0.85) 100%)',
        }}
      />
    </div>
  )
}
