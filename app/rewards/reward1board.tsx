import { View, TouchableOpacity, StyleSheet } from 'react-native'
import React, { useEffect } from 'react'
import { VideoView, useVideoPlayer } from 'expo-video'
import { Image as ExpoImage } from 'expo-image'
import { StatusBar } from 'expo-status-bar'
import * as NavigationBar from 'expo-navigation-bar'
import { styles } from '@/styles/auth.styles'
import { useRouter } from 'expo-router'
import { playSound, startMusic, stopMusic, playSoundInstant } from '@/lib/audioManager'


export default function Reward1Board() {
  const router = useRouter()

  // looping background video with audio
  const rewardVideoPlayer = useVideoPlayer(require('@/assets/images/rewardvid.mp4'), (p) => {
    p.loop = true; p.muted = false; p.play()
  })

  // full-screen immersion
  useEffect(() => {
    try {
      NavigationBar.setVisibilityAsync('hidden')
      NavigationBar.setBehaviorAsync('overlay-swipe')
    } catch (e) {}
  }, [])

  // start music, then play a greeting sound after a short delay
  useEffect(() => {
    startMusic('rewardsMusic')
    const t = setTimeout(() => playSound('greetJob'), 2000)
    return () => {
      clearTimeout(t)
      stopMusic('rewardsMusic')
    }
  }, [])

  return (
    <>
      <StatusBar hidden />
      <View style={{ flex: 1, backgroundColor: 'black' }}>
        <VideoView player={rewardVideoPlayer} style={StyleSheet.absoluteFillObject} contentFit="cover" nativeControls={false} />

        {/* one-shot confetti overlay, non-interactive */}
        <ExpoImage
          source={require('@/assets/images/confetti.webp')}
          style={[StyleSheet.absoluteFillObject, { zIndex: 10, elevation: 10 }]}
          contentFit="cover"
          autoplay
          loop={false}
          pointerEvents="none"
          animationFrameInterval={1}
        />

        <View style={styles.rewardBoardContainer}>
          <ExpoImage source={require('@/assets/images/board.png')} style={styles.rewardBoard} contentFit="contain" />
        </View>

        <TouchableOpacity
          style={styles.continueButton}
          onPress={() => {
            playSoundInstant('buttonPop')
            // slight delay so the pop sound plays before music cuts
            setTimeout(() => stopMusic('rewardsMusic'), 100)
            router.push('/level2')
          }}
        >
          <ExpoImage source={require('@/assets/images/continuebutton.png')} style={styles.continueButtonImage} contentFit="contain" />
        </TouchableOpacity>
      </View>
    </>
  )
}