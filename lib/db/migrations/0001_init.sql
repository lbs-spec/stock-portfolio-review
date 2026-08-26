-- D1 migration: init

CREATE TABLE IF NOT EXISTS portfolio_summaries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  import_batch_id TEXT NOT NULL UNIQUE,
  exported_at DATETIME,
  total_assets REAL NOT NULL,
  available_cash REAL NOT NULL,
  withdrawable_cash REAL NOT NULL DEFAULT 0,
  market_value REAL NOT NULL,
  position_pnl REAL NOT NULL,
  daily_pnl REAL NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS positions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  available_quantity INTEGER NOT NULL,
  cost_price REAL NOT NULL,
  latest_price REAL,
  position_pnl_ratio REAL,
  position_pnl REAL,
  daily_pnl_ratio REAL,
  daily_pnl REAL,
  avg_buy_price REAL,
  position_ratio REAL,
  market_value REAL,
  market TEXT NOT NULL,
  currency TEXT NOT NULL,
  account TEXT NOT NULL,
  import_batch_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_positions_code ON positions(code);
CREATE INDEX IF NOT EXISTS idx_positions_batch ON positions(import_batch_id);

CREATE TABLE IF NOT EXISTS trades (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  trade_date TEXT NOT NULL,
  trade_time TEXT,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  direction TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  price REAL NOT NULL,
  amount REAL NOT NULL,
  commission REAL DEFAULT 0,
  other_fees REAL DEFAULT 0,
  stamp_tax REAL DEFAULT 0,
  transfer_fee REAL DEFAULT 0,
  cash_balance REAL,
  share_balance INTEGER,
  order_no TEXT,
  trade_no TEXT,
  market TEXT NOT NULL,
  account TEXT NOT NULL,
  currency TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_trades_code_date ON trades(code, trade_date);

CREATE TABLE IF NOT EXISTS trade_analyses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  trade_id INTEGER NOT NULL UNIQUE REFERENCES trades(id) ON DELETE CASCADE,
  rule_score INTEGER,
  rule_reasoning TEXT,
  ai_score INTEGER,
  ai_reasoning TEXT,
  is_reasonable BOOLEAN,
  verdict TEXT CHECK(verdict IN ('reasonable', 'caution', 'unreasonable')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL CHECK(type IN ('pre_market_news', 'position_news', 'daily_review', 'latest_market_news')),
  title TEXT,
  content TEXT NOT NULL,
  source TEXT NOT NULL,
  generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  metadata TEXT
);

CREATE INDEX IF NOT EXISTS idx_reviews_type ON reviews(type, generated_at DESC);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
