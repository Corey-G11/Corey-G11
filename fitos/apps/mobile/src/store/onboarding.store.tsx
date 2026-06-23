import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import type { MacroTargets, OnboardingData } from '@fitos/shared';

type OnboardingState = Partial<OnboardingData>;

interface OnboardingContextValue {
  data: OnboardingState;
  setField: <K extends keyof OnboardingData>(
    key: K,
    value: OnboardingData[K],
  ) => void;
  setFields: (partial: Partial<OnboardingData>) => void;
  reset: () => void;
  macros: MacroTargets | null;
  setMacros: (macros: MacroTargets | null) => void;
  accessToken: string | null;
  setAccessToken: (token: string | null) => void;
}

const OnboardingContext = createContext<OnboardingContextValue | undefined>(
  undefined,
);

export function OnboardingProvider({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  const [data, setData] = useState<OnboardingState>({});
  const [macros, setMacros] = useState<MacroTargets | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  const setField = useCallback(
    <K extends keyof OnboardingData>(key: K, value: OnboardingData[K]) => {
      setData((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const setFields = useCallback((partial: Partial<OnboardingData>) => {
    setData((prev) => ({ ...prev, ...partial }));
  }, []);

  const reset = useCallback(() => {
    setData({});
    setMacros(null);
    setAccessToken(null);
  }, []);

  const value = useMemo<OnboardingContextValue>(
    () => ({
      data,
      setField,
      setFields,
      reset,
      macros,
      setMacros,
      accessToken,
      setAccessToken,
    }),
    [data, setField, setFields, reset, macros, accessToken],
  );

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding(): OnboardingContextValue {
  const ctx = useContext(OnboardingContext);
  if (!ctx) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return ctx;
}
