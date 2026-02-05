# Supabase Integration Guide - SteriCare Portal

## 📋 Overview

This guide will help you integrate Supabase as the backend database for the SteriCare Portal. Supabase provides:
- **Authentication** - User login/signup
- **Database** - PostgreSQL for data storage
- **Real-time** - Live data updates
- **Storage** - File uploads (for future features)
- **Row Level Security** - Data isolation per user

---

## 🚀 Quick Start

### Step 1: Create Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Sign up or login
3. Click "New Project"
4. Fill in:
   - **Name:** SteriCare Portal
   - **Database Password:** (save this securely!)
   - **Region:** Choose closest to your users
5. Click "Create new project"
6. Wait 2-3 minutes for setup

### Step 2: Get Your API Keys

1. In your Supabase project dashboard
2. Click **Settings** → **API**
3. Copy these values:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **anon public** key (starts with `eyJ...`)

### Step 3: Install Supabase Client

```bash
cd stericare-dashboard
npm install @supabase/supabase-js
```

### Step 4: Create Environment Variables

Create `.env` file in your project root:

```env
REACT_APP_SUPABASE_URL=https://xxxxx.supabase.co
REACT_APP_SUPABASE_ANON_KEY=eyJxxxxx...
```

**Important:** Add `.env` to your `.gitignore` file!

---

## 📊 Database Schema

### Step 1: Create Tables

Go to **SQL Editor** in Supabase and run these commands:

#### 1. Sales Data Table

```sql
-- ==========================================
-- SALES DATA TABLE
-- Stores all sales transactions
-- ==========================================

CREATE TABLE sales_data (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Transaction Details
  date TEXT NOT NULL,
  month TEXT NOT NULL,
  quarter TEXT NOT NULL,
  
  -- Product & Location
  product TEXT NOT NULL,
  facility TEXT NOT NULL,
  region TEXT NOT NULL,
  
  -- Sale Details
  sale_type TEXT NOT NULL,
  sales_person TEXT,
  
  -- Financial Metrics
  revenue DECIMAL(10, 2) NOT NULL DEFAULT 0,
  discount DECIMAL(10, 2) DEFAULT 0,
  cost DECIMAL(10, 2) NOT NULL DEFAULT 0,
  profit DECIMAL(10, 2) NOT NULL DEFAULT 0,
  margin DECIMAL(10, 2) DEFAULT 0,
  
  -- Quantity
  boxes INTEGER DEFAULT 0,
  units INTEGER NOT NULL DEFAULT 0,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create indexes for better query performance
CREATE INDEX sales_data_user_id_idx ON sales_data(user_id);
CREATE INDEX sales_data_date_idx ON sales_data(date);
CREATE INDEX sales_data_product_idx ON sales_data(product);
CREATE INDEX sales_data_facility_idx ON sales_data(facility);
CREATE INDEX sales_data_sales_person_idx ON sales_data(sales_person);

-- Enable Row Level Security
ALTER TABLE sales_data ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only see their own data
CREATE POLICY "Users can view own sales data" 
  ON sales_data FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sales data" 
  ON sales_data FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sales data" 
  ON sales_data FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own sales data" 
  ON sales_data FOR DELETE 
  USING (auth.uid() = user_id);

-- Add comment
COMMENT ON TABLE sales_data IS 'Stores all sales transactions with financial metrics';
```

#### 2. Sales People Table

```sql
-- ==========================================
-- SALES PEOPLE TABLE
-- Stores sales team members and commission rates
-- ==========================================

CREATE TABLE sales_people (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Sales Person Details
  name TEXT NOT NULL,
  commission_rate DECIMAL(5, 2) NOT NULL DEFAULT 0,
  
  -- Optional Contact Info
  email TEXT,
  phone TEXT,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create indexes
CREATE INDEX sales_people_user_id_idx ON sales_people(user_id);
CREATE INDEX sales_people_name_idx ON sales_people(name);

-- Enable Row Level Security
ALTER TABLE sales_people ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own sales people" 
  ON sales_people FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sales people" 
  ON sales_people FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sales people" 
  ON sales_people FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own sales people" 
  ON sales_people FOR DELETE 
  USING (auth.uid() = user_id);

-- Add comment
COMMENT ON TABLE sales_people IS 'Stores sales team members with commission rates';
```

#### 3. User Profiles Table (Optional but recommended)

```sql
-- ==========================================
-- USER PROFILES TABLE
-- Extended user information beyond auth.users
-- ==========================================

CREATE TABLE user_profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  
  -- Profile Details
  full_name TEXT,
  company_name TEXT,
  phone TEXT,
  
  -- Preferences
  dark_mode BOOLEAN DEFAULT false,
  default_app TEXT,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own profile" 
  ON user_profiles FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
  ON user_profiles FOR UPDATE 
  USING (auth.uid() = id);

-- Function to automatically create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, full_name)
  VALUES (new.id, new.raw_user_meta_data->>'full_name');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
```

