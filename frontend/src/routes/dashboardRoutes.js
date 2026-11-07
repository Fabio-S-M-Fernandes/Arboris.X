export const DASHBOARD_ROUTES = [
  {
    path: '/dashboard',
    id: 'overview',
    group: 'Painel',
    section: 'Visão geral',
    navLabel: 'Visão geral',
    title: 'Painel de controle',
    breadcrumb: [{ label: 'Visão geral', path: '/dashboard' }],
  },
  {
    path: '/dashboard/operacoes',
    id: 'operations-index',
    group: 'Operações',
    section: 'Operações',
    title: 'Operações',
    breadcrumb: [{ label: 'Operações', path: '/dashboard/operacoes' }],
  },
  {
    path: '/dashboard/operacoes/locais',
    id: 'locations',
    group: 'Operações',
    section: 'Operações',
    navLabel: 'Locais',
    operationView: 'Locais',
    title: 'Locais',
    breadcrumb: [
      { label: 'Operações', path: '/dashboard/operacoes' },
      { label: 'Locais', path: '/dashboard/operacoes/locais' },
    ],
  },
  {
    path: '/dashboard/operacoes/ambientes',
    id: 'environments',
    group: 'Operações',
    section: 'Operações',
    navLabel: 'Ambientes',
    operationView: 'Ambientes',
    title: 'Ambientes',
    breadcrumb: [
      { label: 'Operações', path: '/dashboard/operacoes' },
      { label: 'Ambientes', path: '/dashboard/operacoes/ambientes' },
    ],
  },
  {
    path: '/dashboard/operacoes/intervencoes',
    id: 'interventions',
    group: 'Operações',
    section: 'Operações',
    navLabel: 'Intervenções',
    operationView: 'Intervenções',
    title: 'Intervenções',
    breadcrumb: [
      { label: 'Operações', path: '/dashboard/operacoes' },
      { label: 'Intervenções', path: '/dashboard/operacoes/intervencoes' },
    ],
  },
  {
    path: '/dashboard/sensores',
    id: 'sensors',
    group: 'Monitoramento',
    section: 'Monitoramento',
    navLabel: 'Sensores',
    title: 'Sensores ambientais',
    breadcrumb: [
      { label: 'Monitoramento', path: '/dashboard/sensores' },
      { label: 'Sensores', path: '/dashboard/sensores' },
    ],
  },
  {
    path: '/dashboard/mapa-calor',
    id: 'heatmap',
    group: 'Monitoramento',
    section: 'Monitoramento',
    navLabel: 'Mapa de calor',
    title: 'Mapa de calor urbano',
    breadcrumb: [
      { label: 'Monitoramento', path: '/dashboard/mapa-calor' },
      { label: 'Mapa de calor', path: '/dashboard/mapa-calor' },
    ],
  },
  {
    path: '/dashboard/alertas',
    id: 'alerts',
    group: 'Monitoramento',
    section: 'Monitoramento',
    navLabel: 'Alertas',
    title: 'Central de alertas',
    breadcrumb: [
      { label: 'Monitoramento', path: '/dashboard/alertas' },
      { label: 'Alertas', path: '/dashboard/alertas' },
    ],
  },
  {
    path: '/dashboard/impacto',
    id: 'impact',
    group: 'Inteligência',
    section: 'Inteligência',
    navLabel: 'Impacto',
    title: 'Impacto ambiental',
    breadcrumb: [
      { label: 'Inteligência', path: '/dashboard/impacto' },
      { label: 'Impacto', path: '/dashboard/impacto' },
    ],
  },
  {
    path: '/dashboard/relatorios',
    id: 'reports',
    group: 'Inteligência',
    section: 'Inteligência',
    navLabel: 'Relatórios',
    title: 'Relatórios',
    breadcrumb: [
      { label: 'Inteligência', path: '/dashboard/relatorios' },
      { label: 'Relatórios', path: '/dashboard/relatorios' },
    ],
  },
  {
    path: '/dashboard/administracao',
    id: 'administration',
    group: 'Sistema',
    section: 'Sistema',
    navLabel: 'Administração',
    title: 'Administração',
    breadcrumb: [
      { label: 'Sistema', path: '/dashboard/administracao' },
      { label: 'Administração', path: '/dashboard/administracao' },
    ],
  },
];

const routesByPath = new Map(DASHBOARD_ROUTES.map((route) => [route.path, route]));
const routesByNavLabel = new Map(DASHBOARD_ROUTES.filter((route) => route.navLabel).map((route) => [route.navLabel, route]));

export function getDashboardRoute(pathname) {
  return routesByPath.get(pathname) || null;
}

export function getDashboardRouteByNavLabel(label) {
  return routesByNavLabel.get(label) || null;
}
