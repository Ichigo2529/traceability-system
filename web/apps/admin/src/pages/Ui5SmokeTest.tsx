import { useRef } from "react";
import { 
    Button, 
    Card, 
    CardHeader, 
    Input, 
    Label, 
    Title,
    Panel,
    Icon,
    FlexBox,
    FlexBoxDirection,
    FlexBoxAlignItems,
    Dialog,
    MessageStrip,
    Toast,
    DialogDomRef,
    ToastDomRef,
    Text,
    ValueState
} from "@ui5/webcomponents-react";
import "@ui5/webcomponents-icons/dist/employee.js";
import "@ui5/webcomponents-icons/dist/settings.js";
import "@ui5/webcomponents-icons/dist/message-information.js";

export default function Ui5SmokeTest() {
    const dialogRef = useRef<DialogDomRef>(null);
    const toastRef = useRef<ToastDomRef>(null);

    return (
        <div style={{ padding: "2rem", minHeight: "100vh", background: "var(--sapBackgroundColor)", boxSizing: "border-box" }}>
            <Title level="H1" style={{ marginBottom: "1rem" }}>UI5 Smoke Test</Title>
            

            <MessageStrip design="Information" style={{ marginBottom: "1rem" }}>
                This page verifies that the root UI5 setup is working correctly.
            </MessageStrip>

            <Panel headerText="Mandatory Controls" fixed>
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem", padding: "1rem" }}>
                    <Input
                        placeholder="Value state example"
                        valueState="Negative"
                        style={{ width: "100%" }}
                    />
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                        <Button design="Emphasized" icon="employee" onClick={() => (toastRef.current as any)?.show()}>
                            Show Success Toast
                        </Button>
                        <Button design="Attention" icon="settings" onClick={() => (dialogRef.current as any)?.show()}>
                            Open Dialog
                        </Button>
                    </div>
                </div>
            </Panel>

            <div style={{ marginTop: "1rem" }}>
                <Card header={<CardHeader titleText="Card Component" subtitleText="Basic List" />}>
                   <div style={{ padding: "1rem" }}>
                       <div style={{ padding: "0.5rem", borderBottom: "1px solid var(--sapList_BorderColor)" }}>Item 1</div>
                       <div style={{ padding: "0.5rem", borderBottom: "1px solid var(--sapList_BorderColor)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                           <Icon name="employee" /> Item 2
                       </div>
                       <div style={{ padding: "0.5rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                           <Icon name="settings" /> Item 3
                       </div>
                   </div>
                </Card>
            </div>
            
            <div style={{ marginTop: "1rem" }}>
                <Title level="H3">FlexBox Layout</Title>
                <FlexBox direction={FlexBoxDirection.Row} alignItems={FlexBoxAlignItems.Center} style={{ gap: "1rem", padding: "1rem", background: "var(--sapList_Background)" }}>
                    <div style={{ width: "50px", height: "50px", background: "var(--sapBrandColor)", borderRadius: "50%" }}></div>
                    <div style={{ width: "50px", height: "50px", background: "var(--sapPositiveColor)", borderRadius: "50%" }}></div>
                    <div style={{ width: "50px", height: "50px", background: "var(--sapNegativeColor)", borderRadius: "50%" }}></div>
                </FlexBox>
            </div>

            <Dialog ref={dialogRef} headerText="Smoke Test Dialog">
                <div style={{ padding: "1rem" }}>
                    <Text>If you see this, the Dialog component is working correctly.</Text>
                </div>
                <div slot="footer" style={{ padding: "0.5rem", display: "flex", justifyContent: "flex-end" }}>
                    <Button onClick={() => (dialogRef.current as any)?.close()}>Close</Button>
                </div>
            </Dialog>

            <Toast ref={toastRef}>System is functional!</Toast>
        </div>
    );
}
