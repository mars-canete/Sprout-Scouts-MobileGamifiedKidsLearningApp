import { View, TouchableOpacity, ScrollView, Dimensions, Text } from 'react-native'
import React, { useEffect, useState } from 'react'
import { VideoView, useVideoPlayer } from 'expo-video'
import { Image as ExpoImage } from 'expo-image'
import { StatusBar } from 'expo-status-bar'
import * as NavigationBar from 'expo-navigation-bar'
import { useRouter } from 'expo-router'
import * as FileSystem from 'expo-file-system'
import { playSoundInstant, startMusic, stopMusic } from '@/lib/audioManager'
import { ScaledSheet, scale as s, verticalScale as vs } from 'react-native-size-matters'
import { useCloudTransition } from '@/lib/TransitionContext'


const { width, height } = Dimensions.get('screen')

// map is wider than the screen to allow horizontal scrolling
const MAP_ASPECT    = 1920 / 1080
const MAP_HEIGHT    = height
const MAP_WIDTH     = Math.max(width, MAP_HEIGHT * MAP_ASPECT)
const PLATFORM_SIZE = MAP_WIDTH * 0.08

// UI scaled dimensions
const BAR_W  = s(200)
const BAR_H  = vs(47)

const NAV_W  = s(180)
const NAV_H  = vs(70)

const ARROW_SIZE = s(40)

const TIPS_W = s(230)
const TIPS_H = vs(90)

const MENU_BTN_W = s(40)
const MENU_BTN_H = vs(45)

// x/y are fractional positions relative to map size
const LEVELS = [
  { id: 1,  x: 0.07, y: 0.79, asset: require('@/assets/images/habitat3_lvl/lvl_21.png'),  route: '/habitat4'  },
  { id: 2,  x: 0.08, y: 0.47, asset: require('@/assets/images/habitat3_lvl/lvl_22.png'),  route: '/level2'  },
  { id: 3,  x: 0.27, y: 0.38, asset: require('@/assets/images/habitat3_lvl/lvl_23.png'),  route: '/level3'  },
  { id: 4,  x: 0.34, y: 0.64, asset: require('@/assets/images/habitat3_lvl/lvl_24.png'),  route: '/level4'  },
  { id: 5,  x: 0.50, y: 0.71, asset: require('@/assets/images/habitat3_lvl/lvl_25.png'),  route: '/level5'  },
  { id: 6,  x: 0.55, y: 0.35, asset: require('@/assets/images/habitat3_lvl/lvl_26.png'),  route: '/level6'  },
  { id: 7,  x: 0.76, y: 0.47, asset: require('@/assets/images/habitat3_lvl/lvl_27.png'),  route: '/level7'  },
  { id: 8,  x: 0.70, y: 0.70, asset: require('@/assets/images/habitat3_lvl/lvl_28.png'),  route: '/level8'  },
  { id: 9,  x: 0.84, y: 0.79, asset: require('@/assets/images/habitat3_lvl/lvl_29.png'),  route: '/level9'  },
  { id: 10, x: 0.93, y: 0.54, asset: require('@/assets/images/habitat3_lvl/lvl_30.png'),  route: '/level10' },
]

// separate save file per habitat
const STORAGE_PATH = FileSystem.documentDirectory + 'unlockedLevels3.json'

// returns unlocked level ids, defaults to [1] if no save file exists
async function getUnlockedLevels(): Promise<number[]> {
  try {
    const info = await FileSystem.getInfoAsync(STORAGE_PATH)
    if (!info.exists) return [1]

    const data = await FileSystem.readAsStringAsync(STORAGE_PATH)
    return JSON.parse(data)
  } catch {
    return [1]
  }
}

async function saveUnlockedLevels(unlocked: number[]): Promise<void> {
  try {
    await FileSystem.writeAsStringAsync(
      STORAGE_PATH,
      JSON.stringify(unlocked)
    )
  } catch (e) {}
}

