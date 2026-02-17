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
    FlexBoxAlignItems
} from "@ui5/webcomponents-react";
import "@ui5/webcomponents-icons/dist/employee.js";
import "@ui5/webcomponents-icons/dist/settings.js";

export default function Ui5SmokeTest() {
    return (
        <div style={{ padding: "2rem", height: "100vh", background: "var(--sapBackgroundColor)" }}>
            <Title level="H1" style={{ marginBottom: "1rem" }}>UI5 Smoke Test</Title>
            
            <Panel headerText="Basic Components" fixed>
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem", padding: "1rem" }}>
                    <div>
                        <Label>Test Input:</Label>
                        <Input placeholder="Type something..." />
                    </div>
                    <div>
                        <Button design="Emphasized" icon="employee">Primary Button</Button>
                        <Button design="Transparent" icon="settings">Settings</Button>
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
        </div>
    );
}
