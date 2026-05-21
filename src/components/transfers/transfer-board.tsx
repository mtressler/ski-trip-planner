"use client";

import { useState, useTransition, useCallback } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Plus, Trash2, GripVertical, Car, PersonStanding, Plane, Star } from "lucide-react";
import {
  createTransferGroup,
  deleteTransferGroup,
  updateTransferGroup,
  assignParticipant,
  unassignParticipant,
} from "@/server/actions/transfers";
import { format } from "date-fns";

// ─── Types ──────────────────────────────────────────────

export type Direction = "TO_LODGING" | "TO_AIRPORT";

export type MemberCard = {
  tripMemberId: string;
  userId: string;
  name: string;
  travelMode: "FLYING" | "DRIVING" | null;
  driveRole: "DRIVER" | "PASSENGER" | null;
  rentingCar: boolean | null;
  arrivalAirport: string | null;
  departureAirport: string | null;
  departureSameAsArrival: boolean | null;
  arrivalTime: Date | null;
  departureTime: Date | null;
  driveArrivalTime: Date | null;
  driveDepartureTime: Date | null;
  driverName: string | null;
};

export type CarGroupData = {
  id: string;
  direction: Direction;
  name: string;
  maxCapacity: number | null;
  driverId: string | null;
  isPending?: boolean;
};

export type AssignmentData = {
  tripMemberId: string;
  direction: Direction;
  type: "CAR_GROUP" | "OWN" | "SHUTTLE";
  transferGroupId: string | null;
};

interface TransferBoardProps {
  slug: string;
  members: MemberCard[];
  carGroups: CarGroupData[];
  assignments: AssignmentData[];
}

// ─── Local state types ───────────────────────────────────

type LocalAssignment = {
  type: "CAR_GROUP" | "OWN" | "SHUTTLE" | "UNASSIGNED";
  transferGroupId: string | null;
};

// ─── Board entry ─────────────────────────────────────────

export function TransferBoard({ slug, members, carGroups: initialCarGroups, assignments: initialAssignments }: TransferBoardProps) {
  const [direction, setDirection] = useState<Direction>("TO_LODGING");

  return (
    <DirectionBoard
      key={direction}
      slug={slug}
      direction={direction}
      onDirectionChange={setDirection}
      members={members}
      initialCarGroups={initialCarGroups.filter((g) => g.direction === direction)}
      initialAssignments={initialAssignments.filter((a) => a.direction === direction)}
    />
  );
}

// ─── Direction board ─────────────────────────────────────

interface DirectionBoardProps {
  slug: string;
  direction: Direction;
  onDirectionChange: (d: Direction) => void;
  members: MemberCard[];
  initialCarGroups: CarGroupData[];
  initialAssignments: AssignmentData[];
}

