import { createPinia } from 'pinia';
import { createApp } from 'vue';
import './index.css';

import App from './App.vue';
import router from './router';

import SolanaWallets from 'solana-wallets-vue';
import 'solana-wallets-vue/styles.css';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-phantom';
import { SolflareWalletAdapter } from '@solana/wallet-adapter-solflare';
import { CoinbaseWalletAdapter } from '@solana/wallet-adapter-coinbase';

const walletOptions = {
  wallets: [
    new PhantomWalletAdapter(),
    new SolflareWalletAdapter(),
    new CoinbaseWalletAdapter(),
  ],
  autoConnect: true,
};

const app = createApp(App);

app.use(createPinia());
app.use(router);
app.use(SolanaWallets, walletOptions);

app.mount('#app');
