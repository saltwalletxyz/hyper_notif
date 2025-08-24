import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { ethers } from 'ethers';

interface WalletState {
  isConnected: boolean;
  address: string | null;
  walletType: string | null;
  chainId: number | null;
  isConnecting: boolean;
  error: string | null;
  balance: string | null;
}

type WalletAction =
  | { type: 'SET_CONNECTING'; payload: boolean }
  | { type: 'SET_CONNECTED'; payload: { address: string; walletType: string; chainId: number } }
  | { type: 'SET_DISCONNECTED' }
  | { type: 'SET_ERROR'; payload: string }
  | { type: 'SET_BALANCE'; payload: string }
  | { type: 'CLEAR_ERROR' };

const initialState: WalletState = {
  isConnected: false,
  address: null,
  walletType: null,
  chainId: null,
  isConnecting: false,
  error: null,
  balance: null,
};

function walletReducer(state: WalletState, action: WalletAction): WalletState {
  switch (action.type) {
    case 'SET_CONNECTING':
      return { ...state, isConnecting: action.payload, error: null };
    case 'SET_CONNECTED':
      return {
        ...state,
        isConnected: true,
        address: action.payload.address,
        walletType: action.payload.walletType,
        chainId: action.payload.chainId,
        isConnecting: false,
        error: null,
      };
    case 'SET_DISCONNECTED':
      return {
        ...initialState,
        isConnecting: false,
      };
    case 'SET_ERROR':
      return { ...state, error: action.payload, isConnecting: false };
    case 'SET_BALANCE':
      return { ...state, balance: action.payload };
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    default:
      return state;
  }
}

interface WalletContextType {
  state: WalletState;
  connectWallet: (address: string, walletType: string, chainId: number) => void;
  disconnectWallet: () => void;
  clearError: () => void;
  refreshBalance: () => Promise<void>;
  switchNetwork: (chainId: number) => Promise<void>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
};

interface WalletProviderProps {
  children: ReactNode;
}

export const WalletProvider: React.FC<WalletProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(walletReducer, initialState);

  // Connect wallet function
  const connectWallet = (address: string, walletType: string, chainId: number) => {
    const normalizedAddress = address.toLowerCase();
    dispatch({
      type: 'SET_CONNECTED',
      payload: { address: normalizedAddress, walletType, chainId },
    });

    // Store in localStorage for persistence
    localStorage.setItem('wallet', JSON.stringify({
      address: normalizedAddress,
      walletType,
      chainId,
    }));

    // Refresh balance after connection
    refreshBalance();
  };

  // Disconnect wallet function
  const disconnectWallet = () => {
    dispatch({ type: 'SET_DISCONNECTED' });
    localStorage.removeItem('wallet');
  };

  // Clear error function
  const clearError = () => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  // Refresh balance function
  const refreshBalance = async () => {
    if (!state.address || !window.ethereum) return;

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const balance = await provider.getBalance(state.address);
      const formattedBalance = ethers.formatEther(balance);
      dispatch({ type: 'SET_BALANCE', payload: formattedBalance });
    } catch (error) {
      console.error('Failed to fetch balance:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to fetch wallet balance' });
    }
  };

  // Switch network function
  const switchNetwork = async (targetChainId: number) => {
    if (!window.ethereum) {
      dispatch({ type: 'SET_ERROR', payload: 'No wallet provider found' });
      return;
    }

    try {
      dispatch({ type: 'SET_CONNECTING', payload: true });
      
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${targetChainId.toString(16)}` }],
      });
    } catch (error: any) {
      if (error.code === 4902) {
        // Network not added to wallet
        dispatch({ type: 'SET_ERROR', payload: 'Please add this network to your wallet first' });
      } else {
        dispatch({ type: 'SET_ERROR', payload: 'Failed to switch network' });
      }
    } finally {
      dispatch({ type: 'SET_CONNECTING', payload: false });
    }
  };

  // Check for existing wallet connection on load
  useEffect(() => {
    const checkExistingConnection = async () => {
      try {
        const savedWallet = localStorage.getItem('wallet');
        if (!savedWallet || !window.ethereum) return;

        const { address, walletType, chainId } = JSON.parse(savedWallet);
        
        // Verify the wallet is still connected
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.includes(address)) {
          connectWallet(address, walletType, chainId);
        } else {
          // Wallet was disconnected, clear saved data
          localStorage.removeItem('wallet');
        }
      } catch (error) {
        console.error('Failed to check existing wallet connection:', error);
        localStorage.removeItem('wallet');
      }
    };

    checkExistingConnection();
  }, []);

  // Handle account changes
  useEffect(() => {
    if (!window.ethereum) return;

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        disconnectWallet();
      } else if (state.address && accounts[0].toLowerCase() !== state.address) {
        // Account changed
        const savedWallet = localStorage.getItem('wallet');
        if (savedWallet) {
          const { walletType, chainId } = JSON.parse(savedWallet);
          connectWallet(accounts[0], walletType, chainId);
        }
      }
    };

    const handleChainChanged = (chainId: string) => {
      const newChainId = parseInt(chainId, 16);
      if (state.isConnected && state.chainId !== newChainId) {
        const savedWallet = localStorage.getItem('wallet');
        if (savedWallet) {
          const { address, walletType } = JSON.parse(savedWallet);
          connectWallet(address, walletType, newChainId);
        }
      }
    };

    const handleDisconnect = () => {
      disconnectWallet();
    };

    window.ethereum.on('accountsChanged', handleAccountsChanged);
    window.ethereum.on('chainChanged', handleChainChanged);
    window.ethereum.on('disconnect', handleDisconnect);

    return () => {
      window.ethereum?.removeListener('accountsChanged', handleAccountsChanged);
      window.ethereum?.removeListener('chainChanged', handleChainChanged);
      window.ethereum?.removeListener('disconnect', handleDisconnect);
    };
  }, [state.address, state.chainId, state.isConnected]);

  // Refresh balance periodically
  useEffect(() => {
    if (!state.isConnected) return;

    const interval = setInterval(refreshBalance, 30000); // Every 30 seconds
    return () => clearInterval(interval);
  }, [state.isConnected, state.address]);

  const contextValue: WalletContextType = {
    state,
    connectWallet,
    disconnectWallet,
    clearError,
    refreshBalance,
    switchNetwork,
  };

  return (
    <WalletContext.Provider value={contextValue}>
      {children}
    </WalletContext.Provider>
  );
};