function DirectionBoard({ slug, direction, onDirectionChange, members, initialCarGroups, initialAssignments }: DirectionBoardProps) {
  const [, startTransition] = useTransition();
  const [directionGroups, setDirectionGroups] = useState<CarGroupData[]>(initialCarGroups);

  // Assignment state: tripMemberId → LocalAssignment
  const [assignments, setAssignments] = useState<Record<string, LocalAssignment>>(() => {
    const map: Record<string, LocalAssignment> = {};
    for (const a of initialAssignments) {
      map[a.tripMemberId] = { type: a.type, transferGroupId: a.transferGroupId };
    }
    return map;
  });

  // memberOrder: groupId → ordered tripMemberIds; first entry = driver
  const [memberOrder, setMemberOrder] = useState<Record<string, string[]>>(() => {
    const map: Record<string, string[]> = {};
    for (const group of initialCarGroups) {
      const ids = initialAssignments
        .filter((a) => a.type === "CAR_GROUP" && a.transferGroupId === group.id)
        .map((a) => a.tripMemberId);
      map[group.id] = [...ids].sort((aId, bId) => {
        if (aId === group.driverId) return -1;
        if (bId === group.driverId) return 1;
        const aM = members.find((m) => m.tripMemberId === aId);
        const bM = members.find((m) => m.tripMemberId === bId);
        const aT = direction === "TO_LODGING" ? (aM?.arrivalTime ?? aM?.driveArrivalTime) : (aM?.departureTime ?? aM?.driveDepartureTime);
        const bT = direction === "TO_LODGING" ? (bM?.arrivalTime ?? bM?.driveArrivalTime) : (bM?.departureTime ?? bM?.driveDepartureTime);
        if (!aT && !bT) return 0;
        if (!aT) return 1;
        if (!bT) return -1;
        return new Date(aT).getTime() - new Date(bT).getTime();
      });
    }
    return map;
  });

  const [activeId, setActiveId] = useState<string | null>(null);
  const [deletingGroupId, setDeletingGroupId] = useState<string | null>(null);
  const [editingCapacityGroupId, setEditingCapacityGroupId] = useState<string | null>(null);
  const [editingCapacityValue, setEditingCapacityValue] = useState("");

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  function getAssignment(tripMemberId: string): LocalAssignment {
    return assignments[tripMemberId] ?? { type: "UNASSIGNED", transferGroupId: null };
  }

  function getMembersInContainer(containerId: string): MemberCard[] {
    if (containerId === "unassigned") {
      return members.filter((m) => getAssignment(m.tripMemberId).type === "UNASSIGNED");
    }
    if (containerId === "own") {
      return members.filter((m) => getAssignment(m.tripMemberId).type === "OWN");
    }
    if (containerId === "shuttle") {
      return members.filter((m) => getAssignment(m.tripMemberId).type === "SHUTTLE");
    }
    // Car group — return in explicit memberOrder (first = driver)
    const assigned = members.filter((m) => {
      const a = getAssignment(m.tripMemberId);
      return a.type === "CAR_GROUP" && a.transferGroupId === containerId;
    });
    const order = memberOrder[containerId] ?? [];
    const ordered = order.map((id) => assigned.find((m) => m.tripMemberId === id)).filter((m): m is MemberCard => m !== undefined);
    const unordered = assigned.filter((m) => !order.includes(m.tripMemberId));
    return [...ordered, ...unordered];
  }

  // Sort members for display based on direction
  function sortedMembers(list: MemberCard[]): MemberCard[] {
    return [...list].sort((a, b) => {
      const aTime = direction === "TO_LODGING"
        ? (a.arrivalTime ?? a.driveArrivalTime)
        : (a.departureTime ?? a.driveDepartureTime);
      const bTime = direction === "TO_LODGING"
        ? (b.arrivalTime ?? b.driveArrivalTime)
        : (b.departureTime ?? b.driveDepartureTime);
      if (!aTime && !bTime) return 0;
      if (!aTime) return 1;
      if (!bTime) return -1;
      return new Date(aTime).getTime() - new Date(bTime).getTime();
    });
  }

  function carGroupName(member: MemberCard): string {
    const type = member.travelMode === "FLYING" ? "rental" : "personal";
    return `${member.name}'s ${type} car`;
  }

  // Apply driver/name changes for a group when its first member changes
  function applyDriverChanges(
    updates: Array<{ groupId: string; oldOrder: string[]; newOrder: string[] }>
  ) {
    const changed = updates.filter(({ oldOrder, newOrder }) => (oldOrder[0] ?? null) !== (newOrder[0] ?? null));
    if (changed.length === 0) return;
    setDirectionGroups((prev) => {
      let result = prev;
      for (const { groupId, newOrder } of changed) {
        const newDriverId = newOrder[0] ?? null;
        const driverMember = newDriverId ? members.find((m) => m.tripMemberId === newDriverId) : null;
        const currentGroup = result.find((g) => g.id === groupId);
        const newName = driverMember ? carGroupName(driverMember) : (currentGroup?.name ?? "New Car");
        result = result.map((g) => g.id === groupId ? { ...g, driverId: newDriverId, name: newName } : g);
      }
      return result;
    });
    for (const { groupId, newOrder } of changed) {
      const newDriverId = newOrder[0] ?? null;
      const driverMember = newDriverId ? members.find((m) => m.tripMemberId === newDriverId) : null;
      const currentGroup = directionGroups.find((g) => g.id === groupId);
      const newName = driverMember ? carGroupName(driverMember) : (currentGroup?.name ?? "New Car");
      void updateTransferGroup(slug, groupId, { driverId: newDriverId, name: newName });
    }
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const tripMemberId = active.id as string;
    const containerId = over.id as string;
    const prev = getAssignment(tripMemberId);

    // ─── Reorder: dropped onto a specific member card ─────
    if (containerId.startsWith("reorder:")) {
      const targetMemberId = containerId.slice("reorder:".length);
      if (targetMemberId === tripMemberId) return;

      const targetA = getAssignment(targetMemberId);
      if (targetA.type !== "CAR_GROUP" || !targetA.transferGroupId) return;

      const newGroupId = targetA.transferGroupId;
      const oldGroupId = prev.type === "CAR_GROUP" ? prev.transferGroupId : null;

      // Capacity check when moving into a different group
      if (oldGroupId !== newGroupId) {
        const targetGroup = directionGroups.find((g) => g.id === newGroupId);
        if (targetGroup?.maxCapacity !== null && targetGroup?.maxCapacity !== undefined) {
          const currentCount = getMembersInContainer(newGroupId).length;
          if (currentCount >= targetGroup.maxCapacity) return;
        }
      }

      const newMO = { ...memberOrder };
      const groupsToDelete: string[] = [];

      if (oldGroupId && oldGroupId !== newGroupId) {
        newMO[oldGroupId] = (newMO[oldGroupId] ?? []).filter((id) => id !== tripMemberId);
        if (newMO[oldGroupId].length === 0) {
          groupsToDelete.push(oldGroupId);
          delete newMO[oldGroupId];
        }
      }
      const base = (newMO[newGroupId] ?? []).filter((id) => id !== tripMemberId);
      const idx = base.indexOf(targetMemberId);
      base.splice(idx === -1 ? base.length : idx, 0, tripMemberId);
      newMO[newGroupId] = base;

      setMemberOrder(newMO);
      applyDriverChanges([
        { groupId: newGroupId, oldOrder: memberOrder[newGroupId] ?? [], newOrder: newMO[newGroupId] },
        ...(oldGroupId && oldGroupId !== newGroupId && !groupsToDelete.includes(oldGroupId)
          ? [{ groupId: oldGroupId, oldOrder: memberOrder[oldGroupId] ?? [], newOrder: newMO[oldGroupId] ?? [] }]
          : []),
      ]);

      if (groupsToDelete.length > 0) {
        setDirectionGroups((prev) => prev.filter((g) => !groupsToDelete.includes(g.id)));
        for (const gId of groupsToDelete) void deleteTransferGroup(slug, gId);
      }

      if (oldGroupId !== newGroupId) {
        setAssignments((prev) => ({ ...prev, [tripMemberId]: { type: "CAR_GROUP", transferGroupId: newGroupId } }));
        startTransition(async () => {
          await assignParticipant(slug, tripMemberId, direction, "CAR_GROUP", newGroupId);
        });
      }
      return;
    }

    // ─── Container drops ──────────────────────────────────
    if (containerId === "new-car") {
      void handleDropToNewCar(tripMemberId);
      return;
    }

    let newType: "CAR_GROUP" | "OWN" | "SHUTTLE" | "UNASSIGNED";
    let newGroupId: string | null = null;

    if (containerId === "unassigned" || containerId === "unassigned-overlay") {
      newType = "UNASSIGNED";
    } else if (containerId === "own") {
      newType = "OWN";
    } else if (containerId === "shuttle") {
      newType = "SHUTTLE";
    } else {
      const group = directionGroups.find((g) => g.id === containerId);
      if (!group) return;
      if (group.maxCapacity !== null) {
        const currentCount = getMembersInContainer(containerId).length;
        if (currentCount >= group.maxCapacity && prev.transferGroupId !== containerId) return;
      }
      newType = "CAR_GROUP";
      newGroupId = containerId;
    }

    if (prev.type === newType && prev.transferGroupId === newGroupId) return;

    setAssignments((p) => ({ ...p, [tripMemberId]: { type: newType, transferGroupId: newGroupId } }));

    const newMO = { ...memberOrder };
    const oldGroupId = prev.type === "CAR_GROUP" ? prev.transferGroupId : null;
    const driverUpdates: Array<{ groupId: string; oldOrder: string[]; newOrder: string[] }> = [];
    const groupsToDelete: string[] = [];

    if (oldGroupId) {
      newMO[oldGroupId] = (newMO[oldGroupId] ?? []).filter((id) => id !== tripMemberId);
      if (newMO[oldGroupId].length === 0) {
        groupsToDelete.push(oldGroupId);
        delete newMO[oldGroupId];
      } else {
        driverUpdates.push({ groupId: oldGroupId, oldOrder: memberOrder[oldGroupId] ?? [], newOrder: newMO[oldGroupId] });
      }
    }
    if (newType === "CAR_GROUP" && newGroupId) {
      newMO[newGroupId] = [...(newMO[newGroupId] ?? []), tripMemberId];
      driverUpdates.push({ groupId: newGroupId, oldOrder: memberOrder[newGroupId] ?? [], newOrder: newMO[newGroupId] });
    }

    setMemberOrder(newMO);
    applyDriverChanges(driverUpdates);

    if (groupsToDelete.length > 0) {
      setDirectionGroups((prev) => prev.filter((g) => !groupsToDelete.includes(g.id)));
      for (const gId of groupsToDelete) void deleteTransferGroup(slug, gId);
    }

    startTransition(async () => {
      if (newType === "UNASSIGNED") {
        await unassignParticipant(slug, tripMemberId, direction);
      } else {
        await assignParticipant(slug, tripMemberId, direction, newType as "CAR_GROUP" | "OWN" | "SHUTTLE", newGroupId);
      }
    });
  }

  async function handleDropToNewCar(tripMemberId: string) {
    const driverMember = members.find((m) => m.tripMemberId === tripMemberId);
    const name = driverMember ? carGroupName(driverMember) : "New Car";
    const tempId = `__temp__${Date.now()}`;

    setDirectionGroups((prev) => [...prev, { id: tempId, direction, name, maxCapacity: null, driverId: tripMemberId, isPending: true }]);
    setAssignments((prev) => ({ ...prev, [tripMemberId]: { type: "CAR_GROUP", transferGroupId: tempId } }));
    setMemberOrder((prev) => ({ ...prev, [tempId]: [tripMemberId] }));

    const result = await createTransferGroup(slug, direction, name, null);
    if (result.success && result.groupId) {
      const groupId = result.groupId;
      await updateTransferGroup(slug, groupId, { driverId: tripMemberId });
      await assignParticipant(slug, tripMemberId, direction, "CAR_GROUP", groupId);
      setDirectionGroups((prev) => prev.map((g) => g.id === tempId ? { ...g, id: groupId, isPending: false } : g));
      setAssignments((prev) => ({ ...prev, [tripMemberId]: { type: "CAR_GROUP", transferGroupId: groupId } }));
      setMemberOrder((prev) => {
        const next = { ...prev };
        next[groupId] = next[tempId] ?? [tripMemberId];
        delete next[tempId];
        return next;
      });
    } else {
      setDirectionGroups((prev) => prev.filter((g) => g.id !== tempId));
      setAssignments((prev) => {
        const next = { ...prev };
        if (next[tripMemberId]?.transferGroupId === tempId) next[tripMemberId] = { type: "UNASSIGNED", transferGroupId: null };
        return next;
      });
      setMemberOrder((prev) => {
        const next = { ...prev };
        delete next[tempId];
        return next;
      });
    }
  }

  async function handleDeleteCar(groupId: string) {
    setAssignments((prev) => {
      const next = { ...prev };
      for (const [mid, a] of Object.entries(next)) {
        if (a.type === "CAR_GROUP" && a.transferGroupId === groupId) {
          next[mid] = { type: "UNASSIGNED", transferGroupId: null };
        }
      }
      return next;
    });
    setDirectionGroups((prev) => prev.filter((g) => g.id !== groupId));
    setMemberOrder((prev) => {
      const next = { ...prev };
      delete next[groupId];
      return next;
    });
    setDeletingGroupId(null);
    await deleteTransferGroup(slug, groupId);
  }

  async function handleCapacitySave(groupId: string) {
    const trimmed = editingCapacityValue.trim();
    const parsed = trimmed === "" ? null : parseInt(trimmed, 10);
    const maxCapacity = parsed !== null && !isNaN(parsed) && parsed > 0 ? parsed : null;
    setDirectionGroups((prev) =>
      prev.map((g) => (g.id === groupId ? { ...g, maxCapacity } : g))
    );
    setEditingCapacityGroupId(null);
    await updateTransferGroup(slug, groupId, { maxCapacity });
  }

  const activeMember = activeId ? members.find((m) => m.tripMemberId === activeId) : null;

  const unassigned = sortedMembers(getMembersInContainer("unassigned"));

  const sortedDirectionGroups = [...directionGroups].sort((a, b) => {
    const getTime = (g: CarGroupData) => {
      if (!g.driverId) return null;
      const driver = members.find((m) => m.tripMemberId === g.driverId);
      if (!driver) return null;
      const t = direction === "TO_LODGING"
        ? (driver.arrivalTime ?? driver.driveArrivalTime)
        : (driver.departureTime ?? driver.driveDepartureTime);
      return t ? new Date(t).getTime() : null;
    };
    const aTime = getTime(a);
    const bTime = getTime(b);
    if (aTime === null && bTime === null) return 0;
    if (aTime === null) return 1;
    if (bTime === null) return -1;
    return aTime - bTime;
  });

  const TABS = [
    { label: "Airport → Lodging", value: "TO_LODGING" as Direction },
    { label: "Lodging → Airport", value: "TO_AIRPORT" as Direction },
  ];

  return (
    <DndContext id={`transfer-${direction}`} sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      {/* Tab row + drop zone */}
      <div className="flex items-center justify-between border-b mb-4">
        <div className="flex gap-1">
          {TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => onDirectionChange(tab.value)}
              className={cn(
                "px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
                direction === tab.value
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <DroppableNewCar />
      </div>

      <div className="flex gap-4 items-start">
        {/* Left: Unassigned list */}
        <div className="w-64 shrink-0">
          <p className="text-sm font-medium mb-2 text-muted-foreground">
            Unassigned ({unassigned.length})
          </p>
          <div className="relative">
            <DroppableContainer id="unassigned" className="min-h-24 rounded-lg border border-dashed p-2 space-y-1.5">
              {unassigned.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">All assigned</p>
              ) : (
                unassigned.map((m) => (
                  <DraggableCard key={m.tripMemberId} member={m} direction={direction} isActive={activeId === m.tripMemberId} />
                ))
              )}
            </DroppableContainer>
            {activeId !== null && <UnassignedOverlay />}
          </div>
        </div>

        {/* Right: Assignment area */}
        <div className="flex-1 space-y-3">
          <div className="grid grid-cols-2 gap-3">
          {sortedDirectionGroups.map((group) => {
            const groupMembers = getMembersInContainer(group.id);
            const atCapacity = group.maxCapacity !== null && groupMembers.length >= group.maxCapacity;
            const isDeleting = deletingGroupId === group.id;
            const pending = group.isPending === true;

            return (
              <div key={group.id} className={cn("rounded-lg border bg-card", pending && "opacity-60")}>
                {/* Car group header */}
                <div className="flex items-center gap-2 px-3 py-2 border-b">
                  <Car className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="font-medium text-sm flex-1">{group.name}{pending ? " …" : ""}</span>
                  {!pending && (editingCapacityGroupId === group.id ? (
                    <input
                      type="number"
                      min="1"
                      autoFocus
                      value={editingCapacityValue}
                      onChange={(e) => setEditingCapacityValue(e.target.value)}
                      onBlur={() => handleCapacitySave(group.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleCapacitySave(group.id);
                        if (e.key === "Escape") setEditingCapacityGroupId(null);
                      }}
                      className="w-12 h-5 text-xs border rounded px-1 bg-background text-center"
                    />
                  ) : (
                    <button
                      onClick={() => {
                        setEditingCapacityGroupId(group.id);
                        setEditingCapacityValue(group.maxCapacity !== null ? String(group.maxCapacity) : "");
                      }}
                      title="Click to edit capacity"
                      className={cn("text-xs tabular-nums hover:underline cursor-pointer", atCapacity ? "text-destructive font-medium" : "text-muted-foreground")}
                    >
                      {groupMembers.length}{group.maxCapacity !== null ? ` / ${group.maxCapacity}` : " / —"}
                    </button>
                  ))}
                  {!pending && (isDeleting ? (
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-destructive">Delete?</span>
                      <Button size="sm" variant="destructive" className="h-6 px-2 text-xs" onClick={() => handleDeleteCar(group.id)}>Yes</Button>
                      <Button size="sm" variant="outline" className="h-6 px-2 text-xs" onClick={() => setDeletingGroupId(null)}>No</Button>
                    </div>
                  ) : (
                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-muted-foreground" onClick={() => setDeletingGroupId(group.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  ))}
                </div>

                {/* Drop area */}
                <DroppableContainer id={group.id} className="p-2 min-h-16 space-y-1.5">
                  {groupMembers.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-3">Drop participants here</p>
                  ) : (
                    groupMembers.map((m, idx) => {
                      const isDriver = idx === 0;
                      return (
                        <DraggableCard key={m.tripMemberId} member={m} direction={direction} isActive={activeId === m.tripMemberId} isDriver={isDriver} inGroup />
                      );
                    })
                  )}
                  {atCapacity && (
                    <p className="text-xs text-destructive text-center">At capacity</p>
                  )}
                </DroppableContainer>
              </div>
            );
          })}
          </div>

          {/* Own + Shuttle buckets */}
          <div className="grid grid-cols-2 gap-3">
            <SimpleBucket
              id="own"
              label="Getting there on their own"
              members={sortedMembers(getMembersInContainer("own"))}
              direction={direction}
              activeId={activeId}
            />
            <SimpleBucket
              id="shuttle"
              label="Shuttle / Public Transit"
              members={sortedMembers(getMembersInContainer("shuttle"))}
              direction={direction}
              activeId={activeId}
            />
          </div>

        </div>
      </div>

      <DragOverlay>
        {activeMember && (
          <CardDisplay member={activeMember} direction={direction} isDragging />
        )}
      </DragOverlay>
    </DndContext>
  );
}

// ─── Droppable container ──────────────────────────────────

function DroppableContainer({ id, children, className }: { id: string; children: React.ReactNode; className?: string }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={cn(className, isOver && "bg-primary/5 border-primary/30")}
    >
      {children}
    </div>
  );
}

// ─── Draggable card ───────────────────────────────────────

function DraggableCard({ member, direction, isActive, isDriver, carDriverName, inGroup }: { member: MemberCard; direction: Direction; isActive: boolean; isDriver?: boolean; carDriverName?: string | null; inGroup?: boolean }) {
  const { attributes, listeners, setNodeRef: setDragRef, transform } = useDraggable({ id: member.tripMemberId });
  const { setNodeRef: setDropRef, isOver } = useDroppable({ id: `reorder:${member.tripMemberId}`, disabled: !inGroup });
  const setRef = useCallback((el: HTMLDivElement | null) => { setDragRef(el); setDropRef(el); }, [setDragRef, setDropRef]);
  const style = { transform: CSS.Translate.toString(transform) };

  return (
    <div
      ref={setRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn(isActive && "opacity-30", isOver && "ring-2 ring-primary ring-offset-1 rounded-md")}
    >
      <CardDisplay member={member} direction={direction} isDriver={isDriver} carDriverName={carDriverName} />
    </div>
  );
}

// ─── Card display ─────────────────────────────────────────

function CardDisplay({ member, direction, isDragging, isDriver, carDriverName }: { member: MemberCard; direction: Direction; isDragging?: boolean; isDriver?: boolean; carDriverName?: string | null }) {
  const timeForDirection = direction === "TO_LODGING"
    ? (member.arrivalTime ?? member.driveArrivalTime)
    : (member.departureTime ?? member.driveDepartureTime);

  const airport = direction === "TO_LODGING"
    ? member.arrivalAirport
    : (member.departureSameAsArrival === false && member.departureAirport ? member.departureAirport : member.arrivalAirport);

  const modeColor =
    member.travelMode === "FLYING" && member.rentingCar
      ? "bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-900"
      : member.travelMode === "FLYING"
      ? "bg-violet-50 border-violet-200 dark:bg-violet-950/20 dark:border-violet-900"
      : member.driveRole === "DRIVER"
      ? "bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-900"
      : member.travelMode === "DRIVING"
      ? "bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-900"
      : "";

  const iconColor =
    member.travelMode === "FLYING" && member.rentingCar
      ? "text-blue-500"
      : member.travelMode === "FLYING"
      ? "text-violet-500"
      : member.driveRole === "DRIVER"
      ? "text-green-500"
      : member.travelMode === "DRIVING"
      ? "text-amber-500"
      : "text-muted-foreground";

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs cursor-grab select-none",
        modeColor,
        isDragging && "shadow-lg cursor-grabbing",
      )}
    >
      <GripVertical className="h-3 w-3 text-muted-foreground shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{member.name}{isDriver ? " (driver)" : ""}</p>
        <div className="flex items-center gap-1 text-muted-foreground">
          {member.travelMode === "FLYING" ? (
            <>
              <Plane className={cn("h-2.5 w-2.5 shrink-0", iconColor)} />
              {member.rentingCar && <Star className={cn("h-2.5 w-2.5 shrink-0", iconColor)} />}
            </>
          ) : member.travelMode === "DRIVING" ? (
            <Car className={cn("h-2.5 w-2.5 shrink-0", iconColor)} />
          ) : (
            <PersonStanding className="h-2.5 w-2.5 shrink-0" />
          )}
          {airport && <span>{airport}</span>}
          {timeForDirection && (
            <span>{format(new Date(timeForDirection), "MMM d, h:mm a")}</span>
          )}
          {!airport && !timeForDirection && (
            <span>
              {member.driveRole === "PASSENGER"
                ? (() => {
                    const name = carDriverName ?? member.driverName;
                    return name ? `Passenger in ${name}'s car` : "Passenger Unassigned";
                  })()
                : "No details"}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Unassigned overlay (full-area drop target while dragging) ───────────────

function UnassignedOverlay() {
  const { setNodeRef, isOver } = useDroppable({ id: "unassigned-overlay" });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "absolute inset-0 rounded-lg pointer-events-none transition-colors",
        isOver && "bg-primary/10 border-2 border-primary"
      )}
    />
  );
}

