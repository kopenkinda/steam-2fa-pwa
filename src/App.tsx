import { ChevronRightIcon } from "lucide-react";
import {
  useAccounts,
  useSelectAccount,
  useSelectedAccount,
} from "./account-store";
import { AddAccountButton } from "./components/add-acount";
import { AuthCode } from "./components/code";
import { cn } from "./lib/utils";

function App() {
  const accounts = useAccounts();
  return (
    <main className="flex flex-col relative">
      <header className="h-12 border-b flex justify-between items-center px-4 sticky top-0">
        <span>Accounts: {accounts.length}</span>
        <AddAccountButton />
      </header>
      <AuthCode />
      <AccountList />
    </main>
  );
}

function AccountList() {
  const accounts = useAccounts();
  const selectedAccount = useSelectedAccount();
  const selectAccount = useSelectAccount();
  return (
    <div className="flex flex-col w-full">
      {accounts.map((account) => (
        <div
          key={account.key}
          className={cn(
            "p-4 border-b w-full flex items-center justify-between",
            {
              "bg-muted": selectedAccount === account,
            }
          )}
          onClick={() => selectAccount(account.key)}
        >
          <span>{account.alias}</span>
          <ChevronRightIcon />
        </div>
      ))}
    </div>
  );
}

export default App;
