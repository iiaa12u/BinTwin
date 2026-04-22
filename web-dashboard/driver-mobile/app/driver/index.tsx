import { useEffect } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { getDriverLoggedIn, setDriverLoggedIn } from "../../lib/session";

export default function DriverHomePage() {
  const router = useRouter();

  useEffect(() => {
    if (!getDriverLoggedIn()) {
      router.dismissAll();
      router.replace("/login");
    }
  }, [router]);

  const stops = [
    { id: "1", binId: "BIN-4532", fillPct: 78, distance: "0.5 km", eta: "4 min" },
    { id: "2", binId: "BIN-1123", fillPct: 92, distance: "0.8 km", eta: "7 min" },
    { id: "3", binId: "BIN-2345", fillPct: 60, distance: "0.9 km", eta: "8 min" },
    { id: "4", binId: "BIN-9102", fillPct: 70, distance: "1.2 km", eta: "11 min" },
  ];

  function handleLogout() {
    setDriverLoggedIn(false);
    router.dismissAll();
    router.replace("/login");
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Today’s Route</Text>

          <Pressable style={styles.logoutBtn} onPress={handleLogout}>
            <Text style={styles.logoutText}>Logout</Text>
          </Pressable>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Total Stops</Text>
            <Text style={styles.cardValue}>5</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardLabel}>Est. Duration</Text>
            <Text style={styles.cardValue}>2h 45m</Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Bins to Collect</Text>
            <Text style={styles.cardValue}>28</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardLabel}>Truck Capacity</Text>
            <Text style={styles.cardValue}>65%</Text>
          </View>
        </View>

        <View style={styles.routeCard}>
          {stops.map((stop, index) => (
            <View key={stop.id} style={styles.stopRow}>
              <View style={styles.stopLeft}>
                <View style={styles.stopNumber}>
                  <Text style={styles.stopNumberText}>{index + 1}</Text>
                </View>

                <View>
                  <Text style={styles.stopTitle}>{stop.binId}</Text>
                  <Text style={styles.stopSubtitle}>Fill: {stop.fillPct}%</Text>
                </View>
              </View>

              <View>
                <Text style={styles.stopMeta}>{stop.distance}</Text>
                <Text style={styles.stopMeta}>{stop.eta}</Text>
              </View>
            </View>
          ))}

          <Pressable
            style={styles.startButton}
            onPress={() => router.push("/driver/active")}
          >
            <Text style={styles.startButtonText}>Start Route</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f1f5f9",
  },
  content: {
    padding: 20,
    paddingTop: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 30,
    fontWeight: "700",
    color: "#0f172a",
  },
  logoutBtn: {
    backgroundColor: "#fee2e2",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  logoutText: {
    color: "#b91c1c",
    fontWeight: "600",
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  card: {
    flex: 1,
    backgroundColor: "#ecfdf5",
    borderRadius: 18,
    padding: 16,
  },
  cardLabel: {
    fontSize: 12,
    color: "#475569",
  },
  cardValue: {
    fontSize: 24,
    fontWeight: "700",
    color: "#0f172a",
    marginTop: 8,
  },
  routeCard: {
    marginTop: 8,
    backgroundColor: "white",
    borderRadius: 22,
    padding: 16,
  },
  stopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
  },
  stopLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  stopNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#0f172a",
    alignItems: "center",
    justifyContent: "center",
  },
  stopNumberText: {
    color: "white",
    fontWeight: "700",
    fontSize: 12,
  },
  stopTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0f172a",
  },
  stopSubtitle: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 2,
  },
  stopMeta: {
    fontSize: 12,
    color: "#64748b",
    textAlign: "right",
  },
  startButton: {
    backgroundColor: "#0f172a",
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
  },
  startButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "700",
  },
});