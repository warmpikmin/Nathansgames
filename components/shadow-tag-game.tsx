"use client"

import React, { useRef, useEffect, useState, useCallback } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Maximize2, Minimize2 } from "lucide-react"

const CANVAS_WIDTH = 800
const CANVAS_HEIGHT = 600

export default function ReverseHazardGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const gameContainerRef = useRef<HTMLDivElement>(null)

  const [gameState, setGameState] = useState<"menu" | "playing" | "gameover">("menu")
  const [isFullscreen, setIsFullscreen] = useState(false)

  // Game state
  const player = useRef({ x: 400, y: 300, size: 20, speed: 5 })
  const enemies = useRef<{ x: number; y: number; vx: number; vy: number; size: number }[]>([])
  const projectiles = useRef<{ x: number; y: number; vx: number; vy: number; size: number }[]>([])
  const keys = useRef<{ [key: string]: boolean }>({})
  const score = useRef(0)
  const lastReverse = useRef(0)
  const reverseActive = useRef(false)

  const resetGame = () => {
    player.current = { x: 400, y: 300, size: 20, speed: 5 }
    enemies.current = []
    projectiles.current = []
    score.current = 0
    lastReverse.current = 0
    reverseActive.current = false
  }

  // Fullscreen toggle
  const toggleFullscreen = useCallback(() => {
    const container = gameContainerRef.current
    if (!container) return

    if (!document.fullscreenElement) {
      container
        .requestFullscreen()
        .then(() => setIsFullscreen(true))
        .catch((err) => console.error("Error attempting to enable fullscreen:", err))
    } else {
      document
        .exitFullscreen()
        .then(() => setIsFullscreen(false))
        .catch((err) => console.error("Error attempting to exit fullscreen:", err))
    }
  }, [])

  // Input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)) {
        e.preventDefault()
      }
      keys.current[e.key] = true
    }
    const handleKeyUp = (e: KeyboardEvent) => {
      keys.current[e.key] = false
    }
    window.addEventListener("keydown", handleKeyDown)
    window.addEventListener("keyup", handleKeyUp)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("keyup", handleKeyUp)
    }
  }, [])

  // Game loop
  useEffect(() => {
    if (gameState !== "playing") return

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let animationFrameId: number
    let lastTime = 0

    const loop = (timestamp: number) => {
      if (!lastTime) lastTime = timestamp
      const delta = timestamp - lastTime
      lastTime = timestamp

      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

      // Player movement
      if (keys.current["ArrowUp"]) player.current.y -= player.current.speed
      if (keys.current["ArrowDown"]) player.current.y += player.current.speed
      if (keys.current["ArrowLeft"]) player.current.x -= player.current.speed
      if (keys.current["ArrowRight"]) player.current.x += player.current.speed

      // Boundaries
      player.current.x = Math.max(player.current.size, Math.min(CANVAS_WIDTH - player.current.size, player.current.x))
      player.current.y = Math.max(player.current.size, Math.min(CANVAS_HEIGHT - player.current.size, player.current.y))

      // Reverse mechanic
      if (timestamp - lastReverse.current >= 7000) {
        reverseActive.current = true
        lastReverse.current = timestamp
      }
      if (reverseActive.current && timestamp - lastReverse.current >= 2000) {
        reverseActive.current = false
      }

      // Spawn enemies/projectiles
      if (Math.random() < 0.02) {
        enemies.current.push({
          x: Math.random() * CANVAS_WIDTH,
          y: Math.random() * CANVAS_HEIGHT,
          vx: (Math.random() - 0.5) * 2,
          vy: (Math.random() - 0.5) * 2,
          size: 15,
        })
      }
      if (Math.random() < 0.03) {
        const angle = Math.random() * Math.PI * 2
        projectiles.current.push({
          x: Math.random() * CANVAS_WIDTH,
          y: Math.random() * CANVAS_HEIGHT,
          vx: Math.cos(angle) * 3,
          vy: Math.sin(angle) * 3,
          size: 5,
        })
      }

      // Update enemies/projectiles
      enemies.current.forEach((enemy) => {
        enemy.x += reverseActive.current ? -enemy.vx : enemy.vx
        enemy.y += reverseActive.current ? -enemy.vy : enemy.vy
        if (
          Math.hypot(player.current.x - enemy.x, player.current.y - enemy.y) <
          player.current.size + enemy.size
        ) {
          setGameState("gameover")
        }
      })
      projectiles.current.forEach((p) => {
        p.x += reverseActive.current ? -p.vx : p.vx
        p.y += reverseActive.current ? -p.vy : p.vy
        if (
          Math.hypot(player.current.x - p.x, player.current.y - p.y) <
          player.current.size + p.size
        ) {
          setGameState("gameover")
        }
      })

      // Draw
      ctx.fillStyle = "blue"
      ctx.beginPath()
      ctx.arc(player.current.x, player.current.y, player.current.size, 0, Math.PI * 2)
      ctx.fill()

      ctx.fillStyle = "red"
      enemies.current.forEach((enemy) => {
        ctx.beginPath()
        ctx.arc(enemy.x, enemy.y, enemy.size, 0, Math.PI * 2)
        ctx.fill()
      })

      ctx.fillStyle = "black"
      projectiles.current.forEach((p) => {
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fill()
      })

      // Score
      score.current += delta / 1000
      ctx.fillStyle = "black"
      ctx.font = "20px Arial"
      ctx.fillText("Score: " + Math.floor(score.current), 10, 20)

      // Reversal indicator
      if (reverseActive.current) {
        ctx.fillStyle = "rgba(255,0,0,0.2)"
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
      }

      animationFrameId = requestAnimationFrame(loop)
    }

    animationFrameId = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(animationFrameId)
  }, [gameState])

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-black text-white p-4">
      <motion.h1
        className="text-4xl md:text-6xl font-bold mb-8 text-purple-300 drop-shadow-lg"
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
      >
        Reverse Hazard
      </motion.h1>

      {/* Game container that can go fullscreen */}
      <div
        ref={gameContainerRef}
        className="relative border-4 border-purple-500/30 rounded-2xl shadow-2xl shadow-purple-500/20"
      >
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="block rounded-2xl"
        />

        {gameState === "menu" && (
          <div className="absolute inset-0 bg-gradient-to-br from-black/80 via-purple-900/50 to-black/80 flex flex-col items-center justify-center rounded-2xl backdrop-blur-sm">
            <Button
              className="px-6 py-3 text-lg bg-purple-600 hover:bg-purple-700 rounded-xl shadow-lg"
              onClick={() => {
                resetGame()
                setGameState("playing")
              }}
            >
              Start Game
            </Button>
          </div>
        )}

        {gameState === "gameover" && (
          <div className="absolute inset-0 bg-gradient-to-br from-black/80 via-red-900/50 to-black/80 flex flex-col items-center justify-center rounded-2xl backdrop-blur-sm space-y-4">
            <p className="text-2xl font-bold text-red-400">Game Over!</p>
            <p className="text-lg">Final Score: {Math.floor(score.current)}</p>
            <Button
              className="px-6 py-3 text-lg bg-purple-600 hover:bg-purple-700 rounded-xl shadow-lg"
              onClick={() => {
                resetGame()
                setGameState("playing")
              }}
            >
              Restart
            </Button>
          </div>
        )}
      </div>

      {/* Fullscreen toggle */}
      <Button
        onClick={toggleFullscreen}
        variant="outline"
        className="mt-4 flex items-center space-x-2"
      >
        {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
        <span>{isFullscreen ? "Exit Fullscreen" : "Fullscreen"}</span>
      </Button>
    </div>
  )
}
