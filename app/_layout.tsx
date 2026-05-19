import 'react-native-gesture-handler'
import { useFonts } from 'expo-font'
import { Stack } from 'expo-router'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { useEffect } from 'react'
import { initAudio } from '@/lib/audioManager'
import { TransitionProvider } from '@/lib/TransitionContext'
import { Image as ExpoImage } from 'expo-image'



export default function RootLayout() {
  const [loaded, error] = useFonts({
    BelweBold: require('../assets/fonts/fonts/BelweBold.otf'),
  })

  // set up audio on app start
  useEffect(() => {
    initAudio()
  }, [])

  // wait for fonts before rendering
  if (!loaded && !error) return null

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <TransitionProvider>
        <Stack
          screenOptions={{
            headerShown: false,
            animation: 'none',          // custom transitions handled manually
            detachPreviousScreen: true,  // unmount previous screen to free memory
            freezeOnBlur: true,          // pause off-screen screens
          }}
        >
          <Stack.Screen name="intro" />
          <Stack.Screen name="index" />
          <Stack.Screen name="menu" />
          <Stack.Screen name="puzzle" />
          <Stack.Screen name="habitat1" />
          <Stack.Screen name="habitat2" />
          <Stack.Screen name="habitat3" />
          <Stack.Screen name="habitat4" />
          <Stack.Screen name="habitat5" />
          <Stack.Screen name="level1" />
          <Stack.Screen name="level2" />
          <Stack.Screen name="level3" />
          <Stack.Screen name="level4" />
          <Stack.Screen name="rewards/reward1" />
          <Stack.Screen name="rewards/reward1claim" />
          <Stack.Screen name="rewards/reward1board" />
        </Stack>
      </TransitionProvider>
    </GestureHandlerRootView>
  )
}