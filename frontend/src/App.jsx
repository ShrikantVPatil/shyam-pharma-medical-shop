import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  Activity,
  AlertTriangle,
  ArrowDownToLine,
  ArrowUpFromLine,
  BarChart3,
  Bell,
  Boxes,
  Check,
  ChevronDown,
  CircleDollarSign,
  Clock3,
  CreditCard,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Pill,
  Plus,
  Printer,
  RefreshCw,
  Search,
  ShoppingCart,
  Trash2,
  TrendingUp,
  Users,
  X,
} from 'lucide-react';

import './App.css';

const API = import.meta.env.VITE_API_URL;
const money = (n) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(Number(n || 0));

const dateLabel = (value) =>
  value
    ? new Date(value).toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : '—';

function App() {
  const [token, setToken] = useState(
    () => localStorage.getItem('token') || ''
  );

  const [user, setUser] = useState(null);
  const [page, setPage] = useState('Dashboard');
  const [mobileOpen, setMobileOpen] = useState(false);

  const [medicines, setMedicines] = useState([]);
  const [sales, setSales] = useState([]);
  const [expiry, setExpiry] = useState([]);

  const [salesReport, setSalesReport] = useState(null);
  const [inventoryReport, setInventoryReport] = useState(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [query, setQuery] = useState('');

  const [login, setLogin] = useState({
    username: '',
    password: '',
  });

  const [loginBusy, setLoginBusy] = useState(false);

  const [modal, setModal] = useState('');
  const [editing, setEditing] = useState(null);

  const [form, setForm] = useState({
    name: '',
    price: '',
    quantity: '',
    expiry_date: '',
  });

  const [stock, setStock] = useState({
    medicine_id: '',
    quantity: '',
    direction: 'in',
  });

  const [sale, setSale] = useState({
    medicine_id: '',
    quantity: 1,
  });

  const [bill, setBill] = useState({
    sale_ids: [],
    payment_method: 'cash',
  });

  const [billResult, setBillResult] = useState(null);
  const [billId, setBillId] = useState('');
  const [billDetails, setBillDetails] = useState(null);

  // Send authenticated requests to the FastAPI backend.
  const request = useCallback(
    async (path, options = {}) => {
      const headers = {
        ...(options.body
          ? { 'Content-Type': 'application/json' }
          : {}),
        ...(token
          ? { Authorization: `Bearer ${token}` }
          : {}),
        ...options.headers,
      };

      const response = await fetch(`${API}${path}`, {
        ...options,
        headers,
      });

      const data =
        response.status === 204
          ? null
          : await response.json().catch(() => ({}));

      // Clear the session if authentication has expired.
      if (response.status === 401) {
        localStorage.removeItem('token');

        setToken('');
        setUser(null);

        setLogin({
          username: '',
          password: '',
        });

        setPage('Dashboard');

        throw new Error(
          'Your session expired. Please sign in again.'
        );
      }

      if (!response.ok) {
        throw new Error(
          typeof data?.detail === 'string'
            ? data.detail
            : `Request failed (${response.status})`
        );
      }

      return data;
    },
    [token]
  );

  // Load medicines, sales, expiry alerts, and reports.
  const loadAll = useCallback(async () => {
    if (!token) {
      return;
    }

    setLoading(true);
    setError('');

    const jobs = [
      ['medicines', '/medicines', setMedicines],
      ['sales', '/sales', setSales],
      ['expiry', '/medicines/expiry-alerts', setExpiry],
      ['salesReport', '/reports/sales', setSalesReport],
      [
        'inventoryReport',
        '/reports/inventory',
        setInventoryReport,
      ],
    ];

    try {
      const results = await Promise.allSettled(
        jobs.map(([, path]) => request(path))
      );

      const failures = [];

      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          jobs[index][2](result.value);
          return;
        }

        const jobName = jobs[index][0];

        // Reports are administrator-only.
        // Other roles can use locally calculated summaries.
        if (
          jobName === 'salesReport' ||
          jobName === 'inventoryReport'
        ) {
          return;
        }

        failures.push(
          result.reason?.message || 'Unable to load data'
        );
      });

      if (failures.length) {
        setError(failures[0]);
      }
    } finally {
      setLoading(false);
    }
  }, [token, request]);

  // Load application data after login.
  useEffect(() => {
    if (token) {
      loadAll();
    }
  }, [token, loadAll]);

  // Automatically dismiss success notifications.
  useEffect(() => {
    if (!notice) {
      return;
    }

    const timer = setTimeout(() => {
      setNotice('');
    }, 3500);

    return () => clearTimeout(timer);
  }, [notice]);

  // Authenticate the user.
  async function signIn(event) {
    event.preventDefault();

    setLoginBusy(true);
    setError('');

    try {
      const body = new URLSearchParams();

      body.set('username', login.username);
      body.set('password', login.password);

      const response = await fetch(`${API}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type':
            'application/x-www-form-urlencoded',
        },
        body,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Login failed');
      }

      if (!data.access_token) {
        throw new Error(
          'The server did not return an access token.'
        );
      }

      localStorage.setItem('token', data.access_token);

      setToken(data.access_token);
      setUser({
        username: login.username,
      });

      // Clear the login fields after successful authentication.
      setLogin({
        username: '',
        password: '',
      });

      setPage('Dashboard');
    } catch (error) {
      setError(
        error.message === 'Failed to fetch'
          ? 'Cannot connect to FastAPI. Make sure the backend is running.'
          : error.message
      );
    } finally {
      setLoginBusy(false);
    }
  }

  // Log out and clear the login fields.
  async function logout() {
    try {
      await request('/auth/logout', {
        method: 'POST',
      });
    } catch {
      // Clear the local session even if the request fails.
    }

    localStorage.removeItem('token');

    setToken('');
    setUser(null);

    setLogin({
      username: '',
      password: '',
    });

    setPage('Dashboard');
    setMobileOpen(false);
    setModal('');

    setMedicines([]);
    setSales([]);
    setExpiry([]);
    setSalesReport(null);
    setInventoryReport(null);

    setBillResult(null);
    setBillDetails(null);
    setBillId('');

    setError('');
    setNotice('');
  }

  // Open the medicine form for adding or editing.
  async function openMedicine(medicine = null) {
    setEditing(medicine);

    setForm(
      medicine
        ? {
            name: medicine.name,
            price: medicine.price,
            quantity: medicine.quantity,
            expiry_date: medicine.expiry_date || '',
          }
        : {
            name: '',
            price: '',
            quantity: '',
            expiry_date: '',
          }
    );

    setModal('medicine');
  }

  // Save a new medicine or update an existing one.
  async function saveMedicine(event) {
    event.preventDefault();

    const body = {
      name: form.name.trim(),
      price: Number(form.price),
      quantity: Number(form.quantity),
      expiry_date: form.expiry_date || null,
    };

    try {
      await request(
        editing
          ? `/medicines/${editing.id}`
          : '/medicines',
        {
          method: editing ? 'PUT' : 'POST',
          body: JSON.stringify(body),
        }
      );

      setModal('');

      setNotice(
        editing
          ? 'Medicine updated successfully'
          : 'Medicine added successfully'
      );

      await loadAll();
    } catch (error) {
      setError(error.message);
    }
  }

  // Delete a medicine.
  async function deleteMedicine(medicine) {
    if (!confirm(`Delete ${medicine.name}?`)) {
      return;
    }

    try {
      await request(`/medicines/${medicine.id}`, {
        method: 'DELETE',
      });

      setNotice('Medicine deleted');

      await loadAll();
    } catch (error) {
      setError(error.message);
    }
  }

  // Add or remove stock.
  async function saveStock(event) {
    event.preventDefault();

    const path =
      stock.direction === 'in'
        ? '/inventory/stock-in'
        : '/inventory/stock-out';

    try {
      const result = await request(path, {
        method: 'POST',
        body: JSON.stringify({
          medicine_id: Number(stock.medicine_id),
          quantity: Number(stock.quantity),
        }),
      });

      setModal('');

      setNotice(result.message || 'Stock updated');

      setStock({
        medicine_id: '',
        quantity: '',
        direction: 'in',
      });

      await loadAll();
    } catch (error) {
      setError(error.message);
    }
  }

  // Record a medicine sale.
  async function createSale(event) {
    event.preventDefault();

    try {
      const result = await request('/sales', {
        method: 'POST',
        body: JSON.stringify({
          medicine_id: Number(sale.medicine_id),
          quantity: Number(sale.quantity),
        }),
      });

      setModal('');

      setNotice(`Sale #${result.sale_id} completed`);

      setSale({
        medicine_id: '',
        quantity: 1,
      });

      await loadAll();
    } catch (error) {
      setError(error.message);
    }
  }

  // Create a bill from selected sales.
  async function createBill(event) {
    event.preventDefault();

    try {
      const result = await request('/bills', {
        method: 'POST',
        body: JSON.stringify({
          sale_ids: bill.sale_ids.map(Number),
          payment_method: bill.payment_method,
        }),
      });

      setBillResult(result);

      setNotice(`Bill #${result.bill_id} created`);

      setBill({
        sale_ids: [],
        payment_method: 'cash',
      });

      await loadAll();
    } catch (error) {
      setError(error.message);
    }
  }

  // Retrieve an existing bill.
  async function fetchBill(event) {
    event.preventDefault();

    try {
      const details = await request(
        `/bills/${Number(billId)}`
      );

      setBillDetails(details);
      setError('');
    } catch (error) {
      setError(error.message);
      setBillDetails(null);
    }
  }

  // Search medicines by name or ID.
  const filteredMedicines = useMemo(
    () =>
      medicines.filter((medicine) =>
        `${medicine.name} ${medicine.id}`
          .toLowerCase()
          .includes(query.toLowerCase())
      ),
    [medicines, query]
  );

  // Identify medicines that have low stock.
  const lowStock = medicines.filter(
    (medicine) =>
      Number(medicine.quantity) <=
      Number(medicine.min_stock ?? 10)
  );

  const today = new Date().toDateString();

  const todaySales = sales.filter(
    (item) =>
      item.sale_date &&
      new Date(item.sale_date).toDateString() === today
  );

  const todayRevenue = todaySales.reduce(
    (sum, item) =>
      sum + Number(item.total_price || 0),
    0
  );

  const revenue =
    salesReport?.total_revenue ??
    sales.reduce(
      (sum, item) =>
        sum + Number(item.total_price || 0),
      0
    );

  const nav = [
    ['Dashboard', LayoutDashboard],
    ['Medicines', Pill],
    ['Inventory', Boxes],
    ['Sales', ShoppingCart],
    ['Billing', FileText],
    ['Reports', BarChart3],
  ];

  const pageTitle = {
    Dashboard: 'Overview',
    Medicines: 'Medicine catalogue',
    Inventory: 'Inventory control',
    Sales: 'Sales management',
    Billing: 'Billing & payments',
    Reports: 'Reports & analytics',
  }[page];

  // Show the login screen when the user is not authenticated.
  if (!token) {
    return (
      <div className="login-shell">
        <div className="login-visual">
          <div className="brand-lockup">
            <span className="brand-mark">
              <Pill size={27} />
            </span>

            <div>
              <b>
                SHYAM <em>PHARMA</em>
              </b>
              <small>PHARMACY MANAGEMENT</small>
            </div>
          </div>

          <div className="login-pitch">
            <span className="eyebrow">
              SMARTER PHARMACY OPERATIONS
            </span>

            <h1>
              Care for your
              <br />
              <span>business.</span>
            </h1>

            <p>
              Inventory, sales and billing in one calm,
              clear workspace.
            </p>

            <div className="login-mini-stats">
              <div>
                <Pill />
                <b>Medicines</b>
                <small>Inventory control</small>
              </div>

              <div>
                <Activity />
                <b>Insights</b>
                <small>Live operations</small>
              </div>
            </div>
          </div>

          <div className="login-foot">
            Secure workspace · Built for pharmacy teams
          </div>
        </div>

        <div className="login-panel">
          <form
            className="login-form"
            onSubmit={signIn}
            autoComplete="off"
          >
            <div className="mobile-brand">
              <span className="brand-mark">
                <Pill />
              </span>

              <b>SHYAM PHARMA</b>
            </div>

            <span className="eyebrow">WELCOME BACK</span>

            <h2>Sign in to continue</h2>

            <p className="muted">
              Enter your staff credentials to access your
              workspace.
            </p>

            {error && (
              <div className="alert error" role="alert">
                <AlertTriangle size={17} />
                {error}
              </div>
            )}

            <label>
              Username

              <input
                type="text"
                name="pharmacy-login-username"
                autoComplete="off"
                value={login.username}
                onChange={(event) =>
                  setLogin({
                    ...login,
                    username: event.target.value,
                  })
                }
                placeholder="Enter your username"
                required
              />
            </label>

            <label>
              Password

              <input
                type="password"
                name="pharmacy-login-password"
                autoComplete="new-password"
                value={login.password}
                onChange={(event) =>
                  setLogin({
                    ...login,
                    password: event.target.value,
                  })
                }
                placeholder="Enter your password"
                required
              />
            </label>

            <button
              className="btn primary full"
              type="submit"
              disabled={loginBusy}
            >
              {loginBusy
                ? 'Signing in…'
                : 'Sign in securely'}

              <ChevronDown
                className="rotate"
                size={18}
              />
            </button>

            <small className="login-note">
              Authorised staff only. Contact your
              administrator for access.
            </small>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      {/* Sidebar navigation */}
      <aside
        className={`sidebar ${mobileOpen ? 'open' : ''}`}
      >
        <div className="brand-lockup sidebar-brand">
          <span className="brand-mark">
            <Pill size={23} />
          </span>

          <div>
            <b>
              SHYAM <em>PHARMA</em>
            </b>
            <small>MANAGEMENT SYSTEM</small>
          </div>

          <button
            className="icon-btn mobile-close"
            type="button"
            onClick={() => setMobileOpen(false)}
            aria-label="Close navigation"
          >
            <X />
          </button>
        </div>

        <div className="nav-label">WORKSPACE</div>

        <nav>
          {nav.map(([name, Icon]) => (
            <button
              key={name}
              className={`nav-item module-${name.toLowerCase()} ${
                page === name ? 'active' : ''
              }`}
              onClick={() => {
                setPage(name);
                setMobileOpen(false);
                setError('');
              }}
            >
              <Icon size={19} />

              <span>{name}</span>

              {name === 'Inventory' &&
                lowStock.length > 0 && (
                  <i className="nav-count">
                    {lowStock.length}
                  </i>
                )}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="help-card">
            <div className="help-icon">
              <Activity size={18} />
            </div>

            <b>Keep your store in sync</b>

            <p>
              Refresh data to view the latest activity.
            </p>

            <button onClick={loadAll}>
              <RefreshCw size={14} />
              Refresh data
            </button>
          </div>

          <button
            className="profile-row"
            onClick={logout}
          >
            <span className="avatar">
              {(
                user?.username ||
                login.username ||
                'U'
              )
                .charAt(0)
                .toUpperCase()}
            </span>

            <span className="profile-copy">
              <b>{user?.username || 'Staff account'}</b>
              <small>Authenticated staff</small>
            </span>

            <LogOut size={17} />
          </button>
        </div>
      </aside>

      {/* Main application area */}
      <div className="main-area">
        <header className="topbar">
          <button
            className="icon-btn mobile-menu"
            onClick={() => setMobileOpen(true)}
            aria-label="Open navigation"
          >
            <Menu />
          </button>

          <div>
            <div className="breadcrumbs">
              Workspace <span>/</span> {page}
            </div>

            <h1>{pageTitle}</h1>
          </div>

          <div className="top-actions">
            <div className="system-status">
              <span></span>
              API workspace
            </div>

            <button
              className="icon-btn"
              title="Refresh data"
              onClick={loadAll}
            >
              <RefreshCw size={18} />
            </button>

            <button
              className="icon-btn notification"
              title="Alerts"
              onClick={() => setPage('Inventory')}
            >
              <Bell size={19} />

              {lowStock.length + expiry.length > 0 && (
                <i />
              )}
            </button>

            <div className="top-avatar">
              {(user?.username || 'U')
                .charAt(0)
                .toUpperCase()}
            </div>
          </div>
        </header>

        <main className="content-wrap">
          {/* Application notifications */}
          {error && (
            <div className="alert error">
              <AlertTriangle size={17} />

              <span>{error}</span>

              <button
                onClick={() => setError('')}
                aria-label="Dismiss error"
              >
                <X size={16} />
              </button>
            </div>
          )}

          {notice && (
            <div className="alert success">
              <Check size={17} />

              {notice}

              <button
                onClick={() => setNotice('')}
                aria-label="Dismiss notification"
              >
                <X size={16} />
              </button>
            </div>
          )}

          {/* Dashboard */}
          {page === 'Dashboard' && (
            <>
              <div className="welcome-row">
                <div>
                  <span className="eyebrow">
                    YOUR PHARMACY AT A GLANCE
                  </span>

                  <h2>
                    Good to see you again
                    {user?.username
                      ? `, ${user.username}`
                      : ''}
                    .
                  </h2>

                  <p>
                    Here's what's happening at your store
                    today.
                  </p>
                </div>

                <button
                  className="btn primary"
                  onClick={() => {
                    setSale({
                      medicine_id: '',
                      quantity: 1,
                    });

                    setModal('sale');
                  }}
                >
                  <Plus size={17} />
                  New sale
                </button>
              </div>

              <div className="stats-grid">
                <Stat
                  icon={Pill}
                  label="Total medicines"
                  value={
                    inventoryReport?.total_medicines ??
                    medicines.length
                  }
                  foot="In your catalogue"
                  tone="violet"
                />

                <Stat
                  icon={ShoppingCart}
                  label="Today's sales"
                  value={todaySales.length}
                  foot={`${money(todayRevenue)} sales value today`}
                  tone="blue"
                />

                <Stat
                  icon={AlertTriangle}
                  label="Low stock items"
                  value={
                    inventoryReport?.low_stock_medicines ??
                    lowStock.length
                  }
                  foot="At or below stock threshold"
                  tone="amber"
                />

                <Stat
                  icon={CircleDollarSign}
                  label="Total revenue"
                  value={money(revenue)}
                  foot="All recorded sales"
                  tone="green"
                />
              </div>

              <div className="dashboard-grid">
                <section className="panel recent-panel">
                  <div className="panel-head">
                    <div>
                      <h3>Recent sales</h3>
                      <p>
                        Latest transactions recorded in
                        the system
                      </p>
                    </div>

                    <button
                      className="text-btn"
                      onClick={() => setPage('Sales')}
                    >
                      View all <span>→</span>
                    </button>
                  </div>

                  {sales.length ? (
                    <div className="table-scroll">
                      <table>
                        <thead>
                          <tr>
                            <th>Sale</th>
                            <th>Medicine</th>
                            <th>Qty</th>
                            <th>Date</th>
                            <th className="align-right">
                              Amount
                            </th>
                          </tr>
                        </thead>

                        <tbody>
                          {sales.slice(0, 6).map((item) => (
                            <tr key={item.sale_id}>
                              <td>
                                <span className="id-pill">
                                  #{item.sale_id}
                                </span>
                              </td>

                              <td className="strong">
                                {item.medicine_name}
                              </td>

                              <td>{item.quantity}</td>

                              <td>
                                {dateLabel(item.sale_date)}
                              </td>

                              <td className="align-right strong">
                                {money(item.total_price)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <Empty
                      icon={ShoppingCart}
                      title="No sales recorded yet"
                      text="Your completed sales will appear here."
                      action="Create first sale"
                      onClick={() => setModal('sale')}
                    />
                  )}
                </section>

                <section className="panel alerts-panel">
                  <div className="panel-head">
                    <div>
                      <h3>Needs attention</h3>
                      <p>Stock and expiry alerts</p>
                    </div>

                    <span className="alert-total">
                      {lowStock.length + expiry.length}
                    </span>
                  </div>

                  {lowStock.slice(0, 4).map((medicine) => (
                    <div
                      className="alert-row"
                      key={`low${medicine.id}`}
                    >
                      <span className="alert-symbol amber">
                        <Boxes size={17} />
                      </span>

                      <div>
                        <b>{medicine.name}</b>
                        <small>
                          Only {medicine.quantity} units
                          remaining
                        </small>
                      </div>

                      <span className="status-tag warning">
                        Low stock
                      </span>
                    </div>
                  ))}

                  {expiry.slice(0, 3).map((medicine) => (
                    <div
                      className="alert-row"
                      key={`exp${medicine.id}`}
                    >
                      <span className="alert-symbol red">
                        <Clock3 size={17} />
                      </span>

                      <div>
                        <b>{medicine.name}</b>
                        <small>
                          Expiry:{' '}
                          {medicine.expiry_date ||
                            'Date unavailable'}
                        </small>
                      </div>

                      <span className="status-tag danger">
                        Expiry
                      </span>
                    </div>
                  ))}

                  {!lowStock.length && !expiry.length && (
                    <Empty
                      icon={Check}
                      title="All clear"
                      text="No stock or expiry alerts right now."
                    />
                  )}
                </section>
              </div>

              <div className="bottom-grid">
                <section className="panel quick-panel">
                  <div className="panel-head">
                    <div>
                      <h3>Quick actions</h3>
                      <p>
                        Common tasks, right at your fingertips
                      </p>
                    </div>
                  </div>

                  <div className="quick-actions">
                    <Quick
                      icon={Plus}
                      title="Add medicine"
                      text="Register a product"
                      onClick={() => openMedicine()}
                    />

                    <Quick
                      icon={ArrowDownToLine}
                      title="Stock in"
                      text="Receive inventory"
                      onClick={() => {
                        setStock({
                          medicine_id: '',
                          quantity: '',
                          direction: 'in',
                        });

                        setModal('stock');
                      }}
                    />

                    <Quick
                      icon={ShoppingCart}
                      title="Record sale"
                      text="Sell a medicine"
                      onClick={() => setModal('sale')}
                    />

                    <Quick
                      icon={FileText}
                      title="Create bill"
                      text="Generate a receipt"
                      onClick={() => setPage('Billing')}
                    />
                  </div>
                </section>

                <section className="panel inventory-summary">
                  <div className="panel-head">
                    <div>
                      <h3>Inventory snapshot</h3>
                      <p>Current stock overview</p>
                    </div>

                    <button
                      className="text-btn"
                      onClick={() => setPage('Inventory')}
                    >
                      Inventory →
                    </button>
                  </div>

                  <div className="inventory-metrics">
                    <div>
                      <span>Total units in stock</span>

                      <b>
                        {inventoryReport?.total_stock ??
                          medicines
                            .reduce(
                              (sum, medicine) =>
                                sum +
                                Number(
                                  medicine.quantity || 0
                                ),
                              0
                            )
                            .toLocaleString('en-IN')}
                      </b>
                    </div>

                    <div>
                      <span>Inventory value</span>

                      <b>
                        {money(
                          inventoryReport?.inventory_value ??
                            medicines.reduce(
                              (sum, medicine) =>
                                sum +
                                Number(medicine.price || 0) *
                                  Number(
                                    medicine.quantity || 0
                                  ),
                              0
                            )
                        )}
                      </b>
                    </div>
                  </div>

                  <div className="progress-track">
                    <span
                      style={{
                        width: `${
                          medicines.length
                            ? Math.max(
                                4,
                                100 -
                                  (lowStock.length /
                                    medicines.length) *
                                    100
                              )
                            : 0
                        }%`,
                      }}
                    />
                  </div>

                  <small className="muted">
                    {medicines.length
                      ? `${
                          Math.max(
                            0,
                            medicines.length - lowStock.length
                          )
                        } of ${medicines.length} medicines above low-stock threshold`
                      : 'Add medicines to see inventory health'}
                  </small>
                </section>
              </div>
            </>
          )}

          {/* Medicines */}
          {page === 'Medicines' && (
            <>
              <PageIntro
                eyebrow="PRODUCT CATALOGUE"
                title="Manage medicines"
                text="Maintain product details, prices and available quantities."
                action={
                  <button
                    className="btn primary"
                    onClick={() => openMedicine()}
                  >
                    <Plus size={17} />
                    Add medicine
                  </button>
                }
              />

              <div className="toolbar">
                <div className="search-input">
                  <Search size={17} />

                  <input
                    value={query}
                    onChange={(event) =>
                      setQuery(event.target.value)
                    }
                    placeholder="Search by medicine name or ID…"
                  />
                </div>

                <span className="result-count">
                  {filteredMedicines.length} medicines
                </span>
              </div>

              <section className="panel">
                <DataTable
                  columns={[
                    'ID',
                    'Medicine',
                    'Price',
                    'Quantity',
                    'Status',
                    'Actions',
                  ]}
                  empty={
                    !loading && !filteredMedicines.length
                  }
                  emptyText="No medicines found. Add your first medicine to get started."
                  onEmpty={() => openMedicine()}
                >
                  <tbody>
                    {filteredMedicines.map((medicine) => {
                      const isLow =
                        Number(medicine.quantity) <=
                        Number(medicine.min_stock ?? 10);

                      return (
                        <tr key={medicine.id}>
                          <td>
                            <span className="id-pill">
                              #{medicine.id}
                            </span>
                          </td>

                          <td>
                            <div className="medicine-cell">
                              <span className="product-icon">
                                <Pill size={17} />
                              </span>

                              <b>{medicine.name}</b>
                            </div>
                          </td>

                          <td className="strong">
                            {money(medicine.price)}
                          </td>

                          <td>{medicine.quantity}</td>

                          <td>
                            <span
                              className={`status-tag ${
                                isLow ? 'warning' : 'good'
                              }`}
                            >
                              {isLow
                                ? 'Low stock'
                                : 'In stock'}
                            </span>
                          </td>

                          <td>
                            <div className="row-actions">
                              <button
                                className="small-btn"
                                onClick={() =>
                                  openMedicine(medicine)
                                }
                              >
                                Edit
                              </button>

                              <button
                                className="small-btn danger-btn"
                                onClick={() =>
                                  deleteMedicine(medicine)
                                }
                                title="Delete"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </DataTable>
              </section>
            </>
          )}

          {/* Inventory */}
          {page === 'Inventory' && (
            <>
              <PageIntro
                eyebrow="STOCK OPERATIONS"
                title="Inventory control"
                text="Track stock movement and keep an eye on expiry dates."
                action={
                  <button
                    className="btn primary"
                    onClick={() => {
                      setStock({
                        medicine_id: '',
                        quantity: '',
                        direction: 'in',
                      });

                      setModal('stock');
                    }}
                  >
                    <Plus size={17} />
                    Stock transaction
                  </button>
                }
              />

              <div className="stats-grid compact-stats">
                <Stat
                  icon={Boxes}
                  label="Total stock units"
                  value={
                    inventoryReport?.total_stock ??
                    medicines.reduce(
                      (sum, medicine) =>
                        sum + Number(medicine.quantity || 0),
                      0
                    )
                  }
                  tone="violet"
                />

                <Stat
                  icon={AlertTriangle}
                  label="Low stock"
                  value={lowStock.length}
                  tone="amber"
                />

                <Stat
                  icon={Clock3}
                  label="Expiry alerts"
                  value={expiry.length}
                  tone="red"
                />

                <Stat
                  icon={CircleDollarSign}
                  label="Stock value"
                  value={money(
                    inventoryReport?.inventory_value ??
                      medicines.reduce(
                        (sum, medicine) =>
                          sum +
                          Number(medicine.price || 0) *
                            Number(medicine.quantity || 0),
                        0
                      )
                  )}
                  tone="green"
                />
              </div>

              <section className="panel">
                <div className="panel-head">
                  <div>
                    <h3>Current stock</h3>
                    <p>
                      Live quantities from your medicine
                      catalogue
                    </p>
                  </div>

                  <div className="legend">
                    <span className="dot green-dot" />
                    Healthy
                    <span className="dot amber-dot" />
                    Low
                  </div>
                </div>

                <DataTable
                  columns={[
                    'Medicine',
                    'Unit price',
                    'Available units',
                    'Stock level',
                    'Action',
                  ]}
                  empty={!medicines.length}
                  emptyText="No inventory to show yet."
                >
                  <tbody>
                    {medicines.map((medicine) => {
                      const isLow =
                        Number(medicine.quantity) <=
                        Number(medicine.min_stock ?? 10);

                      return (
                        <tr key={medicine.id}>
                          <td>
                            <div className="medicine-cell">
                              <span className="product-icon">
                                <Package size={17} />
                              </span>

                              <b>{medicine.name}</b>
                            </div>
                          </td>

                          <td>{money(medicine.price)}</td>

                          <td className="strong">
                            {medicine.quantity}
                          </td>

                          <td>
                            <span
                              className={`status-tag ${
                                isLow ? 'warning' : 'good'
                              }`}
                            >
                              {isLow
                                ? 'Reorder needed'
                                : 'Healthy'}
                            </span>
                          </td>

                          <td>
                            <button
                              className="small-btn"
                              onClick={() => {
                                setStock({
                                  medicine_id: String(
                                    medicine.id
                                  ),
                                  quantity: '',
                                  direction: 'in',
                                });

                                setModal('stock');
                              }}
                            >
                              <ArrowDownToLine size={14} />
                              Update stock
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </DataTable>
              </section>

              <section className="panel spaced-panel">
                <div className="panel-head">
                  <div>
                    <h3>Expiry alerts</h3>
                    <p>
                      Expired medicines and items expiring
                      within 30 days
                    </p>
                  </div>

                  <span className="alert-total">
                    {expiry.length}
                  </span>
                </div>

                {expiry.length ? (
                  <DataTable
                    columns={[
                      'Medicine',
                      'Expiry date',
                      'Quantity',
                      'Alert',
                    ]}
                  >
                    <tbody>
                      {expiry.map((medicine) => {
                        const isExpired =
                          medicine.expiry_date &&
                          new Date(medicine.expiry_date) <
                            new Date();

                        return (
                          <tr key={medicine.id}>
                            <td className="strong">
                              {medicine.name}
                            </td>

                            <td>
                              {medicine.expiry_date || '—'}
                            </td>

                            <td>{medicine.quantity}</td>

                            <td>
                              <span
                                className={`status-tag ${
                                  isExpired
                                    ? 'danger'
                                    : 'warning'
                                }`}
                              >
                                {isExpired
                                  ? 'Expired'
                                  : 'Expiring soon'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </DataTable>
                ) : (
                  <Empty
                    icon={Check}
                    title="No expiry alerts"
                    text="No medicines are currently flagged for expiry."
                  />
                )}
              </section>
            </>
          )}

          {/* Sales */}
          {page === 'Sales' && (
            <>
              <PageIntro
                eyebrow="TRANSACTIONS"
                title="Sales management"
                text="Record medicine sales and review completed transactions."
                action={
                  <button
                    className="btn primary"
                    onClick={() => setModal('sale')}
                  >
                    <Plus size={17} />
                    Record sale
                  </button>
                }
              />

              <div className="stats-grid compact-stats">
                <Stat
                  icon={ShoppingCart}
                  label="Transactions"
                  value={sales.length}
                  tone="blue"
                />

                <Stat
                  icon={TrendingUp}
                  label="Units sold"
                  value={sales.reduce(
                    (sum, item) =>
                      sum + Number(item.quantity || 0),
                    0
                  )}
                  tone="violet"
                />

                <Stat
                  icon={CircleDollarSign}
                  label="Sales value"
                  value={money(
                    sales.reduce(
                      (sum, item) =>
                        sum +
                        Number(item.total_price || 0),
                      0
                    )
                  )}
                  tone="green"
                />
              </div>

              <section className="panel">
                <div className="panel-head">
                  <div>
                    <h3>Sales history</h3>
                    <p>
                      Every recorded transaction from the
                      backend
                    </p>
                  </div>
                </div>

                <DataTable
                  columns={[
                    'Sale ID',
                    'Medicine',
                    'Quantity',
                    'Unit price',
                    'Sale date',
                    'Total',
                  ]}
                  empty={!sales.length}
                  emptyText="No sales recorded. Record your first sale to begin."
                >
                  <tbody>
                    {sales.map((item) => (
                      <tr key={item.sale_id}>
                        <td>
                          <span className="id-pill">
                            #{item.sale_id}
                          </span>
                        </td>

                        <td className="strong">
                          {item.medicine_name}
                        </td>

                        <td>{item.quantity}</td>

                        <td>{money(item.unit_price)}</td>

                        <td>{dateLabel(item.sale_date)}</td>

                        <td className="align-right strong">
                          {money(item.total_price)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </DataTable>
              </section>
            </>
          )}

          {/* Billing */}
          {page === 'Billing' && (
            <>
              <PageIntro
                eyebrow="PAYMENTS & RECEIPTS"
                title="Billing centre"
                text="Create a bill from unbilled sales, or retrieve and print an existing bill."
              />

              <div className="billing-grid">
                <section className="panel">
                  <div className="panel-head">
                    <div>
                      <h3>Create a bill</h3>
                      <p>
                        Select one or more sales that have
                        not yet been billed.
                      </p>
                    </div>

                    <span className="panel-icon">
                      <CreditCard size={19} />
                    </span>
                  </div>

                  <form
                    onSubmit={createBill}
                    className="stack-form"
                  >
                    <label>
                      Payment method

                      <select
                        value={bill.payment_method}
                        onChange={(event) =>
                          setBill({
                            ...bill,
                            payment_method:
                              event.target.value,
                          })
                        }
                      >
                        <option value="cash">Cash</option>
                        <option value="upi">UPI</option>
                        <option value="card">Card</option>
                      </select>
                    </label>

                    <div className="sale-select-list">
                      <div className="list-title">
                        Available sales
                        <small>
                          {sales.length} transactions loaded
                        </small>
                      </div>

                      {sales.length ? (
                        sales.map((item) => (
                          <label
                            className="check-sale"
                            key={item.sale_id}
                          >
                            <input
                              type="checkbox"
                              checked={bill.sale_ids.includes(
                                item.sale_id
                              )}
                              onChange={(event) =>
                                setBill({
                                  ...bill,
                                  sale_ids: event.target.checked
                                    ? [
                                        ...bill.sale_ids,
                                        item.sale_id,
                                      ]
                                    : bill.sale_ids.filter(
                                        (id) =>
                                          id !== item.sale_id
                                      ),
                                })
                              }
                            />

                            <span>
                              <b>{item.medicine_name}</b>
                              <small>
                                Sale #{item.sale_id} ·{' '}
                                {item.quantity} unit(s)
                              </small>
                            </span>

                            <strong>
                              {money(item.total_price)}
                            </strong>
                          </label>
                        ))
                      ) : (
                        <p className="muted">
                          Record a sale before creating a bill.
                        </p>
                      )}
                    </div>

                    <div className="bill-total">
                      <span>Selected total</span>

                      <b>
                        {money(
                          sales
                            .filter((item) =>
                              bill.sale_ids.includes(
                                item.sale_id
                              )
                            )
                            .reduce(
                              (sum, item) =>
                                sum +
                                Number(item.total_price || 0),
                              0
                            )
                        )}
                      </b>
                    </div>

                    <button
                      className="btn primary full"
                      disabled={!bill.sale_ids.length}
                    >
                      <FileText size={17} />
                      Create bill
                    </button>
                  </form>

                  {billResult && (
                    <div className="created-bill">
                      <Check size={18} />

                      <div>
                        <b>
                          Bill #{billResult.bill_id} created
                        </b>

                        <p>
                          {money(billResult.total_amount)} ·{' '}
                          {billResult.payment_method.toUpperCase()}{' '}
                          · {billResult.payment_status}
                        </p>
                      </div>

                      <button
                        className="small-btn"
                        onClick={() => {
                          setBillId(
                            String(billResult.bill_id)
                          );

                          request(
                            `/bills/${billResult.bill_id}`
                          )
                            .then(setBillDetails)
                            .catch((error) =>
                              setError(error.message)
                            );
                        }}
                      >
                        View
                      </button>
                    </div>
                  )}
                </section>

                <section className="panel">
                  <div className="panel-head">
                    <div>
                      <h3>Find a bill</h3>
                      <p>
                        Retrieve invoice details by bill
                        number.
                      </p>
                    </div>

                    <span className="panel-icon">
                      <Search size={19} />
                    </span>
                  </div>

                  <form
                    className="inline-form"
                    onSubmit={fetchBill}
                  >
                    <input
                      type="number"
                      min="1"
                      value={billId}
                      onChange={(event) =>
                        setBillId(event.target.value)
                      }
                      placeholder="Enter bill ID"
                      required
                    />

                    <button className="btn primary">
                      Find bill
                    </button>
                  </form>

                  {billDetails && (
                    <div
                      className="invoice"
                      id="invoice-print"
                    >
                      <div className="invoice-top">
                        <div>
                          <b>SHYAM PHARMA</b>
                          <small>
                            Medical Shop Management System
                          </small>
                        </div>

                        <span className="status-tag good">
                          {billDetails.payment_status}
                        </span>
                      </div>

                      <div className="invoice-meta">
                        <span>
                          Bill number
                          <b>#{billDetails.bill_id}</b>
                        </span>

                        <span>
                          Date
                          <b>
                            {dateLabel(billDetails.bill_date)}
                          </b>
                        </span>

                        <span>
                          Payment
                          <b>
                            {billDetails.payment_method?.toUpperCase()}
                          </b>
                        </span>
                      </div>

                      <div className="invoice-items">
                        {billDetails.items?.map((item) => (
                          <div key={item.sale_id}>
                            <span>
                              {item.medicine_name}

                              <small>
                                {item.quantity} ×{' '}
                                {money(item.unit_price)}
                              </small>
                            </span>

                            <b>
                              {money(item.total_price)}
                            </b>
                          </div>
                        ))}
                      </div>

                      <div className="invoice-total">
                        <span>Total paid</span>

                        <b>
                          {money(billDetails.total_amount)}
                        </b>
                      </div>

                      <button
                        type="button"
                        className="btn secondary full print-hide"
                        onClick={() => window.print()}
                      >
                        <Printer size={17} />
                        Print invoice
                      </button>
                    </div>
                  )}
                </section>
              </div>
            </>
          )}

          {/* Reports */}
          {page === 'Reports' && (
            <>
              <PageIntro
                eyebrow="BUSINESS INTELLIGENCE"
                title="Reports & analytics"
                text="Review sales performance and current inventory valuation."
                action={
                  <button
                    className="btn secondary"
                    onClick={loadAll}
                  >
                    <RefreshCw size={16} />
                    Refresh reports
                  </button>
                }
              />

              <div className="stats-grid">
                <Stat
                  icon={ShoppingCart}
                  label="Total transactions"
                  value={
                    salesReport?.total_sales ?? sales.length
                  }
                  tone="blue"
                />

                <Stat
                  icon={CircleDollarSign}
                  label="Total revenue"
                  value={money(revenue)}
                  tone="green"
                />

                <Stat
                  icon={Boxes}
                  label="Units sold"
                  value={
                    salesReport?.total_quantity_sold ??
                    sales.reduce(
                      (sum, item) =>
                        sum + Number(item.quantity || 0),
                      0
                    )
                  }
                  tone="violet"
                />

                <Stat
                  icon={Package}
                  label="Inventory value"
                  value={money(
                    inventoryReport?.inventory_value ??
                      medicines.reduce(
                        (sum, medicine) =>
                          sum +
                          Number(medicine.price || 0) *
                            Number(medicine.quantity || 0),
                        0
                      )
                  )}
                  tone="amber"
                />
              </div>

              <div className="dashboard-grid">
                <section className="panel">
                  <div className="panel-head">
                    <div>
                      <h3>Sales breakdown</h3>
                      <p>Latest recorded transactions</p>
                    </div>
                  </div>

                  {sales.length ? (
                    <>
                      <div className="report-highlight">
                        <span>
                          Revenue across loaded sales
                        </span>

                        <b>
                          {money(
                            sales.reduce(
                              (sum, item) =>
                                sum +
                                Number(item.total_price || 0),
                              0
                            )
                          )}
                        </b>

                        <small>
                          {sales.length} transactions ·{' '}
                          {sales.reduce(
                            (sum, item) =>
                              sum +
                              Number(item.quantity || 0),
                            0
                          )}{' '}
                          units sold
                        </small>
                      </div>

                      <DataTable
                        columns={[
                          'Sale',
                          'Medicine',
                          'Date',
                          'Revenue',
                        ]}
                      >
                        <tbody>
                          {sales.slice(0, 8).map((item) => (
                            <tr key={item.sale_id}>
                              <td>#{item.sale_id}</td>

                              <td className="strong">
                                {item.medicine_name}
                              </td>

                              <td>
                                {dateLabel(item.sale_date)}
                              </td>

                              <td className="strong">
                                {money(item.total_price)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </DataTable>
                    </>
                  ) : (
                    <Empty
                      icon={BarChart3}
                      title="No sales data yet"
                      text="Sales reports will populate after transactions are recorded."
                    />
                  )}
                </section>

                <section className="panel">
                  <div className="panel-head">
                    <div>
                      <h3>Inventory report</h3>
                      <p>Current stock and value</p>
                    </div>
                  </div>

                  <div className="report-list">
                    <ReportRow
                      label="Medicine catalogue"
                      value={
                        inventoryReport?.total_medicines ??
                        medicines.length
                      }
                    />

                    <ReportRow
                      label="Total units in stock"
                      value={
                        inventoryReport?.total_stock ??
                        medicines.reduce(
                          (sum, medicine) =>
                            sum +
                            Number(medicine.quantity || 0),
                          0
                        )
                      }
                    />

                    <ReportRow
                      label="Low stock medicines"
                      value={
                        inventoryReport?.low_stock_medicines ??
                        lowStock.length
                      }
                    />

                    <ReportRow
                      label="Expiring / expired"
                      value={expiry.length}
                    />

                    <ReportRow
                      label="Inventory valuation"
                      value={money(
                        inventoryReport?.inventory_value ??
                          medicines.reduce(
                            (sum, medicine) =>
                              sum +
                              Number(medicine.price || 0) *
                                Number(medicine.quantity || 0),
                            0
                          )
                      )}
                    />
                  </div>

                  <button
                    className="btn secondary full"
                    onClick={() => setPage('Inventory')}
                  >
                    Review inventory <span>→</span>
                  </button>
                </section>
              </div>

              <p className="report-note">
                <AlertTriangle size={15} />
                The reports API is administrator-only. For
                other roles, summary values are calculated
                from the data those roles can access.
              </p>
            </>
          )}

          {/* Footer */}
          <footer className="app-footer">
            <span>
              © {new Date().getFullYear()} SHYAM PHARMA
              <span className="footer-sep"> · </span>
              Developed by{' '}
              <strong className="developer-credit">
                Shrikant Patil
              </strong>
            </span>

            <span>
              <span className="footer-dot" />
              Connected workspace
              <span className="footer-sep"> · </span>
              Data from your FastAPI backend
            </span>
          </footer>
        </main>
      </div>

      {/* Modal forms */}
      {modal && (
        <div
          className="modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setModal('');
            }
          }}
        >
          <section className="modal-card">
            <div className="modal-head">
              <div>
                <span className="eyebrow">
                  SHYAM PHARMA
                </span>

                <h2>
                  {modal === 'medicine'
                    ? editing
                      ? 'Edit medicine'
                      : 'Add medicine'
                    : modal === 'stock'
                      ? 'Inventory transaction'
                      : 'Record a sale'}
                </h2>
              </div>

              <button
                className="icon-btn"
                onClick={() => setModal('')}
                aria-label="Close modal"
              >
                <X size={20} />
              </button>
            </div>

            {/* Add or edit medicine */}
            {modal === 'medicine' && (
              <form
                className="stack-form"
                onSubmit={saveMedicine}
              >
                <label>
                  Medicine name

                  <input
                    value={form.name}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        name: event.target.value,
                      })
                    }
                    maxLength="100"
                    required
                    placeholder="e.g. Paracetamol 500 mg"
                  />
                </label>

                <div className="form-two">
                  <label>
                    Price (₹)

                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={form.price}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          price: event.target.value,
                        })
                      }
                      required
                    />
                  </label>

                  <label>
                    Quantity

                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={form.quantity}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          quantity: event.target.value,
                        })
                      }
                      required
                    />
                  </label>
                </div>

                <label>
                  Expiry date <small>(optional)</small>

                  <input
                    type="date"
                    value={form.expiry_date}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        expiry_date: event.target.value,
                      })
                    }
                  />
                </label>

                <div className="modal-actions">
                  <button
                    type="button"
                    className="btn secondary"
                    onClick={() => setModal('')}
                  >
                    Cancel
                  </button>

                  <button className="btn primary">
                    {editing
                      ? 'Save changes'
                      : 'Add medicine'}
                  </button>
                </div>
              </form>
            )}

            {/* Inventory transaction */}
            {modal === 'stock' && (
              <form
                className="stack-form"
                onSubmit={saveStock}
              >
                <label>
                  Transaction type

                  <select
                    value={stock.direction}
                    onChange={(event) =>
                      setStock({
                        ...stock,
                        direction: event.target.value,
                      })
                    }
                  >
                    <option value="in">
                      Stock in — receive stock
                    </option>

                    <option value="out">
                      Stock out — remove stock
                    </option>
                  </select>
                </label>

                <label>
                  Medicine

                  <select
                    value={stock.medicine_id}
                    onChange={(event) =>
                      setStock({
                        ...stock,
                        medicine_id: event.target.value,
                      })
                    }
                    required
                  >
                    <option value="">
                      Choose a medicine
                    </option>

                    {medicines.map((medicine) => (
                      <option
                        value={medicine.id}
                        key={medicine.id}
                      >
                        {medicine.name} · {medicine.quantity}{' '}
                        available
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Quantity

                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={stock.quantity}
                    onChange={(event) =>
                      setStock({
                        ...stock,
                        quantity: event.target.value,
                      })
                    }
                    required
                  />
                </label>

                <div className="modal-actions">
                  <button
                    type="button"
                    className="btn secondary"
                    onClick={() => setModal('')}
                  >
                    Cancel
                  </button>

                  <button className="btn primary">
                    {stock.direction === 'in'
                      ? 'Add stock'
                      : 'Remove stock'}
                  </button>
                </div>
              </form>
            )}

            {/* Record a sale */}
            {modal === 'sale' && (
              <form
                className="stack-form"
                onSubmit={createSale}
              >
                <label>
                  Medicine

                  <select
                    value={sale.medicine_id}
                    onChange={(event) =>
                      setSale({
                        ...sale,
                        medicine_id: event.target.value,
                      })
                    }
                    required
                  >
                    <option value="">
                      Choose a medicine
                    </option>

                    {medicines
                      .filter(
                        (medicine) =>
                          Number(medicine.quantity) > 0
                      )
                      .map((medicine) => (
                        <option
                          value={medicine.id}
                          key={medicine.id}
                        >
                          {medicine.name} ·{' '}
                          {money(medicine.price)} ·{' '}
                          {medicine.quantity} available
                        </option>
                      ))}
                  </select>
                </label>

                <label>
                  Quantity

                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={sale.quantity}
                    onChange={(event) =>
                      setSale({
                        ...sale,
                        quantity: event.target.value,
                      })
                    }
                    required
                  />
                </label>

                {sale.medicine_id && (
                  <div className="sale-preview">
                    <span>Estimated total</span>

                    <b>
                      {money(
                        (medicines.find(
                          (medicine) =>
                            medicine.id ===
                            Number(sale.medicine_id)
                        )?.price || 0) *
                          Number(sale.quantity || 0)
                      )}
                    </b>
                  </div>
                )}

                <p className="form-hint">
                  <AlertTriangle size={15} />
                  Stock is reduced automatically when the sale
                  is completed. Expired medicines cannot be
                  sold.
                </p>

                <div className="modal-actions">
                  <button
                    type="button"
                    className="btn secondary"
                    onClick={() => setModal('')}
                  >
                    Cancel
                  </button>

                  <button className="btn primary">
                    <ShoppingCart size={16} />
                    Complete sale
                  </button>
                </div>
              </form>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

// Reusable statistic card.
function Stat({
  icon: Icon,
  label,
  value,
  foot,
  tone = 'blue',
}) {
  return (
    <article className="stat-card">
      <div className={`stat-icon ${tone}`}>
        <Icon size={20} />
      </div>

      <span className="stat-label">{label}</span>

      <b className="stat-value">{value}</b>

      {foot && <small className="stat-foot">{foot}</small>}
    </article>
  );
}

// Reusable page heading.
function PageIntro({
  eyebrow,
  title,
  text,
  action,
}) {
  return (
    <div className="page-intro">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h2>{title}</h2>
        <p>{text}</p>
      </div>

      {action}
    </div>
  );
}

// Reusable data table.
function DataTable({
  columns,
  children,
  empty = false,
  emptyText = 'No data available.',
  onEmpty,
}) {
  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column}>{column}</th>
            ))}
          </tr>
        </thead>

        {!empty && children}
      </table>

      {empty && (
        <Empty
          icon={Package}
          title={emptyText}
          text=""
          action={onEmpty ? 'Add medicine' : undefined}
          onClick={onEmpty}
        />
      )}
    </div>
  );
}

// Reusable empty state.
function Empty({
  icon: Icon,
  title,
  text,
  action,
  onClick,
}) {
  return (
    <div className="empty-state">
      <span className="empty-icon">
        <Icon size={22} />
      </span>

      <b>{title}</b>

      {text && <p>{text}</p>}

      {action && (
        <button
          className="btn secondary"
          onClick={onClick}
        >
          {action}
        </button>
      )}
    </div>
  );
}

// Reusable dashboard quick action.
function Quick({
  icon: Icon,
  title,
  text,
  onClick,
}) {
  return (
    <button
      className="quick-action"
      onClick={onClick}
    >
      <span>
        <Icon size={19} />
      </span>

      <b>{title}</b>

      <small>{text}</small>

      <i>↗</i>
    </button>
  );
}

// Reusable report row.
function ReportRow({ label, value }) {
  return (
    <div className="report-row">
      <span>{label}</span>
      <b>{value}</b>
    </div>
  );
}

export default App;