import { View, TouchableOpacity, StyleSheet } from 'react-native'
import React, { useEffect, useState } from 'react'
import { VideoView, useVideoPlayer } from 'expo-video'
import { Image as ExpoImage } from 'expo-image'
import { StatusBar } from 'expo-status-bar'
import * as NavigationBar from 'expo-navigation-bar'
import { useRouter } from 'expo-router'
import { styles } from "../styles/auth.styles"
import { playSoundInstant, startMusic, stopMusic } from '@/lib/audioManager'

// prevents double-navigation if the listener and timer both fire
let hasTransitioned = false

export default function Home() {
  const router = useRouter()
  const [stage, setStage] = useState<'intro' | 'loading' | 'home'>('intro')

  const introPlayer = useVideoPlayer(require('@/assets/images/home/Intro.mp4'), (p) => {
    p.loop = false
    p.muted = false
  })

  const loadingPlayer = useVideoPlayer(require('@/assets/images/home/loading.mp4'), (p) => {
    p.loop = false
    p.muted = false
  })

  // looping muted 
  const bgPlayer = useVideoPlayer(require('@/assets/images/home/Frontbg1.mp4'), (p) => {
    p.loop = true
    p.muted = true
  })

  useEffect(() => {
    hasTransitioned = false
    try { NavigationBar.setVisibilityAsync('hidden') } catch (e) {}
  }, [])

  // slight delay before playing intro to avoid a black flash on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      introPlayer.play()
    }, 100)
    return () => clearTimeout(timer)
  }, [])

  // advance from intro to loading when the video ends, with a fallback timer
  useEffect(() => {
    if (stage !== 'intro') return

    let fired = false
    const go = () => {
      if (fired) return
      fired = true
      setStage('loading')
      loadingPlayer.play()
    }

    const sub = introPlayer.addListener('playToEnd', go)
    const timer = setTimeout(go, 7000)
    return () => { sub.remove(); clearTimeout(timer) }
  }, [stage])

  // advance from loading to home when the video ends, with a fallback timer
  useEffect(() => {
    if (stage !== 'loading') return

    let fired = false
    const go = () => {
      if (fired) return
      fired = true
      hasTransitioned = true
      setStage('home')
      bgPlayer.play()
    }

    startMusic('loadingMusic')

    const sub = loadingPlayer.addListener('playToEnd', go)
    const timer = setTimeout(go, 7500)

    return () => { sub.remove(); clearTimeout(timer) }
  }, [stage])

  const handleStart = () => {
    stopMusic('loadingMusic')
    playSoundInstant('buttonPop')
    router.push('./menu')
  }

  if (stage === 'intro') {
    return (
      <>
        <StatusBar hidden />
        <View style={{ flex: 1, backgroundColor: 'black' }}>
          <VideoView
            player={introPlayer}
            style={StyleSheet.absoluteFillObject}
            contentFit="cover"
            nativeControls={false}
          />
        </View>
      </>
    )
  }

  if (stage === 'loading') {
    return (
      <>
        <StatusBar hidden />
        <View style={{ flex: 1, backgroundColor: 'black' }}>
          <VideoView
            player={loadingPlayer}
            style={StyleSheet.absoluteFillObject}
            contentFit="cover"
            nativeControls={false}
          />
        </View>
      </>
    )
  }

  // home screen — tap anywhere to start
  return (
    <>
      <StatusBar hidden />
      <TouchableOpacity
        style={{ flex: 1 }}
        onPress={handleStart}
        activeOpacity={1}
      >
        <VideoView
          player={bgPlayer}
          style={StyleSheet.absoluteFillObject}
          contentFit="cover"
          nativeControls={false}
        />
        <View style={styles.homeButtonContainer}>
          <ExpoImage
            source={require('@/assets/images/clickstart.png')}
            style={styles.homeButtonImage}
            contentFit="contain"
          />
        </View>
      </TouchableOpacity>
    </>
  )
}
