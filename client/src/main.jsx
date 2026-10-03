import { lazy, StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { StoreProvider } from './state/store.jsx';
import Layout from './components/Layout.jsx';
import { Spinner } from './components/UI.jsx';
import Home from './pages/Home.jsx';
import Shop from './pages/Shop.jsx';
import Product from './pages/Product.jsx';
import Checkout from './pages/Checkout.jsx';
import { OrderPlaced, Track } from './pages/Orders.jsx';
import Account, { Auth } from './pages/Account.jsx';
import { Custom, NotFound, Privacy, Terms } from './pages/Content.jsx';
import './styles/base.css';
import './styles/site.css';

// The admin is a separate bundle: customers never download it.
const Admin = lazy(() => import('./admin/Admin.jsx'));

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <StoreProvider>
        <Routes>
          <Route path="/admin/*" element={<Suspense fallback={<Spinner />}><Admin /></Suspense>} />
          <Route element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="shop" element={<Shop />} />
            <Route path="product/:slug" element={<Product />} />
            <Route path="checkout" element={<Checkout />} />
            <Route path="order/:number" element={<OrderPlaced />} />
            <Route path="track" element={<Track />} />
            <Route path="login" element={<Auth mode="login" />} />
            <Route path="register" element={<Auth mode="register" />} />
            <Route path="account/*" element={<Account />} />
            <Route path="custom" element={<Custom />} />
            <Route path="ideas" element={<Navigate to="/custom" replace />} />
            <Route path="privacy" element={<Privacy />} />
            <Route path="terms" element={<Terms />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </StoreProvider>
    </BrowserRouter>
  </StrictMode>,
);
