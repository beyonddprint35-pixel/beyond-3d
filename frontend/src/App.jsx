import {
  BrowserRouter,
  Route,
  Routes,
} from "react-router-dom";

import Home from "./pages/Home";
import Admin from "./pages/Admin";
import OrderDetails from "./pages/OrderDetails";
import TrackOrder from "./pages/TrackOrder";
import MenuBuilder from "./pages/MenuBuilder";
import MenuMobilePreviewPage from "./pages/MenuMobilePreviewPage";


function App() {
  return (
    <BrowserRouter>
      <Routes>

        <Route
          path="/"
          element={
            <Home />
          }
        />


        <Route
          path="/menu-builder"
          element={
            <MenuBuilder />
          }
        />


        <Route
          path="/menu-mobile-preview"
          element={
            <MenuMobilePreviewPage />
          }
        />


        <Route
          path="/admin"
          element={
            <Admin />
          }
        />


        <Route
          path="/admin/order/:id"
          element={
            <OrderDetails />
          }
        />


        <Route
          path="/track"
          element={
            <TrackOrder />
          }
        />

      </Routes>
    </BrowserRouter>
  );
}


export default App;
