import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LoginPage as LoginPageComponent } from '../components/auth/login-page';
import { useAuthStore } from '../stores/auth-store';
import { ROUTES } from '../config/routes';

export function LoginPage() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate(ROUTES.INBOX, { replace: true });
    }
  }, [isAuthenticated, navigate]);

  return <LoginPageComponent />;
}
