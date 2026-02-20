import AdminDashboardClient from './admin-dashboard-client';

export const metadata = {
  title: 'Admin Dashboard',
  description: 'Manage grades, subjects, units, microskills and questions.',
  alternates: {
    canonical: '/admin',
  },
};

export default function AdminPage() {
  return <AdminDashboardClient />;
}

