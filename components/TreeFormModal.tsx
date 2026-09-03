import DateTimePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useCallback, useEffect, useMemo, useState } from "react";
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
import { toFormValues } from "@/contexts/TreeContext";
import type { GetTree, TreeFormValues } from "@/types/tree";
import {
  ageFromDob,
  formatDateLabel,
  parseDateInput,
  toDateInputFromDate,
} from "@/utils/date";

type LocationStatus = "idle" | "loading" | "error";

interface TreeFormModalProps {
  visible: boolean;
  editingTree: GetTree | null;
  claimedTree?: GetTree | null;
  isSubmitting?: boolean;
  submitError?: string | null;
  onClose: () => void;
  onSubmit: (input: TreeFormValues) => void;
}

const emptyForm: TreeFormValues = {
  TreeName: "",
  TreeDesc: "",
  LongDesc: "",
  Dob: "",
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
  const [isPickingDob, setIsPickingDob] = useState(false);

  /**
   * A tree that already has coordinates keeps them. The position is recorded
   * once, standing at the tree; re-detecting it later from somewhere else would
   * quietly move the tree. Coordinates of exactly 0 count as "never recorded",
   * so rows saved before location capture existed can still be fixed.
   */
  const isLocationLocked = useMemo(() => {
    const hasCoord = (value: number | null) => value != null && value !== 0;
    return !!editingTree && hasCoord(editingTree.Lattitude) && hasCoord(editingTree.Longitude);
  }, [editingTree]);
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

    setForm(editingTree ? toFormValues(editingTree) : emptyForm);
    setErrors({});
    setLocationStatus("idle");
    setLocationError(null);
    setIsPickingDob(false);
  }, [visible, editingTree]);

  // Age is never typed in: picking a date is what sets it, always against today.
  const applyDob = useCallback((day: string) => {
    setForm((prev) => ({
      ...prev,
      Dob: day,
      Age: day ? String(ageFromDob(day) ?? "") : "",
    }));
    setErrors((prev) => ({ ...prev, Dob: "" }));
  }, []);

  const handleDobChange = useCallback(
    (event: DateTimePickerEvent, date?: Date) => {
      // Android puts the picker in a system dialog that owns its own dismissal;
      // on iOS it is inline, so it stays until the field is tapped again.
      if (Platform.OS === "android") setIsPickingDob(false);
      if (event.type === "set" && date) applyDob(toDateInputFromDate(date));
    },
    [applyDob]
  );

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
      Dob: form.Dob,
      Age: form.Age.trim(),
      Radius: form.Radius.trim(),
      Lattitude: form.Lattitude.trim(),
      Longitude: form.Longitude.trim(),
    });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        // The avoider has to own the whole backdrop: sized to the sheet, it has
        // no spare height to give up when the keyboard opens.
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.sheetWrap}>
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
              keyboardDismissMode="on-drag"
              contentContainerStyle={styles.scrollContent}
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
                  pressed && !isLocationLocked && styles.locationButtonPressed,
                  isLocationLocked && styles.locationButtonLocked,
                ]}
                onPress={fetchCurrentLocation}
                disabled={isLocationLocked || locationStatus === "loading"}
              >
                <View
                  style={[
                    styles.locationButtonIconWrap,
                    isLocationLocked && styles.locationButtonIconWrapLocked,
                  ]}
                >
                  {locationStatus === "loading" ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Ionicons
                      name={isLocationLocked ? "lock-closed" : "locate"}
                      size={isLocationLocked ? 20 : 26}
                      color="#FFFFFF"
                    />
                  )}
                </View>
                <Text
                  style={[
                    styles.locationButtonText,
                    isLocationLocked && styles.locationButtonTextLocked,
                  ]}
                >
                  {isLocationLocked
                    ? "Location already recorded for this tree"
                    : locationStatus === "loading"
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
                    placeholder="Detected"
                    value={form.Lattitude}
                    onChangeText={(v) => setField("Lattitude", v)}
                    keyboardType="numeric"
                    readOnly
                  />
                </View>
                <View style={styles.half}>
                  <Field
                    label="Longitude"
                    icon="navigate-outline"
                    placeholder="Detected"
                    value={form.Longitude}
                    onChangeText={(v) => setField("Longitude", v)}
                    keyboardType="numeric"
                    readOnly
                  />
                </View>
              </View>
              {errors.location ? (
                <Text style={styles.errorText}>{errors.location}</Text>
              ) : null}

              <View style={styles.fieldWrap}>
                <Text style={styles.fieldLabel}>Date of Birth</Text>
                <Pressable
                  style={({ pressed }) => [
                    styles.inputGroup,
                    pressed && styles.inputGroupPressed,
                  ]}
                  onPress={() => setIsPickingDob((open) => !open)}
                >
                  <Ionicons name="calendar-outline" size={18} color={Colors.textMuted} />
                  <Text
                    style={[styles.valueText, !form.Dob && styles.valuePlaceholder]}
                    numberOfLines={1}
                  >
                    {form.Dob ? formatDateLabel(form.Dob) : "Select the planting date"}
                  </Text>
                  {form.Dob ? (
                    <Pressable onPress={() => applyDob("")} hitSlop={10}>
                      <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
                    </Pressable>
                  ) : (
                    <Ionicons name="chevron-down" size={16} color={Colors.textMuted} />
                  )}
                </Pressable>
              </View>

              {isPickingDob ? (
                <View style={Platform.OS === "ios" ? styles.iosPickerWrap : undefined}>
                  <DateTimePicker
                    value={parseDateInput(form.Dob) ?? new Date()}
                    mode="date"
                    display={Platform.OS === "ios" ? "inline" : "default"}
                    maximumDate={new Date()}
                    accentColor={Platform.OS === "ios" ? Colors.primary : undefined}
                    onChange={handleDobChange}
                  />
                </View>
              ) : null}

              <View style={styles.row}>
                <View style={styles.half}>
                  <View style={styles.fieldWrap}>
                    <Text style={styles.fieldLabel}>Age (years)</Text>
                    <View style={[styles.inputGroup, styles.inputGroupReadOnly]}>
                      <Ionicons name="time-outline" size={18} color={Colors.textMuted} />
                      <Text
                        style={[styles.valueText, !form.Age && styles.valuePlaceholder]}
                        numberOfLines={1}
                      >
                        {form.Age
                          ? `${form.Age} ${form.Age === "1" ? "year" : "years"}`
                          : "Set a date of birth"}
                      </Text>
                      <Ionicons name="lock-closed" size={13} color={Colors.textMuted} />
                    </View>
                  </View>
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
        </View>
      </KeyboardAvoidingView>
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
  /** Shown, but filled in by the app rather than typed. */
  readOnly?: boolean;
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
  readOnly,
}: FieldProps) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View
        style={[
          styles.inputGroup,
          multiline && styles.inputGroupMultiline,
          readOnly && styles.inputGroupReadOnly,
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
          style={[
            styles.input,
            multiline && styles.inputMultiline,
            readOnly && styles.inputReadOnly,
          ]}
          placeholder={placeholder}
          placeholderTextColor={Colors.textMuted}
          value={value}
          onChangeText={onChangeText}
          editable={!readOnly}
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
  scrollContent: { paddingBottom: 8 },
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
  locationButtonLocked: {
    borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  locationButtonIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  locationButtonIconWrapLocked: { width: 34, height: 34, borderRadius: 17, backgroundColor: Colors.textMuted },
  locationButtonText: { flex: 1, fontSize: 14.5, fontWeight: "700", color: Colors.primary },
  locationButtonTextLocked: { fontSize: 13.5, fontWeight: "600", color: Colors.textMuted },
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
  inputGroupPressed: { borderColor: Colors.primaryLight, backgroundColor: Colors.primarySoft },
  // Derived, not typed: flat fill and no focus affordance, so it doesn't invite
  // a tap the way the editable fields do.
  inputGroupReadOnly: { backgroundColor: Colors.border, borderColor: Colors.border },
  valueText: { flex: 1, fontSize: 14, color: Colors.text },
  valuePlaceholder: { color: Colors.textMuted },
  iosPickerWrap: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 14,
    backgroundColor: Colors.background,
    paddingHorizontal: 4,
    paddingVertical: 6,
    marginBottom: 14,
  },
  multilineIcon: { marginTop: 2 },
  input: { flex: 1, fontSize: 14, color: Colors.text, height: "100%" },
  inputReadOnly: { color: Colors.textMuted },
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
