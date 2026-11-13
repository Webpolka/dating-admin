// app/page.tsx
import { redirect } from 'next/navigation';

export default function RootPage() {
  // Мгновенно кидаем на /dashboard
  redirect('/dashboard');
}