import { Alert } from "./alert";

export function ApiErrorBanner({ message }: { message?: string }) {
  if (!message) return null;

  return (
    <Alert variant="destructive" className="w-full">
      {message}
    </Alert>
  );
}
