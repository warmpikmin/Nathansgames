"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"

interface Position {
  x: number
  y: number
}

interface Enemy {
  id: number
  x: number
  y: number
  vx: number
  vy: number
  canShoot: boolean
  lastShot: number
  history: Position[]
}

interface Projectile {
  id: number
  x: number
  y: number
  vx: number
  vy: number
  history: Position[]
}

const ARENA_WIDTH = 600
const ARENA_HEIGHT = 400
const PLAYER_SIZE = 20
const ENEMY_SIZE = 16
const PROJECTILE_SIZE = 4
const ENEMY_SPEED = 1
const PROJECTILE_SPEED = 3
const REVERSAL_INTERVAL = 5000 // 5 seconds
const REVERSAL_DURATION = 2000 // 2 seconds

export default function ReverseHazardGame({ onBack }: { onBack: () => void }) {
  const [playerPos, setPlayerPos] = useState<Position>({ x: ARENA_WIDTH / 2, y: ARENA_HEIGHT / 2 })
  const [enemies, setEnemies] = useState<Enemy[]>([])
  const [projectiles, setProjectiles] = useState<Projectile[]>([])
  const [gameTime, setGameTime] = useState(0)
  const [reversalCount, setReversalCount] = useState(0)
  const [gameOver, setGameOver] = useState(false)
  const [gameStarted, setGameStarted] = useState(false)
  const [isReversing, setIsReversing] = useState(false)

  const gameLoopRef = useRef<number>()
  const startTimeRef = useRef(0)
  const lastReversalRef = useRef(0)
  const keysPressed = useRef<Set<string>>(new Set())

  const initializeGame = useCallback(() => {
    setPlayerPos({ x: ARENA_WIDTH / 2, y: ARENA_HEIGHT / 2 })
    setEnemies([])
    setProjectiles([])
    setGameTime(0)
    setReversalCount(0)
    setGameOver(false)
    setIsReversing(false)
    startTimeRef.current = Date.now()
    lastReversalRef.current = 0
  }, [])

  // Spawn enemies periodically
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
    }

    const newEnemy: Enemy = {
      id: Date.now() + Math.random(),
      x,
      y,
      vx: 0,
      vy: 0,
      canShoot: Math.random() < 0.3, // 30% chance to be a shooter
      lastShot: 0,
      history: [{ x, y }],
    }

    setEnemies((prev) => [...prev, newEnemy])
  }, [])

  // Check collisions
  const checkCollisions = useCallback(() => {
    // Check enemy collisions
    for (const enemy of enemies) {
      const dx = playerPos.x - enemy.x
      const dy = playerPos.y - enemy.y
      const distance = Math.sqrt(dx * dx + dy * dy)

      if (distance < (PLAYER_SIZE + ENEMY_SIZE) / 2) {
        setGameOver(true)
        return
      }
    }

    // Check projectile collisions
    for (const projectile of projectiles) {
      const dx = playerPos.x - projectile.x
      const dy = playerPos.y - projectile.y
      const distance = Math.sqrt(dx * dx + dy * dy)

      if (distance < (PLAYER_SIZE + PROJECTILE_SIZE) / 2) {
        setGameOver(true)
        return
      }
    }
  }, [playerPos, enemies, projectiles])

  // Handle keyboard input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysPressed.current.add(e.key.toLowerCase())
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current.delete(e.key.toLowerCase())
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
    if (!gameStarted || gameOver) return

    const gameLoop = () => {
      const now = Date.now()
      const elapsed = now - startTimeRef.current
      setGameTime(Math.floor(elapsed / 1000))

      // Handle player movement
      if (!gameOver) {
        setPlayerPos((prev) => {
          let newX = prev.x
          let newY = prev.y
          const speed = 3

          if (keysPressed.current.has("w") || keysPressed.current.has("arrowup")) {
            newY = Math.max(PLAYER_SIZE / 2, prev.y - speed)
          }
          if (keysPressed.current.has("s") || keysPressed.current.has("arrowdown")) {
            newY = Math.min(ARENA_HEIGHT - PLAYER_SIZE / 2, prev.y + speed)
          }
          if (keysPressed.current.has("a") || keysPressed.current.has("arrowleft")) {
            newX = Math.max(PLAYER_SIZE / 2, prev.x - speed)
          }
          if (keysPressed.current.has("d") || keysPressed.current.has("arrowright")) {
            newX = Math.min(ARENA_WIDTH - PLAYER_SIZE / 2, prev.x + speed)
          }

          return { x: newX, y: newY }
        })
      }

      // Handle reversal timing
      const timeSinceLastReversal = elapsed - lastReversalRef.current
      const shouldStartReversal = timeSinceLastReversal >= REVERSAL_INTERVAL && !isReversing
      const shouldEndReversal = isReversing && timeSinceLastReversal >= REVERSAL_INTERVAL + REVERSAL_DURATION

      if (shouldStartReversal) {
        setIsReversing(true)
        setReversalCount((prev) => prev + 1)
      } else if (shouldEndReversal) {
        setIsReversing(false)
        lastReversalRef.current = elapsed
      }

      // Spawn enemies
      if (Math.random() < 0.02) {
        // 2% chance per frame
        spawnEnemy()
      }

      // Update enemies
      setEnemies((prev) =>
        prev
          .map((enemy) => {
            const newEnemy = { ...enemy }

            if (isReversing && enemy.history.length > 1) {
              // Move backward through history
              const historyIndex = Math.max(
                0,
                enemy.history.length - Math.floor((timeSinceLastReversal - REVERSAL_INTERVAL) / 50),
              )
              const targetPos = enemy.history[historyIndex]
              if (targetPos) {
                newEnemy.x = targetPos.x
                newEnemy.y = targetPos.y
              }
            } else {
              // Normal movement toward player
              const dx = playerPos.x - enemy.x
              const dy = playerPos.y - enemy.y
              const distance = Math.sqrt(dx * dx + dy * dy)

              if (distance > 0) {
                newEnemy.vx = (dx / distance) * ENEMY_SPEED
                newEnemy.vy = (dy / distance) * ENEMY_SPEED
                newEnemy.x += newEnemy.vx
                newEnemy.y += newEnemy.vy
              }

              // Record position in history
              newEnemy.history.push({ x: newEnemy.x, y: newEnemy.y })
              if (newEnemy.history.length > 200) {
                // Limit history size
                newEnemy.history.shift()
              }

              // Shooting logic
              if (enemy.canShoot && now - enemy.lastShot > 2000) {
                // Shoot every 2 seconds
                const projectileId = Date.now() + Math.random()
                const projectileDx = dx / distance
                const projectileDy = dy / distance

                setProjectiles((prevProjectiles) => [
                  ...prevProjectiles,
                  {
                    id: projectileId,
                    x: enemy.x,
                    y: enemy.y,
                    vx: projectileDx * PROJECTILE_SPEED,
                    vy: projectileDy * PROJECTILE_SPEED,
                    history: [{ x: enemy.x, y: enemy.y }],
                  },
                ])

                newEnemy.lastShot = now
              }
            }

            return newEnemy
          })
          .filter(
            (enemy) => enemy.x > -50 && enemy.x < ARENA_WIDTH + 50 && enemy.y > -50 && enemy.y < ARENA_HEIGHT + 50,
          ),
      )

      // Update projectiles
      setProjectiles((prev) =>
        prev
          .map((projectile) => {
            const newProjectile = { ...projectile }

            if (isReversing && projectile.history.length > 1) {
              // Move backward through history
              const historyIndex = Math.max(
                0,
                projectile.history.length - Math.floor((timeSinceLastReversal - REVERSAL_INTERVAL) / 50),
              )
              const targetPos = projectile.history[historyIndex]
              if (targetPos) {
                newProjectile.x = targetPos.x
                newProjectile.y = targetPos.y
              }
            } else {
              // Normal movement
              newProjectile.x += projectile.vx
              newProjectile.y += projectile.vy

              // Record position in history
              newProjectile.history.push({ x: newProjectile.x, y: newProjectile.y })
              if (newProjectile.history.length > 200) {
                newProjectile.history.shift()
              }
            }

            return newProjectile
          })
          .filter(
            (projectile) =>
              projectile.x > -50 &&
              projectile.x < ARENA_WIDTH + 50 &&
              projectile.y > -50 &&
              projectile.y < ARENA_HEIGHT + 50,
          ),
      )

      gameLoopRef.current = requestAnimationFrame(gameLoop)
    }

    gameLoopRef.current = requestAnimationFrame(gameLoop)

    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current)
      }
    }
  }, [gameStarted, gameOver, playerPos, isReversing, spawnEnemy])

  // Check collisions
  useEffect(() => {
    if (gameStarted && !gameOver) {
      checkCollisions()
    }
  }, [playerPos, enemies, projectiles, gameStarted, gameOver, checkCollisions])

  const startGame = () => {
    setGameStarted(true)
    initializeGame()
  }

  const restartGame = () => {
    setGameStarted(true)
    initializeGame()
  }

  if (!gameStarted) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center space-y-6">
          <h1 className="text-4xl font-bold text-gray-800">Reverse Hazard</h1>
          <p className="text-lg text-gray-600 max-w-md">
            Survive in the arena while dodging enemies and projectiles. Every 5 seconds, time reverses for all enemies
            and projectiles for 2 seconds!
          </p>
          <div className="space-y-2 text-sm text-gray-500">
            <p>Use WASD or Arrow Keys to move</p>
            <p>🔵 Player • 🔴 Enemy • ⚫ Projectile</p>
          </div>
          <div className="space-x-4">
            <Button onClick={startGame} className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3">
              Start Game
            </Button>
            <Button onClick={onBack} variant="outline">
              Back to Menu
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
      <div className="mb-4 flex items-center space-x-8">
        <div className="text-lg font-bold">Time: {gameTime}s</div>
        <div className="text-lg font-bold">Reversals: {reversalCount}</div>
        <div
          className={`text-sm px-3 py-1 rounded ${isReversing ? "bg-red-200 text-red-800" : "bg-green-200 text-green-800"}`}
        >
          {isReversing ? "REVERSING!" : "Normal"}
        </div>
      </div>

      <div className="relative border-4 border-gray-800 bg-white" style={{ width: ARENA_WIDTH, height: ARENA_HEIGHT }}>
        {/* Player */}
        <div
          className="absolute bg-blue-500 rounded-full"
          style={{
            width: PLAYER_SIZE,
            height: PLAYER_SIZE,
            left: playerPos.x - PLAYER_SIZE / 2,
            top: playerPos.y - PLAYER_SIZE / 2,
          }}
        />

        {/* Enemies */}
        {enemies.map((enemy) => (
          <div
            key={enemy.id}
            className="absolute bg-red-500 rounded-full"
            style={{
              width: ENEMY_SIZE,
              height: ENEMY_SIZE,
              left: enemy.x - ENEMY_SIZE / 2,
              top: enemy.y - ENEMY_SIZE / 2,
            }}
          />
        ))}

        {/* Projectiles */}
        {projectiles.map((projectile) => (
          <div
            key={projectile.id}
            className="absolute bg-black rounded-full"
            style={{
              width: PROJECTILE_SIZE,
              height: PROJECTILE_SIZE,
              left: projectile.x - PROJECTILE_SIZE / 2,
              top: projectile.y - PROJECTILE_SIZE / 2,
            }}
          />
        ))}
      </div>

      <div className="mt-4 space-x-4">
        <Button onClick={onBack} variant="outline">
          Back to Menu
        </Button>
        <Button onClick={restartGame} className="bg-green-600 hover:bg-green-700 text-white">
          Play Again
        </Button>
      </div>

      {gameOver && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-8 rounded-lg text-center space-y-4">
            <h2 className="text-2xl font-bold text-red-600">Game Over!</h2>
            <p className="text-lg">You were hit by an enemy or projectile!</p>
            <div className="space-y-2">
              <p>Time Survived: {gameTime} seconds</p>
              <p>Reversals Endured: {reversalCount}</p>
            </div>
            <div className="space-x-4">
              <Button onClick={restartGame} className="bg-blue-600 hover:bg-blue-700 text-white">
                Play Again
              </Button>
              <Button onClick={onBack} variant="outline">
                Back to Menu
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
