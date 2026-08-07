import {
  BrowserRouter,
  Routes,
  Route,
} from "react-router-dom";

import Home from "./pages/Home";
import Admin from "./pages/Admin";
import OrderDetails from "./pages/OrderDetails";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={<Home />}
        />

        <Route
          path="/admin"
          element={<Admin />}
        />

        <Route
          path="/admin/order/:id"
          element={<OrderDetails />}
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;