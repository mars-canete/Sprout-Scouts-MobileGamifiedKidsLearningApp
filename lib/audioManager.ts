import { Audio } from 'expo-av'
import { AppState } from 'react-native'

export type SoundKey =
  | 'bg' | 'rewardsMusic' | 'levelSelectMusic' | 'correct' | 'wrong'
  | 'v3' | 'vPlus' | 'v4' | 'vEquals' | 'v7' | 'v5' | 'v8'
  | 'fireworks' | 'greatJob' | 'magic'| 'amazing'
  | 'gemCrack' | 'chestSound' | 'greetJob' | 'buttonPop'
  | 'answer' | 'habitat2Music' | 'habitat3Music' | 'habitat4Music' | 'habitat5Music' | 'puzzlePop' | 'puzzleDing' | 'loadingMusic' | 'menuMusic'

// Tuple: [key, source, volume, loop]
const SOUND_SOURCES: [SoundKey, any, number, boolean][] = [
  ['bg',           require('@/assets/sounds/background.mp3'),       0.6,  true],
  ['rewardsMusic', require('@/assets/sounds/rewardsmusic.mp3'),     1.0,  true],
  ['correct',      require('@/assets/sounds/jump.mp3'),             1.0,  false],
  ['wrong',        require('@/assets/sounds/wongsound.mp3'),        1.0,  false],
  ['v3',           require('@/assets/sounds/3.mp3'),                1.0,  false],
  ['vPlus',        require('@/assets/sounds/plus.mp3'),             1.0,  false],
  ['v4',           require('@/assets/sounds/4.mp3'),                1.0,  false],
  ['vEquals',      require('@/assets/sounds/equals.mp3'),           1.0,  false],
  ['v7',           require('@/assets/sounds/7.mp3'),                1.0,  false],
  ['v5',           require('@/assets/sounds/5.mp3'),                1.0,  false],
  ['menuMusic',    require('@/assets/sounds/menumusic.mp3'),        0.7,  true],
  ['v8',           require('@/assets/sounds/8.mp3'),                1.0,  false],
  ['fireworks',    require('@/assets/sounds/fireworkseffects.mp3'), 1.0,  false],
  ['greatJob',     require('@/assets/sounds/greatjob.mp3'),         1.0,  false],
  ['magic',        require('@/assets/sounds/magicsound.mp3'),       1.0,  false],
  ['gemCrack',     require('@/assets/sounds/gemcrack_sound.mp3'),   1.0,  false],
  ['chestSound',   require('@/assets/sounds/chestsound.mp3'),       1.0,  false],
  ['greetJob',     require('@/assets/sounds/Greetjob.mp3'),         1.0,  false],
  ['loadingMusic', require('@/assets/sounds/loading.mp3'),          1.0,  true],
  ['buttonPop',    require('@/assets/sounds/buttonpop.mp3'),        1.0,  false],
  ['answer',       require('@/assets/sounds/answer.mp3'),           1.0,  false],
  ['levelSelectMusic', require('@/assets/sounds/backgroundsounds/mysteical.mp3'),  0.5, true],
  ['habitat2Music',    require('@/assets/sounds/backgroundsounds/dinousarsound.mp3'), 0.5, true],
  ['habitat3Music',    require('@/assets/sounds//backgroundsounds/ocean.mp3'),        0.5, true],
  ['habitat4Music',    require('@/assets/sounds//backgroundsounds/medieval.mp3'),     0.5, true],
  ['habitat5Music',    require('@/assets/sounds//backgroundsounds/future.mp3'),       0.5, true],
  ['amazing',    require('@/assets/sounds/amazing.mp3'),   1.0, false],
  ['puzzlePop',  require('@/assets/sounds/presspop.mp3'),  1.0, false],
  ['puzzleDing', require('@/assets/sounds/ding.mp3'),      1.0, false],
]

// All loaded Audio.Sound instances keyed by SoundKey
const players: Partial<Record<SoundKey, Audio.Sound>> = {}

let initialized  = false
let initPromise: Promise<void> | null = null

// Sequential sound queue state
let queue: SoundKey[] = []
let queueRunning = false

// Configure the audio session (silent mode, ducking, etc.)
async function setupSession(): Promise<void> {
  await Audio.setAudioModeAsync({
    playsInSilentModeIOS: true,
    staysActiveInBackground: false,
    shouldDuckAndroid: true,
    playThroughEarpieceAndroid: false,
    allowsRecordingIOS: false,
  })
}


// Fire-and-forget play — skips awaiting init, ideal for immediate UI feedback like button taps
export function playSoundInstant(key: SoundKey): void {
  const snd = players[key]
  if (!snd) return
  snd.setPositionAsync(0).then(() => snd.playAsync()).catch(() => {})
}


// (Re)load a single sound from its source definition — used as a fallback if a sound unloads
async function loadSound(key: SoundKey): Promise<void> {
  const entry = SOUND_SOURCES.find(([k]) => k === key)
  if (!entry) return
  const [, source, vol, loop] = entry
  try {
    const { sound } = await Audio.Sound.createAsync(
      source,
      { volume: vol, shouldPlay: false, isLooping: loop }
    )
    players[key] = sound
  } catch (e) {
    console.warn(`[audio] failed to reload ${key}:`, e)
  }
}

