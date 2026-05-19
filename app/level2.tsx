import {
  Image,
  ImageBackground,
  View,
  TouchableOpacity,
  Dimensions,
  StyleSheet,
} from "react-native"
import { styles } from "../styles/auth.styles"
import gameboard from "@/assets/images/gameboard.webp"
import { scale as s } from "react-native-size-matters"
import { StatusBar } from "expo-status-bar"
import Svg, { Text as SvgText, Path as SvgPath } from 'react-native-svg';
import { useRouter } from "expo-router"
import * as NavigationBar from "expo-navigation-bar"
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withSequence,
  withTiming,
  runOnJS,
} from "react-native-reanimated"
import type { SharedValue } from "react-native-reanimated"
import { Gesture, GestureDetector } from "react-native-gesture-handler"
import React, { useCallback, useEffect, useRef, useState } from "react"
import { VideoView, useVideoPlayer } from "expo-video"
import { Image as ExpoImage } from "expo-image"
import { playSound, startMusic, stopMusic, clearQueue, SoundKey } from "@/lib/audioManager"
import { useCloudTransition } from '@/lib/TransitionContext'

const SCREEN_WIDTH = Dimensions.get("window").width
const SPRITE_SIZE = 320
type PoseType = "idle" | "correct" | "wrong" | "spell"

// each pose maps to a webp sprite with its own loop/frame settings
const ANIMATED_SPRITES: Record<
  PoseType,
  { source: any; loop: boolean; totalFrames: number; fps: number }
> = {
  idle:    { source: require("@/assets/images/idlelast.webp"),    loop: true,  totalFrames: 55, fps: 10 },
  correct: { source: require("@/assets/images/jump.webp"),        loop: false, totalFrames: 35, fps: 10 },
  wrong:   { source: require("@/assets/images/wronglast.webp"),   loop: false, totalFrames: 42, fps: 10 },
  spell:   { source: require("@/assets/images/magic.webp"),       loop: false, totalFrames: 51, fps: 10 },
}

const POSE_KEYS = Object.keys(ANIMATED_SPRITES) as PoseType[]

const OPTIONS = [
  { icon: require("@/assets/images/gem.tealbon.png"), number: 4 },
  { icon: require("@/assets/images/gem.crimsom.png"), number: 5 },
  { icon: require("@/assets/images/gem.amber.png"),   number: 7 },
  { icon: require("@/assets/images/gem.yellow.png"),  number: 8 },
] as const

const CORRECT_ANSWER = 7


// SVG text with a stroke outline, used for numbers and operators
const StrokedText = React.memo(({
  text, fill = "#394BDE", size = 50, stroke = "#F1FCAA", strokeWidth = 1,
}: {
  text: string; fill?: string; size?: number; stroke?: string; strokeWidth?: number
}) => {
  const width = Math.ceil(size * Math.max(text.length * 0.75, 0.9))
  const height = Math.ceil(size * 1.4)
  return (
    <Svg height={height} width={width}>
      <SvgText x="50%" y="75%" textAnchor="middle" fontSize={size} fontFamily="BelweBold"
        fill={fill} stroke={stroke} strokeWidth={strokeWidth}>
        {text}
      </SvgText>
    </Svg>
  )
})


// renders all pose sprites stacked; only the active one is visible
const Character = ({ pose, style }: { pose: PoseType; style: any }) => {
  const [activePose, setActivePose] = useState<PoseType>(pose)
  const [poseKeys, setPoseKeys] = useState<Record<PoseType, number>>({
    idle: 0, correct: 0, wrong: 0, spell: 0,
  })
  const prevPose = useRef<PoseType>(pose)

  // key bump forces the webp to restart; small delay avoids a flash between poses
  useEffect(() => {
    if (prevPose.current !== pose) {
      setPoseKeys(prev => ({ ...prev, [pose]: prev[pose] + 1 }))
      const t = setTimeout(() => setActivePose(pose), 80)
      prevPose.current = pose
      return () => clearTimeout(t)
    }
  }, [pose])

  return (
    <View style={style}>
      {(Object.keys(ANIMATED_SPRITES) as PoseType[]).map((p) => (
        <ExpoImage
          key={`${p}-${poseKeys[p]}`}
          source={ANIMATED_SPRITES[p].source}
          style={[StyleSheet.absoluteFillObject, { opacity: activePose === p ? 1 : 0 }]}
          contentFit="contain"
          cachePolicy="memory-disk"
          autoplay={true}
          loop={ANIMATED_SPRITES[p].loop}
        />
      ))}
    </View>
  )
}


