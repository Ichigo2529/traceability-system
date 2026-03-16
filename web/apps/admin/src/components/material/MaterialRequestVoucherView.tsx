import { MaterialRequestVoucherView as SharedMaterialRequestVoucherView } from "@traceability/material-ui";
import { formatDate, formatDateTime } from "../../lib/datetime";

export const MaterialRequestVoucherView = (props: any) => (
  <SharedMaterialRequestVoucherView
    {...props}
    formatDate={formatDate}
    formatDateTime={formatDateTime}
  />
);
