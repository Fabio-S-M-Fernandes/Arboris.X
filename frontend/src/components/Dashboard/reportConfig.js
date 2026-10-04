export const REPORT_TYPES = [
  { value: 'executivo', label: 'Executivo', description: 'Resumo para gestão e tomada de decisão.' },
  { value: 'operacional', label: 'Operacional', description: 'Detalhamento da rede e das leituras.' },
];

export const REPORT_PERIODS = [
  { value: '24h', label: '24 horas' },
  { value: '7d', label: '7 dias' },
  { value: '30d', label: '30 dias' },
];

export const REPORT_INDICATORS = [
  { value: 'temperature', label: 'Temperatura', description: 'Leitura ambiental atual.' },
  { value: 'humidity', label: 'Umidade', description: 'Umidade do ar registrada.' },
  { value: 'sensors', label: 'Sensores', description: 'Estado e quantidade da rede.' },
  { value: 'alerts', label: 'Alertas', description: 'Ocorrências retornadas pela API.' },
  { value: 'trend', label: 'Tendência ambiental', description: 'Série histórica disponível.' },
  { value: 'regional', label: 'Desempenho por região', description: 'Comparação entre regiões monitoradas.' },
  { value: 'reduction', label: 'Redução térmica', description: 'Indicador fornecido no resumo da API.' },
];

export const getDefaultIndicators = (type) => (type === 'operacional'
  ? ['temperature', 'humidity', 'sensors', 'alerts', 'trend']
  : ['temperature', 'humidity', 'sensors', 'reduction', 'alerts', 'trend', 'regional']);

export const getReportPeriodLabel = (period) => REPORT_PERIODS.find((item) => item.value === period)?.label || 'Período não disponível';