// ─── Droppable new car zone ───────────────────────────────

function DroppableNewCar() {
  const { setNodeRef, isOver } = useDroppable({ id: "new-car" });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "mb-px w-64 flex items-center gap-2 rounded-md border border-dashed px-2.5 py-1.5 text-xs select-none transition-colors",
        isOver ? "border-primary bg-primary/10 text-primary" : "border-primary/40 bg-primary/5 text-primary/70"
      )}
    >
      <Plus className="h-3 w-3 shrink-0" />
      <div className="flex flex-col">
        <span className="font-medium leading-tight">New car</span>
        <span className="leading-tight opacity-70">Drop a card here</span>
      </div>
    </div>
  );
}

// ─── Simple bucket ────────────────────────────────────────

function SimpleBucket({ id, label, members, direction, activeId }: { id: string; label: string; members: MemberCard[]; direction: Direction; activeId: string | null }) {
  return (
    <div className="rounded-lg border bg-card">
      <div className="px-3 py-2 border-b">
        <span className="font-medium text-sm">{label}</span>
        <span className="text-xs text-muted-foreground ml-2">({members.length})</span>
      </div>
      <DroppableContainer id={id} className="p-2 min-h-12 space-y-1.5">
        {members.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-2">Drop participants here</p>
        ) : (
          members.map((m) => (
            <DraggableCard key={m.tripMemberId} member={m} direction={direction} isActive={activeId === m.tripMemberId} />
          ))
        )}
      </DroppableContainer>
    </div>
  );
}
