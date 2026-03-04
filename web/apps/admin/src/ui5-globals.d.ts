
// Add custom element definitions to global namespace to fix TS errors for native UI5 components
declare namespace JSX {
  interface IntrinsicElements {
    'ui5-icon-tab-bar': any;
    'ui5-icon-tab-filter': any;
    'ui5-table-column': any;
    'ui5-badge': any;
  }
}

