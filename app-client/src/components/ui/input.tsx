import React from "react";
import {
  View,
  TextInput,
  TextInputProps,
  StyleSheet,
} from "react-native";
import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightElement?: React.ReactNode;
  containerClassName?: string;
}

export function Input({
  label,
  error,
  leftIcon,
  rightElement,
  containerClassName,
  className,
  ...props
}: InputProps) {
  return (
    <View className={cn("gap-1.5", containerClassName)}>
      {label && (
        <Text className="text-sm font-medium text-foreground">{label}</Text>
      )}
      <View
        className={cn(
          "flex-row items-center rounded-xl border bg-input px-4",
          error ? "border-destructive" : "border-border",
          "focus-within:border-primary"
        )}
        style={styles.inputContainer}
      >
        {leftIcon && (
          <View className="mr-3 opacity-50">{leftIcon}</View>
        )}
        <TextInput
          placeholderTextColor="#6B7897"
          className={cn(
            "flex-1 py-3.5 text-base text-foreground",
            className
          )}
          style={styles.input}
          {...props}
        />
        {rightElement && (
          <View className="ml-2">{rightElement}</View>
        )}
      </View>
      {error && (
        <Text className="text-xs text-destructive">{error}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  inputContainer: {
    minHeight: 52,
  },
  input: {
    fontSize: 16,
    includeFontPadding: false,
  },
});
