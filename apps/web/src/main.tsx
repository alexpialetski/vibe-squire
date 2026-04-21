import { ApolloProvider } from '@apollo/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Toaster } from 'react-hot-toast';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App';
import { apolloClient } from './graphql';
import './operator.css';

const queryClient = new QueryClient();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ApolloProvider client={apolloClient}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: {
              background: '#171c19',
              color: '#e8f0ea',
              border: '1px solid #2a332e',
            },
            success: {
              iconTheme: {
                primary: '#3d9f7a',
                secondary: '#0f1210',
              },
            },
            error: {
              iconTheme: {
                primary: '#c45c5c',
                secondary: '#0f1210',
              },
            },
          }}
        />
      </QueryClientProvider>
    </ApolloProvider>
  </StrictMode>,
);
