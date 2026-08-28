import { Stack } from "expo-router";
import React from "react";
import { useFonts, Roboto_400Regular, Roboto_500Medium, Roboto_700Bold } from "@expo-google-fonts/roboto";
import { ErrorProvider } from "../shared/context/ErrorContext";
import ErrorModal from "../shared/components/ModalError";

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    "Roboto-Regular": Roboto_400Regular,
    "Roboto-Medium": Roboto_500Medium,
    "Roboto-Bold": Roboto_700Bold,
  });

  if (!fontsLoaded) {
    return null;
  }

  return (
    <ErrorProvider>
      <ErrorModal />

      <Stack screenOptions={{ headerShown: false }}>

        <Stack.Screen name="login" />

        <Stack.Screen name="index" />
      </Stack>
    </ErrorProvider>
  );
}