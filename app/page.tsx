"use client"

import { useState } from "react"
import ShadowTagGame from "../components/shadow-tag-game"
import ReverseHazardGame from "../components/reverse-hazard-game"

export default function GamePlatform() {
  const [selectedGame, setSelectedGame] = useState<"home" | "shadow-tag" | "reverse-hazard">("home")

  if (selectedGame === "shadow-tag") {
    return <ShadowTagGame onBack={() => setSelectedGame("home")} />
  }

  if (selectedGame === "reverse-hazard") {
    return <ReverseHazardGame onBack={() => setSelectedGame("home")} />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted to-background">
      <header className="bg-card/80 backdrop-blur-sm border-b border-border sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center text-gray-500 bg-green-200 border-green-200">
              <span className="text-primary-foreground font-bold text-xl">{""}</span>
            </div>
            <h1 className="text-2xl font-bold text-card-foreground">Nathan's Games</h1>
          </div>
          <div className="text-sm text-muted-foreground">Choose your adventure</div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-12">
        <div className="text-center mb-12">
          <h2 className="text-5xl font-bold text-foreground mb-4">Welcome to Nathans Games  </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Discover exciting games that challenge your skills and creativity. From intense action to strategic
            building, find your perfect gaming experience.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Shadow Tag Game Card */}
          <div
            onClick={() => setSelectedGame("shadow-tag")}
            className="group bg-card hover:bg-card/90 rounded-xl border border-border p-8 cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-primary/20"
          >
            <div className="mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-purple-600 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <span className="text-white text-2xl">👤</span>
              </div>
              <h3 className="text-2xl font-bold text-card-foreground mb-2">Shadow Tag</h3>
              <p className="text-muted-foreground leading-relaxed">
                An intense survival game where you must outrun your own shadow. Navigate through obstacles, collect
                powerups, and survive increasingly challenging levels.
              </p>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium">Action</span>
                <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
                  Survival
                </span>
              </div>
              <button className="px-6 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors">
                Play Now
              </button>
            </div>
          </div>

          {/* Reverse Hazard Game Card */}
          <div
            onClick={() => setSelectedGame("reverse-hazard")}
            className="group bg-card hover:bg-card/90 rounded-xl border border-border p-8 cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-accent/20"
          >
            <div className="mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-orange-600 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <span className="text-white text-2xl">⚡</span>
              </div>
              <h3 className="text-2xl font-bold text-card-foreground mb-2">Reverse Hazard</h3>
              <p className="text-muted-foreground leading-relaxed">
                A fast-paced arcade survival game where you dodge enemies and projectiles. Every 5 seconds, time
                reverses for all moving objects except you - survive the chaos!
              </p>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium">Arcade</span>
                <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-medium">
                  Survival
                </span>
              </div>
              <button className="px-6 py-2 bg-accent text-accent-foreground rounded-lg font-medium hover:bg-accent/90 transition-colors">
                Play Now
              </button>
            </div>
          </div>
        </div>

        <div className="mt-16 text-center">
          <h3 className="text-3xl font-bold text-foreground mb-8">Platform Features</h3>
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <div className="bg-card/50 rounded-lg p-6 border border-border">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                <span className="text-primary text-xl">💾</span>
              </div>
              <h4 className="text-lg font-semibold text-card-foreground mb-2">Save Progress</h4>
              <p className="text-muted-foreground text-sm">
                Your game progress is automatically saved and can be resumed anytime.
              </p>
            </div>
            <div className="bg-card/50 rounded-lg p-6 border border-border">
              <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                <span className="text-accent text-xl">🎮</span>
              </div>
              <h4 className="text-lg font-semibold text-card-foreground mb-2">Multiple Games</h4>
              <p className="text-muted-foreground text-sm">
                Switch between different game genres and experiences seamlessly.
              </p>
            </div>
            <div className="bg-card/50 rounded-lg p-6 border border-border">
              <div className="w-12 h-12 bg-secondary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                <span className="text-secondary text-xl">⚡</span>
              </div>
              <h4 className="text-lg font-semibold text-card-foreground mb-2">Instant Play</h4>
              <p className="text-muted-foreground text-sm">
                No downloads required. Start playing immediately in your browser.
              </p>
            </div>
          </div>
        </div>
      </main>

      <footer className="bg-muted/30 border-t border-border mt-16">
        <div className="max-w-6xl mx-auto px-6 py-8 text-center">
