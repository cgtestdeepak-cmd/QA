
import React, { useState } from 'react';
import { User } from '../types';
import { EyeIcon, EyeOffIcon } from './icons';

interface AuthProps {
  onLogin: (user: User) => void;
}

const STORAGE_KEY = 'qa_assistant_users';

export const Auth: React.FC<AuthProps> = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail || !password) {
      setError('Email and password are required.');
      return;
    }
    // Basic email validation
    if (!/\S+@\S+\.\S+/.test(normalizedEmail)) {
        setError('Please enter a valid email address.');
        return;
    }


    try {
      const storedUsers = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');

      if (isLogin) {
        // Handle Login
        const user = storedUsers.find((u: any) => u.email === normalizedEmail);
        if (user && user.password === password) {
          onLogin({ email: user.email });
        } else {
          setError('Invalid email or password.');
        }
      } else {
        // Handle Sign Up
        const userExists = storedUsers.some((u: any) => u.email === normalizedEmail);
        if (userExists) {
          setError('An account with this email already exists.');
        } else {
          const newUser = { email: normalizedEmail, password };
          localStorage.setItem(STORAGE_KEY, JSON.stringify([...storedUsers, newUser]));
          onLogin({ email: normalizedEmail });
        }
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
      console.error('Auth error:', err);
    }
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center bg-bkg-light dark:bg-bkg-dark p-4 transition-colors duration-300"
    >
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
            <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-primary to-primary-light bg-clip-text text-transparent">
              QA Assistant
            </h1>
            <p className="mt-2 text-text-light-secondary dark:text-text-dark-secondary">
                {isLogin ? 'Welcome back!' : 'Create your account'}
            </p>
        </div>
        
        <div className="bg-content-light/80 dark:bg-content-dark/80 backdrop-blur-sm p-8 rounded-2xl shadow-2xl border border-border-light dark:border-border-dark">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary">
                Email address
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2 bg-bkg-light dark:bg-bkg-dark border border-border-light dark:border-border-dark rounded-md focus:ring-2 focus:ring-primary focus:outline-none text-text-light-primary dark:text-text-dark-primary placeholder-text-light-secondary dark:placeholder-text-dark-secondary"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password"  className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary">
                Password
              </label>
              <div className="mt-1 relative">
                <input
                  id="password"
                  name="password"
                  type={isPasswordVisible ? 'text' : 'password'}
                  autoComplete={isLogin ? "current-password" : "new-password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2 pr-10 bg-bkg-light dark:bg-bkg-dark border border-border-light dark:border-border-dark rounded-md focus:ring-2 focus:ring-primary focus:outline-none text-text-light-primary dark:text-text-dark-primary placeholder-text-light-secondary dark:placeholder-text-dark-secondary"
                />
                <button
                  type="button"
                  onClick={() => setIsPasswordVisible(!isPasswordVisible)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-text-light-secondary dark:text-text-dark-secondary"
                  aria-label={isPasswordVisible ? 'Hide password' : 'Show password'}
                >
                  {isPasswordVisible ? <EyeOffIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                </button>
              </div>
            </div>
            
            {error && <p className="text-sm text-danger text-center">{error}</p>}

            <div>
              <button
                type="submit"
                className="w-full flex justify-center py-3 px-4 bg-gradient-to-r from-primary to-primary-light text-white font-semibold rounded-lg shadow-md hover:shadow-lg hover:shadow-primary/40 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all duration-300 transform hover:scale-105"
              >
                {isLogin ? 'Log In' : 'Sign Up'}
              </button>
            </div>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
              {isLogin ? "Don't have an account?" : 'Already have an account?'}
              <button onClick={() => { setIsLogin(!isLogin); setError(''); }} className="font-medium text-primary hover:text-primary-dark ml-1">
                {isLogin ? 'Sign up' : 'Log in'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};