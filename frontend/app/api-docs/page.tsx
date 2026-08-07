"use client";

import SwaggerUI from 'swagger-ui-react';
import 'swagger-ui-react/swagger-ui.css';

export default function ApiDocs() {
  return (
    <div style={{ height: '100vh', padding: '20px' }}>
      <SwaggerUI url="/swagger.json" />
    </div>
  );
}
