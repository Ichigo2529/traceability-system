import { MessageStrip } from "@ui5/webcomponents-react";

export function ApiErrorBanner({ message }: { message?: string }) {
  if (!message) return null;

  return (
    <MessageStrip design="Negative" className="admin-ui5-api-error" hideCloseButton>
      {message}
    </MessageStrip>
  );
}
