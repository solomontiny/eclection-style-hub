# Admin Dashboard Quick Start Guide

## 🚀 Getting Started

### 1. Access Admin Dashboard

1. Start the dev server:
   ```bash
   npm run dev
   ```

2. Navigate to: `http://localhost:8081/admin`

3. You'll be redirected to `/login` if not authenticated

4. Login with your admin account (must have "admin" role in Supabase)

5. You'll be redirected to `/admin/dashboard`

---

## 📋 Admin Dashboard Features

### Dashboard Overview (`/admin/dashboard`)
**See:** Revenue, Order count, Product count, Customer count, Low stock alerts, Recent orders

**How to use:**
- Monitor your store health at a glance
- Click on metric cards to drill down (future enhancement)
- Low stock section shows products under threshold

---

### Products Management (`/admin/products`)

#### View Products
- Displays all products in a table
- Shows: Product image, name, slug, price, stock, status
- Search products by name (real-time filter)
- Filter by status: All, Active, Draft, Archived

#### Create Product
1. Click **"+ New product"** button
2. Fill in form:
   - **Name** (required)
   - **Slug** (auto-generated from name)
   - **Description** (optional)
   - **Price** (NGN)
   - **Discount %** (optional)
   - **Stock** (units available)
   - **Category** (optional dropdown)
   - **Status** (Draft/Active/Archived)
   - **Featured** (checkbox for homepage display)
   - **Images** (upload multiple)
3. Click **"Save"**

#### Upload Product Images
1. In the product form, click the upload area or drag files
2. Files upload to Supabase Storage instantly
3. Thumbnail previews appear immediately
4. Remove images with the **X** button before saving

#### Edit Product
1. Click the **✏️** (pencil) icon on a product row
2. Modify any field
3. Click **"Save"**

#### Delete Product
1. Click the **🗑️** (trash) icon on a product row
2. Confirm deletion in dialog
3. Product is removed immediately

---

### Categories Management (`/admin/categories`)

#### View Categories
- All categories listed alphabetically
- Shows: Category name, slug, description

#### Create Category
1. Click **"+ New"** button
2. Fill form:
   - **Name** (required)
   - **Slug** (auto-generated)
   - **Description** (optional)
3. Click **"Save"**

#### Edit Category
1. Click **✏️** icon
2. Modify fields
3. Click **"Save"**

#### Delete Category
1. Click **🗑️** icon
2. Confirm in dialog

---

### Orders Management (`/admin/orders`)

#### View Orders
- Table shows: Order #, Customer name, Total (NGN), Order date, Status
- Shows filtered count vs total

#### Search Orders
- Search by order number, customer name, or email (real-time)

#### Filter by Status
- Dropdown filter: All, Pending, Processing, Shipped, Delivered, Cancelled

#### Update Order Status
1. Click status dropdown on any order row
2. Select new status
3. Updates immediately

#### View Order Details
1. Click **👁️** (eye) icon
2. Modal shows:
   - Customer info (name, email, phone)
   - Shipping address
   - Order items with quantities and prices
   - Pricing breakdown (subtotal, discount, shipping, total)
3. Click outside to close

---

### Inventory Management (`/admin/inventory`)

#### View Stock Levels
- Table shows all products with current stock
- **Low stock** flag (⚠️ amber) for products near threshold
- **Out of stock** flag (🔴 red) for 0 units

#### Adjust Stock
**Three methods:**

1. **+/- Buttons:** Click to increase/decrease by 1 unit
2. **Direct Input:** Edit the stock field and press blur/tab
3. **Restock Button:** Click "+ Restock" to add multiple units at once

#### Set Low Stock Threshold
1. Edit the "Low-stock threshold" field (default: 5)
2. Press blur/tab to save
3. Products at or below this threshold show warning

#### Filter Stock
- Buttons to show: All products, Low stock only, Out of stock only

#### Stock Stats
- Total products count
- Total units in stock
- Low stock count
- Out of stock count

---

### Customers Page (`/admin/customers`)

#### View Customers
- Table shows: Name, Phone, Order count, Total spent (NGN), Joined date
- Shows filtered count vs total

#### Search Customers
- Real-time search by name or phone number

#### Customer Stats
- Each row calculates:
  - Total orders by customer
  - Total revenue from customer

---

### Coupons Management (`/admin/coupons`)

#### View Coupons
- Table shows: Code, Discount type, Usage count, Status (Active/Inactive)

#### Create Coupon
1. Click **"+ New"** button
2. Fill form:
   - **Code** (e.g., "SAVE10", auto-uppercased)
   - **Description** (optional)
   - **Discount Type** (Percent % or Fixed ₦)
   - **Discount Value** (amount or percentage)
   - **Min Order Amount** (optional threshold)
   - **Usage Limit** (optional max uses)
   - **Active** (toggle status)
   - **Expires At** (optional date)