#### 4. Future Tables (Placeholder for upcoming features)

```sql
-- ==========================================
-- INVENTORY TABLE (For future Inventory Management app)
-- ==========================================

CREATE TABLE inventory (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  product_name TEXT NOT NULL,
  sku TEXT,
  quantity INTEGER DEFAULT 0,
  reorder_level INTEGER DEFAULT 0,
  unit_cost DECIMAL(10, 2),
  location TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==========================================
-- CUSTOMERS TABLE (For future CRM app)
-- ==========================================

CREATE TABLE customers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  company TEXT,
  type TEXT, -- 'individual', 'facility', 'distributor'
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
```

---

## 🔧 Integration Steps

### Step 1: Create Supabase Client

Create `src/lib/supabase.js`:

```javascript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables!');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

### Step 2: Update Login.js

Replace the authentication logic with Supabase:

```javascript
// In Login.js, replace handleLogin function:

import { supabase } from './lib/supabase';

const handleLogin = async (e) => {
  e.preventDefault();
  setError('');
  setIsLoading(true);

  const { data, error } = await supabase.auth.signInWithPassword({
    email: email,
    password: password,
  });

  if (error) {
    setError(error.message);
    setIsLoading(false);
    return;
  }

  if (data.user) {
    localStorage.setItem('user', JSON.stringify(data.user));
    onLogin(data.user);
  }
  
  setIsLoading(false);
};
```

### Step 3: Update App-Main.js

Add session checking:

```javascript
// In App-Main.js, add at the top:
import { supabase } from './lib/supabase';

// In useEffect for session checking:
useEffect(() => {
  // Check for existing session
  const checkSession = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session) {
      setIsAuthenticated(true);
      setCurrentUser(session.user);
    }
  };
  
  checkSession();
  
  // Listen for auth changes
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        setIsAuthenticated(true);
        setCurrentUser(session.user);
      } else if (event === 'SIGNED_OUT') {
        setIsAuthenticated(false);
        setCurrentUser(null);
        setCurrentApp(null);
      }
    }
  );
  
  return () => subscription.unsubscribe();
}, []);

// Update handleLogout:
const handleLogout = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error('Error signing out:', error);
    return;
  }
  
  setIsAuthenticated(false);
  setCurrentUser(null);
  setCurrentApp(null);
  localStorage.clear();
};
```

### Step 4: Update SteriCareDashboard.js

The file already has all the Supabase integration comments. Just uncomment the Supabase code blocks and comment out the localStorage code.

Key functions to update:
1. `useEffect` for loading data
2. `useEffect` for saving sales data
3. `useEffect` for saving sales people

---

## 📝 Data Migration

### Migrate Existing localStorage Data to Supabase

Create `src/utils/migrate.js`:

```javascript
import { supabase } from '../lib/supabase';

export const migrateLocalStorageToSupabase = async () => {
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No user logged in');

    // Get localStorage data
    const salesData = JSON.parse(localStorage.getItem('stericare_sales_data') || '[]');
    const salesPeople = JSON.parse(localStorage.getItem('stericare_sales_people') || '[]');

    // Transform and upload sales data
    if (salesData.length > 0) {
      const transformedSalesData = salesData.map(row => ({
        user_id: user.id,
        date: row.Date,
        month: row.Month,
        quarter: row.Quarter,
        product: row.Product,
        facility: row['Facility Name'],
        region: row.Region,
        sale_type: row['Type of Sale'],
        sales_person: row['Sales Person'] || 'Unassigned',
        revenue: parseFloat(row['Revenue (GHS)']),
        discount: parseFloat(row.Discount || 0),
        boxes: parseFloat(row['Boxes Sold'] || 0),
        units: parseFloat(row.Units),
        cost: parseFloat(row['Cost (GHS)']),
        profit: parseFloat(row['Profit (GHS)']),
        margin: parseFloat(row['Margin (%)'])
      }));

      const { error: salesError } = await supabase
        .from('sales_data')
        .insert(transformedSalesData);

      if (salesError) throw salesError;
      console.log('✅ Sales data migrated successfully');
    }

    // Transform and upload sales people
    if (salesPeople.length > 0) {
      const transformedPeople = salesPeople.map(person => ({
        user_id: user.id,
        name: person.name,
        commission_rate: person.commissionRate
      }));

      const { error: peopleError } = await supabase
        .from('sales_people')
        .insert(transformedPeople);

      if (peopleError) throw peopleError;
      console.log('✅ Sales people migrated successfully');
    }

    return { success: true, message: 'Migration completed successfully!' };
  } catch (error) {
    console.error('Migration error:', error);
    return { success: false, error: error.message };
  }
};
```

Add a migration button to Settings modal:

```javascript
// In Settings modal, add this button:
<button
  onClick={async () => {
    const result = await migrateLocalStorageToSupabase();
    if (result.success) {
      alert('✅ Data migrated to Supabase successfully!');
    } else {
      alert(`❌ Migration failed: ${result.error}`);
    }
  }}
  className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-lg font-medium transition-colors"
