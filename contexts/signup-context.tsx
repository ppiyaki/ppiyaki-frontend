import { createContext, ReactNode, useContext, useState } from "react";

export type Gender = "남" | "여" | "비공개" | null;

export interface Senior {
  id: string;
  name: string;
  gender: Gender;
}

export type CareMode = "intensive" | "basic";

interface SignupContextValue {
  nickname: string;
  setNickname: (v: string) => void;
  seniors: Senior[];
  setSeniors: (v: Senior[]) => void;
  careModes: Record<string, CareMode>;
  setCareMode: (seniorId: string, mode: CareMode) => void;
}

const SignupContext = createContext<SignupContextValue | null>(null);

export function SignupProvider({ children }: { children: ReactNode }) {
  const [nickname, setNickname] = useState("");
  const [seniors, setSeniors] = useState<Senior[]>([]);
  const [careModes, setCareModes] = useState<Record<string, CareMode>>({});

  const setCareMode = (seniorId: string, mode: CareMode) => {
    setCareModes((prev) => ({ ...prev, [seniorId]: mode }));
  };

  return (
    <SignupContext.Provider
      value={{
        nickname,
        setNickname,
        seniors,
        setSeniors,
        careModes,
        setCareMode,
      }}
    >
      {children}
    </SignupContext.Provider>
  );
}

export function useSignup() {
  const ctx = useContext(SignupContext);
  if (!ctx) {
    throw new Error("useSignup must be used within SignupProvider");
  }
  return ctx;
}
