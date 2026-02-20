import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "../../components/shared/DataTable";
import { ApiErrorBanner } from "../../components/ui/ApiErrorBanner";
import { formatApiError } from "../../lib/errors";
import { ConfirmDialog } from "../../components/shared/ConfirmDialog";
import { PageLayout } from "@traceability/ui";
import { useToast } from "../../hooks/useToast";
import {
  Button,
  Select,
  Option,
  FlexBox,
  FlexBoxAlignItems,
  Text,
} from "@ui5/webcomponents-react";
import { Badge } from "../../components/ui/badge";
import "@ui5/webcomponents-icons/dist/employee.js";
import "@ui5/webcomponents-icons/dist/delete.js";
import "@ui5/webcomponents-icons/dist/accept.js";
import "@ui5/webcomponents-icons/dist/customer-and-supplier.js";
import {
  UserSectionRow,
  AdminSection,
  getUserSections,
  getSections,
  assignUserSection,
  unassignUserSection,
} from "../../lib/section-api";

export function UserSectionsPage() {
  const queryClient = useQueryClient();
  const [unassignTarget, setUnassignTarget] = useState<UserSectionRow | null>(null);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [pendingSectionId, setPendingSectionId] = useState<string>("");
  const { showToast, ToastComponent } = useToast();

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["admin-user-sections"],
    queryFn: () => getUserSections(),
  });

  const { data: sections = [] } = useQuery({
    queryKey: ["admin-sections"],
    queryFn: getSections,
  });

  const activeSections = useMemo(() => sections.filter((s: AdminSection) => s.is_active), [sections]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admin-user-sections"] });

  const assignMut = useMutation({
    mutationFn: ({ userId, sectionId }: { userId: string; sectionId: string }) =>
      assignUserSection(userId, sectionId),
    onSuccess: () => {
      invalidate();
      setEditingUserId(null);
      setPendingSectionId("");
      showToast("Section assigned");
    },
  });

  const unassignMut = useMutation({
    mutationFn: (userId: string) => unassignUserSection(userId),
    onSuccess: () => {
      invalidate();
      showToast("Section unassigned");
    },
  });

  const columns = useMemo<ColumnDef<UserSectionRow>[]>(
    () => [
      { header: "Employee", accessorKey: "employee_code", size: 110 },
      { header: "Name", accessorKey: "display_name" },
      { header: "Email", accessorKey: "email", cell: ({ row }) => row.original.email || "-", size: 200 },
      { header: "Department", accessorKey: "department", cell: ({ row }) => row.original.department || "-", size: 140 },
      {
        header: "Section",
        size: 260,
        cell: ({ row }) => {
          const u = row.original;
          if (editingUserId === u.user_id) {
            return (
              <FlexBox alignItems={FlexBoxAlignItems.Center} style={{ gap: "0.5rem" }}>
                <Select
                  onChange={(e) => setPendingSectionId(e.detail.selectedOption.getAttribute("data-value") ?? "")}
                  style={{ minWidth: "140px" }}
                >
                  <Option data-value="">-- Select --</Option>
                  {activeSections.map((s) => (
                    <Option key={s.id} data-value={s.id} selected={pendingSectionId === s.id}>
                      {s.section_code} - {s.section_name}
                    </Option>
                  ))}
                </Select>
                <Button
                  icon="accept"
                  design="Positive"
                  disabled={!pendingSectionId || assignMut.isPending}
                  onClick={() => assignMut.mutate({ userId: u.user_id, sectionId: pendingSectionId })}
                  tooltip="Confirm"
                  aria-label="Confirm section assignment"
                />
                <Button
                  design="Transparent"
                  onClick={() => { setEditingUserId(null); setPendingSectionId(""); }}
                >
                  Cancel
                </Button>
              </FlexBox>
            );
          }

          return u.section_code ? (
            <Badge variant="secondary">{u.section_code} — {u.section_name}</Badge>
          ) : (
            <Text style={{ opacity: 0.5, fontStyle: "italic" }}>Not assigned</Text>
          );
        },
      },
      {
        header: "Actions",
        size: 130,
        cell: ({ row }) => {
          const u = row.original;
          return (
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <Button
                icon="edit"
                design="Transparent"
                onClick={() => {
                  setEditingUserId(u.user_id);
                  setPendingSectionId(u.section_id ?? "");
                }}
                tooltip="Assign section"
                aria-label="Assign section"
              />
              {u.section_id ? (
                <Button
                  icon="delete"
                  design="Transparent"
                  onClick={() => setUnassignTarget(u)}
                  tooltip="Unassign"
                  aria-label="Unassign section"
                />
              ) : null}
            </div>
          );
        },
      },
    ],
    [activeSections, editingUserId, pendingSectionId, assignMut.isPending]
  );

  return (
    <PageLayout
      title="User Sections"
      subtitle={
        <FlexBox alignItems={FlexBoxAlignItems.Center}>
          <span className="indicator-live" />
          <span>Assign users to organizational sections</span>
        </FlexBox>
      }
      icon="customer-and-supplier"
      iconColor="blue"
    >
      <div className="page-container">
        <ApiErrorBanner
          message={
            assignMut.error
              ? formatApiError(assignMut.error)
              : unassignMut.error
                ? formatApiError(unassignMut.error)
                : undefined
          }
        />
        <DataTable
          data={users}
          columns={columns}
          loading={isLoading}
          filterPlaceholder="Search user name, email, employee code..."
        />
      </div>

      <ConfirmDialog
        open={Boolean(unassignTarget)}
        title="Unassign section"
        description={unassignTarget ? `Remove section assignment for "${unassignTarget.display_name}"?` : ""}
        confirmText="Unassign"
        destructive
        submitting={unassignMut.isPending}
        onCancel={() => setUnassignTarget(null)}
        onConfirm={() => {
          if (!unassignTarget) return;
          unassignMut.mutate(unassignTarget.user_id, {
            onSuccess: () => setUnassignTarget(null),
          });
        }}
      />
      <ToastComponent />
    </PageLayout>
  );
}