// call this when a level is finished to unlock the next one
export async function completeLevel(levelId: number) {
  try {
    const unlocked = await getUnlockedLevels()
    const next = levelId + 1

    if (next <= LEVELS.length && !unlocked.includes(next)) {
      unlocked.push(next)
      await saveUnlockedLevels(unlocked)
    }
  } catch (e) {}
}


export default function LevelSelect() {
  const router = useRouter()

  const [unlockedLevels, setUnlockedLevels] = useState<number[]>([1])
  const [leaves, setLeaves] = useState(20)
  const { triggerTransition } = useCloudTransition()

  // looping muted background video
  const bgPlayer = useVideoPlayer(
    require('@/assets/images/home/habitat3.mp4'),
    (p) => {
      p.loop = true
      p.muted = true
      p.play()
    }
  )

  useEffect(() => {
    try {
      NavigationBar.setVisibilityAsync('hidden')
    } catch (e) {}
  }, [])

  useEffect(() => {
    startMusic('habitat3Music')
    return () => stopMusic('habitat3Music')
  }, [])

  // load saved progress on mount
  useEffect(() => {
    getUnlockedLevels().then(setUnlockedLevels)
  }, [])

  // locked levels are tappable but do nothing
  const handleLevelPress = (level: typeof LEVELS[0], isUnlocked: boolean) => {
    if (!isUnlocked) return
    playSoundInstant('buttonPop')
    triggerTransition(() => {
      stopMusic('habitat3Music')
      router.push(level.route as any)
    })
  }

  const handlePrevHabitat = () => {
    playSoundInstant('buttonPop')
    triggerTransition(() => {
      stopMusic('habitat3Music')
      router.push('/habitat2')
    })
  }

  const handleNextHabitat = () => {
    playSoundInstant('buttonPop')
    triggerTransition(() => {
      stopMusic('habitat3Music')
      router.push('/habitat4')
    })
  }

  return (
    <>
      <StatusBar hidden />

      <View style={styles.container}>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          bounces={false}
          style={{ flex: 1 }}
          contentContainerStyle={{
            width: MAP_WIDTH,
            height: MAP_HEIGHT,
          }}
        >
          <VideoView
            player={bgPlayer}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: MAP_WIDTH,
              height: MAP_HEIGHT,
            }}
            contentFit="cover"
            nativeControls={false}
          />

          {/* level nodes positioned absolutely on the map */}
          {LEVELS.map((level) => {
            const isUnlocked = unlockedLevels.includes(level.id)

            return (
              <TouchableOpacity
                key={level.id}
                onPress={() => handleLevelPress(level, isUnlocked)}
                activeOpacity={0.8}
                style={{
                  position: 'absolute',
                  left: level.x * MAP_WIDTH - PLATFORM_SIZE / 2,
                  top: level.y * MAP_HEIGHT - PLATFORM_SIZE / 2,
                  width: PLATFORM_SIZE,
                  height: PLATFORM_SIZE,
                }}
              >
                <ExpoImage
                  source={level.asset}
                  style={{ width: '100%', height: '100%' }}
                  contentFit="contain"
                />
              </TouchableOpacity>
            )
          })}
        </ScrollView>

        <View style={styles.tipsWrapper} pointerEvents="none">
          <ExpoImage
            source={require('@/assets/images/habitat3_lvl/lvl3_tips.png')}
            style={styles.tipsImg}
            contentFit="contain"
          />
        </View>

        <View style={styles.barWrapper} pointerEvents="box-none">
          <ExpoImage
            source={require('@/assets/images/habitat3_lvl/lvl3_bar.png')}
            style={styles.barImg}
            contentFit="contain"
          />
          <TouchableOpacity
            style={styles.barAddBtn}
            onPress={() => setLeaves(v => v + 1)}
            activeOpacity={0.7}
          />
        </View>

        <View style={styles.menuCol}>

          <TouchableOpacity
            style={styles.menuBtn}
            activeOpacity={0.7}
            onPress={() => console.log('Scout Pass')}
          >
            <ExpoImage
              source={require('@/assets/images/habitat3_lvl/lvl3_settings.png')}
              style={styles.menuBtnImg}
              contentFit="contain"
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuBtn}
            activeOpacity={0.7}
            onPress={() => console.log('Settings')}
          >
            <ExpoImage
              source={require('@/assets/images/habitat3_lvl/lvl3_settings.png')}
              style={styles.menuBtnImg}
              contentFit="contain"
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuBtn}
            activeOpacity={0.7}
            onPress={() => router.push('/menu')}
          >
            <ExpoImage
              source={require('@/assets/images/habitat3_lvl/lvl3_menu.png')}
              style={styles.menuBtnImg}
              contentFit="contain"
            />
          </TouchableOpacity>

        </View>

        {/* habitat navigation  */}
        <View style={styles.navRow} pointerEvents="box-none">

          <TouchableOpacity
            onPress={handlePrevHabitat}
            activeOpacity={0.7}
            style={[styles.arrowBtn, { marginRight: -ARROW_SIZE * 0.7, zIndex: 10, marginTop: 20 }]}
          >
            <ExpoImage
              source={require('@/assets/images/habitat3_lvl/lvl3_leftarrow.png')}
              style={styles.arrowImg}
              contentFit="contain"
            />
          </TouchableOpacity>

          <ExpoImage
            source={require('@/assets/images/habitat3_lvl/lvl3_nav.png')}
            style={styles.navImg}
            contentFit="contain"
            pointerEvents="none"
          />

          <TouchableOpacity
            onPress={handleNextHabitat}
            activeOpacity={0.7}
            style={[styles.arrowBtn, { marginLeft: -ARROW_SIZE * 0.7, zIndex: 10, marginTop: 20 }]}
          >
            <ExpoImage
              source={require('@/assets/images/habitat3_lvl/lvl3_rightarrow.png')}
              style={styles.arrowImg}
              contentFit="contain"
            />
          </TouchableOpacity>

        </View>

      </View>
    </>
  )
}


