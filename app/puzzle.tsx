import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
  useMemo,
  memo,
} from 'react';

import { StatusBar, View } from 'react-native';

import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';


import { playSound, startMusic, stopMusic } from '@/lib/audioManager';

import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';

import { Image } from 'expo-image';
import { Video, ResizeMode } from 'expo-av';
import { ScaledSheet } from "react-native-size-matters";
import { Dimensions, StyleSheet } from "react-native";
import { useRouter } from 'expo-router'


type SlotId = 'tl' | 'tr' | 'bl' | 'br';
type Pose   = 'idle' | 'correct' | 'wrong' | 'celebrate';

interface PieceDef {
  id:   number;
  img:  any;
  slot: SlotId; // which board slot this piece belongs to
}

interface Piece extends PieceDef {
  locked: boolean; // true once successfully placed
}


// Centralized asset map — keeps requires out of JSX and easy to update
const A = {
  bg:             require('@/assets/images/puzzle/Puzzlebackground.mp4'),
  board:          require('@/assets/images/puzzle/puzzleboard.png'),
  full:           require('@/assets/images/puzzle/fullpuzzle.png'),
  piece0:         require('@/assets/images/puzzle/puzzle0.png'),
  piece1:         require('@/assets/images/puzzle/puzzle1.png'),
  piece2:         require('@/assets/images/puzzle/puzzle2.png'),
  piece3:         require('@/assets/images/puzzle/puzzle4.png'),
  mIdle:          require('@/assets/images/idlelast.webp'),
  mCorrect:       require('@/assets/images/jump.webp'),
  mWrong:         require('@/assets/images/wronglast.webp'),
  mCelebrate:     require('@/assets/images/magic.webp'),
  platformLeft:   require('@/assets/images/puzzle/equals1.png'),
  platformRight:  require('@/assets/images/puzzle/equals2.png'),
  platformTop:    require('@/assets/images/puzzle/equals0.png'),
  platformBottom: require('@/assets/images/puzzle/equals3.png'),
  sfxPop:         require('@/assets/sounds/presspop.mp3'),
  sfxDing:        require('@/assets/sounds/ding.mp3'),
};


// Sprite config for each mascot pose — drives frame count and playback behaviour
const ANIMATED_SPRITES: Record<Pose, { source: any; loop: boolean; totalFrames: number; fps: number }> = {
  idle:      { source: A.mIdle,      loop: true,  totalFrames: 55, fps: 10 },
  correct:   { source: A.mCorrect,   loop: false, totalFrames: 35, fps: 10 },
  wrong:     { source: A.mWrong,     loop: false, totalFrames: 42, fps: 10 },
  celebrate: { source: A.mCelebrate, loop: false, totalFrames: 51, fps: 10 },
};


// Prefetch all sprites and puzzle assets so there's no pop-in during gameplay
(['idle', 'correct', 'wrong', 'celebrate'] as Pose[]).forEach((p) => {
  Image.prefetch(ANIMATED_SPRITES[p].source, 'memory-disk').catch(() => {});
});
[A.piece0, A.piece1, A.piece2, A.piece3, A.full, A.board,
 A.platformLeft, A.platformRight, A.platformTop, A.platformBottom].forEach((src) => {
  Image.prefetch(src, 'memory-disk').catch(() => {});
});


// Renders all pose images stacked on top of each other; only the active pose is visible.
// Small 80ms delay before swapping avoids a flash between poses.
const Mascot = memo(({ pose, size }: { pose: Pose; size: number }) => {
  const [activePose, setActivePose] = useState<Pose>(pose);
  const [poseKeys, setPoseKeys] = useState<Record<Pose, number>>({
    idle: 0, correct: 0, wrong: 0, celebrate: 0,
  });
  const prevPose = useRef<Pose>(pose);

  useEffect(() => {
    if (prevPose.current !== pose) {
      // Bump the key so the incoming sprite restarts from frame 1
      setPoseKeys(prev => ({ ...prev, [pose]: prev[pose] + 1 }));
      const t = setTimeout(() => setActivePose(pose), 80);
      prevPose.current = pose;
      return () => clearTimeout(t);
    }
  }, [pose]);

  return (
    <View style={{ width: size, height: size * 1.35 }}>
      {(Object.keys(ANIMATED_SPRITES) as Pose[]).map((p) => (
        <Image
          key={`${p}-${poseKeys[p]}`}
          source={ANIMATED_SPRITES[p].source}
          style={[StyleSheet.absoluteFillObject, { opacity: activePose === p ? 1 : 0 }]}
          contentFit="contain"
          cachePolicy="memory-disk"
          autoplay={true}
          loop={ANIMATED_SPRITES[p].loop}
          priority={activePose === p ? 'high' : 'low'}
        />
      ))}
    </View>
  );
});


