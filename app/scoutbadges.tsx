import React, { useEffect } from 'react'
import { View, TouchableOpacity, StyleSheet } from 'react-native'
import { VideoView, useVideoPlayer } from 'expo-video'
import { Image as ExpoImage } from 'expo-image'
import { StatusBar } from 'expo-status-bar'
import * as NavigationBar from 'expo-navigation-bar'
import { useRouter } from 'expo-router'
import { playSoundInstant } from '@/lib/audioManager'
import { ScaledSheet } from 'react-native-size-matters'
import { useCloudTransition } from '@/lib/TransitionContext'

export default function ScoutBadgesScreen() {
  const router = useRouter()
  const { triggerTransition } = useCloudTransition()

  // Looping muted background video
  const bgPlayer = useVideoPlayer(
    require('@/assets/images/scoutbadges.mp4'),
    (p) => { p.loop = true; p.muted = true; p.play() }
  )

  // Hide the Android nav bar for a clean full-screen look
  useEffect(() => {
    try { NavigationBar.setVisibilityAsync('hidden') } catch (e) {}
  }, [])

  // Play sound then navigate back mid-transition
  const handleExit = () => {
    playSoundInstant('buttonPop')
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

        {/* Exit button pinned to the top-right corner */}
        <TouchableOpacity
          onPress={handleExit}
          activeOpacity={0.75}
          style={styles.exitBtn}
        >
          <ExpoImage
            source={require('@/assets/images/exit.png')}
            style={styles.exitImg}
            contentFit="contain"
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
})