>
  Migrate Data to Supabase
</button>
```

---

## 🔒 Security Best Practices

### 1. Environment Variables

Never commit `.env` to git:

```bash
# Add to .gitignore
.env
.env.local
.env.development.local
.env.test.local
.env.production.local
```

### 2. Row Level Security (RLS)

Always use RLS policies. Never disable RLS on production tables!

### 3. API Keys

- **anon/public key**: Safe to use in frontend
- **service_role key**: NEVER use in frontend (it bypasses RLS)

### 4. User Authentication

Enable email confirmation:
1. Go to **Authentication** → **Providers** → **Email**
2. Enable "Confirm email"
3. Set up email templates

---

## 📊 Real-time Updates (Optional)

Enable real-time subscriptions for live data:

```javascript
// In SteriCareDashboard.js, add:
useEffect(() => {
  const user = JSON.parse(localStorage.getItem('user'));
  
  // Subscribe to sales_data changes
  const subscription = supabase
    .channel('sales_data_changes')
    .on('postgres_changes', 
      { 
        event: '*', 
        schema: 'public', 
        table: 'sales_data',
        filter: `user_id=eq.${user.id}`
      }, 
      (payload) => {
        console.log('Change received!', payload);
        // Refresh data
        loadDataFromSupabase();
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(subscription);
  };
}, []);
```

---

## 🧪 Testing Supabase Integration

### 1. Test Authentication

```javascript
// Test signup
const { data, error } = await supabase.auth.signUp({
  email: 'test@example.com',
  password: 'secure-password'
});

// Test login
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'test@example.com',
  password: 'secure-password'
});

// Test logout
const { error } = await supabase.auth.signOut();
```

### 2. Test Database Operations

```javascript
// Insert
const { data, error } = await supabase
  .from('sales_data')
  .insert({ /* data */ });

// Select
const { data, error } = await supabase
  .from('sales_data')
  .select('*')
  .eq('user_id', userId);

// Update
const { data, error } = await supabase
  .from('sales_data')
  .update({ revenue: 1000 })
  .eq('id', recordId);

// Delete
const { data, error } = await supabase
  .from('sales_data')
  .delete()
  .eq('id', recordId);
```

---

## 🚀 Deployment Checklist

### Before Going Live:

- [ ] Create production Supabase project
- [ ] Set up environment variables in hosting platform
- [ ] Enable email confirmation
- [ ] Configure custom SMTP (optional)
- [ ] Set up database backups
- [ ] Test RLS policies
- [ ] Enable rate limiting
- [ ] Set up monitoring
- [ ] Document API for team

### Hosting Platforms:

**Vercel:**
```bash
vercel env add REACT_APP_SUPABASE_URL
vercel env add REACT_APP_SUPABASE_ANON_KEY
```

**Netlify:**
Add in Site settings → Environment variables

**Traditional:**
Add to `.env` on server

---

## 📚 Additional Resources

- [Supabase Docs](https://supabase.com/docs)
- [Supabase Auth Helpers for React](https://supabase.com/docs/guides/auth/auth-helpers/react)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase CLI](https://supabase.com/docs/guides/cli)

---

## 🆘 Troubleshooting

### Issue: "Invalid API key"
- Check `.env` file exists and variables are correct
- Restart development server after adding `.env`

### Issue: "Row Level Security policy violation"
- User not authenticated
- RLS policies not created
- Wrong user_id in insert

### Issue: "Cannot connect to Supabase"
- Check internet connection
- Verify Supabase project is running
- Check API URL is correct

### Issue: Data not saving
- Check browser console for errors
- Verify user is authenticated
- Check RLS policies allow INSERT
- Verify data structure matches table schema

---

## 📞 Support

For Supabase-specific issues:
- [Supabase Discord](https://discord.supabase.com/)
- [GitHub Issues](https://github.com/supabase/supabase/issues)
- [Community Forum](https://github.com/supabase/supabase/discussions)

---

**Version:** 1.0  
**Last Updated:** February 2026  
**Compatible With:** Supabase v2.x, React 18+