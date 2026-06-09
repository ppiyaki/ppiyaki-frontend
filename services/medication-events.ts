import { DeviceEventEmitter } from "react-native";

export const MEDICATION_UPDATED_EVENT = "medication:updated";

export function emitMedicationUpdated() {
  DeviceEventEmitter.emit(MEDICATION_UPDATED_EVENT);
}
