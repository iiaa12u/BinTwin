import { useEffect } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { getDriverLoggedIn } from "../../lib/session";

export default function RouteCompletePage() {
  const router = useRouter();

  useEffect(() => {
    if (!getDriverLoggedIn()) {
      router.dismissAll();
      router.replace("/login");
    }
  }, [router]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Route Complete</Text>

        <Text style={styles.subtitle}>
          All assigned stops have been processed successfully.
        </Text>

        <Pressable
          style={styles.button}
          onPress={() => router.dismissAll()}
        >
          <Text style={styles.buttonText}>Done</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f1f5f9",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    backgroundColor: "white",
    borderRadius: 24,
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#0f172a",
    textAlign: "center",
  },
  subtitle: {
    color: "#64748b",
    fontSize: 15,
    textAlign: "center",
    marginTop: 12,
    marginBottom: 24,
  },
  button: {
    backgroundColor: "#10b981",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "700",
  },
});