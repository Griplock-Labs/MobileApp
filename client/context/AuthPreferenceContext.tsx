import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import * as SecureStore from "expo-secure-store";
import { AuthLevel } from "../components/AuthLevelModal";

export { AuthLevel };

const AUTH_LEVEL_KEY = "griplock_auth_level";
const AUTH_SECRET_KEY = "griplock_auth_secret";
const FIRST_LAUNCH_KEY = "griplock_first_launch";

interface AuthPreferenceContextType {
  authLevel: AuthLevel | null;
  hasSecret: boolean;
  isFirstLaunch: boolean;
  isLoading: boolean;
  setAuthLevel: (level: AuthLevel) => Promise<void>;
  setSecret: (secret: string) => Promise<void>;
  getSecret: () => Promise<string | null>;
  clearSecret: () => Promise<void>;
  completeFirstLaunch: () => Promise<void>;
  requiresSecret: boolean;
}

const AuthPreferenceContext = createContext<AuthPreferenceContextType | undefined>(undefined);

export function AuthPreferenceProvider({ children }: { children: ReactNode }) {
  const [authLevel, setAuthLevelState] = useState<AuthLevel | null>(null);
  const [hasSecret, setHasSecret] = useState(false);
  const [isFirstLaunch, setIsFirstLaunch] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const [storedLevel, storedSecret, firstLaunchFlag] = await Promise.all([
        SecureStore.getItemAsync(AUTH_LEVEL_KEY),
        SecureStore.getItemAsync(AUTH_SECRET_KEY),
        SecureStore.getItemAsync(FIRST_LAUNCH_KEY),
      ]);

      if (storedLevel) {
        setAuthLevelState(storedLevel as AuthLevel);
      }
      setHasSecret(!!storedSecret);
      setIsFirstLaunch(firstLaunchFlag !== "completed");
    } catch (error) {
      console.error("Error loading auth preferences:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const setAuthLevel = async (level: AuthLevel) => {
    try {
      await SecureStore.setItemAsync(AUTH_LEVEL_KEY, level);
      setAuthLevelState(level);
      // Secret persists across auth level changes - user can switch modes without re-entering
    } catch (error) {
      console.error("Error saving auth level:", error);
      throw error;
    }
  };

  const setSecret = async (secret: string) => {
    try {
      await SecureStore.setItemAsync(AUTH_SECRET_KEY, secret);
      setHasSecret(true);
    } catch (error) {
      console.error("Error saving secret:", error);
      throw error;
    }
  };

  const getSecret = async (): Promise<string | null> => {
    try {
      return await SecureStore.getItemAsync(AUTH_SECRET_KEY);
    } catch (error) {
      console.error("Error getting secret:", error);
      return null;
    }
  };

  const clearSecret = async () => {
    try {
      await SecureStore.deleteItemAsync(AUTH_SECRET_KEY);
      setHasSecret(false);
    } catch (error) {
      console.error("Error clearing secret:", error);
    }
  };

  const completeFirstLaunch = async () => {
    try {
      await SecureStore.setItemAsync(FIRST_LAUNCH_KEY, "completed");
      setIsFirstLaunch(false);
    } catch (error) {
      console.error("Error completing first launch:", error);
    }
  };

  const requiresSecret = authLevel === "nfc_secret" || authLevel === "nfc_pin_secret";

  return (
    <AuthPreferenceContext.Provider
      value={{
        authLevel,
        hasSecret,
        isFirstLaunch,
        isLoading,
        setAuthLevel,
        setSecret,
        getSecret,
        clearSecret,
        completeFirstLaunch,
        requiresSecret,
      }}
    >
      {children}
    </AuthPreferenceContext.Provider>
  );
}

export function useAuthPreference() {
  const context = useContext(AuthPreferenceContext);
  if (!context) {
    throw new Error("useAuthPreference must be used within AuthPreferenceProvider");
  }
  return context;
}
