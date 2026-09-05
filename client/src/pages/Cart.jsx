import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';

export default function Cart() {
  const { items, removeFromCart, updateQuantity, totalAmount } = useCart();
  const navigate = useNavigate();

  if (items.length === 0) {
    return (
      <div>
        <h2>Your Cart</h2>
        <p>Cart is empty.</p>
        <button onClick={() => navigate('/products')}>Back to Products</button>
      </div>
    );
  }

  return (
    <div>
      <h2>Your Cart</h2>
      {items.map((item) => (
        <div key={item.productId} className="card cart-item">
          {item.imageUrl && (
            <img src={`https://wholesale-shop-0pi1.onrender.com${item.imageUrl}`} alt={item.name} className="cart-thumb" />
          )}
          <div className="cart-details">
            <h4>{item.name}</h4>
            <p>₦{item.price} each</p>
            <div>
              <button onClick={() => updateQuantity(item.productId, item.quantity - 1)}>-</button>
              <span style={{ margin: '0 10px' }}>{item.quantity}</span>
              <button onClick={() => updateQuantity(item.productId, item.quantity + 1)}>+</button>
            </div>
            <p>Subtotal: ₦{item.price * item.quantity}</p>
            <button onClick={() => removeFromCart(item.productId)}>Remove</button>
          </div>
        </div>
      ))}

      <h3>Total: ₦{totalAmount}</h3>
      <button onClick={() => navigate('/checkout')}>Proceed to Checkout</button>
      <button onClick={() => navigate('/products')}>Back to Products</button>
    </div>
  );
}