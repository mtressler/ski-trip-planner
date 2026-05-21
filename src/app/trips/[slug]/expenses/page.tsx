import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-guard";
import { format } from "date-fns";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AddExpenseDialog } from "@/components/expenses/add-expense-dialog";
import { EditExpenseDialog } from "@/components/expenses/edit-expense-dialog";
import { SettleButton } from "@/components/expenses/settle-button";
import { SettledUpButton } from "@/components/expenses/settled-up-button";
import { DeleteExpenseButton } from "@/components/expenses/delete-expense-button";
import { computeSettlement } from "@/lib/utils/settlement";
import { cn } from "@/lib/utils";

const categoryLabels: Record<string, string> = {
  LODGING: "Lodging",
  LIFT_TICKETS: "Lift Tickets",
  TRANSPORTATION: "Transportation",
  FOOD: "Food",
  EQUIPMENT_RENTAL: "Equipment",
  MISC: "Misc",
};

const categoryColors: Record<string, string> = {
  LODGING: "bg-blue-100 text-blue-700",
  LIFT_TICKETS: "bg-green-100 text-green-700",
  TRANSPORTATION: "bg-yellow-100 text-yellow-700",
  FOOD: "bg-orange-100 text-orange-700",
  EQUIPMENT_RENTAL: "bg-purple-100 text-purple-700",
  MISC: "bg-gray-100 text-gray-700",
};

