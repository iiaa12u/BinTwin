import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import { setDriverLoggedIn } from "../lib/session";

function isDriverRole(value: unknown) {
  const role = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

  return (
    role === "truck_driver" ||
    role === "driver" ||
    role.includes("driver")
  );
}

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin() {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("http://172.20.10.2:3000/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const text = await res.text();
      let data: any = null;

      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        setError("Server returned invalid response.");
        setLoading(false);
        return;
      }

      if (!res.ok) {
        setError(data?.error || "Login failed");
        setLoading(false);
        return;
      }

      const possibleRole =
        data?.user?.role ??
        data?.role ??
        data?.userRole ??
        data?.user?.userRole ??
        "";

      if (!isDriverRole(possibleRole)) {
        setError(
          `This app is for drivers only. Role received: ${String(
            possibleRole || "UNKNOWN"
          )}`
        );
        setLoading(false);
        return;
      }

      setDriverLoggedIn(true);
      router.dismissAll();
      router.replace("/driver");
    } catch (err) {
      setError("Network error. Make sure backend is running.");
    }

    setLoading(false);
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        {/* ✅ Logo */}
        <Image
          source={require("../assets/images/bintwin-logo.png")}
          style={styles.logo}
          resizeMode="contain"
        />

        {/* Title */}
        <Text style={styles.title}>Driver Portal</Text>

        <Text style={styles.subtitle}>
          Sign in to access your assigned waste collection route.
        </Text>

        <Text style={styles.label}>Email</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="driver@bintwin.com"
          placeholderTextColor="#94a3b8"
          autoCapitalize="none"
          style={styles.input}
        />

        <Text style={styles.label}>Password</Text>
        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="Enter password"
          placeholderTextColor="#94a3b8"
          secureTextEntry
          style={styles.input}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          style={styles.button}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.buttonText}>Sign In</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f172a",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    backgroundColor: "#111827",
    borderRadius: 24,
    padding: 24,
  },
  logo: {
    width: 120,
    height: 120,
    alignSelf: "center",
    marginBottom: 16,
  },
  title: {
    color: "white",
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
  },
  subtitle: {
    color: "#cbd5e1",
    fontSize: 14,
    textAlign: "center",
    marginTop: 8,
    marginBottom: 24,
  },
  label: {
    color: "#e5e7eb",
    fontSize: 14,
    marginBottom: 6,
    marginTop: 8,
  },
  input: {
    backgroundColor: "#1e293b",
    color: "white",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 8,
  },
  error: {
    color: "#fca5a5",
    marginTop: 8,
    marginBottom: 8,
    textAlign: "center",
  },
  button: {
    backgroundColor: "#10b981",
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 16,
    alignItems: "center",
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "700",
  },
});