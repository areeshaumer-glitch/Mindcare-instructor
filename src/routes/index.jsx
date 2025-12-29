import { createBrowserRouter } from 'react-router-dom';
import { publucRoutes } from './PublicRoutes';

const allRoutes = [...publucRoutes];

export const router = createBrowserRouter(allRoutes);