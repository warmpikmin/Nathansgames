"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"

const CANVAS_WIDTH = 800
const CANVAS_HEIGHT = 600
const COIN_COUNT = 10
const SHADOW_DELAY = 1000
const SECOND_SHADOW_DELAY = 2000
const THIRD_SHADOW_DELAY = 3000
const SHADOW_SIZE = 50
const PLAYER_SPEED = 5

interface Position {
  x: number
  y: number
}

interface Coin {
  x: number
  y: number
  collected: boolean
}

interface Obstacle {
  x: number
  y: number
  width: number
  height: number
}

interface MovingObstacle {
  x: number
  y: number
  width: number
  height: number
  vx: number
  vy: number
}

interface Powerup {
  x: number
  y: number
  type: "slow" | "speed" | "freeze" | "shield"
  collected: boolean
}

interface GameSave {
  level: number
  survivalTime: number
  playerPos: Position
  gameStartTime: number
}

interface GameEffects {
  slowShadows: number
  playerSpeed: number
  freezeShadows: number
  shield: number
}

interface ShadowTagGameProps {
  onBack: () => void
}

export default function ShadowTagGame({ onBack }: ShadowTagGameProps) {
  const [level, setLevel] = useState(1)
  const [survivalTime, setSurvivalTime] = useState(0)
  const [playerPos, setPlayerPos] = useState({ x: 100, y: 100 })
  const [gameState, setGameState] = useState("menu")
  const [obstacles, setObstacles] = useState<Obstacle[]>([])
  const [movingObstacles, setMovingObstacles] = useState<MovingObstacle[]>([])
  const [coins, setCoins] = useState<Coin[]>([])
  const [powerups, setPowerups] = useState<Powerup[]>([])
  const [movementHistory, setMovementHistory] = useState<{ x: number; y: number }[]>([])
  const [shadows, setShadows] = useState<{ position: Position; delay: number; visible: boolean; size: number }[]>([])
  const [gameStartTime, setGameStartTime] = useState(0)
  const [gameEffects, setGameEffects] = useState<GameEffects>({
    slowShadows: 0,
    playerSpeed: 0,
    freezeShadows: 0,
    shield: 0,
  })
  const keysRef = useRef(new Set<string>())
  const [isFullscreen, setIsFullscreen] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const generateObstacles = useCallback((): Obstacle[] => {
    const newObstacles: Obstacle[] = []
    const obstacleCount = Math.min(level * 2, 20)
    for (let i = 0; i < obstacleCount; i++) {
      newObstacles.push({
        x: Math.random() * (CANVAS_WIDTH - 50),
        y: Math.random() * (CANVAS_HEIGHT - 50),
        width: 50,
        height: 50,
      })
    }
    return newObstacles
  }, [level])

  const generateMovingObstacles = useCallback((): MovingObstacle[] => {
    const newMovingObstacles: MovingObstacle[] = []
    const movingObstacleCount = Math.min(level * 2, 20)
    for (let i = 0; i < movingObstacleCount; i++) {
      newMovingObstacles.push({
        x: Math.random() * (CANVAS_WIDTH - 50),
        y: Math.random() * (CANVAS_HEIGHT - 50),
        width: 50,
        height: 50,
        vx: Math.random() * 4 - 2,
        vy: Math.random() * 4 - 2,
      })
    }
    return newMovingObstacles
  }, [level])

  const generateCoins = useCallback((obstacles: Obstacle[], movingObstacles: MovingObstacle[]): Coin[] => {
    const newCoins: Coin[] = []
    const gridSize = Math.ceil(Math.sqrt(COIN_COUNT))
    const cellWidth = CANVAS_WIDTH / gridSize
    const cellHeight = CANVAS_HEIGHT / gridSize

    for (let i = 0; i < COIN_COUNT; i++) {
      let coin: Coin
      let attempts = 0
      do {
        const gridX = i % gridSize
        const gridY = Math.floor(i / gridSize)
        const baseX = gridX * cellWidth
        const baseY = gridY * cellHeight

        coin = {
          x: baseX + Math.random() * (cellWidth - 40) + 20,
          y: baseY + Math.random() * (cellHeight - 40) + 20,
          collected: false,
        }
        attempts++
      } while (
        attempts < 100 &&
        (obstacles.some(
          (obs) =>
            coin.x > obs.x - 20 &&
            coin.x < obs.x + obs.width + 20 &&
            coin.y > obs.y - 20 &&
            coin.y < obs.y + obs.height + 20,
        ) ||
          movingObstacles.some(
            (obs) =>
              coin.x > obs.x - 20 &&
              coin.x < obs.x + obs.width + 20 &&
              coin.y > obs.y - 20 &&
              coin.y < obs.y + obs.height + 20,
          ) ||
          (coin.x < 150 && coin.y < 150))
      )
      newCoins.push(coin)
    }
    return newCoins
  }, [])

  const generatePowerups = useCallback(
    (obstacles: Obstacle[], movingObstacles: MovingObstacle[]): Powerup[] => {
      const powerupTypes: Powerup["type"][] = ["slow", "speed", "freeze", "shield"]
      const newPowerups: Powerup[] = []
      const powerupCount = Math.max(4 - Math.floor(level / 3), 1)

      for (let i = 0; i < powerupCount; i++) {
        let powerup: Powerup
        let attempts = 0
        do {
          powerup = {
            x: Math.random() * (CANVAS_WIDTH - 40) + 20,
            y: Math.random() * (CANVAS_HEIGHT - 40) + 20,
            type: powerupTypes[Math.floor(Math.random() * powerupTypes.length)],
            collected: false,
          }
          attempts++
        } while (
          attempts < 100 &&
          (obstacles.some(
            (obs) =>
              powerup.x > obs.x - 30 &&
              powerup.x < obs.x + obs.width + 30 &&
              powerup.y > obs.y - 30 &&
              powerup.y < obs.y + obs.height + 30,
          ) ||
            movingObstacles.some(
              (obs) =>
                powerup.x > obs.x - 30 &&
                powerup.x < obs.x + obs.width + 30 &&
                powerup.y > obs.y - 30 &&
                powerup.y < obs.y + obs.height + 30,
            ) ||
            (powerup.x < 150 && powerup.y < 150))
        )
        newPowerups.push(powerup)
      }
      return newPowerups
    },
    [level],
  )

  const advanceToNextLevel = useCallback(() => {
    const newObstacles = generateObstacles()
    const newMovingObstacles = generateMovingObstacles()
    const newCoins = generateCoins(newObstacles, newMovingObstacles)
    const newPowerups = generatePowerups(newObstacles, newMovingObstacles)

    setLevel((prev) => prev + 1)
    setObstacles(newObstacles)
    setMovingObstacles(newMovingObstacles)
    setCoins(newCoins)
    setPowerups(newPowerups)
    setPlayerPos({ x: 100, y: 100 })
    setMovementHistory([])
    setShadows([
      { position: { x: -100, y: -100 }, delay: SHADOW_DELAY, visible: false, size: SHADOW_SIZE },
      { position: { x: -100, y: -100 }, delay: SECOND_SHADOW_DELAY, visible: false, size: SHADOW_SIZE - 2 },
      { position: { x: -100, y: -100 }, delay: THIRD_SHADOW_DELAY, visible: false, size: SHADOW_SIZE - 4 },
    ])
    setGameStartTime(Date.now())
  }, [generateObstacles, generateMovingObstacles, generateCoins, generatePowerups])

  const checkCollision = useCallback((pos1: Position, size1: number, pos2: Position, size2: number): boolean => {
    return pos1.x < pos2.x + size2 && pos1.x + size1 > pos2.x && pos1.y < pos2.y + size2 && pos1.y + size1 > pos2.y
  }, [])

  const checkObstacleCollision = useCallback(
    (pos: Position, size: number): boolean => {
      return (
        obstacles.some(
          (obstacle) =>
            pos.x < obstacle.x + obstacle.width &&
            pos.x + size > obstacle.x &&
            pos.y < obstacle.y + obstacle.height &&
            pos.y + size > obstacle.y,
        ) ||
        movingObstacles.some(
          (obstacle) =>
            pos.x < obstacle.x + obstacle.width &&
            pos.x + size > obstacle.x &&
            pos.y < obstacle.y + obstacle.height &&
            pos.y + size > obstacle.y,
        )
      )
    },
    [obstacles, movingObstacles],
  )

  const startGame = useCallback(() => {
    const newObstacles = generateObstacles()
    const newMovingObstacles = generateMovingObstacles()
    const newCoins = generateCoins(newObstacles, newMovingObstacles)
    const newPowerups = generatePowerups(newObstacles, newMovingObstacles)

    setGameState("playing")
    setPlayerPos({ x: 100, y: 100 })
    setShadows([
      { position: { x: -100, y: -100 }, delay: SHADOW_DELAY, visible: false, size: SHADOW_SIZE },
      { position: { x: -100, y: -100 }, delay: SECOND_SHADOW_DELAY, visible: false, size: SHADOW_SIZE - 2 },
      { position: { x: -100, y: -100 }, delay: THIRD_SHADOW_DELAY, visible: false, size: SHADOW_SIZE - 4 },
    ])
    setMovementHistory([])
    setObstacles(newObstacles)
    setMovingObstacles(newMovingObstacles)
    setCoins(newCoins)
    setPowerups(newPowerups)
    setLevel(1)
    setSurvivalTime(0)
    setGameStartTime(Date.now())
    setGameEffects({ slowShadows: 0, playerSpeed: 0, freezeShadows: 0, shield: 0 })
  }, [generateObstacles, generateMovingObstacles, generateCoins, generatePowerups])

  const saveGame = useCallback(() => {
    if (gameState !== "playing") return
    if (typeof window === "undefined" || typeof localStorage === "undefined") return

    const saveData: GameSave = {
      level,
      survivalTime,
      playerPos,
      gameStartTime,
    }
    localStorage.setItem("shadowTagSave", JSON.stringify(saveData))
  }, [gameState, level, survivalTime, playerPos, gameStartTime])

  const loadGame = useCallback(() => {
    if (typeof window === "undefined" || typeof localStorage === "undefined") return false

    const saveData = localStorage.getItem("shadowTagSave")
    if (!saveData) return false

    try {
      const parsed: GameSave = JSON.parse(saveData)

      const newObstacles = generateObstacles()
      const newMovingObstacles = generateMovingObstacles()
      const newCoins = generateCoins(newObstacles, newMovingObstacles)
      const newPowerups = generatePowerups(newObstacles, newMovingObstacles)

      setGameState("playing")
      setLevel(parsed.level)
      setSurvivalTime(parsed.survivalTime)
      setPlayerPos(parsed.playerPos)
      setGameStartTime(parsed.gameStartTime)
      setObstacles(newObstacles)
      setMovingObstacles(newMovingObstacles)
      setCoins(newCoins)
      setPowerups(newPowerups)
      setMovementHistory([])
      setShadows([
        { position: { x: -100, y: -100 }, delay: SHADOW_DELAY, visible: false, size: SHADOW_SIZE },
        { position: { x: -100, y: -100 }, delay: SECOND_SHADOW_DELAY, visible: false, size: SHADOW_SIZE - 2 },
        { position: { x: -100, y: -100 }, delay: THIRD_SHADOW_DELAY, visible: false, size: SHADOW_SIZE - 4 },
      ])
      setGameEffects({ slowShadows: 0, playerSpeed: 0, freezeShadows: 0, shield: 0 })

      return true
    } catch (error) {
      console.error("Failed to load game:", error)
      return false
    }
  }, [generateObstacles, generateMovingObstacles, generateCoins, generatePowerups])

  const toggleFullscreen = useCallback(async () => {
    if (!canvasRef.current) return

    try {
      if (!isFullscreen) {
        await canvasRef.current.requestFullscreen()
        setIsFullscreen(true)
      } else {
        await document.exitFullscreen()
        setIsFullscreen(false)
      }
    } catch (error) {
      console.error("Fullscreen error:", error)
    }
  }, [isFullscreen])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current.add(e.key.toLowerCase())
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.key.toLowerCase())
    }

    window.addEventListener("keydown", handleKeyDown)
    window.addEventListener("keyup", handleKeyUp)

    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("keyup", handleKeyUp)
    }
  }, [])

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }

    document.addEventListener("fullscreenchange", handleFullscreenChange)
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange)
  }, [])

  useEffect(() => {
    if (gameState !== "playing") return

    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const gameLoop = () => {
      const currentTime = Date.now()
      const elapsedTime = currentTime - gameStartTime
      setSurvivalTime(Math.floor(elapsedTime / 1000))

      setGameEffects((prev) => ({
        slowShadows: prev.slowShadows > currentTime ? prev.slowShadows : 0,
        playerSpeed: prev.playerSpeed > currentTime ? prev.playerSpeed : 0,
        freezeShadows: prev.freezeShadows > currentTime ? prev.freezeShadows : 0,
        shield: prev.shield > currentTime ? prev.shield : 0,
      }))

      setShadows((prevShadows) =>
        prevShadows.map((shadow, index) => {
          const delays = [SHADOW_DELAY, SECOND_SHADOW_DELAY, THIRD_SHADOW_DELAY]
          return {
            ...shadow,
            visible: elapsedTime >= delays[index],
          }
        }),
      )

      setMovingObstacles((prevMovingObstacles) =>
        prevMovingObstacles.map((obstacle) => {
          let newX = obstacle.x + obstacle.vx * 0.5
          let newY = obstacle.y + obstacle.vy * 0.5
          let newVx = obstacle.vx
          let newVy = obstacle.vy

          if (newX <= 0 || newX >= CANVAS_WIDTH - obstacle.width) {
            newVx = -newVx
            newX = Math.max(0, Math.min(CANVAS_WIDTH - obstacle.width, newX))
          }
          if (newY <= 0 || newY >= CANVAS_HEIGHT - obstacle.height) {
            newVy = -newVy
            newY = Math.max(0, Math.min(CANVAS_HEIGHT - obstacle.height, newY))
          }

          return { ...obstacle, x: newX, y: newY, vx: newVx, vy: newVy }
        }),
      )

      setPlayerPos((prevPos) => {
        let newX = prevPos.x
        let newY = prevPos.y

        const currentPlayerSpeed = gameEffects.playerSpeed > currentTime ? PLAYER_SPEED * 1.5 : PLAYER_SPEED

        if (keysRef.current.has("arrowleft") || keysRef.current.has("a")) newX -= currentPlayerSpeed
        if (keysRef.current.has("arrowright") || keysRef.current.has("d")) newX += currentPlayerSpeed
        if (keysRef.current.has("arrowup") || keysRef.current.has("w")) newY -= currentPlayerSpeed
        if (keysRef.current.has("arrowdown") || keysRef.current.has("s")) newY += currentPlayerSpeed

        if (checkObstacleCollision({ x: newX, y: newY }, 20)) {
          newX = prevPos.x
          newY = prevPos.y
        }

        setMovementHistory((prevHistory) => [...prevHistory, { x: newX, y: newY }])

        return { x: newX, y: newY }
      })

      ctx.fillStyle = `linear-gradient(135deg, hsl(${220 + level * 10}, 70%, 95%), hsl(${240 + level * 15}, 60%, 90%))`
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

      ctx.fillStyle = "#64748b"
      obstacles.forEach((obstacle) => {
        ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height)
      })

      ctx.fillStyle = "#ef4444"
      movingObstacles.forEach((obstacle) => {
        ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height)
      })

      ctx.fillStyle = "#fde047"
      coins.forEach((coin) => {
        if (!coin.collected) {
          ctx.beginPath()
          ctx.arc(coin.x, coin.y, 20, 0, Math.PI * 2)
          ctx.fill()
        }
      })

      ctx.fillStyle = "#ffffff"
      powerups.forEach((powerup) => {
        if (!powerup.collected) {
          ctx.beginPath()
          ctx.arc(powerup.x, powerup.y, 20, 0, Math.PI * 2)
          ctx.fill()
        }
      })

      ctx.fillStyle = "#ffffff"
      ctx.beginPath()
      ctx.arc(playerPos.x, playerPos.y, 20, 0, Math.PI * 2)
      ctx.fill()

      shadows.forEach((shadow) => {
        if (shadow.visible) {
          ctx.fillStyle = `rgba(255, 255, 255, ${0.5 - shadow.size / SHADOW_SIZE})`
          ctx.beginPath()
          ctx.arc(shadow.position.x, shadow.position.y, shadow.size, 0, Math.PI * 2)
          ctx.fill()
        }
      })

      requestAnimationFrame(gameLoop)
    }

    gameLoop()
  }, [gameState, gameStartTime, checkCollision, checkObstacleCollision, advanceToNextLevel, saveGame])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex flex-col items-center justify-center p-4">
      {gameState === "menu" && (
        <div className="text-center space-y-8 max-w-md">
          <Button
            onClick={startGame}
            variant="default"
            className="bg-white/10 backdrop-blur-sm text-white border-white/20"
          >
            Start Game
          </Button>
          <Button
            onClick={loadGame}
            variant="outline"
            className="bg-white/10 backdrop-blur-sm text-white border-white/20"
          >
            Load Game
          </Button>
        </div>
      )}

      {gameState === "playing" && (
        <div className="flex flex-col items-center space-y-4">
          <div className="flex items-center justify-between w-full max-w-4xl px-4">
            <Button
              onClick={onBack}
              variant="outline"
              className="bg-white/10 backdrop-blur-sm text-white border-white/20"
            >
              ← Back
            </Button>
            <div className="flex items-center space-x-6 text-white">
              <div className="text-center">
                <div className="text-2xl font-bold">Level {level}</div>
                <div className="text-sm opacity-80">Current Level</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{survivalTime}s</div>
                <div className="text-sm opacity-80">Survival Time</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{coins.filter((c) => !c.collected).length}</div>
                <div className="text-sm opacity-80">Gold Left</div>
              </div>
            </div>
            <Button
              onClick={toggleFullscreen}
              variant="outline"
              className="bg-white/10 backdrop-blur-sm text-white border-white/20"
            >
              {isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
            </Button>
          </div>
          {(gameEffects.slowShadows > Date.now() ||
            gameEffects.playerSpeed > Date.now() ||
            gameEffects.freezeShadows > Date.now() ||
            gameEffects.shield > Date.now()) && (
            <div className="flex space-x-2 text-white text-sm">
              {gameEffects.slowShadows > Date.now() && (
                <span className="bg-purple-500/20 px-2 py-1 rounded">Slow Shadows</span>
              )}
              {gameEffects.playerSpeed > Date.now() && (
                <span className="bg-green-500/20 px-2 py-1 rounded">Speed Boost</span>
              )}
              {gameEffects.freezeShadows > Date.now() && (
                <span className="bg-cyan-500/20 px-2 py-1 rounded">Freeze Shadows</span>
              )}
              {gameEffects.shield > Date.now() && <span className="bg-orange-500/20 px-2 py-1 rounded">Shield</span>}
            </div>
          )}
          <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            className="border-2 border-white/20 rounded-lg shadow-2xl bg-gradient-to-br from-blue-100 to-purple-100"
            style={{
              maxWidth: "100%",
              height: "auto",
              cursor: gameEffects.shield > Date.now() ? "crosshair" : "default",
            }}
          />
          <div className="text-white text-center max-w-md">
            <p className="text-sm opacity-80">
              Use WASD or arrow keys to move. Collect gold coins to advance levels. Avoid your shadows and moving
              blocks!
            </p>
          </div>
        </div>
      )}

      {gameState === "gameOver" && (
        <div className="text-center space-y-6 max-w-md">
          <div className="text-4xl font-bold text-red-500">Game Over</div>
          <div className="text-2xl font-bold">Level {level}</div>
          <div className="text-2xl font-bold">{survivalTime}s</div>
          <Button
            onClick={startGame}
            variant="default"
            className="bg-white/10 backdrop-blur-sm text-white border-white/20"
          >
            Restart Game
          </Button>
        </div>
      )}
    </div>
  )
}
