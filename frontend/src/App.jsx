import {
  BrowserRouter,
  Route,
  Routes,
} from "react-router-dom";

import Home from "./pages/Home";
import Admin from "./pages/Admin";
import OrderDetails from "./pages/OrderDetails";
import TrackOrder from "./pages/TrackOrder";

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