// Layout constants derived from screen size so the puzzle scales across devices
const { width: SW, height: SH } = Dimensions.get("window");

const BOARD_SIZE  = Math.min(SH * 0.55, SW * 0.60);
const GRID_PAD    = BOARD_SIZE * 0.05;
const SLOT_SIZE   = (BOARD_SIZE - GRID_PAD * 2) / 2;
const PIECE_SIZE  = SLOT_SIZE * 0.62;
const MASCOT_SIZE = Math.min(SH * 0.65, 380);
const SNAP_DIST   = SLOT_SIZE * 0.65; // how close a piece needs to be to snap

const PLAT_V_W = BOARD_SIZE * 0.60;
const PLAT_V_H = BOARD_SIZE * 0.95;
const PLAT_H_W = BOARD_SIZE * 0.95;
const PLAT_H_H = BOARD_SIZE * 0.38;
const PLAT_GAP = 2;

// Top-left corner of each slot, relative to the board's own origin
const SLOT_LOCAL: Record<SlotId, { x: number; y: number }> = {
  tl: { x: GRID_PAD,             y: GRID_PAD },
  tr: { x: GRID_PAD + SLOT_SIZE, y: GRID_PAD },
  bl: { x: GRID_PAD,             y: GRID_PAD + SLOT_SIZE },
  br: { x: GRID_PAD + SLOT_SIZE, y: GRID_PAD + SLOT_SIZE },
};

// Offsets used to crop the completed puzzle image into the correct quadrant per slot
const FULL_IMG_OFFSET: Record<SlotId, { x: number; y: number }> = {
  tl: { x: 0,          y: 0 },
  tr: { x: -SLOT_SIZE, y: 0 },
  bl: { x: 0,          y: -SLOT_SIZE },
  br: { x: -SLOT_SIZE, y: -SLOT_SIZE },
};

const INITIAL_PIECES: PieceDef[] = [
  { id: 0, img: A.piece0, slot: 'tl' },
  { id: 1, img: A.piece1, slot: 'tr' },
  { id: 2, img: A.piece2, slot: 'bl' },
  { id: 3, img: A.piece3, slot: 'br' },
]

// Centre coordinates of the four surrounding platforms, used for scatter positioning
const leftCX  = -(PLAT_GAP + PLAT_V_W / 2);
const rightCX = BOARD_SIZE + PLAT_GAP + PLAT_V_W / 2;
const topCY   = -(PLAT_GAP + PLAT_H_H / 2);
const botCY   = BOARD_SIZE + PLAT_GAP + PLAT_H_H / 2;


// Shows the completed puzzle quadrant underneath a slot once the piece is locked in
const GhostSlot = memo(({ slotId, size, locked }: {
  slotId: SlotId;
  size:   number;
  locked: boolean;
}) => {
  const opacity = useSharedValue(0);

  // Fade in when locked, fade out if somehow unlocked
  useEffect(() => {
    opacity.value = locked
      ? withTiming(1, { duration: 300 })
      : withTiming(0, { duration: 200 });
  }, [locked]);

  const st = useAnimatedStyle(() => ({ opacity: opacity.value }));
  const offset = FULL_IMG_OFFSET[slotId];

  return (
    <Animated.View style={[{ position: 'absolute', width: size, height: size, overflow: 'hidden' }, st]}>
      {/* Render the full puzzle image shifted so only this quadrant shows through the clipped container */}
      <Image
        source={A.full}
        style={{ width: size * 2, height: size * 2, position: 'absolute', left: offset.x, top: offset.y }}
        contentFit="fill"
        transition={0}
        cachePolicy="memory-disk"
      />
    </Animated.View>
  );
});


