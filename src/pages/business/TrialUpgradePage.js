import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { shouldApplyTrialModuleLock, TRIAL_UPGRADE_MESSAGE } from '../../shared-core/trialAccess';
import { Button } from '../../components/ui/button';

const ROLE_HOMES = {
  super_admin: '/super-admin',
  business_owner: '/dashboard',
  hr_admin: '/hr',
  finance_admin: '/finance',
  inventory_admin: '/inventory',
  ca_admin: '/ca',
  staff: '/staff',
};

export default function TrialUpgradePage() {
  const { user, business } = useAuth();
  const navigate = useNavigate();
  const role = user?.role;

  useEffect(() => {
    if (!shouldApplyTrialModuleLock(business, role)) {
      const home = ROLE_HOMES[role] || '/dashboard';
      navigate(home, { replace: true });
    }
  }, [business, role, navigate]);

  if (!shouldApplyTrialModuleLock(business, role)) {
    return (
      <DashboardLayout>
        <div className="flex justify-center p-12 text-gray-500 text-sm">Redirecting…</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-lg mx-auto glass-card rounded-2xl p-8 space-y-4">
        <h1 className="font-display text-xl text-white">Upgrade required</h1>
        <p className="text-sm text-gray-400 leading-relaxed">{TRIAL_UPGRADE_MESSAGE}</p>
        <Button variant="outline" className="border-gold-500/40 text-gold-400" onClick={() => navigate('/dashboard/settings')}>
          Business settings
        </Button>
      </div>
    </DashboardLayout>
  );
}