const styles = ScaledSheet.create({

  container: {
    flex: 1,
    backgroundColor: 'black',
  },

  tipsWrapper: {
    position: 'absolute',
    top: '0@vs',
    left: '-10@s',
    width: TIPS_W,
    height: TIPS_H,
  },

  tipsImg: {
    width: TIPS_W,
    height: TIPS_H,
  },

  barWrapper: {
    position: 'absolute',
    top: '-1@vs',
    alignSelf: 'center',
    right: '150@s',
    width: BAR_W,
    height: BAR_H,
    alignItems: 'center',
    justifyContent: 'center',
  },

  barImg: {
    position: 'absolute',
    width: BAR_W,
    height: BAR_H,
  },

  barCount: {
    position: 'absolute',
    left: BAR_W * 0.50,
    width: BAR_W * 0.28,
    includeFontPadding: false,
  },

  barAddBtn: {
    position: 'absolute',
    right: 0,
    top: 0,
    width: BAR_W * 0.22,
    height: BAR_H,
  },

  menuCol: {
    position: 'absolute',
    top: '8@vs',
    right: '4@s',
    alignItems: 'center',
    gap: '4@vs',
  },

  menuBtn: {
    width: MENU_BTN_W,
    height: MENU_BTN_H,
  },

  menuBtnImg: {
    width: MENU_BTN_W,
    height: MENU_BTN_H,
  },

  navRow: {
    position: 'absolute',
    bottom: 2,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 0,
  },

  arrowBtn: {
    width: ARROW_SIZE,
    height: ARROW_SIZE,
    zIndex: 10,
    elevation: 10,
  },

  arrowImg: {
    width: ARROW_SIZE,
    height: ARROW_SIZE,
  },

  navImg: {
    width: NAV_W,
    height: NAV_H,
  },
})
