"use client"

import React, { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'

interface LiquidEtherProps {
  className?: string
  colors?: string[]
  speed?: number
  blur?: number
}

export function LiquidEther({
  className,
  colors = ['#06b6d4', '#8b5cf6', '#ec4899', '#10b981'],
  speed = 0.5,
  blur = 40,
}: LiquidEtherProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationFrameRef = useRef<number | undefined>(undefined)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    // Create blobs
    const blobs: Array<{
      x: number
      y: number
      vx: number
      vy: number
      radius: number
      color: string
    }> = []

    const numBlobs = 5
    for (let i = 0; i < numBlobs; i++) {
      blobs.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * speed,
        vy: (Math.random() - 0.5) * speed,
        radius: Math.random() * 200 + 100,
        color: colors[i % colors.length],
      })
    }

    // Animation loop
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Update and draw blobs
      blobs.forEach((blob) => {
        // Update position
        blob.x += blob.vx
        blob.y += blob.vy

        // Bounce off edges
        if (blob.x < 0 || blob.x > canvas.width) blob.vx *= -1
        if (blob.y < 0 || blob.y > canvas.height) blob.vy *= -1

        // Keep within bounds
        blob.x = Math.max(0, Math.min(canvas.width, blob.x))
        blob.y = Math.max(0, Math.min(canvas.height, blob.y))

        // Draw blob with gradient
        const gradient = ctx.createRadialGradient(
          blob.x,
          blob.y,
          0,
          blob.x,
          blob.y,
          blob.radius
        )
        gradient.addColorStop(0, blob.color + '80') // 50% opacity
        gradient.addColorStop(0.5, blob.color + '40') // 25% opacity
        gradient.addColorStop(1, blob.color + '00') // 0% opacity

        ctx.fillStyle = gradient
        ctx.beginPath()
        ctx.arc(blob.x, blob.y, blob.radius, 0, Math.PI * 2)
        ctx.fill()
      })

      animationFrameRef.current = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      window.removeEventListener('resize', resizeCanvas)
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [colors, speed, blur])

  return (
    <canvas
      ref={canvasRef}
      className={cn('pointer-events-none', className)}
      style={{
        filter: `blur(${blur}px)`,
      }}
    />
  )
}
