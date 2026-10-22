# TH3 — Ikon berukuran piksel yang tersisa di halaman admin

Tugas T-H3 (G19): ikon `Fi*`/`Tb*`/`Lu*` ber-`size={angka}` tidak ikut skala teks (cookie `mk-text-size`).
Diperbaiki hanya di berkas yang dirender di area `/app` (`AppFrame`, `UserMenu`, `ThemeToggle`, `account/HoldShell`,
`routes/app/**`); dijaga `tests/ui/icon-scale.test.ts`. Berkas di bawah sengaja **tidak diubah** (di luar scope,
area `/dev` dan `/dashboard` yang primary desktop) dan dicatat sebagai hutang. Hitungan = jumlah tag ikon dengan
`size={angka}`; `size` Avatar/kontrol Mantine tidak dihitung.

| Berkas | Jumlah |
|---|---|
| `app/components/users/UserDetailDrawer.tsx` | 10 |
| `app/components/users/UserActionsMenu.tsx` | 9 |
| `app/components/api-keys/ApiKeyDetailDrawer.tsx` | 8 |
| `app/components/api-keys/ApiKeyTable.tsx` | 7 |
| `app/components/logs/LogPageHeader.tsx` | 5 |
| `app/components/landing/QuickStartCta.tsx` | 5 |
| `app/components/errors/ErrorPanel.tsx` | 5 |
| `app/routes/waiting.tsx` | 4 |
| `app/routes/super/posts.tsx` | 4 |
| `app/routes/super/file-health.tsx` | 4 |
| `app/routes/super/audit.tsx` | 4 |
| `app/routes/banned.tsx` | 4 |
| `app/components/users/PendingApprovalList.tsx` | 4 |
| `app/components/profile/ApiKeysCard.tsx` | 4 |
| `app/components/login/LoginNotices.tsx` | 4 |
| `app/components/frame/BrandHeader.tsx` | 4 |
| `app/routes/super/sessions.tsx` | 3 |
| `app/routes/super/server-logs.tsx` | 3 |
| `app/routes/super/rate-limit-logs.tsx` | 3 |
| `app/routes/super/changelog.tsx` | 3 |
| `app/routes/super/api-keys.tsx` | 3 |
| `app/components/visits/VisitFilters.tsx` | 3 |
| `app/components/users/InvitationPanel.tsx` | 3 |
| `app/components/profile/LinkedAccountsCard.tsx` | 3 |
| `app/components/landing/LandingHeader.tsx` | 3 |
| `app/components/landing/Hero.tsx` | 3 |
| `app/components/api-keys/UsageLogSection.tsx` | 3 |
| `app/components/api-keys/ApiKeyUsagePanel.tsx` | 3 |
| `app/routes/super/visits.tsx` | 2 |
| `app/routes/super/settings.tsx` | 2 |
| `app/routes/super/overview.tsx` | 2 |
| `app/routes/super/login-logs.tsx` | 2 |
| `app/routes/super/db-schema.tsx` | 2 |
| `app/components/visits/VisitTable.tsx` | 2 |
| `app/components/visits/VisitDetailDrawer.tsx` | 2 |
| `app/components/users/UserFilters.tsx` | 2 |
| `app/components/users/UserDirectory.tsx` | 2 |
| `app/components/tools/McpCard.tsx` | 2 |
| `app/components/settings/RateLimitSettingsCard.tsx` | 2 |
| `app/components/settings/FeatureFlagsCard.tsx` | 2 |
| `app/components/settings/AuthSettingsCard.tsx` | 2 |
| `app/components/sessions/SessionTable.tsx` | 2 |
| `app/components/server-logs/ServerLogList.tsx` | 2 |
| `app/components/rate-limit-logs/RateLimitTable.tsx` | 2 |
| `app/components/rate-limit-logs/RateLimitFilters.tsx` | 2 |
| `app/components/rate-limit-logs/RateLimitDetailDrawer.tsx` | 2 |
| `app/components/profile/ProfileHeader.tsx` | 2 |
| `app/components/posts/PostTable.tsx` | 2 |
| `app/components/login-logs/LoginTable.tsx` | 2 |
| `app/components/login-logs/LoginFilters.tsx` | 2 |
| `app/components/login-logs/LoginDetailDrawer.tsx` | 2 |
| `app/components/frame/ProxySetupBanner.tsx` | 2 |
| `app/components/file-health/FileHealthHazards.tsx` | 2 |
| `app/components/file-health/FileHealthFilters.tsx` | 2 |
| `app/components/db-schema/SchemaToolbar.tsx` | 2 |
| `app/components/changelog/ChangelogTimeline.tsx` | 2 |
| `app/components/audit/AuditFilters.tsx` | 2 |
| `app/components/api-keys/RevealKeyModal.tsx` | 2 |
| `app/routes/admin/dashboard.tsx` | 1 |
| `app/components/visits/VisitEmptyState.tsx` | 1 |
| `app/components/visits/VisitCardList.tsx` | 1 |
| `app/components/users/UserCells.tsx` | 1 |
| `app/components/users/InviteForm.tsx` | 1 |
| `app/components/settings/RetentionCard.tsx` | 1 |
| `app/components/settings/MaintenanceCard.tsx` | 1 |
| `app/components/server-logs/ServerLogFilterBar.tsx` | 1 |
| `app/components/rate-limit-logs/RateLimitCardList.tsx` | 1 |
| `app/components/profile/SessionsCard.tsx` | 1 |
| `app/components/profile/PasswordCard.tsx` | 1 |
| `app/components/profile/DangerZoneCard.tsx` | 1 |
| `app/components/logs/SelectionBar.tsx` | 1 |
| `app/components/logs/DetailParts.tsx` | 1 |
| `app/components/login-logs/LoginCardList.tsx` | 1 |
| `app/components/errors/ErrorPage.tsx` | 1 |
| `app/components/audit/AuditTable.tsx` | 1 |
| `app/components/api-keys/ApiKeyFormModal.tsx` | 1 |
| `app/components/api-keys/ApiKeyFilterBar.tsx` | 1 |
| **Total** | **200** |
