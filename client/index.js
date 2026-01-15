import "./shim";
import "react-native-get-random-values";
import { Platform } from "react-native";

if (Platform.OS !== "web") {
  const { registerGlobals } = require("react-native-webrtc");
  registerGlobals();
}

import { registerRootComponent } from "expo";

import App from "@/App";

registerRootComponent(App);
