import { RouterProvider } from '@tanstack/react-router';
import { createRoot } from 'react-dom/client';
import { AppLayout } from '@/app-layout';
import { installStaleChunkReload } from '@/lib/reload-on-stale-chunk';
import { createAppRouter } from '@/routes/route-tree';

installStaleChunkReload();

const router = createAppRouter({ renderRoot: (page) => <AppLayout>{page}</AppLayout> });

const container = document.getElementById('root');
if (!container) throw new Error('The page has no #root element to mount the app in.');
createRoot(container).render(<RouterProvider router={router} />);
