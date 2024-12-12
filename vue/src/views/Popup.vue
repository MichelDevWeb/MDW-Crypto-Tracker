<template>
  <div class="app-container">
    <div class="header">
      <div class="header-content">
        <div class="title-and-stats">
          <h3>MDW Crypto</h3>
          <div class="stats-group">
            <div class="stat-item">
              <span class="stat-label">Cost:</span>
              <span class="stat-value">${{ formatPrice(totalCost) }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Value:</span>
              <span class="stat-value">${{ formatPrice(totalValue) }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">P&L:</span>
              <span :class="['stat-value', getPnLClass(totalProfitLoss)]">
                {{ formatPnL(totalProfitLoss) }}
                <small v-if="totalCost">({{ formatPnLPercentage(totalProfitLoss, totalCost) }})</small>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="search-container">
      <input
        v-model="searchQuery"
        @keyup.enter="handleSearch"
        class="form-control search-input"
        placeholder="Search coins..."
      />
      <select
        v-model="selectedApi"
        @change="handleApiChange"
        class="form-select api-select"
      >
        <option value="coingecko">CoinGecko</option>
        <option value="coincap">CoinCap</option>
      </select>
      <select
        v-model="pageSize"
        @change="fetchCoins"
        class="form-select page-size-select"
      >
        <option value="25">25 per page</option>
        <option value="50">50 per page</option>
        <option value="100">100 per page</option>
        <option value="200">200 per page</option>
      </select>
      <select
        v-model="currentPage"
        @change="fetchCoins"
        class="form-select page-select"
      >
        <option v-for="page in totalPages" :key="page" :value="page">
          Page {{ page }}
        </option>
      </select>
    </div>

    <div class="table-container">
      <table class="table table-dark table-hover">
        <thead>
          <tr>
            <th>
              <div
                @click="togglePortfolioView"
                class="portfolio-trigger"
                :title="
                  showPortfolio ? 'Show all coins' : 'Show portfolio coins'
                "
              >
                {{ showPortfolio ? "🌐" : "📊" }}
              </div>
            </th>
            <th @click="sortBy('rank')" class="sortable">
              Rank
              <span class="sort-icon">{{ getSortIcon("rank") }}</span>
            </th>
            <th @click="sortBy('symbol')" class="sortable">
              Symbol
              <span class="sort-icon">{{ getSortIcon("symbol") }}</span>
            </th>
            <th @click="sortBy('price')" class="sortable">
              Price
              <span class="sort-icon">{{ getSortIcon("price") }}</span>
            </th>
            <th @click="sortBy('priceChange24h')" class="sortable">
              24h
              <span class="sort-icon">{{ getSortIcon("priceChange24h") }}</span>
            </th>
            <th @click="sortBy('value')" class="sortable">
              Value/PnL
              <span class="sort-icon">{{ getSortIcon("value") }}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="coin in sortedCoins" :key="coin.id" class="coin-row">
            <td>
              <button
                @click="togglePortfolio(coin)"
                :class="[
                  'favorite-btn',
                  coin.inPortfolio
                    ? 'favorite-active'
                    : 'favorite-inactive',
                ]"
                :title="coin.inPortfolio ? 'Remove from portfolio' : 'Add to portfolio'"
              >
                {{ coin.inPortfolio ? '⭐' : '☆' }}
              </button>
            </td>
            <td class="rank-icon-cell">
              <span class="rank-number">#{{ coin.rank }}</span>
              <img :src="coin.image" :alt="coin.symbol" class="coin-icon" />
            </td>
            <td>
              <a
                :href="`https://www.coingecko.com/en/coins/${coin.id}`"
                target="_blank"
                class="coin-link"
                :title="coin.name"
              >
                {{ coin.symbol.toUpperCase() }}
              </a>
            </td>
            <td>${{ formatPrice(coin.price) }}</td>
            <td
              :class="[
                'price-change-pill',
                getPriceChangeClass(coin.priceChange24h),
              ]"
            >
              {{ formatPriceChange(coin.priceChange24h) }}
            </td>
            <td class="value-pnl-cell">
              <div class="value-pnl-container">
                <div class="value-text">${{ formatPrice(coin.holdings * coin.price) }}</div>
                <div :class="['pnl-text', getPnLClass(coin.pnl)]">
                  {{ formatPnL(coin.pnl) }}
                  <small v-if="coin.holdings">
                    ({{ formatPnLPercentage(coin.pnl, coin.holdings * coin.price) }})
                  </small>
                </div>
              </div>
              <div class="hover-actions">
                <button
                  @click="openTransactionModal(coin)"
                  class="action-btn"
                  title="Add Transaction"
                >
                  <span class="action-icon">💰</span>
                  <span class="action-text">Add</span>
                </button>
                <button
                  @click="viewTransactions(coin)"
                  class="action-btn"
                  title="View Transactions"
                >
                  <span class="action-icon">📊</span>
                  <span class="action-text">View</span>
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="loading" class="loading-spinner">
      <div class="spinner-border text-light" role="status">
        <span class="visually-hidden">Loading...</span>
      </div>
    </div>

    <div v-if="error" class="alert alert-danger">
      {{ error }}
    </div>

    <footer class="footer">
      <a
        href="https://chrome.google.com/webstore/detail/mdw-crypto-portfolio-track/njpeiacpcgcfdojjedocmegpkcljibmk"
        target="_blank"
        class="store-link"
      >
        Available on Chrome Web Store
      </a>
      <span class="link-separator">•</span>
      <a
        href="https://github.com/MichelDevWeb/MDW-Crypto-Tracker/tree/main"
        target="_blank"
        class="store-link"
      >
        View on GitHub
      </a>
    </footer>

    <!-- Add Transaction Modal -->
    <div v-if="showTransactionModal" class="modal edit-transaction-modal">
      <div class="modal-content">
        <h3>
          {{ editingTransaction ? "Edit" : "Add" }} Transaction for
          {{ selectedCoin?.name }}
        </h3>
        <form @submit.prevent="saveTransaction">
          <div class="form-group">
            <label>Type:</label>
            <div class="transaction-type-toggle">
              <button
                type="button"
                :class="[
                  'type-btn',
                  transaction.type === 'buy' ? 'active' : '',
                ]"
                @click="transaction.type = 'buy'"
              >
                Buy
              </button>
              <button
                type="button"
                :class="[
                  'type-btn',
                  transaction.type === 'sell' ? 'active' : '',
                ]"
                @click="transaction.type = 'sell'"
              >
                Sell
              </button>
            </div>
          </div>

          <div class="form-group">
            <label>Amount:</label>
            <div class="input-with-preview">
              <input
                type="number"
                v-model="transaction.amount"
                step="any"
                required
                class="enhanced-input"
              />
              <span class="preview-text"
                >≈ ${{
                  formatPrice(transaction.amount * transaction.price)
                }}</span
              >
            </div>
          </div>

          <div class="form-group">
            <label>Price per coin:</label>
            <div class="input-with-preview">
              <input
                type="number"
                v-model="transaction.price"
                step="any"
                required
                class="enhanced-input"
              />
              <span class="preview-text"
                >Current: ${{ formatPrice(selectedCoin?.price) }}</span
              >
            </div>
          </div>

          <div class="form-group">
            <label>Date:</label>
            <input
              type="datetime-local"
              v-model="transaction.date"
              required
              class="enhanced-input"
            />
          </div>

          <div class="transaction-preview" v-if="transactionPnL !== null">
            <div class="preview-label">Transaction PnL:</div>
            <div :class="['preview-value', getPnLClass(transactionPnL)]">
              {{ formatPnL(transactionPnL) }}
            </div>
          </div>

          <div class="modal-actions">
            <button type="submit" class="btn-primary">
              {{ editingTransaction ? "Update" : "Save" }}
            </button>
            <button
              type="button"
              @click="closeTransactionModal"
              class="btn-secondary"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Transaction History Modal -->
    <div v-if="showTransactionHistory" class="modal history-modal">
      <div class="modal-content transaction-history-modal">
        <!-- Header -->
        <div class="modal-header">
          <div class="coin-info">
            <img :src="selectedCoin?.image" :alt="selectedCoin?.symbol" class="coin-header-icon">
            <h3>{{ selectedCoin?.symbol.toUpperCase() }} Transactions</h3>
          </div>
          <button @click="closeTransactionHistory" class="close-btn">&times;</button>
        </div>

        <!-- Summary Cards -->
        <div class="summary-grid">
          <div class="summary-card">
            <div class="summary-label">Holdings</div>
            <div class="summary-value">
              {{ selectedCoin?.holdings }}
              <span class="symbol-badge">{{ selectedCoin?.symbol.toUpperCase() }}</span>
            </div>
          </div>
          <div class="summary-card">
            <div class="summary-label">Avg. Price</div>
            <div class="summary-value">${{ formatPrice(calculateAveragePrice(selectedCoin)) }}</div>
          </div>
          <div class="summary-card">
            <div class="summary-label">Total Value</div>
            <div class="summary-value">${{ formatPrice(selectedCoin?.holdings * selectedCoin?.price) }}</div>
          </div>
          <div class="summary-card">
            <div class="summary-label">Total P&L</div>
            <div :class="['summary-value', getPnLClass(selectedCoin?.pnl)]">
              {{ formatPnL(selectedCoin?.pnl) }}
              <small>({{ formatPnLPercentage(selectedCoin?.pnl, selectedCoin?.holdings * selectedCoin?.price) }})</small>
            </div>
          </div>
        </div>

        <!-- Transaction List -->
        <div class="transaction-list">
          <div v-for="(tx, index) in coinTransactions" 
               :key="index" 
               class="tx-item"
               :class="tx.type">
            <div class="tx-main">
              <div class="tx-type">
                <span class="tx-icon">{{ tx.type === 'buy' ? '↓' : '↑' }}</span>
                {{ tx.type.toUpperCase() }}
              </div>
              <div class="tx-amount">
                {{ tx.amount }}
                <span class="symbol-badge">{{ selectedCoin?.symbol.toUpperCase() }}</span>
              </div>
              <div class="tx-price">${{ formatPrice(tx.price) }}</div>
              <div class="tx-total">${{ formatPrice(tx.amount * tx.price) }}</div>
              <div :class="['tx-pnl', getPnLClass(calculateTransactionPnL(tx))]">
                {{ formatPnL(calculateTransactionPnL(tx)) }}
              </div>
            </div>
            <div class="tx-secondary">
              <span class="tx-date">{{ new Date(tx.timestamp).toLocaleString() }}</span>
              <div class="tx-actions">
                <button @click="editTransaction(tx)" class="action-mini" title="Edit">✎</button>
                <button @click="deleteTransaction(tx)" class="action-mini" title="Delete">🗑</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      coins: [],
      loading: false,
      error: null,
      searchQuery: "",
      selectedApi: "coingecko",
      pageSize: 25,
      portfolio: new Set(),
      currentPage: 1,
      totalPages: 10,
      showPortfolio: true,
      showTransactionModal: false,
      selectedCoin: null,
      transaction: {
        type: "buy",
        amount: 0,
        price: 0,
        date: new Date()
          .toLocaleString("sv-SE", {
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          })
          .slice(0, 16),
      },
      sortConfig: {
        key: "rank",
        direction: "asc",
      },
      showTransactionHistory: false,
      coinTransactions: [],
      editingTransaction: null,
    };
  },
  computed: {
    portfolioCoins() {
      return this.coins.filter((coin) => this.portfolio.has(coin.id));
    },
    displayedCoins() {
      if (this.showPortfolio) {
        return this.portfolioCoins;
      }

      return this.coins;
    },
    sortedCoins() {
      const coins = [...this.displayedCoins];
      if (!this.sortConfig.key) return coins;

      return coins.sort((a, b) => {
        let aVal = a[this.sortConfig.key];
        let bVal = b[this.sortConfig.key];

        // Handle special cases
        if (this.sortConfig.key === "symbol") {
          aVal = aVal.toUpperCase();
          bVal = bVal.toUpperCase();
        } else if (this.sortConfig.key === "holdings") {
          aVal = aVal || 0;
          bVal = bVal || 0;
        } else if (this.sortConfig.key === "value") {
          aVal = (a.holdings || 0) * a.price;
          bVal = (b.holdings || 0) * b.price;
        }

        if (aVal < bVal) {
          return this.sortConfig.direction === "asc" ? -1 : 1;
        }
        if (aVal > bVal) {
          return this.sortConfig.direction === "asc" ? 1 : -1;
        }
        return 0;
      });
    },
    transactionPnL() {
      if (
        !this.selectedCoin ||
        !this.transaction.amount ||
        !this.transaction.price
      )
        return null;

      const currentValue = this.selectedCoin.price * this.transaction.amount;
      const transactionValue = this.transaction.price * this.transaction.amount;

      return this.transaction.type === "buy"
        ? currentValue - transactionValue
        : transactionValue - currentValue;
    },
    totalCost() {
      return this.portfolioCoins.reduce((total, coin) => {
        const coinTransactions = coin.transactions || [];
        let coinCost = 0;
        let totalCoins = 0;

        coinTransactions.forEach((tx) => {
          if (tx.type === "buy") {
            coinCost += tx.price * tx.amount;
            totalCoins += tx.amount;
          } else {
            coinCost -= tx.price * tx.amount;
            totalCoins -= tx.amount;
          }
        });

        return total + coinCost;
      }, 0);
    },

    totalValue() {
      return this.portfolioCoins.reduce((total, coin) => {
        return total + coin.holdings * coin.price;
      }, 0);
    },

    totalProfitLoss() {
      return this.totalValue - this.totalCost;
    },
  },
  methods: {
    async fetchCoins() {
      this.loading = true;
      this.error = null;

      try {
        if (this.showPortfolio) {
          // Get portfolio coins from storage
          const { portfolio = [] } = await chrome.storage.sync.get("portfolio");
          
          if (this.selectedApi === "coingecko") {
            // For CoinGecko: Use the markets API with specific coin IDs
            const coinIds = portfolio.join(',');
            if (coinIds) {
              const response = await fetch(
                `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${coinIds}&order=market_cap_desc`
              );
              const data = await response.json();
              this.coins = this.parseCoingeckoData(data);
            } else {
              this.coins = [];
            }
          } else {
            // For CoinCap: Fetch each coin individually as CoinCap doesn't support bulk ID lookup
            const promises = portfolio.map(async (coinId) => {
              const response = await fetch(
                `https://api.coincap.io/v2/assets/${coinId}`
              );
              const { data } = await response.json();
              return data;
            });

            const results = await Promise.all(promises);
            this.coins = this.parseCoinCapData(results);
          }
        } else {
          // Regular pagination for non-portfolio view
          const endpoint =
            this.selectedApi === "coingecko"
              ? `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${this.pageSize}&page=${this.currentPage}`
              : `https://api.coincap.io/v2/assets?limit=${this.pageSize}&offset=${
                  (this.currentPage - 1) * this.pageSize
                }`;

          const response = await fetch(endpoint);
          const data = await response.json();

          this.coins =
            this.selectedApi === "coingecko"
              ? this.parseCoingeckoData(data)
              : this.parseCoinCapData(data.data);
        }

        // Update holdings after fetching new coins
        await this.updateHoldings();
      } catch (err) {
        this.error = "Failed to fetch cryptocurrency data";
        console.error(err);
      } finally {
        this.loading = false;
      }
    },

    parseCoingeckoData(data) {
      return data.map((coin) => ({
        id: coin.id,
        symbol: coin.symbol,
        name: coin.name,
        image: coin.image,
        rank: coin.market_cap_rank,
        price: coin.current_price,
        priceChange24h: coin.price_change_percentage_24h,
        inPortfolio: this.portfolio.has(coin.id),
      }));
    },

    parseCoinCapData(data) {
      return data.map((coin) => ({
        id: coin.id,
        symbol: coin.symbol,
        name: coin.name,
        image: `https://assets.coincap.io/assets/icons/${coin.symbol.toLowerCase()}@2x.png`,
        rank: coin.rank,
        price: parseFloat(coin.priceUsd),
        priceChange24h: parseFloat(coin.changePercent24Hr),
        inPortfolio: this.portfolio.has(coin.id),
      }));
    },

    formatPrice(price) {
      if (price === null || price === undefined) {
        return "N/A";
      }
      return price.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 6,
      });
    },

    formatPriceChange(change) {
      if (change === null || change === undefined) {
        return "N/A";
      }
      return `${change >= 0 ? "+" : ""}${change.toFixed(2)}%`;
    },

    getPriceChangeClass(change) {
      return {
        profit: change > 0,
        loss: change < 0,
        neutral: change === 0,
      };
    },

    async handleSearch() {
      if (this.searchQuery.length > 2) {
        this.loading = true;
        this.error = null;

        try {
          let endpoint;
          if (this.selectedApi === "coingecko") {
            endpoint = `https://api.coingecko.com/api/v3/search?query=${this.searchQuery}`;
            const response = await fetch(endpoint);
            const data = await response.json();

            // Get the first 'pageSize' number of coins from search results
            const coinIds = data.coins
              .slice(0, this.pageSize)
              .map((coin) => coin.id)
              .join(",");

            // Fetch detailed data for these coins
            if (coinIds) {
              const detailsResponse = await fetch(
                `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${coinIds}&order=market_cap_desc`
              );
              const detailsData = await detailsResponse.json();
              this.coins = this.parseCoingeckoData(detailsData);
            } else {
              this.coins = [];
            }
          } else {
            // CoinCap search
            endpoint = `https://api.coincap.io/v2/assets?search=${this.searchQuery}&limit=${this.pageSize}`;
            const response = await fetch(endpoint);
            const data = await response.json();
            this.coins = this.parseCoinCapData(data.data);
          }
        } catch (err) {
          this.error = "Failed to search cryptocurrencies";
          console.error(err);
        } finally {
          this.loading = false;
        }
      } else if (this.searchQuery.length === 0) {
        // If search is cleared, reset to normal view
        this.fetchCoins();
      }
    },

    handleApiChange() {
      this.fetchCoins();
    },

    togglePortfolio(coin) {
      if (this.portfolio.has(coin.id)) {
        this.portfolio.delete(coin.id);
      } else {
        this.portfolio.add(coin.id);
      }
      coin.inPortfolio = !coin.inPortfolio;
      this.savePortfolio();
    },

    async savePortfolio() {
      await chrome.storage.sync.set({
        portfolio: Array.from(this.portfolio),
      });
    },

    async loadPortfolio() {
      const data = await chrome.storage.sync.get("portfolio");
      this.portfolio = new Set(data.portfolio || []);
      this.showPortfolio = this.portfolio.size > 0;
    },

    togglePortfolioView() {
      this.showPortfolio = !this.showPortfolio;
      this.fetchCoins();
    },

    formatHoldings(holdings) {
      return holdings ? holdings : "0";
    },

    openTransactionModal(coin) {
      this.selectedCoin = coin;
      this.transaction.price = coin.price;
      this.transaction.date = new Date()
        .toLocaleString("sv-SE", {
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        })
        .slice(0, 16);
      this.showTransactionModal = true;
    },

    closeTransactionModal() {
      this.showTransactionModal = false;
      this.selectedCoin = null;
      this.transaction = {
        type: "buy",
        amount: 0,
        price: 0,
        date: new Date()
          .toLocaleString("sv-SE", {
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          })
          .slice(0, 16),
      };
    },

    async saveTransaction() {
      try {
        const transaction = {
          ...this.transaction,
          coinId: this.selectedCoin.id,
          timestamp: new Date(this.transaction.date).getTime(),
        };

        const { transactions = [] } = await chrome.storage.sync.get(
          "transactions"
        );
        let updatedTransactions = [...transactions];

        if (this.editingTransaction) {
          // Update existing transaction
          const index = transactions.findIndex(
            (t) =>
              t.timestamp === this.editingTransaction.timestamp &&
              t.coinId === this.editingTransaction.coinId
          );
          if (index !== -1) {
            updatedTransactions[index] = transaction;
          }
        } else {
          // Add new transaction
          updatedTransactions.push(transaction);
        }

        // Save updated transactions
        await chrome.storage.sync.set({ transactions: updatedTransactions });

        // Update holdings and recalculate values
        await this.updateHoldings();

        // Update selected coin data if we're in transaction history view
        if (this.showTransactionHistory && this.selectedCoin) {
          const updatedCoin = this.coins.find(
            (c) => c.id === this.selectedCoin.id
          );
          this.selectedCoin = updatedCoin;

          // Refresh transaction list
          const coinTransactions = updatedTransactions.filter(
            (t) => t.coinId === this.selectedCoin.id
          );
          this.coinTransactions = coinTransactions.sort(
            (a, b) => b.timestamp - a.timestamp
          );
        }

        // Reset editingTransaction state
        this.editingTransaction = null;
        
        this.closeTransactionModal();
      } catch (error) {
        console.error("Failed to save transaction:", error);
      }
    },

    async updateHoldings() {
      const { transactions = [] } = await chrome.storage.sync.get(
        "transactions"
      );

      // Calculate holdings and transactions for each coin
      const holdings = {};
      const coinTransactions = {};

      transactions.forEach((t) => {
        if (!holdings[t.coinId]) {
          holdings[t.coinId] = 0;
          coinTransactions[t.coinId] = [];
        }
        holdings[t.coinId] += t.type === "buy" ? t.amount : -t.amount;
        coinTransactions[t.coinId].push(t);
      });

      // Update coins with holdings and calculate PnL
      this.coins = this.coins.map((coin) => ({
        ...coin,
        holdings: holdings[coin.id] || 0,
        transactions: coinTransactions[coin.id] || [],
        pnl: this.calculatePnL({
          ...coin,
          holdings: holdings[coin.id] || 0,
          transactions: coinTransactions[coin.id] || [],
        }),
      }));
    },

    sortBy(key) {
      if (this.sortConfig.key === key) {
        this.sortConfig.direction =
          this.sortConfig.direction === "asc" ? "desc" : "asc";
      } else {
        this.sortConfig.key = key;
        this.sortConfig.direction = "asc";
      }
    },

    getSortIcon(key) {
      if (this.sortConfig.key !== key) return "↕️";
      return this.sortConfig.direction === "asc" ? "↑" : "↓";
    },

    async viewTransactions(coin) {
      this.selectedCoin = coin;
      const { transactions = [] } = await chrome.storage.sync.get(
        "transactions"
      );
      this.coinTransactions = transactions
        .filter((t) => t.coinId === coin.id)
        .sort((a, b) => b.timestamp - a.timestamp);
      this.showTransactionHistory = true;
    },

    closeTransactionHistory() {
      this.showTransactionHistory = false;
      this.selectedCoin = null;
      this.coinTransactions = [];
    },

    editTransaction(transaction) {
      this.editingTransaction = transaction;
      this.transaction = {
        type: transaction.type,
        amount: transaction.amount,
        price: transaction.price,
        date: new Date(transaction.timestamp)
          .toLocaleString("sv-SE")
          .slice(0, 16),
      };
      this.showTransactionModal = true;
    },

    async deleteTransaction(transaction) {
      if (confirm("Are you sure you want to delete this transaction?")) {
        try {
          const { transactions = [] } = await chrome.storage.sync.get(
            "transactions"
          );
          const updatedTransactions = transactions.filter(
            (t) =>
              t.timestamp !== transaction.timestamp ||
              t.coinId !== transaction.coinId
          );

          // Save updated transactions
          await chrome.storage.sync.set({ transactions: updatedTransactions });

          // Update holdings and recalculate values
          await this.updateHoldings();

          // Refresh the selected coin's data
          if (this.selectedCoin) {
            const updatedCoin = this.coins.find(
              (c) => c.id === this.selectedCoin.id
            );
            this.selectedCoin = updatedCoin;

            // Refresh transaction list
            const coinTransactions = updatedTransactions.filter(
              (t) => t.coinId === this.selectedCoin.id
            );
            this.coinTransactions = coinTransactions.sort(
              (a, b) => b.timestamp - a.timestamp
            );
          }
        } catch (error) {
          console.error("Failed to delete transaction:", error);
        }
      }
    },

    calculatePnL(coin) {
      if (!coin.holdings || !coin.transactions) return 0;

      let totalCost = 0;
      let totalCoins = 0;

      coin.transactions.forEach((tx) => {
        if (tx.type === "buy") {
          totalCost += tx.price * tx.amount;
          totalCoins += tx.amount;
        } else {
          totalCost -= tx.price * tx.amount;
          totalCoins -= tx.amount;
        }
      });

      const avgCost = totalCoins ? totalCost / totalCoins : 0;
      const currentValue = coin.price * coin.holdings;
      const initialValue = avgCost * coin.holdings;

      return currentValue - initialValue;
    },

    formatPnL(pnl) {
      if (!pnl) return "$0.00";
      return `${pnl >= 0 ? "+" : ""}$${Math.abs(pnl).toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;
    },

    getPnLClass(pnl) {
      if (!pnl) return "neutral";
      return pnl > 0 ? "profit" : "loss";
    },

    calculateTransactionPnL(transaction) {
      if (!this.selectedCoin || !transaction) return 0;

      const currentValue = this.selectedCoin.price * transaction.amount;
      const transactionValue = transaction.price * transaction.amount;

      return transaction.type === "buy"
        ? currentValue - transactionValue
        : transactionValue - currentValue;
    },

    formatPnLPercentage(pnl, cost) {
      if (!cost) return "0%";
      const percentage = (pnl / Math.abs(cost)) * 100;
      return `${percentage >= 0 ? "+" : ""}${percentage.toFixed(2)}%`;
    },

    calculateAveragePrice(coin) {
      if (!coin?.transactions || coin.transactions.length === 0) return 0;

      let totalCost = 0;
      let totalCoins = 0;

      coin.transactions.forEach((tx) => {
        if (tx.type === "buy") {
          totalCost += tx.price * tx.amount;
          totalCoins += tx.amount;
        } else {
          totalCost -= tx.price * tx.amount;
          totalCoins -= tx.amount;
        }
      });

      return totalCoins ? totalCost / totalCoins : 0;
    },
  },
  async mounted() {
    await this.loadPortfolio();
    await this.fetchCoins();
    await this.updateHoldings();
  },
};
</script>

<style scoped>
.app-container {
  background-color: #1e1e2f;
  color: #ffffff;
  padding: 15px;
  border-radius: 8px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  max-width: 900px;
  height: 555px;
  margin: 0 auto;
  overflow-y: auto;
}

.header {
  padding: 8px 12px;
  margin-bottom: 10px;
  background: linear-gradient(to right, #2a2a3b, #34344a);
  border-radius: 8px;
}

.header-content {
  padding: 8px;
}

.title-and-stats {
  display: flex;
  align-items: center;
  gap: 24px;
}

.title-and-stats h3 {
  margin: 0;
  font-size: 1.2rem;
  background: linear-gradient(45deg, #2ecc71, #3498db);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  font-weight: 700;
  white-space: nowrap;
}

.stats-group {
  display: flex;
  gap: 24px;
  align-items: center;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
}

.stat-label {
  color: #95a5a6;
  font-size: 0.9rem;
}

.stat-value {
  font-weight: 600;
  font-size: 0.9rem;
}

.search-container {
  display: flex;
  gap: 10px;
  margin-bottom: 10px;
}

.search-input,
.api-select,
.page-size-select {
  background-color: #2a2a3b;
  color: #ffffff;
  border: none;
  border-radius: 4px;
  padding: 10px;
}

.table-container {
  overflow-x: auto;
}

.table {
  width: 100%;
  margin-bottom: 20px;
  border-collapse: collapse;
}

.table th,
.table td {
  padding: 12px;
  text-align: center;
}

.table th {
  background-color: #2a2a3b;
}

.table-hover tbody tr:hover {
  background-color: #34344a;
}

/* Set specific widths for columns */
.table th:nth-child(1),
.table td:nth-child(1) {
  width: 15px; /* Portfolio column */
}

.table th:nth-child(2),
.table td:nth-child(2) {
  width: 60px; /* Rank & Icon column */
}

.table th:nth-child(3),
.table td:nth-child(3) {
  width: 100px; /* Symbol column (merged with Name) */
}

.table th:nth-child(4),
.table td:nth-child(4) {
  width: 130px; /* Price column */
}

.table th:nth-child(5),
.table td:nth-child(5) {
  width: 115px; /* 24h Change column */
}

.table th:nth-child(6),
.table td:nth-child(6) {
  width: 160px; /* Adjusted width for combined Value/PnL column */
}

.table th:nth-child(7),
.table td:nth-child(7) {
  width: 100px; /* Actions column */
}

.coin-icon {
  width: 24px;
  height: 24px;
  object-fit: contain; /* Ensure icon maintains aspect ratio */
}

.loading-spinner {
  text-align: center;
  padding: 20px;
}

.btn {
  padding: 5px 10px;
  font-size: 0.875rem;
  transition: background-color 0.3s;
}

.btn-success {
  background-color: #28a745;
}

.btn-outline-secondary {
  background-color: transparent;
  border: 1px solid #6c757d;
  color: #6c757d;
}

.btn-outline-secondary:hover {
  background-color: #6c757d;
  color: #ffffff;
}

.page-select {
  background-color: #2a2a3b;
  color: #ffffff;
  border: none;
  border-radius: 4px;
  padding: 10px;
}

.price-change-pill {
  border-radius: 4px;
  padding: 6px 14px;
  font-weight: 600;
  text-align: center;
  width: fit-content;
  transition: background-color 0.3s ease, color 0.3s ease;
}

.profit {
  /* background-color: rgba(46, 204, 113, 0.2); */
  color: #27ae60;
}

.loss {
  /* background-color: rgba(231, 76, 60, 0.2); */
  color: #c0392b;
}

.neutral {
  /* background-color: rgba(149, 165, 166, 0.2); */
  color: #7f8c8d;
}

.price-change-pill:hover {
  filter: brightness(1.2);
}

.portfolio-btn {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: none;
  font-size: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease-in-out;
}

.portfolio-btn-active {
  background-color: #2ecc71;
  color: white;
  box-shadow: 0 2px 4px rgba(46, 204, 113, 0.2);
}

.portfolio-btn-active:hover {
  background-color: #27ae60;
  transform: scale(1.05);
}

.portfolio-btn-inactive {
  background-color: transparent;
  color: #95a5a6;
  border: 2px solid #95a5a6;
}

.favorite-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1.2em;
  padding: 4px;
  transition: all 0.2s ease;
  opacity: 0.7;
}

.favorite-btn:hover {
  opacity: 1;
  transform: scale(1.1);
}

.favorite-active {
  color: #f1c40f; /* Yellow color for active star */
  text-shadow: 0 0 10px rgba(241, 196, 15, 0.5);
  opacity: 1;
}

.favorite-inactive {
  color: #95a5a6; /* Gray color for inactive star */
}

.portfolio-btn-inactive:hover {
  background-color: rgba(149, 165, 166, 0.1);
  color: white;
  border-color: white;
  transform: scale(1.05);
}

.coin-link {
  color: #ffffff;
  text-decoration: none;
  transition: color 0.2s ease-in-out;
}

.coin-link:hover {
  color: #2ecc71;
  text-decoration: underline;
}

.toggle-portfolio-btn {
  background-color: #2a2a3b;
  color: #ffffff;
  border: none;
  border-radius: 4px;
  padding: 10px 20px;
  cursor: pointer;
  margin-bottom: 20px;
  transition: background-color 0.3s ease;
}

.toggle-portfolio-btn:hover {
  background-color: #34344a;
}

.portfolio-container {
  background-color: #2a2a3b;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 20px;
}

.portfolio-container h2 {
  margin-bottom: 10px;
}

.portfolio-container ul {
  list-style-type: none;
  padding: 0;
}

.portfolio-container li {
  padding: 5px 0;
  border-bottom: 1px solid #34344a;
}

.rank-icon-cell {
  display: flex;
  align-items: center;
  gap: 8px;
  justify-content: center;
  height: 100%;
  padding: 8px 12px; /* Match padding with other cells */
  min-height: 40px; /* Set minimum height to match other cells */
}

.rank-number {
  color: #95a5a6;
  font-size: 0.9em;
  display: flex;
  align-items: center;
}

.footer {
  margin-top: 20px;
  padding: 15px;
  text-align: center;
  border-top: 1px solid #34344a;
}

.store-link {
  color: #95a5a6;
  text-decoration: none;
  font-size: 0.9em;
  transition: color 0.2s ease-in-out;
}

.store-link:hover {
  color: #2ecc71;
  text-decoration: underline;
}

.portfolio-link {
  text-decoration: none;
  font-size: 1.2em;
  cursor: pointer;
  transition: opacity 0.2s ease-in-out;
}

.portfolio-link:hover {
  opacity: 0.8;
}

.portfolio-trigger {
  cursor: pointer;
  user-select: none;
  opacity: 0.7;
}

.portfolio-trigger:hover {
  opacity: 1;
}

.action-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1.2em;
  padding: 4px;
  opacity: 0.7;
  transition: opacity 0.2s;
}

.action-btn:hover {
  opacity: 1;
}

.modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
}

.history-modal {
  z-index: 1000;
}

.edit-transaction-modal {
  z-index: 1001;
}

.modal-content {
  background: #2a2a3b;
  padding: 30px;
  border-radius: 12px;
  min-width: 560px;
  max-width: 800px;
  max-height: 500px;
  overflow-y: auto;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}

.form-group {
  margin-bottom: 15px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
}

.form-group input,
.form-group select {
  width: 100%;
  padding: 8px;
  background: #1e1e2f;
  border: 1px solid #34344a;
  border-radius: 4px;
  color: white;
}

.modal-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  margin-top: 20px;
}

.btn-primary,
.btn-secondary {
  padding: 8px 16px;
  border-radius: 4px;
  border: none;
  cursor: pointer;
}

.btn-primary {
  background: #2ecc71;
  color: white;
}

.btn-secondary {
  background: #95a5a6;
  color: white;
}

.sortable {
  cursor: pointer;
  user-select: none;
  position: relative;
  padding-right: 25px !important;
}

.sortable:hover {
  background-color: #34344a;
}

.sort-icon {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 0.8em;
  opacity: 0.7;
}

.sortable:hover .sort-icon {
  opacity: 1;
}

th {
  transition: background-color 0.2s ease;
}

.transaction-history {
  max-height: 80vh;
  overflow-y: auto;
}

.transaction-list {
  margin: 15px 0;
}

.transaction-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
  border-bottom: 1px solid #34344a;
}

.transaction-details {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.transaction-actions {
  display: flex;
  gap: 5px;
}

.action-buttons {
  display: flex;
  gap: 8px;
  justify-content: center;
}

.action-btn {
  background: #34344a; /* Darker background for better contrast */
  border: none;
  cursor: pointer;
  font-size: 1.1em;
  padding: 8px 12px;
  border-radius: 6px;
  transition: all 0.2s ease;
  color: #ffffff; /* White color for better visibility */
  opacity: 1; /* Full opacity by default */
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2); /* Subtle shadow for depth */
}

.action-btn:hover {
  background: #2ecc71; /* Green background on hover */
  color: #ffffff;
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(46, 204, 113, 0.3); /* Enhanced shadow on hover */
}

/* Optional: Add specific styles for each action button */
.action-btn[title="Add Transaction"] {
  background: #3498db; /* Blue background for add */
}

.action-btn[title="View Transactions"] {
  background: #9b59b6; /* Purple background for view */
}

.action-btn[title="Add Transaction"]:hover {
  background: #2980b9; /* Darker blue on hover */
}

.action-btn[title="View Transactions"]:hover {
  background: #8e44ad; /* Darker purple on hover */
}

.pnl-cell {
  font-weight: 600;
}

.transaction-type-toggle {
  display: flex;
  gap: 1px;
  background: #1e1e2f;
  padding: 2px;
  border-radius: 6px;
  margin-top: 5px;
}

.type-btn {
  flex: 1;
  padding: 8px 16px;
  border: none;
  background: transparent;
  color: #fff;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.type-btn.active {
  background: #2ecc71;
}

.type-btn:not(.active):hover {
  background: rgba(46, 204, 113, 0.1);
}

.enhanced-input {
  width: 100%;
  padding: 12px;
  background: #1e1e2f;
  border: 1px solid #34344a;
  border-radius: 6px;
  color: white;
  font-size: 1rem;
  transition: border-color 0.2s ease;
}

.enhanced-input:focus {
  border-color: #2ecc71;
  outline: none;
}

.input-with-preview {
  position: relative;
}

.preview-text {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: #95a5a6;
  font-size: 0.9em;
}

.transaction-preview {
  margin: 20px 0;
  padding: 15px;
  background: #1e1e2f;
  border-radius: 6px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.preview-label {
  color: #95a5a6;
}

.preview-value {
  font-weight: 600;
  font-size: 1.1em;
}

.modal-actions {
  margin-top: 30px;
}

.btn-primary,
.btn-secondary {
  padding: 12px 24px;
  font-size: 1rem;
  transition: transform 0.2s ease;
}

.btn-primary:hover,
.btn-secondary:hover {
  transform: translateY(-1px);
}

.transaction-summary {
  background: #1e1e2f;
  border-radius: 12px;
  padding: 20px;
  margin: 20px 0;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  border: 1px solid #34344a;
}

.summary-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.summary-label {
  color: #95a5a6;
  font-size: 0.9em;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.summary-value.highlight {
  font-size: 1.2em;
  font-weight: 600;
  color: #fff;
}

.transaction-item {
  background: #1e1e2f;
  border-radius: 10px;
  padding: 15px;
  margin-bottom: 10px;
  border: 1px solid #34344a;
  transition: all 0.2s ease;
}

.transaction-item:hover {
  border-color: #2ecc71;
  transform: translateX(5px);
}

.transaction-item.buy {
  border-left: 4px solid #2ecc71;
}

.transaction-item.sell {
  border-left: 4px solid #e74c3c;
}

.transaction-main {
  display: flex;
  align-items: center;
  gap: 15px;
  margin-bottom: 10px;
}

.transaction-type {
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 0.8em;
  font-weight: 600;
  text-transform: uppercase;
}

.transaction-type.buy {
  background: rgba(46, 204, 113, 0.1);
  color: #2ecc71;
}

.transaction-type.sell {
  background: rgba(231, 76, 60, 0.1);
  color: #e74c3c;
}

.transaction-amount.highlight {
  font-size: 1.1em;
  font-weight: 600;
  color: #fff;
}

.transaction-price {
  color: #95a5a6;
}

.transaction-secondary {
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: #95a5a6;
  font-size: 0.9em;
}

.transaction-value.highlight {
  font-weight: 600;
  color: #fff;
}

.transaction-pnl small {
  opacity: 0.8;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 1px solid #34344a;
}

.coin-header-icon {
  width: 24px;
  height: 24px;
  margin-right: 10px;
  vertical-align: middle;
}

.close-btn {
  background: none;
  border: none;
  color: #95a5a6;
  font-size: 24px;
  cursor: pointer;
  padding: 0 8px;
  transition: color 0.2s ease;
}

.close-btn:hover {
  color: #e74c3c;
}

.symbol-badge {
  background: rgba(149, 165, 166, 0.1);
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.8em;
  margin-left: 4px;
}

.transaction-badge {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
}

.transaction-badge.buy {
  background: rgba(46, 204, 113, 0.1);
  color: #2ecc71;
}

.transaction-badge.sell {
  background: rgba(231, 76, 60, 0.1);
  color: #e74c3c;
}

.transaction-metrics {
  display: flex;
  gap: 15px;
  align-items: center;
}

.action-btn {
  opacity: 0;
  transform: translateX(10px);
  transition: all 0.2s ease;
}

.transaction-item:hover .action-btn {
  opacity: 1;
  transform: translateX(0);
}

.action-btn.edit:hover {
  background: rgba(46, 204, 113, 0.1);
}

.action-btn.delete:hover {
  background: rgba(231, 76, 60, 0.1);
}

.date-icon {
  margin-right: 5px;
  opacity: 0.7;
}

/* Modal Styles */
.transaction-history-modal {
  max-width: 800px; /* Increased from 600px */
  width: 90%;
  max-height: 80vh;
  padding: 16px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 12px;
  border-bottom: 1px solid #34344a;
}

.coin-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.coin-header-icon {
  width: 24px;
  height: 24px;
}

.close-btn {
  background: none;
  border: none;
  color: #95a5a6;
  font-size: 24px;
  cursor: pointer;
  padding: 4px;
}

/* Summary Grid */
.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 8px;
  margin: 12px 0;
}

.summary-card {
  background: #1e1e2f;
  padding: 10px;
  border-radius: 6px;
  text-align: center;
}

.summary-label {
  font-size: 0.7rem;
  color: #95a5a6;
  text-transform: uppercase;
  margin-bottom: 4px;
}

.summary-value {
  font-size: 0.9rem;
  font-weight: 600;
}

/* Transaction List */
.transaction-list {
  max-height: 400px;
  overflow-y: auto;
  margin-top: 12px;
}

.tx-item {
  background: #1e1e2f;
  border-radius: 6px;
  padding: 8px 12px;
  margin-bottom: 8px;
  border-left: 3px solid transparent;
}

.tx-item.buy { border-left-color: #2ecc71; }
.tx-item.sell { border-left-color: #e74c3c; }

.tx-main {
  display: grid;
  grid-template-columns: auto 1fr auto auto auto;
  gap: 12px;
  align-items: center;
  font-size: 0.9rem;
}

.tx-type {
  display: flex;
  align-items: center;
  gap: 4px;
  font-weight: 600;
  text-transform: uppercase;
  font-size: 0.8rem;
}

.tx-icon {
  font-size: 0.9rem;
}

.buy .tx-icon { color: #2ecc71; }
.sell .tx-icon { color: #e74c3c; }

.tx-secondary {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 6px;
  padding-top: 6px;
  border-top: 1px solid #34344a;
  font-size: 0.8rem;
}

.tx-date {
  color: #95a5a6;
}

.tx-actions {
  display: flex;
  gap: 8px;
}

.action-mini {
  background: none;
  border: none;
  cursor: pointer;
  padding: 2px;
  opacity: 0.7;
  transition: opacity 0.2s;
}

.action-mini:hover {
  opacity: 1;
}

.symbol-badge {
  background: rgba(149, 165, 166, 0.1);
  padding: 2px 4px;
  border-radius: 4px;
  font-size: 0.75em;
  color: #95a5a6;
}

/* Scrollbar Styling */
.transaction-list::-webkit-scrollbar {
  width: 6px;
}

.transaction-list::-webkit-scrollbar-track {
  background: #1e1e2f;
}

.transaction-list::-webkit-scrollbar-thumb {
  background: #34344a;
  border-radius: 3px;
}

.transaction-list::-webkit-scrollbar-thumb:hover {
  background: #95a5a6;
}

.coin-row {
  position: relative;
}

.hover-actions {
  position: absolute;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  gap: 6px;
  opacity: 0;
  transition: all 0.3s ease;
  background: linear-gradient(to left, #2a2a3b 80%, transparent);
  padding: 8px 12px;
  padding-left: 30px;
  border-radius: 4px;
}

.coin-row:hover .hover-actions {
  opacity: 1;
  right: 10px; /* Slide in from right */
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  background: #34344a;
  border: none;
  cursor: pointer;
  padding: 6px 12px;
  border-radius: 6px;
  transition: all 0.2s ease;
  color: #ffffff;
  font-size: 0.9em;
  opacity: 0.9;
  transform: translateX(10px);
}

.coin-row:hover .action-btn {
  transform: translateX(0);
  opacity: 1;
}

.action-btn:hover {
  background: #2ecc71;
  transform: translateY(-1px) scale(1.05);
  box-shadow: 0 4px 8px rgba(46, 204, 113, 0.2);
}

.action-icon {
  font-size: 1.1em;
}

.action-text {
  font-size: 0.85em;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* Staggered animation for buttons */
.action-btn:nth-child(1) {
  transition-delay: 0.05s;
}

.action-btn:nth-child(2) {
  transition-delay: 0.1s;
}

/* Custom colors for different actions */
.action-btn[title="Add Transaction"] {
  background: #3498db;
}

.action-btn[title="View Transactions"] {
  background: #9b59b6;
}

.action-btn[title="Add Transaction"]:hover {
  background: #2980b9;
}

.action-btn[title="View Transactions"]:hover {
  background: #8e44ad;
}

/* Optional: Add tooltip on hover */
.action-btn::after {
  content: attr(title);
  position: absolute;
  bottom: -25px;
  left: 50%;
  transform: translateX(-50%);
  background: #34344a;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.75em;
  white-space: nowrap;
  opacity: 0;
  transition: opacity 0.2s ease;
  pointer-events: none;
}

.action-btn:hover::after {
  opacity: 1;
}

.value-pnl-cell {
  position: relative;
  text-align: center;
}

.value-pnl-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
  z-index: 1;
}

.value-text {
  font-weight: 500;
}

.pnl-text {
  font-size: 0.9em;
}

.hover-actions {
  position: absolute;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  gap: 6px;
  opacity: 0;
  transition: all 0.3s ease;
  background: linear-gradient(to left, #2a2a3b 80%, transparent);
  padding: 8px 12px;
  padding-left: 30px;
  border-radius: 4px;
  z-index: 2; /* Ensure actions appear above the value/pnl text */
}
</style>
