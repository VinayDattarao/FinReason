import { getUserAccounts } from "@/actions/dashboard";
import { getDashboardData } from "@/actions/dashboard";
import { getCurrentBudget } from "@/actions/budget";
import { AccountCard } from "./_components/account-card";
import { CreateAccountDrawer } from "@/components/create-account-drawer";
import { BudgetProgress } from "./_components/budget-progress";
import { Card, CardContent } from "@/components/ui/card";
import { Plus } from "lucide-react";
import { DashboardOverview } from "./_components/transaction-overview";

export default async function DashboardPage() {
  const [accounts, transactions] = await Promise.all([
    getUserAccounts(),
    getDashboardData(),
  ]);

  const defaultAccount = accounts?.find((account) => account.isDefault);

  // fetch budget/expense info scoped to the default account
  const budgetInfo = defaultAccount
    ? await getCurrentBudget(defaultAccount.id)
    : { budget: null, currentExpenses: 0 };

  const currentMonthExpenses = budgetInfo.currentExpenses || 0;
  const budgetForView = budgetInfo.budget ||
    (defaultAccount
      ? { amount: 0, currency: defaultAccount.currency || "USD" }
      : null);

  return (
    <div className="space-y-8">
      {/* Budget Progress */}
      <BudgetProgress
        initialBudget={budgetForView}
        currentExpenses={currentMonthExpenses}
        currency={budgetForView?.currency || defaultAccount?.currency || "USD"}
        accountId={defaultAccount?.id}
      />

      {/* Dashboard Overview */}
      <DashboardOverview
        key={defaultAccount?.id || "no-default"}
        accounts={accounts}
        transactions={transactions || []}
      />

      {/* Accounts Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <CreateAccountDrawer>
          <Card className="hover:shadow-md transition-shadow cursor-pointer border-dashed">
            <CardContent className="flex flex-col items-center justify-center text-muted-foreground h-full pt-5">
              <Plus className="h-10 w-10 mb-2" />
              <p className="text-sm font-medium">Add New Account</p>
            </CardContent>
          </Card>
        </CreateAccountDrawer>
        {accounts.length > 0 &&
          accounts?.map((account) => (
            <AccountCard key={account.id} account={account} />
          ))}
      </div>
    </div>
  );
}
