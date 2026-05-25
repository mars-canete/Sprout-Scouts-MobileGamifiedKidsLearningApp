import { View, TouchableOpacity, StyleSheet } from 'react-native'
import React, { useState, useEffect, useRef } from 'react'
import { VideoView, useVideoPlayer } from 'expo-video'
import { Image as ExpoImage } from 'expo-image'
import { StatusBar } from 'expo-status-bar'
import * as NavigationBar from 'expo-navigation-bar'
import { styles } from '@/styles/auth.styles'
import { useRouter } from 'expo-router'
import { playSound, startMusic, stopMusic } from '@/lib/audioManager'
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withSequence, withTiming,
} from 'react-native-reanimated'
import { Asset } from 'expo-asset'

// gem id
const GEMS = [
  { id: 0, reward: require('@/assets/images/leaf.png') },
  { id: 1, reward: require('@/assets/images/key.png') },
  { id: 2, reward: require('@/assets/images/water.png') },
]

type GemState = 'idle' | 'cracking' | 'cracked'
// match the crack animation length
const GEM_CRACK_DURATION = 5900



export default function Reward1() {
  const [gemStates, setGemStates] = useState<GemState[]>(['idle', 'idle', 'idle'])
  const [showClickToCrack, setShowClickToCrack] = useState(true)
  const [showClaimButton, setShowClaimButton] = useState(false)
  const [showFlash, setShowFlash] = useState(false)

  const flashOpacity = useSharedValue(0)
  const flashStyle = useAnimatedStyle(() => ({ opacity: flashOpacity.value }))
  // prevents tapping multiple gems at once
  const crackingCount = useRef(0)
  const router = useRouter()
  const screenOpacity = useSharedValue(0)
const screenStyle = useAnimatedStyle(() => ({ opacity: screenOpacity.value }))

  // fade in on mount
  useEffect(() => {
    screenOpacity.value = withTiming(1, { duration: 400 })
  }, [])

  // looping muted background video
  const player = useVideoPlayer(require('@/assets/images/chestbg.mp4'), (p) => {
    p.loop = true; p.muted = true; p.play()
  })

  // pre-load 
  useEffect(() => {
  Asset.loadAsync(require('@/assets/images/crackanimation.webp'))
}, [])

  useEffect(() => {
    startMusic('rewardsMusic')
    return () => { stopMusic('rewardsMusic') }
  }, [])

  // full-screen immersion
  useEffect(() => {
    try {
      NavigationBar.setVisibilityAsync('hidden')
      NavigationBar.setBehaviorAsync('overlay-swipe')
    } catch (e) {}
  }, [])

  // one gem cracks at a time
  const handleGemPress = async (index: number) => {
    if (gemStates[index] !== 'idle') return
    if (crackingCount.current > 0) return

    setShowClickToCrack(false)
    playSound('gemCrack')
    crackingCount.current += 1

    setGemStates(prev => {
      const next = [...prev]; next[index] = 'cracking'; return next
    })

    setTimeout(() => {
      crackingCount.current -= 1
      setGemStates(prev => {
        const next = [...prev]; next[index] = 'cracked'; return next
      })
    }, GEM_CRACK_DURATION)
  }

  // show claim button once all gems are cracked
  useEffect(() => {
    if (gemStates.every((s) => s === 'cracked') && crackingCount.current === 0) {
      const t = setTimeout(() => setShowClaimButton(true), 500)
      return () => clearTimeout(t)
    }
  }, [gemStates])

  return (
  <>
    <StatusBar hidden />
    <Animated.View style={[{ flex: 1 }, screenStyle]}>
      <VideoView player={player} style={StyleSheet.absoluteFillObject} contentFit="cover" nativeControls={false} />

      {!showFlash && (
        <>
          {showClickToCrack && (
            <View style={[styles.buttonContainer, { zIndex: 20, elevation: 20 }]}>
              <TouchableOpacity onPress={() => {}}>
                <ExpoImage source={require('@/assets/images/clickbutton.png')} style={styles.buttonImage} contentFit="contain" />
              </TouchableOpacity>
            </View>
          )}

          {showClaimButton && (
            <View style={[styles.claimButtonContainer, { zIndex: 20, elevation: 20 }]}>
              <TouchableOpacity onPress={() => {
                playSound('buttonPop')
                setShowClaimButton(false)
                setShowFlash(true)
                // flash in, hold, cut to black, then navigate
                flashOpacity.value = withSequence(
                  withTiming(1, { duration: 300 }),
                  withTiming(1, { duration: 1500 }),
                  withTiming(0, { duration: 0 }),
                )
                setTimeout(() => {
                  stopMusic('rewardsMusic')
                  router.replace('/rewards/reward1claim')
                }, 1800)
              }}>
                <ExpoImage source={require('@/assets/images/claimbutton.png')} style={styles.claimButtonImage} contentFit="contain" />
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.gemsContainer}>
            {GEMS.map((gem, index) => (
              <GemItem
                key={gem.id}
                index={index}
                state={gemStates[index]}
                reward={gem.reward}
                onPress={() => handleGemPress(index)}
                disabled={crackingCount.current > 0}
              />
            ))}
          </View>
        </>
      )}

      {/* black overlay for transition flash */}
      {showFlash && (
        <Animated.View style={[
          StyleSheet.absoluteFillObject,
          { backgroundColor: 'black', zIndex: 99999, elevation: 99999 },
          flashStyle
        ]} />
      )}

    </Animated.View>  
  </>
)
}

function GemItem({ index, state, reward, onPress, disabled }: {
  index: number; state: GemState; reward: any; onPress: () => void; disabled: boolean
}) {
  const scale = useSharedValue(1)
  // slight delay so reward appears mid-crack
  const [showReward, setShowReward] = useState(false)

  useEffect(() => {
    if (state === 'cracking') {
      const t = setTimeout(() => setShowReward(true), 300)
      return () => clearTimeout(t)
    }
    if (state === 'idle') setShowReward(false)
  }, [state])

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }))

  // squish-and-bounce on tap
  const handlePress = () => {
    if (state !== 'idle' || disabled) return
    scale.value = withSequence(
      withTiming(0.85, { duration: 80 }),
      withSpring(1, { damping: 6, stiffness: 200 })
    )
    onPress()
  }

  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={0.9}>
      <Animated.View style={[styles.gemWrapper, animatedStyle]}>
        {/* reward revealed under the cracking gem */}
        <ExpoImage source={reward} style={[styles.rewardImage, { opacity: showReward ? 1 : 0 }]} contentFit="contain" />

        {/* static gem, hidden once cracking starts */}
        <ExpoImage
          key="idle-gem"
          source={require('@/assets/images/crackgem.png')}
          style={[styles.gemImage, { position: 'absolute', opacity: state === 'idle' ? 1 : 0 }]}
          contentFit="contain"
        />

        {/* one-shot crack animation */}
        {state === 'cracking' && (
       <ExpoImage
  key={`crack-${index}`}
  source={require('@/assets/images/crackanimation.webp')}
  style={[styles.gemImage, { position: 'absolute', opacity: state === 'cracking' ? 1 : 0 }]}
  contentFit="contain"
  autoplay={state === 'cracking'}
  loop={false}
/>
        )}
      </Animated.View>
    </TouchableOpacity>
  )
}
