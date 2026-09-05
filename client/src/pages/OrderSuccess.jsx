import { useLocation, useNavigate } from 'react-router-dom';

export default function OrderSuccess() {
  const location = useLocation();
  const navigate = useNavigate();
  const orderId = location.state?.orderId;

  return (
    <div>
      <h2>Order Placed!</h2>
      <p>Your order has been placed successfully.</p>
      {orderId && <p>Order ID: {orderId}</p>}
      <p>Pay the delivery person in cash when your order arrives.</p>
      <button onClick={() => navigate('/products')}>Continue Shopping</button>
    </div>
  );
}