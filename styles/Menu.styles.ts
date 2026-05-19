import { ScaledSheet } from "react-native-size-matters";

export const menuStyles = ScaledSheet.create({

  // Container
  container: {
    flex: 1,
    backgroundColor: 'black',
  },

  // Left Panel
  leftPanel: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: '320@s',
    justifyContent: 'flex-start',
    paddingLeft: '50@s',
    paddingTop: '0@vs',
    gap: 0,
  },

  // Title Sign
  titleSign: {
    width: '260@s',
    height: '122@vs',
    alignSelf: 'flex-start',
    marginBottom: '-5@vs',
  },

  // Menu List
  menuList: {
    gap: '2@vs',
    alignItems: 'center',
  },

  // Menu Item
  menuItemWrapper: {
    width: '180@s',
  },

  signImage: {
    width: '170@s',
    height: '35@vs',
  },

  // HUD
  hud: {
    position: 'absolute',
    top: '15@vs',
    right: '0@s',
    width: '140@s',
    height: '110@vs',
  },

});