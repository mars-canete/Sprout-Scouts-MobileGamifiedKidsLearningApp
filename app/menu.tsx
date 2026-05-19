import { View, TouchableOpacity, StyleSheet, Animated } from 'react-native'
import React, { useEffect, useRef } from 'react'
import { VideoView, useVideoPlayer } from 'expo-video'
import { Image as ExpoImage } from 'expo-image'
import { StatusBar } from 'expo-status-bar'
import * as NavigationBar from 'expo-navigation-bar'
import { useRouter } from 'expo-router'

import { menuStyles } from '../styles/Menu.styles'
import { useCloudTransition } from '@/lib/TransitionContext'
import { playSoundInstant, startMusic, stopMusic } from '@/lib/audioManager'


// Each menu item: the sign image to show and where it navigates (null = coming soon / disabled)
const MENU_ITEMS = [
  { image: require('@/assets/images/menu/adventureTrail.png'),  route: './habitat1' },
  { image: require('@/assets/images/menu/scoutChallenges.png'), route: './scoutChallenges' },
  { image: require('@/assets/images/menu/scoutBadges.png'),     route: './scoutbadges'},
  { image: require('@/assets/images/menu/wellnessGarden.png'),  route: null },
  { image: require('@/assets/images/menu/guardianGrove.png'),   route: null },
  { image: require('@/assets/images/menu/campSetting.png'),     route: null },
]

function MenuItem({ image, route, index, triggerTransition}: {
  image: any
  route: string | null
  index: number
  triggerTransition: (onMidpoint: () => void) => void
}) {
  const router = useRouter()
  const scale = useRef(new Animated.Value(1)).current
  const opacity = useRef(new Animated.Value(0)).current
  const translateX = useRef(new Animated.Value(-60)).current  // starts off-screen to the left

  // Staggered slide-in animation when the menu mounts
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 400,
        delay: index * 80,
        useNativeDriver: true,
      }),
      Animated.spring(translateX, {
        toValue: 0,
        delay: index * 80,
        useNativeDriver: true,
        tension: 60,
        friction: 8,
      }),
    ]).start()
  }, [])

  // Slight shrink on press down for tactile feel
  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.95,
      useNativeDriver: true,
      tension: 200,
      friction: 10,
    }).start()
  }

  // Bounce back to normal size on release
  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      tension: 200,
      friction: 10,
    }).start()
  }

  // Play sound, stop menu music, then navigate mid-transition
  const handlePress = () => {
    if (!route) return
    playSoundInstant('buttonPop')
    stopMusic('menuMusic')  // ← add this
    triggerTransition(() => router.push(route as any))
  }

  return (
    <Animated.View
      style={[
        menuStyles.menuItemWrapper,
        { opacity, transform: [{ translateX }, { scale }] },
      ]}
    >
      <TouchableOpacity
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
      >
        <ExpoImage
          source={image}
          style={menuStyles.signImage}
          contentFit="contain"
        />
      </TouchableOpacity>
    </Animated.View>
  )
}

export default function MenuScreen() {
  const { triggerTransition } = useCloudTransition()

  // Looping muted background video
  const bgPlayer = useVideoPlayer(require('@/assets/images/menu/Menubg.mp4'), (p) => {
    p.loop = true
    p.muted = true
    p.play()
  })

  // Start menu music on mount, clean up on unmount
  useEffect(() => {
    startMusic('menuMusic')
    return () => stopMusic('menuMusic')
  }, [])

  // Hide the Android nav bar for a cleaner full-screen look
  useEffect(() => {
    try { NavigationBar.setVisibilityAsync('hidden') } catch (e) {}
  }, [])

  // Preload the first habitat video in the background so it's ready when the user navigates
  const preloadPlayer = useVideoPlayer(
    require('@/assets/images/home/Habitat1.mp4'), (p) => {
    p.muted = true
    p.pause()
  })

  return (
    <>
      <StatusBar hidden />
      <View style={menuStyles.container}>

        {/* Full-screen video background */}
        <VideoView
          player={bgPlayer}
          style={StyleSheet.absoluteFillObject}
          contentFit="cover"
          nativeControls={false}
        />

        {/* Left panel: title board + menu sign list */}
        <View style={menuStyles.leftPanel}>
          <ExpoImage
            source={require('@/assets/images/menu/titleboard.png')}
            style={menuStyles.titleSign}
            contentFit="contain"
          />
          <View style={menuStyles.menuList}>
            {MENU_ITEMS.map((item, index) => (
              <MenuItem
                key={index}
                image={item.image}
                route={item.route}
                index={index}
                triggerTransition={triggerTransition}
              />
            ))}
          </View>
        </View>

        {/* Settings icon pinned to the HUD layer */}
        <ExpoImage
          source={require('@/assets/images/menu/setting.png')}
          style={menuStyles.hud}
          contentFit="contain"
        />

      </View>
    </>
  )
}