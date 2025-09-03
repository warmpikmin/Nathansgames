"use client"

import { useEffect, useRef, useState, useCallback } from "react"

interface Position {
  x: number
  y: number
}

interface MovementRecord {
  position: Position
  timestamp: number
}

interface Obstacle {
  x: number
  y: number
  width: number
  height: number
}

interface Coin {
  x: number
  y: number
  collected: boolean
}

interface Shadow {
  position: Position
  delay: number
  visible: boolean
  size: number
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
  duration?: number
}

interface GameEffects {
  slowShadows: number // timestamp when effect ends
  playerSpeed: number // timestamp when effect ends
  freezeShadows: number // timestamp when effect ends
  shield: number // timestamp when effect ends
}

interface GameSave {
  level: number
  survivalTime: number
  playerPos: Position
  gameStartTime: number
}

const CANVAS_WIDTH = 800
const CANVAS_HEIGHT = 600
const PLAYER_SIZE = 20
const SHADOW_SIZE = 18
const PLAYER_SPEED = 2
const SHADOW_DELAY = 3000 // 3 seconds
const OBSTACLE_COUNT = 8
const COIN_COUNT = 8
const COIN_SIZE = 12
const POWERUP_SIZE = 16

const SECOND_SHADOW_DELAY = 8000
const THIRD_SHADOW_DELAY = 15000

