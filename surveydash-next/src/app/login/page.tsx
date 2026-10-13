import { LoginForm } from '@/components/login-form';
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ mode?: string }> }) {
  return <LoginForm initialRegister={(await searchParams).mode === 'signup'} />;
}