// quick pop used for single feedback bounces
const singleBounce = (sv: SharedValue<number>) => {
  sv.value = withSequence(
    withTiming(1.45, { duration: 130 }),
    withSpring(1, { damping: 6, stiffness: 200 })
  )
}

// three-beat bounce used for the answer reveal
const tripleBounce = (sv: SharedValue<number>) => {
  sv.value = withSequence(
    withTiming(1.55, { duration: 110 }),
    withSpring(0.92, { damping: 8, stiffness: 300 }),
    withTiming(1.38, { duration: 100 }),
    withSpring(0.95, { damping: 8, stiffness: 300 }),
    withTiming(1.22, { duration: 90 }),
    withSpring(1, { damping: 6, stiffness: 200 })
  )
}


// shows a crystal box until the answer is revealed, then shatters it with flying shards
const CrystalShatterAnswer = ({ showAnswer }: { showAnswer: boolean }) => {
  // each shard has a unique origin, translation, and rotation target
  const shardDefs = [
    { ox: 36, oy: 0,  tx: -45, ty: -60, r: -40, w: 20, h: 12 },
    { ox: 56, oy: 10, tx: 50,  ty: -50, r: 30,  w: 16, h: 14 },
    { ox: 0,  oy: 36, tx: -60, ty: 0,   r: -20, w: 22, h: 10 },
    { ox: 72, oy: 30, tx: 65,  ty: 5,   r: 25,  w: 18, h: 14 },
    { ox: 10, oy: 62, tx: -50, ty: 55,  r: 50,  w: 14, h: 18 },
    { ox: 50, oy: 65, tx: 50,  ty: 60,  r: -35, w: 18, h: 12 },
    { ox: 36, oy: 0,  tx: 5,   ty: -70, r: 60,  w: 12, h: 16 },
    { ox: 30, oy: 68, tx: -5,  ty: 70,  r: -55, w: 10, h: 14 },
  ]

  const shardAnims = shardDefs.map(() => ({
    x:       useSharedValue(0),
    y:       useSharedValue(0),
    opacity: useSharedValue(0),
    rotate:  useSharedValue(0),
  }))

  const prevShowAnswer = useRef(false)

  // only trigger the shatter once when showAnswer first becomes true
  useEffect(() => {
    if (showAnswer && !prevShowAnswer.current) {
      prevShowAnswer.current = true
      runShardAnim()
    }
  }, [showAnswer])

  // stagger each shard's fly-out so they don't all move at once
  const runShardAnim = () => {
    shardAnims.forEach((shard, i) => {
      const sd = shardDefs[i]
      shard.opacity.value = 0.9
      setTimeout(() => {
        shard.x.value       = withTiming(sd.tx, { duration: 500 })
        shard.y.value       = withTiming(sd.ty, { duration: 500 })
        shard.rotate.value  = withTiming(sd.r + 40, { duration: 500 })
        shard.opacity.value = withTiming(0, { duration: 500 })
      }, i * 25)
    })
  }

  return (
    <View style={{ position: 'relative' }}>
      {showAnswer ? (
        <StrokedText text="7" fill="#394BDE" size={s(63)} stroke="#F1FCAA" strokeWidth={1} />
      ) : (
        <ExpoImage
          source={require('@/assets/images/boxanse.webp')}
          style={styles.answerbox}
          contentFit="contain"
          autoplay
          loop={true}
          cachePolicy="memory-disk"
        />
      )}

      {shardDefs.map((sd, i) => (
        <Animated.View
          key={i}
          pointerEvents="none"
          style={[{
            position: 'absolute',
            width: sd.w, height: sd.h,
            left: sd.ox - sd.w / 2,
            top:  sd.oy - sd.h / 2,
            backgroundColor: 'rgba(140,210,255,0.6)',
            borderWidth: 1,
            borderColor: 'rgba(200,240,255,0.9)',
            borderRadius: 2,
          }, useAnimatedStyle(() => ({
            opacity: shardAnims[i].opacity.value,
            transform: [
              { translateX: shardAnims[i].x.value },
              { translateY: shardAnims[i].y.value },
              { rotate: `${shardAnims[i].rotate.value}deg` },
            ],
          }))]}
        />
      ))}
    </View>
  )
}


