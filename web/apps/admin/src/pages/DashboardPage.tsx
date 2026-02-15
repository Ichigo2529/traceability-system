import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Activity, Server, AlertCircle } from "lucide-react";
import { sdk } from "../context/AuthContext";
import type { DeviceInfo } from "@traceability/sdk";
import { formatDateTime } from "../lib/datetime";

export default function DashboardPage() {
  const { data: devices = [], isLoading } = useQuery({
    queryKey: ["devices"],
    queryFn: () => sdk.admin.getDevices(),
  });

  const deviceRows = devices as DeviceInfo[];

  const summary = useMemo(() => {
    const now = Date.now();
    let online = 0;

    for (const d of deviceRows) {
      const last = d.last_seen ? new Date(d.last_seen).getTime() : 0;
      const diffSec = last ? (now - last) / 1000 : Infinity;
      if (diffSec <= 60) online += 1;
    }

    return {
      online,
      offline: deviceRows.length - online,
      total: deviceRows.length,
    };
  }, [deviceRows]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatsCard icon={Server} label="Online Devices" value={isLoading ? "..." : String(summary.online)} color="bg-green-100 text-green-600" />
        <StatsCard icon={Activity} label="Offline Devices" value={isLoading ? "..." : String(summary.offline)} color="bg-gray-100 text-gray-700" />
        <StatsCard icon={AlertCircle} label="Registered Devices" value={isLoading ? "..." : String(summary.total)} color="bg-[#D8E2FA] text-[#1134A6]" />
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <ShortcutButton label="Users & Roles" to="/users" />
          <ShortcutButton label="Machines" to="/machines" />
          <ShortcutButton label="Models" to="/models" />
          <ShortcutButton label="Audit Logs" to="/audit-logs" />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h3 className="text-lg font-semibold">Device Status</h3>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="px-6 py-3 text-left">Fingerprint</th>
              <th className="px-6 py-3 text-left">Machine</th>
              <th className="px-6 py-3 text-left">Last Seen</th>
              <th className="px-6 py-3 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {deviceRows.map((d) => {
              const last = d.last_seen ? new Date(d.last_seen).getTime() : 0;
              const online = last ? (Date.now() - last) / 1000 <= 60 : false;
              return (
                <tr key={d.id} className="border-t">
                  <td className="px-6 py-3 font-mono">{d.fingerprint ?? d.id}</td>
                  <td className="px-6 py-3">{d.assigned_machine?.name ?? "Unassigned"}</td>
                  <td className="px-6 py-3">{formatDateTime(d.last_seen)}</td>
                  <td className="px-6 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs ${online ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                      {online ? "ONLINE" : "OFFLINE"}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatsCard({ icon: Icon, label, value, color }: any) {
  return (
    <div className="bg-white p-6 rounded-lg shadow-sm flex items-center gap-4 border">
      <div className={`p-3 rounded-full ${color}`}>
        <Icon size={24} />
      </div>
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
      </div>
    </div>
  );
}

function ShortcutButton({ label, to }: { label: string; to: string }) {
  return (
    <Link to={to} className="p-4 border border-dashed border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-center">
      {label}
    </Link>
  );
}
