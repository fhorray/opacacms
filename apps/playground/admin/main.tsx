import { createRoot } from 'react-dom/client';
import { Admin } from '@opacacms/admin-react';

// Just import Admin and pass your API URL - that's it!
createRoot(document.getElementById('root')!).render(
  <Admin apiURL="http://localhost:3000/api" />,
);
