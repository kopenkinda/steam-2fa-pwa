import { useState } from "react";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { useAddAccount } from "../account-store";
import { PlusIcon } from "lucide-react";
import { Input } from "./ui/input";

export function AddAccountButton() {
  const [open, setOpen] = useState(false);

  const [accountAlias, setAccountAlias] = useState("");
  const [accountKey, setAccountKey] = useState("");

  const addAccount = useAddAccount();

  return (
    <Dialog open={open} onOpenChange={(isOpen) => setOpen(isOpen)}>
      <DialogTrigger asChild>
        <Button
          size="icon"
          onClick={() => {
            setOpen(true);
          }}
          variant="secondary"
        >
          <PlusIcon />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add account</DialogTitle>
          <DialogDescription>Add a new account to the app.</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            addAccount({
              alias: accountAlias,
              key: accountKey,
            });
            setAccountAlias("");
            setAccountKey("");
            setOpen(false);
          }}
          className="grid gap-4 py-4"
        >
          <Input
            value={accountAlias}
            onChange={(e) => setAccountAlias(e.target.value)}
            placeholder="Account name"
          />
          <Input
            value={accountKey}
            onChange={(e) => setAccountKey(e.target.value)}
            placeholder="Account key"
            type="password"
          />
          <Button type="submit">Add account</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
