import { Ionicons } from "@expo/vector-icons";
import { Modal, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInUp, ZoomIn } from "react-native-reanimated";

import { Colors } from "@/constants/colors";

interface LoginSuccessModalProps {
  visible: boolean;
  username: string;
}

export function LoginSuccessModal({ visible, username }: LoginSuccessModalProps) {
  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={styles.backdrop}>
        <Animated.View
          entering={FadeInUp.duration(400).springify().damping(16)}
          style={styles.card}
        >
          <Animated.View
            entering={ZoomIn.delay(150).duration(500).springify().damping(9)}
            style={styles.iconRing}
          >
            <View style={styles.iconCircle}>
              <Ionicons name="checkmark" size={32} color="#FFFFFF" />
            </View>
          </Animated.View>
          <Text style={styles.title}>Login Successful</Text>
          <Text style={styles.message}>
            Welcome back, <Text style={styles.username}>{username}</Text>! Taking
            you to your dashboard...
          </Text>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 30, 20, 0.55)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 320,
    backgroundColor: Colors.surface,
    borderRadius: 26,
    paddingVertical: 30,
    paddingHorizontal: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 10,
  },
  iconRing: {
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: Colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: Colors.primary,
    shadowOpacity: 0.4,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 6,
  },
  title: { fontSize: 19, fontWeight: "700", color: Colors.text, marginBottom: 8 },
  message: {
    fontSize: 13.5,
    lineHeight: 20,
    color: Colors.textMuted,
    textAlign: "center",
  },
  username: { fontWeight: "700", color: Colors.text },
});
