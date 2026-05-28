import AppText from "@/components/app-text";
import { Ionicons } from "@expo/vector-icons";
import {
  Image,
  ImageSourcePropType,
  Pressable,
  StyleSheet,
  View,
} from "react-native";

interface Props {
  name: string;
  caregiver: string;
  daysLeft: number;
  image: ImageSourcePropType;
  /** 시니어가 여러 명일 때 선택 드롭다운 트리거. 미지정 시 chevron 안 보임. */
  onPressName?: () => void;
}

export default function SeniorSummaryHeader({
  name,
  caregiver,
  daysLeft,
  image,
  onPressName,
}: Props) {
  return (
    <View style={styles.row}>
      <View style={styles.avatarRing}>
        <Image source={image} style={styles.avatar} resizeMode="cover" />
      </View>
      <View style={styles.info}>
        <Pressable
          onPress={onPressName}
          disabled={!onPressName}
          hitSlop={6}
          style={({ pressed }) => [
            styles.nameRow,
            pressed && onPressName && { opacity: 0.6 },
          ]}
        >
          <AppText
            type="pretendard-b"
            style={styles.name}
            numberOfLines={1}
          >
            {name} 님 복약 현황
          </AppText>
          {onPressName && (
            <Ionicons name="chevron-down" size={18} color="#666" />
          )}
        </Pressable>
        <View style={styles.subRow}>
          <AppText
            type="pretendard-m"
            style={styles.caregiver}
            numberOfLines={1}
          >
            보호자: {caregiver}님
          </AppText>
          <View style={styles.daysBadge}>
            <AppText
              type="pretendard-m"
              style={styles.daysLabel}
              numberOfLines={1}
            >
              약 잔여량:{" "}
            </AppText>
            <AppText type="extrabold" style={styles.daysNum}>
              {daysLeft}일
            </AppText>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatarRing: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#FFF",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#F1ECDB",
  },
  avatar: {
    width: "100%",
    height: "100%",
  },
  info: {
    flex: 1,
    gap: 6,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  name: {
    fontSize: 17,
    color: "#222",
    flexShrink: 1,
  },
  subRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  caregiver: {
    flexShrink: 1,
    fontSize: 13,
    color: "#777",
  },
  daysBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF4C7",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  daysLabel: {
    fontSize: 11,
    color: "#5A4500",
  },
  daysNum: {
    fontSize: 13,
    color: "#E14B4B",
  },
});
