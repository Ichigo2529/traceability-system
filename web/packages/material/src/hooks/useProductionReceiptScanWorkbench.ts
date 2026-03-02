import { useCallback, useMemo, useState } from "react";
import {
  ProductionReceiptFeedback,
  ProductionReceiptScanRow,
  ProductionReceiptScanTarget,
} from "../domain/materialRequest.types";

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function upper(value: string) {
  return value.trim().toUpperCase();
}

const IDLE_FEEDBACK: ProductionReceiptFeedback = {
  type: "idle",
  message: "",
  at: 0,
};

export function useProductionReceiptScanWorkbench(issuedTargets: ProductionReceiptScanTarget[]) {
  const [selectedPart, setSelectedPart] = useState("");
  const [selectedDo, setSelectedDo] = useState("");
  const [scanData, setScanData] = useState("");
  const [manualMode, setManualMode] = useState(false);
  const [manualReason, setManualReason] = useState("");
  const [stagedScans, setStagedScans] = useState<ProductionReceiptScanRow[]>([]);
  const [feedback, setFeedback] = useState<ProductionReceiptFeedback>(IDLE_FEEDBACK);

  const partOptions = useMemo(() => {
    return Array.from(new Set(issuedTargets.map((x) => upper(x.part_number)).filter(Boolean)));
  }, [issuedTargets]);

  const doOptionsForPart = useMemo(() => {
    const part = upper(selectedPart);
    if (!part) return [];
    return Array.from(new Set(issuedTargets.filter((x) => upper(x.part_number) === part).map((x) => upper(x.do_number))));
  }, [issuedTargets, selectedPart]);

  const coverage = useMemo(() => {
    const requiredByKey = new Map<string, number>();
    for (const row of issuedTargets) {
      const key = `${upper(row.part_number)}|${upper(row.do_number)}`;
      const packs = Math.max(1, Number(row.required_packs ?? 1));
      requiredByKey.set(key, (requiredByKey.get(key) ?? 0) + (Number.isFinite(packs) ? Math.floor(packs) : 1));
    }
    const scannedByKey = new Map<string, number>();
    for (const row of stagedScans) {
      const key = `${upper(row.part_number)}|${upper(row.do_number)}`;
      scannedByKey.set(key, (scannedByKey.get(key) ?? 0) + 1);
    }
    const missing: string[] = [];
    for (const [key, required] of requiredByKey.entries()) {
      const scanned = scannedByKey.get(key) ?? 0;
      const remain = Math.max(0, required - scanned);
      for (let i = 0; i < remain; i += 1) missing.push(key);
    }
    let requiredCount = 0;
    for (const n of requiredByKey.values()) requiredCount += n;
    return {
      requiredCount,
      scannedCount: stagedScans.length,
      missing,
      ready: requiredCount > 0 && missing.length === 0,
    };
  }, [issuedTargets, stagedScans]);

  const addStagedScan = useCallback(() => {
    const part = upper(selectedPart);
    const doNo = upper(selectedDo);
    if (!part || !doNo) {
      setFeedback({ type: "error", message: "Please select part number and DO number.", at: Date.now() });
      return false;
    }
    if (!manualMode && !scanData.trim()) {
      setFeedback({ type: "error", message: "Please scan barcode data.", at: Date.now() });
      return false;
    }
    if (manualMode && !manualReason.trim()) {
      setFeedback({ type: "error", message: "Please provide reason for manual fallback.", at: Date.now() });
      return false;
    }
    const key = `${part}|${doNo}`;
    if (!issuedTargets.some((x) => `${upper(x.part_number)}|${upper(x.do_number)}` === key)) {
      setFeedback({ type: "error", message: `This Part/DO is not in issued allocation: ${part} / ${doNo}`, at: Date.now() });
      return false;
    }
    if (stagedScans.some((x) => x.scan_data.trim() === scanData.trim())) {
      setFeedback({ type: "error", message: "Duplicate barcode scan detected.", at: Date.now() });
      return false;
    }
    setStagedScans((prev) => [
      ...prev,
      {
        id: uid(),
        part_number: part,
        do_number: doNo,
        scan_data: manualMode ? `MANUAL-${Date.now()}-${Math.random().toString(36).slice(2, 8)}` : scanData.trim(),
        source: manualMode ? "MANUAL" : "SCAN",
        reason: manualMode ? manualReason.trim() : undefined,
        scanned_at: new Date().toISOString(),
      },
    ]);
    setScanData("");
    setManualReason("");
    setFeedback({ type: "success", message: `Added ${part} / ${doNo}`, at: Date.now() });
    return true;
  }, [issuedTargets, manualMode, manualReason, scanData, selectedDo, selectedPart, stagedScans]);

  const removeStagedScan = useCallback((id: string) => {
    setStagedScans((prev) => prev.filter((x) => x.id !== id));
  }, []);

  const clearStagedScans = useCallback(() => {
    setStagedScans([]);
    setFeedback(IDLE_FEEDBACK);
  }, []);

  const buildPayloadScans = useCallback(
    () => stagedScans.map((x) => ({ part_number: x.part_number, do_number: x.do_number, scan_data: x.scan_data })),
    [stagedScans]
  );

  const buildManualRemarks = useCallback(() => {
    const rows = stagedScans
      .filter((x) => x.source === "MANUAL" && x.reason)
      .map((x) => `[MANUAL] ${x.part_number}/${x.do_number}: ${x.reason}`);
    return rows.length > 0 ? rows.join(" | ") : undefined;
  }, [stagedScans]);

  const reset = useCallback(() => {
    setSelectedPart("");
    setSelectedDo("");
    setScanData("");
    setManualMode(false);
    setManualReason("");
    setStagedScans([]);
    setFeedback(IDLE_FEEDBACK);
  }, []);

  return {
    partOptions,
    doOptionsForPart,
    selectedPart,
    setSelectedPart,
    selectedDo,
    setSelectedDo,
    scanData,
    setScanData,
    manualMode,
    setManualMode,
    manualReason,
    setManualReason,
    stagedScans,
    coverage,
    feedback,
    addStagedScan,
    removeStagedScan,
    clearStagedScans,
    buildPayloadScans,
    buildManualRemarks,
    reset,
  };
}
