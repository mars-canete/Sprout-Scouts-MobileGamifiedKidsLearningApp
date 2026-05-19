import { ScaledSheet } from "react-native-size-matters";
import { Dimensions } from "react-native";

console.log(Dimensions.get("window").width);
const { width: SCREEN_WIDTH } = Dimensions.get("window");
const isSmallScreen = SCREEN_WIDTH < 700;


export const styles = ScaledSheet.create({
  backgroundImage: {
    flex: 1,
  },

  // Home Screen
  homeButtonContainer: {
    position: 'absolute',
    bottom: '1%',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
    elevation: 10,
  },

  homeButtonImage: {
    width: '170@s',
    height: '60@vs',
  },


  // Levels
  videoBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },

  Safe: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },

  gamecontainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "center",
    marginLeft: isSmallScreen ? -90 : -30,
    flex: 1,
    marginTop: "80@vs",
  },

  characterSprite: {
    width: "220@s",
    height: "320@vs",
    overflow: "visible",
    marginBottom: "10@vs",
    alignSelf: "flex-end",
    marginRight: "-30@s",
    marginLeft: "-30@s",
  },

  gamepad: {
    flexDirection: "column",
    width: "435@s",
    height: "300@vs",
    alignItems: "center",
    justifyContent: "flex-start",
    marginVertical: "25@vs",
    paddingRight: "10@s",
  },

  optionsBox: {
    width: "70@s",
    height: "250@vs",
    backgroundColor: "rgba(0, 0, 0, 0.60)",
    borderRadius: "10@s",
    marginLeft: "5@s",
    flexDirection: "column",
    justifyContent: "space-evenly",
    alignItems: "center",
    alignSelf: "center",
  },

  gamepadWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: "center",
  },

  optionItem: {
    alignItems: "center",
    justifyContent: "center",
    position: 'relative',
    width: "70@s",
    height: "55@vs",
  },

  optionIcon: {
    width: "70@s",
    height: "55@vs",
  },

  optionNumber: {
    position: "absolute",
    color: "#F1FCAA",
    fontSize: "35@s",
    fontFamily: "BelweBold",
    textShadowColor: "#542115",
    textShadowOffset: { width: 1.5, height: 1.5 },
    textShadowRadius: 2,
  },

  equation: {
    flexDirection: "row",
    alignItems: 'center',
    justifyContent: "center",
    width: "100%",
    marginTop: "18@vs",
    marginLeft: "5@s",
    columnGap: 0,
  },

  numbers: {
    marginTop: "-2@vs",
  },

  operators: {
    marginTop: "-2@vs",
  },

  answerBox: {
    alignItems: "center",
    justifyContent: "center",
  },

  answerbox: {
    width: "58@s",
    height: "58@s",
    marginLeft: "10@s",
    marginTop: "3@s",
  },


  // Reward Screen
  gemsContainer: {
    position: 'absolute',
    bottom: '130@vs',
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: "16@s",
    paddingHorizontal: "20@s",
    zIndex: 10,
    elevation: 10,
  },

  gemWrapper: {
    width: "160@s",
    height: "160@s",
    alignItems: "center",
    justifyContent: "center",
    overflow: 'hidden',
  },

  gemImage: {
    width: "100%",
    height: "100%",
  },

  buttonContainer: {
    position: 'absolute',
    bottom: '8%',
    alignSelf: 'center',
    zIndex: 10,
    elevation: 10,
  },

  buttonImage: {
    width: "280@s",
    height: "70@vs",
  },

  rewardImage: {
    width: "90%",
    height: "90%",
    position: 'absolute',
  },


  // Reward Board
  rewardBoardContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: '15@vs',
    zIndex: 10000,
    elevation: 10000,
  },

  rewardBoard: {
    width: '70%',
    aspectRatio: 1.777,
    marginBottom: '110@vs',
  },

  continueButton: {
    position: 'absolute',
    bottom: '11%',
    alignSelf: 'center',
    zIndex: 10000,
    elevation: 10000,
  },

  continueButtonImage: {
    width: '150@s',
    height: '43@vs',
  },

  claimButtonContainer: {
    position: 'absolute',
    bottom: '8%',
    alignSelf: 'center',
  },

  claimButtonImage: {
    width: '320@s',
    height: '80@vs',
  },
});