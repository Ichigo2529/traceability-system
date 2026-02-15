import { Fragment } from "react";
import { MaterialRequestDetail } from "@traceability/sdk";
import { formatDate, formatDateTime } from "../../lib/datetime";

export function MaterialRequestVoucherView({ detail }: { detail: MaterialRequestDetail }) {
  return (
    <div className="rounded-sm border border-slate-300 bg-white p-3 motion-safe:animate-fade-in-up">
      <div className="mb-3 motion-safe:animate-fade-in-up [animation-delay:40ms]">
        <div className="flex items-start gap-3">
          <img src="/logo.png" alt="MMI Logo" className="h-14 w-auto object-contain" />
          <div className="text-sm leading-5">
            <p className="text-2xl font-semibold italic tracking-wide text-slate-700">MMI Precision Assembly (Thailand) Co., Ltd.</p>
            <p>888 Moo 1, Mittraphap Road, Tambon Naklang, Amphur Sungnoen, Nakornratchasima 30380 Thailand</p>
            <p>TEL : (6644) 000188 &nbsp;&nbsp; FAX : (6644) 000199</p>
          </div>
        </div>
      </div>

      <p className="mb-3 text-2xl font-semibold tracking-tight text-slate-800 motion-safe:animate-fade-in-up [animation-delay:70ms]">
        DIRECT MATERIAL ISSUE VOUCHER
      </p>

      <div className="mb-3 rounded-sm border border-slate-300 bg-slate-50 px-4 py-3 motion-safe:animate-fade-in-up [animation-delay:100ms]">
        <div className="grid grid-cols-[1fr_1fr_0.8fr] items-end gap-6 text-[15px] font-semibold text-slate-800">
          <div className="grid grid-cols-[auto_1fr] items-end gap-2">
            <span className="whitespace-nowrap">NO.:</span>
            <span className="w-full border-b border-slate-300 px-1 pb-1 text-[#d92d20]">{detail.request_no || "-"}</span>
          </div>
          <div className="grid grid-cols-[auto_1fr] items-end gap-2">
            <span className="whitespace-nowrap">DMI. NO.:</span>
            <span className="w-full border-b border-slate-300 px-1 pb-1 text-[#d92d20]">{detail.dmi_no || "-"}</span>
          </div>
          <div className="grid grid-cols-[auto_1fr] items-end gap-2">
            <span className="whitespace-nowrap">DATE:</span>
                    <span className="w-full border-b border-slate-300 px-1 pb-1">{formatDate(detail.request_date)}</span>
          </div>
        </div>
      </div>

      <div className="mb-4 rounded-sm border border-slate-300 bg-slate-50 px-4 py-3 motion-safe:animate-fade-in-up [animation-delay:130ms]">
        <div className="grid grid-cols-[1.2fr_1fr] items-end gap-6 text-[15px] font-semibold text-slate-800">
          <div className="grid grid-cols-[auto_1fr] items-end gap-2">
            <span className="whitespace-nowrap">SECTION:</span>
            <span className="w-full border-b border-slate-300 px-1 pb-1">{detail.section || "-"}</span>
          </div>
          <div className="grid grid-cols-[auto_1fr] items-end gap-2">
            <span className="whitespace-nowrap">COST CENTER:</span>
            <span className="w-full border-b border-slate-300 px-1 pb-1">{detail.cost_center || "-"}</span>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto motion-safe:animate-fade-in [animation-delay:150ms]">
        <table className="w-full table-fixed border-collapse text-sm">
          <colgroup>
            <col className="w-[56px]" />
            <col className="w-[120px]" />
            <col className="w-[190px]" />
            <col className="w-[220px]" />
            <col className="w-[220px]" />
            <col className="w-[110px]" />
            <col className="w-[76px]" />
            <col />
          </colgroup>
          <thead>
            <tr className="bg-slate-100 text-[13px] text-slate-700">
              <th className="border border-slate-300 px-2 py-2 text-center">ITEM</th>
              <th className="border border-slate-300 px-2 py-2 text-center">TYPE</th>
              <th className="border border-slate-300 px-2 py-2 text-center">MODEL</th>
              <th className="border border-slate-300 px-2 py-2 text-center">COMPONENT PART NO.</th>
              <th className="border border-slate-300 px-2 py-2 text-center">DESCRIPTION</th>
              <th className="border border-slate-300 px-2 py-2 text-center">QTY</th>
              <th className="border border-slate-300 px-2 py-2 text-center">UOM</th>
              <th className="border border-slate-300 px-2 py-2 text-center">REMARKS</th>
            </tr>
          </thead>
          <tbody>
            {detail.items.length ? (
              detail.items.map((item) => {
                const key = item.id || `${item.item_no}-${item.part_number}`;
                const allocations = item.issue_allocations ?? [];
                const requestedQty = Number(item.requested_qty ?? 0);
                const actualIssuedTotal =
                  allocations.length > 0
                    ? allocations.reduce((sum, alloc) => sum + (Number(alloc.issued_qty) || 0), 0)
                    : Number(item.issued_qty ?? 0);
                const qtyDiff = actualIssuedTotal - requestedQty;
                return (
                  <Fragment key={key}>
                    <tr key={`${key}-requested`} className="bg-blue-50/50 transition-colors duration-200 hover:bg-blue-100/60">
                      <td className="border border-slate-300 px-2 py-1 text-center">{item.item_no}</td>
                      <td className="border border-slate-300 px-2 py-1 text-center">
                        <span className="inline-flex rounded-full border border-blue-200 bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">
                          Requested
                        </span>
                      </td>
                      <td className="border border-slate-300 px-2 py-1">{detail.model_code || "-"}</td>
                      <td className="border border-slate-300 px-2 py-1">{item.part_number || "-"}</td>
                      <td className="border border-slate-300 px-2 py-1">{item.description || "-"}</td>
                      <td className="border border-slate-300 px-2 py-1 text-right">{item.requested_qty ?? "-"}</td>
                      <td className="border border-slate-300 px-2 py-1 text-center">{item.uom || "PCS"}</td>
                      <td className="border border-slate-300 px-2 py-1 font-medium text-slate-700">Requested Qty</td>
                    </tr>
                    {allocations.map((alloc, idx) => (
                      <tr
                        key={`${key}-alloc-${alloc.id || idx}`}
                        className="bg-amber-50/60 transition-colors duration-200 hover:bg-amber-100/60"
                      >
                        <td className="border border-slate-300 px-2 py-1 text-center">{`${item.item_no}.${idx + 1}`}</td>
                        <td className="border border-slate-300 px-2 py-1 text-center">
                          <span className="inline-flex rounded-full border border-amber-200 bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                            DO Allocation
                          </span>
                        </td>
                        <td className="border border-slate-300 px-2 py-1"></td>
                        <td className="border border-slate-300 px-2 py-1 font-medium">DO. NO. {alloc.do_number || "-"}</td>
                        <td className="border border-slate-300 px-2 py-1">
                          Vendor {alloc.vendor_name || alloc.supplier_name || "-"} | Pack {alloc.vendor_pack_size || alloc.supplier_pack_size} | Packs {alloc.issued_packs}
                        </td>
                        <td className="border border-slate-300 px-2 py-1 text-right">{alloc.issued_qty ?? "-"}</td>
                        <td className="border border-slate-300 px-2 py-1 text-center">{item.uom || "PCS"}</td>
                        <td className="border border-slate-300 px-2 py-1">{alloc.remarks ? `Issued Qty | ${alloc.remarks}` : "Issued Qty"}</td>
                      </tr>
                    ))}
                    <tr key={`${key}-actual`} className="bg-emerald-50/70 transition-colors duration-200 hover:bg-emerald-100/70">
                      <td className="border border-slate-300 px-2 py-1 text-center">{item.item_no}</td>
                      <td className="border border-slate-300 px-2 py-1 text-center">
                        <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                          Actual Total
                        </span>
                      </td>
                      <td className="border border-slate-300 px-2 py-1"></td>
                      <td className="border border-slate-300 px-2 py-1"></td>
                      <td className="border border-slate-300 px-2 py-1 font-semibold text-slate-800">Actual Issued Total</td>
                      <td className="border border-slate-300 px-2 py-1 text-right font-semibold text-slate-800">{actualIssuedTotal || "-"}</td>
                      <td className="border border-slate-300 px-2 py-1 text-center font-semibold">{item.uom || "PCS"}</td>
                      <td className="border border-slate-300 px-2 py-1 text-slate-700">{item.remarks || "-"}</td>
                    </tr>
                    <tr key={`${key}-summary`} className="bg-slate-50/70 transition-colors duration-200 hover:bg-slate-100/70">
                      <td className="border border-slate-300 px-2 py-2" colSpan={8}>
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <span className="rounded-md border border-slate-300 bg-white px-2 py-1 text-slate-700">
                            Requested: <span className="font-semibold">{requestedQty}</span>
                          </span>
                          <span className="rounded-md border border-slate-300 bg-white px-2 py-1 text-slate-700">
                            Allocated: <span className="font-semibold">{actualIssuedTotal}</span>
                          </span>
                          <span
                            className={`rounded-md border px-2 py-1 ${
                              qtyDiff >= 0
                                ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                                : "border-red-300 bg-red-50 text-red-700"
                            }`}
                          >
                            Diff: <span className="font-semibold">{qtyDiff > 0 ? `+${qtyDiff}` : qtyDiff}</span>
                          </span>
                          <span
                            className={`rounded-md border px-2 py-1 font-semibold ${
                              qtyDiff >= 0
                                ? "border-emerald-300 bg-emerald-100 text-emerald-700"
                                : "border-red-300 bg-red-100 text-red-700"
                            }`}
                          >
                            {qtyDiff >= 0 ? "OK" : "Need more allocation"}
                          </span>
                        </div>
                      </td>
                    </tr>
                  </Fragment>
                );
              })
            ) : (
              <tr>
                <td colSpan={8} className="border border-slate-300 px-3 py-4 text-center text-slate-500">
                  No request items
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 overflow-hidden rounded-sm border border-slate-300 motion-safe:animate-fade-in-up [animation-delay:190ms] md:grid md:grid-cols-2">
        <div className="border-b border-slate-300 md:border-b-0 md:border-r">
          <div className="bg-slate-100 px-3 py-2 text-xs font-semibold tracking-wide text-slate-700">ISSUED BY</div>
          <div className="grid grid-cols-[56px_1fr] items-end gap-x-2 gap-y-3 px-3 py-3 text-sm">
            <p className="text-slate-600">NAME :</p>
            <p className="border-b border-dotted border-slate-400 pb-1">{detail.issued_by_name || "-"}</p>
            <p className="text-slate-600">DATE :</p>
            <p className="border-b border-dotted border-slate-400 pb-1">{formatDateTime(detail.issued_at)}</p>
          </div>
        </div>
        <div>
          <div className="bg-slate-100 px-3 py-2 text-xs font-semibold tracking-wide text-slate-700">RECEIVED BY</div>
          <div className="grid grid-cols-[56px_1fr] items-end gap-x-2 gap-y-3 px-3 py-3 text-sm">
            <p className="text-slate-600">NAME :</p>
            <p className="border-b border-dotted border-slate-400 pb-1">{detail.received_by_name || "-"}</p>
            <p className="text-slate-600">DATE :</p>
            <p className="border-b border-dotted border-slate-400 pb-1">{formatDateTime(detail.received_at)}</p>
          </div>
        </div>
      </div>

      <div className="mt-3">
        <p className="text-xs text-slate-500">White - STORE &nbsp; Blue - MATERIALS &nbsp; Pink - RECEIVER</p>
      </div>
    </div>
  );
}
