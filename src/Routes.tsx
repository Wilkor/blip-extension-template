import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import ErrorPage from './pages/ErrorPage';
import Home from './pages/home';
import Layout from './pages/Layout';

const router = createBrowserRouter(
  [
    {
      path: '/',
      element: <Layout />,
      errorElement: <ErrorPage />,
      children: [
        {
          index: true,
          element: <Home />,
        },
      ],
    },
  ],
  {
    basename: process.env.PUBLIC_URL || '/',
  },
);

const Routes = () => {
  return <RouterProvider router={router} />;
};

export default Routes;
