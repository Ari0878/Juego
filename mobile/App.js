// App.js
import React from "react";
import { StatusBar } from "expo-status-bar";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { SafeAreaProvider } from "react-native-safe-area-context";
import HomeScreen from "./app/HomeScreen";
import WaitingScreen from "./app/WaitingScreen";
import GameScreen from "./app/GameScreen";
import { COLORS } from "./config";

const Stack = createStackNavigator();

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <StatusBar style="light" backgroundColor={COLORS.bg} />
        <Stack.Navigator
          initialRouteName="Home"
          screenOptions={{
            headerStyle: { backgroundColor: COLORS.bg },
            headerTintColor: COLORS.textPrimary,
            headerTitleStyle: { fontWeight: "800", letterSpacing: 2 },
            cardStyle: { backgroundColor: COLORS.bg },
            headerBackTitle: "",
          }}
        >
          <Stack.Screen
            name="Home"
            component={HomeScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Waiting"
            component={WaitingScreen}
            options={{ title: "SALA DE ESPERA", headerLeft: null }}
          />
          <Stack.Screen
            name="Game"
            component={GameScreen}
            options={{ title: "HANGMAN DUEL", headerLeft: null }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
