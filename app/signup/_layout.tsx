import { SignupProvider } from "@/contexts/signup-context";
import { Stack } from "expo-router";

export default function SignupLayout() {
  return (
    <SignupProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </SignupProvider>
  );
}