// Load all sounds upfront and set up the audio session.
// Guards against double-init with a shared promise.
export async function initAudio(): Promise<void> {
  if (initialized) return
  if (initPromise) return initPromise

  initPromise = (async () => {
    try {
      await setupSession()
      await new Promise((r) => setTimeout(r, 150)) // brief delay avoids iOS audio glitches on cold start

      // Load every sound in parallel
      await Promise.all(
        SOUND_SOURCES.map(async ([key, source, vol, loop]) => {
          try {
            const { sound } = await Audio.Sound.createAsync(
              source,
              { volume: vol, shouldPlay: false, isLooping: loop }
            )
            players[key] = sound
          } catch (e) {
            console.warn(`[audio] failed to load ${key}:`, e)
          }
        })
      )

      // Silent warmup play to prime the audio engine and reduce first-play latency
      try {
        const warmup = players['v3']
        if (warmup) {
          await warmup.setVolumeAsync(0)
          await warmup.playAsync()
          await warmup.stopAsync()
          await warmup.setVolumeAsync(1.0)
        }
      } catch (_) {}

      // Resume background music if the app returns to the foreground
      AppState.addEventListener('change', (state) => {
        if (state === 'active') {
          setupSession().then(() => {
            const bg = players['bg']
            if (!bg) return
            bg.getStatusAsync().then((status) => {
              if (status.isLoaded && !status.isPlaying) {
                bg.playAsync().catch(() => {})
              }
            }).catch(() => {})
          }).catch(() => {})
        }
      })

      initialized = true
    } catch (e) {
      console.warn('[audio] init failed:', e)
      initPromise = null // allow a retry on next call
    }
  })()

  return initPromise
}

// Play a sound effect, reloading it first if it has been unloaded by the OS
export async function playSound(key: SoundKey): Promise<void> {
  await initPromise
  let snd = players[key]

  if (!snd) {
    console.warn(`[audio] playSound: ${key} not loaded, reloading...`)
    await loadSound(key)
    snd = players[key]
    if (!snd) return
  } else {
    // Sound exists in the map but may have been unloaded by the OS
    try {
      const status = await snd.getStatusAsync()
      if (!status.isLoaded) {
        console.warn(`[audio] playSound: ${key} unloaded, reloading...`)
        await loadSound(key)
        snd = players[key]
        if (!snd) return
      }
    } catch (_) {
      await loadSound(key)
      snd = players[key]
      if (!snd) return
    }
  }

  try {
    await snd.setPositionAsync(0)
    await snd.playAsync()
  } catch (e) {
    console.warn(`[audio] playSound failed for ${key}:`, e)
  }
}


// Start a looping music track, reloading it if needed
export async function startMusic(
  key: 'bg' | 'rewardsMusic' | 'levelSelectMusic' | 'habitat2Music' | 'habitat3Music' | 'habitat4Music' | 'habitat5Music' | 'loadingMusic' | 'menuMusic' = 'bg'
): Promise<void> {
  await initPromise
  let snd = players[key]

  // Reload if missing or unloaded
  if (!snd) {
    await loadSound(key)
    snd = players[key]
    if (!snd) return
  }

  try {
    const status = await snd.getStatusAsync()
    if (!status.isLoaded) {
      await loadSound(key)
      snd = players[key]
      if (!snd) return
    }
  } catch (_) {
    await loadSound(key)
    snd = players[key]
    if (!snd) return
  }

  try {
    await snd.setIsLoopingAsync(true)
    await snd.setPositionAsync(0)
    await snd.playAsync()
  } catch (e) {
    console.warn(`[audio] startMusic failed for ${key}:`, e)
  }
}

// Pause a music track (keeps it loaded so it can resume quickly)
export async function stopMusic(
  key: 'bg' | 'rewardsMusic' | 'levelSelectMusic' | 'habitat2Music' | 'habitat3Music' | 'habitat4Music' | 'habitat5Music' | 'loadingMusic' | 'menuMusic' = 'bg'
): Promise<void> {
  try {
    await players[key]?.pauseAsync()
  } catch (_) {}
}

// Pull the next key off the queue and play it; calls itself recursively when each sound finishes
function advanceQueue(): void {
  if (queue.length === 0) {
    queueRunning = false
    return
  }
  queueRunning = true
  const key = queue.shift()!
  const snd = players[key]
  if (!snd) { advanceQueue(); return } // skip missing sounds

  snd.setOnPlaybackStatusUpdate((status) => {
    if (!status.isLoaded) return
    if (status.didJustFinish) {
      snd.setOnPlaybackStatusUpdate(null)
      advanceQueue()
    }
  })

  snd.setPositionAsync(0)
    .then(() => snd.playAsync())
    .catch(() => advanceQueue()) // keep the queue moving even on error
}

// Add one or more sounds to the sequential playback queue
export function enqueueSound(...keys: SoundKey[]): void {
  queue.push(...keys)
  if (!queueRunning) advanceQueue()
}

// Wipe the queue and stop listening for playback events on queued sounds
export function clearQueue(): void {
  queue.forEach((key) => {
    try { players[key]?.setOnPlaybackStatusUpdate(null) } catch (_) {}
  })
  queue = []
  queueRunning = false
}