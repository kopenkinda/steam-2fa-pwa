import { useEffect, useState } from "react";
import { useSelectedAccount } from "../account-store";

export function AuthCode() {
  const [generatedCode, setGeneratedCode] = useState<string>("");
  const selectedAccount = useSelectedAccount();

  useEffect(() => {
    if (selectedAccount === null) {
      return;
    }

    const getNewCode = async () => {
      const code = await selectedAccount.code();
      setGeneratedCode(code);
    };
    getNewCode();
    const iv = setInterval(getNewCode, 1000);

    return () => clearInterval(iv);
  }, [selectedAccount]);

  return (
    <div className="h-40 border-b flex flex-col items-start p-8 justify-center">
      {selectedAccount !== null ? (
        <>
          <span className="text-muted-foreground">{selectedAccount.alias}</span>
          <span className="font-black text-2xl tracking-widest">
            {generatedCode}
          </span>
        </>
      ) : (
        <b className="text-muted-foreground text-lg">
          Please select an account
        </b>
      )}
    </div>
  );
}
