import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { User, Settings, Info } from "lucide-react";
import { toast } from "sonner";

export default function Ui5SmokeTest() {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <div className="p-8 min-h-screen bg-background">
      <h1 className="text-2xl font-bold mb-4">UI Smoke Test</h1>

      <Alert className="mb-4">
        <Info className="h-4 w-4" />
        <AlertDescription>
          This page verifies that the shared UI (shadcn + Tailwind + Lucide) works correctly.
        </AlertDescription>
      </Alert>

      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Mandatory Controls</CardTitle>
          <CardDescription>Input and buttons</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Input placeholder="Value state example" className="border-destructive" />
          <div className="flex gap-2">
            <Button onClick={() => toast.success("Success!")}>
              <User className="h-4 w-4 mr-2" />
              Show Success Toast
            </Button>
            <Button variant="secondary" onClick={() => setDialogOpen(true)}>
              <Settings className="h-4 w-4 mr-2" />
              Open Dialog
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Card Component</CardTitle>
          <CardDescription>Basic list</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="divide-y">
            <div className="py-2">Item 1</div>
            <div className="py-2 flex items-center gap-2">
              <User className="h-4 w-4" /> Item 2
            </div>
            <div className="py-2 flex items-center gap-2">
              <Settings className="h-4 w-4" /> Item 3
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Smoke Test Dialog</DialogTitle>
          </DialogHeader>
          <p className="text-sm">If you see this, the Dialog component is working correctly.</p>
          <DialogFooter>
            <Button onClick={() => setDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
