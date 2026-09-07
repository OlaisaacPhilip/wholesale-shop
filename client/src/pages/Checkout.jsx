import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import api from '../api';

export default function Checkout() {
  const { items, totalAmount, clearCart } = useCart();
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handlePlaceOrder(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const orderItems = items.map((i) => ({ productId: i.productId, quantity: i.quantity }));

      const res = await api.post('/orders', {
        items: orderItems,
        deliveryAddress,
        contactPhone,
        paymentMethod
      });

      if (paymentMethod === 'cash') {
        // Cash orders are placed directly — no payment gateway involved
        clearCart();
        navigate('/order-success', { state: { orderId: res.data._id } });
      } else {
        // Card flow will initialize Paystack here once business registration is done
        setError('Card payments are coming soon. Please select Cash on Delivery.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to place order');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h2>Checkout</h2>
      {error && <p style={{ color: 'red' }}>{error}</p>}

      <form onSubmit={handlePlaceOrder}>
        <label>Delivery Address</label>
        <textarea
          value={deliveryAddress}
          onChange={(e) => setDeliveryAddress(e.target.value)}
          required
          placeholder="Enter full delivery address"
        />

        <label>Contact Phone Number</label>
        <input
          type="tel"
          value={contactPhone}
          onChange={(e) => setContactPhone(e.target.value)}
          pattern="[0-9]{11}"
          maxLength="11"
          required
          placeholder="Contact to reach you for this delivery(11 digits)"
        />

        <h3>Payment Method</h3>
        <div>
          <label>
            <input
              type="radio"
              name="paymentMethod"
              value="cash"
              checked={paymentMethod === 'cash'}
              onChange={(e) => setPaymentMethod(e.target.value)}
            />
            Cash on Delivery
          </label>
        </div>
        <div>
          <label style={{ opacity: 0.5 }}>
            <input type="radio" name="paymentMethod" value="card" disabled />
            Pay with Card (Coming Soon)
          </label>
        </div>

        <h3>Total: ₦{totalAmount}</h3>

        <button type="submit" disabled={loading}>
          {loading ? 'Placing order...' : 'Place Order'}
        </button>
      </form>
    </div>
  );
}