import React, { useEffect } from 'react'
import { View, TouchableOpacity, StyleSheet } from 'react-native'
import { VideoView, useVideoPlayer } from 'expo-video'
import { Image as ExpoImage } from 'expo-image'
import { StatusBar } from 'expo-status-bar'
import * as NavigationBar from 'expo-navigation-bar'
import { useRouter } from 'expo-router'
import { playSoundInstant, startMusic, stopMusic } from '@/lib/audioManager'
import { ScaledSheet } from 'react-native-size-matters'
import { useCloudTransition } from '@/lib/TransitionContext'


// Shared UI assets used across this screen
const IMAGES = {
  exit:       require('@/assets/images/exit.png'),
  buttonPlay: require('@/assets/images/button_play.png'),
}

// Prefetch so images are ready before the user taps anything
Object.values(IMAGES).forEach((src) => {
  ExpoImage.prefetch(src, 'memory-disk').catch(() => {})
})

export default function ScoutChallengesScreen() {
  const router = useRouter()
  const { triggerTransition } = useCloudTransition()

  // Looping muted background video
  const bgPlayer = useVideoPlayer(
    require('@/assets/images/home/Sprout_challenges.mp4'),
    (p) => { p.loop = true; p.muted = true; p.play() }
  )

  // Hide the Android nav bar for a clean full-screen look
  useEffect(() => {
    try { NavigationBar.setVisibilityAsync('hidden') } catch (e) {}
  }, [])

  // Start menu music when this screen mounts (no cleanup — handlePlay/handleExit stop it manually)
  useEffect(() => {
    startMusic('menuMusic')
  }, [])

  // Stop music, play tap sound, then navigate to the chosen challenge mid-transition
  const handlePlay = (route: string) => {
    playSoundInstant('buttonPop')
    stopMusic('menuMusic')
    triggerTransition(() => router.push(route as any))
  }

  // Stop music and go back to the previous screen
  const handleExit = () => {
    playSoundInstant('buttonPop')
    stopMusic('menuMusic')
    triggerTransition(() => router.back())
  }

  return (
    <>
      <StatusBar hidden />
      <View style={styles.container}>

        {/* Full-screen background video */}
        <VideoView
          player={bgPlayer}
          style={StyleSheet.absoluteFillObject}
          contentFit="cover"
          nativeControls={false}
        />

        {/* Exit button — top-right corner */}
        <TouchableOpacity
          onPress={handleExit}
          activeOpacity={0.75}
          style={styles.exitBtn}
        >
          <ExpoImage
            source={IMAGES.exit}
            style={styles.exitImg}
            contentFit="contain"
            cachePolicy="memory-disk"
          />
        </TouchableOpacity>

        {/* Math challenge play button */}
        <TouchableOpacity
          onPress={() => handlePlay('./puzzle')}
          activeOpacity={0.75}
          style={[styles.playBtnBase, styles.mathBtn]}
        >
          <ExpoImage
            source={IMAGES.buttonPlay}
            style={styles.playBtn}
            contentFit="contain"
            cachePolicy="memory-disk"
          />
        </TouchableOpacity>

        {/* English challenge play button */}
        <TouchableOpacity
          onPress={() => handlePlay('/english-challenge')}
          activeOpacity={0.75}
          style={[styles.playBtnBase, styles.englishBtn]}
        >
          <ExpoImage
            source={IMAGES.buttonPlay}
            style={styles.playBtn}
            contentFit="contain"
            cachePolicy="memory-disk"
          />
        </TouchableOpacity>

        {/* Science challenge play button */}
        <TouchableOpacity
          onPress={() => handlePlay('/science-challenge')}
          activeOpacity={0.75}
          style={[styles.playBtnBase, styles.scienceBtn]}
        >
          <ExpoImage
            source={IMAGES.buttonPlay}
            style={styles.playBtn}
            contentFit="contain"
            cachePolicy="memory-disk"
          />
        </TouchableOpacity>

      </View>
    </>
  )
}

const styles = ScaledSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  exitBtn: {
    position: 'absolute',
    top: '16@vs',
    right: '16@s',
    zIndex: 10,
    elevation: 10,
  },
  exitImg: {
    width: '48@s',
    height: '48@vs',
  },
  playBtnBase: {
    position: 'absolute',
    zIndex: 10,
    elevation: 10,
  },
  // Three play buttons pinned along the bottom, spaced across the three challenge cards
  mathBtn: {
    bottom: '11@vs',
    left: '107@s',
  },
  englishBtn: {
    bottom: '11@vs',
    left: '308@s',
  },
  scienceBtn: {
    bottom: '11@vs',
    left: '505@s',
  },
  playBtn: {
    width: '100@s',
    height: '50@vs',
  },
})