// draggable gem — measures its own position and the answer box on drag start,
// then checks if the drop landed inside the answer box
const DraggableOption = React.memo(({
  number, icon, answerRef, onCorrect, onWrong, onSelect, disabled,
}: {
  number: number; icon: any; answerRef: React.RefObject<View>
  onCorrect: () => void; onWrong: () => void; onSelect: () => void; disabled: boolean
}) => {
  const x = useSharedValue(0)
  const y = useSharedValue(0)
  const startAbsX = useSharedValue(0)
  const startAbsY = useSharedValue(0)
  const answerX = useSharedValue(0)
  const answerY = useSharedValue(0)
  const answerW = useSharedValue(0)
  const answerH = useSharedValue(0)
  const selfRef = useRef<View>(null)

  // measure both the gem and the answer box at drag start for hit testing
  const measureOnBegin = useCallback(() => {
    selfRef.current?.measureInWindow((px, py, pw, ph) => {
      startAbsX.value = px + pw / 2
      startAbsY.value = py + ph / 2
    })
    answerRef.current?.measureInWindow((ax, ay, aw, ah) => {
      answerX.value = ax; answerY.value = ay
      answerW.value = aw; answerH.value = ah
    })
  }, [])

  const gesture = Gesture.Pan()
    .enabled(!disabled)
    .onBegin(() => { runOnJS(onSelect)(); runOnJS(measureOnBegin)() })
    .onUpdate((e) => { x.value = e.translationX; y.value = e.translationY })
    .onEnd((e) => {
      const cx = startAbsX.value + e.translationX
      const cy = startAbsY.value + e.translationY
      // check if the drag ended inside the answer box bounds
      const inside =
        cx > answerX.value && cx < answerX.value + answerW.value &&
        cy > answerY.value && cy < answerY.value + answerH.value
      if (inside) {
        if (number === CORRECT_ANSWER) runOnJS(onCorrect)()
        else runOnJS(onWrong)()
      }
      // always snap back to origin
      x.value = withSpring(0)
      y.value = withSpring(0)
    })

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }, { translateY: y.value }],
  }))

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View ref={selfRef} style={[styles.optionItem, animatedStyle, disabled && { opacity: 0.4 }]}>
        <Image source={icon} style={styles.optionIcon} resizeMode="contain" />
        <View style={{ position: "absolute" }}>
          <StrokedText text={String(number)} fill="#F1FCAA" size={s(45)} stroke="#542115" strokeWidth={0.9} />
        </View>
      </Animated.View>
    </GestureDetector>
  )
})


