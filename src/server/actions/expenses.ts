"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-guard";
import { z } from "zod";

const expenseSchema = z.object({
  description: z.string().min(1, "Description is required").max(200),
  amount: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : v),
    z.coerce.number().positive("Amount must be greater than 0")
  ),
  category: z.enum(["LODGING", "LIFT_TICKETS", "TRANSPORTATION", "FOOD", "EQUIPMENT_RENTAL", "MISC"]),
  date: z.string().min(1, "Date is required"),
  splitType: z.enum(["EQUAL_ALL", "EQUAL_SUBSET", "CUSTOM"]),
  notes: z.string().max(500).optional(),
});

export async function addExpense(
  tripId: string,
  _prevState: { error?: Record<string, string[]>; values?: Record<string, string> } | undefined,
  formData: FormData
) {
  const session = await requireAuth();

  // Must be organizer or confirmed member
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    select: {
      slug: true,
      organizers: { select: { userId: true } },
      members: {
        where: { status: "CONFIRMED" },
        select: { userId: true, id: true },
      },
    },
  });
  if (!trip) return { error: { _form: ["Trip not found"] } };

  const isOrganizer = trip.organizers.some((o) => o.userId === session.user.id);
  const isMember = trip.members.some((m) => m.userId === session.user.id);
  if (!isOrganizer && !isMember) return { error: { _form: ["Not authorized"] } };

  const raw = Object.fromEntries(formData.entries());
  const parsed = expenseSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors, values: raw as Record<string, string> };
  }

  const { description, amount, category, date, splitType, notes } = parsed.data;
  const markMySharePaid = formData.get("markMySharePaid") === "on";

  // Collect split data
  const memberUserIds = trip.members.map((m) => m.userId);

  let splitUserIds: string[] = [];
  let customAmounts: Record<string, number> = {};

  if (splitType === "EQUAL_ALL") {
    splitUserIds = memberUserIds;
  } else if (splitType === "EQUAL_SUBSET") {
    // Checkboxes named split_<userId>
    splitUserIds = memberUserIds.filter((uid) => formData.get(`split_${uid}`) === "on");
    if (splitUserIds.length === 0) {
      return { error: { _form: ["Select at least one person for the split"] }, values: raw as Record<string, string> };
    }
  } else {
    // Custom: inputs named custom_<userId>
    for (const uid of memberUserIds) {
      const val = formData.get(`custom_${uid}`);
      if (val && val !== "") {
        const num = parseFloat(val as string);
        if (!isNaN(num) && num > 0) {
          customAmounts[uid] = num;
          splitUserIds.push(uid);
        }
      }
    }
    if (splitUserIds.length === 0) {
      return { error: { _form: ["Enter at least one custom amount"] }, values: raw as Record<string, string> };
    }
  }

  // Create expense + splits in a transaction
  await prisma.$transaction(async (tx) => {
    const expense = await tx.expense.create({
      data: {
        tripId,
        paidById: session.user.id,
        description,
        amount,
        category,
        date: new Date(date),
        notes: notes || null,
      },
    });

    const sharePerPerson =
      splitType === "EQUAL_ALL" || splitType === "EQUAL_SUBSET"
        ? Math.round((amount / splitUserIds.length) * 100) / 100
        : 0;

    // Adjust for rounding on last person
    let allocated = 0;
    const splits = splitUserIds.map((uid, i) => {
      let share: number;
      if (splitType === "CUSTOM") {
        share = customAmounts[uid];
      } else if (i === splitUserIds.length - 1) {
        share = Math.round((amount - allocated) * 100) / 100;
      } else {
        share = sharePerPerson;
      }
      allocated += share;
      const isPayer = uid === session.user.id;
      const autoSettle = markMySharePaid && isPayer;
      return {
        expenseId: expense.id,
        tripId,
        userId: uid,
        share,
        settled: autoSettle,
        settledAt: autoSettle ? new Date() : null,
      };
    });

    await tx.expenseSplit.createMany({ data: splits });
  });

  revalidatePath(`/trips/${trip.slug}/expenses`);
  return { success: true };
}