export default async function ExpensesPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ view?: string }>;
}) {
  const { slug } = await params;
  const { view } = await searchParams;
  const showSettled = view === "settled";
  const session = await requireAuth();

  const trip = await prisma.trip.findUnique({
    where: { slug },
    include: {
      organizers: { select: { userId: true } },
      members: {
        where: { status: "CONFIRMED" },
        include: { user: { select: { id: true, name: true, email: true } } },
      },
      expenses: {
        include: {
          paidBy: { select: { id: true, name: true, email: true } },
          splits: {
            include: { user: { select: { id: true, name: true, email: true } } },
          },
        },
        orderBy: { date: "desc" },
      },
    },
  });

  if (!trip) notFound();

  const isOrganizer = trip.organizers.some((o) => o.userId === session.user.id);
  const isMember = trip.members.some((m) => m.userId === session.user.id);
  if (!isOrganizer && !isMember) notFound();

  const members = trip.members.map((m) => ({
    userId: m.user.id,
    name: m.user.name,
    email: m.user.email,
  }));

  const userNames = new Map<string, string>();
  for (const m of trip.members) {
    userNames.set(m.user.id, m.user.name ?? m.user.email);
  }
  for (const e of trip.expenses) {
    if (!userNames.has(e.paidBy.id)) {
      userNames.set(e.paidBy.id, e.paidBy.name ?? e.paidBy.email);
    }
  }

  // Partition expenses by the explicit isSettledUp flag
  const activeExpenses = trip.expenses.filter((e) => !e.isSettledUp);
  const settledExpenses = trip.expenses.filter((e) => e.isSettledUp);
  const visibleExpenses = showSettled ? settledExpenses : activeExpenses;

  const totalAmount = trip.expenses.reduce((sum, e) => sum + Number(e.amount), 0);

  // Settlement only on active unsettled splits
  const allSplits = activeExpenses.flatMap((e) =>
    e.splits.map((s) => ({
      paidById: e.paidById,
      userId: s.userId,
      share: Number(s.share),
      settled: s.settled,
    }))
  );
  const settlements = computeSettlement(allSplits);

  const tabBase = `/trips/${slug}/expenses`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Expenses</h2>
          {trip.expenses.length > 0 && (
            <p className="text-sm text-muted-foreground">
              ${totalAmount.toFixed(2)} total · {activeExpenses.length} active, {settledExpenses.length} settled
            </p>
          )}
        </div>
        <AddExpenseDialog tripId={trip.id} members={members} currentUserId={session.user.id} />
      </div>

      {/* Inner tabs */}
      {trip.expenses.length > 0 && (
        <div className="flex gap-1 border-b">
          {[
            { label: "Active", href: tabBase, active: !showSettled },
            { label: `Settled (${settledExpenses.length})`, href: `${tabBase}?view=settled`, active: showSettled },
          ].map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
                tab.active
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
            </Link>
          ))}
        </div>
      )}

      {/* Settlement Summary (active view only) */}
      {!showSettled && settlements.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Settlement Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {settlements.map((s, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span>
                  <span className="font-medium">{userNames.get(s.from) ?? s.from}</span>
                  <span className="text-muted-foreground"> owes </span>
                  <span className="font-medium">{userNames.get(s.to) ?? s.to}</span>
                </span>
                <span className="font-semibold">${s.amount.toFixed(2)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {!showSettled && settlements.length === 0 && activeExpenses.length > 0 && (
        <Card>
          <CardContent className="py-4 text-center text-sm text-green-700 font-medium">
            All settled up!
          </CardContent>
        </Card>
      )}

      {/* Expense list */}
      {visibleExpenses.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground text-sm">
            {showSettled ? "No settled expenses yet." : "No expenses yet. Add the first one!"}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {visibleExpenses.map((expense) => {
            const myUserId = session.user.id;
            const mySplit = expense.splits.find((s) => s.userId === myUserId);
            const isPayer = expense.paidById === myUserId;

            const settledAmount = expense.splits
              .filter((s) => s.settled)
              .reduce((sum, s) => sum + Number(s.share), 0);
            const remaining = Number(expense.amount) - settledAmount;
            const allSettled = expense.splits.length > 0 && expense.splits.every((s) => s.settled);

            return (
              <Card key={expense.id} className={allSettled ? "opacity-75" : ""}>
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-start gap-2 flex-1 min-w-0">
                      <Badge
                        variant="secondary"
                        className={`${categoryColors[expense.category]} text-xs shrink-0`}
                      >
                        {categoryLabels[expense.category]}
                      </Badge>
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{expense.description}</p>
                        <p className="text-xs text-muted-foreground">
                          Paid by {expense.paidBy.name ?? expense.paidBy.email}
                          {" · "}
                          {format(expense.date, "MMM d, yyyy")}
                        </p>
                        {expense.notes && (
                          <p className="text-xs text-muted-foreground mt-0.5">{expense.notes}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="text-right">
                        <p className="font-semibold text-sm">${Number(expense.amount).toFixed(2)}</p>
                        {!allSettled && remaining < Number(expense.amount) && (
                          <p className="text-xs text-muted-foreground">${remaining.toFixed(2)} remaining</p>
                        )}
                        {allSettled && (
                          <p className="text-xs text-green-700">Settled</p>
                        )}
                      </div>
                      {(isOrganizer || isPayer) && (
                        <div className="flex items-center gap-1">
                          <EditExpenseDialog
                            tripId={trip.id}
                            expense={{
                              id: expense.id,
                              description: expense.description,
                              amount: Number(expense.amount),
                              date: expense.date.toISOString().slice(0, 10),
                              category: expense.category,
                              notes: expense.notes,
                              paidById: expense.paidById,
                              splits: expense.splits.map((s) => ({
                                userId: s.userId,
                                share: Number(s.share),
                              })),
                            }}
                            members={members}
                            currentUserId={session.user.id}
                          />
                          <DeleteExpenseButton tripId={trip.id} expenseId={expense.id} />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Splits */}
                  <div className="border-t pt-2 space-y-1">
                    {expense.splits.map((split) => (
                      <div key={split.id} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <SettleButton splitId={split.id} settled={split.settled} />
                          <span className={split.settled ? "line-through text-muted-foreground" : ""}>
                            {split.user.name ?? split.user.email}
                          </span>
                        </div>
                        <span className={split.settled ? "text-muted-foreground" : ""}>
                          ${Number(split.share).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Footer row */}
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <div>
                      {mySplit && !isPayer && (
                        <div className={`rounded px-2 py-1 text-xs font-medium ${mySplit.settled ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"}`}>
                          {mySplit.settled ? "You've settled your share" : `You owe $${Number(mySplit.share).toFixed(2)}`}
                        </div>
                      )}
                      {isPayer && !allSettled && (
                        <div className="rounded px-2 py-1 text-xs font-medium bg-blue-50 text-blue-700">
                          You paid this
                        </div>
                      )}
                    </div>
                    {allSettled && !expense.isSettledUp && !showSettled && (isOrganizer || isPayer) && (
                      <SettledUpButton tripId={trip.id} expenseId={expense.id} />
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
