import {
    Card,
    CardHeader,
    Input,
    Button,
    MessageStrip,
    BusyIndicator,
    FlexBox,
    FlexBoxAlignItems,
    FlexBoxJustifyContent,
    Icon
} from "@ui5/webcomponents-react";
import { useState, useRef, useEffect } from "react";
import "@ui5/webcomponents-icons/dist/bar-code.js";
import "@ui5/webcomponents-icons/dist/accept.js";
import "@ui5/webcomponents-icons/dist/decline.js";
import "@ui5/webcomponents-icons/dist/sys-enter-2.js";

export type ScanStatus = "IDLE" | "PROCESSING" | "VALID" | "INVALID";

interface ScanComponentProps {
    onScan: (value: string) => Promise<{ success: boolean; message?: string }>;
    label?: string;
    placeholder?: string;
    resetOnSuccess?: boolean;
    disabled?: boolean;
}

export function ScanComponent({ 
    onScan, 
    label = "Scan Barcode", 
    placeholder = "Waiting for scan...", 
    resetOnSuccess = true,
    disabled = false
}: ScanComponentProps) {
    const [value, setValue] = useState("");
    const [status, setStatus] = useState<ScanStatus>("IDLE");
    const [message, setMessage] = useState<string | undefined>(undefined);
    const inputRef = useRef<any>(null);

    // Auto-focus logic
    useEffect(() => {
        if (!disabled && status !== "PROCESSING") {
            const timer = setTimeout(() => {
                 inputRef.current?.focus();
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [disabled, status]);

    const handleScan = async () => {
        if (!value.trim() || status === "PROCESSING") return;

        setStatus("PROCESSING");
        setMessage(undefined);

        try {
            const result = await onScan(value);
            
            if (result.success) {
                setStatus("VALID");
                if (result.message) setMessage(result.message);
                
                if (resetOnSuccess) {
                    setTimeout(() => {
                        setValue("");
                        setStatus("IDLE");
                        setMessage(undefined);
                    }, 1500);
                }
            } else {
                setStatus("INVALID");
                setMessage(result.message || "Invalid scan code");
                // Do NOT clear input on error, let user see what they scanned
            }
        } catch (error) {
            setStatus("INVALID");
            setMessage("System error during scan validation");
            console.error(error);
        }
    };

    const handleKeyDown = (e: any) => {
        if (e.key === "Enter") {
            handleScan();
        }
    };

    // Determine UI state
    const valueState = status === "INVALID" ? "Negative" : 
                       status === "VALID" ? "Positive" : 
                       "None";

    return (
        <Card header={<CardHeader titleText={label} avatar={<Icon name="bar-code" />} />}>
            <div style={{ padding: "1rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
                
                {status === "PROCESSING" && (
                    <FlexBox alignItems={FlexBoxAlignItems.Center} justifyContent={FlexBoxJustifyContent.Center} style={{ padding: "1rem" }}>
                         <BusyIndicator active />
                    </FlexBox>
                )}

                {(status !== "PROCESSING") && (
                    <>
                        <div style={{ display: "flex", gap: "0.5rem" }}>
                            <Input
                                ref={inputRef}
                                value={value}
                                onInput={(e: any) => {
                                    setValue(e.target.value);
                                    if (status !== "IDLE") setStatus("IDLE"); // Reset status on typing
                                }}
                                onKeyDown={handleKeyDown}
                                placeholder={placeholder}
                                valueState={valueState}
                                disabled={disabled}
                                style={{ flex: 1 }}
                            />
                            <Button 
                                design="Emphasized" 
                                onClick={handleScan} 
                                disabled={disabled || !value}
                                icon="sys-enter-2"
                            >
                                Submit
                            </Button>
                        </div>

                        {message && (
                            <MessageStrip 
                                design={status === "VALID" ? "Positive" : "Negative"}
                                hideCloseButton
                            >
                                {message}
                            </MessageStrip>
                        )}
                    </>
                )}
            </div>
        </Card>
    );
}
