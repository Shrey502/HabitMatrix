'use client'
import { useEffect, useRef } from 'react'

interface Star {
  x: number
  y: number
  z: number
  color: string
  size: number
}

export default function CinematicBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationId: number
    let stars: Star[] = []
    const numStars = 120
    let width = (canvas.width = window.innerWidth)
    let height = (canvas.height = window.innerHeight)

    // Mouse coordinates (default to center)
    const mouse = { x: width / 2, y: height / 2, targetX: width / 2, targetY: height / 2 }

    const resize = () => {
      if (!canvas) return
      width = canvas.width = window.innerWidth
      height = canvas.height = window.innerHeight
      initStars()
    }

    const initStars = () => {
      stars = []
      for (let i = 0; i < numStars; i++) {
        stars.push({
          x: Math.random() * width,
          y: Math.random() * height,
          z: Math.random() * width, // depth
          color: Math.random() > 0.8 ? 'rgba(212, 175, 55, 0.4)' : 'rgba(248, 250, 252, 0.3)', // Gargantua gold vs starlight white
          size: Math.random() * 1.2 + 0.4
        })
      }
    }

    const handleMouseMove = (e: MouseEvent) => {
      mouse.targetX = e.clientX
      mouse.targetY = e.clientY
    }

    window.addEventListener('resize', resize)
    window.addEventListener('mousemove', handleMouseMove)

    initStars()

    const draw = () => {
      ctx.fillStyle = '#030305' // Deep space black-blue
      ctx.fillRect(0, 0, width, height)

      // Smooth mouse damping for gravity point
      mouse.x += (mouse.targetX - mouse.x) * 0.05
      mouse.y += (mouse.targetY - mouse.y) * 0.05

      // Accretion disk glow / wormhole distortion effect centered at mouse (very subtle)
      const grad = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, 350)
      grad.addColorStop(0, 'rgba(212, 175, 55, 0.025)') // gargantua orange/gold glow
      grad.addColorStop(0.5, 'rgba(15, 23, 42, 0.03)')
      grad.addColorStop(1, 'rgba(3, 3, 5, 0)')
      ctx.fillStyle = grad
      
      // OPTIMIZATION: Only fill the exact bounding box of the radial gradient (radius 350 = 700x700 area)
      // This massively reduces GPU memory operations per frame compared to filling the entire screen.
      ctx.fillRect(mouse.x - 350, mouse.y - 350, 700, 700)

      // Render stars with gravitational lensing (deflection near mouse)
      stars.forEach(star => {
        // Move stars forward in 3D space (towards viewer)
        star.z -= 0.35
        if (star.z <= 0) {
          star.z = width
          star.x = Math.random() * width
          star.y = Math.random() * height
        }

        // Project 3D coordinates to 2D
        let sx = (star.x - width / 2) * (width / star.z) + width / 2
        let sy = (star.y - height / 2) * (width / star.z) + height / 2

        // Calculate distance from star to gravity point (mouse)
        const dx = sx - mouse.x
        const dy = sy - mouse.y
        const dist = Math.sqrt(dx * dx + dy * dy)

        // Apply gravitational lensing / deflection:
        // Stars are bent slightly around the gravity field (creating an Einstein ring effect)
        const gravityRadius = 180
        if (dist < gravityRadius && dist > 5) {
          const force = (gravityRadius - dist) / gravityRadius
          const angle = Math.atan2(dy, dx)
          // Deflect star along the normal/perpendicular angle to create warping/orbital look
          sx += Math.cos(angle + Math.PI / 2) * force * 15
          sy += Math.sin(angle + Math.PI / 2) * force * 15
        }

        // Only draw if inside viewport boundaries
        if (sx >= 0 && sx <= width && sy >= 0 && sy <= height) {
          ctx.beginPath()
          ctx.arc(sx, sy, star.size * (width / star.z) * 0.3, 0, Math.PI * 2)
          ctx.fillStyle = star.color
          ctx.fill()
        }
      })

      // Add a subtle coordinates/telemetry read-out in corner (TARS style)
      ctx.font = '8px monospace'
      ctx.fillStyle = 'rgba(255, 255, 255, 0.15)'
      ctx.fillText(`WARP_FACTOR: 0.35c`, 24, height - 36)
      ctx.fillText(`GRAVITY_REF: ${mouse.x.toFixed(1)} : ${mouse.y.toFixed(1)}`, 24, height - 24)

      animationId = requestAnimationFrame(draw)
    }

    draw()

    return () => {
      window.removeEventListener('resize', resize)
      window.removeEventListener('mousemove', handleMouseMove)
      cancelAnimationFrame(animationId)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{ mixBlendMode: 'screen' }}
    />
  )
}
