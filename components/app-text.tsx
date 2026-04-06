import React from "react";
import { StyleSheet, Text, TextProps } from "react-native";

interface AppTextProps extends TextProps {
  type?:
    | "bold"
    | "medium"
    | "regular"
    | "semibold"
    | "extrabold"
    | "light"
    | "extralight"
    | "thin"
    | "pretendard-r"
    | "pretendard-m"
    | "pretendard-s"
    | "pretendard-b";
}

const AppText: React.FC<AppTextProps> = ({
  type = "pretendard-b",
  style,
  children,
  ...rest
}) => {
  let fontFamilyName = "";
  const resolvedType = type as NonNullable<AppTextProps["type"]>;

  switch (resolvedType) {
    case "bold":
      fontFamilyName = "Pretendard-Bold";
      break;
    case "medium":
      fontFamilyName = "Pretendard-Medium";
      break;
    case "regular":
      fontFamilyName = "Pretendard-Regular";
      break;
    case "semibold":
      fontFamilyName = "Pretendard-SemiBold";
      break;
    case "extrabold":
      fontFamilyName = "Pretendard-ExtraBold";
      break;
    case "light":
      fontFamilyName = "Pretendard-Light";
      break;
    case "extralight":
      fontFamilyName = "Pretendard-ExtraLight";
      break;
    case "thin":
      fontFamilyName = "Pretendard-Thin";
      break;
    case "pretendard-r":
      fontFamilyName = "Pretendard-Regular";
      break;
    case "pretendard-m":
      fontFamilyName = "Pretendard-Medium";
      break;
    case "pretendard-s":
      fontFamilyName = "Pretendard-SemiBold";
      break;
    case "pretendard-b":
      fontFamilyName = "Pretendard-Bold";
      break;
  }

  return (
    <Text
      style={[{ fontFamily: fontFamilyName }, styles.base, style]}
      {...rest}
    >
      {children}
    </Text>
  );
};

const styles = StyleSheet.create({
  base: {
    fontSize: 16,
    color: "#333333",
    includeFontPadding: false,
  },
});

export { AppText };
export default AppText;
