"use client"

import { useState, useEffect, useCallback } from "react"

interface Player {
  x: number
  y: number
  width: number
  height: number
  velocityX: number
  velocityY: number
  shape: "rock" | "wind" | "water"
  onGround: boolean
  canDoubleJump: boolean
}

interface Platform {
  x: number
  y: number
  width: number
  height: number
  type?: "normal" | "slope"
  slopeDirection?: "left" | "right"
}

interface PressurePlate {
  x: number
  y: number
  width: number
  height: number
  activated: boolean
}

interface Gate {
  x: number
  y: number
  width: number
  height: number
  open: boolean
}

interface WindVent {
  x: number
  y: number
  width: number
  height: number
}

interface FireHazard {
  x: number
  y: number
  width: number
  height: number
  extinguished: boolean
}

interface Pipe {
  x: number
  y: number
  width: number
  height: number
  id: string
  connectedTo: string
}

interface Goal {
  x: number
  y: number
  width: number
  height: number
}

interface LavaFloor {
  x: number
  y: number
  width: number
  height: number
}

export default function ShapeShiftGame({ onBack }: { onBack: () => void }) {
  const [gameState, setGameState] = useState<"playing" | "won" | "lost">("playing")
  const [player, setPlayer] = useState<Player>({
    x: 50,
    y: 400,
    width: 35,
    height: 35,
    velocityX: 0,
    velocityY: 0,
    shape: "rock",
    onGround: false,
    canDoubleJump: false,
  })

  const [keys, setKeys] = useState<Set<string>>(new Set())

  const [platforms] = useState<Platform[]>([
    // Starting area
    { x: 0, y: 500, width: 200, height: 20, type: "normal" },

    // Multiple path options from start
    { x: 250, y: 450, width: 100, height: 20, type: "normal" }, // Lower path
    { x: 280, y: 380, width: 60, height: 20, type: "normal" }, // Upper path option

    // Slope section with alternatives
    { x: 400, y: 400, width: 120, height: 20, type: "slope", slopeDirection: "right" },
    { x: 420, y: 320, width: 80, height: 20, type: "normal" }, // Alternative high route

    // Multi-level section
    { x: 600, y: 350, width: 100, height: 20, type: "normal" }, // Lower route
    { x: 620, y: 280, width: 80, height: 20, type: "normal" }, // Mid route
    { x: 640, y: 210, width: 60, height: 20, type: "normal" }, // High route

    // Bridge section with gap
    { x: 800, y: 300, width: 60, height: 20, type: "normal" },
    { x: 920, y: 300, width: 60, height: 20, type: "normal" }, // Gap between 860-920

    // Alternative underground route
    { x: 780, y: 450, width: 240, height: 20, type: "normal" },

    // Convergence area
    { x: 1100, y: 250, width: 150, height: 20, type: "normal" },

    // Final challenge area with multiple approaches
    { x: 1300, y: 200, width: 100, height: 20, type: "normal" },
    { x: 1450, y: 150, width: 120, height: 20, type: "slope", slopeDirection: "left" },
    { x: 1320, y: 120, width: 80, height: 20, type: "normal" }, // High route to goal
    { x: 1600, y: 100, width: 100, height: 20, type: "normal" },
  ])

  const [pressurePlates, setPressurePlates] = useState<PressurePlate[]>([
    { x: 275, y: 430, width: 50, height: 20, activated: false }, // Original plate
    { x: 825, y: 280, width: 50, height: 20, activated: false }, // Bridge plate
    { x: 1125, y: 230, width: 50, height: 20, activated: false }, // Final area plate
  ])

  const [gates, setGates] = useState<Gate[]>([
    { x: 750, y: 200, width: 20, height: 100, open: false }, // Original gate
    { x: 1080, y: 150, width: 20, height: 100, open: false }, // Second gate
    { x: 1280, y: 100, width: 20, height: 100, open: false }, // Final gate
  ])

  const [windVents] = useState<WindVent[]>([
    { x: 625, y: 350, width: 50, height: 20 },
    { x: 645, y: 210, width: 50, height: 20 }, // High route vent
    { x: 1000, y: 250, width: 50, height: 20 },
    { x: 1350, y: 200, width: 50, height: 20 }, // Final area vent
  ])

  const [fireHazards, setFireHazards] = useState<FireHazard[]>([
    { x: 500, y: 480, width: 60, height: 20, extinguished: false }, // Blocks lower route
    { x: 860, y: 280, width: 60, height: 20, extinguished: false }, // Blocks bridge gap
    { x: 1200, y: 230, width: 60, height: 20, extinguished: false }, // Blocks direct route
    { x: 1400, y: 130, width: 60, height: 20, extinguished: false }, // Final challenge
  ])

  const [pipes] = useState<Pipe[]>([
    { x: 350, y: 380, width: 30, height: 30, id: "pipe1", connectedTo: "pipe2" },
    { x: 800, y: 430, width: 30, height: 30, id: "pipe2", connectedTo: "pipe3" }, // Underground route
    { x: 1000, y: 430, width: 30, height: 30, id: "pipe3", connectedTo: "pipe4" },
    { x: 1250, y: 180, width: 30, height: 30, id: "pipe4", connectedTo: "pipe1" }, // Near goal
  ])

  const goal: Goal = { x: 1650, y: 70, width: 40, height: 30 }

  const [lavaFloors] = useState<LavaFloor[]>([
    { x: 200, y: 470, width: 50, height: 30 }, // Early lava section
    { x: 520, y: 420, width: 80, height: 30 }, // Mid-game lava
    { x: 720, y: 320, width: 60, height: 30 }, // Bridge area lava
    { x: 1020, y: 270, width: 70, height: 30 }, // Late game lava
    { x: 1420, y: 170, width: 50, height: 30 }, // Final challenge lava
  ])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      setKeys((prev) => new Set(prev).add(e.key.toLowerCase()))

      if (e.key === "1") {
        switchToShape("rock")
      } else if (e.key === "2") {
        switchToShape("wind")
      } else if (e.key === "3") {
        switchToShape("water")
      } else if (e.key === "q") {
        setPlayer((prev) => {
          const shapes: ("rock" | "wind" | "water")[] = ["rock", "wind", "water"]
          const currentIndex = shapes.indexOf(prev.shape)
          const newShape = shapes[(currentIndex - 1 + shapes.length) % shapes.length]
          if (checkShapeSwitch(newShape, prev)) {
            const sizes = { rock: 35, wind: 25, water: 28 }
            return {
              ...prev,
              shape: newShape,
              width: sizes[newShape],
              height: sizes[newShape],
              y: prev.y - (sizes[newShape] - prev.height),
              canDoubleJump: newShape === "wind",
            }
          }
          return prev
        })
      } else if (e.key === "e") {
        setPlayer((prev) => {
          const shapes: ("rock" | "wind" | "water")[] = ["rock", "wind", "water"]
          const currentIndex = shapes.indexOf(prev.shape)
          const newShape = shapes[(currentIndex + 1) % shapes.length]
          if (checkShapeSwitch(newShape, prev)) {
            const sizes = { rock: 35, wind: 25, water: 28 }
            return {
              ...prev,
              shape: newShape,
              width: sizes[newShape],
              height: sizes[newShape],
              y: prev.y - (sizes[newShape] - prev.height), // Adjust y to keep bottom aligned
              canDoubleJump: newShape === "wind",
            }
          }
          return prev
        })
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

  const checkCollision = useCallback((rect1: any, rect2: any) => {
    return (
      rect1.x < rect2.x + rect2.width &&
      rect1.x + rect1.width > rect2.x &&
      rect1.y < rect2.y + rect2.height &&
      rect1.y + rect1.height > rect2.y
    )
  }, [])

  const checkShapeSwitch = useCallback(
    (newShape: "rock" | "wind" | "water", currentPlayer: Player) => {
      const sizes = { rock: 35, wind: 25, water: 28 }
      const newSize = sizes[newShape]

      // Create a test player with new dimensions
      const testPlayer = {
        ...currentPlayer,
        width: newSize,
        height: newSize,
        y: currentPlayer.y - (newSize - currentPlayer.height), // Adjust y to keep bottom aligned
      }

      // Check if new shape would collide with any platform
      for (const platform of platforms) {
        if (checkCollision(testPlayer, platform)) {
          return false // Shape switch not safe
        }
      }

      // Check if new shape would collide with gate
      if (!gates.some((gate) => gate.open) && gates.some((gate) => checkCollision(testPlayer, gate))) {
        return false
      }

      return true // Shape switch is safe
    },
    [platforms, gates, checkCollision],
  )

  const switchToShape = useCallback(
    (newShape: "rock" | "wind" | "water") => {
      setPlayer((prev) => {
        if (checkShapeSwitch(newShape, prev)) {
          const sizes = { rock: 35, wind: 25, water: 28 }
          return {
            ...prev,
            shape: newShape,
            width: sizes[newShape],
            height: sizes[newShape],
            y: prev.y - (sizes[newShape] - prev.height), // Adjust y to keep bottom aligned
            canDoubleJump: newShape === "wind",
          }
        }
        return prev // Don't change shape if it would cause collision
      })
    },
    [checkShapeSwitch],
  )

  useEffect(() => {
    const gameLoop = () => {
      if (gameState !== "playing") return

      setPlayer((prev) => {
        const newPlayer = { ...prev }

        // Form-specific movement properties
        const getMovementProps = (shape: string) => {
          switch (shape) {
            case "rock":
              return { speed: 2, jumpPower: -8, gravity: 0.6 }
            case "wind":
              return { speed: 3, jumpPower: -12, gravity: 0.3 }
            case "water":
              return { speed: 5, jumpPower: -9, gravity: 0.5 }
            default:
              return { speed: 3, jumpPower: -10, gravity: 0.5 }
          }
        }

        const { speed, jumpPower, gravity } = getMovementProps(newPlayer.shape)

        // Horizontal movement
        if (keys.has("a") || keys.has("arrowleft")) {
          newPlayer.velocityX = -speed
        } else if (keys.has("d") || keys.has("arrowright")) {
          newPlayer.velocityX = speed
        } else {
          newPlayer.velocityX *= 0.8
        }

        // Jumping
        if ((keys.has(" ") || keys.has("w") || keys.has("arrowup")) && newPlayer.onGround) {
          newPlayer.velocityY = jumpPower
          newPlayer.onGround = false
          if (newPlayer.shape === "wind") {
            newPlayer.canDoubleJump = true
          }
        }

        // Double jump for wind form
        if (
          (keys.has(" ") || keys.has("w") || keys.has("arrowup")) &&
          newPlayer.shape === "wind" &&
          newPlayer.canDoubleJump &&
          !newPlayer.onGround
        ) {
          newPlayer.velocityY = jumpPower * 0.8
          newPlayer.canDoubleJump = false
        }

        // Gravity
        newPlayer.velocityY += gravity

        // Update position
        newPlayer.x += newPlayer.velocityX
        newPlayer.y += newPlayer.velocityY

        // Platform collisions
        newPlayer.onGround = false
        platforms.forEach((platform) => {
          if (checkCollision(newPlayer, platform)) {
            if (prev.y + prev.height <= platform.y && newPlayer.velocityY > 0) {
              newPlayer.y = platform.y - newPlayer.height
              newPlayer.velocityY = 0
              newPlayer.onGround = true

              // Water form slides on slopes
              if (platform.type === "slope" && newPlayer.shape === "water") {
                const slideSpeed = platform.slopeDirection === "right" ? 3 : -3
                newPlayer.velocityX += slideSpeed
              }
            }
          }
        })

        // Wind vent interactions (Wind form only)
        if (newPlayer.shape === "wind") {
          windVents.forEach((vent) => {
            if (checkCollision(newPlayer, vent)) {
              newPlayer.velocityY = -15 // Strong upward boost
            }
          })
        }

        // Fire hazard interactions
        fireHazards.forEach((fire, index) => {
          if (!fire.extinguished && checkCollision(newPlayer, fire)) {
            if (newPlayer.shape === "water") {
              // Water form extinguishes fire
              setFireHazards((prev) => prev.map((f, i) => (i === index ? { ...f, extinguished: true } : f)))
            } else {
              // Other forms are hurt by fire
              setGameState("lost")
            }
          }
        })

        // Pipe teleportation (Water form only)
        if (newPlayer.shape === "water") {
          pipes.forEach((pipe) => {
            if (checkCollision(newPlayer, pipe)) {
              const connectedPipe = pipes.find((p) => p.id === pipe.connectedTo)
              if (connectedPipe) {
                newPlayer.x = connectedPipe.x
                newPlayer.y = connectedPipe.y - newPlayer.height
              }
            }
          })
        }

        if (newPlayer.shape === "rock") {
          pressurePlates.forEach((plate, index) => {
            if (checkCollision(newPlayer, plate)) {
              setPressurePlates((prev) => prev.map((p, i) => (i === index ? { ...p, activated: true } : p)))
              // Open corresponding gates
              if (index === 0) setGates((prev) => prev.map((g, i) => (i === 0 ? { ...g, open: true } : g)))
              if (index === 1) setGates((prev) => prev.map((g, i) => (i === 1 ? { ...g, open: true } : g)))
              if (index === 2) setGates((prev) => prev.map((g, i) => (i === 2 ? { ...g, open: true } : g)))
            }
          })
        }

        gates.forEach((gate) => {
          if (!gate.open && checkCollision(newPlayer, gate)) {
            newPlayer.x = prev.x
            newPlayer.velocityX = 0
          }
        })

        // Original narrow gap (Wind only)
        if (newPlayer.x > 860 && newPlayer.x < 920 && newPlayer.y > 200 && newPlayer.y < 400) {
          if (newPlayer.shape !== "wind") {
            newPlayer.x = prev.x
            newPlayer.velocityX = 0
          }
        }

        // High route gap (Wind or Water can pass)
        if (newPlayer.x > 700 && newPlayer.x < 720 && newPlayer.y > 150 && newPlayer.y < 250) {
          if (newPlayer.shape === "rock") {
            newPlayer.x = prev.x
            newPlayer.velocityX = 0
          }
        }

        lavaFloors.forEach((lava) => {
          if (checkCollision(newPlayer, lava)) {
            if (newPlayer.shape !== "water") {
              setGameState("lost")
              return
            }

            // Vertical collision (landing on top)
            if (prev.y + prev.height <= lava.y && newPlayer.velocityY > 0) {
              newPlayer.y = lava.y - newPlayer.height
              newPlayer.velocityY = 0
              newPlayer.onGround = true
            }
            // Horizontal collision from left
            else if (prev.x + prev.width <= lava.x && newPlayer.velocityX > 0) {
              newPlayer.x = lava.x - newPlayer.width
              newPlayer.velocityX = 0
            }
            // Horizontal collision from right
            else if (prev.x >= lava.x + lava.width && newPlayer.velocityX < 0) {
              newPlayer.x = lava.x + lava.width
              newPlayer.velocityX = 0
            }
            // Vertical collision from below (hitting bottom of lava)
            else if (prev.y >= lava.y + lava.height && newPlayer.velocityY < 0) {
              newPlayer.y = lava.y + lava.height
              newPlayer.velocityY = 0
            }
          }
        })

        // Goal check
        if (checkCollision(newPlayer, goal)) {
          setGameState("won")
        }

        // Fall off screen
        if (newPlayer.y > 600) {
          setGameState("lost")
        }

        return newPlayer
      })
    }

    const interval = setInterval(gameLoop, 16)
    return () => clearInterval(interval)
  }, [keys, gameState, checkCollision, platforms, windVents, fireHazards, pipes, pressurePlates, gates, switchToShape])

  const renderShape = (x: number, y: number, shape: string, size: number) => {
    if (shape === "rock") {
      return (
        <g>
          <rect x={x} y={y} width={size} height={size} fill="#6b7280" stroke="#374151" strokeWidth="2" />
          <line x1={x + 5} y1={y + 10} x2={x + size - 5} y2={y + 15} stroke="#374151" strokeWidth="1" />
          <line x1={x + 8} y1={y + 20} x2={x + size - 8} y2={y + 25} stroke="#374151" strokeWidth="1" />
        </g>
      )
    } else if (shape === "wind") {
      const points = `${x + size / 2},${y} ${x},${y + size} ${x + size},${y + size}`
      return (
        <g>
          <polygon points={points} fill="#10b981" stroke="#059669" strokeWidth="2" />
          {/* Motion lines outside the triangle instead of through it */}
          <line
            x1={x - 8}
            y1={y + size / 3}
            x2={x - 3}
            y2={y + size / 3}
            stroke="#10b981"
            strokeWidth="2"
            opacity="0.7"
          />
          <line
            x1={x + size + 3}
            y1={y + size / 3}
            x2={x + size + 8}
            y2={y + size / 3}
            stroke="#10b981"
            strokeWidth="2"
            opacity="0.7"
          />
          <line
            x1={x - 6}
            y1={y + (size * 2) / 3}
            x2={x - 1}
            y2={y + (size * 2) / 3}
            stroke="#10b981"
            strokeWidth="1"
            opacity="0.5"
          />
          <line
            x1={x + size + 1}
            y1={y + (size * 2) / 3}
            x2={x + size + 6}
            y2={y + (size * 2) / 3}
            stroke="#10b981"
            strokeWidth="1"
            opacity="0.5"
          />
        </g>
      )
    } else if (shape === "water") {
      return (
        <g>
          <circle cx={x + size / 2} cy={y + size / 2} r={size / 2} fill="#3b82f6" stroke="#1d4ed8" strokeWidth="2" />
          <circle
            cx={x + size / 2}
            cy={y + size / 2}
            r={size / 3}
            fill="none"
            stroke="#60a5fa"
            strokeWidth="1"
            opacity="0.6"
          />
          <circle
            cx={x + size / 2}
            cy={y + size / 2}
            r={size / 5}
            fill="none"
            stroke="#93c5fd"
            strokeWidth="1"
            opacity="0.4"
          />
        </g>
      )
    }
  }

  const resetGame = () => {
    setPlayer({
      x: 50,
      y: 400,
      width: 35,
      height: 35,
      velocityX: 0,
      velocityY: 0,
      shape: "rock",
      onGround: false,
      canDoubleJump: false,
    })
    setPressurePlates((prev) => prev.map((p) => ({ ...p, activated: false })))
    setGates((prev) => prev.map((g) => ({ ...g, open: false })))
    setFireHazards((prev) => prev.map((f) => ({ ...f, extinguished: false })))
    setGameState("playing")
  }

  if (gameState === "won") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-100 to-green-200 flex items-center justify-center">
        <div className="bg-white rounded-xl p-8 shadow-xl text-center max-w-md">
          <h2 className="text-3xl font-bold text-green-600 mb-4">Victory!</h2>
          <p className="text-gray-600 mb-4">You mastered all three forms and reached the goal!</p>
          <div className="flex gap-4 justify-center">
            <button
              onClick={resetGame}
              className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
            >
              Play Again
            </button>
            <button
              onClick={onBack}
              className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              Back to Menu
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (gameState === "lost") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-100 to-red-200 flex items-center justify-center">
        <div className="bg-white rounded-xl p-8 shadow-xl text-center max-w-md">
          <h2 className="text-3xl font-bold text-red-600 mb-4">Game Over</h2>
          <p className="text-gray-600 mb-4">Use each form's unique abilities to overcome obstacles!</p>
          <div className="flex gap-4 justify-center">
            <button
              onClick={resetGame}
              className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
            >
              Try Again
            </button>
            <button
              onClick={onBack}
              className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              Back to Menu
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-100 to-sky-200">
      {/* Header */}
      <div className="bg-white/90 backdrop-blur p-4 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
          >
            Back to Menu
          </button>
          <h1 className="text-2xl font-bold">Shape Shift</h1>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-sm">
            Current Form:{" "}
            <span className="font-bold text-lg">
              {player.shape === "rock" && "🗿 Rock"}
              {player.shape === "wind" && "🌪️ Wind"}
              {player.shape === "water" && "💧 Water"}
            </span>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-white/80 backdrop-blur p-3 text-sm text-gray-700 border-b">
        <strong>Controls:</strong> WASD/Arrows to move, Space to jump, 1/2/3 or Q/E to change form |
        <strong> Rock:</strong> Heavy, activates pressure plates | <strong>Wind:</strong> Light, double jump, uses wind
        vents, fits through gaps |<strong> Water:</strong> Fast, slides on slopes, uses pipes, extinguishes fire,
        crosses lava
      </div>

      {/* Game Canvas */}
      <div className="relative overflow-hidden" style={{ height: "calc(100vh - 140px)" }}>
        <svg
          width="1800"
          height="600"
          viewBox="0 0 1800 600"
          className="border border-gray-300"
          style={{ transform: `translateX(${Math.max(-player.x + 400, -1200)}px)` }}
        >
          {/* Platforms */}
          {platforms.map((platform, index) => (
            <rect
              key={index}
              x={platform.x}
              y={platform.y}
              width={platform.width}
              height={platform.height}
              fill={platform.type === "slope" ? "#8b5cf6" : "#6b7280"}
            />
          ))}

          {pressurePlates.map((plate, index) => (
            <rect
              key={index}
              x={plate.x}
              y={plate.y}
              width={plate.width}
              height={plate.height}
              fill={plate.activated ? "#10b981" : "#f59e0b"}
            />
          ))}

          {gates.map(
            (gate, index) =>
              !gate.open && (
                <rect key={index} x={gate.x} y={gate.y} width={gate.width} height={gate.height} fill="#dc2626" />
              ),
          )}

          {/* Wind Vents */}
          {windVents.map((vent, index) => (
            <g key={index}>
              <rect x={vent.x} y={vent.y} width={vent.width} height={vent.height} fill="#10b981" />
              <text x={vent.x + 25} y={vent.y + 15} textAnchor="middle" fontSize="12" fill="white">
                💨
              </text>
            </g>
          ))}

          {/* Fire Hazards */}
          {fireHazards.map((fire, index) => (
            <rect
              key={index}
              x={fire.x}
              y={fire.y}
              width={fire.width}
              height={fire.height}
              fill={fire.extinguished ? "#6b7280" : "#dc2626"}
            />
          ))}

          {/* Pipes */}
          {pipes.map((pipe, index) => (
            <g key={index}>
              <rect
                x={pipe.x}
                y={pipe.y}
                width={pipe.width}
                height={pipe.height}
                fill="none"
                stroke="#3b82f6"
                strokeWidth="3"
              />
              <circle cx={pipe.x + 15} cy={pipe.y + 15} r="8" fill="#3b82f6" opacity="0.3" />
            </g>
          ))}

          <rect x={860} y={200} width={5} height={200} fill="#374151" />
          <rect x={915} y={200} width={5} height={200} fill="#374151" />
          <text x={887} y={190} textAnchor="middle" fontSize="10" fill="#374151">
            Wind Only
          </text>

          <rect x={700} y={150} width={5} height={100} fill="#6b7280" />
          <rect x={715} y={150} width={5} height={100} fill="#6b7280" />
          <text x={707} y={140} textAnchor="middle" fontSize="10" fill="#6b7280">
            No Rock
          </text>

          {/* Lava Floors */}
          {lavaFloors.map((lava, index) => (
            <g key={index}>
              <rect x={lava.x} y={lava.y} width={lava.width} height={lava.height} fill="#ff4500" />
              <rect x={lava.x} y={lava.y} width={lava.width} height={lava.height / 3} fill="#ff6b35" opacity="0.8" />
              <rect
                x={lava.x}
                y={lava.y + (lava.height * 2) / 3}
                width={lava.width}
                height={lava.height / 3}
                fill="#cc3300"
              />
              {/* Lava bubbles effect */}
              <circle cx={lava.x + 10} cy={lava.y + 10} r="3" fill="#ffaa00" opacity="0.6" />
              <circle cx={lava.x + lava.width - 15} cy={lava.y + 15} r="2" fill="#ffaa00" opacity="0.8" />
              <circle cx={lava.x + lava.width / 2} cy={lava.y + 20} r="2.5" fill="#ffaa00" opacity="0.7" />
            </g>
          ))}

          {/* Goal */}
          <rect x={goal.x} y={goal.y} width={goal.width} height={goal.height} fill="#fbbf24" />

          {/* Player */}
          {renderShape(player.x, player.y, player.shape, Math.max(player.width, player.height))}
        </svg>
      </div>
    </div>
  )
}