3. Click **"Save"**

#### Edit Coupon
1. Click **✏️** icon
2. Modify fields
3. Click **"Save"**

#### Delete Coupon
1. Click **🗑️** icon
2. Confirm in dialog

#### Track Usage
- "Used" column shows: `{used_count} / {usage_limit}` if limit set
- Shows `{used_count}` if no limit

---

### Admin Settings (`/admin/settings`)

#### View Account Info
- Email (read-only)
- User ID (read-only)

#### Change Password
1. Enter new password (minimum 8 characters)
2. Click **"Update password"**
3. Success toast confirms

---

## 🎨 UI & Navigation

### Desktop Navigation
- Left sidebar with icon + label for each section
- Sticky sidebar stays visible while scrolling
- Active section highlighted in blue

### Mobile Navigation
- Tab navigation at top
- Horizontal scroll if needed
- Main header with sign out

### Common Actions
- **Search:** Real-time filtering on most pages
- **Status Filter:** Dropdowns to filter by status
- **Modals:** Forms appear in dialogs (click outside to close)
- **Toast Notifications:** Success/error messages appear top-right
- **Confirmation Dialogs:** Delete actions require confirmation

---

## 💾 Data Persistence

All changes are saved to Supabase immediately:
- **Products:** Updated in `products` table
- **Images:** Stored in Supabase Storage `product-images` bucket
- **Orders:** Status updates in `orders` table
- **Categories:** Stored in `categories` table
- **Coupons:** Stored in `coupons` table
- **Inventory:** Stock updates in `products` table

---

## 🔐 Access Control

- **Admin-only:** All routes protected by role check
- **Authentication:** Supabase Auth required
- **Authorization:** Must have "admin" role in RLS policies
- **Redirect:** Non-admin users are redirected to homepage

---

## ⚡ Performance Tips

1. **Bulk Uploads:** Use drag-and-drop for multiple images at once
2. **Search:** Use filters before bulk updates (faster UI)
3. **Stock:** Use "+ Restock" button instead of manual input for large quantities
4. **Categories:** Create categories before adding products
5. **Coupons:** Set usage limits to prevent abuse

---

## 🐛 Troubleshooting

### Login not working?
- Check email/password in Supabase auth
- Verify user has "admin" role in database
- Check browser console for errors

### Products not saving?
- Check all required fields (Name is required)
- Verify Supabase URL and key in `.env`
- Check toast notifications for error messages

### Images not uploading?
- Verify Supabase Storage bucket "product-images" exists
- Check bucket is public (for CDN URLs)
- Check image file size (should be < 10MB)

### Orders/customers not showing?
- Check Supabase tables exist (orders, order_items, profiles)
- Verify RLS policies allow admin access
- Check browser console for query errors

### Slow page loading?
- Clear browser cache and reload
- Check internet connection
- Verify Supabase project is responsive

---

## 📊 Common Workflows

### Adding a New Product
1. Go to `/admin/products`
2. Click **"+ New product"**
3. Fill: Name, Price, Stock
4. Upload 2-3 product images
5. Set Status to "Draft" (or "Active" to go live)
6. Click **"Save"**
7. Product appears in storefront (if Active)

### Managing Low Stock
1. Go to `/admin/inventory`
2. Click **"Low stock"** filter tab
3. Review products near threshold
4. Adjust stock with +/- or "+ Restock" button
5. Low stock alerts clear when stock > threshold

### Processing an Order
1. Go to `/admin/orders`
2. Filter by "Pending" status
3. Click **👁️** to view full order details
4. Change status: Pending → Processing → Shipped → Delivered
5. Customer can track order on storefront

### Creating a Promotional Coupon
1. Go to `/admin/coupons`
2. Click **"+ New"**
3. Code: "LAUNCH20"
4. Discount: 20%
5. Set Usage limit: 100
6. Click **"Save"**
7. Coupon live immediately on storefront

---

## 🔗 Related Routes

**Public Routes:**
- `/` — Storefront
- `/shop` — Product catalog (uses your products)
- `/login` — Customer login

**Admin Routes:**
- `/admin/dashboard` — Overview
- `/admin/products` — Product management
- `/admin/categories` — Category management
- `/admin/orders` — Order tracking
- `/admin/inventory` — Stock management
- `/admin/customers` — Customer list
- `/admin/coupons` — Coupon management
- `/admin/settings` — Account settings

---

## 📞 Support

For issues or feature requests:
1. Check browser console for errors (`F12`)
2. Verify Supabase connection
3. Check RLS policies in Supabase dashboard
4. Review build output for warnings

**Production Deployment:** Ready to deploy with `npm run deploy` (Cloudflare Workers)

---

**Last Updated:** June 24, 2026
