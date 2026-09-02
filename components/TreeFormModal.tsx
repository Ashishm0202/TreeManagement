import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { Colors } from "@/constants/colors";
import type { Tree, TreeFormValues } from "@/types/tree";

type LocationStatus = "idle" | "loading" | "error";

interface TreeFormModalProps {
  visible: boolean;
  editingTree: Tree | null;
  claimedTree?: Tree | null;
  isSubmitting?: boolean;
  submitError?: string | null;
  onClose: () => void;
  onSubmit: (input: TreeFormValues) => void;
}

const emptyForm: TreeFormValues = {
  TreeName: "",
  TreeDesc: "",
  LongDesc: "",
  Age: "",
  Radius: "",
  Lattitude: "",
  Longitude: "",
};

export function TreeFormModal({
  visible,
  editingTree,
  claimedTree,
  isSubmitting,
  submitError,
  onClose,
  onSubmit,
}: TreeFormModalProps) {
  const [form, setForm] = useState<TreeFormValues>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [locationStatus, setLocationStatus] = useState<LocationStatus>("idle");
  const [locationError, setLocationError] = useState<string | null>(null);
  const submitScale = useSharedValue(1);
  const submitAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: submitScale.value }],
  }));

  const applyCoords = useCallback((latitude: number, longitude: number) => {
    setForm((prev) => ({
      ...prev,
      Lattitude: latitude.toFixed(6),
      Longitude: longitude.toFixed(6),
    }));
    setErrors((prev) => ({ ...prev, location: "" }));
    setLocationStatus("idle");
  }, []);

  const fetchCurrentLocation = useCallback(async () => {
    setLocationStatus("loading");
    setLocationError(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setLocationStatus("error");
        setLocationError(
          "Location permission denied. Enable it in your device settings, or enter coordinates manually."
        );
        return;
      }

      // Fast path: a recent cached fix resolves near-instantly.
      const lastKnown = await Location.getLastKnownPositionAsync({ maxAge: 60000 });
      if (lastKnown) {
        applyCoords(lastKnown.coords.latitude, lastKnown.coords.longitude);
        return;
      }

      // Fallback: request a fresh fix, but don't wait forever for a GPS lock.
      const position = await Promise.race([
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Location request timed out.")), 6000)
        ),
      ]);

      applyCoords(position.coords.latitude, position.coords.longitude);
    } catch {
      setLocationStatus("error");
      setLocationError(
        "Couldn't get your location quickly. Make sure location services are on, or enter coordinates manually."
      );
    }
  }, [applyCoords]);

  useEffect(() => {
    if (!visible) return;

    setForm(
      editingTree
        ? {
            TreeName: editingTree.TreeName,
            TreeDesc: editingTree.TreeDesc,
            LongDesc: editingTree.LongDesc,
            Age: editingTree.Age != null ? String(editingTree.Age) : "",
            Radius: editingTree.Radius != null ? String(editingTree.Radius) : "",
            Lattitude: String(editingTree.Lattitude),
            Longitude: String(editingTree.Longitude),
          }
        : emptyForm
    );
    setErrors({});
    setLocationStatus("idle");
    setLocationError(null);
  }, [visible, editingTree]);

  const setField = (key: keyof TreeFormValues, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const validate = () => {
    const nextErrors: Record<string, string> = {};
    if (!form.TreeName.trim()) nextErrors.TreeName = "Tree name is required.";

    const lat = Number(form.Lattitude);
    const lng = Number(form.Longitude);
    if (
      !form.Lattitude.trim() ||
      !form.Longitude.trim() ||
      Number.isNaN(lat) ||
      Number.isNaN(lng)
    ) {
      nextErrors.location = "Location isn't available yet. Please retry detection.";
    }

    if (form.Age.trim() && Number.isNaN(Number(form.Age))) {
      nextErrors.Age = "Age must be a number.";
    }

    if (form.Radius.trim() && Number.isNaN(Number(form.Radius))) {
      nextErrors.Radius = "Radius must be a number.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    onSubmit({
      TreeName: form.TreeName.trim(),
      TreeDesc: form.TreeDesc.trim(),
      LongDesc: form.LongDesc.trim(),
      Age: form.Age.trim(),
      Radius: form.Radius.trim(),
      Lattitude: form.Lattitude.trim(),
      Longitude: form.Longitude.trim(),
    });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.sheetWrap}
        >
          <View style={styles.sheet}>
            <View style={styles.handle} />
            <View style={styles.headerRow}>
              <View>
                <Text style={styles.title}>
                  {editingTree ? "Edit Tree" : "Add New Tree"}
                </Text>
                {editingTree?.TreeID || claimedTree?.TreeID ? (
                  <Text style={styles.treeIdHint}>
                    ID: {editingTree?.TreeID ?? claimedTree?.TreeID}
                  </Text>
                ) : null}
              </View>
              <Pressable onPress={onClose} hitSlop={10}>
                <Ionicons name="close" size={24} color={Colors.textMuted} />
              </Pressable>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <Field
                label="Tree Name"
                icon="leaf-outline"
                placeholder="e.g. Golden Neem"
                value={form.TreeName}
                onChangeText={(v) => setField("TreeName", v)}
                error={errors.TreeName}
              />

              <Pressable
                style={({ pressed }) => [
                  styles.locationButton,
                  pressed && styles.locationButtonPressed,
                ]}
                onPress={fetchCurrentLocation}
                disabled={locationStatus === "loading"}
              >
                <View style={styles.locationButtonIconWrap}>
                  {locationStatus === "loading" ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Ionicons name="locate" size={26} color="#FFFFFF" />
                  )}
                </View>
                <Text style={styles.locationButtonText}>
                  {locationStatus === "loading"
                    ? "Fetching current location..."
                    : "Use My Current Location"}
                </Text>
              </Pressable>
              {locationError ? (
                <Text style={styles.locationErrorText}>{locationError}</Text>
              ) : null}

              <View style={styles.row}>
                <View style={styles.half}>
                  <Field
                    label="Latitude"
                    icon="navigate-outline"
                    placeholder="e.g. 28.613900"
                    value={form.Lattitude}
                    onChangeText={(v) => setField("Lattitude", v)}
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.half}>
                  <Field
                    label="Longitude"
                    icon="navigate-outline"
                    placeholder="e.g. 77.209000"
                    value={form.Longitude}
                    onChangeText={(v) => setField("Longitude", v)}
                    keyboardType="numeric"
                  />
                </View>
              </View>
              {errors.location ? (
                <Text style={styles.errorText}>{errors.location}</Text>
              ) : null}

              <View style={styles.row}>
                <View style={styles.half}>
                  <Field
                    label="Age (years)"
                    icon="calendar-outline"
                    placeholder="e.g. 5"
                    value={form.Age}
                    onChangeText={(v) => setField("Age", v)}
                    keyboardType="numeric"
                    error={errors.Age}
                  />
                </View>
                <View style={styles.half}>
                  <Field
                    label="Radius (m)"
                    icon="resize-outline"
                    placeholder="e.g. 2.5"
                    value={form.Radius}
                    onChangeText={(v) => setField("Radius", v)}
                    keyboardType="numeric"
                    error={errors.Radius}
                  />
                </View>
              </View>

              <Field
                label="Description"
                icon="document-text-outline"
                placeholder="Short summary of this tree"
                value={form.TreeDesc}
                onChangeText={(v) => setField("TreeDesc", v)}
                multiline
              />

              <Field
                label="Details"
                icon="information-circle-outline"
                placeholder="Species, health, planting notes..."
                value={form.LongDesc}
                onChangeText={(v) => setField("LongDesc", v)}
                multiline
                numberOfLines={4}
              />
            </ScrollView>

            {submitError ? (
              <Text style={styles.submitErrorText}>{submitError}</Text>
            ) : null}

            <Animated.View style={submitAnimatedStyle}>
              <Pressable
                style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
                onPress={handleSubmit}
                onPressIn={() => {
                  submitScale.value = withTiming(0.97, { duration: 100 });
                }}
                onPressOut={() => {
                  submitScale.value = withTiming(1, { duration: 150 });
                }}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Ionicons
                    name={editingTree ? "checkmark-circle-outline" : "add-circle-outline"}
                    size={20}
                    color="#FFFFFF"
                  />
                )}
                <Text style={styles.submitButtonText}>
                  {isSubmitting
                    ? "Saving..."
                    : editingTree
                      ? "Save Changes"
                      : "Add Tree"}
                </Text>
              </Pressable>
            </Animated.View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

