import { AccountsManager } from "@/components/accounts-manager";

export const dynamic = "force-dynamic";

export default function AccountsPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">Trading Accounts</h1>
      <AccountsManager />
    </div>
  );
}
