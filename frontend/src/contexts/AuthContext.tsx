import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { User, AuthResponse } from '../types';
import { apiService } from '../services/api';
import { websocketService } from '../services/websocket';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

type AuthAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'LOGIN_SUCCESS'; payload: AuthResponse }
  | { type: 'LOGOUT' }
  | { type: 'UPDATE_USER'; payload: User };

const initialState: AuthState = {
  user: null,
  token: null,
  isLoading: true,
  isAuthenticated: false,
};

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isLoading: false,
        isAuthenticated: true,
      };
    case 'LOGOUT':
      return {
        ...state,
        user: null,
        token: null,
        isLoading: false,
        isAuthenticated: false,
      };
    case 'UPDATE_USER':
      return {
        ...state,
        user: action.payload,
      };
    default:
      return state;
  }
}

interface AuthContextType {
  state: AuthState;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string, walletAddress?: string) => Promise<void>;
  logout: () => void;
  updateProfile: (data: { name?: string; walletAddress?: string }) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  walletLogin: (walletAddress: string, walletType?: string) => Promise<void>;
  registerWithWallet: (walletAddress: string, walletType: string, email: string, name: string, password?: string) => Promise<void>;
  disconnectWallet: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  useEffect(() => {
    // Check for existing auth on app load
    const initAuth = async () => {
      const token = localStorage.getItem('token');
      const userStr = localStorage.getItem('user');

      if (token && userStr) {
        try {
          const user = JSON.parse(userStr);
          dispatch({ type: 'LOGIN_SUCCESS', payload: { user, token } });
          
          // Connect WebSocket
          websocketService.connect(token);
          
          // Verify token is still valid by fetching profile
          const updatedUser = await apiService.getProfile();
          dispatch({ type: 'UPDATE_USER', payload: updatedUser });
        } catch (error) {
          console.error('Auth initialization error:', error);
          logout();
        }
      } else {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string): Promise<void> => {
    dispatch({ type: 'SET_LOADING', payload: true });
    
    try {
      const authResponse = await apiService.login(email, password);
      
      // Store in localStorage
      localStorage.setItem('token', authResponse.token);
      localStorage.setItem('user', JSON.stringify(authResponse.user));
      
      dispatch({ type: 'LOGIN_SUCCESS', payload: authResponse });
      
      // Connect WebSocket
      websocketService.connect(authResponse.token);
    } catch (error) {
      dispatch({ type: 'SET_LOADING', payload: false });
      throw error;
    }
  };

  const register = async (
    email: string,
    password: string,
    name?: string,
    walletAddress?: string
  ): Promise<void> => {
    dispatch({ type: 'SET_LOADING', payload: true });
    
    try {
      const authResponse = await apiService.register(email, password, name, walletAddress);
      
      // Store in localStorage
      localStorage.setItem('token', authResponse.token);
      localStorage.setItem('user', JSON.stringify(authResponse.user));
      
      dispatch({ type: 'LOGIN_SUCCESS', payload: authResponse });
      
      // Connect WebSocket
      websocketService.connect(authResponse.token);
    } catch (error) {
      dispatch({ type: 'SET_LOADING', payload: false });
      throw error;
    }
  };

  const logout = (): void => {
    // Disconnect WebSocket
    websocketService.disconnect();
    
    // Clear localStorage
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    dispatch({ type: 'LOGOUT' });
  };

  const updateProfile = async (data: { name?: string; walletAddress?: string }): Promise<void> => {
    try {
      const updatedUser = await apiService.updateProfile(data);
      
      // Update localStorage
      localStorage.setItem('user', JSON.stringify(updatedUser));
      
      dispatch({ type: 'UPDATE_USER', payload: updatedUser });
    } catch (error) {
      throw error;
    }
  };

  const changePassword = async (currentPassword: string, newPassword: string): Promise<void> => {
    try {
      await apiService.changePassword(currentPassword, newPassword);
    } catch (error) {
      throw error;
    }
  };

  const walletLogin = async (walletAddress: string, walletType?: string): Promise<void> => {
    dispatch({ type: 'SET_LOADING', payload: true });
    
    try {
      const authResponse = await apiService.walletLogin(walletAddress, walletType);
      
      // Store in localStorage
      localStorage.setItem('token', authResponse.token);
      localStorage.setItem('user', JSON.stringify(authResponse.user));
      
      dispatch({ type: 'LOGIN_SUCCESS', payload: authResponse });
      
      // Connect WebSocket
      websocketService.connect(authResponse.token);
    } catch (error) {
      dispatch({ type: 'SET_LOADING', payload: false });
      throw error;
    }
  };

  const registerWithWallet = async (
    walletAddress: string,
    walletType: string,
    email: string,
    name: string,
    password?: string
  ): Promise<void> => {
    dispatch({ type: 'SET_LOADING', payload: true });
    
    try {
      const authResponse = await apiService.registerWithWallet(
        walletAddress,
        walletType,
        email,
        name,
        password
      );
      
      // Store in localStorage
      localStorage.setItem('token', authResponse.token);
      localStorage.setItem('user', JSON.stringify(authResponse.user));
      
      dispatch({ type: 'LOGIN_SUCCESS', payload: authResponse });
      
      // Connect WebSocket
      websocketService.connect(authResponse.token);
    } catch (error) {
      dispatch({ type: 'SET_LOADING', payload: false });
      throw error;
    }
  };

  const disconnectWallet = async (): Promise<void> => {
    try {
      await apiService.disconnectWallet();
      
      // Update user profile
      const updatedUser = await apiService.getProfile();
      localStorage.setItem('user', JSON.stringify(updatedUser));
      dispatch({ type: 'UPDATE_USER', payload: updatedUser });
    } catch (error) {
      throw error;
    }
  };

  const contextValue: AuthContextType = {
    state,
    login,
    register,
    logout,
    updateProfile,
    changePassword,
    walletLogin,
    registerWithWallet,
    disconnectWallet,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};