// A single draggable puzzle piece. Handles its own pan gesture, snap detection, and feedback animations.
const DraggablePiece = memo(({
  piece, size, scatterX, scatterY, boardX, boardY, onCorrect, onWrong,
}: {
  piece:     Piece;
  size:      number;
  scatterX:  number;  // initial position offset from board origin
  scatterY:  number;
  boardX:    number;  // board's absolute screen position (from measureInWindow)
  boardY:    number;
  onCorrect: (id: number) => void;
  onWrong:   () => void;
}) => {
  const tx     = useSharedValue(0);
  const ty     = useSharedValue(0);
  const scale  = useSharedValue(1);
  const zIdx   = useSharedValue(10);
  const startX = useSharedValue(0); // position at the start of each drag
  const startY = useSharedValue(0);

  // Wrap callbacks so they can be called from the UI thread via runOnJS
  const jsCorrect = useCallback((id: number) => onCorrect(id), [onCorrect]);
  const jsWrong   = useCallback(() => onWrong(), [onWrong]);

  const gesture = Gesture.Pan()
    .onBegin(() => {
      if (piece.locked) return;
      startX.value = tx.value;
      startY.value = ty.value;
      scale.value  = withSpring(1.08); // lift effect
      zIdx.value   = 100;              // float above other pieces
      runOnJS(playSound)('puzzlePop');
    })
    .onUpdate((e) => {
      if (piece.locked) return;
      tx.value = startX.value + e.translationX;
      ty.value = startY.value + e.translationY;
    })
    .onEnd(() => {
      if (piece.locked) return;

      // Piece centre in screen coordinates
      const pieceCX = boardX + scatterX + tx.value + size / 2;
      const pieceCY = boardY + scatterY + ty.value + size / 2;

      // Find the nearest slot within snap distance
      const slotIds: SlotId[] = ['tl', 'tr', 'bl', 'br'];
      let nearest: SlotId | null = null;
      let minDist = Infinity;

      for (const id of slotIds) {
        const local  = SLOT_LOCAL[id];
        const slotCX = boardX + local.x + size / 2;
        const slotCY = boardY + local.y + size / 2;
        const dist   = Math.hypot(slotCX - pieceCX, slotCY - pieceCY);
        if (dist < SNAP_DIST && dist < minDist) {
          minDist = dist;
          nearest = id;
        }
      }

      // Too far from any slot — spring back to scatter position
      if (!nearest) {
        tx.value    = withSpring(0);
        ty.value    = withSpring(0);
        scale.value = withSpring(1);
        zIdx.value  = 10;
        return;
      }

      if (nearest === piece.slot) {
        // Correct slot — snap into place and notify parent
        const slotLocal = SLOT_LOCAL[nearest];
        const targetX   = slotLocal.x - scatterX;
        const targetY   = slotLocal.y - scatterY;
        tx.value    = withSpring(targetX, { damping: 15, stiffness: 200 });
        ty.value    = withSpring(targetY, { damping: 15, stiffness: 200 });
        scale.value = withSequence(withSpring(1.05), withSpring(1));
        zIdx.value  = 1;
        runOnJS(playSound)('puzzleDing');
        runOnJS(jsCorrect)(piece.id);
      } else {
        // Wrong slot — shake and spring back
        tx.value = withSequence(
          withTiming(-12, { duration: 50 }),
          withTiming(12,  { duration: 50 }),
          withTiming(-8,  { duration: 50 }),
          withTiming(8,   { duration: 50 }),
          withSpring(0)
        );
        ty.value    = withSpring(0);
        scale.value = withSpring(1);
        zIdx.value  = 10;
        runOnJS(jsWrong)();
      }
    })
    .onFinalize(() => {
      scale.value = withSpring(1); // safety reset if gesture is interrupted
    });

  const st = useAnimatedStyle(() => ({
    transform: [
      { translateX: tx.value },
      { translateY: ty.value },
      { scale:      scale.value },
    ],
    zIndex:  zIdx.value,
    opacity: piece.locked ? 0 : 1, // hide once the ghost slot takes over
  }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={[ss.piece, { width: size, height: size }, st]}>
        <Image
          source={piece.img}
          style={ss.pieceImg}
          contentFit="fill"
          transition={0}
          cachePolicy="memory-disk"
        />
      </Animated.View>
    </GestureDetector>
  );
});


export default function PuzzleGameScreen() {

  // Play level music for the duration of this screen
  useEffect(() => {
    startMusic('levelSelectMusic')
    return () => stopMusic('levelSelectMusic')
  }, [])

  const [pieces, setPieces] = useState<Piece[]>(
    INITIAL_PIECES.map((p) => ({ ...p, locked: false }))
  );
  const [pose, setPose] = useState<Pose>('idle');

  // Black overlay that fades in before navigating away
  const [showBlackFade, setShowBlackFade] = useState(false)
  const blackOpacity = useSharedValue(0)
  const blackFadeStyle = useAnimatedStyle(() => ({ opacity: blackOpacity.value }))

  // measureInWindow needs a ref to the board View
  const boardRef = useRef<View | null>(null);
  const [boardOrigin, setBoardOrigin] = useState({ x: 0, y: 0 });

  const measureBoard = useCallback(() => {
    boardRef.current?.measureInWindow((x, y) => setBoardOrigin({ x, y }));
  }, []);

  const [showFireworks, setShowFireworks] = useState(false)
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([])
  const router = useRouter()

  // Track all timeouts so they can be cleared on unmount if needed
  const addTimeout = useCallback((fn: () => void, delay: number) => {
    const id = setTimeout(fn, delay)
    timeoutsRef.current.push(id)
    return id
  }, [])

  const handleCorrect = useCallback((id: number) => {
    setPieces((prev) => {
      const updated = prev.map((p) => p.id === id ? { ...p, locked: true } : p)

      if (updated.every((p) => p.locked)) {
        // All pieces placed — play correct animation, then run the celebration sequence
        playSound('correct')
        setPose('correct')
        const correctDuration = (ANIMATED_SPRITES.correct.totalFrames / ANIMATED_SPRITES.correct.fps) * 1000

        addTimeout(() => {
          setPose('idle')

          addTimeout(() => {
            playSound('amazing')
            setShowFireworks(true)
            playSound('fireworks')

            // After fireworks, fade to black and navigate to the reward screen
            addTimeout(() => {
              setShowFireworks(false)
              setShowBlackFade(true)
              blackOpacity.value = withTiming(1, { duration: 400 })

              addTimeout(() => {
                stopMusic('levelSelectMusic')
                router.push('../rewards/reward1board')
              }, 400)

            }, 5800)

          }, 50)
        }, correctDuration)

      } else {
        // Partial completion — quick celebrate then back to idle
        playSound('magic')
        setPose('celebrate')
        const duration = (ANIMATED_SPRITES.celebrate.totalFrames / ANIMATED_SPRITES.celebrate.fps) * 1000
        addTimeout(() => setPose('idle'), duration)
      }

      return updated
    })
  }, [addTimeout, router])

  const handleWrong = useCallback(() => {
    playSound('wrong');
    setPose('wrong');
    const duration = (ANIMATED_SPRITES.wrong.totalFrames / ANIMATED_SPRITES.wrong.fps) * 1000;
    setTimeout(() => setPose('idle'), duration);
  }, []);

  // Derive locked slot IDs so GhostSlots know when to fade in
  const lockedSlots = useMemo(
    () => new Set(pieces.filter((p) => p.locked).map((p) => p.slot)),
    [pieces]
  );

  // Where each piece starts — one per surrounding platform (left, right, top, bottom)
  const scatters = [
    { x: leftCX  - PIECE_SIZE / 2, y: BOARD_SIZE * 0.22 - PIECE_SIZE / 2 },
    { x: rightCX - PIECE_SIZE / 2, y: BOARD_SIZE * 0.22 - PIECE_SIZE / 2 },
    { x: BOARD_SIZE * 0.3 - PIECE_SIZE / 2, y: topCY - PIECE_SIZE / 2 },
    { x: BOARD_SIZE * 0.3 - PIECE_SIZE / 2, y: botCY - PIECE_SIZE / 2 },
  ]

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar hidden />
      <View style={ss.root}>
        {/* Looping background video */}
        <Video
          source={A.bg}
          style={StyleSheet.absoluteFill}
          resizeMode={ResizeMode.COVER}
          shouldPlay isLooping isMuted
        />
        <View style={ss.overlay} />

        <View style={ss.layout}>

          {/* Mascot column — reacts to correct/wrong/celebrate events */}
          <View style={ss.mascotCol}>
            <Mascot pose={pose} size={MASCOT_SIZE} />
          </View>

          {/* Puzzle area: board surrounded by four platforms holding the scattered pieces */}
          <View style={ss.boardArea}>

            {/* Top platform — holds piece 1 (tr) */}
            <View style={[ss.platformTop, { width: PLAT_H_W, height: PLAT_H_H }]}>
              <Image source={A.platformTop} style={StyleSheet.absoluteFill} contentFit="fill" cachePolicy="memory-disk" />
              <View style={ss.platformInnerH}>
                <DraggablePiece
                  piece={pieces[1]} size={PIECE_SIZE}
                  scatterX={scatters[2].x} scatterY={scatters[2].y}
                  boardX={boardOrigin.x} boardY={boardOrigin.y}
                  onCorrect={handleCorrect} onWrong={handleWrong}
                />
              </View>
            </View>

            <View style={ss.middleRow}>

              {/* Left platform — holds piece 0 (tl) */}
              <View style={[ss.platformSide, { width: PLAT_V_W, height: PLAT_V_H }]}>
                <Image source={A.platformLeft} style={StyleSheet.absoluteFill} contentFit="fill" cachePolicy="memory-disk" />
                <View style={ss.platformInnerV}>
                  <DraggablePiece
                    piece={pieces[0]} size={PIECE_SIZE}
                    scatterX={scatters[0].x} scatterY={scatters[0].y}
                    boardX={boardOrigin.x} boardY={boardOrigin.y}
                    onCorrect={handleCorrect} onWrong={handleWrong}
                  />
                </View>
              </View>

              {/* The main puzzle board — measures itself after layout so draggables can snap accurately */}
              <View
                ref={boardRef}
                style={{ width: BOARD_SIZE, height: BOARD_SIZE }}
                onLayout={() => setTimeout(measureBoard, 150)}
              >
                <Image source={A.board} style={StyleSheet.absoluteFill} contentFit="fill" cachePolicy="memory-disk" />

                {/* Ghost slots fade in the completed image quadrant when a piece locks */}
                {(['tl', 'tr', 'bl', 'br'] as SlotId[]).map((id) => {
                  const local = SLOT_LOCAL[id];
                  return (
                    <View key={`ghost-${id}`} style={{ position: 'absolute', left: local.x, top: local.y, width: SLOT_SIZE, height: SLOT_SIZE }}>
                      <GhostSlot slotId={id} size={SLOT_SIZE} locked={lockedSlots.has(id)} />
                    </View>
                  );
                })}

                {/* Subtle slot outlines — hidden once the piece locks in */}
                {(['tl', 'tr', 'bl', 'br'] as SlotId[]).map((id) => {
                  const local = SLOT_LOCAL[id];
                  if (lockedSlots.has(id)) return null;
                  return (
                    <View key={`slot-${id}`} style={{
                      position: 'absolute', left: local.x, top: local.y,
                      width: SLOT_SIZE, height: SLOT_SIZE,
                      borderWidth: 1,
                      borderColor: 'rgba(255,255,255,0.15)',
                    }} />
                  );
                })}
              </View>

              {/* Right platform — holds piece 2 (bl) */}
              <View style={[ss.platformSide, { width: PLAT_V_W, height: PLAT_V_H }]}>
                <Image source={A.platformRight} style={StyleSheet.absoluteFill} contentFit="fill" cachePolicy="memory-disk" />
                <View style={ss.platformInnerV}>
                  <DraggablePiece
                    piece={pieces[2]} size={PIECE_SIZE}
                    scatterX={scatters[1].x} scatterY={scatters[1].y}
                    boardX={boardOrigin.x} boardY={boardOrigin.y}
                    onCorrect={handleCorrect} onWrong={handleWrong}
                  />
                </View>
              </View>

            </View>

            {/* Bottom platform — holds piece 3 (br) */}
            <View style={[ss.platformBottom, { width: PLAT_H_W, height: PLAT_H_H }]}>
              <Image source={A.platformBottom} style={StyleSheet.absoluteFill} contentFit="fill" cachePolicy="memory-disk" />
              <View style={ss.platformInnerH}>
                <DraggablePiece
                  piece={pieces[3]} size={PIECE_SIZE}
                  scatterX={scatters[3].x} scatterY={scatters[3].y}
                  boardX={boardOrigin.x} boardY={boardOrigin.y}
                  onCorrect={handleCorrect} onWrong={handleWrong}
                />
              </View>
            </View>

          </View>
        </View>
      </View>

      {/* Full-screen fireworks overlay — plays once on puzzle completion */}
      {showFireworks && (
        <Image
          source={require('@/assets/images/magicaltransition1.webp')}
          style={[StyleSheet.absoluteFillObject, { zIndex: 9999 }]}
          contentFit="cover"
          autoplay
          loop={false}
          pointerEvents="none"
        />
      )}

      {/* Black fade overlay — animates in before navigating to the reward screen */}
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
    </GestureHandlerRootView>
  );
}


export const ss = ScaledSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#180900',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.18)', // slight darkening over the video bg
  },
  layout: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: '16@s',
  },
  mascotCol: {
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: '-40@s', // tuck mascot slightly under the board area
    marginTop: '30@vs',
  },
  boardArea: {
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: '60@s',
  },
  middleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  platformSide: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  platformTop: {
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: PLAT_GAP,
    alignSelf: 'center',
  },
  platformBottom: {
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: PLAT_GAP,
    alignSelf: 'center',
  },
  platformInnerV: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 10,
  },
  platformInnerH: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'flex-start',
    paddingRight: 110,
  },
  piece: {
    overflow: 'hidden',
  },
  pieceImg: {
    width: '100%',
    height: '100%',
  },
});