export async function editExpense(
  tripId: string,
  expenseId: string,
  _prevState: { error?: Record<string, string[]>; values?: Record<string, string> } | undefined,
  formData: FormData
) {
  const session = await requireAuth();

  const expense = await prisma.expense.findUnique({
    where: { id: expenseId },
    include: {
      trip: {
        select: {
          slug: true,
          organizers: { select: { userId: true } },
          members: {
            where: { status: "CONFIRMED" },
            select: { userId: true },
          },
        },
      },
    },
  });
  if (!expense || expense.tripId !== tripId) return { error: { _form: ["Expense not found"] } };

  const isOrganizer = expense.trip.organizers.some((o) => o.userId === session.user.id);
  const isPayer = expense.paidById === session.user.id;
  if (!isOrganizer && !isPayer) return { error: { _form: ["Not authorized"] } };

  const raw = Object.fromEntries(formData.entries());
  const parsed = expenseSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors, values: raw as Record<string, string> };
  }

  const { description, amount, category, date, splitType, notes } = parsed.data;
  const markMySharePaid = formData.get("markMySharePaid") === "on";
  const memberUserIds = expense.trip.members.map((m) => m.userId);

  let splitUserIds: string[] = [];
  let customAmounts: Record<string, number> = {};

  if (splitType === "EQUAL_ALL") {
    splitUserIds = memberUserIds;
  } else if (splitType === "EQUAL_SUBSET") {
    splitUserIds = memberUserIds.filter((uid) => formData.get(`split_${uid}`) === "on");
    if (splitUserIds.length === 0) {
      return { error: { _form: ["Select at least one person for the split"] }, values: raw as Record<string, string> };
    }
  } else {
    for (const uid of memberUserIds) {
      const val = formData.get(`custom_${uid}`);
      if (val && val !== "") {
        const num = parseFloat(val as string);
        if (!isNaN(num) && num > 0) {
          customAmounts[uid] = num;
          splitUserIds.push(uid);
        }
      }
    }
    if (splitUserIds.length === 0) {
      return { error: { _form: ["Enter at least one custom amount"] }, values: raw as Record<string, string> };
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.expense.update({
      where: { id: expenseId },
      data: {
        description,
        amount,
        category,
        date: new Date(date),
        notes: notes || null,
        isSettledUp: false,
      },
    });

    await tx.expenseSplit.deleteMany({ where: { expenseId } });

    const sharePerPerson =
      splitType === "EQUAL_ALL" || splitType === "EQUAL_SUBSET"
        ? Math.round((amount / splitUserIds.length) * 100) / 100
        : 0;

    let allocated = 0;
    const splits = splitUserIds.map((uid, i) => {
      let share: number;
      if (splitType === "CUSTOM") {
        share = customAmounts[uid];
      } else if (i === splitUserIds.length - 1) {
        share = Math.round((amount - allocated) * 100) / 100;
      } else {
        share = sharePerPerson;
      }
      allocated += share;
      const isCurrentUser = uid === session.user.id;
      const autoSettle = markMySharePaid && isCurrentUser;
      return {
        expenseId,
        tripId,
        userId: uid,
        share,
        settled: autoSettle,
        settledAt: autoSettle ? new Date() : null,
      };
    });

    await tx.expenseSplit.createMany({ data: splits });
  });

  revalidatePath(`/trips/${expense.trip.slug}/expenses`);
  return { success: true };
}

export async function deleteExpense(tripId: string, expenseId: string) {
  const session = await requireAuth();

  const expense = await prisma.expense.findUnique({
    where: { id: expenseId },
    include: { trip: { select: { slug: true, organizers: { select: { userId: true } } } } },
  });
  if (!expense || expense.tripId !== tripId) return { error: "Expense not found" };

  const isOrganizer = expense.trip.organizers.some((o) => o.userId === session.user.id);
  const isPayer = expense.paidById === session.user.id;
  if (!isOrganizer && !isPayer) return { error: "Not authorized" };

  await prisma.expense.delete({ where: { id: expenseId } });
  revalidatePath(`/trips/${expense.trip.slug}/expenses`);
  return { success: true };
}

export async function markExpenseSettledUp(tripId: string, expenseId: string) {
  const session = await requireAuth();

  const expense = await prisma.expense.findUnique({
    where: { id: expenseId },
    include: {
      splits: { select: { id: true } },
      trip: { select: { slug: true, organizers: { select: { userId: true } } } },
    },
  });
  if (!expense || expense.tripId !== tripId) return { error: "Expense not found" };

  const isOrganizer = expense.trip.organizers.some((o) => o.userId === session.user.id);
  const isPayer = expense.paidById === session.user.id;
  if (!isOrganizer && !isPayer) return { error: "Not authorized" };

  await prisma.$transaction([
    prisma.expenseSplit.updateMany({
      where: { expenseId, settled: false },
      data: { settled: true, settledAt: new Date() },
    }),
    prisma.expense.update({
      where: { id: expenseId },
      data: { isSettledUp: true },
    }),
  ]);

  revalidatePath(`/trips/${expense.trip.slug}/expenses`);
  return { success: true };
}

export async function markSplitSettled(splitId: string, settled: boolean) {
  const session = await requireAuth();

  const split = await prisma.expenseSplit.findUnique({
    where: { id: splitId },
    include: {
      expense: {
        include: { trip: { select: { slug: true, organizers: { select: { userId: true } } } } },
      },
    },
  });
  if (!split) return { error: "Split not found" };

  const isOrganizer = split.expense.trip.organizers.some((o) => o.userId === session.user.id);
  const isPayer = split.expense.paidById === session.user.id;
  if (!isOrganizer && !isPayer) return { error: "Not authorized" };

  await prisma.expenseSplit.update({
    where: { id: splitId },
    data: { settled, settledAt: settled ? new Date() : null },
  });

  revalidatePath(`/trips/${split.expense.trip.slug}/expenses`);
  return { success: true };
}
