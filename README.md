# Fashion Store — Full-Stack E-commerce Demo

A complete, beginner-friendly online fashion store using **Node.js, HTML, CSS, and vanilla JavaScript**. The server also serves the frontend, so you do not need Live Server or a separate database server to run it locally.

> **Demo scope:** This is a learning/portfolio project. Checkout creates an order in the local JSON data store. It does **not** charge cards or perform a real UPI payment. The JSON store is suitable for a local demo, not a busy production store.

## Features

- Responsive Home page with category tiles and featured products
- Products page with search and category filtering
- Product detail page with size selection, stock checks, and add-to-cart
- Registration with hashed passwords and login with signed JWT tokens
- Per-user cart with quantity changes, item removal, totals, and navbar item count
- Checkout with delivery address and demo payment-method selection
- Order confirmation, order history, and order details with product photos
- Profile view/update
- Backend authorization for cart, profile, and orders
- Seven sample products across Men, Women, Kids, Footwear, and Accessories
- Product photos included in `public/images/`
- Local data persists in `data/store.json` after the first run

## Requirements

- Node.js 18 or later (Node.js 20 LTS or newer is recommended)
- VS Code (recommended)
- No external database server or third-party npm packages are required. (Node.js includes the modules this project uses.)

## Run locally (Windows / VS Code)

1. Download and extract the ZIP.
2. Open the extracted **`fashion-store-complete`** folder in VS Code. Make sure the terminal is at the folder containing `package.json` and `server.js`.
3. Open **Terminal → New Terminal**.
4. Optional but recommended: create your local environment file. In the VS Code terminal, run:

   ```powershell
   copy .env.example .env
   ```

   Open `.env` and replace `JWT_SECRET` with a long random value. Do not commit `.env` to GitHub.

5. Start the application:

   ```bash
   npm run dev
   ```

   Or use `npm start` for a normal start without automatic restarts.

6. Open **http://localhost:5000** in Chrome.

**Important:** Open the app through `http://localhost:5000`. Do not open the HTML files with `file://` and do not use Live Server for this packaged version. The Node.js server serves both the pages and `/api` routes from the same origin.

The terminal should show:

```text
Fashion Store is running at http://localhost:5000
Demo store data is saved in data/store.json
```

The first server request creates `data/store.json` from `data/seed.json`. Your accounts, cart contents and orders are saved in `data/store.json` during local use. If you want a fresh demo database, stop the server, delete `data/store.json`, and start the server again; it will be recreated from the seed data. **Deleting it removes demo accounts and orders.**

## Try the flow

1. Open Home and browse categories.
2. Open **Shop**, search for a product, or filter by category.
3. Open a product, choose an available size and quantity, then select **Add to cart**.
4. Create an account using **Create account** (password must be at least 8 characters).
5. Log in and add products to the cart.
6. Open Cart → Checkout, enter a delivery address, and place a demo order.
7. Check Order confirmation → My orders → Order details.
8. Open Profile to update your contact and delivery details.

You can use a test email you control; there is no pre-created account or password.

## Project structure

```text
fashion-store-complete/
├── data/
│   └── seed.json                 # Initial sample catalogue and empty user/order lists
├── src/
│   └── store.js                  # JSON store initialization/read/write helpers
├── public/
│   ├── index.html                # Home page
│   ├── products.html             # Search and category filter
│   ├── product-details.html      # Product details and size selection
│   ├── login.html
│   ├── register.html
│   ├── cart.html
│   ├── checkout.html
│   ├── order-confirmation.html
│   ├── orders.html
│   ├── order-details.html
│   ├── profile.html
│   ├── assets/
│   │   ├── css/style.css
│   │   └── js/                   # Frontend behavior by page
│   └── images/                   # Seven product/category photos + placeholder
├── .env.example
├── .gitignore
├── START-HERE.txt
├── start-windows.bat
├── package.json
├── server.js                     # Express API + static frontend server
└── README.md
```

## API overview

| Method | Endpoint | Purpose | Login required |
|---|---|---|---|
| GET | `/api/health` | API health check | No |
| GET | `/api/categories` | List categories | No |
| GET | `/api/products` | List products; optional `?q=shirt&category=Men` | No |
| GET | `/api/products/:id` | Product details and sizes | No |
| POST | `/api/auth/register` | Create account | No |
| POST | `/api/auth/login` | Log in and return token | No |
| GET | `/api/profile` | Read own profile | Yes |
| PUT | `/api/profile` | Update own profile | Yes |
| GET | `/api/cart` | Read own cart | Yes |
| POST | `/api/cart` | Add product and size to cart | Yes |
| PUT | `/api/cart/:itemId` | Change item quantity | Yes |
| DELETE | `/api/cart/:itemId` | Remove item from cart | Yes |
| POST | `/api/orders` | Create order and clear cart | Yes |
| GET | `/api/orders` | List own orders | Yes |
| GET | `/api/orders/:id` | Read own order details | Yes |

You can test the public health endpoint in the browser at **http://localhost:5000/api/health**.

## Push the source code to GitHub

1. Create a **new empty repository** on GitHub (do not add a README there if you will push this folder's README).
2. Open a terminal in the extracted project folder.
3. Run these commands, replacing the URL with your repository URL:

   ```bash
   git init
   git add .
   git commit -m "Build Fashion Store e-commerce demo"
   git branch -M main
   git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPOSITORY.git
   git push -u origin main
   ```

`node_modules/`, `.env`, and runtime user/order data (`data/store.json`) are excluded by `.gitignore`. The seed catalogue is included in `data/seed.json`.

## Deployment notes

GitHub stores the code; **GitHub Pages cannot run this Node.js backend**. To deploy the full app, use a Node.js host such as Render or another service that runs `npm start`:

- Build/install command: `npm install` (there are no third-party runtime dependencies)
- Start command: `npm start`
- Set `JWT_SECRET` to a long, random secret in the host's environment settings.
- Ensure the host's writable persistent storage is mounted for the runtime `data/store.json` file, or replace the JSON store with a hosted database such as PostgreSQL before relying on persistent online orders. Some hosts erase local files on redeploy/restart unless persistent storage is configured.
- After deployment, test registration, login, cart, checkout, and order history on the deployed domain.

## Limitations and production checklist

- The data store is a simple JSON file. It is excellent for a local portfolio demo but not suitable for concurrent multi-instance production use. Use a database for a real store.
- UPI is a demonstration option only; no real payment is collected. Integrate a payment provider and verify webhooks on the server before taking real payments.
- Before a public production launch, add rate limiting, stronger validation, security headers, password reset, email verification, HTTPS, database migrations/backups, and tests.
- The included product images are generated demo assets and product prices/stock are sample data.
