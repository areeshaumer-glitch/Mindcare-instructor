import React from 'react'
import SignIn from '../Pages/AuthPages/SignIn'
import Forgot from '../Pages/AuthPages/';

export const publucRoutes = [
  
    {
    path: '/',
    element : <SignIn/>,
    children: [
        {
            path: '/',
            element: <SignIn/>,
        },
        {
            path: '/forgot-password',
            element: <Forgot/>,
        }
    ],
  },
];