export default function Index() {
  const [showAnswer,    setShowAnswer]    = useState(false)
  const [pose,          setPose]          = useState<PoseType>("idle")
  const [showFireworks, setShowFireworks] = useState(false)
  const [showBlackFade, setShowBlackFade] = useState(false)

  const questionScale = useSharedValue(1)
  const blackOpacity  = useSharedValue(0)
  const answerRef     = useRef<View>(null)
  const musicStarted  = useRef(false)
  // tracked so they can all be cleared on unmount
  const timeoutsRef   = useRef<ReturnType<typeof setTimeout>[]>([])
  const router        = useRouter()

  // shared values for each equation token's scale and opacity
  const scale3      = useSharedValue(1); const scalePlus = useSharedValue(1)
  const scale4      = useSharedValue(1); const scaleEq   = useSharedValue(1)
  const scale7      = useSharedValue(1)
  const opacity3    = useSharedValue(1); const opacityPlus = useSharedValue(1)
  const opacity4    = useSharedValue(1); const opacityEq   = useSharedValue(1)
  const opacity7    = useSharedValue(1)

  const style3    = useAnimatedStyle(() => ({ transform: [{ scale: scale3.value }],    opacity: opacity3.value }))
  const stylePlus = useAnimatedStyle(() => ({ transform: [{ scale: scalePlus.value }], opacity: opacityPlus.value }))
  const style4    = useAnimatedStyle(() => ({ transform: [{ scale: scale4.value }],    opacity: opacity4.value }))
  const styleEq   = useAnimatedStyle(() => ({ transform: [{ scale: scaleEq.value }],   opacity: opacityEq.value }))
  const style7    = useAnimatedStyle(() => ({ transform: [{ scale: scale7.value }],    opacity: opacity7.value }))
  const blackFadeStyle = useAnimatedStyle(() => ({ opacity: blackOpacity.value }))

  const { triggerTransition } = useCloudTransition()

  // wraps setTimeout so all ids are tracked for cleanup
  const addTimeout = useCallback((fn: () => void, delay: number) => {
    const id = setTimeout(fn, delay)
    timeoutsRef.current.push(id)
    return id
  }, [])

  const clearAllTimeouts = useCallback(() => {
    timeoutsRef.current.forEach(clearTimeout)
    timeoutsRef.current = []
  }, [])

  // prefetch all sprites so there's no stutter on first pose change
  useEffect(() => {
    Promise.all(
      POSE_KEYS.map((p) =>
        ExpoImage.prefetch(ANIMATED_SPRITES[p].source, "memory-disk").catch(() => {})
      )
    )
  }, [])

  // looping muted background video
  const player = useVideoPlayer(require("@/assets/images/gif.mp4"), (p) => {
    try { p.loop = true; p.muted = true; p.play() }
    catch (e) { console.warn("[video] player setup failed:", e) }
  })

  useEffect(() => {
    try {
      NavigationBar.setVisibilityAsync("hidden")
      NavigationBar.setBehaviorAsync("overlay-swipe")
    } catch (e) {}
    return () => { clearAllTimeouts() }
  }, [])

  // guard against starting music twice in strict mode
  useEffect(() => {
    if (musicStarted.current) return
    musicStarted.current = true
    startMusic('bg')
  }, [])

  // each option plays its number's voice line on drag start
  const handleSelect4 = useCallback(() => playSound('v4'), [])
  const handleSelect5 = useCallback(() => playSound('v5'), [])
  const handleSelect7 = useCallback(() => playSound('v7'), [])
  const handleSelect8 = useCallback(() => playSound('v8'), [])

  // after a correct answer, highlight each equation token in sequence with sound
  const playEquationSequence = useCallback(() => {
    clearQueue()

    const dimAll = () => {
      [opacity3, opacityPlus, opacity4, opacityEq, opacity7].forEach((o) => {
        o.value = withTiming(0.25, { duration: 200 })
      })
    }

    const step = (
      opacitySv: SharedValue<number>,
      scaleSv: SharedValue<number>,
      soundKey: SoundKey,
      delay: number,
      bounce: 'single' | 'triple' = 'single'
    ) => {
      addTimeout(() => {
        opacitySv.value = withTiming(1, { duration: 150 })
        bounce === 'triple' ? tripleBounce(scaleSv) : singleBounce(scaleSv)
        playSound(soundKey)
      }, delay)
    }

    dimAll()
    step(opacity3,    scale3,    'v3',      300)
    step(opacityPlus, scalePlus, 'vPlus',   1100)
    step(opacity4,    scale4,    'v4',      1900)
    step(opacityEq,   scaleEq,   'vEquals', 2700)
    step(opacity7,    scale7,    'answer',  3600)

    // restore all tokens to full opacity after the sequence
    addTimeout(() => {
      [opacity3, opacityPlus, opacity4, opacityEq].forEach((o) => {
        o.value = withTiming(1, { duration: 300 })
      })
    }, 4600)

    addTimeout(() => {
      setPose('spell')
      addTimeout(() => playSound('magic'), 300)
      const duration = (ANIMATED_SPRITES.spell.totalFrames / ANIMATED_SPRITES.spell.fps) * 1000

      addTimeout(() => {
        setPose('idle')
        addTimeout(() => {
          playSound('amazing')
          setShowFireworks(true)
          playSound('fireworks')

          // fade to black and navigate after fireworks play out
          addTimeout(() => {
            setShowBlackFade(true)
            blackOpacity.value = withTiming(1, { duration: 400 })

            addTimeout(() => {
              setShowFireworks(false)
              stopMusic('bg')
              router.push('/rewards/reward1')
            }, 400)

          }, 5800)

        }, 50)
      }, duration)

    }, 5000)

  }, [addTimeout])

  const handleCorrectDrop = useCallback(() => {
    setPose('correct')
    playSound('correct')
    // briefly hide the question mark then reveal the answer
    questionScale.value = withSequence(
      withTiming(0, { duration: 200 }),
      withTiming(1, { duration: 200 })
    )
    setShowAnswer(true)
    const duration = (ANIMATED_SPRITES.correct.totalFrames / ANIMATED_SPRITES.correct.fps) * 1000
    addTimeout(() => {
      setPose('idle')
      playEquationSequence()
    }, duration)
  }, [playEquationSequence, addTimeout])

  const handleWrongDrop = useCallback(() => {
    setPose('wrong')
    playSound('wrong')
    // return to idle after the wrong animation finishes
    const duration = (ANIMATED_SPRITES.wrong.totalFrames / ANIMATED_SPRITES.wrong.fps) * 1000
    addTimeout(() => setPose('idle'), duration)
  }, [addTimeout])

  const questionStyle = useAnimatedStyle(() => ({
    transform: [{ scale: questionScale.value }],
  }))


  return (
    <>
      <StatusBar hidden />
      <View style={{ flex: 1 }}>

        <VideoView
          player={player}
          style={StyleSheet.absoluteFillObject}
          contentFit="cover"
          nativeControls={false}
        />

        <View style={{ flex: 1, zIndex: 1, elevation: 1 }}>
          <View style={styles.gamecontainer}>
            <View style={styles.gamepadWrapper}>

              <Character style={styles.characterSprite} pose={pose} />

              <View style={styles.gamepad}>
                <ExpoImage
                  source={gameboard}
                  style={StyleSheet.absoluteFillObject}
                  contentFit="contain"
                  cachePolicy="memory-disk"
                />

                <View style={styles.equation}>
                  <Animated.View style={[styles.numbers, style3]}>
                    <StrokedText text="3" fill="#394BDE" size={s(63)} stroke="#F1FCAA" strokeWidth={1} />
                  </Animated.View>
                  <Animated.View style={[styles.operators, stylePlus]}>
                    <StrokedText text="+" fill="#F1FCAA" size={s(35)} stroke="#F1FCAA" strokeWidth={1} />
                  </Animated.View>
                  <Animated.View style={[styles.numbers, style4]}>
                    <StrokedText text="4" fill="#394BDE" size={s(63)} stroke="#F1FCAA" strokeWidth={1} />
                  </Animated.View>
                  <Animated.View style={[styles.operators, styleEq]}>
                    <StrokedText text="=" fill="#F1FCAA" size={s(35)} stroke="#F1FCAA" strokeWidth={1} />
                  </Animated.View>
                  <Animated.View
                    ref={answerRef}
                    onLayout={() => {}}
                    style={[styles.answerBox, questionStyle, style7]}
                  >
                    <CrystalShatterAnswer showAnswer={showAnswer} />
                  </Animated.View>
                </View>
              </View>

              <View style={styles.optionsBox}>
                {OPTIONS.map((option) => (
                  <DraggableOption
                    key={option.number}
                    number={option.number}
                    icon={option.icon}
                    answerRef={answerRef}
                    onCorrect={handleCorrectDrop}
                    onWrong={handleWrongDrop}
                    onSelect={
                      option.number === 4 ? handleSelect4 :
                      option.number === 5 ? handleSelect5 :
                      option.number === 7 ? handleSelect7 :
                      handleSelect8
                    }
                    // lock all gems once the answer is submitted
                    disabled={showAnswer || pose !== 'idle'}
                  />
                ))}
              </View>

            </View>
          </View>
        </View>

        {/* one-shot fireworks overlay, non-interactive */}
        {showFireworks && (
          <ExpoImage
            source={require("@/assets/images/transition.webp")}
            style={[StyleSheet.absoluteFillObject, { zIndex: 9999, elevation: 9999 }]}
            contentFit="cover"
            autoplay
            loop={false}
            pointerEvents="none"
          />
        )}

        {/* black overlay for the exit transition */}
        {showBlackFade && (
          <Animated.View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFillObject,
              { backgroundColor: 'black', zIndex: 99999, elevation: 99999 },
              blackFadeStyle,
            ]}
          />
        )}

      </View>
    </>
  )
}