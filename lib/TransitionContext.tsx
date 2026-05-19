import React, { createContext, useContext, useState, useRef, useCallback } from 'react'
import { View, StyleSheet } from 'react-native'
import { VideoView, useVideoPlayer } from 'expo-video'

type TransitionContextType = {
  triggerTransition: (onNavigate: () => void) => void
}

const TransitionContext = createContext<TransitionContextType>({
  triggerTransition: () => {},
})

const CLOUD_IN = require('@/assets/images/cloudtransition.mp4')

export function TransitionProvider({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(false)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])

  // Single shared player instance — replayed on each transition trigger
  const player = useVideoPlayer(CLOUD_IN, (p) => {
    p.muted = true
    p.loop  = false
  })

  // Cancel any in-flight timers from a previous transition
  const clearTimers = () => {
    timers.current.forEach(clearTimeout)
    timers.current = []
  }

  const triggerTransition = useCallback((onNavigate: () => void) => {
    clearTimers()

    setVisible(true)

    // Double rAF ensures the video view is mounted before we call replay
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        player.replay()
      })
    })

    // Navigate at the midpoint of the animation so the cloud covers the screen switch
    timers.current.push(setTimeout(() => {
      onNavigate()
    }, 2500))

    // Hide the overlay once the cloud has fully cleared
    timers.current.push(setTimeout(() => {
      setVisible(false)
    }, 5000))
  }, [player])

  return (
    <TransitionContext.Provider value={{ triggerTransition }}>
      {children}

      {/* Overlay rendered above everything — box-only blocks touches during the transition */}
      {visible && (
        <View style={StyleSheet.absoluteFill} pointerEvents="box-only">
          <VideoView
            player={player}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            nativeControls={false}
            zIndex={9999}
          />
        </View>
      )}
    </TransitionContext.Provider>
  )
}

// Convenience hook so screens don't need to import TransitionContext directly
export function useCloudTransition() {
  return useContext(TransitionContext)
}