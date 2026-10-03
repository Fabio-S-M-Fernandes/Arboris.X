const sensores = [
  { id: 'ARB-042', local: 'Praça das Palmeiras', regiao: 'Centro', temperatura: 24.8, umidade: 68, bateria: 92, estado: 'Estável', atualizacao: 'há 2 min' },
  { id: 'ARB-017', local: 'Avenida Central', regiao: 'Setor Norte', temperatura: 26.1, umidade: 61, bateria: 74, estado: 'Estável', atualizacao: 'há 3 min' },
  { id: 'ARB-031', local: 'Jardim Comunitário', regiao: 'Parque Central', temperatura: 23.4, umidade: 72, bateria: 88, estado: 'Estável', atualizacao: 'há 4 min' },
  { id: 'ARB-058', local: 'Rua das Acácias', regiao: 'Setor Leste', temperatura: 29.2, umidade: 54, bateria: 28, estado: 'Atenção', atualizacao: 'há 5 min' },
  { id: 'ARB-063', local: 'Praça do Ipê', regiao: 'Centro', temperatura: 27.3, umidade: 59, bateria: 83, estado: 'Estável', atualizacao: 'há 6 min' },
  { id: 'ARB-074', local: 'Bosque da Serra', regiao: 'Setor Norte', temperatura: 25.7, umidade: 66, bateria: 19, estado: 'Atenção', atualizacao: 'há 8 min' },
  { id: 'ARB-086', local: 'Parque das Águas', regiao: 'Parque Central', temperatura: 22.9, umidade: 77, bateria: 96, estado: 'Estável', atualizacao: 'há 9 min' },
  { id: 'ARB-093', local: 'Alameda das Flores', regiao: 'Setor Leste', temperatura: 28.1, umidade: 57, bateria: 67, estado: 'Estável', atualizacao: 'há 12 min' },
];

const tendencias = {
  '24h': {
    rotulo: 'Últimas 24 horas',
    horarios: ['00h', '04h', '08h', '12h', '16h', '20h', 'Agora'],
    temperatura: [22.4, 21.8, 24.1, 28.6, 30.2, 27.4, 25.8],
    umidade: [78, 81, 72, 61, 56, 64, 69],
  },
  '7d': {
    rotulo: 'Últimos 7 dias',
    horarios: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'],
    temperatura: [27.1, 26.4, 28.2, 29.4, 30.1, 27.8, 25.8],
    umidade: [66, 69, 62, 58, 55, 64, 69],
  },
  '30d': {
    rotulo: 'Últimos 30 dias',
    horarios: ['01', '05', '10', '15', '20', '25', '30'],
    temperatura: [29.4, 28.8, 30.2, 29.1, 27.7, 26.9, 25.8],
    umidade: [59, 62, 56, 58, 63, 67, 69],
  },
};

const alertas = [
  { id: 'a1', tipo: 'Atenção', titulo: 'Bateria baixa', descricao: 'ARB-074 · Bosque da Serra', horario: 'há 8 min', naoLido: true },
  { id: 'a2', tipo: 'Atenção', titulo: 'Bateria baixa', descricao: 'ARB-058 · Rua das Acácias', horario: 'há 12 min', naoLido: true },
  { id: 'a3', tipo: 'Informação', titulo: 'Temperatura dentro do esperado', descricao: 'Parque das Águas', horario: 'há 24 min', naoLido: false },
];

const zonasCalor = [
  { regiao: 'Centro', temperatura: 28.1, nivel: 74, sensores: 12, tendencia: 'Reduzindo' },
  { regiao: 'Setor Norte', temperatura: 26.0, nivel: 56, sensores: 9, tendencia: 'Estável' },
  { regiao: 'Setor Leste', temperatura: 28.7, nivel: 82, sensores: 8, tendencia: 'Atenção' },
  { regiao: 'Parque Central', temperatura: 23.2, nivel: 31, sensores: 13, tendencia: 'Reduzindo' },
];

const seed = () => ({
  users: [],
  sensores,
  alertas,
  zonasCalor,
  tendencias,
  resumo: {
    temperaturaAtual: 28.5,
    umidadeAr: 65,
    sensoresAtivos: 42,
    reducaoCalorPct: 18.6,
  },
});

module.exports = { seed };
