import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

export default function ManageTeam() {
  const [customers, setCustomers] = useState([]);
  const [deliveryPersons, setDeliveryPersons] = useState([]);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [customersRes, deliveryRes] = await Promise.all([
        api.get('/users/customers'),
        api.get('/users/delivery-persons')
      ]);
      setCustomers(customersRes.data);
      setDeliveryPersons(deliveryRes.data);
    } catch (err) {
      setError('Failed to load team data');
    }
  }

  async function handlePromote(userId) {
    try {
      await api.patch(`/users/${userId}/promote`);
      loadData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to promote');
    }
  }

  async function handleDemote(userId) {
    try {
      await api.patch(`/users/${userId}/demote`);
      loadData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to demote');
    }
  }

  return (
    <div>
      <div className="page-header">
        <h2>Manage Team</h2>
        <button onClick={() => navigate('/dashboard')}>Dashboard</button>
      </div>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      <h3>Delivery Persons</h3>
      {deliveryPersons.length === 0 && <p>No delivery persons yet.</p>}
      {deliveryPersons.map((person) => (
        <div key={person._id} className="card">
          <h4>{person.name}</h4>
          <p>{person.email}</p>
          <p>{person.phone}</p>
          <button onClick={() => handleDemote(person._id)} style={{ backgroundColor: '#c62828' }}>
            Remove from Delivery
          </button>
        </div>
      ))}

      <h3>Customers</h3>
      {customers.length === 0 && <p>No customers yet.</p>}
      {customers.map((customer) => (
        <div key={customer._id} className="card">
          <h4>{customer.name}</h4>
          <p>{customer.email}</p>
          <p>{customer.phone}</p>
          <button onClick={() => handlePromote(customer._id)}>
            Make Delivery Person
          </button>
        </div>
      ))}
    </div>
  );
}