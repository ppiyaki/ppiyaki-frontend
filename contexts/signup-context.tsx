import { createContext, ReactNode, useContext, useState } from "react";

export type Gender = "남" | "여" | null;

export interface Senior {
  id: string;
  name: string;
  gender: Gender;
}

export type CareMode = "intensive" | "basic";

export interface IssuedCode {
  seniorId: number;
  nickname: string;
  inviteCode: string | null;
  /** 코드 발급 실패 시 사유 (재시도 안내용) */
  error: string | null;
}

interface SignupContextValue {
  nickname: string;
  setNickname: (v: string) => void;
  seniors: Senior[];
  setSeniors: (v: Senior[]) => void;
  careModes: Record<string, CareMode>;
  setCareMode: (seniorId: string, mode: CareMode) => void;
  issuedCodes: IssuedCode[];
  setIssuedCodes: (v: IssuedCode[]) => void;
  updateIssuedCode: (seniorId: number, patch: Partial<IssuedCode>) => void;
}

const SignupContext = createContext<SignupContextValue | null>(null);

export function SignupProvider({ children }: { children: ReactNode }) {
  const [nickname, setNickname] = useState("");
  const [seniors, setSeniors] = useState<Senior[]>([]);
  const [careModes, setCareModes] = useState<Record<string, CareMode>>({});
  const [issuedCodes, setIssuedCodes] = useState<IssuedCode[]>([]);

  const setCareMode = (seniorId: string, mode: CareMode) => {
    setCareModes((prev) => ({ ...prev, [seniorId]: mode }));
  };

  const updateIssuedCode = (seniorId: number, patch: Partial<IssuedCode>) => {
    setIssuedCodes((prev) =>
      prev.map((c) => (c.seniorId === seniorId ? { ...c, ...patch } : c)),
    );
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
        issuedCodes,
        setIssuedCodes,
        updateIssuedCode,
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
