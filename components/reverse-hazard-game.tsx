"use client"

import { useState, useEffect, useRef, useCallback } from "react"

interface Position {
  x: number
  y: number
}

interface Enemy {
  id: number
  x: number
  y: number
  speed: number
  history: Position[]
  isReversing: boolean
  reverseIndex: number
}

interface Projectile {
  id: number
  x: number
  y: number
  dx: number
  dy: number
  speed: number
  history: Position[]
  isReversing: boolean
  reverseIndex: number
}

const ARENA_WIDTH = 800
const ARENA_HEIGHT = 600
const PLAYER_SIZE = 15
const ENEMY_SIZE = 12
const PROJECTILE_SIZE = 4
const PLAYER_SPEED = 3
const ENEMY_SPEED = 1.5
const PROJECTILE_SPEED = 4
const REVERSAL_INTERVAL = 5000 // 5 seconds
const REVERSAL_DURATION = 2000 // 2 seconds

export default function ReverseHazardGame({ onBack }: { onBack: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const gameLoopRef = useRef<number>()
  const [gameState, setGameState] = useState<"menu" | "playing" | "gameOver">("menu")
  const [player, setPlayer] = useState<Position>({ x: ARENA_WIDTH / 2, y: ARENA_HEIGHT / 2 })
  const [enemies, setEnemies] = useState<Enemy[]>([])
  const [projectiles, setProjectiles] = useState<Projectile[]>([])
  const [keys, setKeys] = useState<Set<string>>(new Set())
  const [gameTime, setGameTime] = useState(0)
  const [reversalCount, setReversalCount] = useState(0)
  const [isReversing, setIsReversing] = useState(false)
  const [nextEnemyId, setNextEnemyId] = useState(1)
  const [nextProjectileId, setNextProjectileId] = useState(1)

  const startGame = useCallback(() => {
    setGameState("playing")
    setPlayer({ x: ARENA_WIDTH / 2, y: ARENA_HEIGHT / 2 })
    setEnemies([])
    setProjectiles([])
    setGameTime(0)
    setReversalCount(0)
    setIsReversing(false)
    setNextEnemyId(1)
    setNextProjectileId(1)
  }, [])

  const endGame = useCallback(() => {
    setGameState("gameOver")
    if (gameLoopRef.current) {
      cancelAnimationFrame(gameLoopRef.current)
    }
  }, [])

  // Keyboard handling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase()
      const validKeys = ["arrowup", "arrowdown", "arrowleft", "arrowright", "w", "a", "s", "d"]

      if (validKeys.includes(key)) {
        e.preventDefault()
        setKeys((prev) => new Set(prev).add(key))
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      setKeys((prev) => {
        const newKeys = new Set(prev)
        newKeys.delete(e.key.toLowerCase())
        return newKeys
      })
    }

    window.addEventListener("keydown", handleKeyDown)
    window.addEventListener("keyup", handleKeyUp)

    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("keyup", handleKeyUp)
    }
  }, [])

  // Spawn enemies
  const spawnEnemy = useCallback(() => {
    const side = Math.floor(Math.random() * 4)
    let x, y

    switch (side) {
      case 0: // top
        x = Math.random() * ARENA_WIDTH
        y = 0
        break
      case 1: // right
        x = ARENA_WIDTH
        y = Math.random() * ARENA_HEIGHT
        break
      case 2: // bottom
        x = Math.random() * ARENA_WIDTH
        y = ARENA_HEIGHT
        break
      default: // left
        x = 0
        y = Math.random() * ARENA_HEIGHT
        break
    }

    const newEnemy: Enemy = {
      id: nextEnemyId,
      x,
      y,
      speed: ENEMY_SPEED + Math.random() * 0.5,
      history: [{ x, y }],
      isReversing: false,
      reverseIndex: 0,
    }

    setEnemies((prev) => [...prev, newEnemy])
    setNextEnemyId((prev) => prev + 1)
  }, [nextEnemyId])

  // Game loop
  useEffect(() => {
    if (gameState !== "playing") return

    const gameLoop = () => {
      setGameTime((prevTime) => {
        const newTime = prevTime + 16 // ~60fps

        // Check for reversal trigger
        const shouldReverse = Math.floor(newTime / REVERSAL_INTERVAL) > Math.floor(prevTime / REVERSAL_INTERVAL)
        if (shouldReverse) {
          setIsReversing(true)
          setReversalCount((prev) => prev + 1)
          setTimeout(() => setIsReversing(false), REVERSAL_DURATION)
        }

        return newTime
      })

      // Move player
      setPlayer((prevPlayer) => {
        let newX = prevPlayer.x
        let newY = prevPlayer.y

        if (keys.has("arrowleft") || keys.has("a")) newX -= PLAYER_SPEED
        if (keys.has("arrowright") || keys.has("d")) newX += PLAYER_SPEED
        if (keys.has("arrowup") || keys.has("w")) newY -= PLAYER_SPEED
        if (keys.has("arrowdown") || keys.has("s")) newY += PLAYER_SPEED

        // Keep player in bounds
        newX = Math.max(PLAYER_SIZE, Math.min(ARENA_WIDTH - PLAYER_SIZE, newX))
        newY = Math.max(PLAYER_SIZE, Math.min(ARENA_HEIGHT - PLAYER_SIZE, newY))

        return { x: newX, y: newY }
      })

      // Update enemies
      setEnemies((prevEnemies) => {
        return prevEnemies.map((enemy) => {
          if (enemy.isReversing) {
            // Move backward through history
            if (enemy.reverseIndex < enemy.history.length - 1) {
              const pos = enemy.history[enemy.history.length - 1 - enemy.reverseIndex]
              return {
                ...enemy,
                x: pos.x,
                y: pos.y,
                reverseIndex: enemy.reverseIndex + 1,
              }
            }
            return enemy
          } else {
            // Normal movement toward player
            const dx = player.x - enemy.x
            const dy = player.y - enemy.y
            const distance = Math.sqrt(dx * dx + dy * dy)

            if (distance > 0) {
              const moveX = (dx / distance) * enemy.speed
              const moveY = (dy / distance) * enemy.speed
              const newX = enemy.x + moveX
              const newY = enemy.y + moveY

              const newHistory = [...enemy.history, { x: newX, y: newY }]
              if (newHistory.length > 300) newHistory.shift() // Limit history size

              return {
                ...enemy,
                x: newX,
                y: newY,
                history: newHistory,
              }
            }
            return enemy
          }
        })
      })

      // Update reversal state for enemies
      setEnemies((prevEnemies) => {
        return prevEnemies.map((enemy) => ({
          ...enemy,
          isReversing: isReversing,
          reverseIndex: isReversing && !enemy.isReversing ? 0 : enemy.reverseIndex,
        }))
      })

      // Spawn enemies periodically
      if (Math.random() < 0.005) {
        spawnEnemy()
      }

      // Spawn projectiles from enemies
      setProjectiles((prevProjectiles) => {
        const newProjectiles = [...prevProjectiles]

        enemies.forEach((enemy) => {
          if (Math.random() < 0.005 && !enemy.isReversing) {
            const dx = player.x - enemy.x
            const dy = player.y - enemy.y
            const distance = Math.sqrt(dx * dx + dy * dy)

            if (distance > 0) {
              const projectile: Projectile = {
                id: nextProjectileId,
                x: enemy.x,
                y: enemy.y,
                dx: (dx / distance) * PROJECTILE_SPEED,
                dy: (dy / distance) * PROJECTILE_SPEED,
                speed: PROJECTILE_SPEED,
                history: [{ x: enemy.x, y: enemy.y }],
                isReversing: false,
                reverseIndex: 0,
              }
              newProjectiles.push(projectile)
              setNextProjectileId((prev) => prev + 1)
            }
          }
        })

        return newProjectiles
      })

      // Update projectiles
      setProjectiles((prevProjectiles) => {
        return prevProjectiles
          .map((projectile) => {
            if (isReversing) {
              // During reversal, move backward through history
              if (projectile.reverseIndex < projectile.history.length - 1) {
                const pos = projectile.history[projectile.history.length - 1 - projectile.reverseIndex]
                return {
                  ...projectile,
                  x: pos.x,
                  y: pos.y,
                  isReversing: true,
                  reverseIndex: projectile.reverseIndex + 1,
                }
              }
              return { ...projectile, isReversing: true }
            } else {
              // Normal movement - projectiles continue moving forward
              const newX = projectile.x + projectile.dx
              const newY = projectile.y + projectile.dy

              const newHistory = [...projectile.history, { x: newX, y: newY }]
              if (newHistory.length > 300) newHistory.shift()

              return {
                ...projectile,
                x: newX,
                y: newY,
                history: newHistory,
                isReversing: false,
                reverseIndex: 0,
              }
            }
          })
          .filter(
            (projectile) =>
              projectile.x > -50 &&
              projectile.x < ARENA_WIDTH + 50 &&
              projectile.y > -50 &&
              projectile.y < ARENA_HEIGHT + 50,
          )
      })

      // Collision detection
      const playerCollision = [...enemies, ...projectiles].some((obj) => {
        const dx = player.x - obj.x
        const dy = player.y - obj.y
        const distance = Math.sqrt(dx * dx + dy * dy)
        return distance < PLAYER_SIZE + (enemies.includes(obj as Enemy) ? ENEMY_SIZE : PROJECTILE_SIZE)
      })

      if (playerCollision) {
        endGame()
        return
      }

      gameLoopRef.current = requestAnimationFrame(gameLoop)
    }

    gameLoopRef.current = requestAnimationFrame(gameLoop)

    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current)
      }
    }
  }, [gameState, keys, player, enemies, projectiles, isReversing, spawnEnemy, endGame, nextProjectileId])

  // Render game
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Clear canvas
    ctx.fillStyle = isReversing ? "#f0f0f0" : "white"
    ctx.fillRect(0, 0, ARENA_WIDTH, ARENA_HEIGHT)

    // Draw border
    ctx.strokeStyle = "#333"
    ctx.lineWidth = 2
    ctx.strokeRect(0, 0, ARENA_WIDTH, ARENA_HEIGHT)

    if (gameState === "playing") {
      // Draw player
      ctx.fillStyle = "blue"
      ctx.beginPath()
      ctx.arc(player.x, player.y, PLAYER_SIZE, 0, Math.PI * 2)
      ctx.fill()

      // Draw enemies
      ctx.fillStyle = isReversing ? "#ff6666" : "red"
      enemies.forEach((enemy) => {
        ctx.beginPath()
        ctx.arc(enemy.x, enemy.y, ENEMY_SIZE, 0, Math.PI * 2)
        ctx.fill()
      })

      // Draw projectiles
      ctx.fillStyle = "black"
      projectiles.forEach((projectile) => {
        ctx.beginPath()
        ctx.arc(projectile.x, projectile.y, PROJECTILE_SIZE, 0, Math.PI * 2)
        ctx.fill()
      })
    }
  }, [gameState, player, enemies, projectiles, isReversing])

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000)
    return `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, "0")}`
  }

  if (gameState === "menu") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white p-8">
        <div className="text-center space-y-8">
          <h1 className="text-6xl font-bold bg-gradient-to-r from-red-400 to-orange-500 bg-clip-text text-transparent">
            Reverse Hazard
          </h1>
          <p className="text-xl text-slate-300 max-w-2xl">
            Survive in an arena where time reverses every 5 seconds! Dodge enemies and projectiles as they move forward
            and backward through time.
          </p>
          <div className="space-y-4">
            <button
              onClick={startGame}
              className="px-8 py-4 bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 rounded-lg text-xl font-semibold transition-all duration-200 transform hover:scale-105"
            >
              Start Game
            </button>
            <button
              onClick={onBack}
              className="block mx-auto px-6 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
            >
              Back to Menu
            </button>
          </div>
          <div className="text-sm text-slate-400 space-y-2">
            <p>Use WASD or Arrow Keys to move</p>
            <p>Avoid red enemies and black projectiles</p>
            <p>Time reverses every 5 seconds for 2 seconds</p>
          </div>
        </div>
      </div>
    )
  }

  if (gameState === "gameOver") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white p-8">
        <div className="text-center space-y-8">
          <h1 className="text-5xl font-bold text-red-400">Game Over</h1>
          <div className="space-y-4 text-xl">
            <p>
              Survival Time: <span className="font-bold text-orange-400">{formatTime(gameTime)}</span>
            </p>
            <p>
              Reversals Survived: <span className="font-bold text-orange-400">{reversalCount}</span>
            </p>
          </div>
          <div className="space-y-4">
            <button
              onClick={startGame}
              className="px-8 py-4 bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 rounded-lg text-xl font-semibold transition-all duration-200 transform hover:scale-105"
            >
              Play Again
            </button>
            <button
              onClick={onBack}
              className="block mx-auto px-6 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
            >
              Back to Menu
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white p-8">
      <div className="space-y-4">
        <div className="flex justify-between items-center text-lg font-semibold">
          <span>Time: {formatTime(gameTime)}</span>
          <span>Reversals: {reversalCount}</span>
          {isReversing && <span className="text-red-400 animate-pulse">TIME REVERSING!</span>}
        </div>
        <canvas
          ref={canvasRef}
          width={ARENA_WIDTH}
          height={ARENA_HEIGHT}
          className="border-2 border-slate-600 bg-white"
        />
        <div className="text-center space-y-2">
          <p className="text-sm text-slate-400">Use WASD or Arrow Keys to move</p>
          <button onClick={onBack} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded transition-colors">
            Back to Menu
          </button>
        </div>
      </div>
    </div>
  )
}
