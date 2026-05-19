import { View, StyleSheet } from 'react-native'
import React, { useEffect, useRef, useState } from 'react'
import { VideoView, useVideoPlayer } from 'expo-video'
import { StatusBar } from 'expo-status-bar'
import * as NavigationBar from 'expo-navigation-bar'
import { useRouter } from 'expo-router'
import { playSound } from '@/lib/audioManager'
import Animated, {
  useSharedValue, useAnimatedStyle, withSequence, withTiming,
} from 'react-native-reanimated'

export default function Reward1Claim() {
  const router = useRouter()
  const [showFlash, setShowFlash] = useState(false)
  // guards against navigating twice if both the listener and fallback fire
  const hasNavigated = useRef(false)

  const screenOpacity = useSharedValue(0)
  const screenStyle = useAnimatedStyle(() => ({ opacity: screenOpacity.value }))
  const flashOpacity = useSharedValue(0)
  const flashStyle = useAnimatedStyle(() => ({ opacity: flashOpacity.value }))

  // plays once, not looped
  const claimPlayer = useVideoPlayer(require('@/assets/images/openchest.mp4'), (p) => {
    p.loop = false; p.muted = false
  })

  // full-screen immersion
  useEffect(() => {
    try {
      NavigationBar.setVisibilityAsync('hidden')
      NavigationBar.setBehaviorAsync('overlay-swipe')
    } catch (e) {}
  }, [])

  useEffect(() => {
    // fade in from black, matching the puzzle screen's fade out
    screenOpacity.value = withTiming(1, { duration: 300 })
    playSound('chestSound')
    claimPlayer.play()

    const goToBoard = () => {
      if (hasNavigated.current) return
      hasNavigated.current = true
      setShowFlash(true)
      // fade to black and navigate; no fade back out
      flashOpacity.value = withTiming(1, { duration: 400 })
      setTimeout(() => router.replace('/rewards/reward1board'), 400)
    }

    // fallback in case the status listener doesn't fire
    const fallback = setTimeout(goToBoard, 8000)
    const sub = claimPlayer.addListener('statusChange', (status) => {
      if (status.status === 'idle') { clearTimeout(fallback); goToBoard() }
    })

    return () => { sub.remove(); clearTimeout(fallback) }
  }, [])

  return (
    <>
      <StatusBar hidden />
      {/* black background prevents white flash between screens */}
      <View style={{ flex: 1, backgroundColor: 'black' }}>
        <Animated.View style={[StyleSheet.absoluteFillObject, screenStyle]}>
          <VideoView
            player={claimPlayer}
            style={StyleSheet.absoluteFillObject}
            contentFit="cover"
            nativeControls={false}
          />
        </Animated.View>

        {/* black overlay for the exit transition */}
        {showFlash && (
          <Animated.View style={[
            StyleSheet.absoluteFillObject,
            { backgroundColor: 'black', zIndex: 99999, elevation: 99999 },
            flashStyle
          ]} />
        )}
      </View>
    </>
  )
}