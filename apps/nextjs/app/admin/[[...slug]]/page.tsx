'use client';

import { Admin } from '@opacacms/admin-react';

export default function AdminPage() {
  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950">
      <Admin apiURL="/api" basePath="/admin" />
    </div>
  );
}