export default function ShadowTagGame({ onBack }: { onBack: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const gameLoopRef = useRef<number>()
  const keysRef = useRef<Set<string>>(new Set())
  const [isFullscreen, setIsFullscreen] = useState(false)

  const [gameState, setGameState] = useState<"menu" | "playing" | "gameOver">("menu")
  const [playerPos, setPlayerPos] = useState<Position>({ x: 100, y: 100 })
  const [shadows, setShadows] = useState<Shadow[]>([])
  const [movementHistory, setMovementHistory] = useState<MovementRecord[]>([])
  const [obstacles, setObstacles] = useState<Obstacle[]>([])
  const [movingObstacles, setMovingObstacles] = useState<MovingObstacle[]>([]) // Added moving obstacles state
  const [coins, setCoins] = useState<Coin[]>([])
  const [powerups, setPowerups] = useState<Powerup[]>([])
  const [level, setLevel] = useState(1)
  const [survivalTime, setSurvivalTime] = useState(0)
  const [gameStartTime, setGameStartTime] = useState(0)
  const [gameEffects, setGameEffects] = useState<GameEffects>({
    slowShadows: 0,
    playerSpeed: 0,
    freezeShadows: 0,
    shield: 0,
  })

  const getShadowSpeedMultiplier = (level: number) => Math.min(1.1 + (level - 1) * 0.1, 2.0)

  const generateObstacles = useCallback((): Obstacle[] => {
    const newObstacles: Obstacle[] = []
    const obstacleCount = Math.min(OBSTACLE_COUNT + Math.floor(level / 2), 15) // More obstacles each level
    for (let i = 0; i < obstacleCount; i++) {
      let obstacle: Obstacle
      let attempts = 0
      do {
        obstacle = {
          x: Math.random() * (CANVAS_WIDTH - 80) + 40,
          y: Math.random() * (CANVAS_HEIGHT - 80) + 40,
          width: 40 + Math.random() * 40,
          height: 40 + Math.random() * 40,
        }
        attempts++
      } while (
        attempts < 50 &&
        obstacle.x < 150 &&
        obstacle.y < 150 // Keep starting area clear
      )
      newObstacles.push(obstacle)
    }
    return newObstacles
  }, [level])

  const generateMovingObstacles = useCallback((): MovingObstacle[] => {
    const newMovingObstacles: MovingObstacle[] = []
    const count = Math.min(2 + Math.floor(level / 2), 8) // More moving obstacles at higher levels

    for (let i = 0; i < count; i++) {
      const obstacle: MovingObstacle = {
        x: Math.random() * (CANVAS_WIDTH - 60) + 30,
        y: Math.random() * (CANVAS_HEIGHT - 60) + 30,
        width: 30,
        height: 30,
        vx: (Math.random() - 0.5) * (2 + level * 0.3),
        vy: (Math.random() - 0.5) * (2 + level * 0.3),
      }
      newMovingObstacles.push(obstacle)
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

      // Generate level-appropriate obstacles and items
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
    if (gameState !== "playing") return

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

        newX = Math.max(0, Math.min(CANVAS_WIDTH - PLAYER_SIZE, newX))
        newY = Math.max(0, Math.min(CANVAS_HEIGHT - PLAYER_SIZE, newY))

        const testPos = { x: newX, y: newY }
        if (checkObstacleCollision(testPos, PLAYER_SIZE)) {
          return prevPos
        }

        return { x: newX, y: newY }
      })

      setShadows((prevShadows) =>
        prevShadows.map((shadow, index) => {
          if (!shadow.visible) return shadow

          if (gameEffects.freezeShadows > currentTime) {
            return shadow
          }

          const baseSpeedMultiplier = getShadowSpeedMultiplier(level)
          let speedMultipliers = [baseSpeedMultiplier, baseSpeedMultiplier - 0.1, baseSpeedMultiplier - 0.2]

          if (gameEffects.slowShadows > currentTime) {
            speedMultipliers = speedMultipliers.map((speed) => speed * 0.4)
          }

          const currentSpeedMultiplier = speedMultipliers[index] || baseSpeedMultiplier

          const dx = playerPos.x - shadow.position.x
          const dy = playerPos.y - shadow.position.y
          const distance = Math.sqrt(dx * dx + dy * dy)

          if (distance > 1) {
            const moveX = (dx / distance) * PLAYER_SPEED * currentSpeedMultiplier
            const moveY = (dy / distance) * PLAYER_SPEED * currentSpeedMultiplier

            let newX = shadow.position.x + moveX
            let newY = shadow.position.y + moveY

            newX = Math.max(0, Math.min(CANVAS_WIDTH - shadow.size, newX))
            newY = Math.max(0, Math.min(CANVAS_HEIGHT - shadow.size, newY))

            const testPos = { x: newX, y: newY }
            if (!checkObstacleCollision(testPos, shadow.size)) {
              return { ...shadow, position: { x: newX, y: newY } }
            }
          }
          return shadow
        }),
      )

      setCoins((prevCoins) => {
        const updatedCoins = prevCoins.map((coin) => {
          if (!coin.collected && checkCollision(playerPos, PLAYER_SIZE, coin, COIN_SIZE)) {
            return { ...coin, collected: true }
          }
          return coin
        })

        const allCoinsCollected = updatedCoins.every((coin) => coin.collected)
        if (allCoinsCollected && !prevCoins.every((coin) => coin.collected)) {
          setTimeout(() => {
            advanceToNextLevel()
          }, 500)
        }

        return updatedCoins
      })

      setPowerups((prevPowerups) => {
        return prevPowerups.map((powerup) => {
          if (!powerup.collected && checkCollision(playerPos, PLAYER_SIZE, powerup, POWERUP_SIZE)) {
            const effectDuration = 5000 // 5 seconds
            const newEffectTime = currentTime + effectDuration

            setGameEffects((prev) => {
              switch (powerup.type) {
                case "slow":
                  return { ...prev, slowShadows: newEffectTime }
                case "speed":
                  return { ...prev, playerSpeed: newEffectTime }
                case "freeze":
                  return { ...prev, freezeShadows: newEffectTime }
                case "shield":
                  return { ...prev, shield: newEffectTime }
                default:
                  return prev
              }
            })

            return { ...powerup, collected: true }
          }
          return powerup
        })
      })

      const shadowCollision =
        gameEffects.shield <= currentTime &&
        shadows.some((shadow) => shadow.visible && checkCollision(playerPos, PLAYER_SIZE, shadow.position, shadow.size))

      if (shadowCollision) {
        setGameState("gameOver")
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
  }, [
    gameState,
    gameStartTime,
    shadows,
    playerPos,
    gameEffects,
    checkCollision,
    checkObstacleCollision,
    advanceToNextLevel,
    level,
  ])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const gradient = ctx.createLinearGradient(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
    gradient.addColorStop(0, "#0f172a")
    gradient.addColorStop(1, "#1e293b")
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

    if (gameState === "menu") {
      const time = Date.now() * 0.001
      for (let i = 0; i < 50; i++) {
        const x = (Math.sin(time + i) * 100 + CANVAS_WIDTH / 2) % CANVAS_WIDTH
        const y = (Math.cos(time * 0.7 + i) * 80 + CANVAS_HEIGHT / 2) % CANVAS_HEIGHT
        ctx.fillStyle = `rgba(59, 130, 246, ${0.1 + Math.sin(time + i) * 0.05})`
        ctx.beginPath()
        ctx.arc(x, y, 2, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    if (gameState === "playing") {
      obstacles.forEach((obstacle) => {
        const obstacleGradient = ctx.createLinearGradient(
          obstacle.x,
          obstacle.y,
          obstacle.x + obstacle.width,
          obstacle.y + obstacle.height,
        )
        obstacleGradient.addColorStop(0, "#64748b")
        obstacleGradient.addColorStop(1, "#334155")
        ctx.fillStyle = obstacleGradient
        ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height)

        ctx.strokeStyle = "#475569"
        ctx.lineWidth = 1
        ctx.strokeRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height)
      })

      movingObstacles.forEach((obstacle, index) => {
        const time = Date.now() * 0.003
        const bounce = Math.sin(time * 3 + index) * 3
        const pulse = Math.sin(time * 2 + index) * 0.2 + 0.8

        // Slime body
        ctx.fillStyle = `rgba(34, 197, 94, ${pulse})`
        ctx.shadowColor = "#22c55e"
        ctx.shadowBlur = 8

        // Draw slime as rounded blob
        ctx.beginPath()
        ctx.ellipse(
          obstacle.x + obstacle.width / 2,
          obstacle.y + obstacle.height / 2 + bounce,
          (obstacle.width / 2) * pulse,
          (obstacle.height / 2) * pulse,
          0,
          0,
          Math.PI * 2,
        )
        ctx.fill()

        // Slime eyes
        ctx.shadowBlur = 0
        ctx.fillStyle = "#000000"
        const eyeSize = 3 * pulse
        ctx.beginPath()
        ctx.arc(
          obstacle.x + obstacle.width * 0.35,
          obstacle.y + obstacle.height * 0.4 + bounce,
          eyeSize,
          0,
          Math.PI * 2,
        )
        ctx.fill()
        ctx.beginPath()
        ctx.arc(
          obstacle.x + obstacle.width * 0.65,
          obstacle.y + obstacle.height * 0.4 + bounce,
          eyeSize,
          0,
          Math.PI * 2,
        )
        ctx.fill()

        // Slime highlight
        ctx.fillStyle = `rgba(255, 255, 255, ${0.3 * pulse})`
        ctx.beginPath()
        ctx.ellipse(
          obstacle.x + obstacle.width * 0.4,
          obstacle.y + obstacle.height * 0.3 + bounce,
          obstacle.width * 0.15,
          obstacle.height * 0.1,
          0,
          0,
          Math.PI * 2,
        )
        ctx.fill()

        ctx.shadowBlur = 0
      })

      const time = Date.now() * 0.003
      coins.forEach((coin, index) => {
        if (!coin.collected) {
          ctx.save()
          ctx.translate(coin.x + COIN_SIZE / 2, coin.y + COIN_SIZE / 2)
          ctx.rotate(time + index)

          const coinGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, COIN_SIZE / 2)
          coinGradient.addColorStop(0, "#fbbf24")
          coinGradient.addColorStop(1, "#f59e0b")
          ctx.fillStyle = coinGradient
          ctx.shadowColor = "#fbbf24"
          ctx.shadowBlur = 8

          ctx.beginPath()
          ctx.arc(0, 0, COIN_SIZE / 2, 0, Math.PI * 2)
          ctx.fill()
          ctx.shadowBlur = 0
          ctx.restore()
        }
      })

      powerups.forEach((powerup) => {
        if (!powerup.collected) {
          const powerupColors = {
            slow: "#8b5cf6", // Purple for slow
            speed: "#10b981", // Green for speed
            freeze: "#06b6d4", // Cyan for freeze
            shield: "#f59e0b", // Orange for shield
          }

          ctx.fillStyle = powerupColors[powerup.type]
          ctx.shadowColor = powerupColors[powerup.type]
          ctx.shadowBlur = 8

          ctx.save()
          ctx.translate(powerup.x + POWERUP_SIZE / 2, powerup.y + POWERUP_SIZE / 2)
          ctx.rotate(Math.PI / 4)
          ctx.fillRect(-POWERUP_SIZE / 2, -POWERUP_SIZE / 2, POWERUP_SIZE, POWERUP_SIZE)
          ctx.restore()

          ctx.shadowBlur = 0
        }
      })

      shadows.forEach((shadow, index) => {
        if (shadow.visible) {
          const shadowColors = ["#4a5568", "#6b7280", "#9ca3af"]
          ctx.fillStyle = shadowColors[index] || "#4a5568"
          ctx.fillRect(shadow.position.x, shadow.position.y, shadow.size, shadow.size)

          ctx.shadowColor = shadowColors[index] || "#4a5568"
          ctx.shadowBlur = 8 - index * 2
          ctx.fillRect(shadow.position.x, shadow.position.y, shadow.size, shadow.size)
          ctx.shadowBlur = 0
        }
      })

      if (gameEffects.shield > Date.now()) {
        ctx.fillStyle = "#f59e0b"
        ctx.shadowColor = "#f59e0b"
        ctx.shadowBlur = 15
        ctx.fillRect(playerPos.x - 3, playerPos.y - 3, PLAYER_SIZE + 6, PLAYER_SIZE + 6)
        ctx.shadowBlur = 0
      }

      const playerHue = ((level - 1) * 30) % 360
      ctx.fillStyle = `hsl(${playerHue}, 70%, 60%)`
      ctx.shadowColor = `hsl(${playerHue}, 70%, 60%)`
      ctx.shadowBlur = 12
      ctx.fillRect(playerPos.x, playerPos.y, PLAYER_SIZE, PLAYER_SIZE)
      ctx.shadowBlur = 0

      ctx.strokeStyle = `hsl(${playerHue}, 70%, 80%)`
      ctx.lineWidth = 2
      ctx.strokeRect(playerPos.x, playerPos.y, PLAYER_SIZE, PLAYER_SIZE)
    }
  }, [gameState, playerPos, shadows, obstacles, movingObstacles, coins, powerups, gameEffects, level])

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }, [])

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }

    document.addEventListener("fullscreenchange", handleFullscreenChange)
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange)
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex flex-col items-center justify-center p-4">
      <div className="text-center mb-6">
        <h1 className="text-6xl font-bold bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 bg-clip-text text-transparent mb-4">
          Shadow Tag
        </h1>
        <p className="text-xl text-gray-300 mb-4">
          Survive the relentless chase through increasingly challenging levels!
        </p>
        <div className="flex gap-4 justify-center items-center">
          <button
            onClick={onBack}
            className="px-6 py-3 bg-gradient-to-r from-slate-700 to-slate-600 hover:from-slate-600 hover:to-slate-500 text-white rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg"
          >
            ← Back to Menu
          </button>
          <button
            onClick={toggleFullscreen}
            className="px-6 py-3 bg-gradient-to-r from-gray-700 to-gray-600 hover:from-gray-600 hover:to-gray-500 text-white rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg"
          >
            {isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
          </button>
          {gameState === "playing" && (
            <button
              onClick={saveGame}
              className="px-6 py-3 bg-gradient-to-r from-blue-700 to-blue-600 hover:from-blue-600 hover:to-blue-500 text-white rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg"
            >
              Save Game
            </button>
          )}
        </div>
      </div>

      {gameState === "playing" && (
        <div className="flex gap-8 mb-4 text-white">
          <div className="text-lg">
            Time: <span className="font-bold text-blue-400">{survivalTime}s</span>
          </div>
          <div className="text-lg">
            Level: <span className="font-bold text-yellow-400">{level}</span>
          </div>
          <div className="text-lg">
            Shadows: <span className="font-bold text-red-400">{shadows.filter((s) => s.visible).length}/3</span>
          </div>
          <div className="text-lg">
            Coins:{" "}
            <span className="font-bold text-green-400">
              {coins.filter((c) => !c.collected).length}/{COIN_COUNT}
            </span>
          </div>
        </div>
      )}

      {gameState === "playing" && (
        <div className="flex gap-4 mb-4 text-sm">
          {gameEffects.slowShadows > Date.now() && (
            <div className="px-3 py-1 bg-purple-600 text-white rounded-full">🐌 Slow Shadows</div>
          )}
          {gameEffects.playerSpeed > Date.now() && (
            <div className="px-3 py-1 bg-green-600 text-white rounded-full">⚡ Speed Boost</div>
          )}
          {gameEffects.freezeShadows > Date.now() && (
            <div className="px-3 py-1 bg-cyan-600 text-white rounded-full">❄️ Frozen Shadows</div>
          )}
          {gameEffects.shield > Date.now() && (
            <div className="px-3 py-1 bg-orange-600 text-white rounded-full">🛡️ Shield Active</div>
          )}
        </div>
      )}

      <div className="relative">
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="border-4 border-purple-500/30 rounded-2xl shadow-2xl shadow-purple-500/20"
        />

        {gameState === "menu" && (
          <div className="absolute inset-0 bg-gradient-to-br from-black/80 via-purple-900/50 to-black/80 flex flex-col items-center justify-center rounded-2xl backdrop-blur-sm">
            <div className="text-center p-8 bg-black/40 rounded-3xl border border-purple-500/30">
              <h2 className="text-4xl font-bold text-white mb-6 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                Ready for the Challenge?
              </h2>
              <p className="text-gray-300 mb-8 text-lg max-w-md leading-relaxed">
                Each level brings faster shadows, more obstacles, and bouncing slimes. Collect powerups to survive the
                relentless pursuit!
              </p>
              <div className="flex gap-4 justify-center">
                <button
                  onClick={startGame}
                  className="px-12 py-4 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 hover:from-blue-500 hover:via-purple-500 hover:to-pink-500 text-white font-bold text-xl rounded-2xl transition-all duration-300 transform hover:scale-110 shadow-2xl shadow-purple-500/30"
                >
                  Begin Adventure
                </button>
                {typeof window !== "undefined" &&
                  typeof localStorage !== "undefined" &&
                  localStorage.getItem("shadowTagSave") && (
                    <button
                      onClick={loadGame}
                      className="px-12 py-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-bold text-xl rounded-2xl transition-all duration-300 transform hover:scale-110 shadow-2xl shadow-green-500/30"
                    >
                      Continue Journey
                    </button>
                  )}
              </div>
              <button
                onClick={onBack}
                className="mt-4 px-8 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl transition-colors"
              >
                ← Back to Menu
              </button>
            </div>
          </div>
        )}

        {gameState === "gameOver" && (
          <div className="absolute inset-0 bg-gradient-to-br from-red-900/80 via-black/80 to-red-900/80 flex flex-col items-center justify-center rounded-2xl backdrop-blur-sm">
            <div className="text-center p-8 bg-black/40 rounded-3xl border border-red-500/30">
              <h2 className="text-4xl font-bold text-red-400 mb-6">Epic Battle Ended!</h2>
              <div className="space-y-3 mb-8">
                <p className="text-white text-2xl">
                  Survival Time: <span className="font-bold text-blue-400">{survivalTime}s</span>
                </p>
                <p className="text-white text-2xl">
                  Levels Conquered: <span className="font-bold text-yellow-400">{level}</span>
                </p>
                <p className="text-gray-300 text-lg">
                  {level >= 5 ? "Legendary Performance!" : level >= 3 ? "Great Job!" : "Keep Fighting!"}
                </p>
              </div>
              <button
                onClick={startGame}
                className="px-12 py-4 bg-gradient-to-r from-red-600 via-orange-600 to-yellow-600 hover:from-red-500 hover:via-orange-500 hover:to-yellow-500 text-white font-bold text-xl rounded-2xl transition-all duration-300 transform hover:scale-110 shadow-2xl shadow-red-500/30"
              >
                Rise Again
              </button>
              <button
                onClick={onBack}
                className="mt-4 px-8 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl transition-colors"
              >
                ← Back to Menu
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="mt-8 text-center text-gray-300 max-w-4xl">
        <div className="bg-black/20 rounded-2xl p-6 border border-purple-500/20">
          <h3 className="text-2xl font-bold mb-4 text-purple-400">Game Mechanics</h3>
          <p className="text-lg mb-4">
            Navigate with <kbd className="px-2 py-1 bg-gray-700 rounded">WASD</kbd> or arrow keys. Collect all coins to
            advance levels. Each level increases difficulty with faster shadows and more obstacles!
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="bg-purple-900/30 p-3 rounded-lg">
              <span className="text-purple-400 text-lg">💎</span>
              <div className="text-purple-300">Slow Shadows</div>
            </div>
            <div className="bg-green-900/30 p-3 rounded-lg">
              <span className="text-green-400 text-lg">💎</span>
              <div className="text-green-300">Speed Boost</div>
            </div>
            <div className="bg-cyan-900/30 p-3 rounded-lg">
              <span className="text-cyan-400 text-lg">💎</span>
              <div className="text-cyan-300">Freeze Shadows</div>
            </div>
            <div className="bg-orange-900/30 p-3 rounded-lg">
              <span className="text-orange-400 text-lg">💎</span>
              <div className="text-orange-300">Shield Protection</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
