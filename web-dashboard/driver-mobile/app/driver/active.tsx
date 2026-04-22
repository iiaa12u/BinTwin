import { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { getDriverLoggedIn, setDriverLoggedIn } from "../../lib/session";

type StopStatus = "pending" | "current" | "completed" | "issue";

type Stop = {
  id: string;
  binId: string;
  placeName: string;
  fillPct: number;
  distance: string;
  eta: string;
  status: StopStatus;
};

export default function ActiveRoutePage() {
  const router = useRouter();

  const [stops, setStops] = useState<Stop[]>([
    {
      id: "1",
      binId: "BIN-4532",
      placeName: "Library",
      fillPct: 78,
      distance: "0.5 km",
      eta: "4 min",
      status: "current",
    },
    {
      id: "2",
      binId: "BIN-1123",
      placeName: "Supermarket",
      fillPct: 92,
      distance: "0.8 km",
      eta: "7 min",
      status: "pending",
    },
    {
      id: "3",
      binId: "BIN-2345",
      placeName: "Dining Halls",
      fillPct: 60,
      distance: "0.9 km",
      eta: "8 min",
      status: "pending",
    },
    {
      id: "4",
      binId: "BIN-9102",
      placeName: "Deanships",
      fillPct: 70,
      distance: "1.2 km",
      eta: "11 min",
      status: "pending",
    },
  ]);

  useEffect(() => {
    if (!getDriverLoggedIn()) {
      router.dismissAll();
      router.replace("/login");
    }
  }, [router]);

  const currentStop = useMemo(
    () => stops.find((s) => s.status === "current") || null,
    [stops]
  );

  function handleLogout() {
    setDriverLoggedIn(false);
    router.dismissAll();
    router.replace("/login");
  }

  function moveToNextStop(newStatus: StopStatus) {
    if (!currentStop) return;

    const updated = [...stops];
    const index = updated.findIndex((s) => s.id === currentStop.id);

    updated[index] = {
      ...updated[index],
      status: newStatus,
      fillPct: newStatus === "completed" ? 0 : updated[index].fillPct,
    };

    const nextIndex = updated.findIndex((s) => s.status === "pending");

    if (nextIndex !== -1) {
      updated[nextIndex] = {
        ...updated[nextIndex],
        status: "current",
      };
    }

    setStops(updated);

    const hasCurrent = updated.some((s) => s.status === "current");

    if (!hasCurrent) {
      router.dismissAll();
      router.replace("/driver/complete");
    }
  }

  if (!currentStop) return null;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Active Route</Text>

          <Pressable style={styles.logoutBtn} onPress={handleLogout}>
            <Text style={styles.logoutText}>Logout</Text>
          </Pressable>
        </View>

        <View style={styles.currentCard}>
          <Text style={styles.stepText}>Current Stop</Text>

          <Text style={styles.binId}>{currentStop.binId}</Text>

          <Text style={styles.place}>{currentStop.placeName}</Text>

          <View style={styles.infoRow}>
            <Info label={`Fill ${currentStop.fillPct}%`} />
            <Info label={currentStop.distance} />
            <Info label={currentStop.eta} />
          </View>

          <Pressable style={styles.navButton}>
            <Text style={styles.navText}>Navigate</Text>
          </Pressable>
        </View>

        <View style={styles.progressCard}>
          <Text style={styles.sectionTitle}>Route Progress</Text>

          {stops.map((stop, i) => (
            <View key={stop.id} style={styles.progressRow}>
              <View>
                <Text style={styles.progressTitle}>
                  {i + 1}. {stop.binId}
                </Text>
                <Text style={styles.progressSub}>{stop.placeName}</Text>
              </View>

              <Text style={styles.statusText}>
                {stop.status.toUpperCase()}
              </Text>
            </View>
          ))}
        </View>

        <Pressable
          style={styles.primaryBtn}
          onPress={() => moveToNextStop("completed")}
        >
          <Text style={styles.primaryText}>Mark as Collected</Text>
        </Pressable>

        <Pressable
          style={styles.secondaryBtn}
          onPress={() => moveToNextStop("issue")}
        >
          <Text style={styles.secondaryText}>Report Issue</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function Info({ label }: { label: string }) {
  return (
    <View style={styles.infoPill}>
      <Text style={styles.infoText}>{label}</Text>
    </View>
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
    fontSize: 28,
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
  currentCard: {
    backgroundColor: "white",
    borderRadius: 22,
    padding: 20,
  },
  stepText: {
    color: "#64748b",
    fontSize: 12,
  },
  binId: {
    fontSize: 30,
    fontWeight: "700",
    marginTop: 8,
    color: "#0f172a",
  },
  place: {
    color: "#475569",
    marginTop: 4,
  },
  infoRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
  },
  infoPill: {
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  infoText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#0f172a",
  },
  navButton: {
    backgroundColor: "#e2e8f0",
    borderRadius: 12,
    paddingVertical: 12,
    marginTop: 16,
    alignItems: "center",
  },
  navText: {
    fontWeight: "600",
    color: "#0f172a",
  },
  progressCard: {
    marginTop: 16,
    backgroundColor: "white",
    borderRadius: 22,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 10,
    color: "#0f172a",
  },
  progressRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  progressTitle: {
    fontWeight: "600",
    color: "#0f172a",
  },
  progressSub: {
    fontSize: 12,
    color: "#64748b",
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#0f172a",
  },
  primaryBtn: {
    backgroundColor: "#0f172a",
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 16,
  },
  primaryText: {
    color: "white",
    fontWeight: "700",
  },
  secondaryBtn: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 10,
    backgroundColor: "white",
  },
  secondaryText: {
    fontWeight: "700",
    color: "#0f172a",
  },
});