interface FieldProps {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  placeholder: string;
  value: string;
  onChangeText: (value: string) => void;
  error?: string;
  multiline?: boolean;
  numberOfLines?: number;
  keyboardType?: "default" | "numeric";
}

function Field({
  label,
  icon,
  placeholder,
  value,
  onChangeText,
  error,
  multiline,
  numberOfLines,
  keyboardType = "default",
}: FieldProps) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View
        style={[
          styles.inputGroup,
          multiline && styles.inputGroupMultiline,
          error && styles.inputGroupError,
        ]}
      >
        <Ionicons
          name={icon}
          size={18}
          color={Colors.textMuted}
          style={multiline ? styles.multilineIcon : undefined}
        />
        <TextInput
          style={[styles.input, multiline && styles.inputMultiline]}
          placeholder={placeholder}
          placeholderTextColor={Colors.textMuted}
          value={value}
          onChangeText={onChangeText}
          multiline={multiline}
          numberOfLines={numberOfLines}
          keyboardType={keyboardType}
          textAlignVertical={multiline ? "top" : "center"}
        />
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 30, 20, 0.45)",
    justifyContent: "flex-end",
  },
  sheetWrap: { maxHeight: "90%" },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 24,
    maxHeight: "100%",
  },
  handle: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: Colors.border,
    alignSelf: "center",
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  title: { fontSize: 19, fontWeight: "700", color: Colors.text },
  treeIdHint: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  fieldWrap: { marginBottom: 14 },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.textMuted,
    marginBottom: 6,
  },
  locationButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    borderWidth: 1.5,
    borderColor: Colors.primaryLight,
    backgroundColor: Colors.primarySoft,
    borderRadius: 14,
    height: 60,
    paddingHorizontal: 14,
    marginBottom: 10,
  },
  locationButtonPressed: { opacity: 0.75 },
  locationButtonIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  locationButtonText: { flex: 1, fontSize: 14.5, fontWeight: "700", color: Colors.primary },
  locationErrorText: {
    fontSize: 11.5,
    color: Colors.danger,
    marginBottom: 10,
    textAlign: "center",
  },
  row: { flexDirection: "row", gap: 12 },
  half: { flex: 1 },
  inputGroup: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
    backgroundColor: Colors.background,
    gap: 8,
  },
  inputGroupMultiline: { height: undefined, alignItems: "flex-start", paddingVertical: 10 },
  inputGroupError: { borderColor: Colors.danger },
  multilineIcon: { marginTop: 2 },
  input: { flex: 1, fontSize: 14, color: Colors.text, height: "100%" },
  inputMultiline: { height: undefined, minHeight: 60 },
  errorText: { fontSize: 11, color: Colors.danger, marginTop: 4, marginBottom: 10 },
  submitErrorText: {
    fontSize: 12,
    color: Colors.danger,
    textAlign: "center",
    marginBottom: 10,
  },
  submitButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: 14,
    height: 52,
    marginTop: 6,
  },
  submitButtonDisabled: { opacity: 0.7 },
  submitButtonText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
});
