import { Search } from 'lucide-react';
import "../../App.css";

export default function Inventory({
  medicines,
  inventorySearch,
  setInventorySearch,
  inventoryError,
  inventorySuccess,
  setInventoryError,
  setInventorySuccess,
  setStockAction,
  setStockQuantity,
  setStockMedicine,
  savingStock,
  stockMedicine,
  stockAction,
  stockQuantity,
  handleStockTransaction,
  expiryMedicines,
}) {
  return (
      <section className="inventory-page">
        <div className="content-card">
          <div className="section-header">
            <div>
              <h2>Inventory Management</h2>
              <p>Monitor stock and manage medicine availability.</p>
            </div>
            <button
              type="button"
              className="primary-btn"
              onClick={() => {
                setInventoryError('');
                setInventorySuccess('');
                setInventorySearch('');
                setStockAction('in');
                setStockQuantity('');
                setStockMedicine(null);
              }}
            >
              Refresh View
            </button>
          </div>

          {inventoryError && (
            <div className="login-error" role="alert">
              {inventoryError}
            </div>
          )}

          {inventorySuccess && (
            <div className="medicine-success" role="status">
              {inventorySuccess}
            </div>
          )}

          <div className="inventory-summary">
            <div className="inventory-stat">
              <span>Total Medicines</span>
              <strong>{medicines.length}</strong>
            </div>

            <div className="inventory-stat">
              <span>Low Stock</span>
              <strong>
                {medicines.filter(
                  (medicine) =>
                    Number(medicine.quantity) <=
                    Number(medicine.min_stock ?? 10)
                ).length}
              </strong>
            </div>

            <div className="inventory-stat">
              <span>Out of Stock</span>
              <strong>
                {medicines.filter(
                  (medicine) => Number(medicine.quantity) === 0
                ).length}
              </strong>
            </div>
          </div>

          <label className="inventory-search">
            <Search size={18} />
            <input
              type="search"
              placeholder="Search inventory by medicine name..."
              value={inventorySearch}
              onChange={(event) => setInventorySearch(event.target.value)}
            />
          </label>

          <div className="table-container">
            <table className="medicine-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Medicine</th>
                  <th>Price</th>
                  <th>Available Stock</th>
                  <th>Minimum Stock</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {medicines
                  .filter((medicine) =>
                    medicine.name
                      .toLowerCase()
                      .includes(inventorySearch.toLowerCase())
                  )
                  .map((medicine) => {
                    const quantity = Number(medicine.quantity);
                    const minimum = Number(medicine.min_stock ?? 10);

                    const status =
                      quantity === 0
                        ? 'Out of Stock'
                        : quantity <= minimum
                          ? 'Low Stock'
                          : 'In Stock';

                    return (
                      <tr key={medicine.id}>
                        <td>{medicine.id}</td>
                        <td>{medicine.name}</td>
                        <td>₹{Number(medicine.price).toFixed(2)}</td>
                        <td>{quantity}</td>
                        <td>{minimum}</td>
                        <td>
                          <span
                            className={`stock-badge ${quantity === 0
                              ? 'stock-empty'
                              : quantity <= minimum
                                ? 'stock-low'
                                : 'stock-available'
                              }`}
                          >
                            {status}
                          </span>
                        </td>
                        <td>
                          <div className="medicine-actions">
                            <button
                              type="button"
                              className="secondary-btn"
                              disabled={savingStock}
                              onClick={() => {
                                setInventoryError('');
                                setInventorySuccess('');
                                setStockMedicine(medicine);
                                setStockAction('in');
                                setStockQuantity('');
                              }}
                            >
                              Stock In
                            </button>

                            <button
                              type="button"
                              className="delete-btn"
                              disabled={savingStock || quantity === 0}
                              onClick={() => {
                                setInventoryError('');
                                setInventorySuccess('');
                                setStockMedicine(medicine);
                                setStockAction('out');
                                setStockQuantity('');
                              }}
                            >
                              Stock Out
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>

            {medicines.filter((medicine) =>
              medicine.name
                .toLowerCase()
                .includes(inventorySearch.toLowerCase())
            ).length === 0 && (
                <p className="empty-message">
                  No matching medicines found.
                </p>
              )}
          </div>
        </div>
        {stockMedicine && (
          <section className="content-card stock-form-card">
            <h2>
              {stockAction === 'in' ? 'Add Stock' : 'Remove Stock'}
            </h2>

            <p>
              Medicine: <strong>{stockMedicine.name}</strong>
            </p>

            <p>
              Current stock: <strong>{stockMedicine.quantity}</strong>
            </p>

            <form onSubmit={handleStockTransaction}>
              <div className="form-field">
                <label htmlFor="stock-quantity">
                  Quantity <span>*</span>
                </label>
                <input
                  id="stock-quantity"
                  type="number"
                  min="1"
                  step="1"
                  value={stockQuantity}
                  onChange={(event) => setStockQuantity(event.target.value)}
                  required
                />
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="secondary-btn"
                  disabled={savingStock}
                  onClick={() => {
                    setStockMedicine(null);
                    setStockQuantity('');
                    setInventoryError('');
                  }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="primary-btn"
                  disabled={savingStock}
                >
                  {savingStock
                    ? 'Processing...'
                    : stockAction === 'in'
                      ? 'Confirm Stock In'
                      : 'Confirm Stock Out'}
                </button>
              </div>
            </form>
          </section>
        )}

        <section className="content-card">
          <h2>Expiry Alerts</h2>
          <p>Expired medicines and medicines expiring within 30 days.</p>

          {expiryMedicines.length === 0 ? (
            <p className="empty-message">
              No expiry alerts loaded yet.
            </p>
          ) : (
            <div className="table-container">
              <table className="medicine-table">
                <thead>
                  <tr>
                    <th>Medicine</th>
                    <th>Expiry Date</th>
                    <th>Quantity</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {expiryMedicines.map((medicine) => (
                    <tr key={medicine.id}>
                      <td>{medicine.name}</td>
                      <td>{medicine.expiry_date || '—'}</td>
                      <td>{medicine.quantity}</td>
                      <td>{medicine.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </section>
  );
}
