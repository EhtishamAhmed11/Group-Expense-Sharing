test users
-> user:1
    email:test@gmail.com    
    password:Ab12345678
-> user:2
    email:test2@gmail.com    
    password:Ab12345678


# Frontend Component Development Guidelines

## Table of Contents
1. [Project Structure](#project-structure)
2. [Component Architecture](#component-architecture)
3. [State Management](#state-management)
4. [API Integration](#api-integration)
5. [Error Handling](#error-handling)
6. [UI/UX Standards](#uiux-standards)
7. [Performance Guidelines](#performance-guidelines)
8. [Code Standards](#code-standards)
9. [Testing Considerations](#testing-considerations)
10. [Component Templates](#component-templates)

---

## Project Structure

```
src/
├── components/
│   ├── auth/
│   │   ├── AuthContext.js
│   │   ├── Login.js
│   │   ├── Register.js
│   │   └── AuthWrapper.js
│   ├── expense/
│   │   ├── ExpenseManagement.js
│   │   ├── ExpenseForm.js
│   │   ├── ExpenseList.js
│   │   └── RecurringExpenses.js
│   ├── group/
│   │   ├── GroupManagement.js
│   │   ├── GroupForm.js
│   │   └── GroupExpenses.js
│   ├── profile/
│   │   └── ProfileManagement.js
│   ├── common/
│   │   ├── Loading.js
│   │   ├── ErrorMessage.js
│   │   ├── ConfirmDialog.js
│   │   └── Pagination.js
│   └── dashboard/
│       └── Dashboard.js
├── hooks/
│   ├── useApi.js
│   └── useDebounce.js
├── utils/
│   ├── api.js
│   ├── constants.js
│   └── helpers.js
└── App.js
```

---

## Component Architecture

### 1. Component Types

**Container Components:**
- Handle data fetching and state management
- Minimal UI logic
- Pass data to presentational components

**Presentational Components:**
- Focused on UI rendering
- Receive data via props
- Minimal state (only UI-related)

**Hook Components:**
- Custom hooks for reusable logic
- API calls, form handling, etc.

### 2. Component Structure Template

```jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';

const ComponentName = ({ 
  // Props with default values
  prop1 = defaultValue,
  onAction,
  children 
}) => {
  // 1. Hooks (useAuth, useState, useEffect, etc.)
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState([]);

  // 2. Constants
  const API_BASE_URL = 'http://localhost:3000/api';

  // 3. Handler functions
  const handleAction = async (params) => {
    try {
      setLoading(true);
      setError('');
      // API call logic
      const result = await apiCall(params);
      if (result.success) {
        setData(result.data);
        if (onAction) onAction(result.data);
      } else {
        setError(result.message);
      }
    } catch (error) {
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  // 4. useEffect hooks
  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  // 5. Helper/Render functions
  const renderItem = (item) => (
    <div key={item.id}>
      {/* Item content */}
    </div>
  );

  // 6. Early returns
  if (loading) {
    return <div>Loading...</div>;
  }

  // 7. Main render
  return (
    <div>
      {/* Component JSX */}
    </div>
  );
};

export default ComponentName;
```

---

## State Management

### 1. AuthContext Usage

**Always import and use:**
```jsx
import { useAuth } from '../auth/AuthContext';

const { user, loading, error, login, logout, updateProfile } = useAuth();
```

**Check authentication:**
```jsx
// Early return if not authenticated
if (!user) {
  return <div>Please log in to access this feature</div>;
}
```

### 2. Local State Patterns

**Form State:**
```jsx
const [formData, setFormData] = useState({
  field1: '',
  field2: '',
  field3: false
});

const handleInputChange = (e) => {
  const { name, value, type, checked } = e.target;
  setFormData(prev => ({
    ...prev,
    [name]: type === 'checkbox' ? checked : value
  }));
};
```

**Loading & Error State:**
```jsx
const [loading, setLoading] = useState(false);
const [error, setError] = useState('');
const [success, setSuccess] = useState('');

// Always clear errors when starting new operations
const handleOperation = async () => {
  setError('');
  setSuccess('');
  // ... operation logic
};
```

**List/Table State:**
```jsx
const [items, setItems] = useState([]);
const [pagination, setPagination] = useState({
  currentPage: 1,
  totalPages: 1,
  totalItems: 0,
  limit: 20
});
const [filters, setFilters] = useState({
  search: '',
  category: '',
  dateFrom: '',
  dateTo: ''
});
```

---

## API Integration

### 1. API Call Structure

**Standard API Call Pattern:**
```jsx
const makeApiCall = async (endpoint, options = {}) => {
  try {
    setLoading(true);
    setError('');
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: options.method || 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...(options.body && { body: JSON.stringify(options.body) })
    });

    const data = await response.json();
    
    if (data.success) {
      return { success: true, data: data.data };
    } else {
      setError(data.message || 'Operation failed');
      return { success: false, error: data.message };
    }
  } catch (error) {
    const errorMessage = error.message || 'Network error occurred';
    setError(errorMessage);
    return { success: false, error: errorMessage };
  } finally {
    setLoading(false);
  }
};
```

### 2. CRUD Operations Template

```jsx
// CREATE
const handleCreate = async (itemData) => {
  const result = await makeApiCall('/endpoint', {
    method: 'POST',
    body: itemData
  });
  
  if (result.success) {
    setItems(prev => [result.data, ...prev]);
    setSuccess('Item created successfully');
    // Reset form or redirect
  }
};

// READ (with pagination & filters)
const fetchItems = async (page = 1) => {
  const queryParams = new URLSearchParams({
    page,
    limit: pagination.limit,
    ...Object.fromEntries(
      Object.entries(filters).filter(([key, value]) => value)
    )
  });

  const result = await makeApiCall(`/endpoint?${queryParams}`);
  
  if (result.success) {
    setItems(result.data.items);
    setPagination(result.data.pagination);
  }
};

// UPDATE
const handleUpdate = async (id, updateData) => {
  const result = await makeApiCall(`/endpoint/${id}`, {
    method: 'PATCH',
    body: updateData
  });
  
  if (result.success) {
    setItems(prev => prev.map(item => 
      item.id === id ? result.data : item
    ));
    setSuccess('Item updated successfully');
  }
};

// DELETE
const handleDelete = async (id) => {
  if (!confirm('Are you sure you want to delete this item?')) {
    return;
  }

  const result = await makeApiCall(`/endpoint/${id}`, {
    method: 'DELETE'
  });
  
  if (result.success) {
    setItems(prev => prev.filter(item => item.id !== id));
    setSuccess('Item deleted successfully');
  }
};
```

---

## Error Handling

### 1. Error Display Component
```jsx
const ErrorMessage = ({ error, onClose }) => (
  error ? (
    <div style={{ 
      color: 'red', 
      padding: '10px', 
      border: '1px solid red', 
      borderRadius: '4px', 
      marginBottom: '20px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    }}>
      <span>{error}</span>
      {onClose && (
        <button onClick={onClose} style={{ 
          background: 'none', 
          border: 'none', 
          color: 'red', 
          cursor: 'pointer' 
        }}>
          ×
        </button>
      )}
    </div>
  ) : null
);
```

### 2. Success Message Component
```jsx
const SuccessMessage = ({ message, onClose }) => (
  message ? (
    <div style={{ 
      color: '#155724',
      backgroundColor: '#d4edda',
      padding: '10px', 
      border: '1px solid #c3e6cb', 
      borderRadius: '4px', 
      marginBottom: '20px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    }}>
      <span>{message}</span>
      {onClose && (
        <button onClick={onClose} style={{ 
          background: 'none', 
          border: 'none', 
          color: '#155724', 
          cursor: 'pointer' 
        }}>
          ×
        </button>
      )}
    </div>
  ) : null
);
```

### 3. Error Handling Patterns

**Form Validation:**
```jsx
const [fieldErrors, setFieldErrors] = useState({});

const validateForm = () => {
  const errors = {};
  
  if (!formData.requiredField.trim()) {
    errors.requiredField = 'This field is required';
  }
  
  if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
    errors.email = 'Please enter a valid email';
  }
  
  setFieldErrors(errors);
  return Object.keys(errors).length === 0;
};
```

**API Error Handling:**
```jsx
const handleApiError = (error, customMessage) => {
  console.error('API Error:', error);
  
  if (error.message?.includes('401') || error.message?.includes('Authentication')) {
    // Handle authentication errors
    logout();
    return;
  }
  
  if (error.message?.includes('403')) {
    setError('You don\'t have permission to perform this action');
    return;
  }
  
  setError(customMessage || error.message || 'An unexpected error occurred');
};
```

---

## UI/UX Standards

### 1. Styling Patterns

**Container Styles:**
```jsx
const containerStyle = {
  maxWidth: '1200px',
  margin: '0 auto',
  padding: '20px'
};

const cardStyle = {
  border: '1px solid #ddd',
  borderRadius: '8px',
  padding: '20px',
  marginBottom: '20px',
  backgroundColor: '#fff'
};
```

**Button Styles:**
```jsx
const buttonStyles = {
  primary: {
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '4px',
    cursor: 'pointer'
  },
  secondary: {
    backgroundColor: '#6c757d',
    color: 'white',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '4px',
    cursor: 'pointer'
  },
  danger: {
    backgroundColor: '#dc3545',
    color: 'white',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '4px',
    cursor: 'pointer'
  }
};
```

**Form Styles:**
```jsx
const formFieldStyle = {
  marginBottom: '15px'
};

const labelStyle = {
  display: 'block',
  marginBottom: '5px',
  fontWeight: 'bold'
};

const inputStyle = {
  width: '100%',
  padding: '8px',
  border: '1px solid #ddd',
  borderRadius: '4px'
};

const inputErrorStyle = {
  ...inputStyle,
  border: '1px solid red'
};
```

### 2. Responsive Design

**Grid Layouts:**
```jsx
const gridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
  gap: '20px'
};
```

**Mobile-First Approach:**
```jsx
const responsiveStyle = {
  padding: '10px',
  '@media (min-width: 768px)': {
    padding: '20px'
  }
};
```

### 3. Accessibility

**Form Labels:**
```jsx
<label htmlFor="fieldName">Field Label *:</label>
<input
  id="fieldName"
  name="fieldName"
  type="text"
  required
  aria-describedby="fieldName-error"
/>
{errors.fieldName && (
  <div id="fieldName-error" role="alert" style={{ color: 'red' }}>
    {errors.fieldName}
  </div>
)}
```

**Button States:**
```jsx
<button
  onClick={handleAction}
  disabled={loading || disabled}
  style={{
    ...buttonStyles.primary,
    opacity: (loading || disabled) ? 0.6 : 1,
    cursor: (loading || disabled) ? 'not-allowed' : 'pointer'
  }}
>
  {loading ? 'Processing...' : 'Submit'}
</button>
```

---

## Performance Guidelines

### 1. Component Optimization

**Use useEffect Dependencies:**
```jsx
// ❌ Wrong - runs on every render
useEffect(() => {
  fetchData();
});

// ✅ Correct - runs only when userId changes
useEffect(() => {
  if (userId) {
    fetchData();
  }
}, [userId]);
```

**Prevent Unnecessary Re-renders:**
```jsx
// ❌ Wrong - creates new object every render
const buttonStyle = { backgroundColor: 'blue' };

// ✅ Correct - stable reference
const buttonStyle = useMemo(() => ({ 
  backgroundColor: 'blue' 
}), []);
```

### 2. Data Fetching Patterns

**Debounced Search:**
```jsx
const [searchTerm, setSearchTerm] = useState('');
const [debouncedSearch, setDebouncedSearch] = useState('');

useEffect(() => {
  const timer = setTimeout(() => {
    setDebouncedSearch(searchTerm);
  }, 300);

  return () => clearTimeout(timer);
}, [searchTerm]);

useEffect(() => {
  if (debouncedSearch) {
    fetchSearchResults(debouncedSearch);
  }
}, [debouncedSearch]);
```

**Pagination:**
```jsx
const [currentPage, setCurrentPage] = useState(1);
const [itemsPerPage] = useState(20);

const handlePageChange = (page) => {
  setCurrentPage(page);
  fetchItems(page);
};
```

---

## Code Standards

### 1. Naming Conventions

**Components:** PascalCase
```jsx
const ExpenseManagement = () => {};
const GroupExpenseForm = () => {};
```

**Functions:** camelCase with descriptive names
```jsx
const handleFormSubmit = () => {};
const fetchUserExpenses = () => {};
const validateExpenseForm = () => {};
```

**Constants:** UPPER_SNAKE_CASE
```jsx
const API_BASE_URL = 'http://localhost:3000/api';
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
```

### 2. File Organization

**One component per file**
**Export default at bottom**
**Group related functions together**

### 3. Comments and Documentation

```jsx
/**
 * ExpenseForm - Component for creating/editing expenses
 * @param {Object} expense - Existing expense data for editing (optional)
 * @param {Function} onCancel - Callback when form is cancelled
 * @param {Function} onSuccess - Callback when form is successfully submitted
 */
const ExpenseForm = ({ expense = null, onCancel, onSuccess }) => {
  // Component logic
};
```

---

## Testing Considerations

### 1. Test Structure

**What to test:**
- Component renders without crashing
- User interactions work correctly
- API calls are made with correct parameters
- Error states display properly
- Form validation works

**Component testing template:**
```jsx
// ExpenseForm.test.js
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ExpenseForm from './ExpenseForm';
import { AuthProvider } from '../auth/AuthContext';

const renderWithAuth = (component) => {
  return render(
    <AuthProvider>
      {component}
    </AuthProvider>
  );
};

describe('ExpenseForm', () => {
  it('renders form fields correctly', () => {
    renderWithAuth(<ExpenseForm />);
    expect(screen.getByLabelText(/amount/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
  });

  it('shows validation errors for empty required fields', async () => {
    renderWithAuth(<ExpenseForm />);
    fireEvent.click(screen.getByText(/submit/i));
    
    await waitFor(() => {
      expect(screen.getByText(/amount is required/i)).toBeInTheDocument();
    });
  });
});
```

---

## Component Templates

### 1. Basic List Component Template

```jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';

const ItemList = ({ onItemSelect, filters = {} }) => {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    limit: 20
  });

  const API_BASE_URL = 'http://localhost:3000/api';

  const fetchItems = async (page = 1) => {
    try {
      setLoading(true);
      setError('');
      
      const queryParams = new URLSearchParams({
        page,
        limit: pagination.limit,
        ...filters
      });

      const response = await fetch(`${API_BASE_URL}/items?${queryParams}`, {
        credentials: 'include'
      });

      const data = await response.json();
      
      if (data.success) {
        setItems(data.data.items);
        setPagination(data.data.pagination);
      } else {
        setError(data.message);
      }
    } catch (error) {
      setError('Failed to fetch items');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure?')) return;
    
    try {
      const response = await fetch(`${API_BASE_URL}/items/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      const data = await response.json();
      
      if (data.success) {
        setItems(prev => prev.filter(item => item.id !== id));
      } else {
        setError(data.message);
      }
    } catch (error) {
      setError('Failed to delete item');
    }
  };

  useEffect(() => {
    if (user) {
      fetchItems();
    }
  }, [user, filters]);

  if (!user) {
    return <div>Please log in to view items</div>;
  }

  if (loading) {
    return <div>Loading items...</div>;
  }

  return (
    <div>
      <h2>Items</h2>
      
      {error && (
        <div style={{ color: 'red', marginBottom: '20px' }}>
          {error}
        </div>
      )}

      {items.length === 0 ? (
        <div>No items found</div>
      ) : (
        <div>
          {items.map(item => (
            <div key={item.id} style={{ 
              border: '1px solid #ddd', 
              padding: '15px', 
              marginBottom: '10px' 
            }}>
              <h4>{item.name}</h4>
              <p>{item.description}</p>
              <div>
                <button onClick={() => onItemSelect(item)}>
                  View
                </button>
                <button 
                  onClick={() => handleDelete(item.id)}
                  style={{ marginLeft: '10px', color: 'red' }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {pagination.totalPages > 1 && (
        <div style={{ marginTop: '20px' }}>
          {Array.from({ length: pagination.totalPages }, (_, i) => (
            <button
              key={i + 1}
              onClick={() => fetchItems(i + 1)}
              style={{
                margin: '0 5px',
                backgroundColor: pagination.currentPage === i + 1 ? '#007bff' : 'white',
                color: pagination.currentPage === i + 1 ? 'white' : 'black'
              }}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default ItemList;
```

### 2. Form Component Template

```jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';

const ItemForm = ({ item = null, onCancel, onSuccess }) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    name: item?.name || '',
    description: item?.description || '',
    category: item?.category || ''
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const API_BASE_URL = 'http://localhost:3000/api';

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear field error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }
    
    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    try {
      setLoading(true);
      setError('');

      const url = item 
        ? `${API_BASE_URL}/items/${item.id}`
        : `${API_BASE_URL}/items`;
      
      const method = item ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData)
      });

      const data = await response.json();
      
      if (data.success) {
        onSuccess(data.data);
      } else {
        setError(data.message);
      }
    } catch (error) {
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return <div>Please log in to access this form</div>;
  }

  return (
    <div style={{ maxWidth: '500px', margin: '20px auto' }}>
      <h2>{item ? 'Edit Item' : 'Create Item'}</h2>
      
      {error && (
        <div style={{ color: 'red', marginBottom: '20px' }}>
          {error}
        </div>
      )}

      <div>
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>
            Name *:
          </label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            disabled={loading}
            style={{
              width: '100%',
              padding: '8px',
              border: errors.name ? '1px solid red' : '1px solid #ddd'
            }}
          />
          {errors.name && (
            <div style={{ color: 'red', fontSize: '14px' }}>
              {errors.name}
            </div>
          )}
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>
            Description *:
          </label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            disabled={loading}
            rows={3}
            style={{
              width: '100%',
              padding: '8px',
              border: errors.description ? '1px solid red' : '1px solid #ddd'
            }}
          />
          {errors.description && (
            <div style={{ color: 'red', fontSize: '14px' }}>
              {errors.description}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={handleSubmit}
            disabled={loading}
            style={{
              padding: '10px 20px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? 'Saving...' : (item ? 'Update' : 'Create')}
          </button>
          
          <button
            onClick={onCancel}
            disabled={loading}
            style={{
              padding: '10px 20px',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default ItemForm;
```

---

## Final Checklist

Before submitting any component, ensure:

- [ ] Component follows naming conventions
- [ ] Uses useAuth hook appropriately
- [ ] Handles loading states
- [ ] Handles error states
- [ ] Includes proper form validation
- [ ] Has responsive design considerations
- [ ] Includes accessibility attributes
- [ ] API calls use proper error handling
- [ ] State updates are immutable
- [ ] useEffect has proper dependencies
- [ ] Component is exported as default
- [ ] Comments explain complex logic
- [ ] No console.log statements in production code
- [ ] Props have default values where appropriate
- [ ] Event handlers prevent default where needed