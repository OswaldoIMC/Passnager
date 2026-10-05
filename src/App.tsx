import React from "react";
import { StatusBar } from "expo-status-bar";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { RootStackParamList } from "./types";

// ----- Pantallas -----
import SplashScreen from "./screens/SplashScreen";
import SetupBoveda from "./screens/SetupBoveda";
import LoginBoveda from "./screens/LoginBoveda";
import VaultScreen from "./screens/VaultScreen";
// import AddPasswordScreen from './screens/AddPasswordScreen';

// ----- Navegacion -----
const Stack = createStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="light" />
      <Stack.Navigator
        initialRouteName="Splash"
        screenOptions={{
          headerShown: false, // Cada pantalla maneja su propio header
          cardStyle: { backgroundColor: "#0D1117" },
          // Transición deslizante suave
          cardStyleInterpolator: ({ current, next, layouts }) => ({
            cardStyle: {
              opacity: current.progress,
              transform: [
                {
                  translateX: current.progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [layouts.screen.width * 0.15, 0],
                  }),
                },
              ],
            },
            overlayStyle: {
              opacity: next
                ? next.progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 0.5],
                  })
                : 0,
            },
          }),
        }}
      >
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="SetupBoveda" component={SetupBoveda} />
        <Stack.Screen name="LoginBoveda" component={LoginBoveda} />
        <Stack.Screen name="Vault" component={VaultScreen} />
        {/* <Stack.Screen name="AddPassword" component={AddPasswordScreen}/> */}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
